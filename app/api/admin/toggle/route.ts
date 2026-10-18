import { NextRequest, NextResponse } from "next/server";
import { setSubmissionOpenState } from "@/lib/settings";
import { runGroupingPipeline } from "@/lib/grouping";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.open !== "boolean") {
      return NextResponse.json(
        { error: "Invalid payload. 'open' boolean required." },
        { status: 400 }
      );
    }

    const newOpenState = body.open;

    // Persist new state to database & memory fallback
    await setSubmissionOpenState(newOpenState);

    // "Closing also auto-triggers grouping"
    let groupingResult = null;
    if (!newOpenState) {
      try {
        // Run grouping
        groupingResult = await runGroupingPipeline();
      } catch (groupErr: any) {
        console.error("Auto-grouping on close failed:", groupErr);
        groupingResult = {
          success: false,
          isFallback: true,
          message: groupErr?.message || "Grouping failed",
        };
      }
    }

    return NextResponse.json({
      success: true,
      open: newOpenState,
      groupingResult,
    });
  } catch (err: any) {
    console.error("Error in toggle API:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update submission state." },
      { status: 500 }
    );
  }
}
