-- The browser sanitizes supported images through canvas before upload.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'repair-images';