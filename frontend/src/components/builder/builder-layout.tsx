import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

type BuilderLayoutProps = {
  title: string;
  backTo: string;
  backLabel?: string;
  footer?: React.ReactNode;
  sourcePanel: React.ReactNode;
  canvasPanel: React.ReactNode;
};

export function BuilderLayout({
  title,
  backTo,
  backLabel = "Back",
  footer,
  sourcePanel,
  canvasPanel,
}: BuilderLayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button asChild variant="outline">
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x">
        <aside className="overflow-y-auto p-6">{sourcePanel}</aside>
        <section className="overflow-y-auto p-6">{canvasPanel}</section>
      </div>

      {footer && (
        <footer className="shrink-0 border-t px-6 py-4">{footer}</footer>
      )}
    </div>
  );
}
