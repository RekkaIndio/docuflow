import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

          <p className="mb-4 text-slate-700">This Privacy Policy explains how CG-360 (“we”, “us”, or “our”) collects, uses, and protects personal data when you use our website, platform and related services (the “Service”). We are committed to protecting your privacy and handling personal data transparently and securely. Please read this policy carefully.</p>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">1. Data We Collect</h2>
            <p className="text-sm text-slate-700">We collect data necessary to provide the Service. Types of personal data we may collect include:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Account and contact details (name, email, phone, job title).</li>
              <li>Organisation details (business name, address, payment and billing information).</li>
              <li>Usage data (logs, device information, IP address) and analytics from your use of the Service.</li>
              <li>Content and documents you upload to the platform (you remain the owner of your data — see Data Ownership).</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">We do not intentionally collect or store sensitive health data such as full resident health records as part of our standard Service. If you choose to upload sensitive information, you must ensure you have the appropriate lawful basis and consents to do so.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">2. How We Use Personal Data</h2>
            <p className="text-sm text-slate-700">We process personal data for the following primary purposes:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>To provide, operate and maintain the Service and related features.</li>
              <li>To manage accounts, billing and subscriptions.</li>
              <li>To provide customer support and respond to enquiries.</li>
              <li>To improve the Service, perform analytics, and detect abuse or fraud.</li>
              <li>To comply with legal obligations and protect our legal rights.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">3. Legal Basis for Processing</h2>
            <p className="text-sm text-slate-700">Under applicable UK data protection law, we rely on one or more of the following legal bases to process personal data:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Performance of a contract: processing necessary to provide the Service and fulfil our contract with you.</li>
              <li>Legal compliance: processing necessary to comply with a legal obligation.</li>
              <li>Legitimate interests: where processing is necessary for our legitimate interests and does not override your rights (e.g., fraud detection, service improvement).</li>
              <li>Consent: where we ask for and rely on your consent for specific processing activities (we will seek consent where required, eg marketing communications).</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">4. Data Sharing & Third Parties</h2>
            <p className="text-sm text-slate-700">We may share personal data with the following categories of recipients:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Service providers who perform services on our behalf (hosting, payment processors, analytics providers).</li>
              <li>Professional advisors (lawyers, auditors) where required to obtain legal advice or perform audits.</li>
              <li>Authorities or third parties where required by law or to protect rights and safety.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">We do not sell personal data to third parties. We require our processors to provide an appropriate level of protection and only to use personal data in accordance with our instructions.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">5. International Transfers</h2>
            <p className="text-sm text-slate-700">Personal data may be processed or stored outside the UK. When we transfer data internationally we use appropriate safeguards (eg standard contractual clauses) or rely on an adequacy decision where available. Contact us for more details about specific transfers.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">6. Data Retention</h2>
            <p className="text-sm text-slate-700">We retain personal data for as long as necessary to provide the Service, comply with legal obligations, resolve disputes and enforce our agreements. Retention periods vary by data type — contact us if you need specifics for your organisation.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">7. Cookies and Tracking</h2>
            <p className="text-sm text-slate-700">We use cookies and similar tracking technologies to operate the Service and provide analytics. You can manage cookie preferences via your browser settings. For any embedded third-party content (eg analytics providers) please consult their privacy policies for details.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">8. Data Security</h2>
            <p className="text-sm text-slate-700">We implement appropriate technical and organisational measures to protect personal data against unauthorised or unlawful processing, accidental loss, destruction or damage. These measures include encryption in transit, access controls, and regular security assessments. No system is perfect — if we become aware of a personal data breach we will notify affected parties and regulators as required by law.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">9. Your Rights</h2>
            <p className="text-sm text-slate-700">Subject to local law, individuals may have rights including:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Right to access personal data we hold about you.</li>
              <li>Right to rectification of inaccurate data.</li>
              <li>Right to erasure (in certain circumstances).</li>
              <li>Right to restrict or object to processing, and the right to data portability.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">To exercise your rights, contact us at <a href="mailto:support@cg-360.com" className="underline">support@cg-360.com</a>. We will respond to requests in accordance with applicable law.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">10. Children</h2>
            <p className="text-sm text-slate-700">Our Service is not directed to children under 13. We do not knowingly collect personal data from children under 13. If you believe we have collected personal data from a child, please contact us.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">11. Changes to this Policy</h2>
            <p className="text-sm text-slate-700">We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the effective date. Where required by law we will provide additional notice of material changes.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">12. Contact Us</h2>
            <p className="text-sm text-slate-700">If you have questions or requests regarding this Privacy Policy or our data practices, please contact:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Email: <a href="mailto:support@cg-360.com" className="underline">support@cg-360.com</a></li>
              <li>Address: [Insert company address]</li>
            </ul>
          </section>

          <div className="mt-6 text-sm text-muted-foreground">Note: This policy is a general template and should be reviewed by your legal advisor or Data Protection Officer (DPO) before publication to ensure compliance with applicable laws and your organisation's practices.</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
