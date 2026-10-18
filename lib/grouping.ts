import { supabaseServer } from "./supabase";

export interface QuestionRecord {
  id: string;
  device_id: string;
  text: string;
  created_at?: string;
}

export interface ClusterResult {
  id?: number;
  title: string;
  count: number;
  question_ids: string[];
  questions?: { id: string; text: string; created_at?: string }[];
}

export interface GroupingResponse {
  success: boolean;
  clusters: ClusterResult[];
  isFallback: boolean;
  totalQuestions: number;
  message?: string;
}

const CHUNK_SIZE = 300;
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

/**
 * Normalizes text for fallback clustering (lowercase, alphanumeric only).
 */
function normalizeForFallback(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, "") // Keep alphanumeric and Devanagari
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fallback grouping using normalized text and token overlap when Gemini is unreachable.
 * Guaranteed to never drop or lose any submissions.
 */
function fallbackNormalizedGrouping(questions: QuestionRecord[]): { title: string; ids: string[] }[] {
  const groups: { [key: string]: { title: string; ids: string[] } } = {};

  for (const q of questions) {
    const norm = normalizeForFallback(q.text);
    // Find an existing group with high token overlap or exact match
    let matchedKey: string | null = null;
    const tokens = new Set(norm.split(" ").filter((t) => t.length > 2));

    for (const key of Object.keys(groups)) {
      if (key === norm) {
        matchedKey = key;
        break;
      }
      const groupTokens = new Set(key.split(" ").filter((t) => t.length > 2));
      if (tokens.size > 0 && groupTokens.size > 0) {
        let intersection = 0;
        tokens.forEach((t) => {
          if (groupTokens.has(t)) intersection++;
        });
        const jaccard = intersection / (tokens.size + groupTokens.size - intersection);
        if (jaccard >= 0.7) {
          matchedKey = key;
          break;
        }
      }
    }

    if (matchedKey) {
      groups[matchedKey].ids.push(q.id);
    } else {
      // Use original text trimmed as title
      const title = q.text.length > 60 ? q.text.slice(0, 57) + "..." : q.text;
      groups[norm] = { title, ids: [q.id] };
    }
  }

  return Object.values(groups);
}

/**
 * Calls Gemini 2.0 Flash API with retry logic and strict JSON response.
 */
