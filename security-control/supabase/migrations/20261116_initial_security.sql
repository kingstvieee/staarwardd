-- StarCenttinel independent control plane: defensive schema, not a deployment.
-- Requires its own Supabase project, separate administrator credentials and security review.
-- No public Data API access is granted. Initial state is LOCKDOWN.
BEGIN;

CREATE SCHEMA IF NOT EXISTS starcenttinel_private;
REVOKE ALL ON SCHEMA starcenttinel_private FROM PUBLIC;
REVOKE ALL ON SCHEMA starcenttinel_private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS starcenttinel_private.control_state (
  singleton SMALLINT PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  mode TEXT NOT NULL DEFAULT 'LOCKDOWN'
    CHECK (mode IN ('NORMAL','CAUTION','CONTAIN','LOCKDOWN')),
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL DEFAULT 'unprovisioned_default_lockdown',
  external_authority_verified BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO starcenttinel_private.control_state(singleton)
VALUES (1) ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS starcenttinel_private.owner_challenges (
  nonce_hash BYTEA PRIMARY KEY CHECK (octet_length(nonce_hash) = 32),
  owner_subject UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('owner.recover','owner.lockdown')),
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  expected_revision BIGINT NOT NULL CHECK (expected_revision >= 0),
  CHECK (expires_at > issued_at AND expires_at <= issued_at + interval '2 minutes')
);
CREATE INDEX IF NOT EXISTS owner_challenges_expiry
ON starcenttinel_private.owner_challenges(expires_at);

CREATE TABLE IF NOT EXISTS starcenttinel_private.credential_revocations (
  credential_fingerprint BYTEA PRIMARY KEY CHECK (octet_length(credential_fingerprint) = 32),
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_confirmed_at TIMESTAMPTZ,
  verification_reference TEXT,
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED','IN_PROGRESS','PROVIDER_CONFIRMED','FAILED')),
  CHECK ((status = 'PROVIDER_CONFIRMED') =
         (provider_confirmed_at IS NOT NULL AND verification_reference IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS starcenttinel_private.security_audit (
  sequence BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  actor_subject TEXT NOT NULL,
  state_revision BIGINT NOT NULL CHECK (state_revision >= 0),
  event_body JSONB NOT NULL,
  previous_digest BYTEA,
  event_digest BYTEA NOT NULL CHECK (octet_length(event_digest) = 32)
);

-- Appending is permitted only to properly authorized backend roles.
-- Existing rows cannot be changed using ordinary DML; this is NOT
-- tamperproof against database owners, superusers, or out-of-band backups.
CREATE OR REPLACE FUNCTION starcenttinel_private.prevent_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'security_audit is append-only';
END;
$$;
DROP TRIGGER IF EXISTS security_audit_append_only ON starcenttinel_private.security_audit;
CREATE TRIGGER security_audit_append_only
BEFORE UPDATE OR DELETE ON starcenttinel_private.security_audit
FOR EACH ROW EXECUTE FUNCTION starcenttinel_private.prevent_audit_mutation();

ALTER TABLE starcenttinel_private.control_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE starcenttinel_private.owner_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE starcenttinel_private.credential_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE starcenttinel_private.security_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA starcenttinel_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA starcenttinel_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION starcenttinel_private.prevent_audit_mutation() FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA starcenttinel_private REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA starcenttinel_private REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;
