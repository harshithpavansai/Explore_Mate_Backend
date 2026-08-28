-- =========================================================
-- ExploreMate Database Schema (PostgreSQL)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------- USERS -----------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(160) UNIQUE NOT NULL,
    phone           VARCHAR(20)  UNIQUE,
    password_hash   VARCHAR(255),
    firebase_uid    VARCHAR(128) UNIQUE,
    role            VARCHAR(20)  NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    avatar_url      TEXT,
    bio             TEXT,
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    xp              INTEGER      NOT NULL DEFAULT 0,
    level           INTEGER      NOT NULL DEFAULT 1,
    preferences     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ----------- OTP CODES (fallback when Firebase isn't used) -----------
CREATE TABLE IF NOT EXISTS otp_codes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    target      VARCHAR(160) NOT NULL,                  -- email or phone
    code_hash   VARCHAR(255) NOT NULL,
    purpose     VARCHAR(40)  NOT NULL DEFAULT 'verify', -- verify | reset | login
    expires_at  TIMESTAMPTZ  NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_target ON otp_codes(target, purpose);

-- ----------- REFRESH TOKENS -----------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked_at  TIMESTAMPTZ,
    user_agent  TEXT,
    ip_address  VARCHAR(64),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

-- ----------- DESTINATIONS -----------
CREATE TABLE IF NOT EXISTS destinations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(180) NOT NULL,
    city            VARCHAR(120),
    country         VARCHAR(120),
    category        VARCHAR(60)  NOT NULL DEFAULT 'attraction',
    description     TEXT,
    short_summary   TEXT,
    image_url       TEXT,
    images          JSONB NOT NULL DEFAULT '[]'::jsonb,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    address         TEXT,
    rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count    INTEGER       NOT NULL DEFAULT 0,
    price_level     INTEGER       NOT NULL DEFAULT 0,
    tags            TEXT[]        NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_hidden_gem   BOOLEAN       NOT NULL DEFAULT FALSE,
    metadata        JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dest_city     ON destinations(city);
CREATE INDEX IF NOT EXISTS idx_dest_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_dest_rating   ON destinations(rating DESC);
CREATE INDEX IF NOT EXISTS idx_dest_hidden   ON destinations(is_hidden_gem);
CREATE INDEX IF NOT EXISTS idx_dest_geo      ON destinations(latitude, longitude);

-- ----------- TRIPS -----------
CREATE TABLE IF NOT EXISTS trips (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(180) NOT NULL,
    destination     VARCHAR(180),
    start_date      DATE,
    end_date        DATE,
    budget          NUMERIC(12,2),
    travelers       INTEGER NOT NULL DEFAULT 1,
    status          VARCHAR(20)  NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('planned','ongoing','completed','cancelled')),
    itinerary       JSONB        NOT NULL DEFAULT '[]'::jsonb,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);

-- ----------- BOOKINGS (placeholder for trip activities) -----------
CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id  UUID REFERENCES destinations(id) ON DELETE SET NULL,
    trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
    type            VARCHAR(40)  NOT NULL DEFAULT 'activity',
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    party_size      INTEGER NOT NULL DEFAULT 1,
    cost            NUMERIC(10,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('pending','confirmed','cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);

-- ----------- REVIEWS -----------
CREATE TABLE IF NOT EXISTS reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id  UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           VARCHAR(180),
    body            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, destination_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_dest ON reviews(destination_id);

-- ----------- FAVORITES -----------
CREATE TABLE IF NOT EXISTS favorites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id  UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, destination_id)
);

-- ----------- AUDIO TOURS -----------
CREATE TABLE IF NOT EXISTS audio_tours (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destination_id  UUID REFERENCES destinations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    transcript      TEXT NOT NULL,
    audio_url       TEXT,
    language        VARCHAR(10) NOT NULL DEFAULT 'en',
    duration_sec    INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audio_tour_dest ON audio_tours(destination_id);

-- ----------- BADGES -----------
CREATE TABLE IF NOT EXISTS badges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    icon        VARCHAR(60),
    xp_reward   INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_id)
);

-- ----------- XP LOG (game events) -----------
CREATE TABLE IF NOT EXISTS xp_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action      VARCHAR(60) NOT NULL,
    points      INTEGER NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_logs(user_id);

-- ----------- NOTIFICATIONS -----------
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    body        TEXT,
    type        VARCHAR(40)  NOT NULL DEFAULT 'info',
    payload     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

-- ----------- TRIP HISTORY (visited places) -----------
CREATE TABLE IF NOT EXISTS trip_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id  UUID REFERENCES destinations(id) ON DELETE SET NULL,
    visited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_history_user ON trip_history(user_id);

-- ----------- TRIGGER: keep updated_at fresh -----------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','destinations','trips','reviews']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()', t);
  END LOOP;
END$$;
