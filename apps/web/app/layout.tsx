import type { Metadata, Viewport } from 'next';
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const display = Manrope({ subsets: ['latin'], variable: '--font-display' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: { default: 'Assetra — Manajemen Aset', template: '%s | Assetra' },
  description: 'Kelola, lacak, audit, dan rawat aset perusahaan melalui satu PWA.',
  applicationName: 'Assetra',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Assetra' },
  openGraph: { title: 'Assetra — Setiap aset. Selalu terlacak.', description: 'Kelola, audit, dan rawat aset perusahaan dari satu PWA.', images: ['/og.png'], locale: 'id_ID', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Assetra — Setiap aset. Selalu terlacak.', description: 'Manajemen aset perusahaan berbasis PWA.', images: ['/og.png'] },
};
export const viewport: Viewport = { themeColor: '#12352f', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" className={`${display.variable} ${body.variable}`}><body>{children}<script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} /></body></html>;
}
