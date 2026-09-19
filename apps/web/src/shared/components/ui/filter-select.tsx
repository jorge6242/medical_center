'use client';

import { Select } from './select';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  label?: string;
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = 'Todos',
  label,
}: FilterSelectProps) {
  const allOptions = [{ value: '', label: placeholder }, ...options];

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={allOptions}
      label={label}
    />
  );
}
