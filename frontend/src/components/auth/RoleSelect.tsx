'use client';

import { User, Shield } from 'lucide-react';
import type { UserRole } from '@/types';

const ROLE_OPTIONS: {
  value: UserRole;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    value: 'pelanggan',
    label: 'Pelanggan',
    description: 'Pesan & lacak laundry',
    icon: User,
  },
  {
    value: 'admin',
    label: 'Admin Laundry',
    description: 'Kelola toko & pesanan',
    icon: Shield,
  },
];

interface RoleSelectProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

export default function RoleSelect({ value, onChange, disabled }: RoleSelectProps) {
  return (
    <div>
      <p className="block text-sm font-medium text-slate-700 mb-3">Masuk / daftar sebagai</p>
      <div className="grid grid-cols-2 gap-3">
        {ROLE_OPTIONS.map((option) => {
          const selected = value === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                selected
                  ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100 scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`flex items-center justify-center w-9 h-9 rounded-lg mb-2 transition-colors ${
                  selected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className={`font-semibold text-sm ${selected ? 'text-primary-800' : 'text-slate-800'}`}>
                {option.label}
              </span>
              <span className="text-xs text-slate-500 mt-0.5">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { ROLE_OPTIONS };
