begin;
alter table public.device_links add column if not exists minted_token text;
alter table public.device_links add column if not exists minted_token_expires_at timestamptz;
create index if not exists idx_device_links_status on public.device_links(status);
commit;
