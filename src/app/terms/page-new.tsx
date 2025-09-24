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

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Effective Date:</strong> 24 September 2025<br />
              <strong>Last Updated:</strong> 24 September 2025<br />
              <strong>Version:</strong> 1.0
            </p>
          </div>

          <p className="mb-4 text-slate-700">These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("Customer", "you", or "your") and CG-360 ("we", "us", or "our") governing your access to and use of our AI-powered care home compliance platform and related services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you must not access or use the Service.</p>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">1. Definitions</h2>
            <p className="text-sm text-slate-700">In these Terms:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li><strong>"AI Features"</strong> means the artificial intelligence and machine learning capabilities provided by the Service, including document analysis, compliance checking, and automated reporting.</li>
              <li><strong>"Business Day"</strong> means any day except Saturday, Sunday, or public holiday in England.</li>
              <li><strong>"Confidential Information"</strong> means any information disclosed by one party to the other that is marked as confidential or that reasonably should be understood to be confidential.</li>
              <li><strong>"Customer Data"</strong> means any data, information, or materials uploaded, submitted, or otherwise provided by you to the Service.</li>
              <li><strong>"Effective Date"</strong> means the date you first accept these Terms or begin using the Service.</li>
              <li><strong>"Intellectual Property Rights"</strong> means all patents, copyrights, trademarks, trade secrets, and other intellectual property rights.</li>
              <li><strong>"Service"</strong> means the CG-360 platform, including all features, functionality, AI capabilities, and related services provided by us.</li>
              <li><strong>"Subscription Term"</strong> means the period for which you have subscribed to the Service.</li>
              <li><strong>"User"</strong> means any individual authorized by you to access and use the Service.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">2. About CG-360</h2>
            <p className="text-sm text-slate-700">CG-360 is a Software-as-a-Service (SaaS) platform providing AI-powered governance, compliance, and management tools specifically designed for care homes and residential care providers. Our company is registered in the United Kingdom with company number [Insert Company Number] and our registered office at [Insert Registered Address].</p>
            <p className="text-sm text-slate-700 mt-2">The Service includes:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Document management and storage</li>
              <li>AI-powered compliance checking and reporting</li>
              <li>Staff management and training tracking</li>
              <li>CQC inspection preparation tools</li>
              <li>Automated audit and evidence generation</li>
              <li>Real-time compliance monitoring</li>
              <li>Secure data hosting and backup</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">3. Eligibility and Account Registration</h2>
            <p className="text-sm text-slate-700">To use the Service, you must:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Be at least 18 years old and have the legal capacity to enter into these Terms</li>
              <li>Be authorized to act on behalf of a care home, residential care provider, or similar organization</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Be responsible for all activities that occur under your account</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">You agree to notify us immediately of any unauthorized use of your account or any other breach of security.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">4. Subscription and Fees</h2>
            <p className="text-sm text-slate-700"><strong>Subscription Model:</strong> The Service is provided on a subscription basis with fixed monthly or annual fees.</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li><strong>Free Trial:</strong> We may offer a limited free trial period. Trial access automatically converts to a paid subscription unless cancelled before expiry.</li>
              <li><strong>14-Day Cancellation Right:</strong> You may cancel your subscription within 14 days of initial signup for a full refund, subject to fair usage limits.</li>
              <li><strong>Minimum Term:</strong> After the cancellation period, subscriptions are for a minimum 12-month term.</li>
              <li><strong>Auto-Renewal:</strong> Subscriptions automatically renew for successive 12-month terms unless cancelled with 30 days' written notice.</li>
              <li><strong>Payment Terms:</strong> All fees are due in advance, payable in GBP (£), and non-refundable except as expressly stated.</li>
              <li><strong>Late Payment:</strong> We may suspend Service access for overdue payments and charge interest at 8% above Bank of England base rate.</li>
              <li><strong>Price Changes:</strong> We may increase prices with 90 days' notice. Price increases apply to renewal terms.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">5. AI Features and Usage</h2>
            <p className="text-sm text-slate-700">The Service includes AI-powered features that use machine learning and natural language processing. By using AI features:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>You acknowledge that AI outputs may not be 100% accurate and should be reviewed by qualified professionals</li>
              <li>AI features are provided "as-is" and we do not guarantee specific outcomes or results</li>
              <li>You may opt-out of AI processing by contacting us, though this may limit Service functionality</li>
              <li>AI processing is performed by Google AI (Gemini) and OpenAI services under their respective terms</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2"><strong>AI Limitations:</strong> AI features are tools to assist with compliance tasks but do not constitute legal or professional advice. You must ensure AI outputs comply with applicable laws and regulations.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">6. Acceptable Use and Prohibited Activities</h2>
            <p className="text-sm text-slate-700">You agree to use the Service only for lawful business purposes related to care home operations and compliance. You must not:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Use the Service in violation of applicable laws, regulations, or these Terms</li>
              <li>Upload or process illegal, harmful, offensive, or inappropriate content</li>
              <li>Attempt to gain unauthorized access, reverse engineer, or interfere with the Service</li>
              <li>Use the Service to process sensitive personal data without proper legal basis</li>
              <li>Share account credentials or allow unauthorized access</li>
              <li>Use automated tools to access the Service without permission</li>
              <li>Transmit viruses, malware, or other harmful code</li>
              <li>Use the Service in ways that could damage our reputation or operations</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">We reserve the right to suspend or terminate access for violations of this section.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">7. Data Protection and Security</h2>
            <p className="text-sm text-slate-700"><strong>Your Responsibilities:</strong></p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Ensure you have lawful basis for processing any personal data uploaded to the Service</li>
              <li>Obtain necessary consents and provide privacy notices to data subjects</li>
              <li>Implement appropriate security measures for data you control</li>
              <li>Report data breaches affecting Customer Data within 24 hours</li>
              <li>Comply with UK GDPR and Data Protection Act 2018 requirements</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2"><strong>Our Responsibilities:</strong></p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Process Customer Data in accordance with our Privacy Policy and applicable law</li>
              <li>Implement appropriate technical and organizational security measures</li>
              <li>Report data breaches affecting Customer Data within 72 hours</li>
              <li>Assist with data subject rights requests where we process data as processor</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2"><strong>Data Ownership:</strong> You retain ownership of Customer Data. We act as data processor for personal data you upload. Please refer to our <Link href="/privacy" className="underline">Privacy Policy</Link> for detailed data processing information.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">8. Intellectual Property Rights</h2>
            <p className="text-sm text-slate-700"><strong>Our Intellectual Property:</strong> The Service, including all software, AI models, content, trademarks, and related materials, is owned by us or our licensors. These Terms do not grant you any rights to our intellectual property.</p>
            <p className="text-sm text-slate-700 mt-2"><strong>Your Intellectual Property:</strong> You retain ownership of Customer Data and any intellectual property rights therein. By using the Service, you grant us a limited, non-exclusive license to host, process, and display Customer Data as necessary to provide the Service.</p>
            <p className="text-sm text-slate-700 mt-2"><strong>Feedback:</strong> Any feedback, suggestions, or improvements you provide may be used by us without restriction or compensation.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">9. Service Availability and Support</h2>
            <p className="text-sm text-slate-700"><strong>Service Availability:</strong> We aim for 99.5% uptime but do not guarantee uninterrupted access. The Service may be unavailable for maintenance, upgrades, or circumstances beyond our control.</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li><strong>Scheduled Maintenance:</strong> We will provide reasonable notice for planned downtime</li>
              <li><strong>Emergency Maintenance:</strong> May occur without notice if required for security or stability</li>
              <li><strong>Service Credits:</strong> For downtime exceeding agreed levels, we may provide service credits</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2"><strong>Support:</strong> We provide email support during business hours. Response times vary by support tier. Premium support includes priority response and phone support.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">10. Warranties and Disclaimers</h2>
            <p className="text-sm text-slate-700"><strong>Our Warranties:</strong> We warrant that:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>The Service will perform substantially as described in our documentation</li>
              <li>We have the right to provide the Service to you</li>
              <li>The Service will not contain viruses or other harmful code (subject to your proper use)</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2"><strong>Disclaimers:</strong> Except as expressly stated above, the Service is provided "as is" without warranties of any kind. We disclaim all implied warranties, including merchantability, fitness for purpose, and non-infringement. AI features are experimental and may produce inaccurate results.</p>
            <p className="text-sm text-slate-700 mt-2"><strong>CQC Compliance:</strong> The Service assists with CQC compliance but does not guarantee compliance or inspection outcomes. You remain responsible for ensuring your operations meet regulatory requirements.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">11. Limitation of Liability</h2>
            <p className="text-sm text-slate-700">To the maximum extent permitted by law:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Our total liability for any claim shall not exceed the total fees paid in the 12 months preceding the claim</li>
              <li>We shall not be liable for indirect, incidental, consequential, or special damages</li>
              <li>We shall not be liable for loss of profits, business interruption, or data loss</li>
              <li>Liability for data breaches is limited to our processing obligations under applicable law</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">These limitations apply even if we have been advised of the possibility of such damages.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">12. Indemnification</h2>
            <p className="text-sm text-slate-700">You agree to indemnify and hold us harmless from any claims, damages, losses, or expenses arising from:</p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Your breach of these Terms</li>
              <li>Your use of the Service in violation of applicable law</li>
              <li>Your processing of personal data without proper legal basis</li>
              <li>Any third-party claims related to Customer Data you upload</li>
              <li>Your violation of intellectual property rights</li>
            </ul>
            <p className="text-sm text-slate-700 mt-2">We will indemnify you for claims that the Service infringes third-party intellectual property rights, subject to your prompt notification and our right to modify or replace the infringing elements.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">13. Termination</h2>
            <p className="text-sm text-slate-700"><strong>Termination by You:</strong> You may terminate your subscription at any time, but fees remain payable for the current term. No refunds for early termination except as required by law.</p>
            <p className="text-sm text-slate-700 mt-2"><strong>Termination by Us:</strong> We may suspend or terminate your access if you breach these Terms, fail to pay, or if continued provision would violate applicable law. We will provide reasonable notice except in urgent circumstances.</p>
            <p className="text-sm text-slate-700 mt-2"><strong>Effect of Termination:</strong></p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>Your right to use the Service ceases immediately</li>
              <li>We may delete Customer Data after a reasonable retention period</li>
              <li>Payment obligations for the current term remain due</li>
              <li>Sections 5, 7, 8, 10, 11, 12, 14, and 15 survive termination</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">14. Force Majeure</h2>
            <p className="text-sm text-slate-700">Neither party shall be liable for failure to perform obligations due to circumstances beyond reasonable control, including natural disasters, pandemics, war, terrorism, strikes, or government restrictions. We will use reasonable efforts to resume normal operations.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">15. Governing Law and Dispute Resolution</h2>
            <p className="text-sm text-slate-700"><strong>Governing Law:</strong> These Terms are governed by the laws of England and Wales.</p>
            <p className="text-sm text-slate-700 mt-2"><strong>Dispute Resolution:</strong></p>
            <ul className="list-disc pl-6 mt-2 text-sm text-slate-700 space-y-1">
              <li>We encourage amicable resolution through discussion</li>
              <li>Disputes may be referred to mediation before court proceedings</li>
              <li>The courts of England and Wales have exclusive jurisdiction</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">16. Severability and Entire Agreement</h2>
            <p className="text-sm text-slate-700"><strong>Severability:</strong> If any provision is held invalid, the remaining provisions remain in effect.</p>
            <p className="text-sm text-slate-700 mt-2"><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy and any signed agreements, constitute the entire agreement between us.</p>
            <p className="text-sm text-slate-700 mt-2"><strong>Waiver:</strong> Failure to enforce any provision does not constitute waiver of that or other provisions.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">17. Changes to Terms</h2>
            <p className="text-sm text-slate-700">We may update these Terms to reflect changes in our Service, technology, legal requirements, or business practices. Material changes will be notified via email or platform notice with 30 days' advance notice. Continued use after changes take effect constitutes acceptance.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">18. Contact Information</h2>
            <p className="text-sm text-slate-700">For questions about these Terms or the Service:</p>
            <div className="bg-gray-50 p-4 rounded-lg mt-2">
              <p className="text-sm text-slate-700"><strong>Support:</strong> <a href="mailto:support@cg360.co.uk" className="underline">support@cg360.co.uk</a></p>
              <p className="text-sm text-slate-700"><strong>Data Protection Officer:</strong> Jamie Mason Wright</p>
              <p className="text-sm text-slate-700"><strong>Registered Office:</strong> 10 Quarry Court, Wilnecote, Tamworth</p>
              <p className="text-sm text-slate-700"><strong>Company Number:</strong> 16656447</p>
            </div>
            <p className="text-sm text-slate-700 mt-2">We aim to respond to enquiries within 5 business days.</p>
          </section>

          <div className="mt-6 text-sm text-muted-foreground">These Terms are designed to comply with UK consumer and business regulations. They should be reviewed by your legal advisor before acceptance.</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
