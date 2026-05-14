'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h1 className="text-4xl font-bold text-gray-900">Algo salió mal</h1>
      <p className="text-gray-600">Ha ocurrido un error inesperado</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}