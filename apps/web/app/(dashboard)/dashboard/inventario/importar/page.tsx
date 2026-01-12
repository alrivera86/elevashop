'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Package,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  inventarioApi,
  ImportacionExcelData,
  FilaExcelImportacion,
  ResultadoImportacion,
  OrigenImportacion,
} from '@/lib/api';
import Link from 'next/link';

type PasoImportacion = 'datos' | 'preview' | 'resultado';

export default function ImportarInventarioPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [paso, setPaso] = useState<PasoImportacion>('datos');
  const [origen, setOrigen] = useState<OrigenImportacion>('IMPORTACION');
  const [referencia, setReferencia] = useState('');
  const [fechaEntrada, setFechaEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [garantiaMeses, setGarantiaMeses] = useState(6);
  const [datosTexto, setDatosTexto] = useState('');
  const [filasProcesadas, setFilasProcesadas] = useState<FilaExcelImportacion[]>([]);
  const [erroresParseo, setErroresParseo] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  const importarMutation = useMutation({
    mutationFn: (data: ImportacionExcelData) => inventarioApi.importacionExcel(data),
    onSuccess: (data) => {
      setResultado(data);
      setPaso('resultado');
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
  });

  const parsearDatos = () => {
    const errores: string[] = [];
    const filas: FilaExcelImportacion[] = [];

    const lineas = datosTexto.trim().split('\n');

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim();
      if (!linea) continue;

      // Separar por tab o punto y coma
      const partes = linea.includes('\t') ? linea.split('\t') : linea.split(';');

      if (partes.length < 2) {
        errores.push(`Línea ${i + 1}: Formato inválido. Se esperan al menos 2 columnas (código, serial)`);
        continue;
      }

      const codigoProducto = partes[0]?.trim();
      const serial = partes[1]?.trim();
      const costoUnitario = partes[2] ? parseFloat(partes[2].trim()) : undefined;
      const lote = partes[3]?.trim() || undefined;
      const notas = partes[4]?.trim() || undefined;

      if (!codigoProducto || !serial) {
        errores.push(`Línea ${i + 1}: Código o serial vacío`);
        continue;
      }

      // Verificar duplicados en los datos ingresados
      if (filas.some(f => f.serial.toUpperCase() === serial.toUpperCase())) {
        errores.push(`Línea ${i + 1}: Serial "${serial}" duplicado en los datos`);
        continue;
      }

      filas.push({
        codigoProducto,
        serial,
        costoUnitario: costoUnitario && !isNaN(costoUnitario) ? costoUnitario : undefined,
        lote,
        notas,
      });
    }

    setFilasProcesadas(filas);
    setErroresParseo(errores);

    if (filas.length > 0) {
      setPaso('preview');
    }
  };

  const ejecutarImportacion = () => {
    const data: ImportacionExcelData = {
      origen,
      fechaEntrada,
      referencia: referencia || undefined,
      garantiaMesesDefault: garantiaMeses,
      filas: filasProcesadas,
    };

    importarMutation.mutate(data);
  };

  const reiniciar = () => {
    setPaso('datos');
    setDatosTexto('');
    setFilasProcesadas([]);
    setErroresParseo([]);
    setResultado(null);
    setReferencia('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventario">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Inventario</h1>
          <p className="text-muted-foreground">
            Carga masiva de productos con seriales
          </p>
        </div>
      </div>

      {/* Pasos */}
      <div className="flex items-center gap-2">
        <Badge variant={paso === 'datos' ? 'default' : 'secondary'}>1. Datos</Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant={paso === 'preview' ? 'default' : 'secondary'}>2. Vista Previa</Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant={paso === 'resultado' ? 'default' : 'secondary'}>3. Resultado</Badge>
      </div>

      {/* Paso 1: Datos */}
      {paso === 'datos' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Configuración */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Importación</CardTitle>
              <CardDescription>Datos generales de la importación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="origen">Origen</Label>
                  <Select value={origen} onValueChange={(v) => setOrigen(v as OrigenImportacion)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IMPORTACION">Importación</SelectItem>
                      <SelectItem value="COMPRA">Compra Local</SelectItem>
                      <SelectItem value="PRODUCCION">Producción</SelectItem>
                      <SelectItem value="DEVOLUCION">Devolución</SelectItem>
                      <SelectItem value="AJUSTE">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha de Entrada</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={fechaEntrada}
                    onChange={(e) => setFechaEntrada(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referencia">Referencia (Orden/Factura)</Label>
                  <Input
                    id="referencia"
                    placeholder="Ej: ORD-2024-001"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="garantia">Garantía (meses)</Label>
                  <Input
                    id="garantia"
                    type="number"
                    min={0}
                    value={garantiaMeses}
                    onChange={(e) => setGarantiaMeses(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Datos del Excel
              </CardTitle>
              <CardDescription>
                Pega los datos desde Excel o CSV (separados por TAB o punto y coma)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <p className="font-medium">Formato esperado:</p>
                <code className="text-xs">
                  CODIGO; SERIAL; COSTO; LOTE; NOTAS
                </code>
                <p className="mt-2 text-xs text-muted-foreground">
                  Solo CODIGO y SERIAL son obligatorios. Puedes copiar directamente desde Excel.
                </p>
              </div>

              <Textarea
                placeholder={`CEA36+\t001\t450\tLOTE-001\tNota opcional
CEA36+\t002\t450\tLOTE-001
IMP2S37RA\t003\t70`}
                className="min-h-[200px] font-mono text-sm"
                value={datosTexto}
                onChange={(e) => setDatosTexto(e.target.value)}
              />

              {erroresParseo.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                  <p className="mb-2 flex items-center gap-2 font-medium text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    Errores en los datos:
                  </p>
                  <ul className="space-y-1 text-sm text-red-600">
                    {erroresParseo.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                onClick={parsearDatos}
                disabled={!datosTexto.trim()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Procesar Datos
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Paso 2: Preview */}
      {paso === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Importación</CardTitle>
            <CardDescription>
              {filasProcesadas.length} unidades listas para importar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumen */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{filasProcesadas.length}</p>
                <p className="text-sm text-muted-foreground">Unidades</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">
                  {new Set(filasProcesadas.map(f => f.codigoProducto.toUpperCase())).size}
                </p>
                <p className="text-sm text-muted-foreground">Productos</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{origen}</p>
                <p className="text-sm text-muted-foreground">Origen</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{garantiaMeses}m</p>
                <p className="text-sm text-muted-foreground">Garantía</p>
              </div>
            </div>

            {/* Tabla de datos */}
            <div className="max-h-[400px] overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Código</th>
                    <th className="p-2 text-left">Serial</th>
                    <th className="p-2 text-right">Costo</th>
                    <th className="p-2 text-left">Lote</th>
                    <th className="p-2 text-left">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {filasProcesadas.map((fila, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2 text-muted-foreground">{index + 1}</td>
                      <td className="p-2 font-mono">{fila.codigoProducto}</td>
                      <td className="p-2 font-mono">{fila.serial}</td>
                      <td className="p-2 text-right">
                        {fila.costoUnitario ? `$${fila.costoUnitario.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-2">{fila.lote || '-'}</td>
                      <td className="p-2 text-muted-foreground">{fila.notas || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Acciones */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setPaso('datos')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button
                onClick={ejecutarImportacion}
                disabled={importarMutation.isPending}
                className="flex-1"
              >
                {importarMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Confirmar Importación
                  </>
                )}
              </Button>
            </div>

            {importarMutation.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <p className="text-red-600">
                  Error: {(importarMutation.error as any)?.response?.data?.message || 'Error desconocido'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paso 3: Resultado */}
      {paso === 'resultado' && resultado && (
        <div className="space-y-6">
          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {resultado.errores === 0 ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                )}
                Importación Completada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
                  <p className="text-3xl font-bold text-green-600">{resultado.exitosos}</p>
                  <p className="text-sm text-green-600">Exitosos</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950">
                  <p className="text-3xl font-bold text-red-600">{resultado.errores}</p>
                  <p className="text-sm text-red-600">Errores</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">{resultado.totalProcesados}</p>
                  <p className="text-sm text-muted-foreground">Total Procesados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Productos actualizados */}
          {resultado.productosActualizados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Productos Actualizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {resultado.productosActualizados.map((prod, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <span className="font-mono font-medium">{prod.codigo}</span>
                        <span className="ml-2 text-muted-foreground">{prod.nombre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">+{prod.unidadesAgregadas}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {prod.stockAnterior} → {prod.stockNuevo}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errores detallados */}
          {resultado.errores > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Errores Detallados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {resultado.detalles
                    .filter(d => d.estado === 'error')
                    .map((detalle, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-800 dark:bg-red-950">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-mono text-sm">{detalle.producto}</span>
                        <span className="font-mono text-sm">{detalle.serial}</span>
                        <span className="text-sm text-red-600">{detalle.mensaje}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acciones finales */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={reiniciar}>
              Nueva Importación
            </Button>
            <Button onClick={() => router.push('/dashboard/inventario')}>
              Ir a Inventario
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
