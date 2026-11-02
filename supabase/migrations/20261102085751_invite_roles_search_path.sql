-- Security advisor: pin the search path of the invite-roles helper (same definition as in editor_team)
create or replace function app.allowed_invite_roles(p_type org_type) returns member_role[]
language sql immutable set search_path = public as $$
  select case p_type
    when 'platform' then array['ops','finance','support','content']::member_role[]
    else array['manager','staff']::member_role[] end
$$;
