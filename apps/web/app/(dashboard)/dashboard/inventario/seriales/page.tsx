'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Package,
  ShieldCheck,
  ShieldX,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  inventarioApi,
  productosApi,
  clientesApi,
  Producto,
  UnidadInventario,
  UnidadInventarioConGarantia,
  EstadoUnidad,
  OrigenUnidad,
  MetodoPago,
  EstadisticasSeriales,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const ESTADOS_UNIDAD: { value: EstadoUnidad; label: string; color: string }[] = [
  { value: 'DISPONIBLE', label: 'Disponible', color: 'bg-green-100 text-green-800' },
  { value: 'VENDIDO', label: 'Vendido', color: 'bg-blue-100 text-blue-800' },
  { value: 'RESERVADO', label: 'Reservado', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DEFECTUOSO', label: 'Defectuoso', color: 'bg-red-100 text-red-800' },
  { value: 'DEVUELTO', label: 'Devuelto', color: 'bg-purple-100 text-purple-800' },
];

const ORIGENES: { value: OrigenUnidad; label: string }[] = [
  { value: 'COMPRA', label: 'Compra' },
  { value: 'PRODUCCION', label: 'Produccion' },
  { value: 'IMPORTACION', label: 'Importacion' },
  { value: 'DEVOLUCION', label: 'Devolucion' },
  { value: 'AJUSTE', label: 'Ajuste' },
];

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: 'EFECTIVO_USD', label: 'Efectivo USD' },
  { value: 'EFECTIVO_BS', label: 'Efectivo Bs' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'BANESCO', label: 'Banesco' },
  { value: 'TRANSFERENCIA_BS', label: 'Transferencia Bs' },
  { value: 'TRANSFERENCIA_USD', label: 'Transferencia USD' },
  { value: 'PAGO_MOVIL', label: 'Pago Movil' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'MIXTO', label: 'Mixto' },
];

function getEstadoBadge(estado: EstadoUnidad) {
  const config = ESTADOS_UNIDAD.find(e => e.value === estado);
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100'}`}>
      {config?.label || estado}
    </span>
  );
}

