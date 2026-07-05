'use client';

import { ChevronDown } from 'lucide-react';
import type { UserRole } from '@/types';

export type RoleSelectValue = UserRole | '';

const OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'pelanggan', label: 'Pelanggan' },
  { value: 'admin', label: 'Admin Laundry' },
];

interface RoleDropdownProps {
  value: RoleSelectValue;
  onChange: (role: RoleSelectValue) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

export default function RoleDropdown({
  value,
  onChange,
  disabled,
  label = 'Masuk / daftar sebagai',
  placeholder = 'Pilih role',
}: RoleDropdownProps) {
  return (
    <div>
      <label htmlFor="role-select" className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          id="role-select"
          value={value}
          onChange={(e) => onChange(e.target.value as RoleSelectValue)}
          disabled={disabled}
          required={value === ''}
          className={`w-full appearance-none px-4 py-3 pr-10 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow disabled:opacity-50 cursor-pointer ${
            value === '' ? 'text-slate-400' : 'text-slate-800'
          }`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
