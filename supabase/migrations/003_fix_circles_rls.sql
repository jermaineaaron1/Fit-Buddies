-- Allow authenticated users to create circles
create policy "Users can create circles"
  on circles for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Allow circle owners/members to update their circle
create policy "Circle owners can update their circle"
  on circles for update
  to authenticated
  using (owner_id = auth.uid());
