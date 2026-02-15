
import React from 'react';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CheckCircle, XCircle, Bank, CurrencyDollar, CalendarCheck } from '@phosphor-icons/react';
import { supabase } from '../lib/supabaseClient';

const DepositReviewModal = ({ isOpen, onClose, pendingDeposits, onRefresh }) => {
  if (!isOpen) return null;

  const handleAction = async (reportId, action) => {
    try {
      const status = action === 'confirm' ? 'confirmed' : 'rejected';
      const { error } = await supabase
        .from('deposit_reports')
        .update({ status })
        .eq('id', reportId);

      if (error) throw error;
      
      // If confirmed, maybe update appointment status or add a note?
      // For now, just update the report status.
      
      onRefresh();
    } catch (err) {
      console.error('Error updating deposit report:', err);
      alert('更新失敗，請稍後再試');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">待確認訂金 ({pendingDeposits.length})</h3>
            <p className="text-xs text-gray-500">請核對顧客匯款資訊</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <span className="text-lg">×</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {pendingDeposits.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-3 opacity-20" />
              <p>目前沒有待確認的訂金</p>
            </div>
          ) : (
            pendingDeposits.map(report => (
              <div key={report.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
                      {report.appointments?.customers?.name?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {report.appointments?.customers?.name}
                        <span className="ml-2 text-xs font-normal text-gray-500">{report.appointments?.customers?.phone}</span>
                      </p>
                      <p className="text-xs text-gray-500 flex items-center mt-0.5">
                        <CalendarCheck className="w-3.5 h-3.5 mr-1" />
                        {format(parseISO(report.appointments?.start_time), 'M/d HH:mm')}
                        <span className="mx-1.5 text-gray-300">|</span>
                        {report.appointments?.services?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(report.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors flex items-center gap-1"
                    >
                      <XCircle size={16} />
                      駁回
                    </button>
                    <button
                      onClick={() => handleAction(report.id, 'confirm')}
                      className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors shadow-sm flex items-center gap-1"
                    >
                      <CheckCircle size={16} />
                      確認收款
                    </button>
                  </div>
                </div>

                <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-orange-500 shadow-sm">
                      {report.report_method === 'transfer' ? <Bank size={16} /> : <CurrencyDollar size={16} />}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">支付方式</p>
                      <p className="text-sm font-bold text-gray-800">
                        {report.report_method === 'transfer' ? '銀行匯款' : 'LINE PAY'}
                      </p>
                    </div>
                  </div>
                  
                  {report.report_method === 'transfer' && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">帳號後五碼</p>
                      <p className="text-lg font-mono font-bold text-orange-600 tracking-wider">
                        {report.transfer_last_5}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DepositReviewModal;
