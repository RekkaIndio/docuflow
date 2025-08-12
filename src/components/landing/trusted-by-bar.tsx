import Image from 'next/image';

const companyLogos = [
  { src: '/logos/google.svg', alt: 'Google' },
  { src: '/logos/microsoft.svg', alt: 'Microsoft' },
  { src: '/logos/stripe.svg', alt: 'Stripe' },
  { src: '/logos/airbnb.svg', alt: 'Airbnb' },
  { src: '/logos/spotify.svg', alt: 'Spotify' },
];

export function TrustedByBar() {
  return (
    <div className="w-full py-6 flex flex-col items-center">
      <span className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Trusted by teams worldwide</span>
      <div className="flex flex-wrap justify-center gap-6 md:gap-10">
        {companyLogos.map(logo => (
          <Image
            key={logo.alt}
            src={logo.src}
            alt={logo.alt}
            width={100}
            height={32}
            className="h-8 w-auto grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition"
          />
        ))}
      </div>
    </div>
  );
}
