/**
 * Quehost Database Seed Script
 * Inserts ~40 realistic multilingual questions (English, Hinglish, Hindi)
 * across multiple device IDs to test intent grouping locally.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *   or
 *   npm run seed
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local or .env if present
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...rest] = trimmed.split("=");
        if (key && rest.length > 0) {
          const val = rest.join("=").replace(/^['"]|['"]$/g, "");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val.trim();
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY are required in your .env or environment.");
  console.error("Please configure them in .env before running the seed script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// 12 distinct attendee device UUIDs
const DEVICES = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
  "77777777-7777-4777-8777-777777777777",
  "88888888-8888-4888-8888-888888888888",
  "99999999-9999-4999-8999-999999999999",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
];

// 42 Multilingual Questions grouped by intent
const SEED_QUESTIONS = [
  // Intent 1: How to start DSA & preparation strategy
  { dev: 0, text: "How should a complete beginner start learning Data Structures and Algorithms?" },
  { dev: 1, text: "DSA kaise start karein beginner level se? Koi roadmap bata do please." },
  { dev: 2, text: "डीएसए की शुरुआत कैसे करें और कौन सी भाषा सबसे अच्छी है?" },
  { dev: 3, text: "Which programming language is best for starting DSA: C++, Java or Python?" },
  { dev: 4, text: "DSA shuru karne ke liye pehle C++ seekhein ya seedha Java par jump karein?" },
  { dev: 5, text: "Can you recommend a structured step-by-step roadmap for mastering DSA?" },
  { dev: 6, text: "LeetCode ke kitne questions karne chahiye placement ke liye DSA me?" },

  // Intent 2: College placements vs Off-campus hiring
  { dev: 0, text: "Tier 3 college students ke liye off-campus placements crack karne ki best strategy kya hai?" },
  { dev: 1, text: "How can students from non-IIT / Tier 3 colleges get shortlisted in top product companies?" },
  { dev: 2, text: "ऑफ-कैंपस प्लेसमेंट के लिए रेफ़रल कैसे लें?" },
  { dev: 3, text: "Off-campus applications me cold emailing aur LinkedIn outreach kaam karta hai kya?" },
  { dev: 7, text: "How to effectively network with recruiters on LinkedIn to get interview calls?" },
  { dev: 8, text: "College CGPA kitna matter karta hai FAANG ya high-paying product company placements me?" },
  { dev: 9, text: "Kya low CGPA ke baad bhi off-campus achi job mil sakti hai?" },

  // Intent 3: Non-CS / Non-Tech to Software Career Transition
  { dev: 4, text: "I am from Mechanical engineering. How can I transition into a Software Engineering job?" },
  { dev: 5, text: "Non-CS background wale software developer kaise bane? Kya degree zaroori hai?" },
  { dev: 6, text: "क्या बिना कंप्यूटर साइंस डिग्री के एक अच्छा सॉफ़्टवेयर इंजीनियर बना जा सकता है?" },
  { dev: 7, text: "Is a formal Computer Science degree necessary to land high-paying software jobs today?" },
  { dev: 8, text: "Non-IT se IT switch karte waqt resume me projects ko kaise highlight karein?" },
  { dev: 10, text: "What portfolio projects make a non-tech student stand out to hiring managers?" },

  // Intent 4: System Design & Backend Architecture
  { dev: 1, text: "How to learn System Design for 0-2 years experience level?" },
  { dev: 2, text: "System design kab shuru karna chahiye aur beginner resources kaunse achhe hain?" },
  { dev: 9, text: "सिस्टम डिज़ाइन सीखने के लिए सबसे अच्छे संसाधन कौन से हैं?" },
  { dev: 10, text: "What are the core fundamentals of scalable backend architecture every junior should know?" },
  { dev: 11, text: "Microservices vs Monolith: Startups me real-world me kya prefer kiya jata hai?" },
  { dev: 3, text: "Real-world scalability issues ko tackle karne ke liye kya concepts master karein?" },

  // Intent 5: Personal Journey, Setbacks & Motivation
  { dev: 0, text: "What was your biggest professional failure and what did you learn from it?" },
  { dev: 2, text: "Aapka career ka sabse bada setback kya tha aur aapne usse kaise overcome kiya?" },
  { dev: 4, text: "आपके करियर का सबसे बड़ा संघर्ष क्या था और आपने कैसे सामना किया?" },
  { dev: 6, text: "When you felt like giving up in tech, what kept you going forward?" },
  { dev: 8, text: "Agar aap apne 20-year-old self ko koi ek advice de sakte to kya dete?" },
  { dev: 10, text: "What single piece of advice would you give to your 20-year-old self?" },
  { dev: 11, text: "Apne college days me aapne aisi kaunsi galti ki jo hume avoid karni chahiye?" },

  // Intent 6: Startups vs Big Tech (MNC) Work Culture
  { dev: 1, text: "Early career me Early-stage Startup join karna behtar hai ya Big Tech MNC?" },
  { dev: 3, text: "Should a fresher prioritize learning in a fast-paced startup or stability in Big Tech?" },
  { dev: 5, text: "स्टार्टअप और बड़ी टेक कंपनियों के वर्क कल्चर में क्या मुख्य अंतर है?" },
  { dev: 7, text: "Startup vs Big Tech: Which offers faster learning and wealth creation via ESOPs?" },
  { dev: 9, text: "Startup me burn-out se kaise bachein while keeping learning high?" },

  // Intent 7: Daily Routine & High Performance Productivity
  { dev: 0, text: "What does your typical daily routine look like to stay productive and avoid burnout?" },
  { dev: 11, text: "Aapka daily productivity routine kya hai? Coding aur reading ke liye time kaise manage karte hain?" },
];

async function seed() {
  console.log("🌱 Starting Quehost seed process...");
  console.log(`Connecting to Supabase at: ${supabaseUrl}`);

  // 1. Reset existing questions and clusters for clean run
  console.log("🧹 Clearing previous test data...");
  await supabase.from("questions").delete().neq("text", "___dummy___");
  await supabase.from("clusters").delete().neq("id", 0);
  await supabase.from("settings").upsert({ key: "open", value: "true" });

  // 2. Prepare rows
  const rows = SEED_QUESTIONS.map((item, index) => {
    const deviceId = DEVICES[item.dev % DEVICES.length];
    // Slightly staggered timestamps
    const date = new Date(Date.now() - (SEED_QUESTIONS.length - index) * 60000);
    return {
      device_id: deviceId,
      text: item.text,
      created_at: date.toISOString(),
    };
  });

  console.log(`📥 Inserting ${rows.length} multilingual questions across ${DEVICES.length} distinct attendees...`);

  const { data: inserted, error } = await supabase
    .from("questions")
    .insert(rows)
    .select("id, text, device_id");

  if (error) {
    console.error("❌ Insertion failed:", error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${inserted?.length || 0} questions!`);
  console.log("\n📋 Sample of seeded questions:");
  inserted?.slice(0, 5).forEach((q, i) => {
    console.log(`  ${i + 1}. [Device ${q.device_id.slice(0, 8)}...] ${q.text}`);
  });

  console.log("\n💡 Next step: Go to http://localhost:3000/admin and click 'Group & Rank'");
  console.log("   Gemini 2.0 Flash will cluster these multilingual questions by intent!");
}

seed().catch((err) => {
  console.error("Unexpected error in seed script:", err);
  process.exit(1);
});
