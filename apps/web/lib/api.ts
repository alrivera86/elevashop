import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Tipos de respuesta API
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Funciones helper para las llamadas API
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<T>(url, config);
  return response.data;
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<T>(url, data, config);
  return response.data;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<T>(url, data, config);
  return response.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<T>(url, config);
  return response.data;
}

export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.patch<T>(url, data, config);
  return response.data;
}

// API endpoints
export const authApi = {
  login: (email: string, password: string) =>
    post<{ access_token: string; user: Usuario }>('/auth/login', { email, password }),
  register: (data: RegisterData) =>
    post<{ access_token: string; user: Usuario }>('/auth/register', data),
  me: () => get<Usuario>('/auth/me'),
};

export const productosApi = {
  getAll: (params?: ProductosParams) =>
    get<PaginatedResponse<Producto>>('/productos', { params }),
  getOne: (id: string) => get<Producto>(`/productos/${id}`),
  create: (data: CreateProductoData) => post<Producto>('/productos', data),
  update: (id: string, data: Partial<CreateProductoData>) => patch<Producto>(`/productos/${id}`, data),
  delete: (id: string) => del<void>(`/productos/${id}`),
};

// Tipos de importación masiva
export type OrigenImportacion = 'COMPRA' | 'PRODUCCION' | 'IMPORTACION' | 'DEVOLUCION' | 'AJUSTE';

export interface UnidadImportacion {
  serial: string;
  costoUnitario?: number;
  lote?: string;
  notas?: string;
}

export interface ImportacionProducto {
  codigoProducto: string;
  productoId?: number;
  unidades: UnidadImportacion[];
  costoUnitarioDefault?: number;
  loteDefault?: string;
}

export interface ImportacionMasivaData {
  origen: OrigenImportacion;
  fechaEntrada?: string;
  referencia?: string;
  garantiaMesesDefault?: number;
  productos: ImportacionProducto[];
  notas?: string;
}

export interface FilaExcelImportacion {
  codigoProducto: string;
  serial: string;
  costoUnitario?: number;
  lote?: string;
  notas?: string;
}

export interface ImportacionExcelData {
  origen: OrigenImportacion;
  fechaEntrada?: string;
  referencia?: string;
  garantiaMesesDefault?: number;
  filas: FilaExcelImportacion[];
}

export interface ResultadoImportacion {
  totalProcesados: number;
  exitosos: number;
  errores: number;
  detalles: {
    producto: string;
    serial: string;
    estado: 'ok' | 'error';
    mensaje?: string;
  }[];
  productosActualizados: {
    codigo: string;
    nombre: string;
    stockAnterior: number;
    stockNuevo: number;
    unidadesAgregadas: number;
  }[];
}

export interface ProductoConSeriales {
  id: number;
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  stockAdvertencia: number;
  estado: string;
  precioCosto: number;
  precioElevapartes: number;
  unidadesInventario?: UnidadInventario[];
  estadisticasSeriales: {
    totalUnidades: number;
    disponibles: number;
    vendidas: number;
    defectuosas: number;
    stockSinSerial: number;
  };
}

