import Link from "next/link";
import { redirect } from "next/navigation";
import CircularProgressBar from "@/components/profile/profile-completeness";
import JobListing from "@/components/scout/job-listing";
import { getSession } from "@/lib/auth/auth";
import { initializeUserBoard } from "@/lib/init-user-board";
import { JobApplication, Profile } from "@/lib/models";
import { Bot, CheckCircle2, Circle } from "lucide-react";
import { Suspense } from "react";

async function AgentPageContent() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const [savedApplications, profile] = await Promise.all([
    JobApplication.find({
      userId: session.user.id,
      jobUrl: { $exists: true, $ne: "" },
    })
      .select("jobUrl")
      .limit(500)
      .lean(),
    Profile.findOne({ userId: session.user.id })
      .select("skills workExperience education personalInfo.links.portfolio certifications")
      .lean(),
  ]);

  const profileTasks = [
    { id: 1, label: "Skills added", done: Boolean(profile?.skills?.length) },
    {
      id: 2,
      label: "Work experience added",
      done: Boolean(profile?.workExperience?.length),
    },
    {
      id: 3,
      label: "Education details",
      done: Boolean(profile?.education?.length),
    },
    {
      id: 4,
      label: "Portfolio link attached",
      done: Boolean(profile?.personalInfo?.links?.portfolio),
    },
    {
      id: 5,
      label: "Certifications uploaded",
      done: Boolean(profile?.certifications?.length),
    },
  ];
  const profileProgress = Math.round(
    (profileTasks.filter((task) => task.done).length / profileTasks.length) *
      100,
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Scout Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Discover open roles and find the ones that fit your experience.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Profile completeness</h2>

              </div>
              <CircularProgressBar
                progress={profileProgress}
                size={112}
                strokeWidth={9}
              />
              <div className="mt-4 space-y-2 border-t pt-4">
                {profileTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    {task.done ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="size-3.5 shrink-0 text-muted-foreground/50" />
                    )}
                    <span
                      className={
                        task.done
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {task.label}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/profile"
                className="mt-4 flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
              >
                Complete your profile
              </Link>
            </section>

            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Bot className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">AI Application Status</h2>
                  <p className="text-xs text-muted-foreground">
                    Track your agent&apos;s progress
                  </p>
                </div>
              </div>
              <p className="mb-4 text-xs leading-5 text-muted-foreground">
                See which jobs your AI agent is preparing applications for,
                applying to, and following up on.
              </p>
              <div className="flex h-9 items-center justify-center rounded-lg border bg-muted/50 px-3 text-xs font-medium text-muted-foreground">
                Application tracking coming soon
              </div>
            </section>
          </aside>

          <JobListing
            initialSavedUrls={savedApplications
              .map((application) => application.jobUrl)
              .filter((url): url is string => Boolean(url))}
          />
        </div>
      </div>
    </main>
  );
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
            Loading job scout…
          </div>
        </main>
      }
    >
      <AgentPageContent />
    </Suspense>
  );
}
