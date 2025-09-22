import Link from 'next/link'

export const metadata = {
  title: 'Help Center - CG360',
}

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">Help Center</h1>
      <p className="text-muted-foreground mb-6">Find answers to common questions and get in touch with our team.</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Frequently asked questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">How do I invite teammates to my workspace?</h3>
            <p className="text-sm text-muted-foreground">Go to the workspace settings and use the Invite section to send invitations by email.</p>
          </div>
          <div>
            <h3 className="font-medium">How do I connect documents?</h3>
            <p className="text-sm text-muted-foreground">Use the Documents area to upload or link external documents, then map them to policies or audits.</p>
          </div>
          <div>
            <h3 className="font-medium">Can I export reports?</h3>
            <p className="text-sm text-muted-foreground">Yes — look for the export or PDF options on audit and appraisal pages.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Still need help?</h2>
        <p className="text-sm text-muted-foreground mb-4">If you can't find an answer, contact our support team and we'll get back to you as soon as we can.</p>
        <Link href="/help/contact" className="inline-block">
          <button className="rounded-md bg-primary px-4 py-2 text-white">Contact us</button>
        </Link>
      </section>
    </div>
  )
}
