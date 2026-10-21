// components/StatusBadge.jsx
// Colored badge for sales status

import React from 'react';

const STATUS_COLORS = {
  'Converted':          { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  'Interested':         { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  'Follow-up Required': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  'Not Interested':     { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  'Demo Requested':     { bg: '#e0e7ff', color: '#3730a3', border: '#a5b4fc' },
  'No Response':        { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' },
};

export default function StatusBadge({ status, reason, size = 'normal' }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS['No Response'];
  const fontSize = size === 'small' ? '0.7rem' : '0.8rem';
  const padding = size === 'small' ? '2px 8px' : '4px 12px';

  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        borderRadius: '999px',
        fontSize,
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
      }}
      title={reason || ''}
    >
      {status}
    </span>
  );
}
