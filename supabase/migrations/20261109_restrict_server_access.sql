DO $$
DECLARE t text;
BEGIN
FOREACH t IN ARRAY ARRAY['users','sessions','app_meta','warehouses','products','technicians','product_locations','stock_balances','movements']
LOOP
 EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
 EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
 EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'gridstock_api_access_' || t, t);
END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
