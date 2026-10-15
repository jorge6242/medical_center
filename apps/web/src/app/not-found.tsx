import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h1 className="text-4xl font-bold text-on-background">404</h1>
      <p className="text-on-surface-variant">Página no encontrada</p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary/90 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
