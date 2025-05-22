
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'filled',
  color = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out inline-flex items-center justify-center';

  let sizeStyles = '';
  switch (size) {
    case 'sm':
      sizeStyles = 'px-3 py-1.5 text-xs';
      break;
    case 'md':
      sizeStyles = 'px-5 py-2.5 text-sm';
      break;
    case 'lg':
      sizeStyles = 'px-7 py-3 text-base';
      break;
  }

  let colorStyles = '';
  switch (variant) {
    case 'filled':
      if (color === 'primary') colorStyles = 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500';
      else if (color === 'secondary') colorStyles = 'bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500';
      else if (color === 'danger') colorStyles = 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      break;
    case 'outlined':
      if (color === 'primary') colorStyles = 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500';
      else if (color === 'secondary') colorStyles = 'border border-slate-600 text-slate-600 hover:bg-slate-50 focus:ring-slate-500';
      else if (color === 'danger') colorStyles = 'border border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500';
      break;
    case 'text':
      if (color === 'primary') colorStyles = 'text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500';
      else if (color === 'secondary') colorStyles = 'text-slate-600 hover:bg-slate-50 focus:ring-slate-500';
      else if (color === 'danger') colorStyles = 'text-red-600 hover:bg-red-50 focus:ring-red-500';
      sizeStyles = size === 'sm' ? 'px-2 py-1 text-xs' : size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-base'; // Text buttons are usually more compact
      break;
  }
  
  if (props.disabled) {
    colorStyles = 'bg-slate-300 text-slate-500 cursor-not-allowed';
    if (variant === 'outlined') {
        colorStyles = 'border border-slate-300 text-slate-400 cursor-not-allowed bg-transparent';
    } else if (variant === 'text') {
        colorStyles = 'text-slate-400 cursor-not-allowed bg-transparent hover:bg-transparent';
    }
  }

  return (
    <button
      type="button"
      className={`${baseStyles} ${sizeStyles} ${colorStyles} ${className}`}
      {...props}
    >
      {leftIcon && <span className="mr-2 h-4 w-4">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2 h-4 w-4">{rightIcon}</span>}
    </button>
  );
};

export default Button;
