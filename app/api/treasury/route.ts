import { NextResponse } from "next/server";
import { fetchTreasuryCurve, sampleCurve } from "@/lib/treasury";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await fetchTreasuryCurve());
  } catch (error) {
    console.error("Treasury feed unavailable; serving demo curve.", error);
    return NextResponse.json({ ...sampleCurve, warning: "Live Treasury data is temporarily unavailable; showing demo data." });
  }
}
