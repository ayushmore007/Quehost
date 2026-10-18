import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getSubmissionOpenState } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch total questions count
    const { count: totalQuestions, error: qCountErr } = await supabaseServer
      .from("questions")
      .select("id", { count: "exact", head: true });

    if (qCountErr) {
      console.warn("Stats questions count notice:", qCountErr.message);
    }

    // 2. Fetch distinct device IDs
    const { data: deviceRows, error: devErr } = await supabaseServer
      .from("questions")
      .select("device_id");

    let uniqueDevices = 0;
    if (!devErr && deviceRows) {
      uniqueDevices = new Set(deviceRows.map((r) => r.device_id)).size;
    }

    // 3. Fetch submission open state
    const isOpen = await getSubmissionOpenState();

    // 4. Fetch latest cluster run info
    let lastRunAt = null;
    try {
      const { data: latestCluster } = await supabaseServer
        .from("clusters")
        .select("run_at")
        .order("run_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      lastRunAt = latestCluster?.run_at || null;
    } catch {}

    return NextResponse.json({
      totalQuestions: totalQuestions ?? 0,
      uniqueDevices,
      isOpen,
      lastRunAt,
      eventTitle: process.env.EVENT_TITLE || "IEEE Live Q&A Session",
      speakerName: process.env.SPEAKER_NAME || "Love Babbar",
    });
  } catch (err: any) {
    console.error("Error in admin stats API:", err);
    return NextResponse.json(
      { error: "Failed to fetch event statistics." },
      { status: 500 }
    );
  }
}
