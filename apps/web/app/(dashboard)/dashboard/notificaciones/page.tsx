'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Package,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Notificacion {
  id: string;
  tipo: 'CRITICA' | 'ALERTA' | 'ADVERTENCIA' | 'INFO';
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  metadata?: {
    productoId?: number;
    codigo?: string;
    stockActual?: number;
    stockMinimo?: number;
  };
}

interface NotificacionesResponse {
  data: Notificacion[];
  total: number;
  noLeidas: number;
}

const tipoConfig = {
  CRITICA: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    badgeVariant: 'destructive' as const,
  },
  ALERTA: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    badgeVariant: 'destructive' as const,
  },
  ADVERTENCIA: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    badgeVariant: 'secondary' as const,
  },
  INFO: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    badgeVariant: 'outline' as const,
  },
};

export default function NotificacionesPage() {
  const { data, isLoading } = useQuery<NotificacionesResponse>({
    queryKey: ['notificaciones'],
    queryFn: async () => {
      const response = await api.get('/notificaciones');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-muted-foreground">Centro de alertas y notificaciones del sistema</p>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const notificaciones = data?.data || [];
  const totalNoLeidas = data?.noLeidas || 0;

  // Agrupar por tipo
  const criticas = notificaciones.filter(n => n.tipo === 'CRITICA');
  const alertas = notificaciones.filter(n => n.tipo === 'ALERTA');
  const advertencias = notificaciones.filter(n => n.tipo === 'ADVERTENCIA');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-muted-foreground">
            Centro de alertas y notificaciones del sistema
          </p>
        </div>
        {totalNoLeidas > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {totalNoLeidas} pendientes
          </Badge>
        )}
      </div>

      {/* Resumen de alertas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={criticas.length > 0 ? 'border-red-200 bg-red-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Criticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{criticas.length}</p>
            <p className="text-xs text-muted-foreground">Productos agotados</p>
          </CardContent>
        </Card>

        <Card className={alertas.length > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{alertas.length}</p>
            <p className="text-xs text-muted-foreground">Stock minimo alcanzado</p>
          </CardContent>
        </Card>

        <Card className={advertencias.length > 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Advertencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{advertencias.length}</p>
            <p className="text-xs text-muted-foreground">Stock bajo</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Todas las Notificaciones
          </CardTitle>
          <CardDescription>
            {notificaciones.length === 0
              ? 'No hay notificaciones pendientes'
              : `${notificaciones.length} notificaciones de inventario`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-green-100 p-4 mb-4">
                <Bell className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Todo en orden</h3>
              <p className="text-muted-foreground">
                No hay alertas de stock pendientes
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificaciones.map((notificacion) => {
                const config = tipoConfig[notificacion.tipo];
                const Icon = config.icon;

                return (
                  <div
                    key={notificacion.id}
                    className={`flex items-start gap-4 rounded-lg border p-4 ${config.bgColor}`}
                  >
                    <div className={`rounded-full bg-white p-2 shadow-sm`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={config.badgeVariant}>
                          {notificacion.tipo}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(notificacion.fecha)}
                        </span>
                      </div>
                      <h4 className="font-medium">{notificacion.titulo}</h4>
                      <p className="text-sm text-muted-foreground">
                        {notificacion.mensaje}
                      </p>
                    </div>
                    {notificacion.metadata?.productoId && (
                      <Link href={`/dashboard/inventario?id=${notificacion.metadata.productoId}`}>
                        <Button variant="outline" size="sm">
                          <Package className="h-4 w-4 mr-2" />
                          Ver producto
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
