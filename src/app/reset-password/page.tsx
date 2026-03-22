
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const resetPasswordSchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos.'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
        setEmail(emailFromQuery);
    } else {
        // Fallback to session storage if query param is missing
        const sessionEmail = sessionStorage.getItem('resetEmail');
        if (sessionEmail) {
            setEmail(sessionEmail);
        } else {
            setError("No se proporcionó un correo electrónico. Por favor, inicia el proceso de nuevo.");
        }
    }
  }, [searchParams]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const handleResetPassword = async (data: ResetPasswordFormValues) => {
    setError(null);
    setSuccess(null);
    
    const storedCode = sessionStorage.getItem('resetCode');
    const storedEmail = sessionStorage.getItem('resetEmail');

    if (!storedCode || !storedEmail || storedEmail !== email) {
        setError("La sesión de recuperación ha expirado o no es válida. Por favor, inténtalo de nuevo.");
        return;
    }

    if (data.code !== storedCode) {
        setError("El código de verificación es incorrecto.");
        return;
    }

    try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setError("No se pudo encontrar el usuario para actualizar. Contacta a soporte.");
            return;
        }

        const userDocRef = doc(db, 'users', querySnapshot.docs[0].id);
        await updateDoc(userDocRef, {
            password: data.password
        });
        
        // Clear session storage after successful reset
        sessionStorage.removeItem('resetCode');
        sessionStorage.removeItem('resetEmail');

        setSuccess("¡Tu contraseña ha sido restablecida con éxito! Ahora puedes iniciar sesión.");

    } catch (err: any) {
        console.error(err);
        setError(err.message || 'Ocurrió un error inesperado al actualizar tu contraseña.');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#1c011e] via-[#3a023c] to-[#1a011d]">
      <div className="container relative z-10 mx-auto flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 bg-white/10 text-white backdrop-blur-lg">
          <form onSubmit={handleSubmit(handleResetPassword)}>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Restablecer Contraseña</CardTitle>
              <CardDescription className="text-white/60">
                Introduce el código de tu correo y tu nueva contraseña.
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
                  <>
                    <div className="grid gap-2">
                        <Label htmlFor="code">Código de Verificación</Label>
                        <Input
                            id="code"
                            type="text"
                            {...register('code')}
                            className="border-white/20 bg-white/5 placeholder:text-white/40 focus:ring-primary"
                        />
                        {errors.code && <p className="text-sm text-red-400">{errors.code.message}</p>}
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="password">Nueva Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            {...register('password')}
                            className="border-white/20 bg-white/5 placeholder:text-white/40 focus:ring-primary"
                        />
                        {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            {...register('confirmPassword')}
                            className="border-white/20 bg-white/5 placeholder:text-white/40 focus:ring-primary"
                        />
                        {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>}
                    </div>
                  </>
              )}
              {!success ? (
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-base" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Restableciendo...</> : 'Restablecer Contraseña'}
                </Button>
              ) : (
                <Link href="/login" passHref>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-base">
                    Ir a Iniciar Sesión
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ResetPasswordComponent />
        </Suspense>
    )
}
