import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import walletService from '../lib/walletService';
import { X, QrCode, Camera, Spinner, CheckCircle, Warning, User } from '@phosphor-icons/react';
import jsQR from 'jsqr';

const ScanPaymentModal = ({ isOpen, onClose, tenantId, operatorId, onSuccess }) => {
  const [step, setStep] = useState('scan');
  const [manualToken, setManualToken] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('scan');
      setManualToken('');
      setAmount('');
      setError(null);
      setSuccess(null);
      setCustomerInfo(null);
      setSuccessMessage(null); // Reset success message
      stopCamera();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === 'scan') {
      startCamera();
    }

    // Setup Realtime subscription for payment notifications
    let channel;
    if (isOpen && operatorId) {
      channel = supabase
        .channel(`operator_payment_notifications:${operatorId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'transaction_ledger', filter: `operator_id=eq.${operatorId}` },
          (payload) => {
            console.log('Realtime payment notification received!', payload);
            // Optionally, you can add a more explicit notification here
            // For now, the existing success step handles the UI update
          }
        )
        .subscribe();
    }

    return () => {
      stopCamera();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isOpen, step, operatorId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready to play
        videoRef.current.setAttribute('playsinline', true); // required to tell iOS safari we don't want fullscreen
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('無法啟動相機，請手動輸入付款碼');
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          console.log("Found QR code", code.data);
          setManualToken(code.data);
          setStep('amount');
          stopCamera();
          return; // Stop the loop
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleTokenSubmit = async () => {
    if (!manualToken.trim()) {
      setError('請輸入付款碼');
      return;
    }
    setStep('amount');
    stopCamera();
  };

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('請輸入有效的扣款金額');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await walletService.processPaymentFromToken(
        manualToken,
        parseFloat(amount),
        operatorId
      );

      const { data: customer } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('id', result.user_id)
        .single();

      setSuccess({
        ...result,
        customer
      });
      setStep('success');
      setSuccessMessage(`已成功向 ${customer?.name || '客戶'} 收款 $${parseFloat(amount).toLocaleString()}！`);

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h2 className="text-lg font-bold text-slate-800">掃碼收款</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <Warning className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 'scan' && (
            <div className="space-y-4">
              <div className="relative aspect-square bg-slate-900 rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-xl">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-rose-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-rose-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-rose-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-rose-500 rounded-br-xl"></div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white/80 text-sm">請將客戶付款碼置於框內</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-sm text-slate-500">或手動輸入</span>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="輸入客戶付款碼..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none font-mono text-sm"
                />
                <button
                  onClick={handleTokenSubmit}
                  disabled={!manualToken.trim()}
                  className="px-5 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 font-medium"
                >
                  下一步
                </button>
              </div>
            </div>
          )}

          {step === 'amount' && !success && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">付款碼已驗證</p>
                  <p className="font-mono text-sm text-slate-700 truncate">{manualToken.substring(0, 16)}...</p>
                </div>
                <CheckCircle weight="fill" className="w-6 h-6 text-emerald-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">扣款金額</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-4 border border-slate-200 rounded-xl text-2xl font-semibold text-center focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setStep('scan');
                    setManualToken('');
                    setError(null);
                  }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading || !amount}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="w-5 h-5 animate-spin" />
                      處理中...
                    </span>
                  ) : (
                    `確認收款 $${parseFloat(amount || 0).toLocaleString()}`
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && success && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle weight="fill" className="w-12 h-12 text-emerald-500" />
              </div>
              <p className="text-xl font-bold text-slate-800">{successMessage}</p>
              
              <div className="w-full p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">客戶</span>
                  <span className="font-medium text-slate-800">{success.customer?.name || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">扣款金額</span>
                  <span className="font-bold text-rose-600">${success.amount_paid?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">剩餘餘額</span>
                  <span className="font-bold text-emerald-600">${success.new_balance?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanPaymentModal;
