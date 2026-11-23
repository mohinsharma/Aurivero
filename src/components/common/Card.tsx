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
    default: 'bg-surface border border-border rounded-xl p-5',
    elevated: 'bg-surface-elevated border border-border/80 shadow-lg rounded-xl p-5',
    glass: 'bg-glass border border-white/5 shadow-glass rounded-xl p-5',
    interactive: 'bg-surface border border-border hover:border-primary/40 hover:bg-surface-elevated/70 transition-all duration-200 cursor-pointer rounded-xl p-5',
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