export const inventarioApi = {
  getDashboard: () => get<InventarioDashboard>('/inventario/dashboard'),
  getMovimientos: (params?: MovimientosParams) =>
    get<PaginatedResponse<MovimientoStock>>('/inventario/movimientos', { params }),
  registrarMovimiento: (data: CreateMovimientoData) =>
    post<MovimientoStock>('/inventario/movimiento', data),
  getAlertas: () => get<AlertaStock[]>('/inventario/alertas'),
  // Seriales
  registrarSerial: (data: RegistrarSerialData) =>
    post<UnidadInventario>('/inventario/seriales', data),
  registrarSerialesMultiples: (data: RegistrarSerialesMultiplesData) =>
    post<{ registrados: number; seriales: string[] }>('/inventario/seriales/multiple', data),
  venderSerial: (data: VenderSerialData) =>
    post<UnidadInventario>('/inventario/seriales/vender', data),
  buscarPorSerial: (serial: string) =>
    get<UnidadInventarioConGarantia | null>(`/inventario/seriales/buscar/${serial}`),
  actualizarSerial: (serial: string, data: ActualizarSerialData) =>
    api.patch<UnidadInventario>(`/inventario/seriales/${serial}`, data).then(r => r.data),
  listarSerialesPorProducto: (productoId: number, params?: SerialesParams) =>
    get<{ unidades: UnidadInventario[]; pagination: Pagination }>(`/inventario/seriales/producto/${productoId}`, { params }),
  getEstadisticasSeriales: (productoId?: number) =>
    get<EstadisticasSeriales>('/inventario/seriales/estadisticas', { params: { productoId } }),
  // Importación masiva
  importacionMasiva: (data: ImportacionMasivaData) =>
    post<ResultadoImportacion>('/inventario/importacion/masiva', data),
  importacionExcel: (data: ImportacionExcelData) =>
    post<ResultadoImportacion>('/inventario/importacion/excel', data),
  getInventarioConSeriales: (params?: { productoId?: number; codigo?: string; page?: number; limit?: number }) =>
    get<{ productos: ProductoConSeriales[]; pagination: Pagination }>('/inventario/con-seriales', { params }),
  getResumenImportaciones: (dias?: number) =>
    get<any>('/inventario/importaciones/resumen', { params: { dias } }),
};

export const ventasApi = {
  getAll: (params?: VentasParams) =>
    get<{ ventas: Venta[]; pagination: Pagination }>('/ventas', { params }),
  getOne: (id: string) => get<Venta>(`/ventas/${id}`),
  create: (data: CreateVentaData) => post<Venta>('/ventas', data),
  getResumen: (params?: { desde?: string; hasta?: string }) =>
    get<VentasResumen>('/ventas/resumen', { params }),
  getUltimos7Dias: () => get<VentasUltimos7Dias>('/ventas/ultimos-7-dias'),
};

export const clientesApi = {
  getAll: (params?: ClientesParams) =>
    get<{ clientes: Cliente[]; pagination: Pagination }>('/clientes', { params }),
  getOne: (id: string) => get<ClienteDetalle>(`/clientes/${id}`),
  create: (data: CreateClienteData) => post<Cliente>('/clientes', data),
  update: (id: string, data: Partial<CreateClienteData>) => patch<Cliente>(`/clientes/${id}`, data),
  delete: (id: string) => del<void>(`/clientes/${id}`),
};

export interface CuentaFondo {
  nombre: string;
  codigo: string;
  monto: number;
  moneda: string;
  porcentaje: number;
  montoUsd?: number;
  icono: string;
  color: string;
}

export interface DistribucionFondos {
  totalVentas: number;
  tasaCambio: number;
  cuentas: CuentaFondo[];
  resumen: {
    enUsd: number;
    enBs: number;
    enBsEquivalenteUsd: number;
  };
}

export interface TasaDolar {
  rate: number;
  source: string;
  updatedAt: string;
  nextUpdate: string;
}

export const finanzasApi = {
  getTasaCambio: () => get<TasaCambio>('/finanzas/tasa-cambio'),
  setTasaCambio: (tasa: number) => post<TasaCambio>('/finanzas/tasa-cambio', { tasa }),
  getGastos: (params?: GastosParams) =>
    get<PaginatedResponse<Gasto>>('/finanzas/gastos', { params }),
  createGasto: (data: CreateGastoData) => post<Gasto>('/finanzas/gastos', data),
  getResumen: (params?: { desde?: string; hasta?: string }) =>
    get<FinanzasResumen>('/finanzas/resumen', { params }),
  getDistribucionFondos: () => get<DistribucionFondos>('/finanzas/distribucion-fondos'),
  getTasaDolar: () => get<TasaDolar>('/finanzas/tasa-dolar'),
  actualizarTasaDolar: () => post<TasaDolar>('/finanzas/tasa-dolar/actualizar'),
};

