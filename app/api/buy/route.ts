import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ASSETS_FILE  = path.join(process.cwd(), "data", "assets.json");
const PROFILE_FILE = path.join(process.cwd(), "data", "profiles.json");

const readAssets  = () => fs.existsSync(ASSETS_FILE)  ? JSON.parse(fs.readFileSync(ASSETS_FILE,  "utf-8")) : [];
const readProfiles= () => fs.existsSync(PROFILE_FILE) ? JSON.parse(fs.readFileSync(PROFILE_FILE, "utf-8")) : {};
const writeAssets = (d: any) => fs.writeFileSync(ASSETS_FILE, JSON.stringify(d, null, 2));

export async function POST(req: NextRequest) {
  const { id, owner: buyerAddress, txHash } = await req.json();

  const data = readAssets();
  const idx  = data.findIndex((a: any) => a.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const asset = data[idx];

  // Already sold out?
  if ((asset.sold ?? 0) >= (asset.supply ?? 1)) {
    return NextResponse.json({ error: "Sold out" }, { status: 400 });
  }

  // Build buy record
  const buyRecord = {
    buyer:     buyerAddress,
    txHash:    txHash ?? "",
    price:     asset.price,
    currency:  "APT",
    boughtAt:  new Date().toISOString(),
  };

  // Append to buyHistory
  if (!Array.isArray(asset.buyHistory)) asset.buyHistory = [];
  asset.buyHistory.push(buyRecord);

  // Keep legacy buyers[] as well
  if (!Array.isArray(asset.buyers)) asset.buyers = [];
  asset.buyers.push(buyerAddress);

  // Increment sold count
  asset.sold = (asset.sold ?? 0) + 1;

  // Transfer ownership if supply === 1 (single edition)
  if ((asset.supply ?? 1) === 1) {
    asset.owner  = buyerAddress;
    asset.listed = false;
  }

  data[idx] = asset;
  writeAssets(data);

  return NextResponse.json({ ok: true, asset });
}