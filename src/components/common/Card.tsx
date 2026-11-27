import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'interactive';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-surface border border-border rounded-2xl p-6 shadow-glass',
    elevated: 'bg-surface border border-border rounded-2xl p-6 shadow-sm',
    glass: 'bg-surface border border-border rounded-2xl p-6 shadow-glass',
    interactive:
      'bg-surface border border-border hover:border-primary/40 hover:shadow-md transition-all duration-150 cursor-pointer rounded-2xl p-6 shadow-glass',
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
