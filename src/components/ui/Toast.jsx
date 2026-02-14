import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from '@phosphor-icons/react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  const icons = {
    success: <CheckCircle className="w-6 h-6 text-emerald-500" weight="fill" />,
    error: <XCircle className="w-6 h-6 text-rose-500" weight="fill" />,
    info: <Info className="w-6 h-6 text-blue-500" weight="fill" />
  };

  const bgColors = {
    success: 'bg-white border-emerald-100',
    error: 'bg-white border-rose-100',
    info: 'bg-white border-blue-100'
  };

  return (
    <div className={`fixed top-6 right-6 z-[100] transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
      <div className={`flex items-center p-4 rounded-xl shadow-lg border ${bgColors[type]} min-w-[300px] backdrop-blur-sm`}>
        <div className="flex-shrink-0 mr-3">
          {icons[type]}
        </div>
        <div className="flex-1 mr-2">
          <p className="text-sm font-semibold text-slate-800">{message}</p>
        </div>
        <button 
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
