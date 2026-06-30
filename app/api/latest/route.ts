import { NextResponse } from "next/server";
import { fetchLatest } from "@/lib/wayback";

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
    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "The archive is unreachable. Try again." }, { status: 502 });
  }
}
