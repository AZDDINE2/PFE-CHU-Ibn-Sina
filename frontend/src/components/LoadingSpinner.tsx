import React from 'react';

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Chargement...' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 16 }}>
    <div style={{
      width: 40, height: 40, border: '4px solid #e4eaf5',
      borderTop: '4px solid #3B82F6', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <div style={{ color: '#64748B', fontSize: 14 }}>{text}</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default LoadingSpinner;