export const reportesApi = {
  getGeneral: (params?: ReportesParams) => get<ReporteGeneral>('/reportes', { params }),
  getVentas: (params?: ReportesParams) => get<ReporteVentas>('/reportes/ventas', { params }),
  getProductos: (params?: ReportesParams) => get<ReporteProductos>('/reportes/productos', { params }),
  getClientes: (params?: ReportesParams) => get<ReporteClientes>('/reportes/clientes', { params }),
  getDashboardBI: (fechaDesde?: string, fechaHasta?: string) => {
    const params: Record<string, string> = {};
    if (fechaDesde) params.fechaDesde = fechaDesde;
    if (fechaHasta) params.fechaHasta = fechaHasta;
    return get<DashboardBI>('/reportes/bi', { params });
  },
  getTopClientes: (limit?: number) => get<TopCliente[]>('/reportes/top-clientes', { params: { limit } }),
  getTopProductos: (limit?: number) => get<TopProducto[]>('/reportes/top-productos', { params: { limit } }),
  getMetodosPago: (dias?: number) => get<MetodoPagoStats[]>('/reportes/metodos-pago', { params: { dias } }),
  getUtilidades: () => get<ResumenUtilidades>('/reportes/utilidades'),
  getProductosReposicion: () => get<ProductoReposicion[]>('/reportes/productos-reposicion'),
};

// Tipos para reportes BI
export interface TopCliente {
  posicion: number;
  id: number;
  nombre: string;
  telefono?: string;
  totalCompras: number;
  cantidadOrdenes: number;
  ticketPromedio: number;
  clienteDesde: string;
}

export interface TopProducto {
  posicion: number;
  productoId: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidadesVendidas: number;
  vecesVendido: number;
  ingresos: number;
  costoEstimado: number;
  utilidadEstimada: number;
  margenPorcentaje: number;
  stockActual: number;
}

export interface MetodoPagoStats {
  metodoPago: string;
  monto: number;
  transacciones: number;
  porcentaje: number;
}

export interface ResumenUtilidades {
  mesActual: {
    utilidad: number;
    ventas: number;
    costo: number;
    unidades: number;
  };
  mesAnterior: {
    utilidad: number;
    ventas: number;
    unidades: number;
  };
  cambioMensual: number;
  acumulado: {
    utilidad: number;
    ventas: number;
    costo: number;
    unidades: number;
  };
}

export interface ProductoReposicion {
  id: number;
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  stockAdvertencia: number;
  estado: string;
  precioCosto: number;
  categoria?: { nombre: string };
}

export interface DashboardBI {
  kpis: {
    ventasMes: number;
    utilidadMes: number;
    margenPromedio: number;
    unidadesVendidas: number;
    cambioVsMesAnterior: number;
    clientesActivos: number;
    productosEnAlerta: number;
  };
  topClientes: TopCliente[];
  topProductos: TopProducto[];
  metodosPago: MetodoPagoStats[];
  utilidades: ResumenUtilidades;
  productosReposicion: ProductoReposicion[];
}

// Tipos
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: { id: string; nombre: string };
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioMercadoLibre: number;
  precioMercado: number;
  precioElevapartes: number;
  precioCosto?: number;
  stockActual: number;
  stockMinimo: number;
  stockAdvertencia: number;
  estado: 'OK' | 'ALERTA_W' | 'ALERTA' | 'AGOTADO';
  ubicacion?: string;
  categoria?: { id: number; nombre: string };
  activo: boolean;
  createdAt: string;
}

export interface ProductosParams {
  page?: number;
  limit?: number;
  search?: string;
  categoriaId?: string;
  estado?: string;
}

export interface CreateProductoData {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioMercadoLibre: number;
  precioMercado: number;
  precioElevapartes: number;
  precioCosto?: number;
  stockActual?: number;
  stockMinimo?: number;
  stockAdvertencia?: number;
  ubicacion?: string;
  categoriaId?: number;
}

export interface MovimientoStock {
  id: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION';
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  referencia?: string;
  motivo?: string;
  producto: { id: number; nombre: string; codigo: string };
  createdAt: string;
}

export interface MovimientosParams {
  page?: number;
  limit?: number;
  productoId?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
}

export interface CreateMovimientoData {
  productoId: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION';
  cantidad: number;
  referencia?: string;
  motivo?: string;
}

