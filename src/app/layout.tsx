import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Natalia Sánchez Estética | Cuidado y bienestar',
  description: 'Tratamientos personalizados de estética, cuidado de la piel y bienestar en Resistencia, Chaco.',
  keywords: ['Natalia Sánchez Estética', 'tratamientos faciales', 'masajes', 'manicura', 'bienestar', 'Resistencia'],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body>{children}</body></html>;
}
