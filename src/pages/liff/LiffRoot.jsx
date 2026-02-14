
import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';
import { LiffAuthProvider } from '../../context/LiffAuthContext';

const LiffRoot = () => {
  const { tenantId } = useParams();

  // If no tenantId, maybe show error or redirect?
  // For dev, we might want a default.
  
  return (
    <ThemeProvider tenantId={tenantId}>
      <LiffAuthProvider>
        <Outlet />
      </LiffAuthProvider>
    </ThemeProvider>
  );
};

export default LiffRoot;
