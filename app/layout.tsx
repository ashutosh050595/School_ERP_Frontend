import type { Metadata } from 'next';
import { Nunito, Outfit } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const nunito = Nunito({ subsets:['latin'], variable:'--font-nunito', display:'swap' });
const outfit = Outfit({ subsets:['latin'], variable:'--font-outfit', display:'swap' });

export const metadata: Metadata = {
  title: 'EduNest — School Management System',
  description: 'Complete School ERP for Sacred Heart School Koderma',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${outfit.variable}`}>
      <body className="font-body bg-slate-50 text-slate-800 antialiased">
        {children}
        <Toaster position="top-right" toastOptions={{
          className:'!font-body !text-sm',
          success:{ iconTheme:{ primary:'#16a34a', secondary:'#fff' } },
          error:  { iconTheme:{ primary:'#dc2626', secondary:'#fff' } },
        }} />
      </body>
    </html>
  );
}
