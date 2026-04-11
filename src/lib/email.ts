import nodemailer from 'nodemailer';

interface EmailData {
  destinatario: string;
  clienteNombre: string;
  claveAcceso: string;
  total: number;
  xmlContent: string;
  pdfBuffer?: Buffer;
}

export async function sendSriEmail(data: EmailData) {
  const { destinatario, clienteNombre, claveAcceso, total, xmlContent, pdfBuffer } = data;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const xmlFilename = `factura_${claveAcceso.substring(0, 10)}.xml`;
  const pdfFilename = `factura_${claveAcceso.substring(0, 10)}.pdf`;

  const attachments: any[] = [
    {
      filename: xmlFilename,
      content: xmlContent,
      contentType: 'text/xml',
    }
  ];

  if (pdfBuffer) {
    attachments.push({
      filename: pdfFilename,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return await transporter.sendMail({
    from: `"Elapiel Facturación" <${process.env.GMAIL_EMAIL}>`,
    to: destinatario,
    subject: `Factura Electrónica SRI - ${clienteNombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #d81b60, #ad1457); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ÉLAPIEL</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Factura Electrónica Autorizada por el SRI</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #374151;">Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p style="color: #6b7280;">Adjuntamos su comprobante electrónico (XML y PDF) autorizado por el Servicio de Rentas Internas del Ecuador.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <div style="margin-bottom: 8px;">
              <span style="color: #6b7280; font-size: 14px;">Clave de Acceso:</span>
            </div>
            <code style="font-size: 11px; color: #1f2937; word-break: break-all; background: #e5e7eb; padding: 8px; border-radius: 4px; display: block;">${claveAcceso}</code>
            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #6b7280; font-size: 14px;">Total Facturado:</span>
              <strong style="color: #d81b60; font-size: 20px;">$${Number(total).toFixed(2)}</strong>
            </div>
          </div>
          <p style="color: #6b7280; font-size: 13px;">Este correo contiene su comprobante legal para respaldo tributario.</p>
        </div>
      </div>
    `,
    attachments,
  });
}
