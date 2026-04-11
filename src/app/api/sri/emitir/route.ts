import { NextResponse } from 'next/server';
import { generateInvoice, generateInvoiceXml, signXml, documentReception } from "open-factura";
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendSriEmail } from '@/lib/email';


export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { tipo, clienteId, clienteNombre, clienteIdentificacion, clienteEmail, detalles, subtotal0, subtotal15, ivaValor, total } = data;

    const rucEmisor = process.env.SRI_RUC || "1725885485001";
    const razonSocialEmisor = "ESTEFANY BUCHELI";
    const direccionMatriz = "RIO COCA Y AVENIDA AMAZONAS";
    const ambiente = "1"; // 1 = Pruebas, 2 = Produccion
    const tipoEmision = "1";
    const obligadoContabilidad = "NO";

    const signaturePassword = process.env.SRI_P12_PASSWORD || "Made18093025";

    const p12Path = path.join(process.cwd(), 'firma.p12');
    if (!fs.existsSync(p12Path)) {
      return NextResponse.json({ success: false, error: 'Para hacer pruebas, pega tu archivo firma.p12 en la carpeta raíz del proyecto.' }, { status: 400 });
    }
    const fileBuffer = fs.readFileSync(p12Path);
    const signatureBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);

    const invoiceDetalles = detalles.map((d: any, index: number) => ({
      codigoPrincipal: `PROD-${index + 1}`,
      codigoAuxiliar: `AUX-${index + 1}`,
      descripcion: d.descripcion || 'Servicio General',
      cantidad: d.cantidad.toString(),
      precioUnitario: Number(d.precioUnitario).toFixed(2),
      descuento: "0.00",
      precioTotalSinImpuesto: (d.cantidad * d.precioUnitario).toFixed(2),
      impuestos: {
        impuesto: [
          {
            codigo: "2",
            codigoPorcentaje: d.iva ? "4" : "0",
            tarifa: d.iva ? "15" : "0",
            baseImponible: (d.cantidad * d.precioUnitario).toFixed(2),
            valor: d.iva ? (d.cantidad * d.precioUnitario * 0.15).toFixed(2) : "0.00"
          }
        ]
      }
    }));

    let tipoId: "05" | "04" | "07" | "06" | "08" = "05";
    if (clienteIdentificacion.length === 13 && clienteIdentificacion !== "9999999999999") tipoId = "04";
    if (clienteIdentificacion === "9999999999999") tipoId = "07";

    const totalImpuesto: any[] = [];
    if (subtotal15 > 0) {
      totalImpuesto.push({ codigo: "2", codigoPorcentaje: "4", descuentoAdicional: "0.00", baseImponible: subtotal15.toFixed(2), valor: ivaValor.toFixed(2) });
    }
    if (subtotal0 > 0) {
      totalImpuesto.push({ codigo: "2", codigoPorcentaje: "0", descuentoAdicional: "0.00", baseImponible: subtotal0.toFixed(2), valor: "0.00" });
    }
    if (totalImpuesto.length === 0) {
      totalImpuesto.push({ codigo: "2", codigoPorcentaje: "0", descuentoAdicional: "0.00", baseImponible: "0.00", valor: "0.00" });
    }

    try {
      const secuencial = Math.floor(100000000 + Math.random() * 900000000).toString().substring(0, 9);

      const generateArgs: any = {
        infoTributaria: {
          ambiente,
          tipoEmision,
          razonSocial: razonSocialEmisor,
          nombreComercial: razonSocialEmisor,
          ruc: rucEmisor,
          codDoc: "01",
          estab: "001",
          ptoEmi: "001",
          secuencial,
          dirMatriz: direccionMatriz
        },
        infoFactura: {
          fechaEmision: format(new Date(), 'dd/MM/yyyy'),
          dirEstablecimiento: direccionMatriz,
          obligadoContabilidad,
          tipoIdentificacionComprador: tipoId,
          razonSocialComprador: clienteNombre,
          identificacionComprador: clienteIdentificacion,
          totalSinImpuestos: (subtotal0 + subtotal15).toFixed(2),
          totalDescuento: "0.00",
          totalConImpuestos: { totalImpuesto },
          propina: "0.00",
          importeTotal: total.toFixed(2),
          moneda: "DOLAR",
          pagos: {
            pago: [{ formaPago: "01", total: total.toFixed(2), plazo: "0", unidadTiempo: "dias" }]
          }
        },
        detalles: { detalle: invoiceDetalles }
      };

      const { invoice, accessKey } = generateInvoice(generateArgs);
      const invoiceXml = generateInvoiceXml(invoice);
      const signedInvoice = await signXml(signatureBuffer, signaturePassword, invoiceXml);

      const SRI_RECEPTION_URL = ambiente === "1"
        ? "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl"
        : "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl";

      const receptionResult = await documentReception(signedInvoice, SRI_RECEPTION_URL);

      // --- GENERAR PDF RIDE ---
      let pdfBuffer: Buffer | undefined;
      try {
        const { generateRidePdf } = await import('@/lib/sri-pdf');
        pdfBuffer = await generateRidePdf({
          tipo: tipo || '01',
          ambiente: ambiente === "1" ? "pruebas" : "produccion",
          clienteNombre,
          clienteIdentificacion,
          clienteEmail,
          fecha: new Date(),
          subtotal0,
          subtotal15,
          ivaValor,
          total,
          claveAcceso: accessKey,
          detalles,
          secuencial
        });
      } catch (pdfErr) {
        console.error("Error generando PDF RIDE", pdfErr);
      }

      // --- ENVIAR EMAIL AUTOMÁTICO ---
      if (clienteEmail && clienteEmail.includes('@')) {
        try {
          const { sendSriEmail } = await import('@/lib/email');
          await sendSriEmail({
            destinatario: clienteEmail,
            clienteNombre,
            claveAcceso: accessKey,
            total,
            xmlContent: signedInvoice,
            pdfBuffer
          });
        } catch (emailErr) {
          console.error("Error enviando email automático", emailErr);
        }
      }

      // --- GUARDAR EN FIRESTORE (Web SDK) ---
      const facturaDoc = await addDoc(collection(db, 'facturas'), {
        tipo: tipo || 'electronica',
        ambiente: ambiente === "1" ? "pruebas" : "produccion",
        estado: 'enviada',
        clienteId: clienteId || null,
        clienteNombre,
        clienteIdentificacion,
        clienteEmail: clienteEmail || null,
        detalles,
        subtotal0,
        subtotal15,
        ivaValor,
        total,
        claveAcceso: accessKey,
        secuencial,
        xmlFirmado: signedInvoice,
        sriReception: receptionResult ? JSON.stringify(receptionResult) : null,
        fecha: serverTimestamp(),
      });

      // --- ENVIAR CORREO AL CLIENTE (NO BLOQUEANTE) ---
      if (clienteEmail && pdfBuffer) {
        // Envolvemos en una IIFE o try/catch asíncrono para que no bloquee el retorno rápido al cliente.
        (async () => {
          try {
            await sendSriEmail({
              destinatario: clienteEmail,
              clienteNombre,
              claveAcceso: accessKey,
              total,
              xmlContent: signedInvoice,
              pdfBuffer
            });
            console.log(`Correo SRI enviado correctamente a ${clienteEmail}`);
          } catch (emailErr) {
            console.error('Fallo al enviar correo de la factura:', emailErr);
          }
        })();
      }

      return NextResponse.json({
        success: true,
        facturaId: facturaDoc.id,
        claveAcceso: accessKey,
        status: 'enviada',
        xmlContent: signedInvoice,
        pdfContent: pdfBuffer ? pdfBuffer.toString('base64') : null,
        sriReception: receptionResult
      });

    } catch (sriError: any) {
      console.error("Generación SRI Falló", sriError);
      return NextResponse.json({ success: false, error: "El SRI rechazó el comprobante / Fallo en firma: " + sriError.message }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error en API Emitir", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
