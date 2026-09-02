-- ============================================================================
-- Belt change notifications.
--
-- The belt changes hands inside calculate_belt_scores(), which runs under
-- pg_cron with no user session and therefore no client to call the push
-- function. pg_net lets Postgres make the HTTP call itself, asynchronously, so
-- the scoring run never blocks on it.
--
-- The service role key is read from Vault rather than hardcoded. If it is
-- absent the helper quietly does nothing: scoring is the critical path and must
-- never fail because notifications aren't configured yet.
-- ============================================================================

-- No `with schema` clause: pg_net pins its own `net` schema and errors if you
-- try to place it elsewhere, which aborts the whole migration on line 1.
create extension if not exists pg_net;

-- ----------------------------------------------------------------------------
-- Fire-and-forget push for a title change. Returns true only when a request was
-- actually queued, so callers can tell "sent" from "not configured".
-- ----------------------------------------------------------------------------
create or replace function belt_notify_champion(p_circle_id uuid, p_winner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  v_key text;
  v_url text;
begin
  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'functions_base_url' limit 1;

  -- Not configured yet: skip silently rather than breaking the scoring run.
  if v_key is null or v_url is null then
    return false;
  end if;

  -- net.http_post queues the request and returns immediately; the cron job does
  -- not wait on Expo's push service.
  perform net.http_post(
    url     := v_url || '/send-push',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := jsonb_build_object(
                 'event',    'belt_changed',
                 'circleId', p_circle_id,
                 'actorId',  p_winner_id
               )
  );
  return true;
exception when others then
  -- A push failure must never roll back a crowning.
  raise warning 'belt_notify_champion failed: %', sqlerrm;
  return false;
end $$;

revoke all on function belt_notify_champion(uuid, uuid) from public, anon, authenticated;
