'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import { searchAddresses, type GeocodingResult } from '@/lib/geocoding/nominatim';

interface AddressSearchInputProps {
  label: string;
  value: string;
  onChange: (address: string) => void;
  onSelect: (result: GeocodingResult) => void;
  placeholder?: string;
  required?: boolean;
}

export default function AddressSearchInput({
  label,
  value,
  onChange,
  onSelect,
  placeholder = 'Ketik alamat, lalu pilih dari daftar...',
  required = false,
}: AddressSearchInputProps) {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const items = await searchAddresses(value);
        setResults(items);
        setError(null);
        setOpen(items.length > 0);
      } catch {
        setResults([]);
        setError('Gagal mencari alamat. Coba lagi.');
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function handleSelect(result: GeocodingResult) {
    onChange(result.address);
    onSelect(result);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          required={required}
          autoComplete="off"
          className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow"
          placeholder={placeholder}
        />
        {searching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 animate-spin" />
        )}
      </div>

      {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-30 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {results.map((result) => (
            <li key={result.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full flex items-start gap-2 text-left px-4 py-3 text-sm hover:bg-primary-50 border-b border-slate-100 last:border-0 transition-colors"
              >
                <MapPin className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <span className="text-slate-700">{result.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
