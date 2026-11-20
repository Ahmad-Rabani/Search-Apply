import { Job } from "../models/Job.js";
import { stripHtml } from "../utils/html.js";

const FEEDS = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
  "https://weworkremotely.com/categories/full-stack-programming.rss",
  "https://weworkremotely.com/categories/front-end-programming.rss",
  "https://weworkremotely.com/categories/back-end-programming.rss",
];

type WwrItem = {
  title: string;
  link: string;
  guid: string;
  description: string;
  pubDate?: string;
  category?: string;
  region?: string;
};

export async function syncWeWorkRemotelyJobs(limit = 80) {
  const seen = new Set<string>();
  const items: WwrItem[] = [];

  for (const feed of FEEDS) {
    if (items.length >= limit) break;
    try {
      const res = await fetch(feed, {
        headers: {
          "User-Agent": "SearchAndApply/1.0",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      });
      if (!res.ok) {
        console.warn(`[weworkremotely] ${feed} → ${res.status}`);
        continue;
      }
      const xml = await res.text();
      for (const item of parseRssItems(xml)) {
        if (!item.guid || seen.has(item.guid)) continue;
        seen.add(item.guid);
        items.push(item);
        if (items.length >= limit) break;
      }
    } catch (err) {
      console.warn(`[weworkremotely] feed error`, err);
    }
  }

  let upserted = 0;
  for (const item of items) {
    const { company, title } = splitCompanyTitle(item.title);
    if (!title) continue;

    await Job.findOneAndUpdate(
      { source: "weworkremotely", externalId: item.guid },
      {
        source: "weworkremotely",
        externalId: item.guid,
        title,
        company: company || "Unknown",
        location: item.region || "Remote",
        url: item.link || item.guid,
        description: stripHtml(decodeXml(item.description || "")),
        tags: [item.category, "remote"].filter(Boolean).map(String),
        remote: true,
        postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return {
    source: "weworkremotely",
    upserted,
    totalFetched: items.length,
  };
}

function parseRssItems(xml: string): WwrItem[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  return blocks.map((block) => ({
    title: decodeXml(tagText(block, "title")),
    link: tagText(block, "link"),
    guid: tagText(block, "guid") || tagText(block, "link"),
    description: tagText(block, "description"),
    pubDate: tagText(block, "pubDate") || undefined,
    category: decodeXml(tagText(block, "category")) || undefined,
    region: decodeXml(tagText(block, "region")) || undefined,
  }));
}

function tagText(block: string, tag: string) {
  const cdata = block.match(
    new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i")
  );
  if (cdata?.[1] != null) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return (plain?.[1] || "").trim();
}

function decodeXml(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** WWR titles look like "Company: Role title" */
function splitCompanyTitle(raw: string) {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const idx = cleaned.indexOf(": ");
  if (idx === -1) return { company: "", title: cleaned };
  return {
    company: cleaned.slice(0, idx).trim(),
    title: cleaned.slice(idx + 2).trim(),
  };
}
