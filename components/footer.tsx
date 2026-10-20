'use client';

import Link from "next/link";
import { Briefcase } from "lucide-react";

export default function Footer() {
  const currentYear = 2026;

  return (
    <footer className="border-t border-gray-200 bg-white py-8 mt-auto">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
        <div className="flex items-center gap-2 text-primary font-semibold text-lg">
          <Briefcase className="h-5 w-5" />
          <span>KANSCOUT</span>
        </div>

        <p className="text-sm text-muted-foreground text-center md:text-left">
          &copy; {currentYear} Kanscout. Visual Kanban Board for Job Search & Application Tracking. All rights reserved.
        </p>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <Link href="/privacy" className="hover:text-black transition-colors font-medium text-gray-700">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
