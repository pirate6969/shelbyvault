import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PROFILE_FILE = path.join(process.cwd(), "data", "profiles.json");

const readProfiles = (): Record<string, any> => {
  if (!fs.existsSync(PROFILE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(PROFILE_FILE, "utf-8")); } catch { return {}; }
};

// GET /api/profile/search?q=name_or_address
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "query required" }, { status: 400 });

  const profiles = readProfiles();

  // 1. Exact wallet address match (case-insensitive)
  const addressMatch = Object.keys(profiles).find(
    (addr) => addr.toLowerCase() === q.toLowerCase()
  );
  if (addressMatch) {
    return NextResponse.json({ address: addressMatch, found: true });
  }

  // 2. Exact name match (case-insensitive)
  const nameMatch = Object.entries(profiles).find(
    ([, profile]) =>
      profile.name && profile.name.toLowerCase() === q.toLowerCase()
  );
  if (nameMatch) {
    return NextResponse.json({ address: nameMatch[0], found: true });
  }

  // 3. Partial name match (starts with)
  const partialMatch = Object.entries(profiles).find(
    ([, profile]) =>
      profile.name && profile.name.toLowerCase().startsWith(q.toLowerCase())
  );
  if (partialMatch) {
    return NextResponse.json({ address: partialMatch[0], found: true });
  }

  return NextResponse.json({ found: false }, { status: 404 });
}