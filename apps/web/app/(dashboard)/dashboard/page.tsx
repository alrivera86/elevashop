'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Banknote,
  CreditCard,
  Building,
  Coins,
  Wallet,
  PackageOpen,
  Landmark,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { inventarioApi, ventasApi, clientesApi, finanzasApi, consignacionApi, VentaDia, CuentaFondo, ConsignacionDashboard } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trendValue) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {trend && (
              <>
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                  {trendValue}
                </span>
              </>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertasStock({ alertas }: { alertas: any[] }) {
  if (!alertas || alertas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No hay alertas de stock</p>
      </div>
    );
  }

  const getTipoAlerta = (tipo: string) => {
    if (tipo === 'AGOTADO') return 'agotado';
    if (tipo === 'STOCK_MINIMO') return 'critico';
    return 'bajo';
  };

  return (
    <div className="space-y-3">
      {alertas.slice(0, 5).map((alerta, index) => (
        <div
          key={alerta.id || index}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle
              className={
                alerta.tipoAlerta === 'AGOTADO'
                  ? 'h-4 w-4 text-red-500'
                  : alerta.tipoAlerta === 'STOCK_MINIMO'
                  ? 'h-4 w-4 text-orange-500'
                  : 'h-4 w-4 text-yellow-500'
              }
            />
            <div>
              <p className="text-sm font-medium">{alerta.producto?.nombre}</p>
              <p className="text-xs text-muted-foreground">
                Stock: {alerta.stockActual} unidades
              </p>
            </div>
          </div>
          <Badge
            variant={
              alerta.tipoAlerta === 'AGOTADO'
                ? 'agotado'
                : alerta.tipoAlerta === 'STOCK_MINIMO'
                ? 'alerta'
                : 'alerta-w'
            }
          >
            {alerta.tipoAlerta === 'AGOTADO'
              ? 'Agotado'
              : alerta.tipoAlerta === 'STOCK_MINIMO'
              ? 'Crítico'
              : 'Bajo'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: inventario, isLoading: loadingInventario } = useQuery({
    queryKey: ['inventario-dashboard'],
    queryFn: inventarioApi.getDashboard,
  });

  const { data: ventasResumen, isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas-resumen'],
    queryFn: () => ventasApi.getResumen(),
  });

  const { data: clientesData, isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesApi.getAll({ limit: 1 }),
  });

  const { data: finanzas, isLoading: loadingFinanzas } = useQuery({
    queryKey: ['finanzas-resumen'],
    queryFn: () => finanzasApi.getResumen(),
  });

  const { data: distribucionFondos, isLoading: loadingDistribucion } = useQuery({
    queryKey: ['distribucion-fondos'],
    queryFn: () => finanzasApi.getDistribucionFondos(),
  });

  const { data: alertas, isLoading: loadingAlertas } = useQuery({
    queryKey: ['alertas-stock'],
    queryFn: inventarioApi.getAlertas,
  });

  const { data: ventas7Dias, isLoading: loadingVentas7Dias } = useQuery({
    queryKey: ['ventas-7-dias'],
    queryFn: ventasApi.getUltimos7Dias,
  });

  const { data: consignacion, isLoading: loadingConsignacion } = useQuery({
    queryKey: ['consignacion-dashboard'],
    queryFn: consignacionApi.getDashboard,
  });

  const isLoading = loadingInventario || loadingVentas || loadingClientes || loadingFinanzas;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general de tu negocio
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
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
              title="Total Productos"
              value={inventario?.totalProductos || 0}
              description={`${inventario?.productosOk || 0} con stock OK`}
              icon={Package}
            />
            <StatCard
              title="Ventas del Mes"
              value={formatCurrency(ventasResumen?.totalVentas || 0)}
              description={`${ventasResumen?.cantidadVentas || 0} transacciones`}
              icon={ShoppingCart}
              trend="up"
              trendValue="+12%"
            />
            <StatCard
              title="Clientes"
              value={(clientesData as any)?.pagination?.total || 0}
              description="Clientes registrados"
              icon={Users}
            />
            <StatCard
              title="Utilidad"
              value={formatCurrency(finanzas?.balance || 0)}
              description={`Tasa: ${finanzas?.tasaCambioActual || 0} Bs/$`}
              icon={DollarSign}
              trend={(finanzas?.balance || 0) >= 0 ? 'up' : 'down'}
            />
          </>
        )}
      </div>

      {/* Patrimonio y Efectivo - Nueva sección */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading || loadingDistribucion || loadingConsignacion ? (
          <>
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="mt-4 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            {/* Patrimonio */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patrimonio</CardTitle>
                <Landmark className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(
                    (inventario?.valorInventario || 0) +
                    (finanzas?.balance || 0) +
                    (consignacion?.valorPorCobrar || 0)
                  )}
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inventario:</span>
                    <span className="font-medium">{formatCurrency(inventario?.valorInventario || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilidad:</span>
                    <span className="font-medium">{formatCurrency(finanzas?.balance || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Por Cobrar:</span>
                    <span className="font-medium">{formatCurrency(consignacion?.valorPorCobrar || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Efectivo Disponible */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efectivo Disponible</CardTitle>
                <Wallet className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(
                    (distribucionFondos?.resumen?.enUsd || 0) +
                    (distribucionFondos?.resumen?.enBsEquivalenteUsd || 0)
                  )}
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  {distribucionFondos?.cuentas?.slice(0, 3).map((cuenta: CuentaFondo) => (
                    <div key={cuenta.codigo} className="flex justify-between">
                      <span className="text-muted-foreground">{cuenta.nombre}:</span>
                      <span className="font-medium">
                        {cuenta.moneda === 'BS' ? 'Bs ' : '$'}
                        {cuenta.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* En Consignación */}
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Consignación</CardTitle>
                <PackageOpen className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {formatCurrency(consignacion?.valorTotalConsignado || 0)}
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Por Cobrar:</span>
                    <span className="font-medium text-orange-600">{formatCurrency(consignacion?.valorPorCobrar || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consignatarios:</span>
                    <span className="font-medium">{consignacion?.totalConsignatarios || 0} activos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pendientes:</span>
                    <span className="font-medium">{consignacion?.cantidadConsignaciones || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertas de stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Stock
            </CardTitle>
            <CardDescription>
              Productos que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAlertas ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <AlertasStock alertas={alertas || []} />
            )}
          </CardContent>
        </Card>

        {/* Estado del inventario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Estado del Inventario
            </CardTitle>
            <CardDescription>
              Distribución de productos por estado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInventario ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm">Stock OK</span>
                  </div>
                  <span className="font-medium">{inventario?.productosOk || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Stock Bajo</span>
                  </div>
                  <span className="font-medium">{inventario?.productosBajoStock || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    <span className="text-sm">Stock Crítico</span>
                  </div>
                  <span className="font-medium">{inventario?.productosCriticos || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm">Agotado</span>
                  </div>
                  <span className="font-medium">{inventario?.productosAgotados || 0}</span>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Valor del Inventario</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(inventario?.valorInventario || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ventas últimos 7 días */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ventas - Últimos 7 días
          </CardTitle>
          <CardDescription>
            Actividad de ventas reciente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingVentas7Dias ? (
            <div className="flex gap-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-32 flex-1" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline visual */}
              <div className="flex gap-2">
                {ventas7Dias?.dias?.map((dia: VentaDia) => (
                  <div
                    key={dia.fecha}
                    className={`flex-1 rounded-lg border p-3 text-center transition-colors ${
                      dia.total > 0
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                        : 'border-dashed bg-muted/30'
                    }`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {dia.nombreDia}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(dia.fecha + 'T00:00:00').toLocaleDateString('es-VE', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                    {dia.total > 0 ? (
                      <>
                        <div className="mt-2 text-lg font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(dia.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dia.cantidad} venta{dia.cantidad !== 1 ? 's' : ''}
                        </div>
                      </>
                    ) : (
                      <div className="mt-2 text-sm text-muted-foreground">—</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Detalle de productos vendidos */}
              {ventas7Dias?.dias?.some((d: VentaDia) => d.productos.length > 0) && (
                <div className="border-t pt-4">
                  <h4 className="mb-3 text-sm font-medium">Productos vendidos esta semana</h4>
                  <div className="space-y-2">
                    {ventas7Dias?.dias
                      ?.flatMap((d: VentaDia) =>
                        d.productos.map((p) => ({
                          ...p,
                          fecha: d.nombreDia,
                        }))
                      )
                      .slice(0, 5)
                      .map((producto: { nombre: string; cantidad: number; total: number; fecha: string }, index: number) => (
                        <div
                          key={`${producto.nombre}-${index}`}
                          className="flex items-center justify-between rounded-lg border p-2"
                        >
                          <div>
                            <span className="text-sm font-medium">{producto.nombre}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({producto.fecha})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {formatCurrency(producto.total)}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              x{producto.cantidad}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Mensaje si no hay ventas */}
              {ventas7Dias?.cantidadVentas === 0 && (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No hay ventas registradas en los últimos 7 días
                  </p>
                </div>
              )}

              {/* Total del período */}
              {(ventas7Dias?.totalPeriodo || 0) > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm font-medium">Total últimos 7 días</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(ventas7Dias?.totalPeriodo || 0)}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribución de Fondos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Distribución de Fondos
          </CardTitle>
          <CardDescription>
            Donde está el dinero de las ventas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDistribucion ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tarjetas por cuenta */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {distribucionFondos?.cuentas?.map((cuenta: CuentaFondo) => {
                  const IconComponent =
                    cuenta.icono === 'banknote' ? Banknote :
                    cuenta.icono === 'credit-card' ? CreditCard :
                    cuenta.icono === 'building' ? Building :
                    Coins;
                  const colorClass =
                    cuenta.color === 'green' ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                    cuenta.color === 'purple' ? 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800' :
                    cuenta.color === 'blue' ? 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' :
                    'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800';

                  return (
                    <div
                      key={cuenta.codigo}
                      className={`rounded-lg border p-4 ${colorClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <IconComponent className="h-5 w-5" />
                        <span className="text-xs font-medium">
                          {cuenta.porcentaje.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">{cuenta.nombre}</p>
                        <p className="text-lg font-bold">
                          {cuenta.moneda === 'BS' ? 'Bs ' : '$'}
                          {cuenta.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                        {cuenta.montoUsd && (
                          <p className="text-xs text-muted-foreground">
                            ~${cuenta.montoUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumen total */}
              <div className="border-t pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Total en Cuentas USD</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(distribucionFondos?.resumen?.enUsd || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Total en Bolívares</p>
                    <p className="text-xl font-bold text-yellow-600">
                      Bs {(distribucionFondos?.resumen?.enBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ~{formatCurrency(distribucionFondos?.resumen?.enBsEquivalenteUsd || 0)} USD
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-xs text-muted-foreground">Ventas Totales</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(distribucionFondos?.totalVentas || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tasa: {distribucionFondos?.tasaCambio?.toFixed(2) || 0} Bs/$
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
