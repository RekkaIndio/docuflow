import React from 'react';
import { Logo } from '@/components/icons/logo';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-xl w-full text-center">
        <div className="flex justify-center mb-6">
          <Logo className="h-24 w-24" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">CG-360</h1>
        <p className="text-lg text-gray-600 mb-6">We're getting things ready. This site will be live soon.</p>
        <div className="text-sm text-gray-500">If you need access, please contact the site administrator.</div>
      </div>
    </div>
  );
}
