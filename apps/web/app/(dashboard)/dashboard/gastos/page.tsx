'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Plus,
  Save,
  Download,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Loader2,
  TrendingDown,
  Calendar,
  Filter,
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { finanzasApi, CategoriaGasto, GastosMatriz } from '@/lib/api';
import { useMonto } from '@/components/ui/monto';

const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const MESES_COMPLETO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function GastosOperativosPage() {
  const { formatMonto } = useMonto();
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [editingCell, setEditingCell] = useState<{ categoria: string; mes: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const queryClient = useQueryClient();

  // Query para obtener matriz de gastos
  const { data: matrizData, isLoading } = useQuery({
    queryKey: ['gastos-matriz', anioSeleccionado],
    queryFn: () => finanzasApi.getGastosMatriz(anioSeleccionado, anioSeleccionado),
  });

  // Query para categorías
  const { data: categorias } = useQuery({
    queryKey: ['categorias-gasto'],
    queryFn: () => finanzasApi.getCategorias(),
  });

  // Query para resumen anual
  const { data: resumenAnual } = useQuery({
    queryKey: ['gastos-resumen-anual', anioSeleccionado],
    queryFn: () => finanzasApi.getResumenAnual(anioSeleccionado),
  });

  // Mutation para actualizar gasto
  const updateGastoMutation = useMutation({
    mutationFn: (data: { categoriaId: number; anio: number; mes: number; monto: number }) =>
      finanzasApi.upsertGastoMensual(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos-matriz'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-resumen-anual'] });
      toast({ title: 'Gasto actualizado' });
      setEditingCell(null);
    },
    onError: () => {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    },
  });

  // Mutation para crear categoría
  const createCategoriaMutation = useMutation({
    mutationFn: (nombre: string) => finanzasApi.createCategoria(nombre, 'OPERATIVO'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-gasto'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-matriz'] });
      toast({ title: 'Categoría creada' });
      setDialogOpen(false);
      setNuevaCategoria('');
    },
  });

  const handleCellClick = (categoria: string, mes: number, valorActual: number) => {
    const key = `${anioSeleccionado}-${mes}`;
    setEditingCell({ categoria, mes: key });
    setEditValue(valorActual.toString());
  };

  const handleSaveCell = () => {
    if (!editingCell || !categorias) return;

    const cat = categorias.find(c => c.nombre === editingCell.categoria);
    if (!cat) return;

    const [anio, mes] = editingCell.mes.split('-').map(Number);
    const monto = parseFloat(editValue) || 0;

    updateGastoMutation.mutate({
      categoriaId: cat.id,
      anio,
      mes,
      monto,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveCell();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Obtener valor de la matriz
  const getValor = (categoria: string, mes: number): number => {
    if (!matrizData?.matriz[categoria]) return 0;
    const key = `${anioSeleccionado}-${mes}`;
    return matrizData.matriz[categoria][key] || 0;
  };

  // Calcular total de una categoría
  const getTotalCategoria = (categoria: string): number => {
    if (!matrizData?.matriz[categoria]) return 0;
    return Object.values(matrizData.matriz[categoria]).reduce((sum, val) => sum + val, 0);
  };

  // Calcular total de un mes
  const getTotalMes = (mes: number): number => {
    if (!matrizData?.totalesPorMes) return 0;
    const key = `${anioSeleccionado}-${mes}`;
    return matrizData.totalesPorMes[key] || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gastos Operativos</h1>
          <p className="text-sm text-muted-foreground">Control mensual de gastos fijos y variables</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {anioSeleccionado}</CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMonto(resumenAnual?.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatMonto(resumenAnual?.promedio || 0)}/mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categorias?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Tipos de gastos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mayor Gasto</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {resumenAnual?.porCategoria
                ? Object.entries(resumenAnual.porCategoria)
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {resumenAnual?.porCategoria
                ? formatMonto(Object.entries(resumenAnual.porCategoria)
                    .sort((a, b) => b[1] - a[1])[0]?.[1] || 0)
                : '$0'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mes Actual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMonto(getTotalMes(new Date().getMonth() + 1))}
            </div>
            <p className="text-xs text-muted-foreground">
              {MESES_COMPLETO[new Date().getMonth()]} {anioSeleccionado}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Selector de año */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnioSeleccionado(a => a - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              {anioSeleccionado - 1}
            </Button>
            <h2 className="text-xl font-bold">{anioSeleccionado}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnioSeleccionado(a => a + 1)}
              disabled={anioSeleccionado >= new Date().getFullYear()}
            >
              {anioSeleccionado + 1}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla estilo Excel */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 bg-muted/50 min-w-[180px] font-bold">
                  Categoría
                </TableHead>
                {MESES.map((mes, idx) => (
                  <TableHead key={idx} className="text-center min-w-[90px] font-bold">
                    {mes}
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[100px] font-bold bg-muted">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    {MESES.map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : matrizData?.categorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-24 text-center">
                    No hay categorías. Crea una para empezar.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {matrizData?.categorias.map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-muted/30">
                      <TableCell className="sticky left-0 bg-background font-medium">
                        {cat.nombre}
                      </TableCell>
                      {MESES.map((_, idx) => {
                        const mes = idx + 1;
                        const valor = getValor(cat.nombre, mes);
                        const key = `${anioSeleccionado}-${mes}`;
                        const isEditing = editingCell?.categoria === cat.nombre && editingCell?.mes === key;

                        return (
                          <TableCell
                            key={idx}
                            className="text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 p-1"
                            onClick={() => !isEditing && handleCellClick(cat.nombre, mes, valor)}
                          >
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleSaveCell}
                                autoFocus
                                className="h-7 text-center text-sm"
                              />
                            ) : (
                              <span className={valor > 0 ? '' : 'text-muted-foreground'}>
                                {valor > 0 ? valor.toFixed(2) : '-'}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold bg-muted/30">
                        {formatMonto(getTotalCategoria(cat.nombre))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Fila de totales */}
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell className="sticky left-0 bg-muted/50">TOTAL</TableCell>
                    {MESES.map((_, idx) => (
                      <TableCell key={idx} className="text-center">
                        {formatMonto(getTotalMes(idx + 1))}
                      </TableCell>
                    ))}
                    <TableCell className="text-center bg-muted text-lg">
                      {formatMonto(resumenAnual?.total || 0)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Instrucciones:</strong> Haz clic en cualquier celda para editar el monto.
            Presiona <kbd className="px-1 bg-muted rounded">Enter</kbd> para guardar o
            <kbd className="px-1 bg-muted rounded ml-1">Esc</kbd> para cancelar.
          </p>
        </CardContent>
      </Card>

      {/* Dialog para nueva categoría */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría de Gasto</DialogTitle>
            <DialogDescription>
              Agrega una nueva categoría para clasificar tus gastos operativos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la categoría</Label>
              <Input
                placeholder="Ej: Alquiler, Servicios, Nómina..."
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createCategoriaMutation.mutate(nuevaCategoria)}
              disabled={!nuevaCategoria.trim() || createCategoriaMutation.isPending}
            >
              {createCategoriaMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Crear Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
