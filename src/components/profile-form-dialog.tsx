
"use client";

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2, Camera, User as UserIcon } from 'lucide-react';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const profileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  photoUrl: z.string().optional(),
}).refine(data => {
    if (data.password && data.password.trim() !== "") {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
}).refine(data => {
    if (data.password && data.password.trim() !== "") {
        return data.password.length >= 4;
    }
    return true;
}, {
    message: "La contraseña debe tener al menos 4 caracteres.",
    path: ["password"],
});


type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<User>) => void;
  user: User;
}

export function ProfileFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  user,
}: ProfileFormDialogProps) {
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      photoUrl: '',
    },
  });
  
  const passwordValue = form.watch('password');

  useEffect(() => {
    if (isOpen && user) {
        form.reset({
            name: user.name,
            email: user.email,
            password: '',
            confirmPassword: '',
            photoUrl: user.photoUrl || '',
        });
        setPreviewUrl(user.photoUrl || null);
        setVerificationCode(null);
        setSentCode(null);
        setVerificationError(null);
    }
  }, [isOpen, user, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) { 
        toast({
          title: "Archivo demasiado grande",
          description: "La foto no debe pesar más de 500KB.",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewUrl(base64String);
        form.setValue('photoUrl', base64String, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSendVerificationCode = async (formData: ProfileFormData) => {
    setIsSendingCode(true);
    setVerificationError(null);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);

    const subject = `Tu código de verificación - ÉLAPIEL`;
    const html = `
      <h1>Código de Verificación</h1>
      <p>Hola ${formData.name},</p>
      <p>Has solicitado cambiar tu contraseña. Usa el siguiente código para confirmar el cambio:</p>
      <h2 style="font-size: 24px; color: #db2777; letter-spacing: 4px;">${code}</h2>
      <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
    `;
    
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: formData.email, subject, html }),
      });

      if (!response.ok) {
        throw new Error('No se pudo enviar el correo de verificación.');
      }
      
      toast({
        title: 'Código Enviado',
        description: `Se ha enviado un código de verificación a ${formData.email}.`,
      });

    } catch (error: any) {
       setVerificationError(error.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = (data: ProfileFormData) => {
    const { confirmPassword, ...updateData } = data;
    
    // EXTREMADAMENTE IMPORTANTE: Si la contraseña está vacía o es solo espacios,
    // eliminamos el campo del objeto de actualización para que updateDoc
    // no lo toque en la base de datos.
    if (!updateData.password || updateData.password.trim() === "") {
        delete updateData.password;
    }

    // Si no hay cambio de contraseña, enviamos directamente
    if (!updateData.password) {
        onSubmit(updateData);
        return;
    }

    // Si se inició cambio de contraseña pero no se ha enviado el código aún
    if(updateData.password && !sentCode) {
        handleSendVerificationCode(data);
        return;
    }

    // Si ya se envió el código, verificamos antes de procesar el onSubmit
    if (sentCode) {
        if (verificationCode === sentCode) {
            onSubmit(updateData);
        } else {
            setVerificationError("El código de verificación es incorrecto.");
        }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Mi Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tu información personal y foto de perfil.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-primary/10 transition-all group-hover:border-primary/30">
                  <AvatarImage src={previewUrl || ''} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-primary text-2xl font-bold">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  type="button"
                  variant="secondary" 
                  size="icon" 
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-lg border border-background"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">Límite: 500KB</p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Tu nombre" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="correo@ejemplo.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña (Dejar vacío para no cambiar)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {passwordValue && passwordValue.trim() !== "" && (
                <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            {sentCode && (
                <div className='space-y-2 rounded-lg border p-4 bg-muted/50'>
                    <Label htmlFor="verification-code">Código de Verificación</Label>
                    <p className="text-sm text-muted-foreground">
                        Ingresa el código de 6 dígitos enviado a tu correo.
                    </p>
                    <Input 
                        id="verification-code"
                        type="text"
                        maxLength={6}
                        value={verificationCode || ''}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="123456"
                        className="text-center tracking-widest text-lg font-bold"
                    />
                </div>
            )}

            {verificationError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{verificationError}</AlertDescription>
                </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
               <Button type="submit" disabled={isSendingCode}>
                {isSendingCode ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Enviando...</> : 
                 (passwordValue && passwordValue.trim() !== "" && !sentCode) ? "Validar con Código" : 
                 (passwordValue && passwordValue.trim() !== "" && sentCode) ? "Confirmar y Guardar" :
                 "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
