import Link from "next/link";
import { Button } from "@/components/ui/button"
import { ArrowRight, Briefcase, CheckCircle2, TrendingUp } from "lucide-react";
import ImageTabs from "@/components/image-tabs";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex-1">
        {/* titles section */}
        <section className="container mx-auto px-4 py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-black mb-6 text-5xl font-bold">
              Scout jobs and track applications with <span className="text-primary">Kanscout</span>
            </h1>
            <p className="text-muted-foreground mb-10 text-xl max-w-2xl mx-auto">
              An intuitive visual Kanban board designed for looking for jobs, organizing your job search, and tracking every application from discovery to offer.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 text-lg font-medium">
                  Start for free <ArrowRight className="ml-3"/>
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">Free forever. No credit card required</p>
            </div>
          </div>
        </section>
        {/* hero images */}
        <ImageTabs/>
        {/* features section */}
        <section className="border-t border-gray-200 bg-white py-24">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 md:grid-cols-3">
              <div className="flex flex-col">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-semibold text-black">
                  Scout Opportunities
                </h3>
                <p className="text-muted-foreground">
                  Organize your job search seamlessly. Store target roles and customize Kanban columns for every stage of looking for a job.
                </p>
              </div>
              <div className="flex flex-col">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-semibold text-black">
                  Kanban Application Tracker
                </h3>
                <p className="text-muted-foreground">
                  Track job application progress from wishlist to interview to final offer with drag-and-drop visual Kanban boards.
                </p>
              </div>
              <div className="flex flex-col">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-semibold text-black">
                  All-in-One Dashboard
                </h3>
                <p className="text-muted-foreground">
                  Never lose track of a job application. Keep all notes, interview schedules, and application statuses in one central place with Kanscout.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
