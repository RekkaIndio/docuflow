import Image from 'next/image';

export function AnimatedHeroBg() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Primary gradient background */}
      <div className="w-full h-full bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20 animate-gradient-move" />

      {/* Animated geometric shapes */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-lg animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-gradient-to-br from-pink-400/20 to-blue-500/20 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }} />

      {/* SVG geometric patterns */}
      <svg className="absolute left-1/3 top-1/4 -translate-x-1/2 -translate-y-1/2 opacity-20 animate-pulse" width="200" height="200" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="80" stroke="url(#hero-gradient)" strokeWidth="1" fill="none" />
        <circle cx="100" cy="100" r="60" stroke="url(#hero-gradient)" strokeWidth="0.5" fill="none" />
        <circle cx="100" cy="100" r="40" stroke="url(#hero-gradient)" strokeWidth="0.5" fill="none" />
        <defs>
          <linearGradient id="hero-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 w-full flex justify-center pb-8">
        <div className="w-96 h-16 bg-gradient-to-r from-transparent via-primary/10 to-transparent rounded-full blur-sm animate-pulse" />
      </div>
    </div>
  );
}
