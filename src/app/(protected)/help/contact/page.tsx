import ContactForm from './form'

export const metadata = {
  title: 'Contact us - Docuflow',
}

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">Contact us</h1>
      <p className="text-sm text-muted-foreground mb-6">Fill in the form below and we'll respond within 48 hours.</p>
      <ContactForm />
    </div>
  )
}
