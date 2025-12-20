'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } else {
      // If on server, just set checking to false
      setIsChecking(false);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-white">Loading...</div>
    </div>
  );
}