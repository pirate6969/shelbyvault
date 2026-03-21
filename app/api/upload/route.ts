import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR  = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "assets.json");

function readAssets() {
  if (!existsSync(DATA_FILE)) {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, "[]");
    return [];
  }
  return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
}

function writeAssets(assets: object[]) {
  writeFileSync(DATA_FILE, JSON.stringify(assets, null, 2));
}

export async function POST(req: Request) {
  try {
    const { name, owner, uploader, fileType, shelbyUrl, thumbnailUrl, fileSize, storage, network } = await req.json();

    if (!name || !owner || !shelbyUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const assets = readAssets();
    const newAsset = {
      id:           crypto.randomUUID(),
      name,
      owner,
      uploader,
      fileType:     fileType || "application/octet-stream",
      shelbyUrl,
      thumbnailUrl: thumbnailUrl || "",
      fileSize:     fileSize || 0,
      storage:      storage || "local",
      network:      network || "",
      price:        0,
      listed:       false,
      likes:        [],
      uploadedAt:   new Date().toISOString(),
    };

    assets.push(newAsset);
    writeAssets(assets);

    return NextResponse.json(newAsset, { status: 201 });
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json({ error: "Failed to save asset" }, { status: 500 });
  }
}