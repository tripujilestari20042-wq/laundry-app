import { cn } from '@/lib/utils';

interface PulesinLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

const sizes = {
  sm: { icon: 32, text: 'text-base' },
  md: { icon: 40, text: 'text-lg' },
  lg: { icon: 56, text: 'text-2xl' },
  xl: { icon: 80, text: 'text-4xl' },
};

export default function PulesinLogo({
  size = 'md',
  showWordmark = true,
  className,
  variant = 'dark',
}: PulesinLogoProps) {
  const { icon, text } = sizes[size];
  const wordColor = variant === 'light' ? 'text-white' : 'text-slate-800';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <defs>
          <linearGradient id="pulesin-grad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7EC8E3" />
            <stop offset="1" stopColor="#9B8FD9" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#pulesin-grad)" opacity="0.15" />
        {/* Moon / cloud sleep */}
        <path
          d="M44 18c-6.2 0-11.2 5-11.2 11.2 0 6.2 5 11.2 11.2 11.2 1.8 0 3.5-.4 5-1.2-3.8-2.2-6.3-6.3-6.3-11 0-4.7 2.5-8.8 6.3-11-1.5-.8-3.2-1.2-5-1.2z"
          fill="url(#pulesin-grad)"
          opacity="0.95"
        />
        <ellipse cx="22" cy="46" rx="14" ry="5" fill="url(#pulesin-grad)" opacity="0.25" />
        {/* Laundry basket lines */}
        <path
          d="M16 28h20l-2 22H18L16 28z"
          stroke="url(#pulesin-grad)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M20 28l2-6h12l2 6" stroke="url(#pulesin-grad)" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M24 36h8M24 42h8" stroke="url(#pulesin-grad)" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      </svg>
      {showWordmark && (
        <span className={cn('font-bold tracking-tight', text, wordColor)}>Pulesin</span>
      )}
    </div>
  );
}
