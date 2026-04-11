import { NextResponse } from 'next/server';
import { sendSriEmail } from '@/lib/email';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { destinatario, facturaId, xmlContent } = await req.json();

    if (!destinatario) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos: destinatario' }, { status: 400 });
    }

    let finalXml = xmlContent;
    let facturaData: any = null;

    // Si tenemos facturaId, recuperamos datos para generar el PDF
    if (facturaId) {
      const docSnap = await getDoc(doc(db, 'facturas', facturaId));
      if (docSnap.exists()) {
        facturaData = docSnap.data();
        if (!finalXml) finalXml = facturaData.xmlFirmado;
      }
    }

    if (!finalXml) {
       return NextResponse.json({ success: false, error: 'No se encontró contenido XML para enviar' }, { status: 400 });
    }

    let pdfBuffer: Buffer | undefined;
    if (facturaData) {
      try {
        const { generateRidePdf } = await import('@/lib/sri-pdf');
        pdfBuffer = await generateRidePdf({
          ...facturaData,
          fecha: facturaData.fecha?.toDate ? facturaData.fecha.toDate() : new Date()
        });
      } catch (pdfErr) {
        console.error("Error generando PDF para email manual", pdfErr);
      }
    }

    await sendSriEmail({
      destinatario,
      clienteNombre: facturaData?.clienteNombre || 'Cliente',
      claveAcceso: facturaData?.claveAcceso || 'SRI-COMPROBANTE',
      total: facturaData?.total || 0,
      xmlContent: finalXml,
      pdfBuffer
    });

    return NextResponse.json({ success: true, message: `Email enviado a ${destinatario}` });
  } catch (error: any) {
    console.error('Error enviando email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
