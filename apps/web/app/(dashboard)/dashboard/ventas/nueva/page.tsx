'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Package,
  CheckCircle,
  Loader2,
  X,
  Percent,
  Receipt,
  ScanBarcode,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { productosApi, clientesApi, ventasApi, inventarioApi, Producto, Cliente, UnidadInventario, Venta } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { generarOrdenSalida, VentaPDF } from '@/lib/generate-pdf';

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje: number; // 0-100
  serialesSeleccionados: string[];
  serialesDisponibles: UnidadInventario[];
  cargandoSeriales: boolean;
  mostrarSeriales: boolean;
}

type MetodoPago = 'EFECTIVO_USD' | 'EFECTIVO_BS' | 'ZELLE' | 'BANESCO' | 'TRANSFERENCIA_BS' | 'TRANSFERENCIA_USD' | 'PAGO_MOVIL' | 'BINANCE';

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: 'EFECTIVO_USD', label: 'Efectivo USD' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'BANESCO', label: 'Banesco' },
  { value: 'TRANSFERENCIA_USD', label: 'Transferencia USD' },
  { value: 'EFECTIVO_BS', label: 'Efectivo Bs' },
  { value: 'TRANSFERENCIA_BS', label: 'Transferencia Bs' },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
  { value: 'BINANCE', label: 'Binance' },
];

const IVA_RATE = 0.16; // 16% IVA

