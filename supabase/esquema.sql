-- BORRADOR de la base de datos para cuando se conecte Supabase. Todavía NO está aplicado.
-- Sigue la misma forma que los datos de js/datos-demo.js, para que el paso sea directo.

-- Perfil de cada cuenta (las cuentas las gestiona Supabase Auth).
create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  email text not null unique,
  rol text not null default 'alumno' check (rol in ('alumno', 'admin'))
);

create table cursos (
  id text primary key,
  titulo text not null,
  descripcion text not null default '',
  horas int
);

-- A qué cursos tiene acceso cada alumno.
create table matriculas (
  usuario_id uuid references perfiles on delete cascade,
  curso_id text references cursos on delete cascade,
  primary key (usuario_id, curso_id)
);

create table temas (
  id text primary key,
  curso_id text not null references cursos on delete cascade,
  orden int not null,
  titulo text not null,
  resumen text not null default '',
  contenido text not null default '',
  recursos jsonb not null default '[]'   -- [{ tipo, titulo, url }]
);

create table preguntas (
  id text primary key,
  tema_id text not null references temas on delete cascade,
  enunciado text not null,
  opciones jsonb not null,                -- ["opción a", "opción b", …]
  correcta int not null,
  explicacion text not null default ''
);

-- Cada test terminado, con una copia de sus preguntas para poder revisarlo aunque cambien.
create table intentos (
  id text primary key,
  usuario_id uuid not null references perfiles on delete cascade,
  curso_id text not null,
  fecha timestamptz not null default now(),
  datos jsonb not null                    -- el resto del intento, como lo guarda la web
);

create index on temas (curso_id, orden);
create index on preguntas (tema_id);
create index on intentos (usuario_id, fecha desc);

-- ---------- Permisos (RLS) ----------

create function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'admin');
$$;

create function matriculado(curso text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matriculas where usuario_id = auth.uid() and curso_id = curso);
$$;

alter table perfiles enable row level security;
alter table cursos enable row level security;
alter table matriculas enable row level security;
alter table temas enable row level security;
alter table preguntas enable row level security;
alter table intentos enable row level security;

-- La portada pública enseña los cursos.
create policy "cursos: todos leen" on cursos for select using (true);
create policy "cursos: admin edita" on cursos for all using (es_admin()) with check (es_admin());

create policy "perfiles: el suyo o admin" on perfiles for select using (id = auth.uid() or es_admin());
create policy "perfiles: admin edita" on perfiles for all using (es_admin()) with check (es_admin());

create policy "matriculas: las suyas o admin" on matriculas for select using (usuario_id = auth.uid() or es_admin());
create policy "matriculas: admin edita" on matriculas for all using (es_admin()) with check (es_admin());

create policy "temas: matriculados o admin" on temas for select using (matriculado(curso_id) or es_admin());
create policy "temas: admin edita" on temas for all using (es_admin()) with check (es_admin());

-- El alumno necesita la respuesta correcta para que el test se corrija en su móvil
-- (también sin conexión). Es lo normal en una web de estudio; si algún día se hacen
-- exámenes oficiales, la corrección tendría que hacerse en el servidor.
create policy "preguntas: matriculados o admin" on preguntas for select
  using (es_admin() or exists (select 1 from temas t where t.id = tema_id and matriculado(t.curso_id)));
create policy "preguntas: admin edita" on preguntas for all using (es_admin()) with check (es_admin());

create policy "intentos: los suyos o admin" on intentos for select using (usuario_id = auth.uid() or es_admin());
create policy "intentos: cada uno guarda los suyos" on intentos for insert
  with check (usuario_id = auth.uid() and matriculado(curso_id));
create policy "intentos: admin borra" on intentos for delete using (es_admin());
