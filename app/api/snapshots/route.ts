import { NextResponse } from "next/server";
import { fetchVersions } from "@/lib/wayback";

// Parallel Availability probes finish in seconds, but allow headroom for slow archives.
export const maxDuration = 30;

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
    return NextResponse.json({ snapshots });
  } catch {
    return NextResponse.json({ error: "The archive is unreachable. Try again." }, { status: 502 });
  }
}
