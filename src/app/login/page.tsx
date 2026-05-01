"use client";

import { useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  identifier: z.string().min(1, 'El usuario es requerido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pick a random wallpaper on each page load
  const BG_IMAGES = ['/login_bg_1.png', '/login_bg_2.png', '/login_bg_3.png'];
  const randomBg = useMemo(() => BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)], []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const captureInstantPhoto = async (): Promise<string | null> => {
    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) return null;
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } });
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
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
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
          userId: user.id, userName: user.name, action: `Inicio de sesión exitoso.`, timestamp: Timestamp.now(), loginPhoto: photo || null
        });
        router.push('/');
      } else {
        await addDoc(collection(db, 'activity_log'), {
          userId: 'ACCESO_DENEGADO', userName: `INTENTO: ${data.identifier.toUpperCase()}`, action: `Intento fallido: Clave o usuario incorrecto para "${data.identifier}".`, timestamp: Timestamp.now(), loginPhoto: photo || null
        });
        setError('Credenciales incorrectas. Verifique sus datos.');
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error inesperado.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden bg-black">
      {/* Premium Background — fades in smoothly */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-[1.04] animate-in fade-in duration-1000"
        style={{ backgroundImage: `url(${randomBg})` }}
      />
      
      {/* Multi-layer luxury overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
      {/* Subtle vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />

      {/* Hidden Cam Canvas */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        <video ref={videoRef} muted playsInline width="640" height="480" />
        <canvas ref={canvasRef} width="400" height="300" />
      </div>

      <div className="container relative z-10 mx-auto px-6 h-full flex items-center min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 w-full items-center">
          
          {/* Left Side: Branding */}
          <div className="hidden lg:flex flex-col space-y-8 text-white animate-in fade-in slide-in-from-left-12 duration-1000 items-start justify-center">
            <div className="space-y-4">
              <div className="w-12 h-[2px] bg-white/40 rounded-full" />
              <h1 className="text-7xl xl:text-8xl font-extralight tracking-[0.3em] text-white drop-shadow-2xl leading-none">
                ÉLAPIEL<span className="text-white/30">.</span>
              </h1>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-light tracking-[0.25em] text-white/70 uppercase">Centro Estético</h2>
              <p className="text-white/40 text-xs font-medium tracking-[0.2em] uppercase">Sistema de Gestión Integral</p>
            </div>
            {/* Decorative line */}
            <div className="flex items-center gap-4 pt-4">
              <div className="w-8 h-[1px] bg-white/20" />
              <p className="text-white/25 text-[10px] tracking-[0.3em] uppercase">Est. 2021</p>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-12 duration-1000">
            <div className="w-full max-w-[420px] relative">
              
              {/* Luxury Glass Card */}
              <div className="absolute inset-0 rounded-[2rem] bg-white/[0.06] backdrop-blur-[40px] border border-white/[0.12] shadow-[0_40px_80px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]" />
              
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/[0.07] via-transparent to-transparent pointer-events-none" />
              
              <div className="relative p-10 sm:p-12">
                <form onSubmit={handleSubmit(handleLogin)} className="space-y-8">
                  
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="w-8 h-[1px] bg-white/30 mb-4" />
                    <h1 className="text-3xl font-extralight tracking-[0.15em] text-white">Bienvenido</h1>
                    <p className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">Ingrese sus credenciales de acceso</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-2xl backdrop-blur-md">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <p className="text-xs font-medium uppercase tracking-wider">{error}</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Usuario */}
                    <div className="space-y-2 group">
                      <label htmlFor="identifier" className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35 group-focus-within:text-white/70 transition-colors block">
                        Usuario o ID
                      </label>
                      <div className="relative">
                        <Input 
                          id="identifier" 
                          type="text" 
                          {...register('identifier')} 
                          placeholder="Ej. administrador" 
                          className="w-full bg-white/[0.07] border border-white/[0.12] rounded-2xl px-5 h-13 text-sm font-light text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:ring-offset-0 focus:border-white/50 focus:bg-white/[0.10] transition-all shadow-none backdrop-blur-sm" 
                        />
                      </div>
                      {errors.identifier && <p className="text-[10px] text-red-400 font-medium">{errors.identifier.message}</p>}
                    </div>

                    {/* Contraseña */}
                    <div className="space-y-2 group">
                      <label htmlFor="password" className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35 group-focus-within:text-white/70 transition-colors block">
                        Contraseña
                      </label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type="password" 
                          {...register('password')} 
                          placeholder="••••••••" 
                          className="w-full bg-white/[0.07] border border-white/[0.12] rounded-2xl px-5 h-13 text-sm font-light text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:ring-offset-0 focus:border-white/50 focus:bg-white/[0.10] transition-all shadow-none backdrop-blur-sm" 
                        />
                      </div>
                      {errors.password && <p className="text-[10px] text-red-400 font-medium">{errors.password.message}</p>}
                      <div className="flex justify-end pt-1">
                        <Link href="/forgot-password" className="text-[9px] font-medium uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
                          ¿Olvidó su contraseña?
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-white/90 hover:bg-white text-black font-semibold uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 rounded-2xl mt-2 shadow-[0_8px_32px_rgba(255,255,255,0.15)] hover:shadow-[0_12px_40px_rgba(255,255,255,0.25)] hover:scale-[1.01] active:scale-[0.99] backdrop-blur-sm border border-white/20" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting 
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando</>
                      : <>Entrar al CRM <ArrowRight className="w-4 h-4" /></>
                    }
                  </Button>

                  {/* Footer */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 h-[1px] bg-white/10" />
                    <p className="text-[9px] text-white/20 tracking-widest uppercase">Élapiel © 2021</p>
                    <div className="flex-1 h-[1px] bg-white/10" />
                  </div>

                </form>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

