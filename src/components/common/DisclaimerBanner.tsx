import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface DisclaimerBannerProps {
  compact?: boolean;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs font-mono">
        <AlertTriangle size={13} className="flex-shrink-0" />
        <span className="truncate">EDUCATIONAL SIMULATOR ONLY • NOT SEBI-REGISTERED ADVISORY • ZERO REAL MONEY</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface border border-warning/20 p-4 text-xs flex items-start gap-3">
      <div className="p-2 rounded-lg bg-warning/10 text-warning flex-shrink-0">
        <ShieldCheck size={18} />
      </div>
      <div>
        <div className="font-semibold text-text-primary flex items-center gap-2">
          <span>SEBI Educational Simulator Compliance Notice</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
            SIMULATION MODE
          </span>
        </div>
        <p className="text-text-secondary mt-1 leading-relaxed">
          BULLSEYE is an interactive market training and behavioral learning simulator. All quotes, simulated orders, and portfolio values utilize virtual capital (₹10,00,000 INR). We do <span className="text-warning font-semibold">NOT</span> provide stock tips, buy/sell calls, or real-money investment advisory. Never invest real money on Dalal Street without doing your own fundamental due diligence or consulting a SEBI-registered Investment Advisor.
        </p>
      </div>
    </div>
  );
};
