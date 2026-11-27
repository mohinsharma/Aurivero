import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { ThemePreference, useTheme } from '../../context/ThemeContext';

interface ThemeSwitcherProps {
  compact?: boolean;
}

const OPTIONS: Array<{ id: ThemePreference; label: string; icon: React.ComponentType<any> }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ compact = false }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme preference"
      className="inline-flex items-center bg-surface-elevated border border-border rounded-xl p-0.5 text-[11px] font-mono"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            aria-pressed={active}
            title={`Theme: ${opt.label}`}
            className={`inline-flex items-center gap-1.5 rounded-lg transition-colors ${
              compact ? 'px-2 py-1' : 'px-3 py-1.5'
            } ${
              active
                ? 'bg-primary text-background font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={13} />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
