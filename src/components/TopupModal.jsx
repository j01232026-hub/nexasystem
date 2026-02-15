import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import walletService, { PaymentMethod, TopupOrderStatus } from '../lib/walletService';
import { X, Money, CreditCard, QrCode, Spinner, CheckCircle, User, MagnifyingGlass } from '@phosphor-icons/react';

const TopupModal = ({ isOpen, onClose, tenantId, operatorId, onSuccess }) => {
  const [step, setStep] = useState('search');
  const [searchPhone, setSearchPhone] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PaymentMethod.CASH);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep('search');
      setSearchPhone('');
      setCustomers([]);
      setSelectedCustomer(null);
      setWalletInfo(null);
      setAmount('');
      setPaymentMethod(PaymentMethod.CASH);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const searchCustomers = async () => {
    if (!searchPhone.trim()) return;
    
    console.log('TopupModal: Searching with tenantId:', tenantId);
    
    if (!tenantId || tenantId === 'null') {
      setError('Invalid Tenant ID');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('tenant_id', tenantId)
        .ilike('phone', `%${searchPhone}%`)
        .limit(10);
      
      if (fetchError) throw fetchError;
      setCustomers(data || []);
      
      if (data?.length === 0) {
        setError('找不到符合的客戶');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setLoading(true);
    
    try {
      await walletService.initializeWallet(customer.id);
      const info = await walletService.getCustomerWalletInfo(customer.id);
      setWalletInfo(info);
      setStep('topup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('請輸入有效的儲值金額');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const order = await walletService.createTopupOrder(
        selectedCustomer.id,
        tenantId,
        parseFloat(amount),
        paymentMethod,
        operatorId
      );
      
      await walletService.confirmTopupOrder(order.id, operatorId);
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2000, 3000, 5000, 10000];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-orange-50">
          <h2 className="text-lg font-bold text-slate-800">客戶儲值</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle weight="fill" className="w-16 h-16 text-green-500 mb-3" />
              <p className="text-lg font-semibold text-slate-800">儲值成功！</p>
              <p className="text-slate-500">已為 {selectedCustomer?.name} 儲值 ${amount}</p>
            </div>
          )}

          {!success && step === 'search' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">搜尋客戶手機號碼</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCustomers()}
                      placeholder="輸入手機號碼..."
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={searchCustomers}
                    disabled={loading}
                    className="px-4 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Spinner className="w-5 h-5 animate-spin" /> : '搜尋'}
                  </button>
                </div>
              </div>

              {customers.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">選擇客戶</label>
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="w-full flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{customer.name}</p>
                        <p className="text-sm text-slate-500">{customer.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!success && step === 'topup' && selectedCustomer && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-rose-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{selectedCustomer.name}</p>
                  <p className="text-sm text-slate-500">{selectedCustomer.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">目前餘額</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {walletService.formatCurrency(walletInfo?.balance || 0)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">儲值金額</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="輸入金額"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xl font-semibold text-center focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none"
                />
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt.toString())}
                      className="py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all"
                    >
                      ${amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">付款方式</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                    className={`flex flex-col items-center gap-2 p-3 border rounded-xl transition-all ${
                      paymentMethod === PaymentMethod.CASH
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Cash className="w-6 h-6" />
                    <span className="text-xs font-medium">現金</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod(PaymentMethod.CARD_TERMINAL)}
                    className={`flex flex-col items-center gap-2 p-3 border rounded-xl transition-all ${
                      paymentMethod === PaymentMethod.CARD_TERMINAL
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-6 h-6" />
                    <span className="text-xs font-medium">刷卡</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod(PaymentMethod.LINEPAY)}
                    className={`flex flex-col items-center gap-2 p-3 border rounded-xl transition-all ${
                      paymentMethod === PaymentMethod.LINEPAY
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-6 h-6" />
                    <span className="text-xs font-medium">LINE Pay</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('search')}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handleTopup}
                  disabled={loading || !amount}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl font-medium hover:from-rose-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="w-5 h-5 animate-spin" />
                      處理中...
                    </span>
                  ) : (
                    `確認儲值 $${parseFloat(amount || 0).toLocaleString()}`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopupModal;
