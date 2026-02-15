import { supabase } from './supabaseClient';

const TOKEN_EXPIRE_SECONDS = 60;

export const TransactionType = {
  TOPUP_CASH: 'TOPUP_CASH',
  TOPUP_CARD: 'TOPUP_CARD',
  TOPUP_LINEPAY: 'TOPUP_LINEPAY',
  PAYMENT_SERVICE: 'PAYMENT_SERVICE',
  REFUND: 'REFUND'
};

export const PaymentMethod = {
  CASH: 'cash',
  CARD_TERMINAL: 'card_terminal',
  LINEPAY: 'linepay'
};

export const TopupOrderStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

export const walletService = {
  async getWallet(userId) {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data || { balance: 0, version: 0 };
  },

  async initializeWallet(userId) {
    const { error } = await supabase.rpc('initialize_wallet', {
      p_user_id: userId
    });
    
    if (error) throw error;
  },

  async getTransactionHistory(userId, limit = 20, offset = 0) {
    const { data, error, count } = await supabase
      .from('transaction_ledger')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return { transactions: data, total: count };
  },

  async createTopupOrder(userId, tenantId, amount, paymentMethod, operatorId) {
    const { data, error } = await supabase
      .from('topup_orders')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        amount,
        payment_method: paymentMethod,
        operator_id: operatorId,
        status: TopupOrderStatus.PENDING
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async confirmTopupOrder(orderId, operatorId) {
    const { data: order, error: fetchError } = await supabase
      .from('topup_orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (order.status !== TopupOrderStatus.PENDING) {
      throw new Error('Order is not in pending status');
    }
    
    const transactionType = order.payment_method === PaymentMethod.CASH
      ? TransactionType.TOPUP_CASH
      : order.payment_method === PaymentMethod.CARD_TERMINAL
        ? TransactionType.TOPUP_CARD
        : TransactionType.TOPUP_LINEPAY;
    
    const { data: newBalance, error: rpcError } = await supabase.rpc(
      'process_fund_change',
      {
        p_user_id: order.user_id,
        p_tenant_id: order.tenant_id,
        p_amount: order.amount,
        p_type: transactionType,
        p_related_order_id: orderId,
        p_description: `Top-up via ${order.payment_method}`,
        p_operator_id: operatorId
      }
    );
    
    if (rpcError) throw rpcError;
    
    const { error: updateError } = await supabase
      .from('topup_orders')
      .update({
        status: TopupOrderStatus.COMPLETED,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (updateError) throw updateError;
    
    return { success: true, newBalance };
  },

  async cancelTopupOrder(orderId) {
    const { error } = await supabase
      .from('topup_orders')
      .update({
        status: TopupOrderStatus.CANCELLED,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) throw error;
    return { success: true };
  },

  async getPendingTopupOrders(tenantId) {
    const { data, error } = await supabase
      .from('topup_orders')
      .select(`
        *,
        customers:user_id (id, name, phone)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', TopupOrderStatus.PENDING)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  generatePaymentToken() {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  async createPaymentToken(userId, tenantId) {
    const tokenRaw = this.generatePaymentToken();
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenRaw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const { data, error } = await supabase.rpc('create_payment_token', {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_token_hash: tokenHash,
      p_expires_in_seconds: TOKEN_EXPIRE_SECONDS
    });
    
    if (error) throw error;
    
    return {
      tokenId: data,
      tokenRaw,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRE_SECONDS * 1000)
    };
  },

  async processPaymentFromToken(tokenRaw, amount, operatorId, serviceOrderId = null) {
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenRaw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const { data: result, error } = await supabase.rpc('consume_payment_token', {
      p_token_hash: tokenHash,
      p_amount: amount,
      p_operator_id: operatorId,
      p_service_order_id: serviceOrderId
    });
    
    if (error) throw error;
    
    return result;
  },

  async getCustomerWalletInfo(userId) {
    const [wallet, recentTransactions] = await Promise.all([
      this.getWallet(userId),
      this.getTransactionHistory(userId, 5)
    ]);
    
    return {
      balance: wallet.balance,
      recentTransactions: recentTransactions.transactions
    };
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0
    }).format(amount);
  },

  getTransactionTypeLabel(type) {
    const labels = {
      [TransactionType.TOPUP_CASH]: '現金儲值',
      [TransactionType.TOPUP_CARD]: '刷卡儲值',
      [TransactionType.TOPUP_LINEPAY]: 'LINE Pay 儲值',
      [TransactionType.PAYMENT_SERVICE]: '服務消費',
      [TransactionType.REFUND]: '退款'
    };
    return labels[type] || type;
  }
};

export default walletService;
