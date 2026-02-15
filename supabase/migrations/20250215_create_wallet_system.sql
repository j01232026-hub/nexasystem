-- =====================================================
-- Project NEXA - Wallet System Core Tables
-- 複式記帳架構：所有金額變動必須寫入流水帳
-- =====================================================

-- 1. Wallets Table (用戶錢包)
CREATE TABLE IF NOT EXISTS wallets (
    user_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick balance lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- 2. Transaction Ledger (交易流水帳 - 只允許 INSERT)
CREATE TABLE IF NOT EXISTS transaction_ledger (
    id BIGSERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    balance_snapshot DECIMAL(12, 2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    related_order_id VARCHAR(100),
    description TEXT,
    operator_id UUID REFERENCES staff(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ledger queries
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON transaction_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tenant_id ON transaction_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_id ON transaction_ledger(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON transaction_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON transaction_ledger(type);

-- 3. Top-up Orders Table (儲值訂單)
CREATE TABLE IF NOT EXISTS topup_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    operator_id UUID REFERENCES staff(id),
    line_pay_transaction_id VARCHAR(100),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CHECK (payment_method IN ('cash', 'card_terminal', 'linepay')),
    CHECK (status IN ('pending', 'completed', 'cancelled', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_topup_user_id ON topup_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_tenant_id ON topup_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_topup_status ON topup_orders(status);

-- 4. Payment Tokens Table (動態付款碼)
CREATE TABLE IF NOT EXISTS payment_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_token_hash ON payment_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_payment_token_user ON payment_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_token_expires ON payment_tokens(expires_at);

-- =====================================================
-- Atomic Operations via PostgreSQL Functions
-- =====================================================

-- Function: Initialize wallet for new customer
CREATE OR REPLACE FUNCTION initialize_wallet(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO wallets (user_id, balance, version)
    VALUES (p_user_id, 0.00, 1)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Function: Process fund change (Atomic Operation)
-- Returns: new balance on success, raises exception on failure
CREATE OR REPLACE FUNCTION process_fund_change(
    p_user_id UUID,
    p_tenant_id UUID,
    p_amount DECIMAL(12, 2),
    p_type VARCHAR(50),
    p_related_order_id VARCHAR(100) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_operator_id UUID DEFAULT NULL
)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance DECIMAL(12, 2);
    v_new_balance DECIMAL(12, 2);
    v_version INTEGER;
    v_rows_affected INTEGER;
BEGIN
    -- Lock wallet row for update
    SELECT balance, version INTO v_current_balance, v_version
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Check for negative balance
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', 
            v_current_balance, ABS(p_amount);
    END IF;
    
    -- Update wallet with optimistic locking
    UPDATE wallets
    SET balance = v_new_balance,
        version = version + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id AND version = v_version;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected = 0 THEN
        RAISE EXCEPTION 'Concurrent modification detected. Please retry.';
    END IF;
    
    -- Insert ledger record
    INSERT INTO transaction_ledger (
        user_id, tenant_id, amount, balance_snapshot,
        type, related_order_id, description, operator_id
    ) VALUES (
        p_user_id, p_tenant_id, p_amount, v_new_balance,
        p_type, p_related_order_id, p_description, p_operator_id
    );
    
    RETURN v_new_balance;
END;
$$;

-- Function: Create payment token
CREATE OR REPLACE FUNCTION create_payment_token(
    p_user_id UUID,
    p_tenant_id UUID,
    p_token_hash VARCHAR(64),
    p_expires_in_seconds INTEGER DEFAULT 60
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_id UUID;
BEGIN
    -- Invalidate any existing unused tokens for this user
    UPDATE payment_tokens
    SET used_at = NOW()
    WHERE user_id = p_user_id 
      AND used_at IS NULL 
      AND expires_at > NOW();
    
    -- Create new token
    INSERT INTO payment_tokens (user_id, tenant_id, token_hash, expires_at)
    VALUES (
        p_user_id, 
        p_tenant_id, 
        p_token_hash, 
        NOW() + (p_expires_in_seconds || ' seconds')::INTERVAL
    )
    RETURNING id INTO v_token_id;
    
    RETURN v_token_id;
END;
$$;

-- Function: Validate and consume payment token
CREATE OR REPLACE FUNCTION consume_payment_token(
    p_token_hash VARCHAR(64),
    p_amount DECIMAL(12, 2),
    p_operator_id UUID,
    p_service_order_id VARCHAR(100) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token RECORD;
    v_new_balance DECIMAL(12, 2);
    v_result JSON;
BEGIN
    -- Find and lock the token
    SELECT * INTO v_token
    FROM payment_tokens
    WHERE token_hash = p_token_hash
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid payment token';
    END IF;
    
    -- Check if already used
    IF v_token.used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Payment token already used';
    END IF;
    
    -- Check if expired
    IF v_token.expires_at < NOW() THEN
        RAISE EXCEPTION 'Payment token expired';
    END IF;
    
    -- Process the payment
    v_new_balance := process_fund_change(
        v_token.user_id,
        v_token.tenant_id,
        -p_amount,
        'PAYMENT_SERVICE',
        p_service_order_id,
        'Service payment via QR code',
        p_operator_id
    );
    
    -- Mark token as used
    UPDATE payment_tokens
    SET used_at = NOW()
    WHERE id = v_token.id;
    
    -- Return result
    SELECT json_build_object(
        'success', true,
        'user_id', v_token.user_id,
        'amount_paid', p_amount,
        'new_balance', v_new_balance
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE topup_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_tokens ENABLE ROW LEVEL SECURITY;

-- Wallets: Users can only see their own wallet
CREATE POLICY "Users can view own wallet" ON wallets
    FOR SELECT USING (user_id = auth.uid()::UUID);

CREATE POLICY "Service role full access on wallets" ON wallets
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Ledger: Users can view their own transactions
CREATE POLICY "Users can view own ledger" ON transaction_ledger
    FOR SELECT USING (user_id = auth.uid()::UUID);

CREATE POLICY "Service role full access on ledger" ON transaction_ledger
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Topup orders: Staff can manage, users can view own
CREATE POLICY "Users can view own topup orders" ON topup_orders
    FOR SELECT USING (user_id = auth.uid()::UUID);

CREATE POLICY "Service role full access on topup" ON topup_orders
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Payment tokens: Users can create and view own
CREATE POLICY "Users can manage own tokens" ON payment_tokens
    FOR ALL USING (user_id = auth.uid()::UUID);

CREATE POLICY "Service role full access on tokens" ON payment_tokens
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE wallets IS 'User wallet with balance and optimistic locking';
COMMENT ON TABLE transaction_ledger IS 'Immutable transaction log - INSERT only';
COMMENT ON TABLE topup_orders IS 'Top-up order records for tracking payments';
COMMENT ON TABLE payment_tokens IS 'Dynamic QR code payment tokens with expiration';

COMMENT ON COLUMN wallets.version IS 'Optimistic lock version - incremented on each update';
COMMENT ON COLUMN transaction_ledger.amount IS 'Positive for top-up, negative for payment';
COMMENT ON COLUMN transaction_ledger.balance_snapshot IS 'Balance after this transaction';
COMMENT ON COLUMN transaction_ledger.type IS 'TOPUP_CASH, TOPUP_CARD, TOPUP_LINEPAY, PAYMENT_SERVICE, REFUND';
