-- 0001: Core schema for auth, billing, device links, CLI tokens, secrets, and entitlements
-- Idempotent migration: uses DROP POLICY IF EXISTS before CREATE POLICY

begin;

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pgsodium;

-- Schemas
create schema if not exists internal;

-- Tables
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text not null unique,
  product_id text not null,
  price_id text not null,
  status text not null,
  current_period_end timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

create table if not exists public.device_links (
  code text primary key,
  user_id uuid,
  status text not null check (status in ('pending','linked','expired')),
  client_reference_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists idx_device_links_expires_at on public.device_links(expires_at);

create table if not exists public.cli_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  device_label text,
  scopes text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at timestamptz
);
create index if not exists idx_cli_tokens_user_id on public.cli_tokens(user_id);

create table if not exists public.secrets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ciphertext bytea not null,
  nonce bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists idx_secrets_user_id on public.secrets(user_id);

-- RLS and policies
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
drop policy if exists "profiles_modify_own" on public.profiles;
create policy "profiles_modify_own" on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.customers enable row level security;
drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own" on public.customers for select using (auth.uid() = user_id);
drop policy if exists "customers_modify_own" on public.customers;
create policy "customers_modify_own" on public.customers for insert with check (auth.uid() = user_id);
drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own" on public.customers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.subscriptions enable row level security;
drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions for select using (auth.uid() = user_id);
-- inserts/updates handled by service role/webhooks only

alter table public.device_links enable row level security;
-- No public policies: accessed via service role in Edge Functions

alter table public.cli_tokens enable row level security;
drop policy if exists "cli_tokens_select_own" on public.cli_tokens;
create policy "cli_tokens_select_own" on public.cli_tokens for select using (auth.uid() = user_id);
-- insert/update/delete handled by service role

alter table public.secrets enable row level security;
drop policy if exists "secrets_owner_all" on public.secrets;
create policy "secrets_owner_all" on public.secrets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- pgsodium key for secrets (idempotent creation by name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pgsodium.key WHERE name = 'economist_cli_secrets_key'
  ) THEN
    PERFORM pgsodium.create_key(name => 'economist_cli_secrets_key');
  END IF;
END $$;

-- Helper functions for encryption/decryption (SECURITY DEFINER)
create or replace function internal.secrets_encrypt(plaintext text)
returns table (ciphertext bytea, nonce bytea)
language plpgsql security definer set search_path = public, pg_temp as $$
DECLARE
  key_id uuid;
  n bytea;
  pt bytea;
  ct bytea;
BEGIN
  SELECT id INTO key_id FROM pgsodium.key WHERE name = 'economist_cli_secrets_key' LIMIT 1;
  IF key_id IS NULL THEN
    RAISE EXCEPTION 'Missing pgsodium key economist_cli_secrets_key';
  END IF;
  n := pgsodium.randombytes_buf(24);
  pt := convert_to(plaintext, 'utf8');
  ct := pgsodium.crypto_aead_xchacha20poly1305_ietf_encrypt(pt, 'economist_secrets', n, key_id);
  RETURN QUERY SELECT ct, n;
END;
$$;

create or replace function internal.secrets_decrypt(ct bytea, n bytea)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
DECLARE
  key_id uuid;
  pt bytea;
BEGIN
  SELECT id INTO key_id FROM pgsodium.key WHERE name = 'economist_cli_secrets_key' LIMIT 1;
  IF key_id IS NULL THEN
    RAISE EXCEPTION 'Missing pgsodium key economist_cli_secrets_key';
  END IF;
  pt := pgsodium.crypto_aead_xchacha20poly1305_ietf_decrypt(ct, 'economist_secrets', n, key_id);
  RETURN convert_from(pt, 'utf8');
END;
$$;

-- Public RPCs for secrets (callable by authenticated users)
create or replace function public.secrets_set(p_name text, p_value text)
returns void
language plpgsql security definer set search_path = public, internal, pg_temp as $$
DECLARE
  enc record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO enc FROM internal.secrets_encrypt(p_value);
  INSERT INTO public.secrets (user_id, name, ciphertext, nonce)
  VALUES (auth.uid(), p_name, enc.ciphertext, enc.nonce)
  ON CONFLICT (user_id, name)
  DO UPDATE SET ciphertext = EXCLUDED.ciphertext, nonce = EXCLUDED.nonce, updated_at = now();
END;
$$;

comment on function public.secrets_set(text, text) is 'Sets or updates a secret for the current user';

create or replace function public.secrets_get(p_name text)
returns text
language plpgsql security definer set search_path = public, internal, pg_temp as $$
DECLARE
  ct bytea;
  n bytea;
  val text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT s.ciphertext, s.nonce INTO ct, n FROM public.secrets s
  WHERE s.user_id = auth.uid() AND s.name = p_name;
  IF ct IS NULL THEN
    RAISE EXCEPTION 'Secret % not found', p_name USING ERRCODE = 'no_data_found';
  END IF;
  val := internal.secrets_decrypt(ct, n);
  RETURN val;
END;
$$;

comment on function public.secrets_get(text) is 'Gets and decrypts a secret for the current user';

create or replace function public.secrets_list()
returns table (name text, created_at timestamptz, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select name, created_at, updated_at from public.secrets where user_id = auth.uid() order by name asc;
$$;

comment on function public.secrets_list() is 'Lists secret names for the current user';

create or replace function public.secrets_delete(p_name text)
returns void
language sql security definer set search_path = public as $$
  delete from public.secrets where user_id = auth.uid() and name = p_name;
$$;

comment on function public.secrets_delete(text) is 'Deletes a secret by name for the current user';

-- Entitlements function
create or replace function public.get_entitlements()
returns table (
  is_pro boolean,
  plan_name text,
  current_period_end timestamptz
)
language sql security definer set search_path = public as $$
  select
    exists (
      select 1 from public.subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active','trialing')
        and s.current_period_end > now()
    ) as is_pro,
    (
      select case when s.status in ('active','trialing') and s.current_period_end > now() then 'pro' else null end
      from public.subscriptions s
      where s.user_id = auth.uid()
      order by s.current_period_end desc nulls last
      limit 1
    ) as plan_name,
    (
      select s.current_period_end
      from public.subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active','trialing')
      order by s.current_period_end desc nulls last
      limit 1
    ) as current_period_end;
$$;

comment on function public.get_entitlements() is 'Returns entitlement flags for the current user';

commit;
