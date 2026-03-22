
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const handleSendLink = async (data: ForgotPasswordFormValues) => {
    setError(null);
    setSuccess(null);

    try {
      // 1. Check if user exists via Cloud Function
      const userExistsResponse = await fetch('/api/user-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      const userExistsData = await userExistsResponse.json();

      if (!userExistsResponse.ok || !userExistsData.exists) {
        setError(userExistsData.error || "No se encontró ningún usuario con esa dirección de correo electrónico.");
        return;
      }
      
      const userData = userExistsData.user;
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Send email with the code
      const emailSubject = `Restablecimiento de Contraseña`;
      const resetLink = `${window.location.origin}/reset-password?email=${encodeURIComponent(data.email)}`;
      const emailHtml = `
        <h1>Restablecimiento de Contraseña</h1>
        <p>Hola ${userData.name},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código para continuar:</p>
        <h2 style="font-size: 24px; letter-spacing: 2px; text-align: center;">${code}</h2>
        <p>Puedes restablecer tu contraseña haciendo clic en el siguiente enlace:</p>
        <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
        <p>Si no solicitaste esto, puedes ignorar este correo.</p>
      `;

      const emailResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: data.email, subject: emailSubject, html: emailHtml }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Error desconocido al enviar el correo.');
      }
      
      // Store the code temporarily - In a real app, you'd save this to Firestore with an expiry.
      // For this example, we will pass it via session/local storage for simplicity.
      sessionStorage.setItem('resetCode', code);
      sessionStorage.setItem('resetEmail', data.email);

      setSuccess(`Se ha enviado un correo de recuperación a ${data.email}. Por favor, revisa tu bandeja de entrada.`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#1c011e] via-[#3a023c] to-[#1a011d]">
      <div className="container relative z-10 mx-auto flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 bg-white/10 text-white backdrop-blur-lg">
          <form onSubmit={handleSubmit(handleSendLink)}>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Recuperar Contraseña</CardTitle>
              <CardDescription className="text-white/60">
                Introduce tu correo electrónico para recibir un código de recuperación.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              {error && (
                <Alert variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
               {success && (
                <Alert variant="default" className="bg-green-500/20 text-green-300 border-green-500/30">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Éxito</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              {!success && (
                <div className="grid gap-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        className="border-white/20 bg-white/5 placeholder:text-white/40 focus:ring-primary"
                    />
                    {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
                </div>
              )}
              {!success ? (
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-base" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : 'Enviar Correo de Recuperación'}
                </Button>
              ) : (
                <Link href="/login" passHref className="text-center text-sm text-white/70 hover:text-white hover:underline block">
                    Volver a Iniciar Sesión
                </Link>
              )}
              {success && (
                 <Link href={`/reset-password?email=${encodeURIComponent(form.getValues('email'))}`} passHref>
                    <Button variant="link" className="w-full text-center text-sm text-primary hover:underline">
                        Ir a restablecer contraseña
                    </Button>
                 </Link>
              )}
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
