import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(private configService: ConfigService) {}

  async enviarAlertaStockBajo(data: {
    codigo: string;
    nombre: string;
    stockActual: number;
    stockMinimo: number;
  }) {
    const mensaje = `⚠️ ALERTA STOCK BAJO
Producto: ${data.codigo} - ${data.nombre}
Stock actual: ${data.stockActual}
Stock mínimo: ${data.stockMinimo}
Acción requerida: Realizar orden de compra`;

    this.logger.warn(mensaje);

    // TODO: Implementar envío a WhatsApp
    // await this.enviarWhatsApp(mensaje);

    // TODO: Implementar envío a Telegram
    // await this.enviarTelegram(mensaje);
  }

  async enviarWhatsApp(mensaje: string, numero?: string) {
    const apiKey = this.configService.get('WHATSAPP_API_KEY');
    const destinatario = numero || this.configService.get('WHATSAPP_ADMIN_NUMBER');

    if (!apiKey) {
      this.logger.warn('WhatsApp API no configurada');
      return;
    }

    // TODO: Implementar integración con WhatsApp Business API
    this.logger.log(`WhatsApp enviado a ${destinatario}: ${mensaje.substring(0, 50)}...`);
  }

  async enviarTelegram(mensaje: string, chatId?: string) {
    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    const destino = chatId || this.configService.get('TELEGRAM_CHAT_ID');

    if (!botToken) {
      this.logger.warn('Telegram Bot no configurado');
      return;
    }

    // TODO: Implementar integración con Telegram Bot API
    this.logger.log(`Telegram enviado a ${destino}: ${mensaje.substring(0, 50)}...`);
  }
}