// Componente para buscar garantia por serial
function BuscarGarantia() {
  const [serial, setSerial] = useState('');
  const [resultado, setResultado] = useState<UnidadInventarioConGarantia | null | undefined>(undefined);
  const [buscando, setBuscando] = useState(false);

  const buscar = async () => {
    if (!serial.trim()) return;
    setBuscando(true);
    try {
      const data = await inventarioApi.buscarPorSerial(serial);
      setResultado(data);
    } catch (error) {
      setResultado(null);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Verificar Garantia
        </CardTitle>
        <CardDescription>
          Busca un serial para verificar si fue vendido por nosotros y su estado de garantia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ingresa el numero de serial..."
            value={serial}
            onChange={(e) => setSerial(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            className="font-mono"
          />
          <Button onClick={buscar} disabled={buscando || !serial.trim()}>
            <Search className="h-4 w-4 mr-2" />
            {buscando ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        {resultado === null && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Serial no encontrado</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Este serial no esta registrado en nuestro sistema. Puede que no haya sido vendido por nosotros.
            </p>
          </div>
        )}

        {resultado && (
          <div className={`p-4 rounded-lg border ${
            resultado.enGarantia
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {resultado.vendidoPorNosotros ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {resultado.vendidoPorNosotros
                  ? 'Vendido por Elevashop'
                  : 'No vendido (en inventario)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Producto:</span>
                <p className="font-medium">{resultado.producto?.nombre}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Codigo:</span>
                <p className="font-mono">{resultado.producto?.codigo}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <p>{getEstadoBadge(resultado.estado)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Entrada:</span>
                <p>{new Date(resultado.fechaEntrada).toLocaleDateString()}</p>
              </div>

              {resultado.fechaVenta && (
                <>
                  <div>
                    <span className="text-muted-foreground">Fecha Venta:</span>
                    <p>{new Date(resultado.fechaVenta).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <p>{resultado.cliente?.nombre || 'N/A'}</p>
                  </div>
                </>
              )}
            </div>

            <div className={`mt-4 p-3 rounded ${
              resultado.enGarantia ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <div className="flex items-center gap-2">
                {resultado.enGarantia ? (
                  <ShieldCheck className="h-5 w-5 text-green-700" />
                ) : (
                  <ShieldX className="h-5 w-5 text-red-700" />
                )}
                <span className={`font-medium ${
                  resultado.enGarantia ? 'text-green-800' : 'text-red-800'
                }`}>
                  {resultado.enGarantia
                    ? `EN GARANTIA - ${resultado.diasRestantesGarantia} dias restantes`
                    : 'GARANTIA VENCIDA'}
                </span>
              </div>
              {resultado.garantiaHasta && (
                <p className="text-sm mt-1 text-muted-foreground">
                  Garantia hasta: {new Date(resultado.garantiaHasta).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para estadisticas
function EstadisticasCard({ stats }: { stats?: EstadisticasSeriales }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Unidades</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalUnidades}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Disponibles</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.disponibles}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Vendidas</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.vendidas}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Utilidad Total</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.utilidadTotal)}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Formulario para registrar serial
function RegistrarSerialForm({
  productoId,
  onClose,
  onSuccess,
}: {
  productoId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    serial: '',
    costoUnitario: '',
    origenTipo: 'COMPRA' as OrigenUnidad,
    lote: '',
    garantiaMeses: '6',
    notas: '',
  });
  const [modoMultiple, setModoMultiple] = useState(false);
  const [serialesMultiples, setSerialesMultiples] = useState('');

  const queryClient = useQueryClient();

  const registrarMutation = useMutation({
    mutationFn: () =>
      inventarioApi.registrarSerial({
        productoId,
        serial: formData.serial,
        costoUnitario: parseFloat(formData.costoUnitario),
        origenTipo: formData.origenTipo,
        lote: formData.lote || undefined,
        garantiaMeses: parseInt(formData.garantiaMeses),
        notas: formData.notas || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriales'] });
      queryClient.invalidateQueries({ queryKey: ['estadisticas-seriales'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast({ title: 'Serial registrado correctamente', variant: 'success' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error al registrar serial',
        description: error?.response?.data?.message || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const registrarMultiplesMutation = useMutation({
    mutationFn: () => {
      const seriales = serialesMultiples
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      return inventarioApi.registrarSerialesMultiples({
        productoId,
        seriales,
        costoUnitario: parseFloat(formData.costoUnitario),
        origenTipo: formData.origenTipo,
        lote: formData.lote || undefined,
        garantiaMeses: parseInt(formData.garantiaMeses),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seriales'] });
      queryClient.invalidateQueries({ queryKey: ['estadisticas-seriales'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast({ title: `${data.registrados} seriales registrados`, variant: 'success' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error al registrar seriales',
        description: error?.response?.data?.message || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modoMultiple) {
      registrarMultiplesMutation.mutate();
    } else {
      registrarMutation.mutate();
    }
  };

  const isLoading = registrarMutation.isPending || registrarMultiplesMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          variant={!modoMultiple ? 'default' : 'outline'}
          size="sm"
          onClick={() => setModoMultiple(false)}
        >
          Serial Individual
        </Button>
        <Button
          type="button"
          variant={modoMultiple ? 'default' : 'outline'}
          size="sm"
          onClick={() => setModoMultiple(true)}
        >
          Multiples Seriales
        </Button>
      </div>

      {modoMultiple ? (
        <div className="space-y-2">
          <Label>Seriales (uno por linea)</Label>
          <Textarea
            placeholder="SN-001&#10;SN-002&#10;SN-003"
            value={serialesMultiples}
            onChange={(e) => setSerialesMultiples(e.target.value)}
            rows={5}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            {serialesMultiples.split('\n').filter(s => s.trim()).length} seriales
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Numero de Serial</Label>
          <Input
            placeholder="SN-2024-001234"
            value={formData.serial}
            onChange={(e) => setFormData({ ...formData, serial: e.target.value.toUpperCase() })}
            className="font-mono"
            required={!modoMultiple}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Costo Unitario ($)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="150.00"
            value={formData.costoUnitario}
            onChange={(e) => setFormData({ ...formData, costoUnitario: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Origen</Label>
          <Select
            value={formData.origenTipo}
            onValueChange={(v) => setFormData({ ...formData, origenTipo: v as OrigenUnidad })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORIGENES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Lote / Importacion</Label>
          <Input
            placeholder="LOTE-2024-001"
            value={formData.lote}
            onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Meses de Garantia</Label>
          <Input
            type="number"
            value={formData.garantiaMeses}
            onChange={(e) => setFormData({ ...formData, garantiaMeses: e.target.value })}
          />
        </div>
      </div>

      {!modoMultiple && (
        <div className="space-y-2">
          <Label>Notas (opcional)</Label>
          <Textarea
            placeholder="Notas adicionales..."
            value={formData.notas}
            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          />
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Registrando...' : 'Registrar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Formulario para vender serial
function VenderSerialForm({
  unidad,
  onClose,
  onSuccess,
}: {
  unidad: UnidadInventario;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    clienteId: '',
    precioVenta: '',
    metodoPago: 'EFECTIVO_USD' as MetodoPago,
    notas: '',
  });

  const queryClient = useQueryClient();

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: () => clientesApi.getAll({ limit: 100 }),
  });

  const venderMutation = useMutation({
    mutationFn: () =>
      inventarioApi.venderSerial({
        serial: unidad.serial,
        clienteId: parseInt(formData.clienteId),
        precioVenta: parseFloat(formData.precioVenta),
        metodoPago: formData.metodoPago,
        notas: formData.notas || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriales'] });
      queryClient.invalidateQueries({ queryKey: ['estadisticas-seriales'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast({ title: 'Venta registrada correctamente', variant: 'success' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error al registrar venta',
        description: error?.response?.data?.message || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    venderMutation.mutate();
  };

  const precioSugerido = unidad.producto?.precioElevapartes;
  const utilidadEstimada = formData.precioVenta
    ? parseFloat(formData.precioVenta) - Number(unidad.costoUnitario)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-muted rounded-lg">
        <p className="font-medium">{unidad.producto?.nombre}</p>
        <p className="text-sm text-muted-foreground font-mono">Serial: {unidad.serial}</p>
        <p className="text-sm text-muted-foreground">
          Costo: {formatCurrency(Number(unidad.costoUnitario))}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Cliente</Label>
        <Select
          value={formData.clienteId}
          onValueChange={(v) => setFormData({ ...formData, clienteId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar cliente" />
          </SelectTrigger>
          <SelectContent>
            {(clientes as any)?.clientes?.map((c: any) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Precio de Venta ($)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder={precioSugerido?.toString() || '0.00'}
            value={formData.precioVenta}
            onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
            required
          />
          {precioSugerido && (
            <p className="text-xs text-muted-foreground">
              Precio sugerido: {formatCurrency(Number(precioSugerido))}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Metodo de Pago</Label>
          <Select
            value={formData.metodoPago}
            onValueChange={(v) => setFormData({ ...formData, metodoPago: v as MetodoPago })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS_PAGO.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {utilidadEstimada !== null && (
        <div className={`p-3 rounded-lg ${utilidadEstimada >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-sm">
            Utilidad estimada:{' '}
            <span className={`font-bold ${utilidadEstimada >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(utilidadEstimada)}
            </span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Notas (opcional)</Label>
        <Textarea
          placeholder="Notas de la venta..."
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={venderMutation.isPending}>
          {venderMutation.isPending ? 'Procesando...' : 'Registrar Venta'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Pagina principal
export default function SerialesPage() {
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoUnidad | 'ALL'>('ALL');
  const [registrarDialogOpen, setRegistrarDialogOpen] = useState(false);
  const [venderDialogOpen, setVenderDialogOpen] = useState(false);
  const [unidadParaVender, setUnidadParaVender] = useState<UnidadInventario | null>(null);
  const [page, setPage] = useState(1);

  const { data: productosData, isLoading: loadingProductos } = useQuery({
    queryKey: ['productos-select'],
    queryFn: () => productosApi.getAll({ limit: 100 }),
  });

  const productos = (productosData as any)?.productos || [];

  const { data: estadisticas } = useQuery({
    queryKey: ['estadisticas-seriales', productoSeleccionado],
    queryFn: () => inventarioApi.getEstadisticasSeriales(productoSeleccionado || undefined),
  });

  const { data: serialesData, isLoading: loadingSeriales } = useQuery({
    queryKey: ['seriales', productoSeleccionado, estadoFiltro, page],
    queryFn: () =>
      productoSeleccionado
        ? inventarioApi.listarSerialesPorProducto(productoSeleccionado, {
            estado: estadoFiltro === 'ALL' ? undefined : estadoFiltro,
            page,
            limit: 20,
          })
        : Promise.resolve({ unidades: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    enabled: !!productoSeleccionado,
  });

  const handleVender = (unidad: UnidadInventario) => {
    setUnidadParaVender(unidad);
    setVenderDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion de Seriales</h1>
        <p className="text-muted-foreground">
          Registra y rastrea unidades individuales por numero de serial
        </p>
      </div>

      {/* Buscador de garantia */}
      <BuscarGarantia />

      {/* Estadisticas */}
      <EstadisticasCard stats={estadisticas} />

      {/* Selector de producto y filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Seriales por Producto</CardTitle>
          <CardDescription>Selecciona un producto para ver y gestionar sus seriales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Select
              value={productoSeleccionado?.toString() || ''}
              onValueChange={(v) => {
                setProductoSeleccionado(v ? parseInt(v) : null);
                setPage(1);
              }}
            >
              <SelectTrigger className="md:w-96">
                <SelectValue placeholder="Seleccionar producto..." />
              </SelectTrigger>
              <SelectContent>
                {productos.map((p: Producto) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.codigo} - {p.nombre} (Stock: {p.stockActual})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={estadoFiltro}
              onValueChange={(v) => {
                setEstadoFiltro(v as EstadoUnidad | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {ESTADOS_UNIDAD.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {productoSeleccionado && (
              <Button onClick={() => setRegistrarDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Serial
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de seriales */}
      {productoSeleccionado && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Precio Venta</TableHead>
                  <TableHead className="text-right">Utilidad</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Garantia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSeriales ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : serialesData?.unidades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No hay seriales registrados para este producto
                    </TableCell>
                  </TableRow>
                ) : (
                  serialesData?.unidades.map((unidad) => {
                    const enGarantia = unidad.garantiaHasta
                      ? new Date(unidad.garantiaHasta) > new Date()
                      : false;
                    return (
                      <TableRow key={unidad.id}>
                        <TableCell className="font-mono font-medium">{unidad.serial}</TableCell>
                        <TableCell>{getEstadoBadge(unidad.estado)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(unidad.costoUnitario))}
                        </TableCell>
                        <TableCell className="text-right">
                          {unidad.precioVenta
                            ? formatCurrency(Number(unidad.precioVenta))
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {unidad.utilidad ? (
                            <span className={Number(unidad.utilidad) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(Number(unidad.utilidad))}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{unidad.cliente?.nombre || '-'}</TableCell>
                        <TableCell>
                          {unidad.garantiaHasta ? (
                            <span className={`flex items-center gap-1 ${enGarantia ? 'text-green-600' : 'text-red-600'}`}>
                              {enGarantia ? (
                                <ShieldCheck className="h-4 w-4" />
                              ) : (
                                <ShieldX className="h-4 w-4" />
                              )}
                              {new Date(unidad.garantiaHasta).toLocaleDateString()}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {unidad.estado === 'DISPONIBLE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVender(unidad)}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Vender
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Paginacion */}
      {serialesData && serialesData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {serialesData.unidades.length} de {serialesData.pagination.total} seriales
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
              onClick={() => setPage((p) => Math.min(serialesData.pagination.totalPages, p + 1))}
              disabled={page === serialesData.pagination.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Dialog para registrar serial */}
      <Dialog open={registrarDialogOpen} onOpenChange={setRegistrarDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Serial</DialogTitle>
            <DialogDescription>
              Registra una o mas unidades con su numero de serial
            </DialogDescription>
          </DialogHeader>
          {productoSeleccionado && (
            <RegistrarSerialForm
              productoId={productoSeleccionado}
              onClose={() => setRegistrarDialogOpen(false)}
              onSuccess={() => setRegistrarDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para vender serial */}
      <Dialog open={venderDialogOpen} onOpenChange={setVenderDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Venta</DialogTitle>
            <DialogDescription>
              Registra la venta de esta unidad
            </DialogDescription>
          </DialogHeader>
          {unidadParaVender && (
            <VenderSerialForm
              unidad={unidadParaVender}
              onClose={() => {
                setVenderDialogOpen(false);
                setUnidadParaVender(null);
              }}
              onSuccess={() => {
                setVenderDialogOpen(false);
                setUnidadParaVender(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
