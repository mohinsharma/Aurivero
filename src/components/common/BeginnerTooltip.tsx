import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Bot } from 'lucide-react';

interface BeginnerTooltipProps {
  term: string;
  definition: string;
  example?: string;
  showAiBuddyLink?: boolean;
}

export const BeginnerTooltip: React.FC<BeginnerTooltipProps> = ({
  term,
  definition,
  example,
  showAiBuddyLink = true,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex items-center align-middle ml-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`Explain ${term}`}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-elevated border border-border text-text-muted hover:text-primary hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
      >
        <HelpCircle size={11} />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 sm:w-72 p-3.5 rounded-xl bg-[#1A2531] border border-primary/30 shadow-2xl z-50 text-left space-y-1.5"
        >
          <div className="text-xs font-bold text-[#45D6B5]">{term}</div>
          <p className="text-xs text-[#F3F6F8] leading-relaxed">{definition}</p>
          {example && (
            <p className="text-[11px] text-[#93A2B4] leading-relaxed border-t border-white/10 pt-1.5">
              Example: {example}
            </p>
          )}
          {showAiBuddyLink && (
            <Link
              to="/ai-buddy"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#78A9FF] hover:underline pt-1"
            >
              <Bot size={11} /> Ask AI Buddy for more
            </Link>
          )}
        </div>
      )}
    </span>
  );
};
