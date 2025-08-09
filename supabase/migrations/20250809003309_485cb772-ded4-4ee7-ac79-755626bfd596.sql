
-- 1) Colunas de soft delete
alter table public.tickets add column if not exists deleted_at timestamptz;
alter table public.tickets add column if not exists deleted_by uuid;

alter table public.equipment_models add column if not exists deleted_at timestamptz;
alter table public.equipment_models add column if not exists deleted_by uuid;

alter table public.rma_requests add column if not exists deleted_at timestamptz;
alter table public.rma_requests add column if not exists deleted_by uuid;

alter table public.rma_steps add column if not exists deleted_at timestamptz;
alter table public.rma_steps add column if not exists deleted_by uuid;

-- 2) Indexes para soft delete
create index if not exists tickets_deleted_at_idx on public.tickets (deleted_at);
create index if not exists equipment_models_deleted_at_idx on public.equipment_models (deleted_at);
create index if not exists rma_requests_deleted_at_idx on public.rma_requests (deleted_at);
create index if not exists rma_steps_deleted_at_idx on public.rma_steps (deleted_at);

-- 3) Funções de soft delete / restore / listar / hard delete (Tickets)
create or replace function public.soft_delete_ticket(_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Not authenticated';
  end if;

  update public.tickets
  set deleted_at = now(), deleted_by = auth.uid()
  where id = _id and deleted_at is null;

  -- cascata: RMAs do ticket e suas etapas
  update public.rma_requests
  set deleted_at = now(), deleted_by = auth.uid()
  where ticket_id = _id and deleted_at is null;

  update public.rma_steps
  set deleted_at = now(), deleted_by = auth.uid()
  where rma_id in (select id from public.rma_requests where ticket_id = _id)
    and deleted_at is null;
end;
$$;

create or replace function public.restore_ticket(_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_at timestamptz;
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Not authenticated';
  end if;

  select deleted_at into v_deleted_at from public.tickets where id = _id;
  if v_deleted_at is null then
    return;
  end if;

  if v_deleted_at < now() - interval '30 days' then
    raise exception 'Restore window expired';
  end if;

  update public.tickets
  set deleted_at = null, deleted_by = null
  where id = _id;

  update public.rma_requests
  set deleted_at = null, deleted_by = null
  where ticket_id = _id
    and deleted_at is not null
    and deleted_at >= now() - interval '30 days';

  update public.rma_steps
  set deleted_at = null, deleted_by = null
  where rma_id in (select id from public.rma_requests where ticket_id = _id)
    and deleted_at is not null
    and deleted_at >= now() - interval '30 days';
end;
$$;

create or replace function public.list_deleted_tickets()
returns setof tickets
language sql
security definer
set search_path = ''
as $$
  select *
  from public.tickets
  where deleted_at is not null
    and deleted_at >= now() - interval '30 days'
  order by deleted_at desc, created_at desc;
$$;

create or replace function public.hard_delete_old_tickets()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
begin
  with del_steps as (
    delete from public.rma_steps
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
      and rma_id in (
        select id from public.rma_requests
        where deleted_at is not null
          and deleted_at < now() - interval '30 days'
      )
    returning 1
  ), del_rmas as (
    delete from public.rma_requests
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
    returning 1
  ), del_t as (
    delete from public.tickets
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
    returning 1
  )
  select (select count(*) from del_t)::bigint into v_count;

  return v_count;
end;
$$;

-- 4) Funções de soft delete / restore / listar / hard delete (Equipment Models)
create or replace function public.soft_delete_equipment_model(_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Not authenticated';
  end if;

  update public.equipment_models
  set deleted_at = now(), deleted_by = auth.uid()
  where id = _id and deleted_at is null;
end;
$$;

create or replace function public.restore_equipment_model(_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_at timestamptz;
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Not authenticated';
  end if;

  select deleted_at into v_deleted_at from public.equipment_models where id = _id;
  if v_deleted_at is null then
    return;
  end if;
  if v_deleted_at < now() - interval '30 days' then
    raise exception 'Restore window expired';
  end if;

  update public.equipment_models
  set deleted_at = null, deleted_by = null
  where id = _id;
end;
$$;

create or replace function public.list_deleted_equipment_models()
returns setof equipment_models
language sql
security definer
set search_path = ''
as $$
  select *
  from public.equipment_models
  where deleted_at is not null
    and deleted_at >= now() - interval '30 days'
  order by deleted_at desc, name;
$$;

create or replace function public.hard_delete_old_equipment_models()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with del as (
    delete from public.equipment_models
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::bigint from del;
$$;

-- 5) Funções de soft delete / restore / listar / hard delete (RMA Requests)
create or replace function public.soft_delete_rma_request(_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Not authenticated';
  end if;

  update public.rma_requests
  set deleted_at = now(), deleted_by = auth.uid()
  where id = _id and deleted_at is null;

  update public.rma_steps
  set deleted_at = now(), deleted_by = auth.uid()
  where rma_id = _id and deleted_at is null;
end;
$$;

create or replace function public.restore_rma_request(_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_at timestamptz;
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Not authenticated';
  end if;

  select deleted_at into v_deleted_at from public.rma_requests where id = _id;
  if v_deleted_at is null then
    return;
  end if;
  if v_deleted_at < now() - interval '30 days' then
    raise exception 'Restore window expired';
  end if;

  update public.rma_requests
  set deleted_at = null, deleted_by = null
  where id = _id;

  update public.rma_steps
  set deleted_at = null, deleted_by = null
  where rma_id = _id
    and deleted_at is not null
    and deleted_at >= now() - interval '30 days';
end;
$$;

create or replace function public.list_deleted_rma_requests(_ticket_id uuid default null)
returns setof rma_requests
language sql
security definer
set search_path = ''
as $$
  select *
  from public.rma_requests
  where deleted_at is not null
    and deleted_at >= now() - interval '30 days'
    and (_ticket_id is null or ticket_id = _ticket_id)
  order by deleted_at desc, created_at desc;
$$;

create or replace function public.hard_delete_old_rma_requests()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with del_steps as (
    delete from public.rma_steps
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
      and rma_id in (
        select id from public.rma_requests
        where deleted_at is not null
          and deleted_at < now() - interval '30 days'
      )
    returning 1
  ), del_rmas as (
    delete from public.rma_requests
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::bigint from del_rmas;
$$;

-- 6) Funções de soft delete / restore / listar / hard delete (RMA Steps)
create or replace function public.soft_delete_rma_step(_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Not authenticated';
  end if;

  update public.rma_steps
  set deleted_at = now(), deleted_by = auth.uid()
  where id = _id and deleted_at is null;
end;
$$;

create or replace function public.restore_rma_step(_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_at timestamptz;
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Not authenticated';
  end if;

  select deleted_at into v_deleted_at from public.rma_steps where id = _id;
  if v_deleted_at is null then
    return;
  end if;
  if v_deleted_at < now() - interval '30 days' then
    raise exception 'Restore window expired';
  end if;

  update public.rma_steps
  set deleted_at = null, deleted_by = null
  where id = _id;
end;
$$;

create or replace function public.list_deleted_rma_steps(_rma_id uuid default null)
returns setof rma_steps
language sql
security definer
set search_path = ''
as $$
  select *
  from public.rma_steps
  where deleted_at is not null
    and deleted_at >= now() - interval '30 days'
    and (_rma_id is null or rma_id = _rma_id)
  order by deleted_at desc, step_order;
$$;

create or replace function public.hard_delete_old_rma_steps()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with del as (
    delete from public.rma_steps
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::bigint from del;
$$;

-- 7) Atualizar políticas RLS para “todos autenticados” e ocultar soft-deletados

-- Tickets
drop policy if exists "Users can view their tickets or assigned tickets" on public.tickets;
drop policy if exists "Users can create tickets" on public.tickets;
drop policy if exists "Users can update their tickets or assigned tickets" on public.tickets;
drop policy if exists "Admins can delete tickets" on public.tickets;

create policy "Authenticated users can view tickets"
on public.tickets
for select
to authenticated
using (deleted_at is null);

create policy "Authenticated users can insert tickets"
on public.tickets
for insert
to authenticated
with check (true);

create policy "Authenticated users can update tickets"
on public.tickets
for update
to authenticated
using (deleted_at is null);

create policy "Admins can hard delete tickets"
on public.tickets
for delete
to authenticated
using (is_admin());

-- Equipment Models
drop policy if exists "Users can view equipment models" on public.equipment_models;
drop policy if exists "Admins can manage equipment models" on public.equipment_models;

create policy "Authenticated users can view equipment models"
on public.equipment_models
for select
to authenticated
using (deleted_at is null);

create policy "Authenticated users can insert equipment models"
on public.equipment_models
for insert
to authenticated
with check (true);

create policy "Authenticated users can update equipment models"
on public.equipment_models
for update
to authenticated
using (deleted_at is null);

create policy "Admins can hard delete equipment models"
on public.equipment_models
for delete
to authenticated
using (is_admin());

-- RMA Requests
drop policy if exists "Users can view RMA requests for their tickets" on public.rma_requests;
drop policy if exists "Users can create RMA requests for their tickets" on public.rma_requests;
drop policy if exists "Users can update RMA requests for their tickets" on public.rma_requests;
drop policy if exists "Admins can delete RMA requests" on public.rma_requests;

create policy "Authenticated users can view rma requests"
on public.rma_requests
for select
to authenticated
using (deleted_at is null);

create policy "Authenticated users can insert rma requests"
on public.rma_requests
for insert
to authenticated
with check (true);

create policy "Authenticated users can update rma requests"
on public.rma_requests
for update
to authenticated
using (deleted_at is null);

create policy "Admins can hard delete rma requests"
on public.rma_requests
for delete
to authenticated
using (is_admin());

-- RMA Steps
drop policy if exists "Users can view RMA steps for accessible RMAs" on public.rma_steps;
drop policy if exists "Users can update RMA steps for accessible RMAs" on public.rma_steps;
drop policy if exists "System can create RMA steps" on public.rma_steps;
drop policy if exists "Admins can delete RMA steps" on public.rma_steps;

create policy "Authenticated users can view rma steps"
on public.rma_steps
for select
to authenticated
using (deleted_at is null);

create policy "Authenticated users can insert rma steps"
on public.rma_steps
for insert
to authenticated
with check (true);

create policy "Authenticated users can update rma steps"
on public.rma_steps
for update
to authenticated
using (deleted_at is null);

create policy "Admins can hard delete rma steps"
on public.rma_steps
for delete
to authenticated
using (is_admin());

-- 8) Triggers de atualização de updated_at (quando existir a coluna) e resolved_at

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_tickets') then
    create trigger set_updated_at_tickets
    before update on public.tickets
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_equipment_models') then
    create trigger set_updated_at_equipment_models
    before update on public.equipment_models
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_rma_requests') then
    create trigger set_updated_at_rma_requests
    before update on public.rma_requests
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_ticket_resolved_at_trg') then
    create trigger set_ticket_resolved_at_trg
    before update on public.tickets
    for each row execute function public.set_ticket_resolved_at();
  end if;
end $$;
