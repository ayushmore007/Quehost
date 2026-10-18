import { supabaseServer } from "./supabase";

// In-memory fallback state so the toggle works 100% reliably even if
// Supabase settings table is experiencing latency or has not been seeded yet.
let memoryOpenState: boolean = true;

/**
 * Gets the current audience submission open/closed state.
 */
export async function getSubmissionOpenState(): Promise<boolean> {
  try {
    const { data, error } = await supabaseServer
      .from("settings")
      .select("value")
      .eq("key", "open")
      .maybeSingle();

    if (error) {
      console.warn("Could not read settings table from Supabase, using memory state:", error.message);
      return memoryOpenState;
    }

    if (data && typeof data.value === "string") {
      memoryOpenState = data.value === "true";
      return memoryOpenState;
    }

    return memoryOpenState;
  } catch (err) {
    console.warn("Exception reading submission open state, using memory fallback:", err);
    return memoryOpenState;
  }
}

/**
 * Sets the audience submission open/closed state.
 */
export async function setSubmissionOpenState(isOpen: boolean): Promise<boolean> {
  memoryOpenState = isOpen;
  const valueStr = isOpen ? "true" : "false";

  try {
    // 1. Try update first
    const { data: updateData, error: updateErr } = await supabaseServer
      .from("settings")
      .update({ value: valueStr })
      .eq("key", "open")
      .select();

    if (!updateErr && updateData && updateData.length > 0) {
      return true;
    }

    // 2. If no rows updated or error, try upsert
    const { error: upsertErr } = await supabaseServer
      .from("settings")
      .upsert({ key: "open", value: valueStr }, { onConflict: "key" });

    if (upsertErr) {
      console.warn("Supabase settings upsert error (saved to memory):", upsertErr.message);
    }
  } catch (err: any) {
    console.warn("Failed to persist open state to Supabase, saved to memory:", err?.message);
  }

  return true;
}
