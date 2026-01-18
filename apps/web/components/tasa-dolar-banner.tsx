'use client';

import { useQuery } from '@tanstack/react-query';
import { DollarSign, RefreshCw, Clock, TrendingUp } from 'lucide-react';
import { finanzasApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';

export function TasaDolarBanner() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: tasa, isLoading, refetch } = useQuery({
    queryKey: ['tasa-dolar'],
    queryFn: finanzasApi.getTasaDolar,
    refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
    staleTime: 60 * 1000, // Considerar stale después de 1 minuto
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await finanzasApi.actualizarTasaDolar();
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-VE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 dark:border-green-800 dark:from-green-950 dark:to-emerald-950">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!tasa || tasa.rate === 0) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 px-4 py-2 dark:border-yellow-800 dark:from-yellow-950 dark:to-amber-950">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
            Tasa no disponible
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 text-xs"
        >
          <RefreshCw className={`mr-1 h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 shadow-sm dark:border-green-800 dark:from-green-950 dark:to-emerald-950">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                Bs {tasa.rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <Tooltip>
                <TooltipTrigger>
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                    Binance P2P
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Promedio de USDT/VES en Binance P2P</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Actualizado: {formatDate(tasa.updatedAt)}</span>
              <span className="text-green-600 dark:text-green-400">
                | Prox: {tasa.nextUpdate}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0 text-green-600 hover:bg-green-100 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Actualizar tasa ahora</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
