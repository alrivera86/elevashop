'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Ship,
  Package,
  Calendar,
  Plus,
  TrendingUp,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { inventarioApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useMonto } from '@/components/ui/monto';

const ORIGEN_LABELS: Record<string, { label: string; color: string }> = {
  IMPORTACION: { label: 'Importacion', color: 'bg-blue-500' },
  COMPRA: { label: 'Compra Local', color: 'bg-green-500' },
  PRODUCCION: { label: 'Produccion', color: 'bg-purple-500' },
  DEVOLUCION: { label: 'Devolucion', color: 'bg-yellow-500' },
  AJUSTE: { label: 'Ajuste', color: 'bg-gray-500' },
  NO_ESPECIFICADO: { label: 'No especificado', color: 'bg-gray-400' },
};

export default function ImportacionesPage() {
  const { formatMonto } = useMonto();
  const [dias, setDias] = useState(30);
  const [busqueda, setBusqueda] = useState('');

  const { data: resumen, isLoading } = useQuery({
    queryKey: ['importaciones-resumen', dias],
    queryFn: () => inventarioApi.getResumenImportaciones(dias),
  });

  const { data: estadisticas } = useQuery({
    queryKey: ['seriales-estadisticas'],
    queryFn: () => inventarioApi.getEstadisticasSeriales(),
  });

  // Filtrar unidades por busqueda
  const unidadesFiltradas = resumen?.ultimasUnidades?.filter((u: any) => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (
      u.serial?.toLowerCase().includes(term) ||
      u.producto?.codigo?.toLowerCase().includes(term) ||
      u.producto?.nombre?.toLowerCase().includes(term)
    );
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importaciones</h1>
          <p className="text-muted-foreground">
            Historial de entradas de inventario y seriales
          </p>
        </div>
        <Link href="/dashboard/inventario/importar">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Importacion
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estadisticas?.totalUnidades || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {estadisticas?.disponibles || 0} disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMonto(estadisticas?.valorInventarioCosto || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Costo total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendidas</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {estadisticas?.vendidas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatMonto(estadisticas?.totalVendido || 0)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMonto(estadisticas?.utilidadTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Ganancia acumulada</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de periodo */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-muted-foreground">Mostrar ultimos:</span>
            <div className="flex gap-2">
              {[7, 15, 30, 60, 90].map((d) => (
                <Button
                  key={d}
                  variant={dias === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDias(d)}
                >
                  {d} dias
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen por origen */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por Origen</CardTitle>
            <CardDescription>
              Distribucion de entradas en los ultimos {dias} dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : resumen?.porOrigen?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay importaciones en este periodo
              </p>
            ) : (
              <div className="space-y-3">
                {resumen?.porOrigen?.map((item: any) => {
                  const config = ORIGEN_LABELS[item.origen] || ORIGEN_LABELS.NO_ESPECIFICADO;
                  return (
                    <div key={item.origen} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${config.color}`} />
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{item.cantidad} unidades</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMonto(item.costoTotal)} costo
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Movimientos recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Movimientos de Entrada</CardTitle>
            <CardDescription>
              Ultimas entradas de stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : resumen?.importacionesRecientes?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay movimientos recientes
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {resumen?.importacionesRecientes?.slice(0, 10).map((mov: any) => (
                  <div key={mov.id} className="flex items-center justify-between rounded-lg border p-2">
                    <div>
                      <p className="font-medium text-sm">
                        {mov.producto?.nombre || 'Producto'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mov.referencia || 'Sin referencia'} - {formatDate(mov.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary">+{mov.cantidad}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de ultimas unidades */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ultimas Unidades Registradas</CardTitle>
              <CardDescription>
                Seriales agregados en los ultimos {dias} dias
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar serial o producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Fecha Entrada</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : unidadesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {busqueda ? 'No se encontraron resultados' : 'No hay unidades registradas en este periodo'}
                  </TableCell>
                </TableRow>
              ) : (
                unidadesFiltradas.map((unidad: any) => {
                  const origenConfig = ORIGEN_LABELS[unidad.origenTipo] || ORIGEN_LABELS.NO_ESPECIFICADO;
                  return (
                    <TableRow key={unidad.id}>
                      <TableCell className="font-mono font-semibold">
                        {unidad.serial}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{unidad.producto?.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {unidad.producto?.codigo}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {origenConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(unidad.fechaEntrada)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMonto(Number(unidad.costoUnitario))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            unidad.estado === 'DISPONIBLE'
                              ? 'default'
                              : unidad.estado === 'VENDIDO'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {unidad.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
