
import {NextRequest, NextResponse} from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    const {to, subject, html} = await req.json();

    const gmailEmail = process.env.GMAIL_EMAIL;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;


    if (!gmailEmail || !gmailAppPassword) {
        console.error('Missing Gmail credentials in environment variables.');
        return NextResponse.json({error: 'Server configuration error: Missing email credentials.'}, {status: 500});
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: gmailEmail,
                pass: gmailAppPassword,
            },
        });

        const mailOptions = {
            from: `"Mi Calendario" <${gmailEmail}>`,
            to: to,
            subject: subject,
            html: html,
        };

        await transporter.sendMail(mailOptions);
        
        return NextResponse.json({message: 'Email sent successfully'}, {status: 200});

    } catch (error: any) {
        console.error('Failed to send email:', error);
        return NextResponse.json({error: `Failed to send email: ${error.message}`}, {status: 500});
    }
}
