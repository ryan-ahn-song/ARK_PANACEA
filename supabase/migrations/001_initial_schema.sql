-- ============================================================
-- PANACEA Digital Health — Initial Schema
-- Team ARK · 16th e-ICON World Contest
-- Apply with: supabase db push  OR  paste into Supabase SQL editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper: updated_at trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.created_at = OLD.created_at; RETURN NEW; END; $$;

-- ════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ════════════════════════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT,
  avatar_url     TEXT,
  tier           TEXT    DEFAULT 'Community',
  xp             INTEGER DEFAULT 0,
  guardian_level INTEGER DEFAULT 1,
  percentile     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, xp, guardian_level)
  VALUES (NEW.id, 0, 1)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── missions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.missions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  xp_reward   INTEGER DEFAULT 50,
  is_active   BOOLEAN DEFAULT TRUE,
  tag         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── user_missions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_missions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id   UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  streak_day   INTEGER DEFAULT 1,
  UNIQUE (user_id, mission_id, completed_at::DATE)
);
CREATE INDEX IF NOT EXISTS user_missions_user_id_idx ON public.user_missions(user_id);
CREATE INDEX IF NOT EXISTS user_missions_completed_at_idx ON public.user_missions(completed_at);

-- ── health_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type       TEXT NOT NULL,
  severity   TEXT NOT NULL DEFAULT 'medium',
  note       TEXT,
  location   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS health_logs_user_id_idx ON public.health_logs(user_id);
CREATE INDEX IF NOT EXISTS health_logs_event_date_idx ON public.health_logs(event_date);

-- ── pathologies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pathologies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  color            TEXT DEFAULT '#000000',
  affected_zones   JSONB,   -- e.g. ["head","chest","abdomen"]
  symptom_clusters JSONB,   -- e.g. ["fever","chills","headache"]
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── risk_events ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.risk_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level        TEXT NOT NULL DEFAULT 'MEDIUM',  -- LOW | MEDIUM | HIGH
  description  TEXT,
  temp_celsius NUMERIC(4,1),
  humidity_pct NUMERIC(4,1),
  air_quality  TEXT,
  aqi          TEXT,
  location     TEXT,
  recorded_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS risk_events_recorded_at_idx ON public.risk_events(recorded_at);

-- ── heatmap_reports ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.heatmap_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_tag  TEXT,          -- MALARIA | DENGUE | TB | INFLUENZA etc.
  intensity    NUMERIC(3,2) DEFAULT 0.5 CHECK (intensity BETWEEN 0 AND 1),
  lat          NUMERIC(9,6) NOT NULL,
  lng          NUMERIC(9,6) NOT NULL,
  neighborhood TEXT,
  trend        TEXT,
  reported_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS heatmap_reports_disease_tag_idx ON public.heatmap_reports(disease_tag);
CREATE INDEX IF NOT EXISTS heatmap_reports_reported_at_idx ON public.heatmap_reports(reported_at);

-- ── reward_redemptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_code  TEXT NOT NULL,
  redeemed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, reward_code)   -- prevent double redemption
);
CREATE INDEX IF NOT EXISTS reward_redemptions_user_id_idx ON public.reward_redemptions(user_id);

-- ── ai_quota_log ──────────────────────────────────────────────────────────────
-- Persistent store for rate-limit windows (used by consume_ai_analysis_quota)
CREATE TABLE IF NOT EXISTS public.ai_quota_log (
  key        TEXT        NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  count      INTEGER     DEFAULT 0,
  PRIMARY KEY (key, window_end)
);
-- Auto-purge rows older than 2 days
CREATE INDEX IF NOT EXISTS ai_quota_log_window_end_idx ON public.ai_quota_log(window_end);

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions  ENABLE ROW LEVEL SECURITY;

-- profiles: own row only
CREATE POLICY "profiles_own"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- user_missions: own rows only
CREATE POLICY "user_missions_own"
  ON public.user_missions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- health_logs: own rows only
CREATE POLICY "health_logs_own"
  ON public.health_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- reward_redemptions: own rows only
CREATE POLICY "reward_redemptions_own"
  ON public.reward_redemptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read-only tables (no RLS needed for reads, but restrict writes)
ALTER TABLE public.missions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathologies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "missions_read"        ON public.missions        FOR SELECT USING (TRUE);
CREATE POLICY "pathologies_read"     ON public.pathologies     FOR SELECT USING (TRUE);
CREATE POLICY "risk_events_read"     ON public.risk_events     FOR SELECT USING (TRUE);
CREATE POLICY "heatmap_reports_read" ON public.heatmap_reports FOR SELECT USING (TRUE);

