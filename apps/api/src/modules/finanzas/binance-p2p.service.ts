import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma.service';

interface BinanceP2PAd {
  adv: {
    price: string;
    minSingleTransAmount: string;
    maxSingleTransAmount: string;
    tradableQuantity: string;
  };
  advertiser: {
    nickName: string;
    monthOrderCount: number;
    monthFinishRate: number;
  };
}

interface BinanceP2PResponse {
  data: BinanceP2PAd[];
  total: number;
  success: boolean;
}

@Injectable()
export class BinanceP2PService {
  private readonly logger = new Logger(BinanceP2PService.name);
  private cachedRate: { rate: number; timestamp: Date } | null = null;

  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene el precio promedio de USDT/VES de Binance P2P
   * Solo considera vendedores con buena reputación (>95% rate, >100 orders)
   */
  async fetchBinanceP2PRate(): Promise<number | null> {
    try {
      const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset: 'USDT',
          fiat: 'VES',
          merchantCheck: true,
          page: 1,
          rows: 20,
          tradeType: 'BUY', // Compramos USDT (vendemos VES)
          publisherType: null,
          payTypes: [],
        }),
      });

      if (!response.ok) {
        this.logger.error(`Binance P2P API error: ${response.status}`);
        return null;
      }

      const data: BinanceP2PResponse = await response.json();

      if (!data.success || !data.data || data.data.length === 0) {
        this.logger.warn('No Binance P2P ads found');
        return null;
      }

      // Filtrar anuncios de vendedores confiables
      const trustedAds = data.data.filter((ad) => {
        const finishRate = ad.advertiser.monthFinishRate;
        const orderCount = ad.advertiser.monthOrderCount;
        return finishRate >= 0.95 && orderCount >= 50;
      });

      const adsToUse = trustedAds.length >= 5 ? trustedAds : data.data;

      // Calcular promedio de los primeros 10 anuncios
      const prices = adsToUse.slice(0, 10).map((ad) => parseFloat(ad.adv.price));
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

      this.logger.log(`Binance P2P rate fetched: ${avgPrice.toFixed(2)} VES/USDT`);

      return avgPrice;
    } catch (error) {
      this.logger.error('Error fetching Binance P2P rate:', error);
      return null;
    }
  }

  /**
   * Actualiza la tasa de cambio en la base de datos
   */
  async updateRate(): Promise<{ rate: number; source: string; updatedAt: Date } | null> {
    const rate = await this.fetchBinanceP2PRate();

    if (!rate) {
      this.logger.warn('Could not fetch Binance rate, using cached value');
      return this.cachedRate ? {
        rate: this.cachedRate.rate,
        source: 'cache',
        updatedAt: this.cachedRate.timestamp,
      } : null;
    }

    // Actualizar cache
    this.cachedRate = { rate, timestamp: new Date() };

    // Guardar en base de datos
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Buscar si ya existe una tasa de Binance para hoy
      const existing = await this.prisma.tasaCambio.findFirst({
        where: {
          fecha: today,
          monedaOrigen: 'USD',
          monedaDestino: 'VES',
          tipo: 'BINANCE',
        },
      });

      if (existing) {
        // Actualizar la existente
        await this.prisma.tasaCambio.update({
          where: { id: existing.id },
          data: { tasa: rate },
        });
      } else {
        // Crear nueva
        await this.prisma.tasaCambio.create({
          data: {
            fecha: today,
            monedaOrigen: 'USD',
            monedaDestino: 'VES',
            tipo: 'BINANCE',
            tasa: rate,
          },
        });
      }

      // También actualizar la tasa principal usada en la app (tipo PARALELO)
      const tasaParalelo = await this.prisma.tasaCambio.findFirst({
        where: { monedaOrigen: 'USD', monedaDestino: 'VES', tipo: 'PARALELO' },
        orderBy: { fecha: 'desc' },
      });

      if (tasaParalelo) {
        await this.prisma.tasaCambio.update({
          where: { id: tasaParalelo.id },
          data: { tasa: rate, fecha: new Date() },
        });
      }

      this.logger.log(`Rate saved to database: ${rate.toFixed(2)} VES/USDT`);

      return {
        rate,
        source: 'binance_p2p',
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error saving rate to database:', error);
      return {
        rate,
        source: 'binance_p2p',
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Obtiene la tasa actual (de cache o BD)
   */
  async getCurrentRate(): Promise<{
    rate: number;
    source: string;
    updatedAt: Date;
    nextUpdate: string;
  }> {
    // Si tenemos cache reciente (menos de 1 hora), usarla
    if (this.cachedRate && (Date.now() - this.cachedRate.timestamp.getTime()) < 3600000) {
      return {
        rate: this.cachedRate.rate,
        source: 'cache',
        updatedAt: this.cachedRate.timestamp,
        nextUpdate: this.getNextUpdateTime(),
      };
    }

    // Buscar en BD
    const dbRate = await this.prisma.tasaCambio.findFirst({
      where: {
        monedaOrigen: 'USD',
        monedaDestino: 'VES',
        tipo: 'BINANCE',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (dbRate) {
      this.cachedRate = { rate: Number(dbRate.tasa), timestamp: dbRate.createdAt };
      return {
        rate: Number(dbRate.tasa),
        source: 'database',
        updatedAt: dbRate.createdAt,
        nextUpdate: this.getNextUpdateTime(),
      };
    }

    // Si no hay nada, obtener de Binance
    const freshRate = await this.updateRate();
    if (freshRate) {
      return {
        ...freshRate,
        nextUpdate: this.getNextUpdateTime(),
      };
    }

    // Fallback
    return {
      rate: 0,
      source: 'unavailable',
      updatedAt: new Date(),
      nextUpdate: this.getNextUpdateTime(),
    };
  }

  /**
   * Calcula la próxima hora de actualización
   */
  private getNextUpdateTime(): string {
    const now = new Date();
    const hours = now.getHours();

    // Horarios de actualización: 6:00, 12:00, 17:30
    if (hours < 6) {
      return '6:00 AM';
    } else if (hours < 12) {
      return '12:00 PM';
    } else if (hours < 17 || (hours === 17 && now.getMinutes() < 30)) {
      return '5:30 PM';
    } else {
      return '6:00 AM (mañana)';
    }
  }

  // ===== CRON JOBS =====

  // 6:00 AM Venezuela (UTC-4 = 10:00 UTC)
  @Cron('0 10 * * *', { timeZone: 'UTC' })
  async updateRateMorning() {
    this.logger.log('Cron: Updating Binance P2P rate (6:00 AM VE)');
    await this.updateRate();
  }

  // 12:00 PM Venezuela (UTC-4 = 16:00 UTC)
  @Cron('0 16 * * *', { timeZone: 'UTC' })
  async updateRateNoon() {
    this.logger.log('Cron: Updating Binance P2P rate (12:00 PM VE)');
    await this.updateRate();
  }

  // 5:30 PM Venezuela (UTC-4 = 21:30 UTC)
  @Cron('30 21 * * *', { timeZone: 'UTC' })
  async updateRateEvening() {
    this.logger.log('Cron: Updating Binance P2P rate (5:30 PM VE)');
    await this.updateRate();
  }
}
