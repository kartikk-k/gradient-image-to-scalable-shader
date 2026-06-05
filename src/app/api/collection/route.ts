import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const COLLECTION_PATH = join(process.cwd(), "src/lib/collection.ts");

export async function POST(req: Request) {
  try {
    const item = await req.json();

    if (!item.id || !item.dataURL || !item.gridW || !item.gridH) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const content = readFileSync(COLLECTION_PATH, "utf-8");

    const entry = JSON.stringify(item, null, 2).replace(/"([^"]+)":/g, "$1:");

    const insertionPoint = content.lastIndexOf("];");
    if (insertionPoint === -1) {
      return NextResponse.json({ error: "Could not find COLLECTION array" }, { status: 500 });
    }

    const before = content.slice(0, insertionPoint);
    const needsComma = before.trimEnd().endsWith("}");
    const updated = before + (needsComma ? ",\n  " : "\n  ") + entry + ",\n];\n";

    writeFileSync(COLLECTION_PATH, updated, "utf-8");

    return NextResponse.json({ ok: true, id: item.id });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
