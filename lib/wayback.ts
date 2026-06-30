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
const MAX_VERSIONS = 20;

/**
 * The full version timeline, newest first. CDX (filtered to real HTML 200 captures, one per
 * month) is the source of truth — that keeps out redirects and non-page captures like Next.js
 * RSC payloads, which otherwise render as raw flight text in the frame. If CDX flakes, we fall
 * back to probing the Availability API across the lifespan, then to the single latest capture.
 */
export async function fetchVersions(url: string): Promise<Snapshot[]> {
  const clean = cleanUrl(url);

  const viaCdx = await fetchVersionsViaCdx(clean);
  if (viaCdx.length) return viaCdx;

  const viaProbe = await fetchVersionsViaProbe(clean);
  if (viaProbe.length) return viaProbe;

  const latest = await fetchLatestViaCdx(clean);
  return latest ? [latest] : [];
}

/** Monthly HTML captures across the whole lifespan in a single CDX query, then narrowed to the
 *  ones that look like real changes. The mimetype + statuscode filters guarantee each timestamp
 *  resolves to an actual page (not a redirect or an RSC/flight response); `digest` + `length`
 *  let us keep distinct versions instead of near-identical neighbours. */
async function fetchVersionsViaCdx(clean: string): Promise<Snapshot[]> {
  const params = new URLSearchParams({
    url: clean,
    output: "json",
    fl: "timestamp,digest,length",
    collapse: "timestamp:6",
  });
  params.append("filter", "statuscode:200");
  params.append("filter", "mimetype:text/html");

  const res = await fetch(`${CDX}?${params}`, {
    signal: AbortSignal.timeout(25000),
    headers: { "User-Agent": "teleport (wayback time machine)" },
  }).catch(() => null);

  const rows: string[][] | null = res && res.ok ? await res.json().catch(() => null) : null;
  // Row 0 is the header; the rest are [timestamp, digest, length], oldest first.
  const captures = (rows ?? [])
    .slice(1)
    .map((r) => ({ ts: r[0], digest: r[1], len: Number(r[2]) || 0 }))
    .filter((c) => c.ts);
  if (!captures.length) return [];

  const ordered = pickDistinct(captures).sort((a, b) => b.localeCompare(a));
  return downsample(ordered, MAX_VERSIONS).map(toSnapshot);
}

// Wayback has no "redesign" signal, so we approximate one: keep a capture when its content hash
// changed AND its archived size jumped past a threshold from the last kept one — a cheap proxy
// for a real visual change. Oldest and newest are always kept. Server-rendered sites surface
// their distinct versions; JS-heavy SPAs (whose served HTML barely changes) honestly collapse
// to the few points where the markup actually shifted.
function pickDistinct(captures: { ts: string; digest: string; len: number }[]): string[] {
  if (captures.length <= 2) return captures.map((c) => c.ts);
  const SIZE_DELTA = 0.18;
  const kept = [captures[0]];
  for (let i = 1; i < captures.length - 1; i++) {
    const prev = kept[kept.length - 1];
    const c = captures[i];
    const jumped = Math.abs(c.len - prev.len) / Math.max(prev.len, 1) >= SIZE_DELTA;
    if (c.digest !== prev.digest && jumped) kept.push(c);
  }
  kept.push(captures[captures.length - 1]);
  return kept.map((c) => c.ts);
}

/** Fallback timeline: probe the Availability API at a fixed cadence across the lifespan and
 *  collapse to the distinct monthly captures. Less precise than CDX (no mimetype filter) but
 *  resilient when the CDX index is slow or unavailable. */
async function fetchVersionsViaProbe(clean: string): Promise<Snapshot[]> {
  const nowYear = new Date().getFullYear();

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
  const byMonth = new Map<string, string>();
  if (latest) byMonth.set(latest.slice(0, 6), latest);
  for (const ts of probed) if (ts && !byMonth.has(ts.slice(0, 6))) byMonth.set(ts.slice(0, 6), ts);
  if (byMonth.size === 0) return [];

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

/** The single newest HTML capture — fast (one targeted CDX lookup), for an instant first
 *  window while the full timeline loads in parallel. */
export async function fetchLatest(url: string): Promise<Snapshot | null> {
  return fetchLatestViaCdx(cleanUrl(url));
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
