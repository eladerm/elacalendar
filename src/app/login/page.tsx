
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
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const loginSchema = z.object({
  identifier: z.string().min(1, 'El campo es requerido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string>('');
  const router = useRouter();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * PlaceHolderImages.length);
    setBgImage(PlaceHolderImages[randomIndex].imageUrl);
  }, []);

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
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-black/40 backdrop-brightness-75" />

      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none overflow-hidden">
        <video ref={videoRef} muted playsInline width="640" height="480" />
        <canvas ref={canvasRef} width="400" height="300" />
      </div>

      <div className="container relative z-10 mx-auto px-4 h-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          
          <div className="hidden lg:flex flex-col space-y-4 text-white animate-in fade-in slide-in-from-left-8 duration-700 items-start justify-center drop-shadow-2xl">
            <img src="/logo-transparent.png" alt="ÉLAPIEL" className="w-[450px] max-w-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]" />
          </div>

          <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-700">
            <Card className="w-full max-w-md border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white overflow-hidden">
              <form onSubmit={handleSubmit(handleLogin)} className="p-8 space-y-8">
                <div className="text-center space-y-2">
                  <CardTitle className="text-3xl font-black uppercase tracking-tight">Ingrese al sistema</CardTitle>
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-500/20 text-red-200 border-red-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-bold text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="font-bold uppercase text-[10px] tracking-widest text-white/70 ml-1">ID Trabajador / Usuario</Label>
                    <Input 
                      id="identifier" 
                      type="text" 
                      {...register('identifier')} 
                      placeholder="Ej. 1001" 
                      className="border-white/10 bg-black/30 placeholder:text-white/20 focus:ring-[#eb2f96] h-12 font-bold text-lg" 
                    />
                    {errors.identifier && <p className="text-[10px] text-red-300 font-bold uppercase ml-1">{errors.identifier.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-bold uppercase text-[10px] tracking-widest text-white/70 ml-1">Contraseña</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      {...register('password')} 
                      placeholder="••••••••" 
                      className="border-white/10 bg-black/30 placeholder:text-white/20 focus:ring-[#eb2f96] h-12 font-bold text-lg" 
                    />
                    {errors.password && <p className="text-[10px] text-red-300 font-bold uppercase ml-1">{errors.password.message}</p>}
                    
                    <div className="text-right">
                      <Link href="/forgot-password" disable-ai-hint className="text-[10px] text-white/50 hover:text-white transition-colors font-bold uppercase hover:underline">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-[#eb2f96] hover:bg-[#d42a88] text-white font-black uppercase tracking-[0.2em] py-7 text-sm shadow-2xl transition-all active:scale-[0.98]" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : 'Entrar al Sistema'}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
