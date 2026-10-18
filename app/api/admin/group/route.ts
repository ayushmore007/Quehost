import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { runGroupingPipeline, ClusterResult } from "@/lib/grouping";

export const dynamic = "force-dynamic";

/**
 * GET: Fetches currently stored clusters from database along with their associated questions.
 */
export async function GET() {
  try {
    const { data: clustersData, error: clusterErr } = await supabaseServer
      .from("clusters")
      .select("id, title, count, question_ids, run_at")
      .order("count", { ascending: false });

    if (clusterErr) {
      console.error("Error fetching clusters:", clusterErr);
      return NextResponse.json(
        { error: "Failed to fetch clusters." },
        { status: 500 }
      );
    }

    if (!clustersData || clustersData.length === 0) {
      return NextResponse.json({ clusters: [] });
    }

    // Collect all question UUIDs from all clusters
    const allIds: string[] = [];
    clustersData.forEach((c) => {
      if (Array.isArray(c.question_ids)) {
        allIds.push(...c.question_ids);
      }
    });

    let questionsMap = new Map<string, { id: string; text: string; created_at?: string }>();
    if (allIds.length > 0) {
      const { data: questionsData } = await supabaseServer
        .from("questions")
        .select("id, text, created_at")
        .in("id", allIds);

      if (questionsData) {
        questionsData.forEach((q) => questionsMap.set(q.id, q));
      }
    }

    const clustersWithQuestions: ClusterResult[] = clustersData.map((c) => ({
      id: c.id,
      title: c.title,
      count: c.count,
      question_ids: c.question_ids || [],
      questions: (c.question_ids || [])
        .map((id: string) => questionsMap.get(id))
        .filter(Boolean) as { id: string; text: string; created_at?: string }[],
    }));

    return NextResponse.json({ clusters: clustersWithQuestions });
  } catch (err: any) {
    console.error("Error in GET /api/admin/group:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * POST: Runs the Gemini 2.0 Flash grouping pipeline on all questions.
 */
export async function POST() {
  try {
    const result = await runGroupingPipeline();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error running grouping pipeline:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to group questions." },
      { status: 500 }
    );
  }
}
