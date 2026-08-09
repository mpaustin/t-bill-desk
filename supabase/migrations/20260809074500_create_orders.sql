create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  term text not null check (term in ('1M', '2M', '3M', '4M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y')),
  amount numeric(14, 2) not null check (amount >= 100),
  yield numeric(8, 4) not null,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can read their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can create their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);
