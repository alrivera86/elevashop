'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  Eye,
  DollarSign,
  PackageOpen,
  CheckCircle,
  Loader2,
  Download,
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ventasApi, consignacionApi, Venta, MetodoPago } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { generarOrdenSalida, VentaPDF } from '@/lib/generate-pdf';
import Link from 'next/link';

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: 'EFECTIVO_USD', label: 'Efectivo USD' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'BANESCO', label: 'Banesco Panamá' },
  { value: 'EFECTIVO_BS', label: 'Efectivo Bs' },
  { value: 'TRANSFERENCIA_BS', label: 'Transferencia Bs' },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
  { value: 'BINANCE', label: 'Binance' },
];

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

  const esConsignacion = venta.tipoVenta === 'CONSIGNACION';

  const descargarPDF = () => {
    const ventaPDF: VentaPDF = {
      id: venta.id,
      numero: venta.numero,
      fecha: venta.fecha,
      tipoVenta: venta.tipoVenta,
      estadoPago: venta.estadoPago,
      cliente: {
        nombre: venta.cliente?.nombre || 'Cliente general',
        telefono: venta.cliente?.telefono,
        email: venta.cliente?.email,
        direccion: venta.cliente?.direccion,
      },
      detalles: venta.detalles.map((d: any) => ({
        producto: {
          codigo: d.producto?.codigo || '',
          nombre: d.producto?.nombre || '',
        },
        cantidad: d.cantidad,
        precioUnitario: Number(d.precioUnitario),
        descuento: Number(d.descuento) || 0,
        subtotal: Number(d.subtotal),
        serial: d.serial,
      })),
      subtotal: Number(venta.subtotal),
      descuento: Number(venta.descuento) || 0,
      impuesto: Number(venta.impuesto) || 0,
      total: Number(venta.total),
      pagos: venta.pagos?.map((p: any) => ({
        metodoPago: p.metodoPago,
        monto: Number(p.monto),
        moneda: p.moneda || 'USD',
      })) || [],
      notas: venta.notas,
    };

    generarOrdenSalida(ventaPDF);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {esConsignacion ? (
              <PackageOpen className="h-5 w-5 text-orange-600" />
            ) : (
              <ShoppingCart className="h-5 w-5" />
            )}
            {esConsignacion ? 'Consignación' : 'Venta'} #{venta.numero}
            {esConsignacion && (
              <Badge variant="outline" className="ml-2 border-orange-500 text-orange-600">
                Consignación
              </Badge>
            )}
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

          {/* Botón Descargar PDF */}
          <Button onClick={descargarPDF} className="w-full mt-4">
            <Download className="mr-2 h-4 w-4" />
            Descargar Orden de Salida (PDF)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LiquidarDialog({
  venta,
  open,
  onClose,
  onSuccess,
}: {
  venta: Venta | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO_USD');
  const [referencia, setReferencia] = useState('');
  const [modoLiquidacion, setModoLiquidacion] = useState<'todo' | 'items'>('todo');
  const [itemsSeleccionados, setItemsSeleccionados] = useState<number[]>([]);
  const queryClient = useQueryClient();

  // Items pendientes (no liquidados)
  const itemsPendientes = venta?.detalles.filter(d => !d.liquidado) || [];
  const itemsLiquidados = venta?.detalles.filter(d => d.liquidado) || [];

  // Monto a cobrar según selección
  const montoSeleccionado = modoLiquidacion === 'todo'
    ? itemsPendientes.reduce((sum, d) => sum + Number(d.subtotal), 0)
    : itemsSeleccionados.reduce((sum, id) => {
        const item = itemsPendientes.find(d => d.id === id);
        return sum + (item ? Number(item.subtotal) : 0);
      }, 0);

  const toggleItem = (id: number) => {
    setItemsSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    setItemsSeleccionados(itemsPendientes.map(d => d.id));
  };

  const deseleccionarTodos = () => {
    setItemsSeleccionados([]);
  };

  // Mutation para liquidar todo
  const liquidarTodoMutation = useMutation({
    mutationFn: () => {
      if (!venta) throw new Error('No hay venta seleccionada');
      return consignacionApi.liquidar(venta.id, [{
        metodoPago,
        monto: montoSeleccionado,
        moneda: metodoPago.includes('BS') ? 'VES' : 'USD',
        referencia: referencia || undefined,
      }]);
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  // Mutation para liquidar items seleccionados
  const liquidarItemsMutation = useMutation({
    mutationFn: () => {
      if (!venta) throw new Error('No hay venta seleccionada');
      return consignacionApi.liquidarItems(venta.id, itemsSeleccionados, {
        metodoPago,
        monto: montoSeleccionado,
        moneda: metodoPago.includes('BS') ? 'VES' : 'USD',
        referencia: referencia || undefined,
      });
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  function handleSuccess() {
    const msg = modoLiquidacion === 'todo'
      ? 'Consignación liquidada exitosamente'
      : `${itemsSeleccionados.length} item(s) liquidados`;
    toast({ title: msg });
    queryClient.invalidateQueries({ queryKey: ['ventas'] });
    queryClient.invalidateQueries({ queryKey: ['consignacion-dashboard'] });
    setItemsSeleccionados([]);
    onSuccess();
    onClose();
  }

  function handleError(error: any) {
    toast({
      title: error.response?.data?.message || 'Error al liquidar',
      variant: 'destructive',
    });
  }

  const handleLiquidar = () => {
    if (modoLiquidacion === 'todo') {
      liquidarTodoMutation.mutate();
    } else {
      liquidarItemsMutation.mutate();
    }
  };

  const isPending = liquidarTodoMutation.isPending || liquidarItemsMutation.isPending;
  const canLiquidar = modoLiquidacion === 'todo'
    ? itemsPendientes.length > 0
    : itemsSeleccionados.length > 0;

  if (!venta) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Liquidar Consignación
          </DialogTitle>
          <DialogDescription>
            Consignación #{venta.numero} - {venta.cliente?.nombre || 'Cliente general'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selector de modo */}
          <div className="flex gap-2">
            <Button
              variant={modoLiquidacion === 'todo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModoLiquidacion('todo')}
              className={modoLiquidacion === 'todo' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Liquidar Todo
            </Button>
            <Button
              variant={modoLiquidacion === 'items' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModoLiquidacion('items')}
              className={modoLiquidacion === 'items' ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              Por Item
            </Button>
          </div>

          {/* Items liquidados previamente */}
          {itemsLiquidados.length > 0 && (
            <div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950">
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                Items ya liquidados ({itemsLiquidados.length})
              </p>
              {itemsLiquidados.map(item => (
                <div key={item.id} className="flex justify-between text-sm text-green-600">
                  <span className="truncate">{item.producto.nombre}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Lista de items pendientes */}
          {modoLiquidacion === 'items' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Seleccionar items a liquidar</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={seleccionarTodos}>
                    Todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deseleccionarTodos}>
                    Ninguno
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border max-h-48 overflow-y-auto">
                {itemsPendientes.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-0 ${
                      itemsSeleccionados.includes(item.id) ? 'bg-orange-50 dark:bg-orange-950' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={itemsSeleccionados.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <p className="font-medium text-sm">{item.producto.nombre}</p>
                        {item.serial && (
                          <p className="text-xs text-muted-foreground">Serial: {item.serial}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Resumen de monto */}
          <div className="rounded-lg border bg-orange-50 p-4 dark:bg-orange-950">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {modoLiquidacion === 'todo'
                  ? `${itemsPendientes.length} items pendientes`
                  : `${itemsSeleccionados.length} items seleccionados`}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <span className="font-medium">Total a cobrar:</span>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(montoSeleccionado)}
              </span>
            </div>
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label>Método de Pago</Label>
            <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as MetodoPago)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODOS_PAGO.map(mp => (
                  <SelectItem key={mp.value} value={mp.value}>
                    {mp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Referencia */}
          <div className="space-y-2">
            <Label>Referencia (opcional)</Label>
            <Input
              placeholder="Número de referencia..."
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleLiquidar}
            disabled={isPending || !canLiquidar}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {modoLiquidacion === 'todo' ? 'Liquidar Todo' : `Liquidar ${itemsSeleccionados.length} items`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VentasPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [liquidarOpen, setLiquidarOpen] = useState(false);
  const [ventaALiquidar, setVentaALiquidar] = useState<Venta | null>(null);

  // Debounce search para no hacer muchas requests
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page cuando cambia la búsqueda
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['ventas', { page, search: debouncedSearch }],
    queryFn: () => ventasApi.getAll({ page, limit: 10, search: debouncedSearch || undefined }),
  });

  const { data: resumen } = useQuery({
    queryKey: ['ventas-resumen'],
    queryFn: () => ventasApi.getResumen(),
  });

  const { data: consignacionData } = useQuery({
    queryKey: ['consignacion-dashboard'],
    queryFn: () => consignacionApi.getDashboard(),
  });

  const handleVerDetalle = (venta: Venta) => {
    setSelectedVenta(venta);
    setDetalleOpen(true);
  };

  const handleLiquidar = (venta: Venta) => {
    setVentaALiquidar(venta);
    setLiquidarOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Ventas y Consignaciones</h1>
          <p className="text-sm text-muted-foreground">Historial de ventas y mercancía en consignación</p>
        </div>
        <Link href="/dashboard/ventas/nueva">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Operación
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(resumen?.totalVentas || 0)}
            </div>
            <p className="text-xs text-muted-foreground">{resumen?.cantidadVentas || 0} transacciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(resumen?.ticketPromedio || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Por operación</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Consignación</CardTitle>
            <PackageOpen className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(consignacionData?.porCobrar || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {consignacionData?.cantidadConsignaciones || 0} pendientes de cobro
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Consignadas</CardTitle>
            <PackageOpen className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {consignacionData?.unidadesConsignadas || 0}
            </div>
            <p className="text-xs text-muted-foreground">Con clientes externos</p>
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
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden lg:table-cell">Productos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : data?.ventas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No se encontraron ventas
                  </TableCell>
                </TableRow>
              ) : (
                data?.ventas?.map((venta) => {
                  const esConsignacion = venta.tipoVenta === 'CONSIGNACION';
                  const pendientePago = venta.estadoPago === 'PENDIENTE' || venta.estadoPago === 'PARCIAL';

                  return (
                    <TableRow key={venta.id} className={esConsignacion && pendientePago ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}>
                      <TableCell className="font-mono text-sm font-medium">
                        #{venta.numero}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {esConsignacion ? (
                          <Badge variant="outline" className="border-orange-500 text-orange-600">
                            <PackageOpen className="mr-1 h-3 w-3" />
                            Consignación
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            <ShoppingCart className="mr-1 h-3 w-3" />
                            Venta
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatDateTime(venta.fecha)}</TableCell>
                      <TableCell>
                        <span className="truncate block max-w-[120px] sm:max-w-none">{venta.cliente?.nombre || 'Cliente general'}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="max-w-[200px]">
                          {venta.detalles.slice(0, 2).map((d, i) => (
                            <p key={i} className="text-sm truncate">
                              {d.cantidad}x {d.producto?.nombre || 'Producto'}
                            </p>
                          ))}
                          {venta.detalles.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{venta.detalles.length - 2} más
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(venta.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        {venta.estadoPago === 'PAGADO' ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Pagado
                          </Badge>
                        ) : venta.estadoPago === 'PARCIAL' ? (
                          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                            Parcial
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {esConsignacion && pendientePago && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLiquidar(venta)}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <DollarSign className="mr-1 h-3 w-3" />
                              Liquidar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVerDetalle(venta)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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

      {/* Liquidar Dialog */}
      <LiquidarDialog
        venta={ventaALiquidar}
        open={liquidarOpen}
        onClose={() => {
          setLiquidarOpen(false);
          setVentaALiquidar(null);
        }}
        onSuccess={() => {
          setVentaALiquidar(null);
        }}
      />
    </div>
  );
}
