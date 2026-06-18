
CREATE POLICY "photos_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'candidate-photos');
CREATE POLICY "photos_admin_write_v2" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidate-photos' AND public.is_admin());
CREATE POLICY "photos_admin_update_v2" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'candidate-photos' AND public.is_admin());
CREATE POLICY "photos_admin_delete_v2" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'candidate-photos' AND public.is_admin());
