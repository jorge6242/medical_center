'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';

import { cn } from '@/shared/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, label, id, type, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-on-surface">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && visible ? 'text' : type}
          className={cn(
            'h-10 w-full rounded-lg border border-outline bg-surface px-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary',
            isPassword && 'pr-10',
            error && 'border-error focus:ring-error',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute inset-y-0 right-3 text-on-surface-variant"
          >
            <span className="sr-only">{visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
});
