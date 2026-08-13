import React from 'react';

const Card = ({ title, children, action, className = '', style }) => {
  const edgeToEdge = /(?:^|\s)p-0(?:\s|$)/.test(className);
  return (
    <div className={`card shell-panel ${className}`} style={style}>
      {title && (
        <div className={`flex items-center justify-between gap-3 border-b border-slate-100 ${edgeToEdge ? 'mb-0 px-4 py-3.5 sm:px-5' : 'mb-4 pb-3'}`}>
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
