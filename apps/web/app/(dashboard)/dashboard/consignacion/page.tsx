'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Users,
  DollarSign,
  Plus,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import {
  consignacionApi,
  inventarioApi,
  Consignatario,
  Consignacion,
  ConsignacionDashboard,
  ResumenPorCobrar,
  MetodoPago,
  CreateConsignatarioData,
  CreateConsignacionData,
  RegistrarPagoData,
  ProductoConSeriales,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Componente de tarjeta de estadísticas
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'success' | 'danger';
}) {
  const variantClasses = {
    default: 'bg-background',
    warning: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
    success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    danger: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de estado de consignación
function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PENDIENTE: { label: 'Pendiente', variant: 'secondary' },
    EN_PROCESO: { label: 'En Proceso', variant: 'default' },
    LIQUIDADA: { label: 'Liquidada', variant: 'outline' },
    VENCIDA: { label: 'Vencida', variant: 'destructive' },
    CANCELADA: { label: 'Cancelada', variant: 'outline' },
  };

  const { label, variant } = config[estado] || { label: estado, variant: 'default' };

  return <Badge variant={variant}>{label}</Badge>;
}

// Componente de estado de detalle
function EstadoDetalleBadge({ estado }: { estado: string }) {
  const config: Record<string, { label: string; className: string }> = {
    CONSIGNADO: { label: 'Consignado', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    VENDIDO: { label: 'Vendido', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    DEVUELTO: { label: 'Devuelto', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  };

  const { label, className } = config[estado] || { label: estado, className: '' };

  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>{label}</span>;
}

// Diálogo para crear consignatario
function NuevoConsignatarioDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateConsignatarioData>({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    rifCedula: '',
    notas: '',
  });

  const mutation = useMutation({
    mutationFn: consignacionApi.createConsignatario,
    onSuccess: () => {
      toast({ title: 'Consignatario creado exitosamente', variant: 'default' });
      setOpen(false);
      setFormData({ nombre: '', telefono: '', email: '', direccion: '', rifCedula: '', notas: '' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: error.response?.data?.message || 'Error al crear consignatario', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Consignatario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo Consignatario</DialogTitle>
            <DialogDescription>
              Registrar un vendedor externo que recibirá mercancía en consignación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rifCedula">RIF/Cédula</Label>
                <Input
                  id="rifCedula"
                  value={formData.rifCedula}
                  onChange={(e) => setFormData({ ...formData, rifCedula: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Textarea
                id="direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Diálogo para crear consignación
function NuevaConsignacionDialog({ consignatarios, onSuccess }: { consignatarios: Consignatario[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [consignatarioId, setConsignatarioId] = useState<number | null>(null);
  const [fechaLimite, setFechaLimite] = useState('');
  const [notas, setNotas] = useState('');
  const [selectedUnidades, setSelectedUnidades] = useState<Map<number, { productoId: number; precioConsignacion: number }>>(new Map());

  // Buscar productos con seriales disponibles
  const { data: productosData } = useQuery({
    queryKey: ['productos-seriales-disponibles'],
    queryFn: () => inventarioApi.getInventarioConSeriales({ limit: 100 }),
    enabled: open && step === 2,
  });

  const mutation = useMutation({
    mutationFn: consignacionApi.createConsignacion,
    onSuccess: () => {
      toast({ title: 'Consignación creada exitosamente', variant: 'default' });
      setOpen(false);
      resetForm();
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: error.response?.data?.message || 'Error al crear consignación', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setStep(1);
    setConsignatarioId(null);
    setFechaLimite('');
    setNotas('');
    setSelectedUnidades(new Map());
  };

  const handleToggleUnidad = (unidadId: number, productoId: number, precioCosto: number) => {
    const newSelected = new Map(selectedUnidades);
    if (newSelected.has(unidadId)) {
      newSelected.delete(unidadId);
    } else {
      newSelected.set(unidadId, { productoId, precioConsignacion: precioCosto });
    }
    setSelectedUnidades(newSelected);
  };

  const handlePrecioChange = (unidadId: number, precio: number) => {
    const item = selectedUnidades.get(unidadId);
    if (item) {
      const newSelected = new Map(selectedUnidades);
      newSelected.set(unidadId, { ...item, precioConsignacion: precio });
      setSelectedUnidades(newSelected);
    }
  };

  const handleSubmit = () => {
    if (!consignatarioId || selectedUnidades.size === 0) {
      toast({ title: 'Selecciona un consignatario y al menos un producto', variant: 'destructive' });
      return;
    }

    const data: CreateConsignacionData = {
      consignatarioId,
      fechaLimite: fechaLimite || undefined,
      notas: notas || undefined,
      detalles: Array.from(selectedUnidades.entries()).map(([unidadId, item]) => ({
        productoId: item.productoId,
        unidadInventarioId: unidadId,
        precioConsignacion: item.precioConsignacion,
      })),
    };

    mutation.mutate(data);
  };

  const totalConsignacion = Array.from(selectedUnidades.values()).reduce(
    (sum, item) => sum + item.precioConsignacion,
    0
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Consignación
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Consignación</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Paso 1: Selecciona el consignatario' : 'Paso 2: Selecciona los productos'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Consignatario *</Label>
              <Select
                value={consignatarioId?.toString() || ''}
                onValueChange={(v) => setConsignatarioId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un consignatario" />
                </SelectTrigger>
                <SelectContent>
                  {consignatarios.filter(c => c.activo).map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nombre} {c.telefono ? `- ${c.telefono}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fechaLimite">Fecha Límite (opcional)</Label>
              <Input
                id="fechaLimite"
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setStep(2)} disabled={!consignatarioId}>
                Siguiente
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-4">
              Selecciona los productos con sus seriales para consignar. Puedes ajustar el precio de consignación.
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {productosData?.productos?.filter(p => p.estadisticasSeriales.disponibles > 0).map((producto) => (
                <Collapsible key={producto.id} className="border-b last:border-b-0">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 transition-transform ui-expanded:rotate-90" />
                      <span className="font-medium">{producto.codigo}</span>
                      <span className="text-muted-foreground">{producto.nombre}</span>
                    </div>
                    <Badge variant="secondary">
                      {producto.estadisticasSeriales.disponibles} disponibles
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="space-y-2 ml-6">
                      {producto.unidadesInventario?.filter(u => u.estado === 'DISPONIBLE').map((unidad) => (
                        <div
                          key={unidad.id}
                          className={`flex items-center justify-between p-2 rounded border ${
                            selectedUnidades.has(unidad.id) ? 'bg-primary/10 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedUnidades.has(unidad.id)}
                              onCheckedChange={() =>
                                handleToggleUnidad(unidad.id, producto.id, producto.precioElevapartes)
                              }
                            />
                            <span className="font-mono text-sm">{unidad.serial}</span>
                          </div>
                          {selectedUnidades.has(unidad.id) && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Precio:</Label>
                              <Input
                                type="number"
                                className="w-24 h-8"
                                value={selectedUnidades.get(unidad.id)?.precioConsignacion || 0}
                                onChange={(e) =>
                                  handlePrecioChange(unidad.id, Number(e.target.value))
                                }
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {selectedUnidades.size > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {selectedUnidades.size} unidad{selectedUnidades.size !== 1 ? 'es' : ''} seleccionada{selectedUnidades.size !== 1 ? 's' : ''}
                  </span>
                  <span className="text-lg font-bold">{formatCurrency(totalConsignacion)}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={mutation.isPending || selectedUnidades.size === 0}>
                {mutation.isPending ? 'Creando...' : 'Crear Consignación'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Diálogo para registrar pago
function RegistrarPagoDialog({ consignatarios, onSuccess }: { consignatarios: Consignatario[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<RegistrarPagoData>({
    consignatarioId: 0,
    monto: 0,
    metodoPago: 'EFECTIVO_USD',
    referencia: '',
    notas: '',
  });

  const mutation = useMutation({
    mutationFn: consignacionApi.registrarPago,
    onSuccess: () => {
      toast({ title: 'Pago registrado exitosamente', variant: 'default' });
      setOpen(false);
      setFormData({ consignatarioId: 0, monto: 0, metodoPago: 'EFECTIVO_USD', referencia: '', notas: '' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: error.response?.data?.message || 'Error al registrar pago', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const metodosPago: { value: MetodoPago; label: string }[] = [
    { value: 'EFECTIVO_USD', label: 'Efectivo USD' },
    { value: 'EFECTIVO_BS', label: 'Efectivo Bs' },
    { value: 'ZELLE', label: 'Zelle' },
    { value: 'BANESCO', label: 'Banesco' },
    { value: 'TRANSFERENCIA_BS', label: 'Transferencia Bs' },
    { value: 'TRANSFERENCIA_USD', label: 'Transferencia USD' },
    { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
    { value: 'BINANCE', label: 'Binance' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CreditCard className="mr-2 h-4 w-4" />
          Registrar Pago
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registrar un abono o pago de un consignatario.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Consignatario *</Label>
              <Select
                value={formData.consignatarioId.toString()}
                onValueChange={(v) => setFormData({ ...formData, consignatarioId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un consignatario" />
                </SelectTrigger>
                <SelectContent>
                  {consignatarios.filter(c => c.saldoPendiente > 0).map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nombre} - Debe: {formatCurrency(c.saldoPendiente)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Método de Pago</Label>
                <Select
                  value={formData.metodoPago}
                  onValueChange={(v) => setFormData({ ...formData, metodoPago: v as MetodoPago })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosPago.map((mp) => (
                      <SelectItem key={mp.value} value={mp.value}>
                        {mp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="referencia">Referencia</Label>
              <Input
                id="referencia"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || !formData.consignatarioId || formData.monto <= 0}>
              {mutation.isPending ? 'Guardando...' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente principal de la página
export default function ConsignacionPage() {
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['consignacion-dashboard'],
    queryFn: consignacionApi.getDashboard,
  });

  const { data: consignatariosData, isLoading: loadingConsignatarios } = useQuery({
    queryKey: ['consignatarios'],
    queryFn: () => consignacionApi.getConsignatarios({ limit: 100 }),
  });

  const { data: consignacionesData, isLoading: loadingConsignaciones } = useQuery({
    queryKey: ['consignaciones'],
    queryFn: () => consignacionApi.getConsignaciones({ limit: 50 }),
  });

  const { data: porCobrar, isLoading: loadingPorCobrar } = useQuery({
    queryKey: ['consignacion-por-cobrar'],
    queryFn: consignacionApi.getPorCobrar,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['consignacion-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['consignatarios'] });
    queryClient.invalidateQueries({ queryKey: ['consignaciones'] });
    queryClient.invalidateQueries({ queryKey: ['consignacion-por-cobrar'] });
  };

  const consignatarios = consignatariosData?.consignatarios || [];
  const consignaciones = consignacionesData?.consignaciones || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consignaciones</h1>
          <p className="text-muted-foreground">
            Gestión de mercancía en consignación con vendedores externos
          </p>
        </div>
        <div className="flex gap-2">
          <RegistrarPagoDialog consignatarios={consignatarios} onSuccess={handleRefresh} />
          <NuevoConsignatarioDialog onSuccess={handleRefresh} />
          <NuevaConsignacionDialog consignatarios={consignatarios} onSuccess={handleRefresh} />
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingDashboard ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="mt-2 h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Valor Consignado"
              value={formatCurrency(dashboard?.valorTotalConsignado || 0)}
              description={`${dashboard?.totalConsignatarios || 0} consignatarios activos`}
              icon={Package}
            />
            <StatCard
              title="Por Cobrar"
              value={formatCurrency(dashboard?.valorPorCobrar || 0)}
              description={`${dashboard?.consignacionesPendientes || 0} consignaciones pendientes`}
              icon={DollarSign}
              variant="warning"
            />
            <StatCard
              title="Total Pagado"
              value={formatCurrency(dashboard?.valorTotalPagado || 0)}
              description="Pagos recibidos"
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              title="Vencidas"
              value={dashboard?.consignacionesVencidas || 0}
              description="Requieren atención"
              icon={AlertTriangle}
              variant={dashboard?.consignacionesVencidas ? 'danger' : 'default'}
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="por-cobrar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="por-cobrar">Por Cobrar</TabsTrigger>
          <TabsTrigger value="consignaciones">Consignaciones</TabsTrigger>
          <TabsTrigger value="consignatarios">Consignatarios</TabsTrigger>
        </TabsList>

        {/* Tab: Por Cobrar */}
        <TabsContent value="por-cobrar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Deudas</CardTitle>
              <CardDescription>
                Detalle de lo que debe cada consignatario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPorCobrar ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : porCobrar && porCobrar.length > 0 ? (
                <div className="space-y-4">
                  {porCobrar.map((item) => (
                    <Collapsible key={item.consignatario.id} className="border rounded-lg">
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <ChevronRight className="h-4 w-4" />
                          <div>
                            <p className="font-medium text-left">{item.consignatario.nombre}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.consignatario.telefono}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-orange-600">
                            {formatCurrency(item.saldoPendiente)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pagado: {formatCurrency(item.totalPagado)} de {formatCurrency(item.totalConsignado)}
                          </p>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4">
                        <div className="ml-8 space-y-3">
                          {item.consignaciones.map((con) => (
                            <div key={con.id} className="border rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm">{con.numero}</span>
                                  <EstadoBadge estado={con.estado} />
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(con.fechaEntrega).toLocaleDateString('es-VE')}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {con.detalles.map((d) => (
                                  <div
                                    key={d.id}
                                    className="flex justify-between items-center text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <EstadoDetalleBadge estado={d.estado} />
                                      <span>{d.producto.codigo}</span>
                                      <span className="text-muted-foreground">({d.serial})</span>
                                    </div>
                                    <span>{formatCurrency(d.precioConsignacion)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500/50" />
                  <p className="mt-2 text-muted-foreground">No hay deudas pendientes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Consignaciones */}
        <TabsContent value="consignaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Consignaciones</CardTitle>
              <CardDescription>
                Todas las consignaciones registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConsignaciones ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : consignaciones.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Consignatario</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consignaciones.map((con) => (
                      <TableRow key={con.id}>
                        <TableCell className="font-mono">{con.numero}</TableCell>
                        <TableCell>
                          {(con.consignatario as any)?.nombre || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(con.fechaEntrega).toLocaleDateString('es-VE')}
                        </TableCell>
                        <TableCell>{con._count?.detalles || con.detalles?.length || 0}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(con.valorTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(con.valorPendiente)}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={con.estado} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-muted-foreground">No hay consignaciones registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Consignatarios */}
        <TabsContent value="consignatarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendedores Externos</CardTitle>
              <CardDescription>
                Personas que tienen mercancía en consignación
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConsignatarios ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : consignatarios.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Consignaciones</TableHead>
                      <TableHead className="text-right">Total Consignado</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consignatarios.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nombre}</TableCell>
                        <TableCell>{c.telefono || '-'}</TableCell>
                        <TableCell>{c._count?.consignaciones || 0}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.totalConsignado)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.totalPagado)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(c.saldoPendiente)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.activo ? 'default' : 'secondary'}>
                            {c.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-muted-foreground">No hay consignatarios registrados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
