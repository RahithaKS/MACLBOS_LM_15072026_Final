import Link from "next/link";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-[80vh] flex-col items-center justify-center rounded-2xl bg-surface">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">This area is not part of the Boards prototype yet.</p>
      <Link
        href="/boards"
        className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-white hover:bg-primary-hover"
      >
        Go to Boards
      </Link>
    </div>
  );
}
