'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  ScanBarcode,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { productosApi, inventarioApi, Producto } from '@/lib/api';
import { formatCurrency, getStockStatus, getStockStatusLabel } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

function ProductoForm({
  producto,
  onClose,
  onSuccess,
}: {
  producto?: Producto | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    descripcion: producto?.descripcion || '',
    precioMercadoLibre: producto?.precioMercadoLibre?.toString() || '',
    precioMercado: producto?.precioMercado?.toString() || '',
    precioElevapartes: producto?.precioElevapartes?.toString() || '',
    precioCosto: producto?.precioCosto?.toString() || '',
    stockActual: producto?.stockActual?.toString() || '0',
    stockMinimo: producto?.stockMinimo?.toString() || '5',
    stockAdvertencia: producto?.stockAdvertencia?.toString() || '10',
    ubicacion: producto?.ubicacion || '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      productosApi.create({
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        precioMercadoLibre: parseFloat(data.precioMercadoLibre),
        precioMercado: parseFloat(data.precioMercado),
        precioElevapartes: parseFloat(data.precioElevapartes),
        precioCosto: data.precioCosto ? parseFloat(data.precioCosto) : undefined,
        stockActual: parseInt(data.stockActual),
        stockMinimo: parseInt(data.stockMinimo),
        stockAdvertencia: parseInt(data.stockAdvertencia),
        ubicacion: data.ubicacion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-dashboard'] });
      toast({ title: 'Producto creado', variant: 'success' });
      onSuccess();
    },
    onError: () => {
      toast({ title: 'Error al crear producto', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      productosApi.update(producto!.id.toString(), {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        precioMercadoLibre: parseFloat(data.precioMercadoLibre),
        precioMercado: parseFloat(data.precioMercado),
        precioElevapartes: parseFloat(data.precioElevapartes),
        precioCosto: data.precioCosto ? parseFloat(data.precioCosto) : undefined,
        stockActual: parseInt(data.stockActual),
        stockMinimo: parseInt(data.stockMinimo),
        stockAdvertencia: parseInt(data.stockAdvertencia),
        ubicacion: data.ubicacion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-dashboard'] });
      toast({ title: 'Producto actualizado', variant: 'success' });
      onSuccess();
    },
    onError: () => {
      toast({ title: 'Error al actualizar producto', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (producto) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="codigo">Código</Label>
          <Input
            id="codigo"
            value={formData.codigo}
            onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Input
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="precioMercadoLibre">Precio MercadoLibre ($)</Label>
          <Input
            id="precioMercadoLibre"
            type="number"
            step="0.01"
            value={formData.precioMercadoLibre}
            onChange={(e) => setFormData({ ...formData, precioMercadoLibre: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="precioMercado">Precio Mercado ($)</Label>
          <Input
            id="precioMercado"
            type="number"
            step="0.01"
            value={formData.precioMercado}
            onChange={(e) => setFormData({ ...formData, precioMercado: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="precioElevapartes">Precio Elevapartes ($)</Label>
          <Input
            id="precioElevapartes"
            type="number"
            step="0.01"
            value={formData.precioElevapartes}
            onChange={(e) => setFormData({ ...formData, precioElevapartes: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="precioCosto">Precio Costo ($)</Label>
          <Input
            id="precioCosto"
            type="number"
            step="0.01"
            value={formData.precioCosto}
            onChange={(e) => setFormData({ ...formData, precioCosto: e.target.value })}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stockActual">Stock Actual</Label>
          <Input
            id="stockActual"
            type="number"
            value={formData.stockActual}
            onChange={(e) => setFormData({ ...formData, stockActual: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stockMinimo">Stock Mínimo</Label>
          <Input
            id="stockMinimo"
            type="number"
            value={formData.stockMinimo}
            onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stockAdvertencia">Stock Advertencia</Label>
          <Input
            id="stockAdvertencia"
            type="number"
            value={formData.stockAdvertencia}
            onChange={(e) => setFormData({ ...formData, stockAdvertencia: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ubicacion">Ubicación</Label>
        <Input
          id="ubicacion"
          value={formData.ubicacion}
          onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
          placeholder="Ej: Estante A-3"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : producto ? 'Actualizar' : 'Crear'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function MovimientoForm({
  producto,
  onClose,
  onSuccess,
}: {
  producto: Producto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    tipo: 'ENTRADA' as 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION',
    cantidad: '',
    motivo: '',
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      inventarioApi.registrarMovimiento({
        productoId: producto.id,
        tipo: formData.tipo,
        cantidad: parseInt(formData.cantidad),
        motivo: formData.motivo || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-stock'] });
      toast({ title: 'Movimiento registrado', variant: 'success' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error al registrar movimiento',
        description: error?.response?.data?.message || 'Error desconocido',
        variant: 'destructive'
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const getExpectedStock = () => {
    const cantidad = parseInt(formData.cantidad) || 0;
    switch (formData.tipo) {
      case 'ENTRADA':
      case 'DEVOLUCION':
        return producto.stockActual + cantidad;
      case 'SALIDA':
        return producto.stockActual - cantidad;
      case 'AJUSTE':
        return cantidad;
      default:
        return producto.stockActual;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-muted p-3">
        <p className="text-sm font-medium">{producto.nombre}</p>
        <p className="text-sm text-muted-foreground">Stock actual: {producto.stockActual}</p>
        {formData.cantidad && (
          <p className="text-sm text-muted-foreground">
            Stock resultante: <span className="font-medium">{getExpectedStock()}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tipo de movimiento</Label>
        <Select
          value={formData.tipo}
          onValueChange={(value: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION') =>
            setFormData({ ...formData, tipo: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ENTRADA">Entrada (Compra/Reposición)</SelectItem>
            <SelectItem value="SALIDA">Salida (Venta/Pérdida)</SelectItem>
            <SelectItem value="AJUSTE">Ajuste (Fijar cantidad)</SelectItem>
            <SelectItem value="DEVOLUCION">Devolución</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cantidad">
          {formData.tipo === 'AJUSTE' ? 'Nueva cantidad' : 'Cantidad'}
        </Label>
        <Input
          id="cantidad"
          type="number"
          min={formData.tipo === 'AJUSTE' ? '0' : '1'}
          value={formData.cantidad}
          onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
          required
        />
        {formData.tipo === 'AJUSTE' && (
          <p className="text-xs text-muted-foreground">
            Ingresa la cantidad exacta que debería tener el inventario
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="motivo">Motivo (opcional)</Label>
        <Input
          id="motivo"
          value={formData.motivo}
          onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
          placeholder="Ej: Compra a proveedor, Venta directa..."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Registrando...' : 'Registrar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function InventarioPage() {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movimientoDialogOpen, setMovimientoDialogOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [productoForMovimiento, setProductoForMovimiento] = useState<Producto | null>(null);

  const queryClient = useQueryClient();

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['productos', { search, estado: estadoFilter, page }],
    queryFn: () =>
      productosApi.getAll({
        search: search || undefined,
        estado: estadoFilter || undefined,
        page,
        limit: 10,
      }),
  });

  // Mapear la respuesta de la API
  const data = apiResponse ? {
    data: (apiResponse as any).productos || [],
    total: (apiResponse as any).pagination?.total || 0,
    page: (apiResponse as any).pagination?.page || 1,
    totalPages: (apiResponse as any).pagination?.totalPages || 1,
  } : null;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productosApi.delete(id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-dashboard'] });
      toast({ title: 'Producto eliminado', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar producto', variant: 'destructive' });
    },
  });

  const handleEdit = (producto: Producto) => {
    setSelectedProducto(producto);
    setDialogOpen(true);
  };

  const handleMovimiento = (producto: Producto) => {
    setProductoForMovimiento(producto);
    setMovimientoDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProducto(null);
  };

  const handleCloseMovimientoDialog = () => {
    setMovimientoDialogOpen(false);
    setProductoForMovimiento(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus productos y stock</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/inventario/importar">
            <Button variant="outline" size="sm" className="sm:size-default">
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Importar Stock</span>
              <span className="sm:hidden">Importar</span>
            </Button>
          </Link>
          <Link href="/dashboard/inventario/seriales">
            <Button variant="outline" size="sm" className="sm:size-default">
              <ScanBarcode className="mr-2 h-4 w-4" />
              Seriales
            </Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedProducto(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
              <DialogDescription>
                {selectedProducto
                  ? 'Modifica los datos del producto'
                  : 'Completa los datos del nuevo producto'}
              </DialogDescription>
            </DialogHeader>
            <ProductoForm
              producto={selectedProducto}
              onClose={handleCloseDialog}
              onSuccess={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={estadoFilter || "all"} onValueChange={(val) => setEstadoFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="OK">Stock OK</SelectItem>
                <SelectItem value="ALERTA_W">Stock Bajo</SelectItem>
                <SelectItem value="ALERTA">Crítico</SelectItem>
                <SelectItem value="AGOTADO">Agotado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell text-right">P. Compra</TableHead>
                <TableHead className="text-right">P. Venta</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((producto: any) => {
                  // Mapear estado a variante de badge
                  const getEstadoVariant = (estado: string) => {
                    if (estado === 'AGOTADO') return 'agotado';
                    if (estado === 'ALERTA') return 'alerta';
                    if (estado === 'ALERTA_W' || estado === 'ALERTA-W') return 'alerta-w';
                    return 'ok';
                  };
                  const getEstadoLabel = (estado: string) => {
                    if (estado === 'AGOTADO') return 'Agotado';
                    if (estado === 'ALERTA') return 'Crítico';
                    if (estado === 'ALERTA_W' || estado === 'ALERTA-W') return 'Bajo';
                    return 'OK';
                  };
                  return (
                    <TableRow key={producto.id}>
                      <TableCell className="font-mono text-sm hidden sm:table-cell">
                        {producto.codigo}
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="block truncate max-w-[150px] sm:max-w-none">{producto.nombre}</span>
                        <span className="sm:hidden text-xs text-muted-foreground font-mono">{producto.codigo}</span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {formatCurrency(Number(producto.precioMercado) || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(producto.precioElevapartes) || 0)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {producto.stockActual}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <Badge variant={getEstadoVariant(producto.estado) as any}>
                          {getEstadoLabel(producto.estado)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleMovimiento(producto)}>
                              <ArrowUpDown className="mr-2 h-4 w-4" />
                              Movimiento
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(producto)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(producto.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {data.data.length} de {data.total} productos
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
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Movimiento Dialog */}
      <Dialog open={movimientoDialogOpen} onOpenChange={setMovimientoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
            <DialogDescription>
              Registra una entrada, salida o ajuste de inventario
            </DialogDescription>
          </DialogHeader>
          {productoForMovimiento && (
            <MovimientoForm
              producto={productoForMovimiento}
              onClose={handleCloseMovimientoDialog}
              onSuccess={handleCloseMovimientoDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
