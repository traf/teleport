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

type Capture = { timestamp: string; size: number };

// A redesign shifts the archived byte-size and the shift holds; re-crawls of the same
// design stay flat. We treat a size move as a real version only when it persists.
const REDESIGN_THRESHOLD = 0.3;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Split the size series into stable regimes. A capture only opens a new regime when it
 * departs the regime's median by the threshold AND the next capture confirms it, so a
 * single bloated or partial crawl can't masquerade as a redesign. The regime median
 * (not the previous sample) is the reference, which resists noise and slow drift.
 */
function detectVersions(captures: Capture[]): Capture[] {
  if (captures.length === 0) return [];
  const regimes: Capture[][] = [[captures[0]]];
  let baseline = captures[0].size;

  for (let i = 1; i < captures.length; i++) {
    const cap = captures[i];
    const departs = Math.abs(cap.size - baseline) / baseline >= REDESIGN_THRESHOLD;
    const next = captures[i + 1];
    const confirmed = !next || Math.abs(next.size - baseline) / baseline >= REDESIGN_THRESHOLD;

    if (departs && confirmed) {
      regimes.push([cap]);
      baseline = cap.size;
    } else {
      const regime = regimes[regimes.length - 1];
      regime.push(cap);
      baseline = median(regime.map((c) => c.size));
    }
  }

  // Represent each regime with its most complete capture (deepest crawl, best assets),
  // ignoring lone spikes that sit far above the regime's typical size.
  return regimes.map((regime) => {
    const typical = median(regime.map((c) => c.size)) * 1.5;
    const sane = regime.filter((c) => c.size <= typical);
    return (sane.length ? sane : regime).reduce((a, b) => (b.size > a.size ? b : a));
  });
}

/**
 * One snapshot per visual version, newest first. We sample monthly captures and segment
 * the byte-size history into stable regimes (see detectVersions), so the timeline shows
 * the reliable, persistent redesigns rather than every transient crawl wobble.
 */
export async function fetchSnapshots(url: string): Promise<Snapshot[]> {
  const clean = cleanUrl(url);
  const params = new URLSearchParams({
    url: clean,
    output: "json",
    fl: "timestamp,length",
    collapse: "timestamp:6",
    limit: "1000",
  });
  params.append("filter", "statuscode:200");
  params.append("filter", "mimetype:text/html");

  const res = await fetch(`${CDX}?${params}`, {
    signal: AbortSignal.timeout(25000),
    headers: { "User-Agent": "teleport (wayback time machine)" },
  });
  if (!res.ok) throw new Error(`wayback responded ${res.status}`);

  const rows: string[][] = await res.json();
  if (!Array.isArray(rows) || rows.length < 2) return [];

  // Drop the header row; keep only real captures (size > 0), oldest first.
  const captures = rows
    .slice(1)
    .map(([timestamp, length]) => ({ timestamp, size: Number(length) || 0 }))
    .filter((c) => c.size > 0);

  return detectVersions(captures)
    .map(({ timestamp }) => ({ year: timestamp.slice(0, 4), timestamp, date: formatDate(timestamp) }))
    .reverse();
}

/**
 * The single most recent snapshot, via the Availability API. This returns in under a
 * second (unlike the multi-second CDX scan), so the machine can open on the latest
 * version instantly while the full history loads behind it.
 */
export async function fetchLatest(url: string): Promise<Snapshot | null> {
  const clean = cleanUrl(url);
  const res = await fetch(`${AVAILABLE}?url=${encodeURIComponent(clean)}`, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "teleport (wayback time machine)" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const ts: string | undefined = data?.archived_snapshots?.closest?.timestamp;
  if (!ts) return null;

  return { year: ts.slice(0, 4), timestamp: ts, date: formatDate(ts) };
}

/** Toolbar-free archived page, ideal for embedding in a frame. */
export function embedUrl(timestamp: string, url: string): string {
  return `https://web.archive.org/web/${timestamp}if_/https://${cleanUrl(url)}`;
}