export default function NuevaVentaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Estados principales
  const [tipoVenta, setTipoVenta] = useState<'VENTA' | 'CONSIGNACION'>('VENTA');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [aplicarIva, setAplicarIva] = useState(false);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO_USD');
  const [notas, setNotas] = useState('');

  const esConsignacion = tipoVenta === 'CONSIGNACION';

  // Estado para venta completada
  const [ventaCompletada, setVentaCompletada] = useState<Venta | null>(null);
  const [mostrarDialogoExito, setMostrarDialogoExito] = useState(false);

  // Estados de búsqueda
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [mostrarBusquedaCliente, setMostrarBusquedaCliente] = useState(false);
  const [mostrarBusquedaProducto, setMostrarBusquedaProducto] = useState(false);

  // Queries
  const { data: clientesData } = useQuery({
    queryKey: ['clientes-busqueda', busquedaCliente],
    queryFn: () => clientesApi.getAll({ search: busquedaCliente, limit: 10 }),
    enabled: busquedaCliente.length > 0,
  });

  const { data: productosData } = useQuery({
    queryKey: ['productos-busqueda', busquedaProducto],
    queryFn: () => productosApi.getAll({ search: busquedaProducto, limit: 10 }),
    enabled: busquedaProducto.length > 0,
  });

  const clientes = (clientesData as any)?.clientes || [];
  const productos = (productosData as any)?.productos || [];

  // Cálculos
  const calculos = useMemo(() => {
    // Subtotal bruto (sin descuentos por línea)
    const subtotalBruto = carrito.reduce((acc, item) => {
      return acc + (item.cantidad * item.precioUnitario);
    }, 0);

    // Descuentos por línea (en $)
    const descuentosLinea = carrito.reduce((acc, item) => {
      const subtotalLinea = item.cantidad * item.precioUnitario;
      return acc + (subtotalLinea * item.descuentoPorcentaje / 100);
    }, 0);

    // Subtotal después de descuentos por línea
    const subtotalProductos = subtotalBruto - descuentosLinea;

    // Descuento global (porcentaje sobre subtotal)
    const descuentoGlobalMonto = subtotalProductos * descuentoGlobal / 100;
    const subtotalConDescuento = subtotalProductos - descuentoGlobalMonto;

    // IVA
    const montoIva = aplicarIva ? subtotalConDescuento * IVA_RATE : 0;
    const total = subtotalConDescuento + montoIva;

    return {
      subtotalBruto,
      descuentosLinea,
      subtotalProductos,
      descuentoGlobalMonto,
      subtotalConDescuento,
      montoIva,
      total,
      cantidadItems: carrito.reduce((acc, item) => acc + item.cantidad, 0),
    };
  }, [carrito, descuentoGlobal, aplicarIva]);

  // Cargar seriales disponibles para un producto
  const cargarSerialesProducto = async (productoId: number): Promise<UnidadInventario[]> => {
    try {
      const response = await inventarioApi.listarSerialesPorProducto(productoId, { estado: 'DISPONIBLE' as any, limit: 100 });
      return response?.unidades || [];
    } catch (error: any) {
      console.error('Error cargando seriales:', error);
      // No mostrar error - simplemente no hay seriales o el producto no tiene
      // Los productos sin seriales registrados simplemente mostraran lista vacia
      return [];
    }
  };

  // Mutation para crear venta
  const crearVentaMutation = useMutation({
    mutationFn: async () => {
      if (!clienteSeleccionado) throw new Error('Selecciona un cliente');
      if (carrito.length === 0) throw new Error('Agrega productos al carrito');

      // Crear los detalles, expandiendo cada serial como una línea separada si hay seriales seleccionados
      const detalles: { productoId: number; cantidad: number; precioUnitario: number; descuento?: number; serial?: string }[] = [];

      for (const item of carrito) {
        // Calcular descuento en $ para esta línea
        const subtotalLinea = item.cantidad * item.precioUnitario;
        const descuentoLineaMonto = subtotalLinea * item.descuentoPorcentaje / 100;

        if (item.serialesSeleccionados.length > 0) {
          // Si hay seriales seleccionados, crear una línea por cada serial
          const descuentoPorUnidad = descuentoLineaMonto / item.serialesSeleccionados.length;
          item.serialesSeleccionados.forEach((serial) => {
            detalles.push({
              productoId: item.producto.id,
              cantidad: 1,
              precioUnitario: item.precioUnitario,
              descuento: descuentoPorUnidad,
              serial,
            });
          });
        } else {
          // Sin seriales, agregar como línea normal
          detalles.push({
            productoId: item.producto.id,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: descuentoLineaMonto,
          });
        }
      }

      const ventaData: any = {
        clienteId: Number(clienteSeleccionado.id),
        tipoVenta,
        subtotal: calculos.subtotalBruto,
        descuento: calculos.descuentosLinea + calculos.descuentoGlobalMonto,
        impuesto: calculos.montoIva,
        total: calculos.total,
        notas: notas || undefined,
        detalles,
      };

      // Solo agregar pagos si es una venta (no consignación)
      if (!esConsignacion) {
        ventaData.pagos = [{
          metodoPago,
          monto: calculos.total,
          moneda: metodoPago.includes('BS') ? 'VES' as const : 'USD' as const,
        }];
      }

      return ventasApi.create(ventaData);
    },
    onSuccess: (venta) => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      setVentaCompletada(venta);
      setMostrarDialogoExito(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Error al registrar venta',
        description: error?.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  // Funciones del carrito
  const agregarProducto = async (producto: Producto) => {
    const existente = carrito.find(item => item.producto.id === producto.id);
    if (existente) {
      if (existente.cantidad >= producto.stockActual) {
        toast({ title: 'Stock insuficiente', variant: 'destructive' });
        return;
      }
      setCarrito(carrito.map(item =>
        item.producto.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      if (producto.stockActual < 1) {
        toast({ title: 'Producto sin stock', variant: 'destructive' });
        return;
      }

      // Agregar producto con estado de carga de seriales
      const nuevoItem: ItemCarrito = {
        producto,
        cantidad: 1,
        precioUnitario: Number(producto.precioElevapartes) || 0,
        descuentoPorcentaje: 0,
        serialesSeleccionados: [],
        serialesDisponibles: [],
        cargandoSeriales: true,
        mostrarSeriales: false,
      };

      setCarrito(prev => [...prev, nuevoItem]);

      // Cargar seriales disponibles en background
      const seriales = await cargarSerialesProducto(producto.id);
      setCarrito(prev => prev.map(item =>
        item.producto.id === producto.id
          ? { ...item, serialesDisponibles: seriales, cargandoSeriales: false }
          : item
      ));
    }
    setBusquedaProducto('');
    setMostrarBusquedaProducto(false);
  };

  const actualizarCantidad = (productoId: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) {
      eliminarProducto(productoId);
      return;
    }
    const item = carrito.find(i => i.producto.id === productoId);
    if (item && nuevaCantidad > item.producto.stockActual) {
      toast({ title: 'Stock insuficiente', variant: 'destructive' });
      return;
    }
    setCarrito(carrito.map(item =>
      item.producto.id === productoId
        ? {
            ...item,
            cantidad: nuevaCantidad,
            // Limpiar seriales si la cantidad cambia y hay más seriales que cantidad
            serialesSeleccionados: item.serialesSeleccionados.slice(0, nuevaCantidad)
          }
        : item
    ));
  };

  const actualizarPrecioUnitario = (productoId: number, precio: number) => {
    setCarrito(carrito.map(item =>
      item.producto.id === productoId
        ? { ...item, precioUnitario: Math.max(0, precio) }
        : item
    ));
  };

  const actualizarDescuentoLinea = (productoId: number, porcentaje: number) => {
    setCarrito(carrito.map(item =>
      item.producto.id === productoId
        ? { ...item, descuentoPorcentaje: Math.min(100, Math.max(0, porcentaje)) }
        : item
    ));
  };

  const eliminarProducto = (productoId: number) => {
    setCarrito(carrito.filter(item => item.producto.id !== productoId));
  };

  const toggleMostrarSeriales = (productoId: number) => {
    setCarrito(carrito.map(item =>
      item.producto.id === productoId
        ? { ...item, mostrarSeriales: !item.mostrarSeriales }
        : item
    ));
  };

  const toggleSerial = (productoId: number, serial: string) => {
    setCarrito(carrito.map(item => {
      if (item.producto.id !== productoId) return item;

      const yaSeleccionado = item.serialesSeleccionados.includes(serial);

      if (yaSeleccionado) {
        // Quitar serial
        return {
          ...item,
          serialesSeleccionados: item.serialesSeleccionados.filter(s => s !== serial),
          cantidad: Math.max(1, item.serialesSeleccionados.length - 1),
        };
      } else {
        // Agregar serial si no excede stock
        if (item.serialesSeleccionados.length >= item.producto.stockActual) {
          toast({ title: 'Stock insuficiente', variant: 'destructive' });
          return item;
        }
        return {
          ...item,
          serialesSeleccionados: [...item.serialesSeleccionados, serial],
          cantidad: item.serialesSeleccionados.length + 1,
        };
      }
    }));
  };

  const agregarSerialManual = (productoId: number, serial: string) => {
    if (!serial) return;

    setCarrito(carrito.map(item => {
      if (item.producto.id !== productoId) return item;

      // Verificar si ya existe
      if (item.serialesSeleccionados.includes(serial)) {
        toast({ title: 'Serial ya agregado', variant: 'destructive' });
        return item;
      }

      // Verificar stock
      if (item.serialesSeleccionados.length >= item.producto.stockActual) {
        toast({ title: 'Stock insuficiente', variant: 'destructive' });
        return item;
      }

      toast({ title: `Serial ${serial} agregado`, variant: 'success' });

      return {
        ...item,
        serialesSeleccionados: [...item.serialesSeleccionados, serial],
        cantidad: item.serialesSeleccionados.length + 1,
      };
    }));
  };

  const limpiarVenta = () => {
    setTipoVenta('VENTA');
    setClienteSeleccionado(null);
    setCarrito([]);
    setAplicarIva(false);
    setDescuentoGlobal(0);
    setNotas('');
  };

  const descargarOrdenSalida = () => {
    if (!ventaCompletada || !clienteSeleccionado) return;

    const ventaPDF: VentaPDF = {
      id: ventaCompletada.id,
      numero: ventaCompletada.numero,
      fecha: ventaCompletada.fecha || new Date().toISOString(),
      tipoVenta: tipoVenta,
      estadoPago: ventaCompletada.estadoPago,
      cliente: {
        nombre: clienteSeleccionado.nombre,
        telefono: clienteSeleccionado.telefono,
        email: clienteSeleccionado.email,
        direccion: clienteSeleccionado.direccion,
      },
      detalles: ventaCompletada.detalles?.map((d: any) => ({
        producto: {
          codigo: d.producto?.codigo || '',
          nombre: d.producto?.nombre || '',
        },
        cantidad: d.cantidad,
        precioUnitario: Number(d.precioUnitario),
        descuento: Number(d.descuento) || 0,
        subtotal: Number(d.subtotal),
        serial: d.serial,
      })) || [],
      subtotal: Number(ventaCompletada.subtotal),
      descuento: Number(ventaCompletada.descuento) || 0,
      impuesto: Number(ventaCompletada.impuesto) || 0,
      total: Number(ventaCompletada.total),
      pagos: ventaCompletada.pagos?.map((p: any) => ({
        metodoPago: p.metodoPago,
        monto: Number(p.monto),
        moneda: p.moneda || 'USD',
      })) || [],
      notas: ventaCompletada.notas,
    };

    generarOrdenSalida(ventaPDF);
  };

  const cerrarDialogoYNueva = () => {
    setMostrarDialogoExito(false);
    setVentaCompletada(null);
    limpiarVenta();
  };

  const cerrarDialogoEIrAVentas = () => {
    setMostrarDialogoExito(false);
    router.push('/dashboard/ventas');
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Panel Izquierdo - Productos y Carrito */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Búsqueda de Producto */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto por código o nombre..."
                className="pl-10 text-lg"
                value={busquedaProducto}
                onChange={(e) => {
                  setBusquedaProducto(e.target.value);
                  setMostrarBusquedaProducto(true);
                }}
                onFocus={() => setMostrarBusquedaProducto(true)}
              />
              {/* Resultados de búsqueda */}
              {mostrarBusquedaProducto && busquedaProducto && productos.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-lg border bg-background shadow-lg">
                  {productos.map((producto: Producto) => (
                    <button
                      key={producto.id}
                      className="flex w-full items-center justify-between p-3 text-left hover:bg-muted"
                      onClick={() => agregarProducto(producto)}
                    >
                      <div>
                        <span className="font-mono text-sm text-muted-foreground">{producto.codigo}</span>
                        <span className="ml-2 font-medium">{producto.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={producto.stockActual > 0 ? 'secondary' : 'destructive'}>
                          Stock: {producto.stockActual}
                        </Badge>
                        <span className="font-bold text-green-600">
                          {formatCurrency(Number(producto.precioElevapartes))}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Carrito */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="border-b py-3 flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5" />
              Carrito ({calculos.cantidadItems} items)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 min-h-0">
            {carrito.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
                <Package className="mb-2 h-12 w-12 opacity-50" />
                <p>Busca y agrega productos</p>
              </div>
            ) : (
              <div className="divide-y pb-4">
                {carrito.map((item) => (
                  <div key={item.producto.id} className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Info producto */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.producto.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Precio lista: {formatCurrency(Number(item.producto.precioElevapartes))}
                        </p>
                      </div>

                      {/* Precio Unitario Editable */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.precioUnitario || ''}
                          onChange={(e) => actualizarPrecioUnitario(item.producto.id, parseFloat(e.target.value) || 0)}
                          className="h-8 w-20 text-center"
                          placeholder="Precio"
                        />
                      </div>

                      {/* Cantidad */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidad(item.producto.id, parseInt(e.target.value) || 0)}
                          className="h-8 w-16 text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Descuento línea % */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={item.descuentoPorcentaje || ''}
                          onChange={(e) => actualizarDescuentoLinea(item.producto.id, parseFloat(e.target.value) || 0)}
                          className="h-8 w-16 text-center"
                          placeholder="0"
                          min="0"
                          max="100"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>

                      {/* Subtotal línea */}
                      <div className="w-24 text-right font-bold">
                        {formatCurrency((item.cantidad * item.precioUnitario) * (1 - item.descuentoPorcentaje / 100))}
                      </div>

                      {/* Eliminar */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => eliminarProducto(item.producto.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Sección de Seriales */}
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => toggleMostrarSeriales(item.producto.id)}
                        disabled={item.cargandoSeriales}
                      >
                        <ScanBarcode className="mr-1 h-3 w-3" />
                        {item.cargandoSeriales ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            Seriales ({item.serialesSeleccionados.length}/{item.serialesDisponibles.length} disp.)
                            {item.mostrarSeriales ? (
                              <ChevronUp className="ml-1 h-3 w-3" />
                            ) : (
                              <ChevronDown className="ml-1 h-3 w-3" />
                            )}
                          </>
                        )}
                      </Button>

                      {/* Lista de seriales seleccionados (siempre visible si hay) */}
                      {item.serialesSeleccionados.length > 0 && !item.mostrarSeriales && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.serialesSeleccionados.map(serial => (
                            <Badge key={serial} variant="default" className="text-xs">
                              {serial}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Panel expandible de seriales */}
                      {item.mostrarSeriales && !item.cargandoSeriales && (
                        <div className="mt-2 rounded-lg border bg-muted/30 p-2 space-y-2">
                          {/* Input para serial manual */}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Escribir serial manualmente..."
                              className="h-8 text-xs font-mono flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.target as HTMLInputElement;
                                  const serial = input.value.trim().toUpperCase();
                                  if (serial && !item.serialesSeleccionados.includes(serial)) {
                                    agregarSerialManual(item.producto.id, serial);
                                    input.value = '';
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs"
                              onClick={(e) => {
                                const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                                if (input) {
                                  const serial = input.value.trim().toUpperCase();
                                  if (serial && !item.serialesSeleccionados.includes(serial)) {
                                    agregarSerialManual(item.producto.id, serial);
                                    input.value = '';
                                  }
                                }
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Agregar
                            </Button>
                          </div>

                          {/* Seriales disponibles del sistema */}
                          {item.serialesDisponibles.length > 0 && (
                            <>
                              <p className="text-xs text-muted-foreground">Seriales disponibles:</p>
                              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
                                {item.serialesDisponibles.map(unidad => {
                                  const seleccionado = item.serialesSeleccionados.includes(unidad.serial);
                                  return (
                                    <button
                                      key={unidad.serial}
                                      onClick={() => toggleSerial(item.producto.id, unidad.serial)}
                                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                                        seleccionado
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-background hover:bg-muted'
                                      }`}
                                    >
                                      <Checkbox
                                        checked={seleccionado}
                                        className="h-3 w-3"
                                      />
                                      <span className="font-mono">{unidad.serial}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}

                          {item.serialesDisponibles.length === 0 && item.serialesSeleccionados.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No hay seriales en el sistema. Escribe el serial manualmente arriba.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panel Derecho - Cliente y Resumen */}
      <div className="flex w-96 flex-col gap-4">
        {/* Tipo de Operación */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Button
                variant={tipoVenta === 'VENTA' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTipoVenta('VENTA')}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Venta
              </Button>
              <Button
                variant={tipoVenta === 'CONSIGNACION' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTipoVenta('CONSIGNACION')}
              >
                <Package className="mr-2 h-4 w-4" />
                Consignación
              </Button>
            </div>
            {esConsignacion && (
              <p className="mt-2 text-xs text-muted-foreground">
                La mercancía se entrega al cliente sin cobro inmediato. El pago se registra cuando el cliente liquida.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Selección de Cliente */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                <div>
                  <p className="font-medium">{clienteSeleccionado.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {clienteSeleccionado.telefono || clienteSeleccionado.email || 'Sin contacto'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setClienteSeleccionado(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-10"
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrarBusquedaCliente(true);
                  }}
                  onFocus={() => setMostrarBusquedaCliente(true)}
                />
                {mostrarBusquedaCliente && busquedaCliente && clientes.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border bg-background shadow-lg">
                    {clientes.map((cliente: Cliente) => (
                      <button
                        key={cliente.id}
                        className="flex w-full flex-col p-3 text-left hover:bg-muted"
                        onClick={() => {
                          setClienteSeleccionado(cliente);
                          setBusquedaCliente('');
                          setMostrarBusquedaCliente(false);
                        }}
                      >
                        <span className="font-medium">{cliente.nombre}</span>
                        <span className="text-sm text-muted-foreground">
                          {cliente.telefono || cliente.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen de Venta */}
        <Card className="flex-1">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subtotal */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(calculos.subtotalProductos)}</span>
            </div>

            {/* Descuento Global */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Descuento</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={descuentoGlobal || ''}
                  onChange={(e) => setDescuentoGlobal(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="h-8 w-16 text-center"
                  placeholder="0"
                  min="0"
                  max="100"
                />
                <span className="text-muted-foreground">%</span>
                {descuentoGlobal > 0 && (
                  <span className="text-sm text-destructive">
                    (-{formatCurrency(calculos.descuentoGlobalMonto)})
                  </span>
                )}
              </div>
            </div>

            {/* IVA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="iva"
                  checked={aplicarIva}
                  onCheckedChange={(checked) => setAplicarIva(checked === true)}
                />
                <Label htmlFor="iva" className="cursor-pointer">
                  IVA (16%)
                </Label>
              </div>
              <span className={aplicarIva ? '' : 'text-muted-foreground'}>
                {formatCurrency(calculos.montoIva)}
              </span>
            </div>

            <hr />

            {/* Total */}
            <div className="flex justify-between text-xl font-bold">
              <span>TOTAL</span>
              <span className="text-green-600">{formatCurrency(calculos.total)}</span>
            </div>

            {/* Método de Pago - Solo para ventas */}
            {!esConsignacion && (
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
            )}

            {/* Indicador de consignación */}
            {esConsignacion && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Consignación - Sin pago inmediato
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  El cliente recibirá la mercancía y pagará cuando venda.
                </p>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Observaciones..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={limpiarVenta}
          >
            Limpiar
          </Button>
          <Button
            className={`flex-1 ${esConsignacion ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
            size="lg"
            disabled={!clienteSeleccionado || carrito.length === 0 || crearVentaMutation.isPending}
            onClick={() => crearVentaMutation.mutate()}
          >
            {crearVentaMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : esConsignacion ? (
              <>
                <Package className="mr-2 h-4 w-4" />
                Confirmar Consignación
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Venta
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Click fuera cierra búsquedas */}
      {(mostrarBusquedaCliente || mostrarBusquedaProducto) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setMostrarBusquedaCliente(false);
            setMostrarBusquedaProducto(false);
          }}
        />
      )}

      {/* Diálogo de Venta/Consignación Exitosa */}
      <Dialog open={mostrarDialogoExito} onOpenChange={setMostrarDialogoExito}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${esConsignacion ? 'text-orange-600' : 'text-green-600'}`}>
              <CheckCircle className="h-6 w-6" />
              {esConsignacion ? '¡Consignación Registrada!' : '¡Venta Registrada!'}
            </DialogTitle>
            <DialogDescription>
              {esConsignacion
                ? `La consignación #${ventaCompletada?.numero || ventaCompletada?.id} ha sido registrada. El cliente debe ${formatCurrency(Number(ventaCompletada?.total) || 0)}.`
                : `La venta #${ventaCompletada?.numero || ventaCompletada?.id} ha sido registrada exitosamente por ${formatCurrency(Number(ventaCompletada?.total) || 0)}.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className={`mt-4 rounded-lg border p-4 ${esConsignacion ? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950' : 'bg-muted/50'}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{clienteSeleccionado?.nombre}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Items:</span>
              <span className="font-medium">{ventaCompletada?.detalles?.length || 0} productos</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">{esConsignacion ? 'Por cobrar:' : 'Total:'}</span>
              <span className={`font-bold ${esConsignacion ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(Number(ventaCompletada?.total) || 0)}
              </span>
            </div>
            {esConsignacion && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="outline" className="text-orange-600 border-orange-600">Pendiente de pago</Badge>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={descargarOrdenSalida} className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Descargar Orden de Salida (PDF)
            </Button>

            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={cerrarDialogoYNueva} className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                {esConsignacion ? 'Nueva Consignación' : 'Nueva Venta'}
              </Button>
              <Button variant="secondary" onClick={cerrarDialogoEIrAVentas} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Ver Ventas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
