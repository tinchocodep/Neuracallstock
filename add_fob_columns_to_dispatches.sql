-- Add FOB columns to dispatches table
-- This migration adds columns to track FOB totals in USD and ARS

-- Add total_fob_usd column (will be populated from invoice_grand_total by N8N)
ALTER TABLE dispatches 
ADD COLUMN IF NOT EXISTS total_fob_usd DECIMAL(12, 2) DEFAULT 0;

-- Add total_fob_ars column (will be calculated as total_fob_usd * tipo_de_cambio)
ALTER TABLE dispatches 
ADD COLUMN IF NOT EXISTS total_fob_ars DECIMAL(12, 2) DEFAULT 0;

-- Add comment to columns
COMMENT ON COLUMN dispatches.total_fob_usd IS 'Total FOB in USD from invoice_grand_total (set by N8N webhook)';
COMMENT ON COLUMN dispatches.total_fob_ars IS 'Total FOB in ARS (total_fob_usd * tipo_de_cambio)';
