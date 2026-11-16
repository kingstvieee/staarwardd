-- Private atomic replay gate; must be invoked only AFTER independent
-- Ed25519 signature and hardware-backed owner step-up verification.
-- This function never changes control mode or authorizes recovery.
CREATE OR REPLACE FUNCTION starcenttinel_private.consume_verified_challenge(
  p_nonce_hash bytea,
  p_owner_subject uuid,
  p_action text,
  p_expected_revision bigint
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE v_consumed integer;
BEGIN
  IF p_nonce_hash IS NULL OR octet_length(p_nonce_hash) <> 32
     OR p_owner_subject IS NULL
     OR p_action NOT IN ('owner.recover','owner.lockdown')
     OR p_expected_revision IS NULL THEN
    RETURN false;
  END IF;
  UPDATE starcenttinel_private.owner_challenges
  SET consumed_at = clock_timestamp()
  WHERE nonce_hash = p_nonce_hash
    AND owner_subject = p_owner_subject
    AND action = p_action
    AND expected_revision = p_expected_revision
    AND consumed_at IS NULL
    AND issued_at <= clock_timestamp()
    AND expires_at > clock_timestamp()
    AND EXISTS (
      SELECT 1 FROM starcenttinel_private.control_state
      WHERE singleton = 1 AND revision = p_expected_revision
    );
  GET DIAGNOSTICS v_consumed = ROW_COUNT;
  RETURN v_consumed = 1;
END;
$$;
REVOKE ALL ON FUNCTION starcenttinel_private.consume_verified_challenge(bytea,uuid,text,bigint)
FROM PUBLIC, anon, authenticated;
