-- ==============================================================================
-- NEURACALL EXACT SCHEMA RECONSTRUCTION
-- Generated from the provided JSON schema dump.
-- Run this in the Supabase SQL Editor of your NEW project.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    service_cost NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'active'::text,
    last_payment_date TIMESTAMPTZ,
    configuration JSONB DEFAULT '{}'::jsonb
);

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID NOT NULL, -- Linked to auth.users usually
    company_id UUID REFERENCES public.companies(id),
    role TEXT DEFAULT 'user'::text,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cuit TEXT NOT NULL,
    address TEXT,
    tax_condition TEXT NOT NULL,
    jurisdiction TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    company_id UUID REFERENCES public.companies(id)
);

-- 4. DISPATCHES
CREATE TABLE IF NOT EXISTS public.dispatches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dispatch_number VARCHAR NOT NULL,
    description TEXT,
    arrival_date DATE,
    status VARCHAR DEFAULT 'pending'::character varying,
    exchange_rate NUMERIC,
    total_freight_arg NUMERIC,
    total_customs_duties NUMERIC,
    total_statistics NUMERIC,
    total_international_tax NUMERIC,
    total_country_tax NUMERIC,
    total_officialization NUMERIC,
    total_certification NUMERIC,
    total_internal_expenses NUMERIC,
    total_terminal NUMERIC,
    total_storage NUMERIC,
    total_ivetra NUMERIC,
    total_tap NUMERIC,
    total_fees NUMERIC,
    total_profit_margin NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    origin VARCHAR DEFAULT 'Nacional'::character varying,
    company_id UUID REFERENCES public.companies(id)
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    stock INTEGER DEFAULT 0 NOT NULL,
    min_stock INTEGER DEFAULT 0 NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    neto NUMERIC,
    referencia TEXT,
    dispatch_id UUID REFERENCES public.dispatches(id),
    pricing_status VARCHAR DEFAULT 'pending'::character varying,
    unit_price_usd NUMERIC,
    allocated_freight NUMERIC,
    allocated_customs NUMERIC,
    allocated_statistics NUMERIC,
    allocated_intl_tax NUMERIC,
    allocated_country_tax NUMERIC,
    allocated_officialization NUMERIC,
    allocated_certification NUMERIC,
    allocated_internal_exp NUMERIC,
    allocated_terminal NUMERIC,
    allocated_storage NUMERIC,
    allocated_ivetra NUMERIC,
    allocated_tap NUMERIC,
    allocated_fees NUMERIC,
    allocated_profit NUMERIC,
    dispatch_number VARCHAR,
    origin VARCHAR DEFAULT 'Nacional'::character varying,
    company_id UUID REFERENCES public.companies(id)
);

-- 6. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id),
    subtotal NUMERIC NOT NULL,
    discount_percentage NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    net_taxable NUMERIC NOT NULL,
    vat_total NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    cae TEXT,
    cae_expiration TIMESTAMPTZ,
    original_invoice_id UUID,
    original_invoice_cae TEXT,
    is_quote BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    pdf_url TEXT,
    company_id UUID REFERENCES public.companies(id),
    invoice_number TEXT
);

-- 7. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id),
    product_id UUID REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    vat_rate NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    company_id UUID REFERENCES public.companies(id)
);

-- 8. INVOICE DATA PRODUCTOS (Auxiliary table found in schema)
CREATE TABLE IF NOT EXISTS public.Invoice_Data_Productos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    cod TEXT,
    description TEXT,
    quantity NUMERIC,
    unit_price NUMERIC,
    total_fob NUMERIC,
    invoice_grand_total NUMERIC,
    raw_data JSONB
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Invoice_Data_Productos ENABLE ROW LEVEL SECURITY;
