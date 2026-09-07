-- =====================================================================
-- HOSPITAL HUMANITARIO · FUNDACIÓN PABLO JARAMILLO CRESPO
-- Sistema de Gestión Hospitalaria — esquema de base de datos
-- Proyecto Supabase: hqmqeoggdplvawhaxspw
--
-- Ejecute este archivo completo en:  Supabase → SQL Editor → New query → Run
-- Es idempotente: puede volver a ejecutarlo sin romper nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PERFILES DE USUARIO
--    Cada usuario creado en Authentication tiene aquí su nombre, su rol
--    y el permiso para cargar matrices.
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nombre        text not null,
  rol           text not null default 'Consulta',
  puede_cargar  boolean not null default false,
  creado_en     timestamptz not null default now()
);

comment on table  public.perfiles is 'Nombre, rol y permisos de cada usuario del sistema';
comment on column public.perfiles.puede_cargar is 'true = puede publicar matrices mensuales';

alter table public.perfiles enable row level security;

drop policy if exists "perfiles_lectura" on public.perfiles;
create policy "perfiles_lectura"
  on public.perfiles for select
  to authenticated
  using (true);

-- Los perfiles se administran desde el panel de Supabase, no desde la app:
-- no se crean políticas de insert, update ni delete.


-- ---------------------------------------------------------------------
-- 2. MATRIZ DE PRODUCCIÓN
--    Una fila por cada carga mensual. Los envíos quedan grabados y no
--    son modificables: solo se permite insertar y leer.
-- ---------------------------------------------------------------------
create table if not exists public.matriz_produccion (
  id             bigint generated always as identity primary key,
  anio           integer not null,
  periodo        text,
  datos          jsonb not null,
  subido_por     uuid not null default auth.uid() references auth.users(id),
  subido_nombre  text,
  creado_en      timestamptz not null default now()
);

create index if not exists idx_matriz_produccion_fecha
  on public.matriz_produccion (anio desc, creado_en desc);

alter table public.matriz_produccion enable row level security;

drop policy if exists "produccion_lectura" on public.matriz_produccion;
create policy "produccion_lectura"
  on public.matriz_produccion for select
  to authenticated
  using (true);

drop policy if exists "produccion_carga" on public.matriz_produccion;
create policy "produccion_carga"
  on public.matriz_produccion for insert
  to authenticated
  with check (
    subido_por = auth.uid()
    and exists (select 1 from public.perfiles p
                where p.id = auth.uid() and p.puede_cargar)
  );

-- Sin políticas de update ni delete: una vez publicada, la matriz
-- no se modifica ni se elimina. Para corregir un mes se publica una
-- versión nueva y el sistema muestra la más reciente.


-- ---------------------------------------------------------------------
-- 3. MATRIZ FINANCIERA
--    Misma lógica, en una tabla independiente para que la información
--    económica no se mezcle con la asistencial.
-- ---------------------------------------------------------------------
create table if not exists public.matriz_financiera (
  id             bigint generated always as identity primary key,
  anio           integer not null,
  periodo        text,
  datos          jsonb not null,
  subido_por     uuid not null default auth.uid() references auth.users(id),
  subido_nombre  text,
  creado_en      timestamptz not null default now()
);

create index if not exists idx_matriz_financiera_fecha
  on public.matriz_financiera (anio desc, creado_en desc);

alter table public.matriz_financiera enable row level security;

drop policy if exists "financiera_lectura" on public.matriz_financiera;
create policy "financiera_lectura"
  on public.matriz_financiera for select
  to authenticated
  using (true);

drop policy if exists "financiera_carga" on public.matriz_financiera;
create policy "financiera_carga"
  on public.matriz_financiera for insert
  to authenticated
  with check (
    subido_por = auth.uid()
    and exists (select 1 from public.perfiles p
                where p.id = auth.uid() and p.puede_cargar)
  );


-- ---------------------------------------------------------------------
-- 4. HISTORIAL DE PUBLICACIONES  (vista de auditoría)
--    Útil para revisar quién publicó qué y cuándo, sin traer los datos.
-- ---------------------------------------------------------------------
create or replace view public.historial_cargas as
  select 'Producción'::text as modulo, id, anio, periodo, subido_nombre, creado_en
    from public.matriz_produccion
  union all
  select 'Financiero'::text as modulo, id, anio, periodo, subido_nombre, creado_en
    from public.matriz_financiera
  order by creado_en desc;


-- =====================================================================
-- 5. ALTA DE USUARIOS  —  pasos posteriores
--
-- a) Authentication → Users → Add user → Create new user
--    Marque "Auto Confirm User" para que no requiera correo de validación.
--
-- b) Copie el UUID del usuario recién creado y regístrelo aquí abajo.
--    Reemplace los UUID de ejemplo por los reales y ejecute solo este
--    bloque (puede ejecutarlo las veces que necesite).
-- =====================================================================

-- insert into public.perfiles (id, nombre, rol, puede_cargar) values
--   ('00000000-0000-0000-0000-000000000000',
--    'Dra. María Fernanda Arias Carrillo', 'Dirección General', true),
--   ('11111111-1111-1111-1111-111111111111',
--    'Gerencia', 'Gerencia', false)
-- on conflict (id) do update
--   set nombre = excluded.nombre,
--       rol = excluded.rol,
--       puede_cargar = excluded.puede_cargar;


-- Alternativa sin copiar UUID: registra el perfil buscando por correo.
-- Ejecútelo después de crear el usuario en Authentication.
--
-- insert into public.perfiles (id, nombre, rol, puede_cargar)
-- select u.id, 'Dra. María Fernanda Arias Carrillo', 'Dirección General', true
--   from auth.users u
--  where u.email = 'fernanda@hospitalhumanitario.org'
-- on conflict (id) do update
--   set nombre = excluded.nombre,
--       rol = excluded.rol,
--       puede_cargar = excluded.puede_cargar;
