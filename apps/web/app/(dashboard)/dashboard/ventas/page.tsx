'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  Eye,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ventasApi, Venta } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function VentaDetalleDialog({
  venta,
  open,
  onClose,
}: {
  venta: Venta | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!venta) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Venta #{venta.numero}
          </DialogTitle>
          <DialogDescription>
            {formatDateTime(venta.fecha)} | {venta.cliente?.nombre || 'Cliente general'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Productos */}
          <div>
            <h4 className="mb-2 font-medium">Productos</h4>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venta.detalles.map((detalle) => (
                    <TableRow key={detalle.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{detalle.producto.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {detalle.producto.codigo}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{detalle.cantidad}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detalle.precioUnitario)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detalle.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagos */}
          <div>
            <h4 className="mb-2 font-medium">Pagos</h4>
            <div className="space-y-2">
              {venta.pagos.map((pago) => (
                <div
                  key={pago.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{pago.metodoPago}</span>
                    {pago.referencia && (
                      <span className="text-xs text-muted-foreground">
                        (Ref: {pago.referencia})
                      </span>
                    )}
                  </div>
                  <span className="font-medium">
                    {formatCurrency(pago.monto, pago.moneda)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="rounded-lg bg-muted p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(venta.subtotal)}</span>
              </div>
              {venta.descuento > 0 && (
                <div className="flex items-center justify-between text-destructive">
                  <span>Descuento</span>
                  <span>-{formatCurrency(venta.descuento)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-2 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(venta.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function VentasPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['ventas', { page }],
    queryFn: () => ventasApi.getAll({ page, limit: 10 }),
  });

  const { data: resumen } = useQuery({
    queryKey: ['ventas-resumen'],
    queryFn: () => ventasApi.getResumen(),
  });

  const handleVerDetalle = (venta: Venta) => {
    setSelectedVenta(venta);
    setDetalleOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">Historial de ventas y transacciones</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(resumen?.totalVentas || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen?.cantidadVentas || 0}</div>
            <p className="text-xs text-muted-foreground">Ventas realizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(resumen?.ticketPromedio || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Por venta</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Filtrar por fecha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Pagos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : data?.ventas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron ventas
                  </TableCell>
                </TableRow>
              ) : (
                data?.ventas?.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      #{venta.numero}
                    </TableCell>
                    <TableCell>{formatDateTime(venta.fecha)}</TableCell>
                    <TableCell>{venta.cliente?.nombre || 'Cliente general'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{venta.detalles.length} items</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(venta.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        {venta.pagos.slice(0, 2).map((pago, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {pago.metodoPago}
                          </Badge>
                        ))}
                        {venta.pagos.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{venta.pagos.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVerDetalle(venta)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {data.ventas.length} de {data.pagination.total} ventas
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Detalle Dialog */}
      <VentaDetalleDialog
        venta={selectedVenta}
        open={detalleOpen}
        onClose={() => setDetalleOpen(false)}
      />
    </div>
  );
}
