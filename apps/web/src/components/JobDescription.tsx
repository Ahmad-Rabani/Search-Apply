import { formatJobDescription } from "../utils/formatJobDescription";

export function JobDescription({ text }: { text: string }) {
  const blocks = formatJobDescription(text);

  if (!blocks.length) {
    return <p className="text-sm text-teal-950/60">No description provided.</p>;
  }

  return (
    <div className="space-y-4 text-sm leading-relaxed text-teal-950/80">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3
              key={i}
              className="border-b border-teal-900/10 pb-1 font-semibold tracking-wide text-teal-950"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="max-w-prose">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
