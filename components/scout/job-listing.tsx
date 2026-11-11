"use client";

import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { addScoutedJobToWishlist } from "@/lib/actions/scouted-job";
import {
  scoreJobsForCurrentUser,
  type JobMatchActionResult,
} from "@/lib/actions/job-match";
import { JOB_SOURCE_LABELS } from "@/lib/job-source";
import type { ScoutedJob, ScoutedJobsResult } from "@/lib/scout/jobs";
import {
  formatJobPostedAt,
  getScoutedJobPage,
  SCOUT_JOBS_PER_PAGE,
} from "@/lib/scout/pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bookmark,
  BriefcaseBusiness,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";

interface JobListingProps {
  initialSavedUrls: string[];
}

type ScoreState =
  | { status: "loading" }
  | { status: "scored"; score: number }
  | { status: "unavailable" };

function isScoutedJobsResult(value: unknown): value is ScoutedJobsResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    Array.isArray(result.jobs) &&
    Array.isArray(result.unavailableSources) &&
    result.jobs.every(
      (job) =>
        typeof job === "object" &&
        job !== null &&
        typeof (job as Record<string, unknown>).url === "string",
    )
  );
}

function isRemoteMatch(job: ScoutedJob) {
  return /remote|work from home|wfh/i.test(
    `${job.title} ${job.location} ${job.snippet}`,
  );
}

function isHybridMatch(job: ScoutedJob) {
  return /hybrid/i.test(`${job.title} ${job.location} ${job.snippet}`);
}

function isOfficeMatch(job: ScoutedJob) {
  return /on[- ]?site|in[- ]office|office/i.test(
    `${job.title} ${job.location} ${job.snippet}`,
  );
}

