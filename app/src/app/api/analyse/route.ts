import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getGrok, GROK_MODEL } from "@/lib/grok";

const MAX_TOKENS = 320;
const MAX_BODY_BYTES = 2048;
const AI_TIMEOUT_MS = 12_000;
const USER_RATE_LIMIT = 5;
const IP_RATE_LIMIT = 20;
const USER_DAILY_LIMIT = 30;
const IP_DAILY_LIMIT = 200;
const NEW_ACCOUNT_MS = 10 * 60_000;
const NEW_ACCOUNT_USER_RATE_LIMIT = 2;
const NEW_ACCOUNT_USER_DAILY_LIMIT = 5;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const ALLOWED_SYMPTOMS = new Set([
  "fever",
  "cough",
  "fatigue",
  "chills",
  "headache",
  "other",
]);

type RateLimitEntry = { count: number; resetAt: number };
type Finding = { disease: string; probability: string; pct: string; desc: string };
type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type QuotaDecision =
  | { allowed: true }
  | { allowed: false; status: number; message: string; retryAfter?: number };

const fallbackRateLimitMap = new Map<string, RateLimitEntry>();

function isNewAccount(createdAt?: string) {
  if (!createdAt) return false;
  const createdAtMs = Date.parse(createdAt);
  return Number.isFinite(createdAtMs) && Date.now() - createdAtMs < NEW_ACCOUNT_MS;
}

function checkFallbackCounter(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = fallbackRateLimitMap.get(key);

  if (fallbackRateLimitMap.size > 10_000) {
    for (const [storedKey, storedEntry] of fallbackRateLimitMap) {
      if (now > storedEntry.resetAt) fallbackRateLimitMap.delete(storedKey);
    }
  }

  if (!entry || now > entry.resetAt) {
    fallbackRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfter: windowMs / 1000 };
  }

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count >= limit) return { limited: true, retryAfter };

  entry.count++;
  return { limited: false, retryAfter };
}

function checkFallbackQuota(
  userId: string,
  ipHash: string,
  userCreatedAt?: string
): QuotaDecision {
  const newAccount = isNewAccount(userCreatedAt);
  const userRateLimit = newAccount ? NEW_ACCOUNT_USER_RATE_LIMIT : USER_RATE_LIMIT;
  const userDailyLimit = newAccount ? NEW_ACCOUNT_USER_DAILY_LIMIT : USER_DAILY_LIMIT;
  const checks = [
    {
      key: `ai:user:minute:${userId}`,
      limit: userRateLimit,
      windowMs: MINUTE_MS,
      message: "Rate limit exceeded. Try again shortly.",
    },
    {
      key: `ai:ip:minute:${ipHash}`,
      limit: IP_RATE_LIMIT,
      windowMs: MINUTE_MS,
      message: "Too many requests from this network. Try again shortly.",
    },
    {
      key: `ai:user:day:${userId}`,
      limit: userDailyLimit,
      windowMs: DAY_MS,
      message: "Daily AI analysis limit reached. Try again tomorrow.",
    },
    {
      key: `ai:ip:day:${ipHash}`,
      limit: IP_DAILY_LIMIT,
      windowMs: DAY_MS,
      message: "Daily network AI analysis limit reached. Try again tomorrow.",
    },
  ];

  for (const check of checks) {
    const result = checkFallbackCounter(check.key, check.limit, check.windowMs);
    if (result.limited) {
      return {
        allowed: false,
        status: 429,
        message: check.message,
        retryAfter: result.retryAfter,
      };
    }
  }

  return { allowed: true };
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    firstForwardedIp ??
    "unknown"
  );
}

function hashClientIp(req: NextRequest): string | null {
  const secret = process.env.RATE_LIMIT_SECRET ?? process.env.GROK_API_KEY;
  if (!secret) return null;

  return createHash("sha256")
    .update(secret)
    .update(":")
    .update(getClientIp(req))
    .digest("hex");
}

function quotaMessage(reason: string | null | undefined) {
  switch (reason) {
    case "user_minute":
      return "Rate limit exceeded. Try again shortly.";
    case "ip_minute":
      return "Too many requests from this network. Try again shortly.";
    case "user_day":
      return "Daily AI analysis limit reached. Try again tomorrow.";
    case "ip_day":
      return "Daily network AI analysis limit reached. Try again tomorrow.";
    default:
      return "AI analysis quota exceeded.";
  }
}

