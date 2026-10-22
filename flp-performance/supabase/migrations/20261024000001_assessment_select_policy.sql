-- FLP Performance – Leserichtlinie für Beurteilungen auf Zeilenwerte umstellen.
-- Vorher: can_view_assessment(id) suchte die Zeile per ID. Bei INSERT … RETURNING ist
-- die neue Zeile für diese Suche noch nicht sichtbar, wodurch das Anlegen fehlschlug.
-- Die neue Regel ist inhaltlich identisch, prüft aber die Spalten der Zeile direkt.

drop policy assessments_select on public.assessments;
create policy assessments_select on public.assessments for select to authenticated
  using (
    public.coaches_player(player_id)
    or (status = 'published' and public.can_view_player(player_id))
  );
