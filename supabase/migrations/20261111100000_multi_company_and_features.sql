-- ============================================================================
-- Migração Incremental: Suporte Multi-Empresa Relacional + Custos, Série e Foto
-- Aplique no SQL Editor do Supabase caso já tenha criado as tabelas antes.
-- ============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier TEXT NOT NULL DEFAULT '';
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE public.product_locations ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE public.stock_balances ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS serial TEXT;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS photo TEXT;

CREATE INDEX IF NOT EXISTS idx_products_company ON public.products (company_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_movements_company_ts ON public.movements (company_id, ts DESC, seq_num DESC);
CREATE INDEX IF NOT EXISTS idx_movements_serial ON public.movements (serial) WHERE serial IS NOT NULL;

