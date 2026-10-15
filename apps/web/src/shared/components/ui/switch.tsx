'use client';

import { forwardRef } from 'react';

import { cn } from '@/shared/utils/cn';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, className, ...props },
  ref,
) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-3', className)}>
      <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface-variant transition-colors has-[:checked]:bg-primary">
        <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
        <span className="h-4 w-4 translate-x-1 rounded-full bg-on-surface-variant transition-transform peer-checked:translate-x-6 peer-checked:bg-on-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface peer-disabled:opacity-50" />
      </div>
      {label && <span className="text-sm text-on-surface">{label}</span>}
    </label>
  );
});
