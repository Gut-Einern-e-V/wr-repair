-- Keep up to 4,000 repair images within the Supabase Free plan's 1 GB storage limit.
update storage.buckets
set file_size_limit = 204800
where id = 'repair-images';