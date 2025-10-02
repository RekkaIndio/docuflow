"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RotasPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to dashboard with rotas view
    router.replace('/dashboard?view=rotas');
  }, [router]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
