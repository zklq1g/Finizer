-- ============================================================================
-- SEED DATA: Complete Retail Operations & Financial Operating System
-- ============================================================================

DO $$
DECLARE
    v_cash_id UUID;
    v_upi_id UUID;
    v_bank_id UUID;
    v_petty_id UUID;
    
    v_cat_sales UUID;
    v_cat_wholesale UUID;
    v_cat_inv UUID;
    v_cat_rent UUID;
    v_cat_salaries UUID;
    v_cat_util UUID;
    v_cat_fuel UUID;
    v_cat_snacks UUID;
    v_cat_repair UUID;
    v_cat_draw UUID;
    
    v_po_rk UUID;
    v_po_apex UUID;
    v_po_himalaya UUID;
    v_po_boxes UUID;
    v_po_kashmir UUID;
    v_po_oil UUID;
    
    v_tx_edit UUID;
    v_tx_del UUID;
BEGIN
    -- 1. ACCOUNTS & BALANCES
    -- Update existing or insert new accounts
    INSERT INTO public.accounts (name, type, current_balance, is_active)
    VALUES ('Main Cash Drawer', 'cash', 42500.00, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.accounts (name, type, current_balance, is_active)
    VALUES ('PhonePe UPI Merchant', 'upi', 185400.00, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.accounts (name, type, current_balance, is_active)
    VALUES ('HDFC Current Account', 'bank', 840000.00, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.accounts (name, type, current_balance, is_active)
    VALUES ('Petty Cash Safe', 'cash', 15000.00, true)
    ON CONFLICT DO NOTHING;

    -- Update balances and types for existing ones
    UPDATE public.accounts SET current_balance = 42500.00, type = 'cash', is_active = true WHERE name = 'Main Cash Drawer';
    UPDATE public.accounts SET current_balance = 185400.00, type = 'upi', is_active = true WHERE name = 'PhonePe UPI';
    UPDATE public.accounts SET current_balance = 840000.00, type = 'bank', is_active = true WHERE name = 'HDFC Bank Account';

    SELECT id INTO v_cash_id FROM public.accounts WHERE name = 'Main Cash Drawer' LIMIT 1;
    SELECT id INTO v_upi_id FROM public.accounts WHERE name IN ('PhonePe UPI', 'PhonePe UPI Merchant') LIMIT 1;
    SELECT id INTO v_bank_id FROM public.accounts WHERE name IN ('HDFC Bank Account', 'HDFC Current Account') LIMIT 1;
    SELECT id INTO v_petty_id FROM public.accounts WHERE name = 'Petty Cash Safe' LIMIT 1;
    IF v_petty_id IS NULL THEN v_petty_id := v_cash_id; END IF;

    -- 2. CATEGORIES
    SELECT id INTO v_cat_sales FROM public.categories WHERE name = 'Sales Revenue' LIMIT 1;
    SELECT id INTO v_cat_inv FROM public.categories WHERE name = 'Inventory Purchase' LIMIT 1;
    SELECT id INTO v_cat_rent FROM public.categories WHERE name = 'Rent' LIMIT 1;
    SELECT id INTO v_cat_salaries FROM public.categories WHERE name = 'Salaries' LIMIT 1;
    SELECT id INTO v_cat_util FROM public.categories WHERE name = 'Electricity & Utilities' LIMIT 1;
    SELECT id INTO v_cat_fuel FROM public.categories WHERE name = 'Transportation & Petrol' LIMIT 1;
    SELECT id INTO v_cat_snacks FROM public.categories WHERE name = 'Staff Welfare & Snacks' LIMIT 1;
    SELECT id INTO v_cat_repair FROM public.categories WHERE name = 'Repairs & Maintenance' LIMIT 1;
    SELECT id INTO v_cat_draw FROM public.categories WHERE name = 'Partner Withdrawal' LIMIT 1;

    -- Add Wholesale category if missing
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Wholesale B2B Sales', 'INCOME', true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_cat_wholesale FROM public.categories WHERE name = 'Wholesale B2B Sales' LIMIT 1;
    IF v_cat_wholesale IS NULL THEN v_cat_wholesale := v_cat_sales; END IF;

    -- 3. INVENTORY ITEMS (Total Value: ~₹3,96,450)
    DELETE FROM public.inventory_items;

    INSERT INTO public.inventory_items (sku, name, quantity, cost_price) VALUES
    ('SKU-DRY-ALM-1KG', 'California Almonds Premium 1kg', 120, 650.00),
    ('SKU-DRY-CAS-1KG', 'W240 Jumbo Cashews 1kg', 85, 720.00),
    ('SKU-OIL-MUST-1L', 'Kachi Ghani Mustard Oil 1L Pouch', 200, 135.00),
    ('SKU-RICE-BAS-5KG', 'Daawat Rozana Basmati Rice 5kg', 95, 340.00),
    ('SKU-TEA-PREM-500G', 'Wagh Bakri Premium CTC Tea 500g', 150, 210.00),
    ('SKU-GHEE-COW-1L', 'A2 Desi Cow Bilona Ghee 1L Jar', 40, 1150.00),
    ('SKU-SPICE-CARD-250G', 'Green Cardamom Bold 8mm 250g', 60, 580.00),
    ('SKU-SPICE-SAFF-5G', 'Kashmiri Mongra Saffron 5g Box', 30, 1200.00),
    ('SKU-HONEY-WILD-500G', 'Raw Forest Wild Honey 500g Jar', 75, 290.00),
    ('SKU-PULSE-TOOR-1KG', 'Organic Unpolished Toor Dal 1kg', 180, 155.00);

    -- 4. PURCHASE ORDERS
    DELETE FROM public.goods_receipts;
    DELETE FROM public.purchase_orders;

    INSERT INTO public.purchase_orders (id, vendor_name, total_expected_amount, total_received_amount, status, expected_delivery_date, created_by)
    VALUES 
    (gen_random_uuid(), 'RK Dryfruit Wholesalers Khari Baoli', 320000.00, 320000.00, 'COMPLETE', CURRENT_DATE - INTERVAL '7 days', 'Owner')
    RETURNING id INTO v_po_rk;

    INSERT INTO public.purchase_orders (id, vendor_name, total_expected_amount, total_received_amount, status, expected_delivery_date, created_by)
    VALUES 
    (gen_random_uuid(), 'Apex FMCG Distributors Pvt Ltd', 185000.00, 120000.00, 'PARTIAL', CURRENT_DATE - INTERVAL '3 days', 'Rahul (Partner)')
    RETURNING id INTO v_po_apex;

    INSERT INTO public.purchase_orders (id, vendor_name, total_expected_amount, total_received_amount, status, expected_delivery_date, created_by)
    VALUES 
    (gen_random_uuid(), 'Himalayan Organic Ghee & Honey Farm', 95000.00, 95000.00, 'COMPLETE', CURRENT_DATE - INTERVAL '10 days', 'Owner')
    RETURNING id INTO v_po_himalaya;

    INSERT INTO public.purchase_orders (id, vendor_name, total_expected_amount, total_received_amount, status, expected_delivery_date, created_by)
    VALUES 
    (gen_random_uuid(), 'Kashmir Spice Trade Syndicate', 240000.00, 150000.00, 'PARTIAL', CURRENT_DATE - INTERVAL '5 days', 'Rahul (Partner)')
    RETURNING id INTO v_po_kashmir;

    INSERT INTO public.purchase_orders (id, vendor_name, total_expected_amount, total_received_amount, status, expected_delivery_date, created_by)
    VALUES 
    (gen_random_uuid(), 'Surat Box & Packaging Wholesale Hub', 42000.00, 0.00, 'PENDING', CURRENT_DATE + INTERVAL '1 day', 'Owner')
    RETURNING id INTO v_po_boxes;

    INSERT INTO public.purchase_orders (id, vendor_name, total_expected_amount, total_received_amount, status, expected_delivery_date, created_by)
    VALUES 
    (gen_random_uuid(), 'Gujarat Edible Oils Depot', 110000.00, 0.00, 'PENDING', CURRENT_DATE + INTERVAL '4 days', 'Owner')
    RETURNING id INTO v_po_oil;

    -- 5. GOODS RECEIPTS
    INSERT INTO public.goods_receipts (purchase_order_id, received_amount, received_date, challan_number, notes, received_by)
    VALUES
    (v_po_rk, 320000.00, CURRENT_DATE - INTERVAL '7 days', 'CH-9042', 'Full lot verified against delivery challan. Quality grade A verified.', 'Rahul (Partner)'),
    (v_po_apex, 120000.00, CURRENT_DATE - INTERVAL '4 days', 'APX-4188', 'Batch 1 received. Remaining ₹65k goods pending transshipment at Bhiwandi depot.', 'Owner'),
    (v_po_himalaya, 95000.00, CURRENT_DATE - INTERVAL '10 days', 'HIM-102', 'All 40 jars undamaged. Seal verified.', 'Rahul (Partner)'),
    (v_po_kashmir, 150000.00, CURRENT_DATE - INTERVAL '5 days', 'KST-783', 'Cardamom batch verified. Saffron batch pending separate security dispatch.', 'Owner');

    -- 6. TRANSACTIONS (Rich set spanning this month)
    DELETE FROM public.transactions;

    -- Income: Counter Cash Sales
    INSERT INTO public.transactions (account_id, category_id, amount, type, date, description, is_deleted) VALUES
    (v_cash_id, v_cat_sales, 18400.00, 'INCOME', CURRENT_DATE, 'Daily Store Counter Cash Register', false),
    (v_cash_id, v_cat_sales, 22100.00, 'INCOME', CURRENT_DATE - INTERVAL '1 day', 'Daily Counter Cash Sales', false),
    (v_cash_id, v_cat_sales, 19500.00, 'INCOME', CURRENT_DATE - INTERVAL '2 days', 'Daily Counter Cash Sales', false),
    (v_cash_id, v_cat_sales, 24800.00, 'INCOME', CURRENT_DATE - INTERVAL '3 days', 'Weekend Festival Counter Sales', false),
    (v_cash_id, v_cat_sales, 27600.00, 'INCOME', CURRENT_DATE - INTERVAL '4 days', 'Sunday Counter Rush Sales', false),
    (v_cash_id, v_cat_sales, 16200.00, 'INCOME', CURRENT_DATE - INTERVAL '5 days', 'Evening Cash Register Reconciliation', false),
    (v_cash_id, v_cat_sales, 14900.00, 'INCOME', CURRENT_DATE - INTERVAL '6 days', 'Daily Counter Cash Collections', false),
    (v_cash_id, v_cat_sales, 18800.00, 'INCOME', CURRENT_DATE - INTERVAL '7 days', 'Daily Store Counter Sales', false),
    (v_cash_id, v_cat_sales, 21500.00, 'INCOME', CURRENT_DATE - INTERVAL '8 days', 'Counter Cash Settlement', false),
    (v_cash_id, v_cat_sales, 17200.00, 'INCOME', CURRENT_DATE - INTERVAL '9 days', 'Cash Collections Counter 1 & 2', false);

    -- Income: PhonePe / QR Code UPI Collections
    INSERT INTO public.transactions (account_id, category_id, amount, type, date, description, is_deleted) VALUES
    (v_upi_id, v_cat_sales, 31200.00, 'INCOME', CURRENT_DATE, 'PhonePe Merchant QR Settlements', false),
    (v_upi_id, v_cat_sales, 28400.00, 'INCOME', CURRENT_DATE - INTERVAL '1 day', 'Daily Store UPI QR Collections', false),
    (v_upi_id, v_cat_sales, 34500.00, 'INCOME', CURRENT_DATE - INTERVAL '2 days', 'UPI Collections (Paytm + PhonePe)', false),
    (v_upi_id, v_cat_sales, 41200.00, 'INCOME', CURRENT_DATE - INTERVAL '3 days', 'Weekend Peak QR Payments', false),
    (v_upi_id, v_cat_sales, 38900.00, 'INCOME', CURRENT_DATE - INTERVAL '4 days', 'Sunday UPI Collections Settlement', false),
    (v_upi_id, v_cat_sales, 26700.00, 'INCOME', CURRENT_DATE - INTERVAL '6 days', 'Daily UPI Store Receipts', false),
    (v_upi_id, v_cat_sales, 29100.00, 'INCOME', CURRENT_DATE - INTERVAL '8 days', 'Merchant QR Collections Auto-Payout', false);

    -- Income: Bank Wholesale Orders
    INSERT INTO public.transactions (account_id, category_id, amount, type, date, description, is_deleted) VALUES
    (v_bank_id, v_cat_wholesale, 95000.00, 'INCOME', CURRENT_DATE - INTERVAL '3 days', 'Wholesale Bulk Supply - Grand Palace Hotel', false),
    (v_bank_id, v_cat_wholesale, 68000.00, 'INCOME', CURRENT_DATE - INTERVAL '7 days', 'Corporate Festive Gift Hampers Dispatch (RTGS)', false),
    (v_bank_id, v_cat_wholesale, 125000.00, 'INCOME', CURRENT_DATE - INTERVAL '12 days', 'Wholesale Catering Consignment NEFT #8902', false);

    -- Expenses: Operating Expenses (Rent, Salaries, Utilities, Staff, Fuel)
    INSERT INTO public.transactions (account_id, category_id, amount, type, date, description, is_deleted) VALUES
    (v_bank_id, v_cat_rent, 45000.00, 'EXPENSE', CURRENT_DATE - INTERVAL '18 days', 'Main Street Retail Shop Rent (Oct 2026)', false),
    (v_bank_id, v_cat_salaries, 52000.00, 'EXPENSE', CURRENT_DATE - INTERVAL '16 days', 'Staff Salaries - Counter Clerks & Store Helpers', false),
    (v_upi_id, v_cat_util, 8450.00, 'EXPENSE', CURRENT_DATE - INTERVAL '11 days', 'Store Electricity Bill - Tata Power', false),
    (v_cash_id, v_cat_fuel, 2400.00, 'EXPENSE', CURRENT_DATE, 'Delivery Van Diesel Tank Refuel', false),
    (v_cash_id, v_cat_fuel, 2100.00, 'EXPENSE', CURRENT_DATE - INTERVAL '4 days', 'Delivery Van Fuel', false),
    (v_cash_id, v_cat_fuel, 1800.00, 'EXPENSE', CURRENT_DATE - INTERVAL '9 days', 'Delivery Two-Wheeler Petrol Vouchers', false),
    (v_cash_id, v_cat_snacks, 340.00, 'EXPENSE', CURRENT_DATE, 'Staff Evening Tea & Samosa Refreshments', false),
    (v_cash_id, v_cat_snacks, 420.00, 'EXPENSE', CURRENT_DATE - INTERVAL '1 day', 'Staff Afternoon Tea & Biscuits', false),
    (v_cash_id, v_cat_snacks, 380.00, 'EXPENSE', CURRENT_DATE - INTERVAL '3 days', 'Evening Refreshments for Overtime Helpers', false),
    (v_cash_id, v_cat_snacks, 450.00, 'EXPENSE', CURRENT_DATE - INTERVAL '5 days', 'Staff Tea & Snacks Drawer Payout', false),
    (v_cash_id, v_cat_repair, 1600.00, 'EXPENSE', CURRENT_DATE - INTERVAL '2 days', 'Electrician Shop Ceiling LED & Fan Repair', false),
    (v_upi_id, v_cat_repair, 950.00, 'EXPENSE', CURRENT_DATE - INTERVAL '8 days', 'Barcode Scanner Cable & Power Adapter Replacement', false);

    -- Expenses: Inventory Purchases & Capital Expenses
    INSERT INTO public.transactions (account_id, category_id, amount, type, date, description, is_deleted) VALUES
    (v_bank_id, v_cat_inv, 120000.00, 'EXPENSE', CURRENT_DATE - INTERVAL '4 days', 'Payment for Apex FMCG Delivery Batch #1', false),
    (v_bank_id, v_cat_inv, 150000.00, 'EXPENSE', CURRENT_DATE - INTERVAL '5 days', 'Payment for Kashmir Spice Consignment', false),
    (v_bank_id, v_cat_inv, 95000.00, 'EXPENSE', CURRENT_DATE - INTERVAL '10 days', 'Himalayan Organic Honey & Ghee Batch Payment', false),
    (v_bank_id, v_cat_draw, 30000.00, 'EXPENSE', CURRENT_DATE - INTERVAL '14 days', 'Mid-Month Partner Drawing - Rahul', false);

    -- Soft-deleted transaction for forensic audit test
    INSERT INTO public.transactions (account_id, category_id, amount, type, date, description, is_deleted)
    VALUES (v_cash_id, v_cat_snacks, 850.00, 'EXPENSE', CURRENT_DATE - INTERVAL '2 days', 'Accidental duplicate entry for staff refreshments', true)
    RETURNING id INTO v_tx_del;

    -- Transaction with an audit trail
    INSERT INTO public.transactions (account_id, category_id, amount, type, date, description, is_deleted)
    VALUES (v_cash_id, v_cat_fuel, 1500.00, 'EXPENSE', CURRENT_DATE - INTERVAL '1 day', 'Delivery Van Fuel (Corrected from ₹1,200 bill)', false)
    RETURNING id INTO v_tx_edit;

    -- 7. AUDIT LOGS
    DELETE FROM public.audit_logs;

    INSERT INTO public.audit_logs (transaction_id, action, actor, timestamp, old_data, new_data) VALUES
    (
        v_tx_edit, 
        'EDITED', 
        'Rahul (Partner)', 
        NOW() - INTERVAL '3 hours',
        jsonb_build_object('amount', 1200.00, 'account_name', 'Main Cash Drawer', 'category_name', 'Transportation & Petrol'),
        jsonb_build_object('amount', 1500.00, 'account_name', 'Main Cash Drawer', 'category_name', 'Transportation & Petrol')
    ),
    (
        v_tx_del, 
        'SOFT_DELETED', 
        'Owner', 
        NOW() - INTERVAL '1 day',
        jsonb_build_object('amount', 850.00, 'account_name', 'Main Cash Drawer', 'category_name', 'Staff Welfare & Snacks'),
        jsonb_build_object('is_deleted', true)
    ),
    (
        NULL,
        'CREATED',
        'Owner',
        NOW() - INTERVAL '2 days',
        NULL,
        jsonb_build_object('type', 'PURCHASE_ORDER', 'vendor_name', 'Surat Box & Packaging Wholesale Hub', 'expected_amount', 42000.00)
    ),
    (
        NULL,
        'CREATED',
        'Rahul (Partner)',
        NOW() - INTERVAL '4 days',
        NULL,
        jsonb_build_object('type', 'GOODS_RECEIPT', 'challan_number', 'APX-4188', 'received_amount', 120000.00)
    );

    -- 8. HISTORICAL MONTHLY CLOSURES (August & September 2026)
    DELETE FROM public.monthly_closures;

    INSERT INTO public.monthly_closures (
        month, year, status, net_profit, 
        alloc_opex, alloc_salaries, alloc_reinvestment, alloc_partner_payout, 
        locked_at, locked_by
    ) VALUES
    (
        8, 2026, 'LOCKED', 185000.00,
        45000.00, 50000.00, 45000.00, 45000.00,
        '2026-08-31 23:59:00+05:30', 'Owner'
    ),
    (
        9, 2026, 'LOCKED', 214500.00,
        50000.00, 52000.00, 52500.00, 60000.00,
        '2026-09-30 23:59:00+05:30', 'Rahul (Partner)'
    );

END $$;
