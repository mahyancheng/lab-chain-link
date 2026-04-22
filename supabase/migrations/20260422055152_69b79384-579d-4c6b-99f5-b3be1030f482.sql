
DO $$
DECLARE
  customer_id uuid;
  lab_id uuid;
  admin_id uuid;
  encrypted_pw text := crypt('Password123!', gen_salt('bf'));
BEGIN
  -- CUSTOMER
  SELECT id INTO customer_id FROM auth.users WHERE email = 'customer@demo.com';
  IF customer_id IS NULL THEN
    customer_id := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', customer_id, 'authenticated', 'authenticated', 'customer@demo.com', encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Customer","company":"Acme Farms"}', now(), now(), '', '', '', '');
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), customer_id, jsonb_build_object('sub', customer_id::text, 'email', 'customer@demo.com'), 'email', customer_id::text, now(), now(), now());
  END IF;

  -- LAB
  SELECT id INTO lab_id FROM auth.users WHERE email = 'lab@demo.com';
  IF lab_id IS NULL THEN
    lab_id := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', lab_id, 'authenticated', 'authenticated', 'lab@demo.com', encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Lab Tech"}', now(), now(), '', '', '', '');
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), lab_id, jsonb_build_object('sub', lab_id::text, 'email', 'lab@demo.com'), 'email', lab_id::text, now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (lab_id, 'lab')
    ON CONFLICT DO NOTHING;

  -- ADMIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@demo.com';
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated', 'admin@demo.com', encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Admin"}', now(), now(), '', '', '', '');
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), admin_id, jsonb_build_object('sub', admin_id::text, 'email', 'admin@demo.com'), 'email', admin_id::text, now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin')
    ON CONFLICT DO NOTHING;
END $$;
