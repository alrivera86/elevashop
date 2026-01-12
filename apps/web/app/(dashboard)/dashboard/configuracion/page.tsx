'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  DollarSign,
  Bell,
  Shield,
  Database,
  RefreshCw,
  Save,
  Loader2,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { finanzasApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function ConfiguracionPage() {
  const queryClient = useQueryClient();
  const [tasaCambio, setTasaCambio] = useState('');

  const { data: tasaActual, isLoading: loadingTasa } = useQuery({
    queryKey: ['tasa-cambio'],
    queryFn: finanzasApi.getTasaCambio,
  });

  const tasaMutation = useMutation({
    mutationFn: () => finanzasApi.setTasaCambio(parseFloat(tasaCambio)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasa-cambio'] });
      queryClient.invalidateQueries({ queryKey: ['finanzas-resumen'] });
      toast({ title: 'Tasa de cambio actualizada', variant: 'success' });
      setTasaCambio('');
    },
    onError: () => {
      toast({ title: 'Error al actualizar tasa', variant: 'destructive' });
    },
  });

  const handleUpdateTasa = (e: React.FormEvent) => {
    e.preventDefault();
    if (tasaCambio && parseFloat(tasaCambio) > 0) {
      tasaMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuracion</h1>
        <p className="text-muted-foreground">
          Ajustes generales del sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tasa de Cambio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Tasa de Cambio
            </CardTitle>
            <CardDescription>
              Configura la tasa de cambio USD/VES para conversiones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Tasa actual</p>
              {loadingTasa ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <p className="text-2xl font-bold">
                  {Number(tasaActual?.tasa || 0).toFixed(2)} Bs/$
                </p>
              )}
              {tasaActual?.fecha && (
                <p className="text-xs text-muted-foreground mt-1">
                  Actualizada: {new Date(tasaActual.fecha).toLocaleDateString()}
                </p>
              )}
            </div>

            <form onSubmit={handleUpdateTasa} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nuevaTasa">Nueva tasa (Bs por 1 USD)</Label>
                <Input
                  id="nuevaTasa"
                  type="number"
                  step="0.01"
                  min="0"
                  value={tasaCambio}
                  onChange={(e) => setTasaCambio(e.target.value)}
                  placeholder="Ej: 36.50"
                />
              </div>
              <Button
                type="submit"
                disabled={!tasaCambio || tasaMutation.isPending}
                className="w-full"
              >
                {tasaMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualizar Tasa
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura las alertas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de stock bajo</Label>
                <p className="text-sm text-muted-foreground">
                  Recibir alertas cuando un producto este bajo en stock
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de productos agotados</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar cuando un producto se agote
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Resumen diario</Label>
                <p className="text-sm text-muted-foreground">
                  Recibir un resumen de ventas al final del dia
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Inventario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Inventario
            </CardTitle>
            <CardDescription>
              Configuracion de alertas de inventario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stockMinimo">Stock minimo por defecto</Label>
              <Input
                id="stockMinimo"
                type="number"
                defaultValue="3"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Cantidad minima antes de mostrar alerta critica
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockAdvertencia">Stock de advertencia por defecto</Label>
              <Input
                id="stockAdvertencia"
                type="number"
                defaultValue="5"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Cantidad antes de mostrar advertencia
              </p>
            </div>
            <Button variant="outline" className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Guardar Configuracion
            </Button>
          </CardContent>
        </Card>

        {/* Seguridad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Opciones de seguridad del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sesion activa</Label>
                <p className="text-sm text-muted-foreground">
                  Mantener sesion activa por mas tiempo
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Registro de actividad</Label>
                <p className="text-sm text-muted-foreground">
                  Registrar todas las acciones del usuario
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="rounded-lg border bg-green-50 p-3 flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Sistema seguro</p>
                <p className="text-xs text-green-600">Todas las conexiones estan encriptadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
