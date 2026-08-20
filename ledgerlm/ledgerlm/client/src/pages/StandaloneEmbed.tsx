type StandalonePage = "boards" | "enterprise-data";

const pageDetails: Record<
  StandalonePage,
  { title: string; description: string; path: string }
> = {
  boards: {
    title: "Boards (Standalone)",
    description: "Create and explore standalone financial boards.",
    path: "/boards",
  },
  "enterprise-data": {
    title: "Enterprise Data (Standalone)",
    description: "Manage the standalone app's sample and uploaded datasets.",
    path: "/enterprise-data",
  },
};

export default function StandaloneEmbed({ page }: { page: StandalonePage }) {
  const details = pageDetails[page];

  return (
    <section className="flex h-full min-h-0 flex-col bg-muted/20">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-background px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Standalone workspace
          </p>
          <h1 className="mt-0.5 text-xl font-semibold">{details.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {details.description}
          </p>
        </div>
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Embedded view
        </span>
      </header>

      <div className="min-h-0 flex-1 bg-background p-4">
        <iframe
          title={details.title}
          src={`/standalone-boards${details.path}?embedded=1`}
          className="h-full w-full rounded-xl border bg-white shadow-sm"
          allow="clipboard-write"
          data-testid={`iframe-standalone-${page}`}
        />
      </div>
    </section>
  );
}