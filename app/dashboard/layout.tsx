'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Legacy layout redirect — all old /dashboard/* routes now live at /admin/*
export default function OldDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/dashboard'); }, [router]);
  return null;
}
