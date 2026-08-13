import React from 'react';

const Card = ({ title, children, action, className = '', style }) => {
  return (
    <div className={`card shell-panel ${className}`} style={style}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
