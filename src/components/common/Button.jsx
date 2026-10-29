import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  ...props 
}) => {
  // inline-flex, not the browser's inline-block: Tailwind's preflight makes every <svg> a
  // block, so an icon beside a label broke the line and the button rendered two rows tall
  // with the icon stranded above the text. justify-center keeps a w-full button's label
  // centred, which is what the user-agent's text-align gave it before.
  const baseStyles = 'btn inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'bg-success text-white hover:bg-success focus:ring-success',
    outline: 'border-2 border-accent text-accent hover:bg-accent-soft focus:ring-accent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;