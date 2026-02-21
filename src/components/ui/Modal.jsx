import React, { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useTheme } from '../../context/ThemeContext';

const Modal = ({ isOpen, onClose, onConfirm, title, children, showLogo = false, logoSrc = '/logo.png' }) => {
  let themeColor = '#ec4899'; // Default fallback color
  try {
    const theme = useTheme();
    themeColor = theme?.themeColor || '#ec4899';
  } catch (e) {
    // ThemeContext not available, use default
  }
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className={`relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        {/* Logo Section */}
        {showLogo && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
             <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg flex items-center justify-center">
                <img 
                    src={logoSrc} 
                    alt="Logo" 
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = 'https://placehold.co/100x100?text=NEXA'; // Fallback
                    }}
                />
             </div>
          </div>
        )}

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} weight="bold" />
        </button>

        {/* Header */}
        <div className={`text-center ${showLogo ? 'mt-10' : ''}`}>
          {title && <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>}
        </div>

        {/* Body */}
        <div className="text-gray-600 text-center mb-6">
          {children}
        </div>

        {/* Footer / Action */}
        <button
          onClick={handleConfirm}
          className="w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg active:scale-95 transition-all"
          style={{ backgroundColor: themeColor }}
        >
          確定
        </button>
      </div>
    </div>
  );
};

export default Modal;
