-- Allow server admins (level >= 80) to manage sticker packs for their server
CREATE POLICY "packs_manage_admin" ON public.sticker_packs FOR ALL TO authenticated
  USING (
    server_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.server_members
      WHERE server_id = sticker_packs.server_id AND user_id = auth.uid() AND level >= 80)
  )
  WITH CHECK (
    server_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.server_members
      WHERE server_id = sticker_packs.server_id AND user_id = auth.uid() AND level >= 80)
  );

-- Allow server admins to manage stickers in their server's packs
CREATE POLICY "stickers_manage_admin" ON public.stickers FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sticker_packs p
      WHERE p.id = pack_id AND p.server_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM public.server_members
        WHERE server_id = p.server_id AND user_id = auth.uid() AND level >= 80))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sticker_packs p
      WHERE p.id = pack_id AND p.server_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM public.server_members
        WHERE server_id = p.server_id AND user_id = auth.uid() AND level >= 80))
  );