export interface AlertaStock {
  id: number;
  tipoAlerta: 'STOCK_BAJO' | 'STOCK_MINIMO' | 'AGOTADO' | 'SOBRESTOCK';
  stockActual: number;
  stockMinimo: number;
  resuelta: boolean;
  producto: { id: number; nombre: string; codigo: string };
  createdAt: string;
}

export interface InventarioDashboard {
  totalProductos: number;
  productosOk: number;
  productosBajoStock: number;
  productosCriticos: number;
  productosAgotados: number;
  valorInventario: number;
  alertasNoLeidas: number;
}

export interface Etiqueta {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  color: string;
  activo: boolean;
  cantidadClientes?: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  totalCompras?: number;
  cantidadOrdenes?: number;
  etiquetas?: Etiqueta[];
  createdAt: string;
}

export interface ClienteVentaDetalle {
  id: number;
  numero: string;
  fecha: string;
  subtotal: number;
  descuento: number;
  impuesto?: number;
  total: number;
  detalles: {
    id: number;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    producto: { id: number; codigo: string; nombre: string };
  }[];
  pagos: {
    id: number;
    metodoPago: string;
    monto: number;
    moneda: string;
  }[];
}

export interface ClienteUnidadComprada {
  id: number;
  serial: string;
  fechaVenta?: string;
  precioVenta?: number;
  garantiaHasta?: string;
  estado: EstadoUnidad;
  producto: { id: number; codigo: string; nombre: string };
}

export interface ClienteEstadisticas {
  totalVentas: number;
  totalGastado: number;
  promedioCompra: number;
  productosUnicos: number;
  serialesComprados: number;
}

export interface ClienteDetalle extends Cliente {
  ventas: ClienteVentaDetalle[];
  unidadesCompradas: ClienteUnidadComprada[];
  estadisticas: ClienteEstadisticas;
}

