interface FormErrorProps {
  readonly error?: Error | null;
}

export function FormError({ error }: FormErrorProps) {
  if (!error) return null;

  return (
    <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
      {error.message}
    </p>
  );
}
