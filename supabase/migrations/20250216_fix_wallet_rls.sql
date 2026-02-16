-- =====================================================
-- Fix RLS Policies for Staff Access (Wallet System)
-- =====================================================

-- 1. Wallets: Allow Staff to VIEW wallets of customers in their tenant
-- Note: Wallets table does not have tenant_id, so we link via customers table
CREATE POLICY "Staff can view customer wallets" ON wallets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM customers c
            WHERE c.id = wallets.user_id
            AND c.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        )
    );

-- 2. Transaction Ledger: Allow Staff to VIEW transactions in their tenant
CREATE POLICY "Staff can view tenant ledger" ON transaction_ledger
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 3. Topup Orders: Allow Staff to MANAGE orders in their tenant
CREATE POLICY "Staff can view tenant topup orders" ON topup_orders
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can create tenant topup orders" ON topup_orders
    FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can update tenant topup orders" ON topup_orders
    FOR UPDATE
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
