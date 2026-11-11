-- ============================================================================
-- GridStock v2 — Schema completo para Supabase (PostgreSQL)
-- Como aplicar:
-- 1. Abra o SQL Editor no painel do seu projeto no Supabase.
-- 2. Cole todo este conteúdo no SQL Editor e clique em "Run".
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ops', 'tech')),
  technician_id TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.warehouses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'default',
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  responsible TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'default',
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un.',
  min INTEGER NOT NULL DEFAULT 0,
  base_min INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  supplier TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.technicians (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'mint',
  vehicle TEXT NOT NULL,
  region TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  order_code TEXT NOT NULL DEFAULT '',
  client TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  checked_at BIGINT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.product_locations (
  warehouse_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT 'default',
  corridor TEXT NOT NULL,
  shelf TEXT NOT NULL,
  PRIMARY KEY (warehouse_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.stock_balances (
  location_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT 'default',
  qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (location_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.movements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'default',
  seq_num INTEGER NOT NULL,
  kind TEXT NOT NULL,
  technician_id TEXT,
  part_id TEXT,
  qty INTEGER,
  warehouse_id TEXT,
  from_id TEXT,
  to_id TEXT,
  from_address TEXT,
  to_address TEXT,
  order_code TEXT,
  placement TEXT,
  note TEXT,
  operator TEXT,
  before_qty INTEGER,
  delta INTEGER,
  serial TEXT,
  photo TEXT,
  ts BIGINT NOT NULL
);

-- Índices para performance de consultas
CREATE INDEX IF NOT EXISTS idx_users_technician_id ON public.users (technician_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_movements_ts ON public.movements (ts DESC, seq_num DESC);
CREATE INDEX IF NOT EXISTS idx_warehouses_sort ON public.warehouses (sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_products_sort ON public.products (sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_technicians_sort ON public.technicians (sort_order ASC);

-- Habilitar RLS (Row Level Security) em todas as tabelas públicas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

-- Dados acessados exclusivamente pelo servidor com chave secreta.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','sessions','app_meta','warehouses','products','technicians','product_locations','stock_balances','movements'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'gridstock_api_access_' || t, t);
  END LOOP;
END $$;
