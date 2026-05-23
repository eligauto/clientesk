"use client";

import { useState, useEffect, useRef } from "react";

export interface ComboboxOption {
  id: string;
  label: string;
  sub?: string;
}

interface Props {
  options?: ComboboxOption[];
  onSearch?: (q: string) => Promise<ComboboxOption[]>;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function Combobox({ options = [], onSearch, value, onChange, placeholder, required }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const [asyncOptions, setAsyncOptions] = useState<ComboboxOption[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAsync = !!onSearch;

  // For sync mode: sync display value with value prop
  useEffect(() => {
    if (isAsync) return;
    const opt = options.find((o) => o.id === value);
    setDisplayValue(opt ? opt.label : "");
  }, [value, options, isAsync]);

  const visibleOptions = isAsync ? asyncOptions : (
    query === "" ? options : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
  );

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setDisplayValue(q);
    setOpen(true);
    if (q === "") { onChange(""); setAsyncOptions([]); return; }

    if (isAsync) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearching(true);
      debounceRef.current = setTimeout(async () => {
        const results = await onSearch!(q);
        setAsyncOptions(results);
        setSearching(false);
      }, 250);
    }
  }

  function handleSelect(opt: ComboboxOption) {
    onChange(opt.id);
    setDisplayValue(opt.label);
    setQuery("");
    setOpen(false);
    if (isAsync) setAsyncOptions([opt]); // keep selected for display
  }

  function handleBlur() {
    setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleInput}
        onFocus={() => { setOpen(true); if (!isAsync && !query) setQuery(""); }}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      {required && (
        <input tabIndex={-1} value={value} onChange={() => {}} required className="absolute opacity-0 w-0 h-0" />
      )}
      {open && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {searching ? (
            <li className="px-3 py-2.5 text-sm text-gray-400">Buscando...</li>
          ) : visibleOptions.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-gray-400">
              {isAsync && !query ? "Escribí para buscar" : "Sin resultados"}
            </li>
          ) : (
            visibleOptions.map((opt) => (
              <li
                key={opt.id}
                onMouseDown={() => handleSelect(opt)}
                className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 ${
                  opt.id === value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-900"
                }`}
              >
                <span>{opt.label}</span>
                {opt.sub && <span className="ml-2 text-xs text-gray-400">{opt.sub}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
