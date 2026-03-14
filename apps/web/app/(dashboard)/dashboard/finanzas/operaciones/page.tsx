'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Banknote,
  ArrowRightLeft,
  Coins,
  MoreHorizontal,
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
import {
  finanzasApi,
  MetodoPago,
  TipoOperacionExterna,
  OperacionExterna,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useMonto } from '@/components/ui/monto';
import { toast } from '@/hooks/use-toast';

const metodosPago: { value: MetodoPago; label: string }[] = [
  { value: 'EFECTIVO_USD', label: 'Efectivo USD' },
  { value: 'EFECTIVO_BS', label: 'Efectivo Bs' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'BANESCO', label: 'Banesco' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'BINANCE_USDT', label: 'Binance USDT (Personal)' },
  { value: 'BINANCE_ELEVASHOP', label: 'Binance Elevashop' },
  { value: 'TRANSFERENCIA_BS', label: 'Transferencia Bs' },
  { value: 'TRANSFERENCIA_USD', label: 'Transferencia USD' },
  { value: 'PAGO_MOVIL', label: 'Pago Movil' },
  { value: 'EFECTIVO_CHILE', label: 'Efectivo Chile' },
];

const tiposOperacion: { value: TipoOperacionExterna; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'INVERSION', label: 'Inversion', icon: TrendingUp, color: 'bg-blue-500' },
  { value: 'CAMBIO', label: 'Cambio', icon: ArrowRightLeft, color: 'bg-purple-500' },
  { value: 'PRESTAMO', label: 'Prestamo', icon: Coins, color: 'bg-yellow-500' },
  { value: 'OTRO', label: 'Otro', icon: MoreHorizontal, color: 'bg-gray-500' },
];

const getMetodoLabel = (value: MetodoPago) => {
  return metodosPago.find(m => m.value === value)?.label || value;
};

const getTipoInfo = (value: TipoOperacionExterna) => {
  return tiposOperacion.find(t => t.value === value) || tiposOperacion[3];
};

