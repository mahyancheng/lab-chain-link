-- Customer support messages: bidirectional chat between staff and a customer.
-- A "thread" is per customer (customer_id). Staff and the owning customer can read/post.
create table if not exists public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  author_id uuid not null,
  author_role public.app_role not null,
  body text not null,
  order_ref uuid,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists customer_messages_customer_idx on public.customer_messages (customer_id, created_at desc);
create index if not exists customer_messages_order_ref_idx on public.customer_messages (order_ref);

alter table public.customer_messages enable row level security;

-- Staff can read everything
create policy "messages staff read"
on public.customer_messages for select
to public
using (public.is_staff(auth.uid()));

-- Customer can read own thread (excluding internal-only notes)
create policy "messages customer read own"
on public.customer_messages for select
to public
using (auth.uid() = customer_id and internal = false);

-- Customer can post into their own thread (cannot mark internal)
create policy "messages customer insert own"
on public.customer_messages for insert
to public
with check (
  auth.uid() = customer_id
  and author_id = auth.uid()
  and author_role = 'customer'
  and internal = false
);

-- Staff can post into any customer thread
create policy "messages staff insert"
on public.customer_messages for insert
to public
with check (
  public.is_staff(auth.uid())
  and author_id = auth.uid()
  and author_role in ('lab','admin')
);

-- Realtime
alter publication supabase_realtime add table public.customer_messages;