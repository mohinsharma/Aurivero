import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface DisclaimerBannerProps {
  compact?: boolean;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
        <AlertTriangle size={13} className="flex-shrink-0" />
        <span className="truncate">EDUCATIONAL SIMULATOR ONLY • NOT SEBI-REGISTERED ADVISORY • ZERO REAL MONEY</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] shadow-sm p-5 text-xs flex items-start gap-3">
      <div className="p-2 rounded-lg bg-amber-50 text-amber-600 flex-shrink-0">
        <ShieldCheck size={18} />
      </div>
      <div>
        <div className="font-semibold text-[#131722] flex items-center gap-2">
          <span>SEBI Educational Simulator Compliance Notice</span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
            SIMULATION MODE
          </span>
        </div>
        <p className="text-[#64748B] mt-1 leading-relaxed">
          BULLSEYE is an interactive market training and behavioral learning simulator. All quotes, simulated orders, and portfolio values utilize virtual capital (₹10,00,000 INR). We do <span className="text-amber-700 font-semibold">NOT</span> provide stock tips, buy/sell calls, or real-money investment advisory. Never invest real money on Dalal Street without doing your own fundamental due diligence or consulting a SEBI-registered Investment Advisor.
        </p>
      </div>
    </div>
  );
};
