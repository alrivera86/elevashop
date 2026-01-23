import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './utils';

export interface VentaPDF {
  id: number;
  numero?: string;
  fecha: string;
  tipoVenta?: 'VENTA' | 'CONSIGNACION';
  estadoPago?: string;
  cliente: {
    nombre: string;
    telefono?: string;
    email?: string;
    direccion?: string;
  };
  detalles: {
    producto: { codigo: string; nombre: string };
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    subtotal: number;
    serial?: string;
  }[];
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  pagos: {
    metodoPago: string;
    monto: number;
    moneda: string;
  }[];
  notas?: string;
}

const METODO_PAGO_LABELS: Record<string, string> = {
  EFECTIVO_USD: 'Efectivo USD',
  EFECTIVO_BS: 'Efectivo Bs',
  ZELLE: 'Zelle',
  BANESCO: 'Banesco',
  TRANSFERENCIA_BS: 'Transferencia Bs',
  TRANSFERENCIA_USD: 'Transferencia USD',
  PAGO_MOVIL: 'Pago Móvil',
  BINANCE: 'Binance',
  MIXTO: 'Mixto',
};

export function generarOrdenSalida(venta: VentaPDF): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const esConsignacion = venta.tipoVenta === 'CONSIGNACION';

  // Header - Color diferente para consignación
  if (esConsignacion) {
    doc.setFillColor(234, 88, 12); // Orange for consignacion
  } else {
    doc.setFillColor(59, 130, 246); // Blue for venta
  }
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');

  // Título centrado - Diferente para consignación
  if (esConsignacion) {
    doc.text('NOTA DE CONSIGNACIÓN', pageWidth / 2, 14, { align: 'center' });
  } else {
    doc.text('ORDEN DE SALIDA', pageWidth / 2, 14, { align: 'center' });
  }
  doc.setFontSize(12);
  doc.text(`#${venta.numero || venta.id}`, pageWidth / 2, 22, { align: 'center' });

  // Reset color
  doc.setTextColor(0, 0, 0);

  // Información de venta y cliente
  const yStart = 38;

  // Columna izquierda - Info Venta
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Información de Venta', 14, yStart);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const fechaFormateada = new Date(venta.fecha).toLocaleString('es-VE', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  doc.text(`Fecha: ${fechaFormateada}`, 14, yStart + 7);
  doc.text(`N° Orden: ${venta.numero || venta.id}`, 14, yStart + 13);

  // Columna derecha - Info Cliente
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente', pageWidth / 2, yStart);

  doc.setFont('helvetica', 'normal');
  doc.text(venta.cliente.nombre, pageWidth / 2, yStart + 7);
  if (venta.cliente.telefono) {
    doc.text(`Tel: ${venta.cliente.telefono}`, pageWidth / 2, yStart + 13);
  }
  if (venta.cliente.email) {
    doc.text(venta.cliente.email, pageWidth / 2, yStart + 19);
  }
  if (venta.cliente.direccion) {
    doc.text(venta.cliente.direccion, pageWidth / 2, yStart + 25, { maxWidth: 80 });
  }

  // Tabla de productos
  const tableStartY = yStart + 35;

  const tableData = venta.detalles.map((d) => [
    d.producto.codigo,
    d.producto.nombre + (d.serial ? `\n(S/N: ${d.serial})` : ''),
    d.cantidad.toString(),
    formatCurrency(d.precioUnitario),
    d.descuento > 0 ? formatCurrency(d.descuento) : '-',
    formatCurrency(d.subtotal),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Código', 'Producto', 'Cant.', 'P. Unit.', 'Desc.', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Resumen de totales
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Box de totales
  const boxX = pageWidth - 90;
  const boxWidth = 76;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);

  let currentY = finalY;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal:', boxX, currentY);
  doc.text(formatCurrency(venta.subtotal), boxX + boxWidth, currentY, { align: 'right' });
  currentY += 6;

  // Descuento
  if (venta.descuento > 0) {
    doc.setTextColor(220, 38, 38); // Red
    doc.text('Descuento:', boxX, currentY);
    doc.text(`-${formatCurrency(venta.descuento)}`, boxX + boxWidth, currentY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    currentY += 6;
  }

  // IVA
  if (venta.impuesto > 0) {
    doc.text('IVA (16%):', boxX, currentY);
    doc.text(formatCurrency(venta.impuesto), boxX + boxWidth, currentY, { align: 'right' });
    currentY += 6;
  }

  // Línea separadora
  doc.line(boxX, currentY, boxX + boxWidth, currentY);
  currentY += 5;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', boxX, currentY);
  doc.setTextColor(22, 163, 74); // Green
  doc.text(formatCurrency(venta.total), boxX + boxWidth, currentY, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Método de pago o estado de consignación
  currentY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (esConsignacion) {
    // Mostrar aviso de consignación
    doc.setTextColor(234, 88, 12); // Orange
    doc.setFont('helvetica', 'bold');
    doc.text('MERCANCÍA EN CONSIGNACIÓN', boxX, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Pendiente de pago', boxX, currentY);
    doc.setTextColor(0, 0, 0);
  } else {
    const metodoPago = venta.pagos.map(p => METODO_PAGO_LABELS[p.metodoPago] || p.metodoPago).join(', ');
    doc.text(`Método de pago: ${metodoPago || 'No especificado'}`, boxX, currentY);
  }

  // Notas (si hay)
  if (venta.notas) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Notas:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(venta.notas, 14, finalY + 5, { maxWidth: 80 });
  }

  // Aviso grande para consignación
  if (esConsignacion) {
    const avisoY = finalY + (venta.notas ? 20 : 0);
    doc.setDrawColor(234, 88, 12);
    doc.setFillColor(255, 247, 237); // Light orange background
    doc.roundedRect(14, avisoY, pageWidth - 28, 20, 3, 3, 'FD');

    doc.setTextColor(234, 88, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('MATERIAL EN CONSIGNACIÓN - NO ES UNA VENTA', pageWidth / 2, avisoY + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Este material debe ser pagado o devuelto según acuerdo previo', pageWidth / 2, avisoY + 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  if (esConsignacion) {
    doc.text('Material entregado en consignación', pageWidth / 2, footerY, { align: 'center' });
  } else {
    doc.text('Gracias por su preferencia', pageWidth / 2, footerY, { align: 'center' });
  }

  // Descargar PDF
  const prefix = esConsignacion ? 'consignacion' : 'orden_salida';
  const fileName = `${prefix}_${venta.numero || venta.id}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
