import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PROFILE_FILE = path.join(process.cwd(), "data", "profiles.json");
const ASSETS_FILE  = path.join(process.cwd(), "data", "assets.json");

const readProfiles = (): Record<string,any> => {
  if (!fs.existsSync(PROFILE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(PROFILE_FILE, "utf-8")); } catch { return {}; }
};
const writeProfiles = (d: any) => {
  const dir = path.dirname(PROFILE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(d, null, 2));
};
const readAssets = () => {
  if (!fs.existsSync(ASSETS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(ASSETS_FILE, "utf-8")); } catch { return []; }
};

// GET /api/profile?address=0x...
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const profiles = readProfiles();
  const profile  = profiles[address] ?? {};
  const assets   = readAssets();

  const owned   = assets.filter((a: any) => a.owner === address);
  const listed  = owned.filter((a: any) => a.listed);
  const created = assets.filter((a: any) => a.uploader === address);

  const bought: any[] = [];
  for (const asset of assets) {
    if (!Array.isArray(asset.buyHistory)) continue;
    for (const record of asset.buyHistory) {
      if (record.buyer === address) {
        bought.push({
          ...record,
          assetId: asset.id, assetName: asset.name,
          assetImage: asset.shelbyUrl, assetFileType: asset.fileType, assetPrice: asset.price,
        });
      }
    }
  }

  return NextResponse.json({
    address,
    name:     profile.name     ?? "",
    bio:      profile.bio      ?? "",
    avatar:   profile.avatar   ?? "",
    banner:   profile.banner   ?? "",   // ← was missing!
    url:      profile.url      ?? "",   // ← was missing!
    twitter:  profile.twitter          ?? "",
    discord:  profile.discord          ?? "",
    twitterVerified: profile.twitterVerified  ?? false,
    emailVerified:   profile.emailVerified    ?? false,
    discordVerified: profile.discordVerified  ?? false,
    joinedAt: profile.joinedAt ?? null,
    owned, listed, bought, created,
    stats: {
      totalOwned:   owned.length,
      totalListed:  listed.length,
      totalBought:  bought.length,
      totalCreated: created.length,
      totalLikes:   owned.reduce((s: number, a: any) => s + (a.likes?.length ?? 0), 0),
    }
  });
}

// POST /api/profile
export async function POST(req: NextRequest) {
  const { address, name, bio, avatar, banner, url, twitter, discord, twitterVerified, emailVerified, discordVerified, email } = await req.json();
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const profiles = readProfiles();
  if (!profiles[address]) profiles[address] = { joinedAt: new Date().toISOString() };

  if (name             !== undefined) profiles[address].name             = name;
  if (bio              !== undefined) profiles[address].bio              = bio;
  if (avatar           !== undefined) profiles[address].avatar           = avatar;
  if (banner           !== undefined) profiles[address].banner           = banner;
  if (url              !== undefined) profiles[address].url              = url;
  if (twitter          !== undefined) profiles[address].twitter          = twitter;
  if (discord          !== undefined) profiles[address].discord          = discord;
  if (email            !== undefined) profiles[address].email            = email;
  if (twitterVerified  !== undefined) profiles[address].twitterVerified  = twitterVerified;
  if (emailVerified    !== undefined) profiles[address].emailVerified    = emailVerified;
  if (discordVerified  !== undefined) profiles[address].discordVerified  = discordVerified;

  writeProfiles(profiles);
  return NextResponse.json({ ok: true, profile: profiles[address] });
}