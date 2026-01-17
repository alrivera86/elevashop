'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Crown,
  Award,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CalendarDays,
  Check,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reportesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

// Tipos de filtro de fecha
type FiltroFecha = 'este_mes' | 'mes_anterior' | 'todo' | 'personalizado';

// Funcion para obtener fechas segun el filtro
function getFechasFiltro(filtro: FiltroFecha, fechaDesdeCustom?: string, fechaHastaCustom?: string) {
  const hoy = new Date();

  switch (filtro) {
    case 'este_mes': {
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return {
        desde: inicioMes.toISOString().split('T')[0],
        hasta: hoy.toISOString().split('T')[0],
        label: 'Este Mes',
      };
    }
    case 'mes_anterior': {
      const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      return {
        desde: inicioMesAnterior.toISOString().split('T')[0],
        hasta: finMesAnterior.toISOString().split('T')[0],
        label: 'Mes Anterior',
      };
    }
    case 'todo':
      return {
        desde: undefined,
        hasta: undefined,
        label: 'Todo el Tiempo',
      };
    case 'personalizado':
      return {
        desde: fechaDesdeCustom,
        hasta: fechaHastaCustom,
        label: 'Personalizado',
      };
    default:
      return { desde: undefined, hasta: undefined, label: '' };
  }
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  color = 'default',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  color?: 'default' | 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colors = {
    default: 'text-muted-foreground',
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
    blue: 'text-blue-500',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colors[color]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <p className={`text-xs flex items-center gap-1 mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportesPage() {
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('todo');
  // Fechas temporales (mientras el usuario edita)
  const [fechaDesdeTmp, setFechaDesdeTmp] = useState('');
  const [fechaHastaTmp, setFechaHastaTmp] = useState('');
  // Fechas aplicadas (las que se usan en la query)
  const [fechaDesdeAplicada, setFechaDesdeAplicada] = useState('');
  const [fechaHastaAplicada, setFechaHastaAplicada] = useState('');

  const fechas = useMemo(
    () => getFechasFiltro(filtroFecha, fechaDesdeAplicada, fechaHastaAplicada),
    [filtroFecha, fechaDesdeAplicada, fechaHastaAplicada]
  );

  // Aplicar fechas personalizadas
  const aplicarFechas = () => {
    setFechaDesdeAplicada(fechaDesdeTmp);
    setFechaHastaAplicada(fechaHastaTmp);
  };

  // Verificar si hay cambios sin aplicar
  const hayFechasSinAplicar = filtroFecha === 'personalizado' &&
    (fechaDesdeTmp !== fechaDesdeAplicada || fechaHastaTmp !== fechaHastaAplicada);

  const { data: dashboard, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard-bi', fechas.desde, fechas.hasta],
    queryFn: () => reportesApi.getDashboardBI(fechas.desde, fechas.hasta),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">Inteligencia de negocio para tomar decisiones</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = dashboard?.kpis;
  const cambioPositivo = (kpis?.cambioVsMesAnterior || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">
            Inteligencia de negocio para tomar decisiones
          </p>
        </div>

        {/* Filtro de fechas */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={filtroFecha === 'este_mes' ? 'default' : 'outline'}
                onClick={() => setFiltroFecha('este_mes')}
              >
                Este Mes
              </Button>
              <Button
                size="sm"
                variant={filtroFecha === 'mes_anterior' ? 'default' : 'outline'}
                onClick={() => setFiltroFecha('mes_anterior')}
              >
                Mes Anterior
              </Button>
              <Button
                size="sm"
                variant={filtroFecha === 'todo' ? 'default' : 'outline'}
                onClick={() => setFiltroFecha('todo')}
              >
                Todo
              </Button>
              <Button
                size="sm"
                variant={filtroFecha === 'personalizado' ? 'default' : 'outline'}
                onClick={() => setFiltroFecha('personalizado')}
              >
                Personalizado
              </Button>
            </div>

            {filtroFecha === 'personalizado' && (
              <div className="flex items-center gap-2 ml-2">
                <Input
                  type="date"
                  value={fechaDesdeTmp}
                  onChange={(e) => setFechaDesdeTmp(e.target.value)}
                  className="w-36 h-8"
                />
                <span className="text-sm text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={fechaHastaTmp}
                  onChange={(e) => setFechaHastaTmp(e.target.value)}
                  className="w-36 h-8"
                />
                <Button
                  size="sm"
                  onClick={aplicarFechas}
                  disabled={!fechaDesdeTmp || !fechaHastaTmp}
                  variant={hayFechasSinAplicar ? 'default' : 'outline'}
                >
                  {hayFechasSinAplicar ? 'Aplicar' : <Check className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {isFetching && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Actualizando...
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={`Ventas ${filtroFecha === 'todo' ? 'Totales' : 'del Periodo'}`}
          value={formatCurrency(kpis?.ventasMes || 0)}
          subtitle={`${kpis?.unidadesVendidas || 0} unidades vendidas`}
          icon={ShoppingCart}
          color="blue"
        />
        <KPICard
          title={`Utilidad ${filtroFecha === 'todo' ? 'Total' : 'del Periodo'}`}
          value={formatCurrency(kpis?.utilidadMes || 0)}
          subtitle={`Margen: ${(kpis?.margenPromedio || 0).toFixed(1)}%`}
          icon={TrendingUp}
          trend={`${Math.abs(kpis?.cambioVsMesAnterior || 0).toFixed(1)}% vs mes anterior`}
          trendUp={cambioPositivo}
          color="green"
        />
        <KPICard
          title="Clientes Activos"
          value={kpis?.clientesActivos || 0}
          subtitle="Con compras registradas"
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Productos en Alerta"
          value={kpis?.productosEnAlerta || 0}
          subtitle="Necesitan reposicion"
          icon={AlertTriangle}
          color={kpis?.productosEnAlerta && kpis.productosEnAlerta > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Top Clientes y Top Productos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Top Clientes
            </CardTitle>
            <CardDescription>Clientes con mayor volumen de compras</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Ordenes</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard?.topClientes?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No hay datos de clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  dashboard?.topClientes?.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          cliente.posicion === 1 ? 'bg-yellow-500 text-white' :
                          cliente.posicion === 2 ? 'bg-gray-400 text-white' :
                          cliente.posicion === 3 ? 'bg-amber-600 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {cliente.posicion}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cliente.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            Ticket prom: {formatCurrency(cliente.ticketPromedio)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{cliente.cantidadOrdenes}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(cliente.totalCompras)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Productos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-500" />
              Top Productos
            </CardTitle>
            <CardDescription>Productos mas vendidos por ingresos</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Unid.</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard?.topProductos?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No hay datos de productos
                    </TableCell>
                  </TableRow>
                ) : (
                  dashboard?.topProductos?.map((producto) => (
                    <TableRow key={producto.productoId}>
                      <TableCell>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          producto.posicion === 1 ? 'bg-blue-500 text-white' :
                          producto.posicion === 2 ? 'bg-blue-400 text-white' :
                          producto.posicion === 3 ? 'bg-blue-300 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {producto.posicion}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{producto.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {producto.codigo} | Margen: {producto.margenPorcentaje.toFixed(0)}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{producto.unidadesVendidas}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(producto.ingresos)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Metodos de pago y Utilidades */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Metodos de Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Metodos de Pago
            </CardTitle>
            <CardDescription>Distribucion de ventas ultimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard?.metodosPago?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay datos de pagos
              </p>
            ) : (
              <div className="space-y-4">
                {dashboard?.metodosPago?.map((mp) => (
                  <div key={mp.metodoPago} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{mp.metodoPago}</span>
                        <Badge variant="secondary" className="text-xs">
                          {mp.transacciones} trans.
                        </Badge>
                      </div>
                      <span className="font-bold">{formatCurrency(mp.monto)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${mp.porcentaje}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {mp.porcentaje.toFixed(1)}% del total
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen de Utilidades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resumen de Utilidades
            </CardTitle>
            <CardDescription>Comparativa mensual y acumulado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Mes Actual vs Anterior */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Este Mes</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(dashboard?.utilidades?.mesActual.utilidad || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dashboard?.utilidades?.mesActual.unidades || 0} unidades
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Mes Anterior</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(dashboard?.utilidades?.mesAnterior.utilidad || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dashboard?.utilidades?.mesAnterior.unidades || 0} unidades
                  </p>
                </div>
              </div>

              {/* Cambio mensual */}
              <div className={`flex items-center justify-center gap-2 rounded-lg p-3 ${
                cambioPositivo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {cambioPositivo ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span className="font-bold">
                  {cambioPositivo ? '+' : ''}{(dashboard?.utilidades?.cambioMensual || 0).toFixed(1)}%
                </span>
                <span className="text-sm">vs mes anterior</span>
              </div>

              {/* Acumulado */}
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Acumulado Total</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Ventas</p>
                    <p className="font-bold">{formatCurrency(dashboard?.utilidades?.acumulado.ventas || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Costo</p>
                    <p className="font-bold">{formatCurrency(dashboard?.utilidades?.acumulado.costo || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Utilidad</p>
                    <p className="font-bold text-green-600">{formatCurrency(dashboard?.utilidades?.acumulado.utilidad || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productos que necesitan reposicion */}
      {dashboard?.productosReposicion && dashboard.productosReposicion.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Productos que Necesitan Reposicion
            </CardTitle>
            <CardDescription>
              Accion requerida: {dashboard.productosReposicion.length} productos con stock bajo o agotado
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Minimo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.productosReposicion.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell className="font-mono text-sm">{producto.codigo}</TableCell>
                    <TableCell className="font-medium">{producto.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {producto.categoria?.nombre || 'Sin categoria'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${
                        producto.stockActual === 0 ? 'text-red-600' : 'text-orange-600'
                      }`}>
                        {producto.stockActual}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {producto.stockMinimo}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        producto.estado === 'AGOTADO' ? 'destructive' :
                        producto.estado === 'ALERTA' ? 'destructive' :
                        'secondary'
                      }>
                        {producto.estado === 'ALERTA_W' ? 'BAJO' : producto.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
