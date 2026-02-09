'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Receipt,
  Zap,
  Wifi,
  Droplets,
  Phone,
  Home,
  Car,
  Utensils,
  MoreHorizontal,
  Wrench,
  ShoppingBag,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Skeleton } from '@/components/ui/skeleton';
import { finanzasApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useMonto } from '@/components/ui/monto';
import { toast } from '@/hooks/use-toast';

const tiposGasto = [
  { value: 'FIJO', label: 'Gasto Fijo' },
  { value: 'VARIABLE', label: 'Gasto Variable' },
  { value: 'SERVICIO', label: 'Servicios' },
  { value: 'COMPRA', label: 'Compra de Mercancía' },
  { value: 'OTRO', label: 'Otro' },
];

// Gastos comunes con montos por defecto
const gastosComunes = [
  { id: 'luz', nombre: 'Luz', descripcion: 'Servicio electrico mensual', icon: Zap, monto: 15, moneda: 'USD' as const, tipo: 'SERVICIO', color: 'bg-yellow-500' },
  { id: 'internet', nombre: 'Internet', descripcion: 'Servicio de internet/fibra', icon: Wifi, monto: 25, moneda: 'USD' as const, tipo: 'SERVICIO', color: 'bg-blue-500' },
  { id: 'agua', nombre: 'Agua', descripcion: 'Servicio de agua potable', icon: Droplets, monto: 10, moneda: 'USD' as const, tipo: 'SERVICIO', color: 'bg-cyan-500' },
  { id: 'telefono', nombre: 'Telefono', descripcion: 'Linea telefonica/movil', icon: Phone, monto: 10, moneda: 'USD' as const, tipo: 'SERVICIO', color: 'bg-green-500' },
  { id: 'alquiler', nombre: 'Alquiler', descripcion: 'Alquiler del local/oficina', icon: Home, monto: 200, moneda: 'USD' as const, tipo: 'FIJO', color: 'bg-purple-500' },
  { id: 'gasolina', nombre: 'Gasolina', descripcion: 'Combustible para vehiculos', icon: Car, monto: 20, moneda: 'USD' as const, tipo: 'VARIABLE', color: 'bg-orange-500' },
  { id: 'comida', nombre: 'Comida/Almuerzo', descripcion: 'Almuerzos y refrigerios', icon: Utensils, monto: 5, moneda: 'USD' as const, tipo: 'VARIABLE', color: 'bg-red-500' },
  { id: 'mantenimiento', nombre: 'Mantenimiento', descripcion: 'Reparaciones y mantenimiento', icon: Wrench, monto: 50, moneda: 'USD' as const, tipo: 'VARIABLE', color: 'bg-gray-500' },
  { id: 'compras', nombre: 'Compras Varias', descripcion: 'Suministros y materiales', icon: ShoppingBag, monto: 0, moneda: 'USD' as const, tipo: 'COMPRA', color: 'bg-pink-500' },
  { id: 'otro', nombre: 'Otro Gasto', descripcion: 'Gastos no categorizados', icon: MoreHorizontal, monto: 0, moneda: 'USD' as const, tipo: 'OTRO', color: 'bg-slate-500' },
];

type GastoRapido = {
  id: string;
  checked: boolean;
  monto: string;
  descripcionPersonalizada: string;
};

function TasaCambioForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tasa, setTasa] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => finanzasApi.setTasaCambio(parseFloat(tasa)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasa-cambio'] });
      queryClient.invalidateQueries({ queryKey: ['finanzas-resumen'] });
      toast({ title: 'Tasa de cambio actualizada', variant: 'success' });
      onSuccess();
    },
    onError: () => {
      toast({ title: 'Error al actualizar tasa', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tasa">Nueva tasa (Bs por 1 USD)</Label>
        <Input
          id="tasa"
          type="number"
          step="0.01"
          value={tasa}
          onChange={(e) => setTasa(e.target.value)}
          placeholder="Ej: 36.50"
          required
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function GastoForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    descripcion: '',
    monto: '',
    moneda: 'USD' as 'USD' | 'VES',
    tipo: 'VARIABLE',
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      finanzasApi.createGasto({
        descripcion: formData.descripcion,
        monto: parseFloat(formData.monto),
        moneda: formData.moneda,
        tipo: formData.tipo,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      queryClient.invalidateQueries({ queryKey: ['finanzas-resumen'] });
      toast({ title: 'Gasto registrado', variant: 'success' });
      onSuccess();
    },
    onError: () => {
      toast({ title: 'Error al registrar gasto', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripcion</Label>
        <Input
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          placeholder="Ej: Pago de internet"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monto">Monto</Label>
          <Input
            id="monto"
            type="number"
            step="0.01"
            value={formData.monto}
            onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Moneda</Label>
          <Select
            value={formData.moneda}
            onValueChange={(value: 'USD' | 'VES') =>
              setFormData({ ...formData, moneda: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="VES">VES (Bs)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tipo de gasto</Label>
        <Select
          value={formData.tipo}
          onValueChange={(value) => setFormData({ ...formData, tipo: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tiposGasto.map((tipo) => (
              <SelectItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending || !formData.descripcion || !formData.monto}>
          {mutation.isPending ? 'Guardando...' : 'Registrar Gasto'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Componente para la tabla de gastos rapidos
function GastosRapidosTable() {
  const queryClient = useQueryClient();
  const [gastosRapidos, setGastosRapidos] = useState<Record<string, GastoRapido>>(() => {
    const initial: Record<string, GastoRapido> = {};
    gastosComunes.forEach(g => {
      initial[g.id] = {
        id: g.id,
        checked: false,
        monto: g.monto > 0 ? g.monto.toString() : '',
        descripcionPersonalizada: '',
      };
    });
    return initial;
  });
  const [registrando, setRegistrando] = useState(false);

  const gastosSeleccionados = Object.values(gastosRapidos).filter(g => g.checked && parseFloat(g.monto) > 0);
  const totalSeleccionado = gastosSeleccionados.reduce((sum, g) => sum + parseFloat(g.monto || '0'), 0);

  const handleToggle = (id: string, checked: boolean) => {
    setGastosRapidos(prev => ({
      ...prev,
      [id]: { ...prev[id], checked }
    }));
  };

  const handleMontoChange = (id: string, monto: string) => {
    setGastosRapidos(prev => ({
      ...prev,
      [id]: { ...prev[id], monto }
    }));
  };

  const handleDescripcionChange = (id: string, descripcion: string) => {
    setGastosRapidos(prev => ({
      ...prev,
      [id]: { ...prev[id], descripcionPersonalizada: descripcion }
    }));
  };

  const registrarGastos = async () => {
    if (gastosSeleccionados.length === 0) return;

    setRegistrando(true);
    let exitosos = 0;
    let errores = 0;

    for (const gastoRapido of gastosSeleccionados) {
      const gastoConfig = gastosComunes.find(g => g.id === gastoRapido.id);
      if (!gastoConfig) continue;

      try {
        await finanzasApi.createGasto({
          descripcion: gastoRapido.descripcionPersonalizada || gastoConfig.nombre,
          monto: parseFloat(gastoRapido.monto),
          moneda: gastoConfig.moneda,
          tipo: gastoConfig.tipo,
        });
        exitosos++;
      } catch {
        errores++;
      }
    }

    setRegistrando(false);
    queryClient.invalidateQueries({ queryKey: ['gastos'] });
    queryClient.invalidateQueries({ queryKey: ['finanzas-resumen'] });

    if (exitosos > 0) {
      toast({
        title: `${exitosos} gasto(s) registrado(s)`,
        description: errores > 0 ? `${errores} fallaron` : undefined,
        variant: 'success'
      });
      // Limpiar selecciones
      setGastosRapidos(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          updated[id] = { ...updated[id], checked: false };
        });
        return updated;
      });
    } else if (errores > 0) {
      toast({ title: 'Error al registrar gastos', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Registro Rapido de Gastos
            </CardTitle>
            <CardDescription>
              Selecciona los gastos a registrar, ajusta los montos y registra todos de una vez
            </CardDescription>
          </div>
          {gastosSeleccionados.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {gastosSeleccionados.length} seleccionado(s)
              </p>
              <p className="text-lg font-bold text-red-600">
                Total: ${totalSeleccionado.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Gasto</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-32">Monto ($)</TableHead>
              <TableHead className="w-48">Nota (opcional)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gastosComunes.map((gasto) => {
              const Icon = gasto.icon;
              const gastoRapido = gastosRapidos[gasto.id];
              const tipoLabel = tiposGasto.find(t => t.value === gasto.tipo)?.label || gasto.tipo;

              return (
                <TableRow
                  key={gasto.id}
                  className={gastoRapido.checked ? 'bg-primary/5' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={gastoRapido.checked}
                      onCheckedChange={(checked) => handleToggle(gasto.id, checked === true)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`rounded-full p-1.5 ${gasto.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{gasto.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {gasto.descripcion}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {tipoLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={gastoRapido.monto}
                      onChange={(e) => handleMontoChange(gasto.id, e.target.value)}
                      className="h-8 text-right"
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={gastoRapido.descripcionPersonalizada}
                      onChange={(e) => handleDescripcionChange(gasto.id, e.target.value)}
                      className="h-8"
                      placeholder={gasto.nombre}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <div className="p-4 border-t flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Selecciona los gastos que deseas registrar y ajusta los montos segun corresponda
        </p>
        <Button
          onClick={registrarGastos}
          disabled={gastosSeleccionados.length === 0 || registrando}
          size="lg"
        >
          {registrando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Registrar {gastosSeleccionados.length > 0 ? `(${gastosSeleccionados.length})` : ''} Gastos
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

export default function FinanzasPage() {
  const { formatMonto } = useMonto();
  const [page, setPage] = useState(1);
  const [tasaDialogOpen, setTasaDialogOpen] = useState(false);
  const [gastoDialogOpen, setGastoDialogOpen] = useState(false);
  const [mostrarGastosRapidos, setMostrarGastosRapidos] = useState(false);

  const { data: resumen, isLoading: loadingResumen } = useQuery({
    queryKey: ['finanzas-resumen'],
    queryFn: () => finanzasApi.getResumen(),
  });

  const { data: tasaCambio, isLoading: loadingTasa } = useQuery({
    queryKey: ['tasa-cambio'],
    queryFn: finanzasApi.getTasaCambio,
  });

  const { data: gastos, isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos', { page }],
    queryFn: () => finanzasApi.getGastos({ page, limit: 10 }),
  });

  const isLoading = loadingResumen || loadingTasa;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
          <p className="text-muted-foreground">Control de ingresos, gastos y tasa de cambio</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={tasaDialogOpen} onOpenChange={setTasaDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar Tasa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Actualizar Tasa de Cambio</DialogTitle>
                <DialogDescription>
                  Ingresa la nueva tasa de cambio USD/VES
                </DialogDescription>
              </DialogHeader>
              <TasaCambioForm
                onClose={() => setTasaDialogOpen(false)}
                onSuccess={() => setTasaDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button
            onClick={() => setMostrarGastosRapidos(!mostrarGastosRapidos)}
            variant={mostrarGastosRapidos ? 'default' : 'outline'}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {mostrarGastosRapidos ? 'Ocultar Gastos Rapidos' : 'Registrar Gastos'}
          </Button>

          <Dialog open={gastoDialogOpen} onOpenChange={setGastoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Otro Gasto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Gasto Personalizado</DialogTitle>
                <DialogDescription>
                  Para gastos que no estan en la tabla de gastos rapidos
                </DialogDescription>
              </DialogHeader>
              <GastoForm
                onClose={() => setGastoDialogOpen(false)}
                onSuccess={() => setGastoDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatMonto(resumen?.ingresos || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Este mes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatMonto(resumen?.gastos || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Este mes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    (resumen?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatMonto(resumen?.balance || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Ingresos - Gastos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Cambio</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(tasaCambio?.tasa || 0).toFixed(2)} Bs/$
                </div>
                <p className="text-xs text-muted-foreground">
                  {tasaCambio?.fecha ? formatDate(tasaCambio.fecha) : 'Sin actualizar'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabla de Gastos Rapidos */}
      {mostrarGastosRapidos && <GastosRapidosTable />}

      {/* Gastos Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historial de Gastos
          </CardTitle>
          <CardDescription>Registro de todos los gastos realizados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingGastos ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : !gastos?.data || gastos.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No hay gastos registrados
                  </TableCell>
                </TableRow>
              ) : (
                gastos?.data.map((gasto) => (
                  <TableRow key={gasto.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(gasto.fecha)}
                    </TableCell>
                    <TableCell className="font-medium">{gasto.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tiposGasto.find((t) => t.value === gasto.tipo)?.label || gasto.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -{formatMonto(gasto.monto, gasto.moneda)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {gastos?.totalPages && gastos.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {gastos.data.length} de {gastos.total} gastos
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
              onClick={() => setPage((p) => Math.min(gastos.totalPages, p + 1))}
              disabled={page === gastos.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
