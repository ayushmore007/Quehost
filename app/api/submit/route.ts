import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, supabaseConfigured } from "@/lib/supabase";
import { sanitizeQuestionText, isValidUUID } from "@/lib/utils";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSubmissionOpenState } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Secondary IP Rate Limiting (max 5 submissions per IP per hour)
    const clientIp = getClientIp(request.headers);
    const ipCheck = checkIpRateLimit(clientIp);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          error: "Submission rate limit exceeded for this network. Please try again later.",
        },
        { status: 429 }
      );
    }

    if (!supabaseConfigured) {
      console.error("SUPABASE_URL / SUPABASE_SERVICE_KEY are not set on the server.");
      return NextResponse.json(
        { error: "Server is not configured (database keys missing). Please tell the organisers." },
        { status: 500 }
      );
    }

    // 2. Parse request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { device_id: rawDeviceId, text: rawText } = body;

    // Validate Device ID
    if (!rawDeviceId || typeof rawDeviceId !== "string" || !isValidUUID(rawDeviceId.trim())) {
      return NextResponse.json(
        { error: "Valid device identifier is required." },
        { status: 400 }
      );
    }
    const deviceId = rawDeviceId.trim();

    // Sanitize and validate question text
    const cleanText = sanitizeQuestionText(rawText);
    if (!cleanText || cleanText.length === 0) {
      return NextResponse.json(
        { error: "Question cannot be empty." },
        { status: 400 }
      );
    }

    if (cleanText.length > 300) {
      return NextResponse.json(
        { error: "Question must be 300 characters or fewer." },
        { status: 400 }
      );
    }

    // 3. Attempt Atomic Submission via Postgres RPC (Prevents double-tap race conditions)
    const { data: rpcData, error: rpcError } = await supabaseServer.rpc(
      "submit_question_atomic",
      {
        p_device_id: deviceId,
        p_text: cleanText,
        p_max_limit: 5,
      }
    );

    if (rpcError) console.error("submit_question_atomic RPC error:", rpcError.message);

    // A missing 'open' settings row makes the RPC report CLOSED; trust the app-level state instead.
    const rpcSaysClosed = !rpcError && rpcData && !rpcData.success && rpcData.error === "SUBMISSIONS_CLOSED";
    if (!rpcError && rpcData && !(rpcSaysClosed && (await getSubmissionOpenState()))) {
      if (!rpcData.success) {
        if (rpcData.error === "SUBMISSIONS_CLOSED") {
          return NextResponse.json(
            { error: "Submissions are currently closed." },
            { status: 403 }
          );
        }
        if (rpcData.error === "LIMIT_REACHED") {
          return NextResponse.json(
            { error: "You have reached the maximum of 5 questions." },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { error: rpcData.message || "Failed to submit question." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        count: rpcData.count,
      });
    }

    // 4. Graceful Fallback if RPC is not installed in database
    // Check if submissions are open
    const isOpen = await getSubmissionOpenState();
    if (!isOpen) {
      return NextResponse.json(
        { error: "Submissions are currently closed." },
        { status: 403 }
      );
    }

    // Enforce 5 questions per device limit server-side
    const { count: currentCount, error: countErr } = await supabaseServer
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("device_id", deviceId);

    if (countErr) {
      console.error("Count check error:", countErr);
      return NextResponse.json(
        { error: "An error occurred. Please try again." },
        { status: 500 }
      );
    }

    if (typeof currentCount === "number" && currentCount >= 5) {
      return NextResponse.json(
        { error: "You have reached the maximum of 5 questions." },
        { status: 403 }
      );
    }

    // Insert new question
    const { error: insertErr } = await supabaseServer
      .from("questions")
      .insert({
        device_id: deviceId,
        text: cleanText,
      });

    if (insertErr) {
      console.error("Insert question error:", insertErr);
      return NextResponse.json(
        { error: "Failed to submit question. Please try again." },
        { status: 500 }
      );
    }

    const newCount = (currentCount ?? 0) + 1;
    return NextResponse.json({
      success: true,
      count: newCount,
    });
  } catch (err: any) {
    console.error("Unexpected error in /api/submit:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