async function checkUsageQuota(
  supabase: SupabaseServerClient,
  userId: string,
  ipHash: string,
  userCreatedAt?: string
): Promise<QuotaDecision> {
  const { data, error } = await supabase.rpc("consume_ai_analysis_quota", {
    p_ip_hash: ipHash,
  });

  if (error) {
    console.error("AI analysis quota RPC failed", error);

    if (process.env.NODE_ENV === "production") {
      return {
        allowed: false,
        status: 503,
        message: "AI analysis quota service unavailable.",
      };
    }

    return checkFallbackQuota(userId, ipHash, userCreatedAt);
  }

  const quota = data?.[0];
  if (!quota?.allowed) {
    return {
      allowed: false,
      status: 429,
      message: quotaMessage(quota?.reason),
      retryAfter: quota?.retry_after_seconds ?? undefined,
    };
  }

  return { allowed: true };
}

function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

function parseSymptoms(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null;

  const symptoms = (body as { symptoms?: unknown }).symptoms;
  if (!Array.isArray(symptoms) || symptoms.length === 0 || symptoms.length > 8) {
    return null;
  }

  const parsed: string[] = [];
  for (const symptom of symptoms) {
    if (typeof symptom !== "string") return null;

    const normalized = symptom.trim().toLowerCase();
    if (!ALLOWED_SYMPTOMS.has(normalized) || normalized.length > 32) {
      return null;
    }
    parsed.push(normalized);
  }

  return Array.from(new Set(parsed));
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function parseFindings(raw: string): Finding[] | null {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  const findings = parsed.slice(0, 3).map((item) => {
    if (!item || typeof item !== "object") return null;
    const source = item as Record<string, unknown>;

    const disease = boundedString(source.disease, 60);
    const probability = boundedString(source.probability, 40);
    const pct = boundedString(source.pct, 8);
    const desc = boundedString(source.desc, 160);

    if (!disease || !probability || !pct || !desc || !/^\d{1,3}%$/.test(pct)) {
      return null;
    }

    return { disease, probability, pct, desc };
  });

  if (findings.length === 0 || findings.some((finding) => finding === null)) {
    return null;
  }

  return findings as Finding[];
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const ipHash = hashClientIp(req);
  if (!ipHash) {
    return errorResponse("AI analysis quota service unavailable.", 503);
  }

  let payload: unknown;
  try {
    const bodyText = await req.text();
    if (new TextEncoder().encode(bodyText).length > MAX_BODY_BYTES) {
      return errorResponse("Request body is too large.", 413);
    }
    payload = JSON.parse(bodyText);
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const symptoms = parseSymptoms(payload);
  if (!symptoms || symptoms.length === 0) {
    return errorResponse("Invalid symptoms payload.", 400);
  }

  const quota = await checkUsageQuota(supabase, user.id, ipHash, user.created_at);
  if (!quota.allowed) {
    return errorResponse(
      quota.message,
      quota.status,
      quota.retryAfter ? { "Retry-After": String(quota.retryAfter) } : undefined
    );
  }

  const symptomList = symptoms.join(", ");

  let raw = "";
  try {
    const completion = await getGrok().chat.completions.create({
      model: GROK_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
      n: 1,
      messages: [
        {
          role: "system",
          content:
            "You are PANACEA, a clinical AI assistant specializing in infectious disease triage for underserved communities. " +
            "Respond only with a JSON array of 3 findings. Each finding must have: disease, probability, pct, and desc. " +
            "Order by descending probability. Never diagnose; frame every result as educational guidance only.",
        },
        {
          role: "user",
          content: `Symptoms reported as controlled enum values: ${symptomList}. Return JSON only, no extra text.`,
        },
      ],
    }, {
      maxRetries: 0,
      timeout: AI_TIMEOUT_MS,
    });

    raw = completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("AI analysis upstream failed", error);
    return errorResponse("Analysis service unavailable.", 502);
  }

  const findings = parseFindings(raw);
  if (!findings) {
    console.error("AI analysis response failed schema validation");
    return errorResponse("Analysis response failed validation.", 502);
  }

  return NextResponse.json({ findings });
}
