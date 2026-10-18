import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '""';
  const stringVal = String(field);
  return `"${stringVal.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const { data: questions, error } = await supabaseServer
      .from("questions")
      .select("id, text, device_id, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Export questions error:", error);
      return NextResponse.json(
        { error: "Failed to export questions." },
        { status: 500 }
      );
    }

    const header = ["Question ID", "Question Text", "Device ID", "Created At (UTC)"];
    const rows = (questions || []).map((q) => [
      q.id,
      q.text,
      q.device_id,
      q.created_at,
    ]);

    const csvContent = [
      header.map(escapeCsvField).join(","),
      ...rows.map((row) => row.map(escapeCsvField).join(",")),
    ].join("\r\n");

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `quehost_questions_${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating CSV export:", err);
    return NextResponse.json(
      { error: "Internal server error during export." },
      { status: 500 }
    );
  }
}