async function callGeminiWithRetry(prompt: string, apiKey: string, retries = 2): Promise<string> {
  const cleanKey = apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(cleanKey)}`;

  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": cleanKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Empty response from Gemini API");
      }
      return rawText;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

/**
 * Main grouping engine executing Gemini 2.0 Flash clustering with fallback and Supabase persistence.
 */
export async function runGroupingPipeline(): Promise<GroupingResponse> {
  // 1. Fetch all questions from Supabase
  const { data: questionsData, error: fetchError } = await supabaseServer
    .from("questions")
    .select("id, device_id, text, created_at")
    .order("created_at", { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch questions: ${fetchError.message}`);
  }

  const questions: QuestionRecord[] = questionsData || [];
  if (questions.length === 0) {
    // Clear clusters table if no questions exist
    await supabaseServer.from("clusters").delete().neq("id", 0);
    return {
      success: true,
      clusters: [],
      isFallback: false,
      totalQuestions: 0,
      message: "No questions submitted yet.",
    };
  }

  const questionMap = new Map<string, QuestionRecord>();
  questions.forEach((q) => questionMap.set(q.id, q));

  let isFallback = false;
  let fallbackReason = "";
  let rawClusters: { title: string; ids: string[] }[] = [];
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Falling back to normalized text grouping.");
    isFallback = true;
    fallbackReason = "GEMINI_API_KEY is not set";
    rawClusters = fallbackNormalizedGrouping(questions);
  } else {
    try {
      // Chunk questions if > CHUNK_SIZE
      const chunks: QuestionRecord[][] = [];
      for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
        chunks.push(questions.slice(i, i + CHUNK_SIZE));
      }

      const chunkResults: { title: string; ids: string[] }[] = [];

      for (let c = 0; c < chunks.length; c++) {
        const currentChunk = chunks[c];
        const inputItems = currentChunk.map((q) => ({ id: q.id, question: q.text }));

        const prompt = `You are an expert Q&A clustering engine for a live event.
Attendees submit questions in multiple languages and dialects, including English, Hindi (Devanagari), and Hinglish (Hindi written in Latin alphabet, e.g., "DSA kaise start karna hai" vs "How to start DSA?").

Your task:
Group together questions that have the SAME core intent or topic, regardless of language, spelling, or phrasing.

STRICT REQUIREMENTS:
1. Every input question id MUST appear in exactly one cluster in the output.
2. Do NOT drop, omit, or invent any id.
3. Provide a concise, clear English title (3 to 8 words) for each cluster summarizing the core question intent.
4. Output must be valid JSON matching this schema:
[
  {
    "title": "Short clear English summary of the question",
    "ids": ["id-1", "id-2"]
  }
]

Input questions:
${JSON.stringify(inputItems)}`;

        const geminiJsonText = await callGeminiWithRetry(prompt, apiKey, 2);
        let parsed = JSON.parse(geminiJsonText);

        if (!Array.isArray(parsed)) {
          if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).clusters)) {
            parsed = (parsed as any).clusters;
          } else {
            throw new Error("Invalid response format: not an array");
          }
        }

        // Validate IDs
        const returnedIds = new Set<string>();
        const validClusters: { title: string; ids: string[] }[] = [];

        for (const item of parsed) {
          if (item && item.title && Array.isArray(item.ids)) {
            const cleanIds = item.ids.filter((id: any) => typeof id === "string" && questionMap.has(id));
            if (cleanIds.length > 0) {
              validClusters.push({
                title: String(item.title).trim(),
                ids: cleanIds,
              });
              cleanIds.forEach((id: string) => returnedIds.add(id));
            }
          }
        }

        // Check for any missing IDs in this chunk and assign to singleton clusters
        for (const q of currentChunk) {
          if (!returnedIds.has(q.id)) {
            validClusters.push({
              title: q.text.length > 60 ? q.text.slice(0, 57) + "..." : q.text,
              ids: [q.id],
            });
          }
        }

        chunkResults.push(...validClusters);
      }

      // If multiple chunks exist, merge similar cluster titles across chunks
      if (chunks.length > 1) {
        try {
          const mergeInput = chunkResults.map((cr, idx) => ({
            index: idx,
            title: cr.title,
            count: cr.ids.length,
          }));

          const mergePrompt = `Merge these question cluster titles if they express the same core intent:
${JSON.stringify(mergeInput)}

Return JSON array where each item has "title" and "merged_indices":
[
  {
    "title": "Unified English Title",
    "merged_indices": [0, 4]
  }
]
Every index from 0 to ${chunkResults.length - 1} must appear exactly once.`;

          const mergeText = await callGeminiWithRetry(mergePrompt, apiKey, 2);
          const mergeParsed = JSON.parse(mergeText);

          if (Array.isArray(mergeParsed)) {
            const mergedResults: { title: string; ids: string[] }[] = [];
            const processedIndices = new Set<number>();

            for (const m of mergeParsed) {
              if (m.title && Array.isArray(m.merged_indices)) {
                const combinedIds: string[] = [];
                for (const idx of m.merged_indices) {
                  if (typeof idx === "number" && chunkResults[idx]) {
                    combinedIds.push(...chunkResults[idx].ids);
                    processedIndices.add(idx);
                  }
                }
                if (combinedIds.length > 0) {
                  mergedResults.push({ title: String(m.title).trim(), ids: combinedIds });
                }
              }
            }

            // Include any unmerged indices
            chunkResults.forEach((cr, idx) => {
              if (!processedIndices.has(idx)) {
                mergedResults.push(cr);
              }
            });

            rawClusters = mergedResults;
          } else {
            rawClusters = chunkResults;
          }
        } catch (mergeErr) {
          console.warn("Chunk merge pass failed, using individual chunk clusters", mergeErr);
          rawClusters = chunkResults;
        }
      } else {
        rawClusters = chunkResults;
      }
    } catch (geminiErr) {
      console.error("Gemini grouping failed after retries. Falling back to normalized grouping.", geminiErr);
      isFallback = true;
      fallbackReason = String((geminiErr as any)?.message || geminiErr).slice(0, 300);
      rawClusters = fallbackNormalizedGrouping(questions);
    }
  }

  // 3. Count distinct devices per cluster (one person repeating counts once)
  const finalClusters: ClusterResult[] = rawClusters.map((c) => {
    const distinctDevices = new Set<string>();
    const clusterQuestions: { id: string; text: string; created_at?: string }[] = [];

    for (const id of c.ids) {
      const q = questionMap.get(id);
      if (q) {
        distinctDevices.add(q.device_id);
        clusterQuestions.push({
          id: q.id,
          text: q.text,
          created_at: q.created_at,
        });
      }
    }

    return {
      title: c.title,
      count: distinctDevices.size,
      question_ids: c.ids,
      questions: clusterQuestions,
    };
  });

  // Sort descending by distinct device count
  finalClusters.sort((a, b) => b.count - a.count);

  // 4. Save to clusters table in Supabase (replace existing clusters)
  try {
    // Delete previous clusters
    await supabaseServer.from("clusters").delete().neq("id", 0);

    if (finalClusters.length > 0) {
      const insertRows = finalClusters.map((c) => ({
        title: c.title,
        count: c.count,
        question_ids: c.question_ids,
        run_at: new Date().toISOString(),
      }));

      const { data: inserted, error: insertError } = await supabaseServer
        .from("clusters")
        .insert(insertRows)
        .select("id, title, count, question_ids, run_at");

      if (insertError) {
        console.error("Error saving clusters to Supabase:", insertError);
      } else if (inserted) {
        // Map back assigned IDs
        inserted.forEach((row, i) => {
          if (finalClusters[i]) {
            finalClusters[i].id = row.id;
          }
        });
      }
    }
  } catch (dbErr) {
    console.error("Database error while persisting clusters:", dbErr);
  }

  return {
    success: true,
    clusters: finalClusters,
    isFallback,
    totalQuestions: questions.length,
    message: isFallback
      ? `Gemini API unavailable (${fallbackReason}); displaying fallback normalized text grouping. Submissions were not lost.`
      : undefined,
  };
}
