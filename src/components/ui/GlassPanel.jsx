import React from 'react';

const GlassPanel = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-8 md:p-10 relative z-10 transition-all hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.12)] ${className}`}>
      {children}
    </div>
  );
};

export default GlassPanel;
