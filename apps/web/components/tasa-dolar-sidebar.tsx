'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { finanzasApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function TasaDolarSidebar() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: tasa, isLoading, refetch } = useQuery({
    queryKey: ['tasa-dolar'],
    queryFn: finanzasApi.getTasaDolar,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
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
    return date.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="mx-3 mb-2 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2 dark:border-green-800 dark:bg-green-950/50">
        <div className="h-4 w-20 animate-pulse rounded bg-green-200 dark:bg-green-800" />
      </div>
    );
  }

  if (!tasa || tasa.rate === 0) {
    return (
      <div className="mx-3 mb-2 rounded-lg border border-yellow-200 bg-yellow-50/50 px-3 py-2 dark:border-yellow-800 dark:bg-yellow-950/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-yellow-600 dark:text-yellow-400">Tasa no disponible</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-5 w-5 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2 dark:border-green-800 dark:bg-green-950/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg font-bold text-green-700 dark:text-green-300">
          Bs {tasa.rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-6 w-6 p-0 text-green-600 hover:bg-green-100 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-0.5">
        Binance P2P
      </p>
      <div className="text-[9px] text-muted-foreground space-y-0.5">
        <p>Actualizado: {formatDate(tasa.updatedAt)}</p>
        <p>Prox. actualiz: {tasa.nextUpdate}</p>
      </div>
    </div>
  );
}
