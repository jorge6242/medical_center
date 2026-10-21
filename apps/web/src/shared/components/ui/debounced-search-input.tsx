'use client';

import { useEffect, useRef, useState } from 'react';

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
  const onChangeRef = useRef(onChange);
  const lastNotifiedRef = useRef(value);

  useEffect(() => {
    lastNotifiedRef.current = value;
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (inputValue === lastNotifiedRef.current) return;

    const handler = setTimeout(() => {
      lastNotifiedRef.current = inputValue;
      onChangeRef.current(inputValue);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [inputValue, debounceMs]);

  return (
    <Input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder={placeholder}
    />
  );
}
