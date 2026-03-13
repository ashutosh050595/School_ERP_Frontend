'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/utils';

export default function Root() {
  const router = useRouter();
  useEffect(() => { router.replace(isLoggedIn() ? '/dashboard' : '/login'); }, [router]);
  return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
}
