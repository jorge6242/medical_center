import { cn } from '@/shared/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 1 | 2 | 3;
}

export function Card({ className, elevation = 1, children, ...props }: CardProps) {
  const shadows = {
    1: 'shadow-elevation-1',
    2: 'shadow-elevation-2',
    3: 'shadow-elevation-3',
  } as const;

  return (
    <div
      className={cn('rounded-xl bg-surface p-6', shadows[elevation], className)}
      {...props}
    >
      {children}
    </div>
  );
}
