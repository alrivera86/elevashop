import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getStockStatus(cantidad: number, minimo: number, critico: number): 'ok' | 'alerta-w' | 'alerta' | 'agotado' {
  if (cantidad <= 0) return 'agotado';
  if (cantidad <= critico) return 'alerta';
  if (cantidad <= minimo) return 'alerta-w';
  return 'ok';
}

export function getStockStatusLabel(status: 'ok' | 'alerta-w' | 'alerta' | 'agotado'): string {
  const labels = {
    ok: 'OK',
    'alerta-w': 'Stock Bajo',
    alerta: 'Critico',
    agotado: 'Agotado',
  };
  return labels[status];
}
