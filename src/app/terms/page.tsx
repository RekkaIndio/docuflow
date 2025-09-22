import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900">
      <header className="px-4 lg:px-6 h-16 flex items-center sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur-sm">
        <Link href="/" className="flex items-center justify-center gap-3">
          <Logo className="h-7 w-7 text-primary" />
          <span className="text-2xl font-extrabold font-headline tracking-tight">CG-360</span>
        </Link>
        <nav className="ml-auto hidden lg:flex gap-4 sm:gap-6 items-center">
          <Link href="/" className="text-sm font-medium hover:underline">Home</Link>
          <Link href="/contact" className="text-sm font-medium hover:underline">Contact</Link>
          <Link href="/login" className="text-sm font-medium hover:underline">Sign In</Link>
          <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Link href="/signup">Start Free Trial</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>

          <p className="text-sm text-muted-foreground mb-6">Effective Date: [22/09/2025] • Last Updated: [22/09/2025]</p>

          <p className="mb-4 text-slate-700">Welcome to CG-360. These Terms and Conditions (“Terms”) govern your use of our website, platform, and services (collectively, the “Service”). By accessing or using CG-360, you agree to be bound by these Terms. If you do not agree, you must not use our Service.</p>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">1. About Us</h2>
            <p className="text-sm text-slate-700">CG-360 is a Software-as-a-Service (SaaS) platform providing governance and management tools for care homes. Our company is registered in the United Kingdom.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">2. Eligibility</h2>
            <p className="text-sm text-slate-700">You must be at least 18 years old and authorised to act on behalf of a business entity in order to register for and use our Service.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">3. Subscription and Fees</h2>
            <p className="text-sm text-slate-700">Flat Fee Model: We provide access to the Service in exchange for a fixed subscription fee.</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-2">
              <li><strong>14-Day Cancellation:</strong> You may cancel your subscription within 14 days of signing up for a full refund.</li>
              <li><strong>12-Month Term:</strong> After the 14-day cancellation period, your subscription is locked for a 12-month minimum term. No refunds will be issued for early termination.</li>
              <li><strong>Renewals:</strong> Subscriptions automatically renew at the end of each 12-month term unless cancelled with at least 30 days’ written notice before renewal.</li>
              <li><strong>Payment:</strong> All fees are due in advance and payable in GBP (£).</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">4. Use of the Service</h2>
            <p className="text-sm text-slate-700">You agree to use the Service only for lawful business purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account login details and for all activity that occurs under your account.</p>
            <p className="text-sm text-slate-700 mt-2">You must not:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-2">
              <li>Use the Service in any way that violates applicable laws or regulations.</li>
              <li>Attempt to gain unauthorised access to the Service or related systems.</li>
              <li>Copy, modify, or distribute the Service or its content without prior written consent.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">5. Data and Privacy</h2>
            <p className="text-sm text-slate-700">Data Collection: CG-360 stores basic business and operational information as required for the functionality of the Service. We do not store full resident records or sensitive health data.</p>
            <p className="text-sm text-slate-700 mt-2">Data Protection: We process personal data in accordance with applicable UK data protection laws. Please refer to our <Link href="/privacy" className="underline">Privacy Policy</Link> for more details.</p>
            <p className="text-sm text-slate-700 mt-2">Data Ownership: You retain ownership of the data you upload to the platform. By using the Service, you grant CG-360 a licence to host, process, and display such data as necessary to provide the Service.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">6. Intellectual Property</h2>
            <p className="text-sm text-slate-700">All content, software, and trademarks on the Service are the property of CG-360 or its licensors. Nothing in these Terms transfers ownership of such rights to you.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">7. Service Availability</h2>
            <p className="text-sm text-slate-700">We will use reasonable efforts to maintain the availability of the Service. However, we do not guarantee uninterrupted or error-free operation and may suspend access for maintenance, upgrades, or circumstances beyond our control.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">8. Limitation of Liability</h2>
            <p className="text-sm text-slate-700">To the maximum extent permitted by law:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-2">
              <li>CG-360 will not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</li>
              <li>Our total liability for any claim arising under these Terms shall not exceed the total fees paid by you in the 12 months preceding the claim.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">9. Termination</h2>
            <p className="text-sm text-slate-700">We may suspend or terminate your access to the Service if you breach these Terms or fail to make payment. Upon termination, your right to use the Service will immediately cease, but payment obligations for the current subscription term remain due.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">10. Governing Law</h2>
            <p className="text-sm text-slate-700">These Terms are governed by the laws of England and Wales. The courts of England and Wales will have exclusive jurisdiction over any disputes arising out of or relating to these Terms.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">11. Changes to Terms</h2>
            <p className="text-sm text-slate-700">We may update these Terms from time to time. If material changes are made, we will provide reasonable notice (e.g., via email or a notice on our website). Continued use of the Service after changes take effect constitutes your acceptance of the new Terms.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">12. Contact</h2>
            <p className="text-sm text-slate-700">If you have any questions about these Terms, please contact us:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-2">
              <li>Email: <a href="mailto:support@cg-360.com" className="underline">support@cg-360.com</a></li>
              <li>Address: [Insert company address]</li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

