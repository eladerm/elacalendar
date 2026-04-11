import { jsPDF } from 'jspdf';
import bwipjs from 'bwip-js';
import { format } from 'date-fns';
import path from 'path';
import fs from 'fs';

interface FacturaData {
  tipo: string;
  ambiente: string;
  clienteNombre: string;
  clienteIdentificacion: string;
  clienteEmail?: string;
  fecha: any;
  subtotal0: number;
  subtotal15: number;
  ivaValor: number;
  total: number;
  claveAcceso: string;
  detalles: any[];
  secuencial?: string;
}

export async function generateRidePdf(data: FacturaData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 10;
  const pageWidth = 210;
  
  // 1. LOGO (Si existe en public/logo.png)
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  if (fs.existsSync(logoPath)) {
    try {
        const logoBuffer = fs.readFileSync(logoPath);
        doc.addImage(logoBuffer, 'PNG', margin, margin, 45, 35);
    } catch (e) {
        doc.setFontSize(22);
        doc.setTextColor(200, 0, 100);
        doc.text('ELAPIEL', margin, margin + 20);
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(200, 0, 100);
    doc.text('ELAPIEL', margin, margin + 20);
  }

  const rightBoxX = 105;
  const rightBoxY = margin;
  const rightBoxWidth = 95;
  const rightBoxHeight = 85;

  doc.setDrawColor(216, 27, 96); // Color de borde primario (Magenta)
  doc.setLineWidth(0.3);
  doc.roundedRect(rightBoxX, rightBoxY, rightBoxWidth, rightBoxHeight, 4, 4);
  
  // Banner Factura
  doc.setFillColor(216, 27, 96);
  doc.roundedRect(rightBoxX, rightBoxY, rightBoxWidth, 12, 4, 4, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(`FACTURA`, rightBoxX + rightBoxWidth / 2, rightBoxY + 8, { align: 'center' });

  // Contenido SRI
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(`R.U.C.: 1725885485001`, rightBoxX + 5, rightBoxY + 18);
  doc.setFont("helvetica", "normal");
  doc.text(`No. 001-001-${data.secuencial || '000000001'}`, rightBoxX + 5, rightBoxY + 22);
  
  doc.setFont("helvetica", "bold");
  doc.text(`NÚMERO DE AUTORIZACIÓN`, rightBoxX + 5, rightBoxY + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(data.claveAcceso, rightBoxX + 5, rightBoxY + 34, { maxWidth: 85 });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`FECHA Y HORA DE AUTORIZACIÓN:`, rightBoxX + 5, rightBoxY + 42);
  doc.setFont("helvetica", "normal");
  const fechaStr = data.fecha?.toDate ? format(data.fecha.toDate(), "dd/MM/yyyy HH:mm") : format(new Date(), "dd/MM/yyyy HH:mm");
  doc.text(fechaStr, rightBoxX + 5, rightBoxY + 46);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`AMBIENTE: ${data.ambiente.toUpperCase()}`, rightBoxX + 5, rightBoxY + 54);
  doc.text(`EMISIÓN: NORMAL`, rightBoxX + 5, rightBoxY + 60);

  doc.text(`CLAVE DE ACCESO:`, rightBoxX + 5, rightBoxY + 68);
  
  // GENERAR CÓDIGO DE BARRAS
  try {
      const barcodeBuffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: data.claveAcceso,
          scale: 3,
          height: 10,
          includetext: false,
      });
      doc.addImage(barcodeBuffer, 'PNG', rightBoxX + 5, rightBoxY + 70, 85, 12);
  } catch (err) {
      console.error('Barcode error', err);
  }

  // 3. RECUADRO IZQUIERDO (INFO EMISOR)
  const leftBoxY = 48;
  const leftBoxWidth = 90;
  const leftBoxHeight = 45;
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, leftBoxY, leftBoxWidth, leftBoxHeight, 2, 2);
  
  doc.setFontSize(10);
  doc.setTextColor(216, 27, 96);
  doc.setFont("helvetica", "bold");
  doc.text('ESTEFANY BUCHELI', margin + 3, leftBoxY + 6);
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.text('ELAPIEL CENTRO ESTÉTICO', margin + 3, leftBoxY + 12);
  doc.setFont("helvetica", "bold");
  doc.text('Dirección Matriz:', margin + 3, leftBoxY + 20);
  doc.setFont("helvetica", "normal");
  doc.text('RIO COCA Y AVENIDA AMAZONAS', margin + 3, leftBoxY + 24, { maxWidth: 80 });
  
  doc.setFont("helvetica", "bold");
  doc.text('OBLIGADO A LLEVAR CONTABILIDAD: NO', margin + 3, leftBoxY + 36);

  // 4. INFO COMPRADOR
  const compBoxY = 100;
  const compBoxHeight = 25;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, compBoxY, pageWidth - (margin * 2), compBoxHeight, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(216, 27, 96);
  doc.setFont("helvetica", "bold");
  doc.text(`Razón Social / Nombres:`, margin + 5, compBoxY + 7);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.text(data.clienteNombre.toUpperCase(), margin + 50, compBoxY + 7);
  
  doc.setTextColor(216, 27, 96);
  doc.setFont("helvetica", "bold");
  doc.text(`Identificación:`, margin + 140, compBoxY + 7);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.text(data.clienteIdentificacion, margin + 165, compBoxY + 7);

  doc.setTextColor(216, 27, 96);
  doc.setFont("helvetica", "bold");
  doc.text(`Fecha Emisión:`, margin + 5, compBoxY + 15);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(), "dd/MM/yyyy"), margin + 30, compBoxY + 15);

  // 5. TABLA DE DETALLES
  const tableY = 130;
  const colWidths = [20, 15, 80, 30, 20, 25];
  const colNames = ['Cod.', 'Cant', 'Descripción', 'Detalle', 'P. Unitario', 'P. Total'];
  
  doc.setLineWidth(0.1);
  doc.setFillColor(216, 27, 96);
  doc.rect(margin, tableY, pageWidth - (margin * 2), 8, 'F');

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  let curX = margin;
  colNames.forEach((name, i) => {
    doc.text(name, curX + 2, tableY + 5.5);
    curX += colWidths[i];
  });

  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  let curY = tableY + 8;
  data.detalles.forEach((d: any, i: number) => {
    // Zebra striping
    if (i % 2 === 0) {
      doc.setFillColor(249, 249, 249);
      doc.rect(margin, curY, pageWidth - (margin * 2), 8, 'F');
    }
    
    doc.setDrawColor(230, 230, 230);
    doc.rect(margin, curY, pageWidth - (margin * 2), 8, 'D');
    
    let cellX = margin;
    doc.text(`P-${i+1}`, cellX + 2, curY + 5);
    cellX += colWidths[0];
    doc.text(d.cantidad.toString(), cellX + 2, curY + 5);
    cellX += colWidths[1];
    doc.text(d.descripcion.substring(0, 45), cellX + 2, curY + 5);
    cellX += colWidths[2];
    doc.text('-', cellX + 2, curY + 5);
    cellX += colWidths[3];
    doc.text(Number(d.precioUnitario).toFixed(2), cellX + 2, curY + 5);
    cellX += colWidths[4];
    doc.text((d.cantidad * d.precioUnitario).toFixed(2), cellX + 2, curY + 5);
    
    curY += 8;
  });

  // 6. TOTALES
  const totalsY = curY + 10;
  const totalsX = 140;
  const totalsWidth = 60;
  
  const totals = [
    ['SUBTOTAL 15%', data.subtotal15],
    ['SUBTOTAL 0%', data.subtotal0],
    ['SUBTOTAL No objeto de IVA', 0],
    ['SUBTOTAL Exento de IVA', 0],
    ['SUBTOTAL SIN IMPUESTOS', data.subtotal0 + data.subtotal15],
    ['TOTAL Descuento', 0],
    ['ICE', 0],
    ['IVA 15%', data.ivaValor],
    ['IRBPNR', 0],
    ['PROPINA', 0],
    ['VALOR TOTAL', data.total]
  ];

  totals.forEach((row, i) => {
    const isFinalTotal = i === totals.length - 1;
    
    if (isFinalTotal) {
      doc.setFillColor(216, 27, 96);
      doc.rect(totalsX, totalsY + (i * 6), totalsWidth, 6, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.rect(totalsX, totalsY + (i * 6), totalsWidth, 6, 'D');
      doc.setTextColor(0, 0, 0);
    }
    
    doc.setFont("helvetica", "bold");
    doc.text(row[0] as string, totalsX + 2, totalsY + (i * 6) + 4.5);
    if (!isFinalTotal) doc.setFont("helvetica", "normal");
    doc.text(Number(row[1]).toFixed(2), totalsX + totalsWidth - 2, totalsY + (i * 6) + 4.5, { align: 'right' });
  });

  // 7. INFORMACIÓN ADICIONAL
  const infoBoxY = totalsY;
  const infoBoxWidth = 80;
  const infoBoxHeight = 35;
  doc.roundedRect(margin, infoBoxY, infoBoxWidth, infoBoxHeight, 2, 2);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('Información Adicional', margin + 3, infoBoxY + 6);
  doc.setFont("helvetica", "normal");
  doc.text(`Email: ${data.clienteEmail || '-'}`, margin + 3, infoBoxY + 12);
  doc.text(`Dirección: -`, margin + 3, infoBoxY + 18);
  doc.text(`Teléfono: -`, margin + 3, infoBoxY + 24);

  return Buffer.from(doc.output('arraybuffer'));
}
