import { Bot, Sparkles } from "lucide-react";

export default function AgentPage() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <section className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bot className="h-8 w-8" aria-hidden="true" />
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Coming soon
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-black">
          Meet your job search agent
        </h1>
        <p className="text-lg text-muted-foreground">
          We&apos;re building a smarter way to discover opportunities and manage
          your job search. Check back soon.
        </p>
      </section>
    </main>
  );
}