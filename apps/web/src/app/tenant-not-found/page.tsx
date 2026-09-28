export default function TenantNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-variant">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-elevation-3 text-center">
        <p className="text-6xl mb-4">🏥</p>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Centro médico no encontrado</h1>
        <p className="text-sm text-on-surface-variant">
          Este enlace no corresponde a ningún centro médico registrado en el sistema. Verificá la
          URL o solicitá el acceso a tu administrador.
        </p>
      </div>
    </div>
  );
}
