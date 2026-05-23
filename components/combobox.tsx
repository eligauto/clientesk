"use client";

import { useState, useEffect, useRef } from "react";

export interface ComboboxOption {
  id: string;
  label: string;
}

interface Props {
  options: ComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function Combobox({ options, value, onChange, placeholder, required }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opt = options.find((o) => o.id === value);
    setDisplayValue(opt ? opt.label : "");
  }, [value, options]);

  const filtered =
    query === ""
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase())
        );

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setDisplayValue(e.target.value);
    setOpen(true);
    if (e.target.value === "") onChange("");
  }

  function handleSelect(opt: ComboboxOption) {
    onChange(opt.id);
    setDisplayValue(opt.label);
    setQuery("");
    setOpen(false);
  }

  function handleBlur() {
    // Delay so click on option fires first
    setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      {/* Hidden input for required validation */}
      {required && (
        <input
          tabIndex={-1}
          value={value}
          onChange={() => {}}
          required
          className="absolute opacity-0 w-0 h-0"
        />
      )}
      {open && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-gray-400">Sin resultados</li>
          ) : (
            filtered.map((opt) => (
              <li
                key={opt.id}
                onMouseDown={() => handleSelect(opt)}
                className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 ${
                  opt.id === value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-900"
                }`}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
