'use client';

import { ChevronDown } from 'lucide-react';
import type { UserRole } from '@/types';

const OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'pelanggan', label: 'Pelanggan' },
  { value: 'admin', label: 'Admin Laundry' },
];

interface RoleDropdownProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
  label?: string;
}

export default function RoleDropdown({
  value,
  onChange,
  disabled,
  label = 'Masuk / daftar sebagai',
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
          onChange={(e) => onChange(e.target.value as UserRole)}
          disabled={disabled}
          className="w-full appearance-none px-4 py-3 pr-10 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow disabled:opacity-50 cursor-pointer"
        >
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
