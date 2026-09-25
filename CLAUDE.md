# Escuela de Socorrismo

Static web app (no build step) for a lifeguard training school: public landing, syllabus,
tests and grades. The user writes in Spanish; code, comments and UI text are in Spanish.

- Structure: see README.md. `js/` files are native ES modules loaded from `js/app.js`.
- Routing is hash-based (`#/curso/ID`); each screen is `js/vistas/*.js` exporting `render(el, { params, query })`.
- All data access goes through `js/almacen.js` (async, returns copies). It currently uses
  localStorage; Supabase will replace its internals only. `supabase/esquema.sql` is a draft, not applied.
- Everything interpolated into HTML must go through `esc()`; user-provided URLs through `urlSegura()`.
- Brand name and contact live in `js/config.js`.
- Visual design mirrors pj.fire (repo pepitomalo23-spec/Test): same tokens (`--bg`, `--card`, `--line`, `--purple`, `--coral`…), fonts (Anton titles, Inter text, Source Serif 4 questions, JetBrains Mono numbers), dark by default with `data-theme="light"`. Keep new UI consistent with it.
