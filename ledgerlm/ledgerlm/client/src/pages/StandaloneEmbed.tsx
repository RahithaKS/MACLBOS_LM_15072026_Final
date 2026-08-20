import { useLocation } from "wouter";

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
    <section className="h-full min-h-0 overflow-hidden bg-primary/10 p-6">
      <iframe
        title={details.title}
        src={`/standalone-boards${details.path}?embedded=1`}
        className="h-full w-full border-0 bg-transparent"
        loading="eager"
        allow="clipboard-write"
        data-testid={`iframe-standalone-${page}`}
      />
    </section>
  );
}

export function PersistentStandaloneFrames() {
  const [location] = useLocation();
  const activePage: StandalonePage | null =
    location === "/integrations/standalone-boards"
      ? "boards"
      : location === "/integrations/standalone-enterprise-data"
        ? "enterprise-data"
        : null;
  // Prewarm both documents after the authenticated shell mounts. They remain
  // mounted while native LedgerLM routes are active, so the first click after
  // a browser refresh does not have to cold-start a standalone Next.js app.
  const pagesToRender: StandalonePage[] = ["boards", "enterprise-data"];

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {pagesToRender.map((page) => {
        const isActive = page === activePage;
        return (
          <div
            key={page}
            className={`absolute inset-0 ${
              isActive
                ? "visible pointer-events-auto"
                : "invisible pointer-events-none"
            }`}
            aria-hidden={!isActive}
          >
            <StandaloneEmbed page={page} />
          </div>
        );
      })}
    </div>
  );
}