// Componente para crear nueva operacion
function NuevaOperacionForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '' as TipoOperacionExterna,
    cuentaOrigen: '' as MetodoPago,
    montoSalida: '',
    notas: '',
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      finanzasApi.createOperacionExterna({
        nombre: formData.nombre,
        tipo: formData.tipo,
        cuentaOrigen: formData.cuentaOrigen,
        montoSalida: parseFloat(formData.montoSalida),
        notas: formData.notas || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operaciones-externas'] });
      queryClient.invalidateQueries({ queryKey: ['distribucion-fondos'] });
      toast({ title: 'Operacion creada', variant: 'success' });
      onSuccess();
    },
    onError: () => {
      toast({ title: 'Error al crear operacion', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const isValid = formData.nombre && formData.tipo && formData.cuentaOrigen &&
    parseFloat(formData.montoSalida) > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nombre de la Operacion</Label>
        <Input
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          placeholder="Ej: Inversion Carros Suzuki"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Operacion</Label>
          <Select
            value={formData.tipo}
            onValueChange={(value: TipoOperacionExterna) =>
              setFormData({ ...formData, tipo: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposOperacion.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-2">
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Cuenta de Origen</Label>
          <Select
            value={formData.cuentaOrigen}
            onValueChange={(value: MetodoPago) =>
              setFormData({ ...formData, cuentaOrigen: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="De donde sale" />
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
      </div>

      <div className="space-y-2">
        <Label>Monto que Sale ($)</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.montoSalida}
          onChange={(e) => setFormData({ ...formData, montoSalida: e.target.value })}
          placeholder="0.00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Notas (opcional)</Label>
        <Textarea
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          placeholder="Detalles de la operacion..."
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
              Creando...
            </>
          ) : (
            'Crear Operacion'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Componente para cerrar operacion
function CerrarOperacionForm({
  operacion,
  onClose,
  onSuccess,
}: {
  operacion: OperacionExterna;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    cuentaDestino: '' as MetodoPago,
    montoEntrada: '',
    notas: '',
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      finanzasApi.cerrarOperacionExterna(operacion.id, {
        cuentaDestino: formData.cuentaDestino,
        montoEntrada: parseFloat(formData.montoEntrada),
        notas: formData.notas || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operaciones-externas'] });
      queryClient.invalidateQueries({ queryKey: ['distribucion-fondos'] });
      toast({ title: 'Operacion cerrada', variant: 'success' });
      onSuccess();
    },
    onError: () => {
      toast({ title: 'Error al cerrar operacion', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const montoEntrada = parseFloat(formData.montoEntrada) || 0;
  const gananciaPerdida = montoEntrada - operacion.montoSalida;

  const isValid = formData.cuentaDestino && parseFloat(formData.montoEntrada) >= 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">Operacion:</p>
        <p className="font-semibold">{operacion.nombre}</p>
        <p className="text-sm text-muted-foreground mt-2">Monto inicial:</p>
        <p className="font-semibold text-red-600">-${operacion.montoSalida.toFixed(2)}</p>
      </div>

      <div className="space-y-2">
        <Label>Cuenta donde entra el dinero</Label>
        <Select
          value={formData.cuentaDestino}
          onValueChange={(value: MetodoPago) =>
            setFormData({ ...formData, cuentaDestino: value })
          }
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
        <Label>Monto que Entra ($)</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.montoEntrada}
          onChange={(e) => setFormData({ ...formData, montoEntrada: e.target.value })}
          placeholder="0.00"
          required
        />
      </div>

      {formData.montoEntrada && (
        <div className={`p-3 rounded-lg ${gananciaPerdida >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-sm text-muted-foreground">Resultado:</p>
          <p className={`text-lg font-bold ${gananciaPerdida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {gananciaPerdida >= 0 ? '+' : ''}{gananciaPerdida.toFixed(2)}
            <span className="text-sm font-normal ml-2">
              {gananciaPerdida >= 0 ? 'Ganancia' : 'Perdida'}
            </span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Notas (opcional)</Label>
        <Textarea
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          placeholder="Notas sobre el cierre..."
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
              Cerrando...
            </>
          ) : (
            'Cerrar Operacion'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Card de operacion activa
function OperacionActivaCard({ operacion }: { operacion: OperacionExterna }) {
  const { formatMonto } = useMonto();
  const [cerrarDialogOpen, setCerrarDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const tipoInfo = getTipoInfo(operacion.tipo);
  const Icon = tipoInfo.icon;

  const cancelarMutation = useMutation({
    mutationFn: () => finanzasApi.cancelarOperacionExterna(operacion.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operaciones-externas'] });
      queryClient.invalidateQueries({ queryKey: ['distribucion-fondos'] });
      toast({ title: 'Operacion cancelada', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Error al cancelar', variant: 'destructive' });
    },
  });

  const diasActiva = Math.floor(
    (new Date().getTime() - new Date(operacion.fechaInicio).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="border-2 border-yellow-400 bg-yellow-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`rounded-full p-2 ${tipoInfo.color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{operacion.nombre}</CardTitle>
              <CardDescription>
                {tipoInfo.label} - {diasActiva} dias activa
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Activa
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Salio de:</p>
            <p className="font-medium">{getMetodoLabel(operacion.cuentaOrigen)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Monto:</p>
            <p className="font-bold text-red-600 text-xl">
              -{formatMonto(operacion.montoSalida)}
            </p>
          </div>
        </div>

        {operacion.notas && (
          <p className="text-sm text-muted-foreground mb-4">{operacion.notas}</p>
        )}

        <div className="flex gap-2">
          <Dialog open={cerrarDialogOpen} onOpenChange={setCerrarDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1" variant="default">
                <CheckCircle className="mr-2 h-4 w-4" />
                Cerrar Operacion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cerrar Operacion</DialogTitle>
                <DialogDescription>
                  Registra el cierre de la operacion y el monto recibido
                </DialogDescription>
              </DialogHeader>
              <CerrarOperacionForm
                operacion={operacion}
                onClose={() => setCerrarDialogOpen(false)}
                onSuccess={() => setCerrarDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm('Cancelar esta operacion? Se devolvera el dinero a la cuenta origen.')) {
                cancelarMutation.mutate();
              }
            }}
            disabled={cancelarMutation.isPending}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OperacionesPage() {
  const { formatMonto } = useMonto();
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: operaciones, isLoading } = useQuery({
    queryKey: ['operaciones-externas'],
    queryFn: () => finanzasApi.getOperacionesExternas(),
  });

  const operacionesActivas = operaciones?.filter(op => op.estado === 'ACTIVA') || [];
  const operacionesHistorial = operaciones?.filter(op => op.estado !== 'ACTIVA') || [];

  const totalActivo = operacionesActivas.reduce((sum, op) => sum + op.montoSalida, 0);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => finanzasApi.deleteOperacionExterna(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operaciones-externas'] });
      toast({ title: 'Operacion eliminada', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al eliminar',
        description: error.response?.data?.message || 'No se puede eliminar operaciones activas',
        variant: 'destructive',
      });
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
            <h1 className="text-3xl font-bold tracking-tight">Operaciones Externas</h1>
            <p className="text-muted-foreground">
              Inversiones, cambios y prestamos fuera del sistema
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Operacion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Operacion Externa</DialogTitle>
              <DialogDescription>
                Registra dinero que sale temporalmente del sistema
              </DialogDescription>
            </DialogHeader>
            <NuevaOperacionForm
              onClose={() => setDialogOpen(false)}
              onSuccess={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen operaciones activas */}
      {operacionesActivas.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Operaciones Activas
                </CardTitle>
                <CardDescription>
                  {operacionesActivas.length} operacion(es) pendientes de cierre
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total comprometido:</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {formatMonto(totalActivo)}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Grid de operaciones activas */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : operacionesActivas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {operacionesActivas.map((operacion) => (
            <OperacionActivaCard key={operacion.id} operacion={operacion} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin operaciones activas</h3>
            <p className="text-muted-foreground mb-4">
              No hay inversiones o cambios pendientes de cierre
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Operacion
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Historial de operaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Historial de Operaciones
          </CardTitle>
          <CardDescription>
            Operaciones completadas y canceladas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Salio</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Entro</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operacionesHistorial.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No hay operaciones en el historial
                  </TableCell>
                </TableRow>
              ) : (
                operacionesHistorial.map((operacion) => {
                  const tipoInfo = getTipoInfo(operacion.tipo);
                  const Icon = tipoInfo.icon;
                  return (
                    <TableRow key={operacion.id}>
                      <TableCell className="font-medium">{operacion.nombre}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Icon className="h-4 w-4" />
                          {tipoInfo.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={operacion.estado === 'COMPLETADA' ? 'default' : 'secondary'}
                          className={operacion.estado === 'COMPLETADA' ? 'bg-green-500' : 'bg-gray-400'}
                        >
                          {operacion.estado === 'COMPLETADA' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {operacion.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getMetodoLabel(operacion.cuentaOrigen)}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatMonto(operacion.montoSalida)}
                      </TableCell>
                      <TableCell>
                        {operacion.cuentaDestino ? (
                          <Badge variant="outline">{getMetodoLabel(operacion.cuentaDestino)}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {operacion.montoEntrada ? `+${formatMonto(operacion.montoEntrada)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {operacion.gananciaPerdida !== null && operacion.gananciaPerdida !== undefined ? (
                          <span className={operacion.gananciaPerdida >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {operacion.gananciaPerdida >= 0 ? (
                              <TrendingUp className="h-4 w-4 inline mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 inline mr-1" />
                            )}
                            {operacion.gananciaPerdida >= 0 ? '+' : ''}
                            {formatMonto(operacion.gananciaPerdida)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{formatDate(operacion.fechaInicio)}</div>
                        {operacion.fechaCierre && (
                          <div className="text-xs">{formatDate(operacion.fechaCierre)}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Eliminar esta operacion del historial?')) {
                              deleteMutation.mutate(operacion.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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
