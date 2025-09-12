import Image from 'next/image';

export function AnimatedHeroBg() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="w-full h-full bg-gradient-to-br from-purple-100/40 via-pink-100/30 to-transparent animate-gradient-move" />
      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" width="800" height="800" viewBox="0 0 800 800" fill="none">
        <circle cx="400" cy="400" r="300" fill="url(#radial)" />
        <defs>
          <radialGradient id="radial" cx="0" cy="0" r="1" gradientTransform="translate(400 400) scale(300)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a78bfa" stopOpacity="0.2" />
            <stop offset="1" stopColor="#f472b6" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      <div className="absolute bottom-0 left-0 w-full flex justify-center pb-8">
        <Image src="/ai-lines.svg" alt="AI lines" width={400} height={60} className="opacity-60 animate-float" />
      </div>
    </div>
  );
}
