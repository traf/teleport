import { NextResponse } from "next/server";
import { fetchVersions } from "@/lib/wayback";

// CDX can be slow for high-traffic domains; allow headroom for slow archives.
export const maxDuration = 30;

// A site's version history is effectively immutable, so cache it hard at the edge: repeat and
// shared `/site` links are then served from the CDN without ever touching Wayback.
const CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const snapshots = await fetchVersions(url);
    if (snapshots.length === 0) {
      return NextResponse.json({ error: "No archived versions found" }, { status: 404 });
    }
    return NextResponse.json({ snapshots }, { headers: { "Cache-Control": CACHE } });
  } catch {
    return NextResponse.json({ error: "The archive is unreachable. Try again." }, { status: 502 });
  }
}
