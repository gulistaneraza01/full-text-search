// Renders text where matches are wrapped in \u0002…\u0003 markers by the API.
// Splitting on markers (instead of injecting HTML) keeps this XSS-safe.
export function Highlight({ text, fallback }: { text?: string; fallback: string }) {
  const parts = (text ?? fallback).split(/(\u0002[^\u0003]*\u0003)/);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("\u0002") ? (
          <mark key={i} className="rounded-[3px] bg-mark px-0.5 text-ink">
            {part.slice(1, -1)}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
