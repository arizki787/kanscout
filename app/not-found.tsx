import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-white px-4 text-center">
      <div className="mx-auto max-w-md">
        {/* Subtle Icon Container */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <SearchX className="h-8 w-8" />
        </div>

        {/* 404 Badge */}
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          404 Error
        </span>

        {/* Title & Description */}
        <h1 className="mt-4 text-3xl font-bold text-black sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been removed, renamed, or doesn&apos;t exist.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/">
            <Button className="w-full sm:w-auto font-medium">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto font-medium">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