export default function JobListing({
  initialSavedUrls,
}: JobListingProps) {
  const [jobs, setJobs] = useState<ScoutedJob[]>([]);
  const [page, setPage] = useState(1);
  const [savedUrls, setSavedUrls] = useState(() => new Set(initialSavedUrls));
  const [scores, setScores] = useState<Record<string, ScoreState>>({});
  const [searchText, setSearchText] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("all");
  const [minimumScore, setMinimumScore] = useState("any");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [unavailableSources, setUnavailableSources] = useState<string[]>([]);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [selectedJob, setSelectedJob] = useState<ScoutedJob | null>(null);
  const [aiNotice, setAiNotice] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const modeFilteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (workMode === "remote" && !isRemoteMatch(job)) return false;
        if (workMode === "hybrid" && !isHybridMatch(job)) return false;
        if (workMode === "office" && !isOfficeMatch(job)) return false;
        return true;
      }),
    [jobs, workMode],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(modeFilteredJobs.length / SCOUT_JOBS_PER_PAGE),
  );
  const pageJobs = useMemo(
    () => getScoutedJobPage(modeFilteredJobs, page),
    [modeFilteredJobs, page],
  );
  const visibleJobs = useMemo(() => {
    const minScore =
      minimumScore === "any" ? null : Number.parseInt(minimumScore, 10);
    if (minScore === null) return pageJobs;
    return pageJobs.filter((job) => {
      const score = scores[job.url];
      return (
        score?.status === "loading" ||
        (score?.status === "scored" && score.score >= minScore)
      );
    });
  }, [minimumScore, pageJobs, scores]);

  useEffect(() => {
    let active = true;
    setScoreError(null);
    setScores(
      Object.fromEntries(
        pageJobs.map((job) => [
          job.url,
          { status: "loading" },
        ]),
      ),
    );

    if (pageJobs.length === 0) return () => {
      active = false;
    };

    const scoreJobs = async () => {
      try {
        const result: JobMatchActionResult = await scoreJobsForCurrentUser(
          pageJobs.map(({ url }) => ({ url })),
        );
        if (!active) return;

        if ("error" in result) {
          setScoreError(result.error);
          setScores(
            Object.fromEntries(
              pageJobs.map((job) => [job.url, { status: "unavailable" }]),
            ),
          );
          return;
        }

        const scoreByUrl = new Map(
          result.scores.map(({ url, score }) => [url, score]),
        );
        setScores(
          Object.fromEntries(
            pageJobs.map((job) => {
              const score = scoreByUrl.get(job.url);
              return [
                job.url,
                typeof score === "number"
                  ? { status: "scored", score }
                  : { status: "unavailable" },
              ];
            }),
          ),
        );
      } catch (scoreRequestError) {
        console.error("[Agent Jobs] Could not score listings:", scoreRequestError);
        if (!active) return;  
        setScoreError("Match scoring is temporarily unavailable.");
        setScores(
          Object.fromEntries(
            pageJobs.map((job) => [job.url, { status: "unavailable" }]),
          ),
        );
      }
    };

    void scoreJobs();
    return () => {
      active = false;
    };
  }, [pageJobs]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    setScoreError(null);

    const params = new URLSearchParams({
      q: searchText.trim(),
      location: location.trim(),
    });

    try {
      const response = await fetch(`/api/agent/jobs?${params.toString()}`, {
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to search jobs right now.";
        throw new Error(message);
      }
      if (!isScoutedJobsResult(payload)) {
        throw new Error("The job search returned an invalid response.");
      }

      setJobs(payload.jobs);
      setUnavailableSources(payload.unavailableSources);
      setPage(1);
      setHasSearched(true);
    } catch (searchError) {
      console.error("[Agent Jobs] Search request failed:", searchError);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Unable to search jobs right now.",
      );
    } finally {
      setSearching(false);
    }
  }

  async function saveToWishlist(job: ScoutedJob) {
    setSavingUrl(job.url);
    setSaveErrors((current) => {
      const next = { ...current };
      delete next[job.url];
      return next;
    });

    try {
      const result = await addScoutedJobToWishlist(job);
      if ("error" in result) throw new Error(result.error);
      setSavedUrls((current) => new Set(current).add(job.url));
    } catch (saveError) {
      console.error("[Agent Jobs] Could not save job to Wish List:", saveError);
      setSaveErrors((current) => ({
        ...current,
        [job.url]:
          saveError instanceof Error
            ? saveError.message
            : "Unable to add this job to your Wish List.",
      }));
    } finally {
      setSavingUrl(null);
    }
  }

  function openManualApplication() {
    if (!selectedJob) return;
    window.open(selectedJob.url, "_blank", "noopener,noreferrer");
    setSelectedJob(null);
  }

  function showApplyOptions(job: ScoutedJob) {
    setAiNotice(false);
    setSelectedJob(job);
  }

  return (
    <section className="min-w-0 space-y-4">
      <form
        ref={formRef}
        onSubmit={handleSearch}
        className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Job title, tech stack, or company
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              maxLength={120}
              placeholder="e.g. React engineer, Python, Stripe"
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20"
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Location
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={80}
              placeholder="e.g. Jakarta, Remote, Bali"
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20"
            />
          </label>
          <Button type="submit" disabled={searching} className="h-10">
            {searching ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Search />
            )}
            Search jobs
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          <span className="mr-1 text-xs text-muted-foreground">Work mode</span>
          {[
            ["all", "All"],
            ["remote", "Remote"],
            ["hybrid", "Hybrid"],
            ["office", "Office"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setWorkMode(value);
                setPage(1);
              }}
              aria-pressed={workMode === value}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                workMode === value
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            Minimum match
            <select
              value={minimumScore}
              onChange={(event) => setMinimumScore(event.target.value)}
              className="h-8 rounded-lg border bg-background px-2 text-foreground outline-none focus-visible:border-primary"
            >
              <option value="any">Any score</option>
              <option value="50">50%+</option>
              <option value="70">70%+</option>
              <option value="85">85%+</option>
            </select>
          </label>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            className="shrink-0 font-medium underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}
      {unavailableSources.length > 0 && (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          Some job sources could not be reached:{" "}
          {unavailableSources
            .map((source) => source.charAt(0).toUpperCase() + source.slice(1))
            .join(", ")}
          .
        </p>
      )}
      {scoreError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
          <div className="flex items-start gap-2.5 text-foreground">
            <Sparkles className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">
                {scoreError === "Add profile details to get a match score."
                  ? "Want to see your personalized match scores?"
                  : scoreError}
              </p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                {scoreError === "Add profile details to get a match score."
                  ? "No CV required! Simply add a few skills or your job title in your profile to unlock AI-powered match scores."
                  : "Listings are still available; match scores will show as “Not scored”."}
              </p>
            </div>
          </div>
          {scoreError === "Add profile details to get a match score." && (
            <Link
              href="/profile"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Complete Profile
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Job listings</h2>
          <p className="text-xs text-muted-foreground">
            {hasSearched
              ? `${modeFilteredJobs.length} of ${jobs.length} matching jobs`
              : "Search to find matching roles"}
          </p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:inline-flex">
          <Sparkles className="size-3.5" />
          AI Match
        </span>
      </div>

      {searching ? (
        <div className="flex min-h-40 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          Searching job boards…
        </div>
      ) : !hasSearched ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center">
          <BriefcaseBusiness className="mx-auto mb-3 size-8 text-muted-foreground/60" />
          <h3 className="font-medium">Ready when you are</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a job title, skill, company, or location and search to see
            matching jobs.
          </p>
        </div>
      ) : visibleJobs.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center">
          <BriefcaseBusiness className="mx-auto mb-3 size-8 text-muted-foreground/60" />
          <h3 className="font-medium">
            {jobs.length === 0
              ? "No jobs found"
              : "No jobs match these filters"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {jobs.length === 0
              ? "Try broadening your search and search again."
              : "Try changing your filters or lowering the minimum match score."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleJobs.map((job) => {
            const score = scores[job.url];
            const isSaved = savedUrls.has(job.url);

            return (
              <article
                key={job.id}
                className="rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/25 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-semibold text-primary">
                      {job.company.trim().charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {job.company}
                      </p>
                      <h3 className="mt-0.5 text-base font-semibold">
                        {job.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {job.location}
                        </span>
                        <span>{JOB_SOURCE_LABELS[job.source]}</span>
                        {job.postedAt && (
                          <time
                            dateTime={job.postedAt}
                            suppressHydrationWarning
                          >
                            {formatJobPostedAt(job.postedAt)}
                          </time>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-center gap-1 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      <Sparkles className="size-3.5" />
                      {score?.status === "scored"
                        ? `${score.score}% match`
                        : score?.status === "loading"
                          ? "Matching…"
                          : "Not scored"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Based on your profile
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View job details
                    <ExternalLink className="size-3" />
                  </a>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSaved || savingUrl === job.url}
                      onClick={() => void saveToWishlist(job)}
                    >
                      {savingUrl === job.url ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Bookmark />
                      )}
                      {isSaved ? "Saved to Wish List" : "Add to Wish List"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => showApplyOptions(job)}
                    >
                      Apply
                      <ExternalLink />
                    </Button>
                  </div>
                </div>
                {saveErrors[job.url] && (
                  <p role="alert" className="mt-3 text-xs text-destructive">
                    {saveErrors[job.url]}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Job listing pages"
          className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"
        >
          <p className="text-xs text-muted-foreground">
            Page {page} of {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </nav>
      )}

      <Dialog
        open={selectedJob !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose how to apply</DialogTitle>
            <DialogDescription>
              {selectedJob
                ? `${selectedJob.title} at ${selectedJob.company}`
                : "Select an application method."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Button type="button" onClick={openManualApplication}>
              Apply manually
              <ExternalLink />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiNotice(true)}
            >
              Apply with AI agent
              <Sparkles />
            </Button>
            {aiNotice && (
              <p role="status" className="text-xs text-muted-foreground">
                AI-assisted applications are not available yet. No application
                has been submitted.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
