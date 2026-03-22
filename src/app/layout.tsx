import type { Metadata, Viewport } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { AppointmentNotifier } from '@/components/appointment-notifier';
import { SessionTimeout } from '@/components/session-timeout';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

const APP_NAME = "ÉLAPIEL";
const APP_DESCRIPTION = "Centro Estético & Depilación Láser - Gestión de Citas e Inventario";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  initialScale: 1,
  width: 'device-width',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          ptSans.variable
        )}
      >
        <AuthProvider>
          <SessionTimeout />
          {children}
          <AppointmentNotifier />
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
