'use client';

import { useUIStore } from '@/stores/ui-store';
import { formatCurrency } from '@/lib/utils';

interface MontoProps {
  value: number;
  currency?: string;
  className?: string;
}

export function Monto({ value, currency = 'USD', className }: MontoProps) {
  const { montosOcultos } = useUIStore();

  if (montosOcultos) {
    return <span className={className}>$***.**</span>;
  }

  return <span className={className}>{formatCurrency(value, currency)}</span>;
}

// Hook para usar en casos donde se necesite el valor como string
export function useMonto() {
  const { montosOcultos } = useUIStore();

  const formatMonto = (value: number, currency: string = 'USD'): string => {
    if (montosOcultos) {
      return '$***.**';
    }
    return formatCurrency(value, currency);
  };

  return { formatMonto, montosOcultos };
}
