import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 1. Attempt using database RPC function if available
    const { error: rpcErr } = await supabaseServer.rpc("reset_event_data");

    if (!rpcErr) {
      return NextResponse.json({ success: true, message: "Event data reset successfully." });
    }

    // 2. Fallback to direct table resets
    await supabaseServer.from("questions").delete().neq("text", "___dummy___");
    await supabaseServer.from("clusters").delete().neq("id", 0);
    await supabaseServer.from("settings").upsert({ key: "open", value: "true" });

    return NextResponse.json({
      success: true,
      message: "Event data reset successfully via table truncate.",
    });
  } catch (err: any) {
    console.error("Error in reset API:", err);
    return NextResponse.json(
      { error: "Failed to reset event data." },
      { status: 500 }
    );
  }
}
