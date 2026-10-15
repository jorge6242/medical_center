export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-outline border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-on-surface-variant">Cargando...</p>
      </div>
    </div>
  );
}
