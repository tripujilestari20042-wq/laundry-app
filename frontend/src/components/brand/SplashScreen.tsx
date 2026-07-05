import PulesinLogo from '@/components/brand/PulesinLogo';
import { BRAND } from '@/lib/brand';

interface SplashScreenProps {
  fullScreen?: boolean;
}

export default function SplashScreen({ fullScreen = true }: SplashScreenProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#E8F4FC] via-[#DDEEF9] to-[#E8E4F8] ${
        fullScreen ? 'min-h-screen' : 'py-16'
      }`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-lavender-400/25 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-fade-in">
        <PulesinLogo size="xl" variant="dark" />
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-md leading-relaxed font-medium">
          {BRAND.tagline}
        </p>
        <div className="mt-10 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
