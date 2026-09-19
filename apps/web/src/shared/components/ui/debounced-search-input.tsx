'use client';

import { useEffect, useState } from 'react';

import { Input } from './input';

interface DebouncedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function DebouncedSearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  debounceMs = 300,
}: DebouncedSearchInputProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(inputValue);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [inputValue, debounceMs, onChange]);

  return (
    <Input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder={placeholder}
    />
  );
}
