import { NextResponse } from "next/server";
import { fetchLatest } from "@/lib/wayback";

export const maxDuration = 15;

// A site's newest capture barely changes hour to hour; cache it hard at the edge so the
// instant-first-window path is near-free on repeat and shared visits.
const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const snapshot = await fetchLatest(url);
    if (!snapshot) {
      return NextResponse.json({ error: "No archived versions found" }, { status: 404 });
    }
    return NextResponse.json({ snapshot }, { headers: { "Cache-Control": CACHE } });
  } catch {
    return NextResponse.json({ error: "The archive is unreachable. Try again." }, { status: 502 });
  }
}
