-- CRM de Nelomux · esquema para Supabase
-- Pegar completo en Supabase → SQL Editor → New query → Run. Se puede correr más de una vez sin romper nada.
--
-- Seguridad:
--   · Cualquier visitante (rol anon) solo puede CREAR un contacto desde el formulario, y solo con las columnas del formulario.
--     No puede leer, cambiar ni borrar nada.
--   · Solo los usuarios con sesión iniciada (rol authenticated, es decir, tú) pueden ver y trabajar los contactos.
--     Crea tu usuario en Authentication → Users → Add user, y desactiva el registro público en
--     Authentication → Sign In / Providers → "Allow new users to sign up" = off.

create extension if not exists pgcrypto;

-- Contactos (leads) ---------------------------------------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- lo que llena el visitante
  nombre        text not null check (char_length(nombre) between 2 and 120),
  empresa       text check (char_length(empresa) <= 160),
  email         text check (email is null or (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  whatsapp      text check (char_length(whatsapp) <= 40),
  interes       text[] not null default '{}' check (cardinality(interes) <= 12),
  equipo        text check (char_length(equipo) <= 40),
  mensaje       text check (char_length(mensaje) <= 2000),
  idioma        text not null default 'es' check (idioma in ('es','en')),
  origen        text check (char_length(origen) <= 300),
  -- lo que trabajas tú en el CRM
  etapa         text not null default 'nuevo'
                check (etapa in ('nuevo','contactado','demo_agendada','propuesta','ganado','perdido')),
  valor         numeric(12,2) check (valor is null or valor >= 0),
  proximo_paso  text check (char_length(proximo_paso) <= 300),
  proxima_fecha date,
  constraint contacto_minimo check (email is not null or whatsapp is not null)
);

create index if not exists leads_etapa_idx on public.leads (etapa);
create index if not exists leads_created_idx on public.leads (created_at desc);

-- Historial de cada contacto (notas, cambios de etapa, llamadas) -------------
create table if not exists public.lead_eventos (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  created_at  timestamptz not null default now(),
  tipo        text not null default 'nota' check (tipo in ('nota','etapa','llamada','whatsapp','email','sistema')),
  texto       text not null check (char_length(texto) between 1 and 4000)
);
create index if not exists lead_eventos_lead_idx on public.lead_eventos (lead_id, created_at desc);

-- updated_at automático --------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();

-- Registrar en el historial cada cambio de etapa ------------------------------
create or replace function public.log_etapa() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_eventos (lead_id, tipo, texto) values (new.id, 'sistema', 'Contacto recibido desde ' || coalesce(new.origen, 'el sitio'));
  elsif new.etapa is distinct from old.etapa then
    insert into public.lead_eventos (lead_id, tipo, texto) values (new.id, 'etapa', old.etapa || ' → ' || new.etapa);
  end if;
  return new;
end $$;
drop trigger if exists leads_log_etapa on public.leads;
create trigger leads_log_etapa after insert or update on public.leads for each row execute function public.log_etapa();

-- Permisos ---------------------------------------------------------------------
alter table public.leads enable row level security;
alter table public.lead_eventos enable row level security;

revoke all on public.leads from anon;
revoke all on public.lead_eventos from anon;
-- el visitante solo puede insertar estas columnas (no puede elegir etapa, valor, etc.)
grant insert (nombre, empresa, email, whatsapp, interes, equipo, mensaje, idioma, origen) on public.leads to anon;

grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.lead_eventos to authenticated;

drop policy if exists "formulario publico" on public.leads;
create policy "formulario publico" on public.leads for insert to anon with check (etapa = 'nuevo');

drop policy if exists "equipo lee y edita" on public.leads;
create policy "equipo lee y edita" on public.leads for all to authenticated using (true) with check (true);

drop policy if exists "equipo historial" on public.lead_eventos;
create policy "equipo historial" on public.lead_eventos for all to authenticated using (true) with check (true);
