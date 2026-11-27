import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'gold' | 'secondary' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    gold: 'bg-gold/12 text-gold border-gold/30',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    neutral: 'bg-surface-elevated text-text-secondary border-border',
  };

  const dotColors = {
    primary: 'bg-primary',
    gold: 'bg-gold',
    secondary: 'bg-secondary',
    warning: 'bg-warning',
    danger: 'bg-danger',
    neutral: 'bg-text-secondary',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-wide uppercase font-mono ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