-- Authenticated users can insert into heatmap_reports (anonymised contributions)
CREATE POLICY "heatmap_reports_insert"
  ON public.heatmap_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: consume_ai_analysis_quota
-- Increments per-user + per-IP rate-limit counters.
-- Falls back to in-memory (app-side) if called without auth.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.consume_ai_analysis_quota(p_ip_hash TEXT)
RETURNS TABLE(
  allowed               BOOLEAN,
  reason                TEXT,
  retry_after_seconds   INTEGER,
  minute_remaining      INTEGER,
  day_remaining         INTEGER
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid          UUID       := auth.uid();
  v_now          TIMESTAMPTZ := NOW();
  v_min_win      TIMESTAMPTZ := date_trunc('minute', v_now) + INTERVAL '1 minute';
  v_day_win      TIMESTAMPTZ := date_trunc('day',    v_now) + INTERVAL '1 day';

  c_user_min  CONSTANT INTEGER := 5;
  c_ip_min    CONSTANT INTEGER := 20;
  c_user_day  CONSTANT INTEGER := 30;
  c_ip_day    CONSTANT INTEGER := 200;

  v_um INTEGER := 0;
  v_im INTEGER := 0;
  v_ud INTEGER := 0;
  v_id INTEGER := 0;
BEGIN
  -- Must be authenticated
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT FALSE, 'unauthorized'::TEXT, 0, 0, 0;
    RETURN;
  END IF;

  -- Purge old entries (best-effort, non-blocking)
  DELETE FROM public.ai_quota_log WHERE window_end < v_now - INTERVAL '2 days';

  -- Per-user minute window
  INSERT INTO public.ai_quota_log(key, window_end, count)
    VALUES ('um:' || v_uid, v_min_win, 1)
    ON CONFLICT (key, window_end) DO UPDATE SET count = ai_quota_log.count + 1
    RETURNING count INTO v_um;

  IF v_um > c_user_min THEN
    RETURN QUERY SELECT FALSE, 'user_minute'::TEXT,
      EXTRACT(EPOCH FROM (v_min_win - v_now))::INTEGER, 0, c_user_day;
    RETURN;
  END IF;

  -- Per-IP minute window
  IF p_ip_hash IS NOT NULL THEN
    INSERT INTO public.ai_quota_log(key, window_end, count)
      VALUES ('im:' || p_ip_hash, v_min_win, 1)
      ON CONFLICT (key, window_end) DO UPDATE SET count = ai_quota_log.count + 1
      RETURNING count INTO v_im;

    IF v_im > c_ip_min THEN
      RETURN QUERY SELECT FALSE, 'ip_minute'::TEXT,
        EXTRACT(EPOCH FROM (v_min_win - v_now))::INTEGER, c_user_min - v_um, c_user_day;
      RETURN;
    END IF;
  END IF;

  -- Per-user day window
  INSERT INTO public.ai_quota_log(key, window_end, count)
    VALUES ('ud:' || v_uid, v_day_win, 1)
    ON CONFLICT (key, window_end) DO UPDATE SET count = ai_quota_log.count + 1
    RETURNING count INTO v_ud;

  IF v_ud > c_user_day THEN
    RETURN QUERY SELECT FALSE, 'user_day'::TEXT,
      EXTRACT(EPOCH FROM (v_day_win - v_now))::INTEGER,
      c_user_min - v_um, 0;
    RETURN;
  END IF;

  -- Per-IP day window
  IF p_ip_hash IS NOT NULL THEN
    INSERT INTO public.ai_quota_log(key, window_end, count)
      VALUES ('id:' || p_ip_hash, v_day_win, 1)
      ON CONFLICT (key, window_end) DO UPDATE SET count = ai_quota_log.count + 1
      RETURNING count INTO v_id;

    IF v_id > c_ip_day THEN
      RETURN QUERY SELECT FALSE, 'ip_day'::TEXT,
        EXTRACT(EPOCH FROM (v_day_win - v_now))::INTEGER,
        c_user_min - v_um, c_user_day - v_ud;
      RETURN;
    END IF;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT TRUE, NULL::TEXT, 0,
    c_user_min - v_um, c_user_day - v_ud;
END; $$;

GRANT EXECUTE ON FUNCTION public.consume_ai_analysis_quota(TEXT) TO authenticated;
