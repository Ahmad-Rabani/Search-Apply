export type JdBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

const HEADING_RE =
  /^(about( the)?( role| company| us| job)?|overview|summary|responsibilities|requirements|qualifications|what you.?ll do|what we.?re looking for|must[- ]?have|nice[- ]?to[- ]?have|benefits|perks|compensation|salary|location|who you are|the role|tech(nical)? stack|skills|experience|education|how to apply)\b[:\s-]*$/i;

export function formatJobDescription(raw: string): JdBlock[] {
  if (!raw?.trim()) return [];

  let text = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\u2022/g, "•")
    .trim();

  // If everything is one line, create soft breaks before common section labels
  if (!text.includes("\n") || text.split("\n").length < 3) {
    text = text
      .replace(
        /\s+(About the (?:Role|Company|Job|Us)|Responsibilities|Requirements|Qualifications|What You.?ll Do|What We.?re Looking For|Must[- ]?Haves?|Nice[- ]?to[- ]?Haves?|Benefits|Perks|Compensation|Technical Skills|Tech Stack|How to Apply)\b/gi,
        "\n\n$1\n"
      )
      .replace(/\s+[•●▪]\s+/g, "\n• ")
      .replace(/\s+(\d+[.)]\s+)/g, "\n$1")
      .replace(/\s+[-–—]\s+(?=[A-Z])/g, "\n• ");
  }

  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks: JdBlock[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({ type: "list", items: listBuffer });
      listBuffer = [];
    }
  };

  for (const line of lines) {
    const bullet = line.match(/^(?:[-*•●▪]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      listBuffer.push(bullet[1].trim());
      continue;
    }

    const maybeHeading = line.replace(/:$/, "").trim();
    const isShortHeading =
      line.length < 60 &&
      (HEADING_RE.test(maybeHeading) ||
        (/^[A-Z][A-Za-z0-9 /&-]{2,40}:?$/.test(line) && line.endsWith(":")));

    if (isShortHeading) {
      flushList();
      blocks.push({ type: "heading", text: maybeHeading.replace(/:$/, "") });
      continue;
    }

    flushList();

    // Break very long paragraphs into readable chunks
    if (line.length > 420) {
      const sentences = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [line];
      let chunk = "";
      for (const s of sentences) {
        const next = (chunk + " " + s.trim()).trim();
        if (next.length > 320 && chunk) {
          blocks.push({ type: "paragraph", text: chunk });
          chunk = s.trim();
        } else {
          chunk = next;
        }
      }
      if (chunk) blocks.push({ type: "paragraph", text: chunk });
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }

  flushList();
  return blocks;
}
