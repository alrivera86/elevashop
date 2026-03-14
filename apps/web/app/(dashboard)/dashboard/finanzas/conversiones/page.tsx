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
import { finanzasApi, MetodoPago, Moneda } from '@/lib/api';
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

  // Autoselect moneda based on cuenta
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

  // Calculate tasa automatically
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
        {/* Origen */}
        <div className="space-y-4 p-4 bg-red-50 rounded-lg">
          <h4 className="font-semibold text-red-700">Sale de:</h4>
          <div className="space-y-2">
            <Label>Cuenta Origen</Label>
            <Select
              value={formData.cuentaOrigen}
              onValueChange={handleCuentaOrigenChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {metodosPago.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
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

        {/* Destino */}
        <div className="space-y-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-semibold text-green-700">Entra a:</h4>
          <div className="space-y-2">
            <Label>Cuenta Destino</Label>
            <Select
              value={formData.cuentaDestino}
              onValueChange={handleCuentaDestinoChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {metodosPago.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
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
        <Label>Notas (opcional)</Label>
        <Textarea
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          placeholder="Notas adicionales sobre la conversion..."
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending || !isValid}>
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar Conversion'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ConversionesPage() {
  const { formatMonto } = useMonto();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
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
              Historial de conversiones entre cuentas y monedas
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
            Todas las conversiones realizadas entre cuentas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Monto Sale</TableHead>
                <TableHead></TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Monto Entra</TableHead>
                <TableHead className="text-right">Tasa</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : !conversiones?.data || conversiones.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No hay conversiones registradas
                  </TableCell>
                </TableRow>
              ) : (
                conversiones.data.map((conversion) => (
                  <TableRow key={conversion.id}>
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
                    <TableCell className="text-center">
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50">
                        {getMetodoLabel(conversion.cuentaDestino)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      +{formatMonto(conversion.montoDestino, conversion.monedaDestino === 'VES' ? 'VES' : 'USD')}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {conversion.tasaCambio.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {conversion.notas || '-'}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
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
    </div>
  );
}
