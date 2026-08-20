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
        allow="clipboard-write"
        data-testid={`iframe-standalone-${page}`}
      />
    </section>
  );
}