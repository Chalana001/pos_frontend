import React from 'react';

const LoadingSpinner = ({ size = 'md', text }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizes[size]}`}></div>
      {text && <p className="text-sm text-slate-600">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;