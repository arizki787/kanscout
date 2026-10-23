import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy - Kanscout",
  description: "Learn how Kanscout collects, uses, and protects your personal data and job application information.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 20, 2026";

  return (
    <main className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-xs border border-gray-100 sm:p-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
              <Shield className="h-4 w-4" />
              <span>Legal & Transparency</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="leading-relaxed">
              Welcome to <strong>Kanscout</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). Kanscout provides a visual Kanban board and application tracking tool designed to streamline your job search. We value your privacy and are committed to protecting your personal information and application data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3 leading-relaxed">
              To provide and improve our services, we collect information that you directly provide to us and data generated through your use of the platform:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account Information:</strong> When you sign up, we collect your name, email address, and authentication credentials (hashed passwords for direct sign-ups or profile information provided via OAuth providers such as Google).
              </li>
              <li>
                <strong>Job Search & Tracker Data:</strong> Information you enter into your boards, columns, and application cards, including company names, job titles, salary estimates, application status, notes, interview dates, and target job URLs.
              </li>
              <li>
                <strong>Technical & Usage Data:</strong> IP addresses, browser types, device information, operating system, pages viewed, and session metrics automatically recorded when accessing Kanscout.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <p className="mb-3 leading-relaxed">
              We process your data for specific, limited purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To create and maintain your user account and personal job tracking boards.</li>
              <li>To send essential transactional and account verification communications via email.</li>
              <li>To store, display, and organize your job application tracker metrics and analytics.</li>
              <li>To analyze service performance, monitor technical health, and prevent unauthorized usage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p className="mb-3 leading-relaxed">
              We work with trusted third-party service providers to power Kanscout. We do not sell your personal data. Our third-party partners include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Better Auth & Google OAuth:</strong> For secure authentication and account identity management.
              </li>
              <li>
                <strong>MongoDB:</strong> For cloud data storage of user profiles, boards, and application entries.
              </li>
              <li>
                <strong>Resend:</strong> For dispatching transactional emails (e.g., account verification links).
              </li>
              <li>
                <strong>Google Analytics:</strong> For aggregate, pseudonymous usage analytics to improve website usability.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies and Analytics</h2>
            <p className="leading-relaxed">
              Kanscout uses essential session cookies to keep you signed in and store secure auth tokens. We also utilize Google Analytics to understand website traffic and user navigation trends. You can manage or disable cookies via your browser settings, though disabling essential cookies may impact account functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention & Security</h2>
            <p className="leading-relaxed">
              We employ industry-standard encryption and security measures to guard your data against unauthorized access, loss, or alteration. We retain your job tracker data for as long as your account remains active. You can request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights and Choices</h2>
            <p className="mb-3 leading-relaxed">
              Depending on your jurisdiction, you have rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access, correct, or update your personal account information.</li>
              <li>Request full account deletion and erasure of stored job board data.</li>
              <li>Opt out of non-essential analytics tracking.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Changes to This Privacy Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy periodically to reflect service updates or legal requirements. Updated versions will be posted on this page with a revised &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions or concerns regarding this Privacy Policy or your data, please contact us at{" "}
              <a href="mailto:adityarizkimuhammad25@gmail.com" className="text-primary underline hover:text-primary/80 font-medium">
                adityarizkimuhammad25@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
