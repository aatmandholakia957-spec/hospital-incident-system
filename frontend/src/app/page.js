'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="loading-screen">
      <div className="spinner spinner-lg"></div>
      <p>Loading...</p>
    </div>
  );
}
