-- FLP Performance – neue Einwilligung: Fotos/Videos des Kindes auf der Website
-- Eltern erteilen oder widerrufen sie im Elternbereich (Historie in guardian_consents).
alter type public.consent_type add value if not exists 'website_media';
