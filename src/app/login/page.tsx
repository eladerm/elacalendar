
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const loginSchema = z.object({
  identifier: z.string().min(1, 'El campo es requerido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState('');
  const router = useRouter();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const landscapes = PlaceHolderImages.filter(img => img.id.startsWith('landscape-'));
    if (landscapes.length > 0) {
      const randomImg = landscapes[Math.floor(Math.random() * landscapes.length)];
      setBgImage(randomImg.imageUrl);
    }
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const captureInstantPhoto = async (): Promise<string | null> => {
    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) return null;
      
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: "user" 
        } 
      });
      
      if (!videoRef.current || !canvasRef.current) return null;

      videoRef.current.srcObject = stream;
      
      await new Promise((resolve) => {
        if (!videoRef.current) return resolve(false);
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => resolve(true)).catch(() => resolve(false));
        };
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const context = canvasRef.current.getContext('2d');
      if (context && videoRef.current && videoRef.current.readyState >= 2) {
        canvasRef.current.width = 400;
        canvasRef.current.height = 300;
        context.drawImage(videoRef.current, 0, 0, 400, 300);
        return canvasRef.current.toDataURL('image/jpeg', 0.5);
      }
      return null;
    } catch (err) {
      console.error('Error capturando evidencia:', err);
      return null;
    } finally {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const handleLogin = async (data: LoginFormValues) => {
    setError(null);
    const photoPromise = captureInstantPhoto();
    
    try {
      const user = await login(data.identifier, data.password);
      const photo = await photoPromise;
      
      if (user) {
        await addDoc(collection(db, 'activity_log'), {
          userId: user.id,
          userName: user.name,
          action: `Inicio de sesión exitoso.`,
          timestamp: Timestamp.now(),
          loginPhoto: photo || null
        });
        router.push('/');
      } else {
        await addDoc(collection(db, 'activity_log'), {
          userId: 'ACCESO_DENEGADO',
          userName: `INTENTO: ${data.identifier.toUpperCase()}`,
          action: `Intento fallido: Clave o usuario incorrecto para "${data.identifier}".`,
          timestamp: Timestamp.now(),
          loginPhoto: photo || null
        });
        setError('Credenciales incorrectas. Verifique sus datos.');
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error inesperado.');
    }
  };

  return (
    <div 
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden transition-all duration-1000 bg-cover bg-center"
      style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none', backgroundColor: '#1c011e' }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none overflow-hidden">
        <video ref={videoRef} muted playsInline width="640" height="480" />
        <canvas ref={canvasRef} width="400" height="300" />
      </div>

      <div className="container relative z-10 mx-auto flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 bg-white/10 text-white backdrop-blur-xl shadow-2xl border-white/20">
          <form onSubmit={handleSubmit(handleLogin)}>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Ingrese al sistema</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              {error && (
                <Alert variant="destructive" className="bg-red-500/20 text-red-200 border-red-500/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-bold">Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="identifier" className="font-bold uppercase text-[10px] tracking-widest text-white/80">ID Trabajador / Usuario</Label>
                <Input id="identifier" type="text" {...register('identifier')} placeholder="Ej. 1001" className="border-white/20 bg-black/20 placeholder:text-white/30 focus:ring-primary h-11 font-bold" />
                {errors.identifier && <p className="text-xs text-red-300 font-bold">{errors.identifier.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" title="password" className="font-bold uppercase text-[10px] tracking-widest text-white/80">Contraseña</Label>
                <Input id="password" type="password" {...register('password')} placeholder="••••••••" className="border-white/20 bg-black/20 placeholder:text-white/30 focus:ring-primary h-11 font-bold" />
                {errors.password && <p className="text-xs text-red-300 font-bold">{errors.password.message}</p>}
              </div>
               <div className="text-right -mt-4">
                  <Link href="/forgot-password" passHref className="text-xs text-white/60 hover:text-white hover:underline transition-colors">¿Olvidaste tu contraseña?</Link>
              </div>
               <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest py-6 text-sm shadow-xl shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : 'Entrar al Sistema'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
