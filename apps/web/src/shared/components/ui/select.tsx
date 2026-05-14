import { cn } from '@/shared/utils/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ className, error, label, id, options, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-on-surface">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'h-10 rounded-lg border border-outline bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary',
          error && 'border-error focus:ring-error',
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