export interface ClientesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateClienteData {
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export interface Venta {
  id: number;
  numero: string;
  fecha: string;
  subtotal: number;
  descuento: number;
  impuesto?: number;
  total: number;
  notas?: string;
  cliente?: { id: string; nombre: string; telefono?: string; email?: string; direccion?: string };
  usuario: { id: string; nombre: string };
  detalles: VentaDetalle[];
  pagos: VentaPago[];
  createdAt: string;
}

export interface VentaDetalle {
  id: string;
  producto: { id: string; nombre: string; codigo: string };
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  subtotal: number;
  serial?: string;
}

export interface VentaPago {
  id: string;
  metodoPago: string;
  monto: number;
  moneda: 'USD' | 'VES';
  referencia?: string;
}

export interface VentasParams {
  page?: number;
  limit?: number;
  clienteId?: string;
  desde?: string;
  hasta?: string;
}

export interface CreateVentaData {
  clienteId: number;
  subtotal: number;
  descuento?: number;
  impuesto?: number;
  total: number;
  notas?: string;
  detalles: {
    productoId: number;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
    serial?: string;
  }[];
  pagos?: {
    metodoPago: string;
    monto: number;
    moneda?: 'USD' | 'VES';
    tasaCambio?: number;
    montoBs?: number;
    referencia?: string;
  }[];
}

export interface VentasResumen {
  totalVentas: number;
  cantidadVentas: number;
  ticketPromedio: number;
  ventasPorMetodoPago: { metodoPago: string; total: number }[];
}

export interface VentaDia {
  fecha: string;
  nombreDia: string;
  total: number;
  cantidad: number;
  productos: { nombre: string; cantidad: number; total: number }[];
}

export interface VentasUltimos7Dias {
  dias: VentaDia[];
  totalPeriodo: number;
  cantidadVentas: number;
}

export interface TasaCambio {
  id: string;
  tasa: number;
  fecha: string;
}

export interface Gasto {
  id: string;
  descripcion: string;
  monto: number;
  moneda: 'USD' | 'VES';
  tipo: string;
  fecha: string;
  categoria?: { id: string; nombre: string };
}

export interface GastosParams {
  page?: number;
  limit?: number;
  tipo?: string;
  desde?: string;
  hasta?: string;
}

export interface CreateGastoData {
  descripcion: string;
  monto: number;
  moneda: 'USD' | 'VES';
  tipo: string;
  fecha?: string;
  categoriaId?: string;
}

export interface FinanzasResumen {
  ingresos: number;
  gastos: number;
  balance: number;
  tasaCambioActual: number;
}

export interface ReportesParams {
  desde?: string;
  hasta?: string;
}

export interface ReporteGeneral {
  ventas: { total: number; cantidad: number };
  gastos: { total: number; cantidad: number };
  balance: number;
  productosVendidos: number;
  clientesNuevos: number;
}

export interface ReporteVentas {
  totalVentas: number;
  ventasPorDia: { fecha: string; total: number }[];
  ventasPorMetodoPago: { metodoPago: string; total: number }[];
  topProductos: { producto: string; cantidad: number; total: number }[];
  topClientes: { cliente: string; total: number }[];
}

export interface ReporteProductos {
  totalProductos: number;
  valorInventario: number;
  productosConStock: number;
  productosSinStock: number;
  movimientosPorTipo: { tipo: string; cantidad: number }[];
}

export interface ReporteClientes {
  totalClientes: number;
  clientesNuevos: number;
  topClientes: { cliente: string; compras: number; total: number }[];
}

// ============ TIPOS DE SERIALES ============

export type EstadoUnidad = 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'DEFECTUOSO' | 'DEVUELTO';
export type OrigenUnidad = 'COMPRA' | 'PRODUCCION' | 'IMPORTACION' | 'DEVOLUCION' | 'AJUSTE';
export type MetodoPago = 'EFECTIVO_USD' | 'EFECTIVO_BS' | 'ZELLE' | 'BANESCO' | 'TRANSFERENCIA_BS' | 'TRANSFERENCIA_USD' | 'PAGO_MOVIL' | 'BINANCE' | 'MIXTO';

export interface UnidadInventario {
  id: number;
  productoId: number;
  serial: string;
  estado: EstadoUnidad;
  fechaEntrada: string;
  origenTipo?: OrigenUnidad;
  costoUnitario: number;
  lote?: string;
  fechaVenta?: string;
  clienteId?: number;
  precioVenta?: number;
  metodoPago?: MetodoPago;
  ventaId?: number;
  utilidad?: number;
  garantiaMeses: number;
  garantiaHasta?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
  producto?: Producto;
  cliente?: Cliente;
}

export interface UnidadInventarioConGarantia extends UnidadInventario {
  enGarantia: boolean;
  diasRestantesGarantia: number;
  vendidoPorNosotros: boolean;
}

export interface RegistrarSerialData {
  productoId: number;
  serial: string;
  costoUnitario: number;
  origenTipo?: OrigenUnidad;
  lote?: string;
  garantiaMeses?: number;
  fechaEntrada?: string;
  notas?: string;
}

export interface RegistrarSerialesMultiplesData {
  productoId: number;
  seriales: string[];
  costoUnitario: number;
  origenTipo?: OrigenUnidad;
  lote?: string;
  garantiaMeses?: number;
}

export interface VenderSerialData {
  serial: string;
  clienteId: number;
  precioVenta: number;
  metodoPago: MetodoPago;
  ventaId?: number;
  fechaVenta?: string;
  notas?: string;
}

export interface ActualizarSerialData {
  estado?: EstadoUnidad;
  costoUnitario?: number;
  origenTipo?: OrigenUnidad;
  lote?: string;
  garantiaMeses?: number;
  notas?: string;
}

export interface SerialesParams {
  estado?: EstadoUnidad;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EstadisticasSeriales {
  totalUnidades: number;
  disponibles: number;
  vendidas: number;
  defectuosas: number;
  devueltas: number;
  reservadas: number;
  valorInventarioCosto: number;
  totalVendido: number;
  utilidadTotal: number;
}

// ============ TIPOS DE USUARIOS ============

export interface UsuarioCompleto {
  id: number;
  email: string;
  nombreCompleto: string;
  activo: boolean;
  ultimoLogin?: string;
  createdAt: string;
  updatedAt: string;
  rol: Rol;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
  permisos: string[];
}

export interface CreateUsuarioData {
  email: string;
  password: string;
  nombreCompleto: string;
  rolId: number;
}

export interface UpdateUsuarioData {
  email?: string;
  password?: string;
  nombreCompleto?: string;
  rolId?: number;
  activo?: boolean;
}

export interface UsuarioStats {
  total: number;
  activos: number;
  inactivos: number;
  porRol: { rol: string; cantidad: number }[];
}

export interface ResetPasswordResponse {
  message: string;
  temporaryPassword?: string;
}

export const usuariosApi = {
  getAll: () => get<UsuarioCompleto[]>('/usuarios'),
  getOne: (id: number) => get<UsuarioCompleto>(`/usuarios/${id}`),
  create: (data: CreateUsuarioData) => post<UsuarioCompleto>('/usuarios', data),
  update: (id: number, data: UpdateUsuarioData) =>
    api.patch<UsuarioCompleto>(`/usuarios/${id}`, data).then(r => r.data),
  delete: (id: number) => del<void>(`/usuarios/${id}`),
  reactivate: (id: number) =>
    api.patch<UsuarioCompleto>(`/usuarios/${id}/reactivar`).then(r => r.data),
  resetPassword: (id: number, newPassword?: string) =>
    post<ResetPasswordResponse>(`/usuarios/${id}/reset-password`, { newPassword }),
  changePassword: (id: number, currentPassword: string, newPassword: string) =>
    post<{ message: string }>(`/usuarios/${id}/change-password`, { currentPassword, newPassword }),
  getRoles: () => get<Rol[]>('/usuarios/roles'),
  getStats: () => get<UsuarioStats>('/usuarios/stats'),
};

// ============ ETIQUETAS ============

export interface AsignarEtiquetaData {
  clienteId: number;
  etiquetaId: number;
  asignadoPor?: string;
}

export const etiquetasApi = {
  getAll: () => get<Etiqueta[]>('/etiquetas'),
  getOne: (id: number) => get<Etiqueta & { clientes: Cliente[] }>(`/etiquetas/${id}`),
  create: (data: { codigo: string; nombre: string; descripcion?: string; color?: string }) =>
    post<Etiqueta>('/etiquetas', data),
  update: (id: number, data: { nombre?: string; descripcion?: string; color?: string; activo?: boolean }) =>
    put<Etiqueta>(`/etiquetas/${id}`, data),
  delete: (id: number) => del<void>(`/etiquetas/${id}`),
  // Asignación
  asignar: (data: AsignarEtiquetaData) => post<any>('/etiquetas/asignar', data),
  quitar: (clienteId: number, etiquetaId: number) =>
    del<void>(`/etiquetas/cliente/${clienteId}/etiqueta/${etiquetaId}`),
  getEtiquetasCliente: (clienteId: number) => get<Etiqueta[]>(`/etiquetas/cliente/${clienteId}`),
};

// ============ CONSIGNACIONES ============

export type EstadoConsignacion = 'PENDIENTE' | 'EN_PROCESO' | 'LIQUIDADA' | 'VENCIDA' | 'CANCELADA';
export type EstadoDetalleConsignacion = 'CONSIGNADO' | 'VENDIDO' | 'DEVUELTO';

export interface Consignatario {
  id: number;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  rifCedula?: string;
  notas?: string;
  activo: boolean;
  totalConsignado: number;
  totalPagado: number;
  saldoPendiente: number;
  createdAt: string;
  updatedAt: string;
  _count?: { consignaciones: number };
}

export interface ConsignacionDetalle {
  id: number;
  consignacionId: number;
  productoId: number;
  unidadInventarioId: number;
  precioConsignacion: number;
  estado: EstadoDetalleConsignacion;
  fechaVenta?: string;
  fechaDevolucion?: string;
  producto: { id: number; codigo: string; nombre: string };
  unidadInventario: { id: number; serial: string };
}

export interface ConsignacionPago {
  id: number;
  consignatarioId: number;
  consignacionId?: number;
  monto: number;
  metodoPago: MetodoPago;
  referencia?: string;
  fecha: string;
  notas?: string;
}

export interface Consignacion {
  id: number;
  numero: string;
  consignatarioId: number;
  fechaEntrega: string;
  fechaLimite?: string;
  valorTotal: number;
  valorPagado: number;
  valorPendiente: number;
  estado: EstadoConsignacion;
  notas?: string;
  createdAt: string;
  updatedAt: string;
  consignatario?: Consignatario | { id: number; nombre: string; telefono?: string };
  detalles?: ConsignacionDetalle[];
  pagos?: ConsignacionPago[];
  _count?: { detalles: number };
}

export interface ConsignacionDashboard {
  valorTotalConsignado: number;
  valorTotalPagado: number;
  valorPorCobrar: number;
  totalConsignatarios: number;
  consignacionesPendientes: number;
  consignacionesVencidas: number;
  topDeudores: {
    id: number;
    nombre: string;
    telefono?: string;
    totalConsignado: number;
    totalPagado: number;
    saldoPendiente: number;
  }[];
}

export interface CreateConsignatarioData {
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  rifCedula?: string;
  notas?: string;
}

export interface CreateConsignacionData {
  consignatarioId: number;
  fechaEntrega?: string;
  fechaLimite?: string;
  notas?: string;
  detalles: {
    productoId: number;
    unidadInventarioId: number;
    precioConsignacion: number;
  }[];
}

export interface RegistrarPagoData {
  consignatarioId: number;
  consignacionId?: number;
  monto: number;
  metodoPago: MetodoPago;
  referencia?: string;
  fecha?: string;
  notas?: string;
}

export interface ReportarVentaData {
  detalleIds: number[];
  fechaVenta?: string;
}

export interface ReportarDevolucionData {
  detalleIds: number[];
  fechaDevolucion?: string;
}

export interface ConsignatariosParams {
  page?: number;
  limit?: number;
  search?: string;
  activo?: boolean;
}

export interface ConsignacionesParams {
  page?: number;
  limit?: number;
  consignatarioId?: number;
  estado?: EstadoConsignacion;
}

export interface ResumenPorCobrar {
  consignatario: { id: number; nombre: string; telefono?: string };
  totalConsignado: number;
  totalPagado: number;
  saldoPendiente: number;
  consignaciones: {
    id: number;
    numero: string;
    fechaEntrega: string;
    fechaLimite?: string;
    valorTotal: number;
    valorPagado: number;
    valorPendiente: number;
    estado: EstadoConsignacion;
    detalles: {
      id: number;
      producto: { id: number; codigo: string; nombre: string };
      serial: string;
      precioConsignacion: number;
      estado: EstadoDetalleConsignacion;
    }[];
  }[];
}

export const consignacionApi = {
  // Dashboard
  getDashboard: () => get<ConsignacionDashboard>('/consignacion/dashboard'),
  getPorCobrar: () => get<ResumenPorCobrar[]>('/consignacion/por-cobrar'),

  // Consignatarios
  getConsignatarios: (params?: ConsignatariosParams) =>
    get<{ consignatarios: Consignatario[]; pagination: Pagination }>('/consignacion/consignatarios', { params }),
  getConsignatario: (id: number) => get<Consignatario>(`/consignacion/consignatarios/${id}`),
  createConsignatario: (data: CreateConsignatarioData) =>
    post<Consignatario>('/consignacion/consignatarios', data),
  updateConsignatario: (id: number, data: Partial<CreateConsignatarioData>) =>
    patch<Consignatario>(`/consignacion/consignatarios/${id}`, data),
  deleteConsignatario: (id: number) => del<void>(`/consignacion/consignatarios/${id}`),

  // Consignaciones
  getConsignaciones: (params?: ConsignacionesParams) =>
    get<{ consignaciones: Consignacion[]; pagination: Pagination }>('/consignacion', { params }),
  getConsignacion: (id: number) => get<Consignacion>(`/consignacion/${id}`),
  createConsignacion: (data: CreateConsignacionData) => post<Consignacion>('/consignacion', data),
  reportarVenta: (id: number, data: ReportarVentaData) =>
    post<Consignacion>(`/consignacion/${id}/reportar-venta`, data),
  reportarDevolucion: (id: number, data: ReportarDevolucionData) =>
    post<Consignacion>(`/consignacion/${id}/devolucion`, data),

  // Pagos
  registrarPago: (data: RegistrarPagoData) => post<ConsignacionPago>('/consignacion/pago', data),
};
