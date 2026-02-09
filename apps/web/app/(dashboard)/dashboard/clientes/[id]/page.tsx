'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Cpu,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldX,
  FileText,
  Filter,
  X,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clientesApi, ClienteDetalle } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const METODO_PAGO_LABELS: Record<string, string> = {
  EFECTIVO_USD: 'Efectivo USD',
  EFECTIVO_BS: 'Efectivo Bs',
  ZELLE: 'Zelle',
  BANESCO: 'Banesco',
  TRANSFERENCIA_BS: 'Transferencia Bs',
  TRANSFERENCIA_USD: 'Transferencia USD',
  PAGO_MOVIL: 'Pago Movil',
  BINANCE: 'Binance',
  MIXTO: 'Mixto',
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function isEnGarantia(garantiaHasta?: string): boolean {
  if (!garantiaHasta) return false;
  return new Date(garantiaHasta) > new Date();
}

function diasRestantesGarantia(garantiaHasta?: string): number {
  if (!garantiaHasta) return 0;
  const hoy = new Date();
  const fechaGarantia = new Date(garantiaHasta);
  const diff = fechaGarantia.getTime() - hoy.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = params.id as string;

  // Estado para filtros de fecha
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [filtrosActivos, setFiltrosActivos] = useState(false);

  const { data: cliente, isLoading, error } = useQuery({
    queryKey: ['cliente', clienteId, fechaInicio, fechaFin],
    queryFn: () => clientesApi.getOne(clienteId, { fechaInicio, fechaFin }),
    enabled: !!clienteId,
  });

  const aplicarFiltros = () => {
    setFiltrosActivos(!!fechaInicio || !!fechaFin);
  };

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setFiltrosActivos(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">
          No se pudo cargar la informacion del cliente
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{cliente.nombre}</h1>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {cliente.telefono && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {cliente.telefono}
                </span>
              )}
              {cliente.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {cliente.email}
                </span>
              )}
              {cliente.direccion && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {cliente.direccion}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cliente desde {formatDate(cliente.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard
          title="Total Gastado"
          value={formatCurrency(cliente.estadisticas?.totalGastado || 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Ordenes"
          value={cliente.estadisticas?.totalVentas || 0}
          icon={ShoppingCart}
        />
        <StatCard
          title="Promedio/Orden"
          value={formatCurrency(cliente.estadisticas?.promedioCompra || 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Productos"
          value={cliente.estadisticas?.productosUnicos || 0}
          icon={Package}
          description="Productos diferentes"
        />
        <StatCard
          title="Seriales"
          value={cliente.estadisticas?.serialesComprados || 0}
          icon={Cpu}
          description="Unidades con serial"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="historial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="historial">
            <FileText className="mr-2 h-4 w-4" />
            Historial de Compras
          </TabsTrigger>
          <TabsTrigger value="seriales">
            <Cpu className="mr-2 h-4 w-4" />
            Seriales Comprados
          </TabsTrigger>
        </TabsList>

        {/* Historial de Compras */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Historial de Compras</CardTitle>
                  <CardDescription>
                    {filtrosActivos
                      ? `${cliente.ventas?.length || 0} ordenes en el rango seleccionado`
                      : `Todas las ordenes del cliente (${cliente.ventas?.length || 0})`
                    }
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Desde</Label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="h-9 w-36"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hasta</Label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="h-9 w-36"
                    />
                  </div>
                  {filtrosActivos && (
                    <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                      <X className="h-4 w-4 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cliente.ventas?.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Este cliente aun no tiene compras registradas
                </div>
              ) : (
                <div className="space-y-4">
                  {cliente.ventas?.map((venta) => (
                    <Card key={venta.id} className="overflow-hidden">
                      <div className="flex items-center justify-between border-b bg-muted/50 p-4">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-semibold">Orden #{venta.numero}</p>
                            <p className="text-sm text-muted-foreground">
                              <Calendar className="mr-1 inline h-3 w-3" />
                              {formatDate(venta.fecha)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(Number(venta.total))}
                          </p>
                          <div className="flex flex-wrap justify-end gap-1">
                            {venta.pagos?.map((pago, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {METODO_PAGO_LABELS[pago.metodoPago] || pago.metodoPago}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Codigo</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-center">Cant.</TableHead>
                            <TableHead className="text-right">P. Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {venta.detalles?.map((detalle) => (
                            <TableRow key={detalle.id}>
                              <TableCell className="font-mono text-xs">
                                {detalle.producto?.codigo}
                              </TableCell>
                              <TableCell>{detalle.producto?.nombre}</TableCell>
                              <TableCell className="text-center">{detalle.cantidad}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(Number(detalle.precioUnitario))}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(Number(detalle.subtotal))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seriales Comprados */}
        <TabsContent value="seriales">
          <Card>
            <CardHeader>
              <CardTitle>Seriales Comprados</CardTitle>
              <CardDescription>
                Unidades con numero de serie adquiridas por el cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cliente.unidadesCompradas?.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Este cliente no tiene productos con serial registrados
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serial</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Fecha Compra</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Garantia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cliente.unidadesCompradas?.map((unidad) => {
                      const enGarantia = isEnGarantia(unidad.garantiaHasta);
                      const diasRestantes = diasRestantesGarantia(unidad.garantiaHasta);

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
                            {unidad.fechaVenta ? formatDate(unidad.fechaVenta) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {unidad.precioVenta
                              ? formatCurrency(Number(unidad.precioVenta))
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {unidad.garantiaHasta ? (
                              <div className="flex items-center gap-2">
                                {enGarantia ? (
                                  <>
                                    <ShieldCheck className="h-4 w-4 text-green-500" />
                                    <div>
                                      <p className="text-sm text-green-600">En garantia</p>
                                      <p className="text-xs text-muted-foreground">
                                        {diasRestantes} dias restantes
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <ShieldX className="h-4 w-4 text-red-500" />
                                    <p className="text-sm text-red-600">Vencida</p>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Shield className="h-4 w-4" />
                                <p className="text-sm">Sin garantia</p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                unidad.estado === 'VENDIDO'
                                  ? 'default'
                                  : unidad.estado === 'DEFECTUOSO'
                                  ? 'destructive'
                                  : unidad.estado === 'DEVUELTO'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {unidad.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
