export type Snapshot = {
  year: string;
  timestamp: string;
  date: string;
};

const CDX = "https://web.archive.org/cdx/search/cdx";
const AVAILABLE = "https://archive.org/wayback/available";

/** Normalize whatever a person types into a host the CDX server likes. */
export function cleanUrl(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

/** A human date like "Jan 2014" from a 14-digit wayback timestamp. */
function formatDate(ts: string): string {
  const y = ts.slice(0, 4);
  const m = Number(ts.slice(4, 6)) - 1;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m] ?? "Jan"} ${y}`;
}

// Probe cadence per year (Jan + Jul); dedupe collapses dead spans to real captures. Probes
// run a few at a time so the archive doesn't rate-limit a big parallel burst. The timeline
// is capped so it never needs to scroll; we down-sample evenly to keep the full span.
const PROBES_PER_YEAR = ["0101", "0701"];
const CONCURRENCY = 8;
const MAX_VERSIONS = 25;

/**
 * The full version timeline, newest first. The CDX size-scan is too slow and flaky to lean
 * on, so instead we probe the Availability API at a fixed cadence across the site's whole
 * lifespan. Each probe returns the closest real capture; deduping collapses the set to the
 * distinct snapshots over time. Reliable, and capped to a scroll-free count.
 */
export async function fetchVersions(url: string): Promise<Snapshot[]> {
  const clean = cleanUrl(url);
  const nowYear = new Date().getFullYear();

  // Two fast lookups bound the lifespan so we don't waste probes on dead years. If they flake
  // (the Availability API sometimes returns empty), fall back to a sensible default range
  // rather than giving up — the dedupe collapses any dead years anyway.
  const [earliest, latest] = await Promise.all([
    availableAt(clean, "19960101"),
    availableAt(clean, `${nowYear}1231`),
  ]);

  const startYear = earliest ? Number(earliest.slice(0, 4)) : 2000;
  const targets: string[] = [];
  for (let y = startYear; y <= nowYear; y++) {
    for (const md of PROBES_PER_YEAR) targets.push(`${y}${md}`);
  }

  const probed = await mapLimit(targets, CONCURRENCY, (t) => availableAt(clean, t));
  // Dedupe by month so we never show two windows with the same date label.
  const byMonth = new Map<string, string>();
  if (latest) byMonth.set(latest.slice(0, 6), latest);
  for (const ts of probed) if (ts && !byMonth.has(ts.slice(0, 6))) byMonth.set(ts.slice(0, 6), ts);

  if (byMonth.size === 0) {
    const fallback = await fetchLatestViaCdx(clean);
    return fallback ? [fallback] : [];
  }

  const ordered = [...byMonth.values()].sort((a, b) => b.localeCompare(a));
  return downsample(ordered, MAX_VERSIONS).map(toSnapshot);
}

function toSnapshot(ts: string): Snapshot {
  return { year: ts.slice(0, 4), timestamp: ts, date: formatDate(ts) };
}

/** Evenly thin a list to at most `n`, always keeping the first (newest) and last (oldest). */
function downsample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(items[Math.round((i * (items.length - 1)) / (n - 1))]);
  return [...new Set(out)];
}

/** Run an async map with bounded concurrency so we don't burst the archive into rate limits. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Closest real capture to a given date via the Availability API, or null. */
async function availableAt(clean: string, timestamp: string): Promise<string | null> {
  const res = await fetch(`${AVAILABLE}?url=${encodeURIComponent(clean)}&timestamp=${timestamp}`, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "teleport (wayback time machine)" },
  }).catch(() => null);

  const data = res && res.ok ? await res.json().catch(() => null) : null;
  return data?.archived_snapshots?.closest?.timestamp ?? null;
}

/** Last good HTML capture, via CDX. Slower than the Availability API but reliable. */
async function fetchLatestViaCdx(clean: string): Promise<Snapshot | null> {
  const params = new URLSearchParams({
    url: clean,
    output: "json",
    fl: "timestamp",
    limit: "-1",
    fastLatest: "true",
  });
  params.append("filter", "statuscode:200");
  params.append("filter", "mimetype:text/html");

  const res = await fetch(`${CDX}?${params}`, {
    signal: AbortSignal.timeout(25000),
    headers: { "User-Agent": "teleport (wayback time machine)" },
  });
  if (!res.ok) return null;

  const rows: string[][] = await res.json();
  const ts = rows?.[1]?.[0];
  return ts ? toSnapshot(ts) : null;
}

/** Toolbar-free archived page, ideal for embedding in a frame. */
export function embedUrl(timestamp: string, url: string): string {
  return `https://web.archive.org/web/${timestamp}if_/https://${cleanUrl(url)}`;
}
