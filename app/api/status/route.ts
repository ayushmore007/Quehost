import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getSubmissionOpenState } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Public endpoint for attendees to get the event status and their own question count.
 * STRICTLY ISOLATED: Never returns other attendees' questions, total counts, or rankings.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("device_id")?.trim();

    // 1. Fetch submission open state
    const isOpen = await getSubmissionOpenState();

    // 2. Fetch submission count for this specific device only
    let userCount = 0;
    if (deviceId) {
      try {
        const { count, error: countError } = await supabaseServer
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("device_id", deviceId);

        if (!countError && typeof count === "number") {
          userCount = count;
        }
      } catch {}
    }

    return NextResponse.json({
      open: isOpen,
      count: userCount,
      eventTitle: process.env.EVENT_TITLE || "IEEE Live Q&A Session",
      speakerName: process.env.SPEAKER_NAME || "Love Babbar",
    });
  } catch (err: any) {
    console.error("Error in status API:", err);
    return NextResponse.json(
      {
        open: true,
        count: 0,
        eventTitle: process.env.EVENT_TITLE || "IEEE Live Q&A Session",
        speakerName: process.env.SPEAKER_NAME || "Love Babbar",
      },
      { status: 200 }
    );
  }
}
