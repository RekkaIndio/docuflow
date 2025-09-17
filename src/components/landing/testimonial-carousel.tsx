import Image from 'next/image';

const testimonials = [
  {
    name: 'Alex Johnson',
    company: 'Acme Corp',
    avatar: 'https://i.pravatar.cc/100?u=alex',
  quote: 'CG-360 AI cut our document processing time by 80%. The chat feature is a game changer!'
  },
  {
    name: 'Priya Patel',
    company: 'FinTech Ltd',
    avatar: 'https://i.pravatar.cc/100?u=priya',
  quote: 'We trust CG-360 for all our compliance docs. The AI is shockingly accurate.'
  },
  {
    name: 'Sam Lee',
    company: 'HealthSync',
    avatar: 'https://i.pravatar.cc/100?u=sam',
    quote: 'Our team loves the instant summaries and reminders. It feels like magic.'
  },
];

export function TestimonialCarousel() {
  return (
    <div className="w-full py-10 flex flex-col items-center">
      <span className="text-xs uppercase tracking-wider text-slate-700 mb-3 font-semibold">What our users say</span>
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 justify-center">
        {testimonials.map((t, i) => (
          <div key={i} className="bg-background/70 border border-border/30 rounded-xl p-6 max-w-xs shadow-md flex flex-col items-center text-center hover:shadow-lg transition">
            <Image src={t.avatar} alt={t.name} width={56} height={56} className="rounded-full mb-3 border-2 border-primary" />
            <p className="text-lg font-medium mb-2">“{t.quote}”</p>
            <span className="text-sm font-semibold text-primary">{t.name}</span>
            <span className="text-xs text-slate-700">{t.company}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
