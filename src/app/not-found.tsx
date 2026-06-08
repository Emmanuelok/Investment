import Link from "next/link";
import { Eye } from "@/components/icons";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="grid h-14 w-14 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
        <Eye width={28} height={28} />
      </span>
      <div className="mt-5 font-mono text-2xs uppercase tracking-widest text-dim">Error · 404</div>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Signal not found</h1>
      <p className="mt-2 max-w-md text-sm text-dim">
        This route isn&apos;t in the fabric. Use <kbd className="rounded border border-line bg-elevated px-1.5 py-0.5 font-mono text-2xs">⌘K</kbd> to jump
        to any workspace, or return to the Command Overview.
      </p>
      <Link href="/" className="btn btn-accent mt-6">
        Back to Command Overview
      </Link>
    </div>
  );
}
