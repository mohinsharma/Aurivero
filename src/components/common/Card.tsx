import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'interactive' | 'gold';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-surface border border-border rounded-2xl p-5',
    elevated: 'bg-surface-elevated border border-border/90 shadow-glass rounded-2xl p-5',
    glass: 'bg-glass border border-white/[0.06] shadow-glass rounded-2xl p-5',
    interactive:
      'bg-surface border border-border hover:border-primary/45 hover:bg-surface-elevated/80 transition-all duration-200 cursor-pointer rounded-2xl p-5',
    gold: 'bg-surface-elevated border border-gold/30 shadow-gold rounded-2xl p-5',
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
