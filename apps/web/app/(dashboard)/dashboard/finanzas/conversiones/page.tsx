'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Calculator,
  Pencil,
  MapPin,
  History,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { finanzasApi, MetodoPago, Moneda, ConversionMoneda, CuentaBinance, EstadoConversion } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useMonto } from '@/components/ui/monto';
import { toast } from '@/hooks/use-toast';

const metodosPago: { value: MetodoPago; label: string; moneda: Moneda }[] = [
  { value: 'EFECTIVO_USD', label: 'Efectivo USD', moneda: 'USD' },
  { value: 'EFECTIVO_BS', label: 'Efectivo Bs', moneda: 'VES' },
  { value: 'ZELLE', label: 'Zelle', moneda: 'USD' },
  { value: 'BANESCO', label: 'Banesco', moneda: 'USD' },
  { value: 'BINANCE', label: 'Binance', moneda: 'USD' },
  { value: 'BINANCE_USDT', label: 'Binance USDT (Personal)', moneda: 'USD' },
  { value: 'BINANCE_ELEVASHOP', label: 'Binance Elevashop', moneda: 'USD' },
  { value: 'TRANSFERENCIA_BS', label: 'Transferencia Bs', moneda: 'VES' },
  { value: 'TRANSFERENCIA_USD', label: 'Transferencia USD', moneda: 'USD' },
  { value: 'PAGO_MOVIL', label: 'Pago Movil', moneda: 'VES' },
  { value: 'EFECTIVO_CHILE', label: 'Efectivo Chile', moneda: 'USD' },
];

const cuentasBinance: { value: CuentaBinance; label: string }[] = [
  { value: 'SR_JOSE', label: 'Sr. Jose' },
  { value: 'WILMEN', label: 'Wilmen' },
  { value: 'ALBERTO', label: 'Alberto' },
  { value: 'ELEVASHOP', label: 'Elevashop' },
];

const ubicacionesSugeridas = [
  'Binance Sr. Jose',
  'Binance Wilmen',
  'Binance Alberto',
  'Binance Elevashop',
  'Banesco Panama',
  'Zelle',
  'Efectivo USD',
  'Efectivo Bs',
  'Transferido a tercero',
  'Gastado',
];

const getMetodoLabel = (value: MetodoPago) => {
  return metodosPago.find(m => m.value === value)?.label || value;
};

function ConversionForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    cuentaOrigen: '' as MetodoPago,
    montoOrigen: '',
    monedaOrigen: 'USD' as Moneda,
    cuentaDestino: '' as MetodoPago,
    montoDestino: '',
    monedaDestino: 'USD' as Moneda,
    tasaCambio: '',
    ubicacionActual: '',
    notas: '',
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      finanzasApi.createConversion({
        cuentaOrigen: formData.cuentaOrigen,
        montoOrigen: parseFloat(formData.montoOrigen),
        monedaOrigen: formData.monedaOrigen,
        cuentaDestino: formData.cuentaDestino,
        montoDestino: parseFloat(formData.montoDestino),
        monedaDestino: formData.monedaDestino,
        tasaCambio: parseFloat(formData.tasaCambio),
        ubicacionActual: formData.ubicacionActual || undefined,
        notas: formData.notas || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversiones'] });
      queryClient.invalidateQueries({ queryKey: ['distribucion-fondos'] });
      toast({ title: 'Conversion registrada', variant: 'success' });
      onSuccess();
    },
    onError: () => {
      toast({ title: 'Error al registrar conversion', variant: 'destructive' });
    },
  });

  const handleCuentaOrigenChange = (value: MetodoPago) => {
    const metodo = metodosPago.find(m => m.value === value);
    setFormData({
      ...formData,
      cuentaOrigen: value,
      monedaOrigen: metodo?.moneda || 'USD',
    });
  };

  const handleCuentaDestinoChange = (value: MetodoPago) => {
    const metodo = metodosPago.find(m => m.value === value);
    setFormData({
      ...formData,
      cuentaDestino: value,
      monedaDestino: metodo?.moneda || 'USD',
    });
  };

  const calcularTasa = () => {
    const origen = parseFloat(formData.montoOrigen);
    const destino = parseFloat(formData.montoDestino);
    if (origen > 0 && destino > 0) {
      const tasa = origen / destino;
      setFormData({ ...formData, tasaCambio: tasa.toFixed(4) });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const isValid = formData.cuentaOrigen && formData.cuentaDestino &&
    parseFloat(formData.montoOrigen) > 0 && parseFloat(formData.montoDestino) > 0 &&
    parseFloat(formData.tasaCambio) > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4 p-4 bg-red-50 rounded-lg">
          <h4 className="font-semibold text-red-700">Sale de:</h4>
          <div className="space-y-2">
            <Label>Cuenta Origen</Label>
            <Select value={formData.cuentaOrigen} onValueChange={handleCuentaOrigenChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {metodosPago.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={formData.montoOrigen}
                onChange={(e) => setFormData({ ...formData, montoOrigen: e.target.value })}
                placeholder="0.00"
                className="flex-1"
              />
              <Badge variant="outline" className="self-center">
                {formData.monedaOrigen === 'VES' ? 'Bs' : '$'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-semibold text-green-700">Entra a:</h4>
          <div className="space-y-2">
            <Label>Cuenta Destino</Label>
            <Select value={formData.cuentaDestino} onValueChange={handleCuentaDestinoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {metodosPago.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={formData.montoDestino}
                onChange={(e) => setFormData({ ...formData, montoDestino: e.target.value })}
                placeholder="0.00"
                className="flex-1"
              />
              <Badge variant="outline" className="self-center">
                {formData.monedaDestino === 'VES' ? 'Bs' : '$'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label>Tasa de Cambio</Label>
          <Input
            type="number"
            step="0.0001"
            value={formData.tasaCambio}
            onChange={(e) => setFormData({ ...formData, tasaCambio: e.target.value })}
            placeholder="Ej: 36.5000"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={calcularTasa}
          disabled={!formData.montoOrigen || !formData.montoDestino}
        >
          <Calculator className="h-4 w-4 mr-1" />
          Calcular
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Ubicación actual del dinero</Label>
        <div className="flex gap-2">
          <Input
            value={formData.ubicacionActual}
            onChange={(e) => setFormData({ ...formData, ubicacionActual: e.target.value })}
            placeholder="Ej: Binance Sr. Jose, Banesco, etc."
            className="flex-1"
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {ubicacionesSugeridas.slice(0, 5).map((ub) => (
            <Badge
              key={ub}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => setFormData({ ...formData, ubicacionActual: ub })}
            >
              {ub}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notas (opcional)</Label>
        <Textarea
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          placeholder="Notas adicionales..."
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending || !isValid}>
          {mutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando...</>
          ) : (
            'Registrar Conversion'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditConversionDialog({
  conversion,
  open,
  onOpenChange,
}: {
  conversion: ConversionMoneda;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { formatMonto } = useMonto();
  const queryClient = useQueryClient();
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [notasMovimiento, setNotasMovimiento] = useState('');

  // Obtener detalle con movimientos
  const { data: detalle, isLoading } = useQuery({
    queryKey: ['conversion', conversion.id],
    queryFn: () => finanzasApi.getConversionById(conversion.id),
    enabled: open,
  });

  const movimientoMutation = useMutation({
    mutationFn: () =>
      finanzasApi.registrarMovimiento(conversion.id, {
        ubicacionNueva: nuevaUbicacion,
        notas: notasMovimiento || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversion', conversion.id] });
      queryClient.invalidateQueries({ queryKey: ['conversiones'] });
      toast({ title: 'Ubicación actualizada', variant: 'success' });
      setNuevaUbicacion('');
      setNotasMovimiento('');
    },
    onError: () => {
      toast({ title: 'Error al actualizar ubicación', variant: 'destructive' });
    },
  });

  const handleRegistrarMovimiento = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaUbicacion) {
      movimientoMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Tracking de Conversión
          </DialogTitle>
          <DialogDescription>
            {formatDate(conversion.fecha)} - ${conversion.montoDestino.toFixed(2)} USDT
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Resumen de la conversion */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Salió de</p>
                <p className="font-medium">{getMetodoLabel(conversion.cuentaOrigen)}</p>
                <p className="text-red-600 font-semibold">
                  -{formatMonto(conversion.montoOrigen, conversion.monedaOrigen === 'VES' ? 'VES' : 'USD')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entró a</p>
                <p className="font-medium">{getMetodoLabel(conversion.cuentaDestino)}</p>
                <p className="text-green-600 font-semibold">
                  +{formatMonto(conversion.montoDestino, conversion.monedaDestino === 'VES' ? 'VES' : 'USD')}
                </p>
              </div>
            </div>

            {/* Ubicación actual */}
            <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-semibold">Ubicación Actual</span>
              </div>
              <p className="text-xl font-bold text-primary">
                {detalle?.ubicacionActual || conversion.ubicacionActual || 'Sin asignar'}
              </p>
            </div>

            <Separator />

            {/* Formulario para registrar movimiento */}
            <form onSubmit={handleRegistrarMovimiento} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Mover a nueva ubicación
                </Label>
                <Input
                  value={nuevaUbicacion}
                  onChange={(e) => setNuevaUbicacion(e.target.value)}
                  placeholder="Nueva ubicación del dinero..."
                />
                <div className="flex flex-wrap gap-1">
                  {ubicacionesSugeridas.map((ub) => (
                    <Badge
                      key={ub}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                      onClick={() => setNuevaUbicacion(ub)}
                    >
                      {ub}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas del movimiento (opcional)</Label>
                <Input
                  value={notasMovimiento}
                  onChange={(e) => setNotasMovimiento(e.target.value)}
                  placeholder="Motivo del movimiento..."
                />
              </div>
              <Button
                type="submit"
                disabled={!nuevaUbicacion || movimientoMutation.isPending}
                className="w-full"
              >
                {movimientoMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando...</>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Registrar Movimiento
                  </>
                )}
              </Button>
            </form>

            <Separator />

            {/* Historial de movimientos */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <History className="h-4 w-4" />
                Historial de Movimientos
              </h4>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : detalle?.movimientos && detalle.movimientos.length > 0 ? (
                <div className="space-y-2">
                  {detalle.movimientos.map((mov) => (
                    <div key={mov.id} className="p-3 bg-muted rounded-lg text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <span>{formatDate(mov.fecha)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{mov.ubicacionAnterior || 'Inicial'}</span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-medium">{mov.ubicacionNueva}</span>
                      </div>
                      {mov.notas && (
                        <p className="text-muted-foreground mt-1 text-xs">{mov.notas}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No hay movimientos registrados
                </p>
              )}
            </div>

            {/* Notas originales */}
            {conversion.notas && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Notas de la conversión</h4>
                  <p className="text-sm text-muted-foreground">{conversion.notas}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ConversionesPage() {
  const { formatMonto } = useMonto();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConversion, setEditingConversion] = useState<ConversionMoneda | null>(null);
  const queryClient = useQueryClient();

  const { data: conversiones, isLoading } = useQuery({
    queryKey: ['conversiones', { page }],
    queryFn: () => finanzasApi.getConversiones({ page, limit: 15 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => finanzasApi.deleteConversion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversiones'] });
      queryClient.invalidateQueries({ queryKey: ['distribucion-fondos'] });
      toast({ title: 'Conversion eliminada', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finanzas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conversiones</h1>
            <p className="text-muted-foreground">
              Historial de conversiones y tracking de ubicación
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Conversion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva Conversion</DialogTitle>
              <DialogDescription>
                Registra una conversion de fondos entre cuentas o monedas
              </DialogDescription>
            </DialogHeader>
            <ConversionForm
              onClose={() => setDialogOpen(false)}
              onSuccess={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Historial de Conversiones
          </CardTitle>
          <CardDescription>
            Haz clic en una conversión para ver el tracking completo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Sale</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Entra</TableHead>
                <TableHead>Ubicación Actual</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : !conversiones?.data || conversiones.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No hay conversiones registradas
                  </TableCell>
                </TableRow>
              ) : (
                conversiones.data.map((conversion) => (
                  <TableRow
                    key={conversion.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setEditingConversion(conversion)}
                  >
                    <TableCell className="text-muted-foreground">
                      {formatDate(conversion.fecha)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50">
                        {getMetodoLabel(conversion.cuentaOrigen)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -{formatMonto(conversion.montoOrigen, conversion.monedaOrigen === 'VES' ? 'VES' : 'USD')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50">
                        {getMetodoLabel(conversion.cuentaDestino)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      +{formatMonto(conversion.montoDestino, conversion.monedaDestino === 'VES' ? 'VES' : 'USD')}
                    </TableCell>
                    <TableCell>
                      {conversion.ubicacionActual ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <MapPin className="h-3 w-3" />
                          {conversion.ubicacionActual}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingConversion(conversion)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Eliminar esta conversion?')) {
                              deleteMutation.mutate(conversion.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {conversiones?.totalPages && conversiones.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {conversiones.data.length} de {conversiones.total} conversiones
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
              onClick={() => setPage((p) => Math.min(conversiones.totalPages, p + 1))}
              disabled={page === conversiones.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {editingConversion && (
        <EditConversionDialog
          conversion={editingConversion}
          open={!!editingConversion}
          onOpenChange={(open) => !open && setEditingConversion(null)}
        />
      )}
    </div>
  );
}
