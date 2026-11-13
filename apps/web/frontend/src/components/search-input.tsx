"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

type SearchInputProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  className?: string;
};

export function SearchInput({ value, defaultValue, onChange, onSearch, debounceMs = 400, placeholder = "Search…", className = "" }: SearchInputProps) {
  const [text, setText] = useState(value ?? defaultValue ?? "");
  const [prevValue, setPrevValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (value !== undefined && value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleChange = (v: string) => {
    setText(v);
    onChange?.(v);
    if (onSearch) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onSearch(v.trim()), debounceMs);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
      />
    </div>
  );
}
