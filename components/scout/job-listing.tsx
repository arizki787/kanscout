"use client";

import Link from "next/link";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { addScoutedJobToWishlist } from "@/lib/actions/scouted-job";
import {
  scoreJobsForCurrentUser,
  type JobMatchActionResult,
} from "@/lib/actions/job-match";
import { JOB_SOURCE_LABELS } from "@/lib/job-source";
import type { ScoutedJob, ScoutedJobsResult } from "@/lib/scout/jobs";
import { formatJobPostedAt } from "@/lib/scout/pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";

interface JobListingProps {
  initialSavedUrls: string[];
  profileProgress: number;
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
    typeof result.hasMore === "boolean" &&
    result.jobs.every(
      (job) =>
        typeof job === "object" &&
        job !== null &&
        typeof (job as Record<string, unknown>).url === "string",
    )
  );
}

async function fetchScoutedJobsPage(
  query: string,
  location: string,
  page: number,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ q: query, location, page: String(page) });
  const response = await fetch(`/api/agent/jobs?${params.toString()}`, {
    cache: "no-store",
    signal,
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
  return payload;
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
  profileProgress,
}: JobListingProps) {
  const [jobs, setJobs] = useState<ScoutedJob[]>([]);
  const [savedUrls, setSavedUrls] = useState(() => new Set(initialSavedUrls));
  const [scores, setScores] = useState<Record<string, ScoreState>>({});
  const [searchText, setSearchText] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("all");
  const [minimumScore, setMinimumScore] = useState("any");
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [unavailableSources, setUnavailableSources] = useState<string[]>([]);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [selectedJob, setSelectedJob] = useState<ScoutedJob | null>(null);
  const [aiNotice, setAiNotice] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchRequestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const searchControllerRef = useRef<AbortController | null>(null);
  const scoringUrlsRef = useRef(new Set<string>());
  const scoreGenerationRef = useRef(0);
  const activeSearchRef = useRef({ query: "", location: "" });

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
  const visibleJobs = useMemo(() => {
    const minScore =
      minimumScore === "any" ? null : Number.parseInt(minimumScore, 10);
    if (minScore === null) return modeFilteredJobs;
    return modeFilteredJobs.filter((job) => {
      const score = scores[job.url];
      return (
        score?.status === "loading" ||
        (score?.status === "scored" && score.score >= minScore)
      );
    });
  }, [minimumScore, modeFilteredJobs, scores]);

  useEffect(() => {
    const jobsToScore = jobs.filter((job) => !scoringUrlsRef.current.has(job.url));
    if (jobsToScore.length === 0) return;

    const scoreGeneration = scoreGenerationRef.current;
    for (const job of jobsToScore) scoringUrlsRef.current.add(job.url);
    setScores((current) => ({
      ...current,
      ...Object.fromEntries(
        jobsToScore.map((job) => [job.url, { status: "loading" }]),
      ),
    }));

    const scoreJobs = async () => {
      try {
        const result: JobMatchActionResult = await scoreJobsForCurrentUser(
          jobsToScore.map(({ url }) => ({ url })),
        );
        if (scoreGeneration !== scoreGenerationRef.current) return;

        if ("error" in result) {
          setScoreError(result.error);
          setScores((current) => ({
            ...current,
            ...Object.fromEntries(
              jobsToScore.map((job) => [job.url, { status: "unavailable" }]),
            ),
          }));
          return;
        }

        const scoreByUrl = new Map(
          result.scores.map(({ url, score }) => [url, score]),
        );
        setScores((current) => ({
          ...current,
          ...Object.fromEntries(
            jobsToScore.map((job) => {
              const score = scoreByUrl.get(job.url);
              return [
                job.url,
                typeof score === "number"
                  ? { status: "scored", score }
                  : { status: "unavailable" },
              ];
            }),
          ),
        }));
      } catch (scoreRequestError) {
        if (scoreGeneration !== scoreGenerationRef.current) return;
        console.error("[Agent Jobs] Could not score listings:", scoreRequestError);
        setScoreError("Match scoring is temporarily unavailable.");
        setScores((current) => ({
          ...current,
          ...Object.fromEntries(
            jobsToScore.map((job) => [job.url, { status: "unavailable" }]),
          ),
        }));
      }
    };

    void scoreJobs();
  }, [jobs]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = ++searchRequestIdRef.current;
    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setSearching(true);
    setLoadingMore(false);
    loadingMoreRef.current = false;
    setError(null);
    setScoreError(null);
    listRef.current?.scrollTo({ top: 0 });
    const query = searchText.trim();
    const searchedLocation = location.trim();

    try {
      const payload = await fetchScoutedJobsPage(
        query,
        searchedLocation,
        0,
        controller.signal,
      );
      if (requestId !== searchRequestIdRef.current) return;

      scoreGenerationRef.current += 1;
      scoringUrlsRef.current.clear();
      setLoadMoreError(null);
      setJobs(payload.jobs);
      setScores({});
      scoringUrlsRef.current.clear();
      activeSearchRef.current = { query, location: searchedLocation };
      setUnavailableSources(payload.unavailableSources);
      setNextPage(payload.hasMore ? 1 : null);
      setHasSearched(true);
      listRef.current?.scrollTo({ top: 0 });
    } catch (searchError) {
      if (requestId !== searchRequestIdRef.current) return;
      console.error("[Agent Jobs] Search request failed:", searchError);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Unable to search jobs right now.",
      );
    } finally {
      if (requestId === searchRequestIdRef.current) setSearching(false);
    }
  }

  const loadMore = useCallback(async () => {
    if (
      nextPage === null ||
      searching ||
      loadingMoreRef.current
    ) {
      return;
    }

    const requestId = searchRequestIdRef.current;
    const pageToLoad = nextPage;
    const controller = new AbortController();
    searchControllerRef.current?.abort();
    searchControllerRef.current = controller;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const payload = await fetchScoutedJobsPage(
        activeSearchRef.current.query,
        activeSearchRef.current.location,
        pageToLoad,
        controller.signal,
      );
      if (requestId !== searchRequestIdRef.current) return;

      setJobs((current) => {
        const existingUrls = new Set(current.map((job) => job.url));
        return [
          ...current,
          ...payload.jobs.filter((job) => !existingUrls.has(job.url)),
        ];
      });
      setUnavailableSources((current) => [
        ...new Set([...current, ...payload.unavailableSources]),
      ]);
      setNextPage(payload.hasMore ? pageToLoad + 1 : null);
      setLoadMoreError(null);
    } catch (loadError) {
      if (requestId !== searchRequestIdRef.current) return;
      console.error("[Agent Jobs] Could not load more listings:", loadError);
      setLoadMoreError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load more jobs right now.",
      );
    } finally {
      if (requestId === searchRequestIdRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [nextPage, searching]);

  useEffect(() => {
    const list = listRef.current;
    const sentinel = sentinelRef.current;
    if (
      !list ||
      !sentinel ||
      !hasSearched ||
      nextPage === null ||
      searching ||
      loadingMore ||
      loadMoreError
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { root: list, rootMargin: "160px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasSearched, loadMore, loadingMore, loadMoreError, nextPage, searching]);

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
    <section className="flex min-h-[70dvh] min-w-0 flex-col gap-4 lg:h-full lg:min-h-0">
      <form
        ref={formRef}
        onSubmit={handleSearch}
        className="shrink-0 rounded-xl border bg-card p-4 shadow-sm sm:p-5"
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
                listRef.current?.scrollTo({ top: 0 });
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
              onChange={(event) => {
                setMinimumScore(event.target.value);
                listRef.current?.scrollTo({ top: 0 });
              }}
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
          {scoreError === "Add profile details to get a match score." &&
            profileProgress < 100 && (
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
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {hasSearched
              ? `${modeFilteredJobs.length} matching jobs loaded`
              : "Search to find matching roles"}
          </p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:inline-flex">
          <Sparkles className="size-3.5" />
          AI Match
        </span>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
        role="region"
        aria-label="Job search results"
        tabIndex={0}
      >
        {searching ? (
          <div
            className="flex min-h-40 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground"
            role="status"
          >
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
        ) : visibleJobs.length === 0 && nextPage === null ? (
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
          <div className="space-y-1">
            {visibleJobs.map((job) => {
            const score = scores[job.url];
            const isSaved = savedUrls.has(job.url);

            return (
              <article
                key={job.id}
                className="group rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50 sm:px-3"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {job.company.trim().charAt(0).toUpperCase() || "?"}
                  </div>

                  <div className="min-w-0 flex-1 basis-[min(100%,18rem)]">
                    <h3 className="text-[15px] font-semibold leading-snug">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        title={job.title}
                        className="inline-flex max-w-full items-center gap-1 text-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        <span className="line-clamp-2 sm:line-clamp-1">
                          {job.title}
                        </span>
                        <ExternalLink className="size-3 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
                      </a>
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/75">
                        {job.company}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {job.location}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{JOB_SOURCE_LABELS[job.source]}</span>
                      {job.postedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <time
                            dateTime={job.postedAt}
                            suppressHydrationWarning
                          >
                            {formatJobPostedAt(job.postedAt)}
                          </time>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        score?.status === "scored"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {score?.status === "scored" && (
                        <Sparkles className="size-3" />
                      )}
                      {score?.status === "scored"
                        ? `${score.score}% match`
                        : score?.status === "loading"
                          ? "Matching…"
                          : "Not scored"}
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      disabled={isSaved || savingUrl === job.url}
                      onClick={() => void saveToWishlist(job)}
                      aria-label={
                        isSaved ? "Saved to Wish List" : "Add to Wish List"
                      }
                      title={
                        isSaved ? "Saved to Wish List" : "Add to Wish List"
                      }
                    >
                      {savingUrl === job.url ? (
                        <LoaderCircle className="animate-spin" />
                      ) : isSaved ? (
                        <BookmarkCheck />
                      ) : (
                        <Bookmark />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => showApplyOptions(job)}
                    >
                      Apply
                      <ArrowUpRight />
                    </Button>
                  </div>
                </div>
                {saveErrors[job.url] && (
                  <p role="alert" className="mt-1.5 pl-12 text-xs text-destructive">
                    {saveErrors[job.url]}
                  </p>
                )}
              </article>
            );
            })}
          </div>
        )}
        {hasSearched && nextPage !== null && (
          <div
            ref={sentinelRef}
            className="flex min-h-16 items-center justify-center text-sm text-muted-foreground"
            role="status"
          >
            {loadMoreError ? (
              <div className="flex items-center gap-3">
                <span>{loadMoreError}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => {
                    setLoadMoreError(null);
                    void loadMore();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : loadingMore ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Loading more jobs…
              </>
            ) : (
              "Scroll to load more jobs"
            )}
          </div>
        )}
        {hasSearched && !searching && nextPage === null && jobs.length > 0 && (
          <p
            className="py-4 text-center text-sm text-muted-foreground"
            role="status"
          >
            You&apos;ve reached the end of the job list.
          </p>
        )}
      </div>

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
