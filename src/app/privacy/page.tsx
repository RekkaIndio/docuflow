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
          <span className="text-2xl font-extrabold font-headline tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CG-360</span>
        </Link>
        <nav className="ml-auto hidden lg:flex gap-4 sm:gap-6 items-center">
          <Link href="/" className="text-sm font-medium hover:underline">Home</Link>
          <Link href="/contact" className="text-sm font-medium hover:underline">Contact</Link>
          <Link href="/login" className="text-sm font-medium hover:underline">Sign In</Link>
        </nav>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Effective Date:</strong> 24 September 2025<br />
              <strong>Last Updated:</strong> 24 September 2025<br />
              <strong>Version:</strong> 1.0
            </p>
          </div>

          <p className="mb-4 text-slate-700">This Privacy Policy explains how CG-360 ("we", "us", or "our") collects, uses, and protects personal data when you use our website, platform and related services (the "Service"). CG-360 is an AI-powered care home compliance platform designed to help care providers maintain regulatory compliance and manage operational documentation. We are committed to protecting your privacy and handling personal data transparently and securely in accordance with applicable data protection laws, including the UK GDPR and Data Protection Act 2018. Please read this policy carefully.</p>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">1. Data We Collect</h2>
            <p className="text-sm text-slate-700">We collect data necessary to provide the Service. Types of personal data we may collect include:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li><strong>Account and contact details:</strong> name, email, phone, job title, and professional qualifications.</li>
              <li><strong>Organisation details:</strong> business name, address, CQC registration number, payment and billing information.</li>
              <li><strong>Staff and resident data:</strong> staff records, training information, care plans, and compliance documentation you upload (you remain the data controller for this information).</li>
              <li><strong>Usage data:</strong> login times, feature usage, device information, IP address, and analytics from your use of the Service.</li>
              <li><strong>Communication data:</strong> emails, support tickets, and feedback you send to us.</li>
              <li><strong>AI interaction data:</strong> queries submitted to our AI assistant and responses generated.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">We do not intentionally collect or store sensitive health data such as full resident health records as part of our standard Service. If you choose to upload sensitive information, you must ensure you have the appropriate lawful basis and consents to do so. You remain the data controller for any personal data you upload to the platform.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">2. AI Data Processing</h2>
            <p className="text-sm text-slate-700">CG-360 uses artificial intelligence to provide compliance assistance and document analysis. Our AI processing includes:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Document analysis and categorization of uploaded compliance documents.</li>
              <li>Automated compliance checking against CQC standards and regulatory requirements.</li>
              <li>Intelligent search and retrieval of relevant policies and procedures.</li>
              <li>Generation of compliance reports and audit evidence packs.</li>
              <li>Natural language queries about compliance requirements and best practices.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">We use Google AI (Gemini) and OpenAI services for AI processing. Data processed by AI services is used solely for providing the Service and is not used to train general AI models without your consent. You can opt-out of AI processing by contacting us.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">3. How We Use Personal Data</h2>
            <p className="text-sm text-slate-700">We process personal data for the following primary purposes:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>To provide, operate and maintain the Service and related features, including AI-powered compliance assistance.</li>
              <li>To manage accounts, billing and subscriptions, including payment processing.</li>
              <li>To provide customer support and respond to enquiries about compliance and platform usage.</li>
              <li>To improve the Service, perform analytics, and detect abuse or fraud.</li>
              <li>To comply with legal obligations and protect our legal rights.</li>
              <li>To send service-related communications, including security alerts and compliance reminders.</li>
              <li>To analyse usage patterns and improve our AI models for better compliance assistance.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">4. Legal Basis for Processing</h2>
            <p className="text-sm text-slate-700">Under applicable UK data protection law, we rely on one or more of the following legal bases to process personal data:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li><strong>Performance of a contract:</strong> processing necessary to provide the Service and fulfil our contract with you.</li>
              <li><strong>Legal compliance:</strong> processing necessary to comply with a legal obligation, including CQC regulatory requirements.</li>
              <li><strong>Legitimate interests:</strong> where processing is necessary for our legitimate interests and does not override your rights (e.g., fraud detection, service improvement, security monitoring).</li>
              <li><strong>Consent:</strong> where we ask for and rely on your consent for specific processing activities (e.g., marketing communications, AI processing).</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">5. Data Sharing & Third Parties</h2>
            <p className="text-sm text-slate-700">We may share personal data with the following categories of recipients:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li><strong>Service providers:</strong> Google Cloud Platform (hosting, Firebase services), Google AI (Gemini), OpenAI, Mailgun (email delivery), and Stripe (payment processing).</li>
              <li><strong>Professional advisors:</strong> lawyers, auditors, and consultants where required to obtain legal advice or perform audits.</li>
              <li><strong>Authorities:</strong> regulatory bodies such as the CQC, or law enforcement where required by law or to protect rights and safety.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">We do not sell personal data to third parties. We require our processors to provide an appropriate level of protection and only to use personal data in accordance with our instructions. Our subprocessors include:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Google Cloud Platform (EU region)</li>
              <li>Google AI (processed in accordance with their privacy policies)</li>
              <li>OpenAI (processed in accordance with their privacy policies)</li>
              <li>Mailgun (EU region)</li>
              <li>Stripe (PCI DSS compliant)</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">6. International Transfers</h2>
            <p className="text-sm text-slate-700">Personal data may be processed or stored outside the UK/EU. When we transfer data internationally we use appropriate safeguards:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Google Cloud Platform: Data is stored in EU regions with EU-standard contractual clauses.</li>
              <li>Google AI and OpenAI: Data processing occurs in accordance with their respective privacy policies and data protection agreements.</li>
              <li>All transfers are made in compliance with UK GDPR requirements for international data transfers.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">Contact us for more details about specific transfers and applicable safeguards.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">7. Data Retention</h2>
            <p className="text-sm text-slate-700">We retain personal data for as long as necessary to provide the Service, comply with legal obligations, resolve disputes and enforce our agreements. Our retention periods are:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li><strong>Account data:</strong> Retained for the duration of your account plus 7 years for legal compliance.</li>
              <li><strong>Usage logs:</strong> Retained for 2 years for security and analytics purposes.</li>
              <li><strong>Payment data:</strong> Retained for 7 years for tax and accounting purposes.</li>
              <li><strong>AI interaction data:</strong> Retained for 1 year for service improvement, unless you opt out.</li>
              <li><strong>Uploaded documents:</strong> Retained according to your account settings and legal requirements.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">You can request deletion of your data at any time, subject to legal retention requirements.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">8. Cookies and Tracking</h2>
            <p className="text-sm text-slate-700">We use cookies and similar tracking technologies to operate the Service and provide analytics. We use Google Analytics (GA4) to understand how people use the Service; you can opt-out by disabling analytics cookies or using your browser's tracking prevention features.</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li><strong>Essential cookies:</strong> Required for platform functionality, authentication, and security.</li>
              <li><strong>Analytics cookies:</strong> Help us understand how you use the Service to improve performance.</li>
              <li><strong>AI functionality cookies:</strong> Enable AI-powered features and compliance assistance.</li>
              <li><strong>Third-party cookies:</strong> Used by Google Analytics, Firebase, and AI service providers.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">You can manage cookie preferences via your browser settings or our cookie consent banner. Some features may not function properly without certain cookies.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">9. Data Security</h2>
            <p className="text-sm text-slate-700">We implement appropriate technical and organisational measures to protect personal data against unauthorised or unlawful processing, accidental loss, destruction or damage. These measures include:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Encryption in transit (TLS 1.3) and at rest (AES-256).</li>
              <li>Access controls, multi-factor authentication, and role-based permissions.</li>
              <li>Regular security assessments, penetration testing, and vulnerability scanning.</li>
              <li>Secure backup and disaster recovery procedures.</li>
              <li>Employee training on data protection and security practices.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">No system is perfect — if we become aware of a personal data breach we will notify affected parties and regulators as required by law within 72 hours.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">10. Automated Decision Making</h2>
            <p className="text-sm text-slate-700">We use automated processing to provide compliance assistance and document analysis. This includes:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Automated compliance checking against regulatory standards.</li>
              <li>AI-powered document categorization and analysis.</li>
              <li>Risk scoring for compliance gaps and issues.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">You have the right to obtain human intervention, express your point of view, and contest automated decisions. Contact us if you wish to exercise these rights.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">11. Your Rights</h2>
            <p className="text-sm text-slate-700">Subject to local law, individuals may have rights including:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li><strong>Right to access:</strong> Request a copy of personal data we hold about you.</li>
              <li><strong>Right to rectification:</strong> Request correction of inaccurate data.</li>
              <li><strong>Right to erasure:</strong> Request deletion of your data in certain circumstances.</li>
              <li><strong>Right to restrict processing:</strong> Request limitation of how we process your data.</li>
              <li><strong>Right to data portability:</strong> Request your data in a structured, machine-readable format.</li>
              <li><strong>Right to object:</strong> Object to processing based on legitimate interests or for direct marketing.</li>
              <li><strong>Rights related to automated decision making:</strong> Human intervention and contest automated decisions.</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">To exercise your rights, contact us at <a href="mailto:support@cg360.co.uk" className="underline">support@cg360.co.uk</a>. We will respond to requests within 30 days and may require verification of your identity.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">12. Children</h2>
            <p className="text-sm text-slate-700">Our Service is not directed to children under 13. We do not knowingly collect personal data from children under 13. If you believe we have collected personal data from a child, please contact us immediately.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">13. Changes to this Policy</h2>
            <p className="text-sm text-slate-700">We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the effective date. Where required by law we will provide additional notice of material changes via email or platform notification.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">14. Contact Us</h2>
            <p className="text-sm text-slate-700">If you have questions or requests regarding this Privacy Policy or our data practices, please contact:</p>
            <div className="bg-gray-50 p-4 rounded-lg mt-2">
              <p className="text-sm text-slate-700"><strong>Data Protection Officer:</strong> Jamie Mason Wright</p>
              <p className="text-sm text-slate-700"><strong>Email:</strong> <a href="mailto:support@cg360.co.uk" className="underline">support@cg360.co.uk</a></p>
              <p className="text-sm text-slate-700"><strong>Address:</strong> [Company Address to be inserted]</p>
              <p className="text-sm text-slate-700"><strong>Phone:</strong> [Contact number to be inserted]</p>
            </div>
            <p className="text-sm text-slate-700 mt-2">We will respond to privacy-related enquiries within 30 days.</p>
          </section>

          <div className="mt-6 text-sm text-muted-foreground">This privacy policy is designed to comply with UK GDPR and Data Protection Act 2018 requirements. It should be reviewed by your legal advisor before implementation to ensure compliance with your specific circumstances.</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
