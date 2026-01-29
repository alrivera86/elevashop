'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Key,
  Shield,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  usuariosApi,
  UsuarioCompleto,
  Rol,
  CreateUsuarioData,
  UpdateUsuarioData,
} from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

// Componente para estadisticas
function StatsCards({ stats }: { stats: { total: number; activos: number; inactivos: number; porRol: { rol: string; cantidad: number }[] } | undefined }) {
  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activos</CardTitle>
          <UserCheck className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.activos}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
          <UserX className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.inactivos}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Por Rol</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.porRol.map((r) => (
              <Badge key={r.rol} variant="secondary">
                {r.rol}: {r.cantidad}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Form para crear/editar usuario
function UsuarioForm({
  usuario,
  roles,
  onClose,
  onSuccess,
}: {
  usuario?: UsuarioCompleto;
  roles: Rol[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: usuario?.email || '',
    password: '',
    nombreCompleto: usuario?.nombreCompleto || '',
    rolId: usuario?.rol.id.toString() || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateUsuarioData) => usuariosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-stats'] });
      toast({ title: 'Usuario creado exitosamente', variant: 'success' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error al crear usuario',
        description: error.response?.data?.message || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUsuarioData }) =>
      usuariosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({ title: 'Usuario actualizado exitosamente', variant: 'success' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error al actualizar usuario',
        description: error.response?.data?.message || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (usuario) {
      const updateData: UpdateUsuarioData = {
        email: formData.email,
        nombreCompleto: formData.nombreCompleto,
        rolId: parseInt(formData.rolId),
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: usuario.id, data: updateData });
    } else {
      createMutation.mutate({
        email: formData.email,
        password: formData.password,
        nombreCompleto: formData.nombreCompleto,
        rolId: parseInt(formData.rolId),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombreCompleto">Nombre Completo</Label>
        <Input
          id="nombreCompleto"
          value={formData.nombreCompleto}
          onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
          placeholder="Juan Perez"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="usuario@ejemplo.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          {usuario ? 'Nueva Password (dejar vacio para mantener)' : 'Password'}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={usuario ? '********' : 'Minimo 6 caracteres'}
            required={!usuario}
            minLength={usuario ? 0 : 6}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Rol</Label>
        <Select
          value={formData.rolId}
          onValueChange={(value) => setFormData({ ...formData, rolId: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((rol) => (
              <SelectItem key={rol.id} value={rol.id.toString()}>
                {rol.nombre}
                {rol.descripcion && (
                  <span className="text-muted-foreground ml-2">- {rol.descripcion}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {usuario ? 'Actualizando...' : 'Creando...'}
            </>
          ) : usuario ? (
            'Actualizar'
          ) : (
            'Crear Usuario'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Dialog para reset de password
function ResetPasswordDialog({
  usuario,
  open,
  onOpenChange,
}: {
  usuario: UsuarioCompleto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password?: string }) =>
      usuariosApi.resetPassword(id, password || undefined),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      if (data.temporaryPassword) {
        setTempPassword(data.temporaryPassword);
        toast({ title: 'Password temporal generada', variant: 'success' });
      } else {
        toast({ title: 'Password actualizada exitosamente', variant: 'success' });
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error al resetear password',
        description: error.response?.data?.message || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usuario) {
      resetMutation.mutate({ id: usuario.id, password: newPassword || undefined });
    }
  };

  const copyToClipboard = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setTempPassword(null);
    setCopied(false);
    onOpenChange(false);
  };

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetear Password</DialogTitle>
          <DialogDescription>
            Resetear password de {usuario.nombreCompleto} ({usuario.email})
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted p-4">
              <p className="text-sm text-muted-foreground mb-2">Password temporal generada:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-lg">
                  {tempPassword}
                </code>
                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Copia esta password y compartela con el usuario de forma segura.
                El usuario debera cambiarla en su primer inicio de sesion.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Password (opcional)</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Dejar vacio para generar automaticamente"
                  minLength={newPassword ? 6 : 0}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Si dejas el campo vacio, se generara una password temporal automaticamente.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={resetMutation.isPending}>
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reseteando...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Resetear Password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UsuariosPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioCompleto | null>(null);
  const [resetPasswordUsuario, setResetPasswordUsuario] = useState<UsuarioCompleto | null>(null);
  const [deleteConfirmUsuario, setDeleteConfirmUsuario] = useState<UsuarioCompleto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  const { data: usuarios, isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.getAll,
  });

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: usuariosApi.getRoles,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['usuarios-stats'],
    queryFn: usuariosApi.getStats,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usuariosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-stats'] });
      toast({ title: 'Usuario desactivado exitosamente', variant: 'success' });
      setDeleteConfirmUsuario(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error al desactivar usuario',
        description: error.response?.data?.message || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => usuariosApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-stats'] });
      toast({ title: 'Usuario reactivado exitosamente', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al reactivar usuario',
        description: error.response?.data?.message || 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const filteredUsuarios = usuarios?.filter(
    (u) =>
      u.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.rol.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRolBadgeColor = (rol: string) => {
    switch (rol.toUpperCase()) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'VENDEDOR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ALMACEN':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REPORTES':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Administracion de usuarios y permisos del sistema
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Usuario</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo usuario
              </DialogDescription>
            </DialogHeader>
            {roles && (
              <UsuarioForm
                roles={roles}
                onClose={() => setCreateDialogOpen(false)}
                onSuccess={() => setCreateDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lista de Usuarios
              </CardTitle>
              <CardDescription>
                {filteredUsuarios?.length || 0} usuarios encontrados
              </CardDescription>
            </div>
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="hidden lg:table-cell">Ultimo Login</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsuarios ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsuarios?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsuarios?.map((usuario) => (
                  <TableRow key={usuario.id} className={!usuario.activo ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      {usuario.nombreCompleto}
                      <span className="sm:hidden block text-xs text-muted-foreground truncate">{usuario.email}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{usuario.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRolBadgeColor(usuario.rol.nombre)}>
                        {usuario.rol.nombre}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {usuario.activo ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {usuario.ultimoLogin ? formatDate(usuario.ultimoLogin) : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingUsuario(usuario)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setResetPasswordUsuario(usuario)}
                          title="Resetear Password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        {usuario.activo ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmUsuario(usuario)}
                            title="Desactivar"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reactivateMutation.mutate(usuario.id)}
                            title="Reactivar"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={reactivateMutation.isPending}
                          >
                            {reactivateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUsuario} onOpenChange={(open) => !open && setEditingUsuario(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario
            </DialogDescription>
          </DialogHeader>
          {roles && editingUsuario && (
            <UsuarioForm
              usuario={editingUsuario}
              roles={roles}
              onClose={() => setEditingUsuario(null)}
              onSuccess={() => setEditingUsuario(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        usuario={resetPasswordUsuario}
        open={!!resetPasswordUsuario}
        onOpenChange={(open) => !open && setResetPasswordUsuario(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmUsuario}
        onOpenChange={(open) => !open && setDeleteConfirmUsuario(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar Usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Estas seguro de desactivar al usuario{' '}
              <strong>{deleteConfirmUsuario?.nombreCompleto}</strong>?
              <br />
              El usuario no podra iniciar sesion pero sus datos seran conservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmUsuario && deleteMutation.mutate(deleteConfirmUsuario.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desactivando...
                </>
              ) : (
                'Desactivar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
