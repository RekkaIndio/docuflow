import { redirect } from 'next/navigation';

export default function AdminDashboardRedirect() {
  // Redirect to the existing admin index page
  redirect('/admin');
}
