import React from 'react';

const Card = ({ title, children, action, className = '', style }) => {
  return (
    <div className={`card ${className}`} style={style}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
