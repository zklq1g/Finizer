-- ========================================================
-- 1. ENSURE COLUMNS EXIST ON ACCOUNTS & CATEGORIES
-- ========================================================
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'cash';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ========================================================
-- 2. UNIFIED ACCOUNT MANAGEMENT RPC
-- ========================================================
CREATE OR REPLACE FUNCTION public.manage_account(
    p_action text, -- 'create', 'update', 'delete'
    p_id uuid DEFAULT NULL,
    p_name text DEFAULT NULL,
    p_type text DEFAULT NULL,
    p_is_active boolean DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_id uuid;
BEGIN
    IF p_action = 'create' THEN
        INSERT INTO public.accounts (name, type, is_active) 
        VALUES (p_name, COALESCE(p_type, 'cash'), true) 
        RETURNING id INTO v_id;
        RETURN v_id;
    ELSIF p_action = 'update' THEN
        UPDATE public.accounts SET 
            name = COALESCE(p_name, name), 
            type = COALESCE(p_type, type), 
            is_active = COALESCE(p_is_active, is_active) 
        WHERE id = p_id;
        RETURN p_id;
    ELSIF p_action = 'delete' THEN
        UPDATE public.accounts SET is_active = false WHERE id = p_id; -- Safe soft delete
        RETURN p_id;
    END IF;
    RETURN NULL;
END;
$$;

-- ========================================================
-- 3. UNIFIED CATEGORY MANAGEMENT RPC
-- ========================================================
CREATE OR REPLACE FUNCTION public.manage_category(
    p_action text, -- 'create', 'update', 'delete'
    p_id uuid DEFAULT NULL,
    p_name text DEFAULT NULL,
    p_type text DEFAULT NULL,
    p_is_active boolean DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_id uuid;
    v_cat_type category_type;
BEGIN
    IF p_type IS NOT NULL THEN
        IF UPPER(p_type) = 'INCOME' THEN
            v_cat_type := 'INCOME'::category_type;
        ELSIF UPPER(p_type) = 'EXPENSE' OR UPPER(p_type) = 'OPERATING_EXPENSE' THEN
            v_cat_type := 'OPERATING_EXPENSE'::category_type;
        ELSIF UPPER(p_type) = 'CAPITAL_EXPENSE' THEN
            v_cat_type := 'CAPITAL_EXPENSE'::category_type;
        ELSIF UPPER(p_type) = 'WITHDRAWAL' THEN
            v_cat_type := 'WITHDRAWAL'::category_type;
        ELSE
            v_cat_type := 'OPERATING_EXPENSE'::category_type;
        END IF;
    END IF;

    IF p_action = 'create' THEN
        INSERT INTO public.categories (name, type, is_active, is_system_default) 
        VALUES (p_name, COALESCE(v_cat_type, 'OPERATING_EXPENSE'::category_type), true, false) 
        RETURNING id INTO v_id;
        RETURN v_id;
    ELSIF p_action = 'update' THEN
        UPDATE public.categories SET 
            name = COALESCE(p_name, name), 
            type = COALESCE(v_cat_type, type), 
            is_active = COALESCE(p_is_active, is_active) 
        WHERE id = p_id;
        RETURN p_id;
    ELSIF p_action = 'delete' THEN
        UPDATE public.categories SET is_active = false WHERE id = p_id;
        RETURN p_id;
    END IF;
    RETURN NULL;
END;
$$;
