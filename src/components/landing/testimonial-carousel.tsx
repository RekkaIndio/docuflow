import Image from 'next/image';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Care Home Manager',
    company: 'Oakwood Care Home',
    avatar: 'https://i.pravatar.cc/100?u=sarah',
    quote: 'DocuFlow AI transformed our CQC preparation. We went from stressed about audits to fully confident. The AI chat feature helps us find information instantly.',
    rating: 5
  },
  {
    name: 'Dr. James Wilson',
    role: 'Clinical Lead',
    company: 'Riverside Nursing Home',
    avatar: 'https://i.pravatar.cc/100?u=james',
    quote: 'The medication audit automation saved us 15 hours per week. The AI caught discrepancies that could have been serious compliance issues.',
    rating: 5
  },
  {
    name: 'Emma Thompson',
    role: 'Deputy Manager',
    company: 'Greenfield Residential Care',
    avatar: 'https://i.pravatar.cc/100?u=emma',
    quote: 'Staff training compliance is now effortless. The system reminds us of renewals and tracks everything. Our CQC rating improved from Good to Outstanding.',
    rating: 5
  },
  {
    name: 'Michael Brown',
    role: 'Operations Director',
    company: 'Harmony Care Group',
    avatar: 'https://i.pravatar.cc/100?u=michael',
    quote: 'Managing policies across 8 care homes used to be a nightmare. Now it\'s automated and we\'re always audit-ready. The ROI was evident in 3 months.',
    rating: 5
  },
];

export function TestimonialCarousel() {
  return (
    <section className="w-full py-20 md:py-32 lg:py-40 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Trusted by Care Professionals</span>
          <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl mb-4">
            Real Results from Real Care Homes
          </h2>
          <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl">
            See how DocuFlow AI is helping care homes achieve compliance excellence and improve resident care.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-background/80 backdrop-blur-sm border border-border/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, starIndex) => (
                  <Star key={starIndex} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <Image src={t.avatar} alt={t.name} width={48} height={48} className="rounded-full border-2 border-primary/20" />
                <div>
                  <span className="text-sm font-semibold text-foreground block">{t.name}</span>
                  <span className="text-xs text-primary font-medium">{t.role}</span>
                  <span className="text-xs text-muted-foreground block">{t.company}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border/30 rounded-full px-6 py-3">
            <div className="flex -space-x-1">
              <Image src="https://i.pravatar.cc/32?u=1" width={24} height={24} alt="User" className="rounded-full border-2 border-background" />
              <Image src="https://i.pravatar.cc/32?u=2" width={24} height={24} alt="User" className="rounded-full border-2 border-background" />
              <Image src="https://i.pravatar.cc/32?u=3" width={24} height={24} alt="User" className="rounded-full border-2 border-background" />
              <Image src="https://i.pravatar.cc/32?u=4" width={24} height={24} alt="User" className="rounded-full border-2 border-background" />
            </div>
            <span className="text-sm text-muted-foreground ml-2">Join 500+ care homes already using DocuFlow AI</span>
          </div>
        </div>
      </div>
    </section>
  );
}
