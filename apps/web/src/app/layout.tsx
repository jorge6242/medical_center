import type { Metadata } from 'next';

import { initializeThemeScript } from '@/shared/design-system/theme';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Centro Médico',
  description: 'Sistema de gestión — Centro Médico',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initializeThemeScript }} />
      </head>
      <body className="min-h-full bg-background text-on-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
