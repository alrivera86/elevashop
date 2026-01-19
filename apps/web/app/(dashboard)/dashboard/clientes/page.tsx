'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Eye,
  Tag,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { clientesApi, etiquetasApi, Cliente, Etiqueta } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

function ClienteForm({
  cliente,
  onClose,
  onSuccess,
}: {
  cliente?: Cliente | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    nombre: cliente?.nombre || '',
    telefono: cliente?.telefono || '',
    email: cliente?.email || '',
    direccion: cliente?.direccion || '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      clientesApi.create({
        ...data,
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        direccion: data.direccion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: 'Cliente creado', variant: 'success' });
      onSuccess();
    },
    onError: () => {
      toast({ title: 'Error al crear cliente', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      clientesApi.update(cliente!.id, {
        ...data,
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        direccion: data.direccion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: 'Cliente actualizado', variant: 'success' });
      onSuccess();
    },
    onError: () => {
      toast({ title: 'Error al actualizar cliente', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cliente) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre completo *</Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          placeholder="Juan Pérez"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="+58 412 1234567"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input
          id="direccion"
          value={formData.direccion}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
          placeholder="Av. Principal, Ciudad"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : cliente ? 'Actualizar' : 'Crear'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Componente para gestionar etiquetas de un cliente
function EtiquetasDialog({
  cliente,
  open,
  onClose,
}: {
  cliente: Cliente | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: etiquetas } = useQuery({
    queryKey: ['etiquetas'],
    queryFn: () => etiquetasApi.getAll(),
  });

  const asignarMutation = useMutation({
    mutationFn: (etiquetaId: number) =>
      etiquetasApi.asignar({ clienteId: Number(cliente?.id), etiquetaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: 'Etiqueta asignada', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Error al asignar etiqueta', variant: 'destructive' });
    },
  });

  const quitarMutation = useMutation({
    mutationFn: (etiquetaId: number) =>
      etiquetasApi.quitar(Number(cliente?.id), etiquetaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: 'Etiqueta removida', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Error al quitar etiqueta', variant: 'destructive' });
    },
  });

  const clienteEtiquetaIds = cliente?.etiquetas?.map((e) => e.id) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etiquetas de {cliente?.nombre}</DialogTitle>
          <DialogDescription>
            Asigna o quita etiquetas para controlar el nivel de acceso del cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Etiquetas actuales */}
          <div>
            <Label className="text-sm font-medium">Etiquetas actuales</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {cliente?.etiquetas?.length === 0 ? (
                <span className="text-sm text-muted-foreground">Sin etiquetas</span>
              ) : (
                cliente?.etiquetas?.map((etiqueta) => (
                  <Badge
                    key={etiqueta.id}
                    style={{ backgroundColor: etiqueta.color, color: '#fff' }}
                    className="flex items-center gap-1 pr-1"
                  >
                    {etiqueta.nombre}
                    <button
                      onClick={() => quitarMutation.mutate(etiqueta.id)}
                      className="ml-1 hover:bg-white/20 rounded p-0.5"
                      disabled={quitarMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Etiquetas disponibles */}
          <div>
            <Label className="text-sm font-medium">Agregar etiqueta</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {etiquetas
                ?.filter((e) => !clienteEtiquetaIds.includes(e.id))
                .map((etiqueta) => (
                  <Badge
                    key={etiqueta.id}
                    variant="outline"
                    className="cursor-pointer hover:opacity-80"
                    style={{ borderColor: etiqueta.color, color: etiqueta.color }}
                    onClick={() => asignarMutation.mutate(etiqueta.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {etiqueta.nombre}
                  </Badge>
                ))}
              {etiquetas?.filter((e) => !clienteEtiquetaIds.includes(e.id)).length === 0 && (
                <span className="text-sm text-muted-foreground">
                  El cliente tiene todas las etiquetas disponibles
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [etiquetasDialogOpen, setEtiquetasDialogOpen] = useState(false);
  const [clienteEtiquetas, setClienteEtiquetas] = useState<Cliente | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', { search, page }],
    queryFn: () =>
      clientesApi.getAll({
        search: search || undefined,
        page,
        limit: 10,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: 'Cliente eliminado', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar cliente', variant: 'destructive' });
    },
  });

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCliente(null);
  };

  const handleEtiquetas = (cliente: Cliente) => {
    setClienteEtiquetas(cliente);
    setEtiquetasDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tu cartera de clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedCliente(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {selectedCliente
                  ? 'Modifica los datos del cliente'
                  : 'Completa los datos del nuevo cliente'}
              </DialogDescription>
            </DialogHeader>
            <ClienteForm
              cliente={selectedCliente}
              onClose={handleCloseDialog}
              onSuccess={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.pagination?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Etiquetas</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : data?.clientes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                data?.clientes?.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nombre}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {cliente.etiquetas?.length === 0 ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : (
                          cliente.etiquetas?.map((etiqueta) => (
                            <Badge
                              key={etiqueta.id}
                              style={{ backgroundColor: etiqueta.color }}
                              className="text-xs text-white"
                            >
                              {etiqueta.nombre}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {cliente.telefono && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {cliente.telefono}
                          </div>
                        )}
                        {cliente.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {cliente.email}
                          </div>
                        )}
                        {!cliente.telefono && !cliente.email && (
                          <span className="text-sm text-muted-foreground">Sin contacto</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(cliente.createdAt)}
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
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/clientes/${cliente.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(cliente)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEtiquetas(cliente)}>
                            <Tag className="mr-2 h-4 w-4" />
                            Etiquetas
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(cliente.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {data.clientes?.length || 0} de {data.pagination?.total || 0} clientes
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
              onClick={() => setPage((p) => Math.min(data.pagination?.totalPages || 1, p + 1))}
              disabled={page === data.pagination?.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Diálogo de Etiquetas */}
      <EtiquetasDialog
        cliente={clienteEtiquetas}
        open={etiquetasDialogOpen}
        onClose={() => {
          setEtiquetasDialogOpen(false);
          setClienteEtiquetas(null);
        }}
      />
    </div>
  );
}
