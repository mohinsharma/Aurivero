import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const SettingsPage: React.FC = () => {
  const { resetPortfolio, virtualCash, theme, setTheme } = useSimulator();
  const [currencyFormat, setCurrencyFormat] = useState<'INR_LAKHS' | 'INTERNATIONAL'>('INR_LAKHS');
  const [fomoAlerts, setFomoAlerts] = useState<boolean>(true);
  const [stopLossEnforcement, setStopLossEnforcement] = useState<boolean>(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-text-secondary">
            Preferences &amp; Configuration
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Simulator Settings &amp; Appearance
          </h1>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 text-xs text-primary font-medium flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Theme Appearance Card */}
      <Card className="p-6 space-y-4">
        <div className="pb-3 border-b border-border">
          <h3 className="font-bold text-sm text-text-primary">Workspace Appearance</h3>
          <p className="text-xs text-text-secondary mt-1">
            Switch calmly between Light and Dark mode. Both modes keep Cobalt Blue for navigation and reserve Green/Red strictly for trade prices.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
              theme === 'light'
                ? 'bg-primary/10 border-primary text-text-primary'
                : 'bg-background border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-primary">
              <Sun size={18} />
            </div>
            <div>
              <span className="font-semibold text-text-primary block">Light Mode</span>
              <span className="text-[11px] text-text-secondary">Clean white cards &amp; airy contrast</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
              theme === 'dark'
                ? 'bg-primary/10 border-primary text-text-primary'
                : 'bg-background border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-primary">
              <Moon size={18} />
            </div>
            <div>
              <span className="font-semibold text-text-primary block">Dark Mode</span>
              <span className="text-[11px] text-text-secondary">Restful slate-navy low-glare view</span>
            </div>
          </button>
        </div>
      </Card>

      {/* Simulator Capital Controls */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h3 className="font-bold text-sm text-text-primary">
              Virtual Trading Capital Management
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Current paper balance:{' '}
              <span className="text-primary font-bold tabular-nums">
                ₹{virtualCash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>

          <Button
            variant="warning"
            size="sm"
            onClick={() => setIsResetModalOpen(true)}
            icon={<RotateCcw size={14} />}
          >
            Reset to ₹10 Lakhs
          </Button>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Resetting restores your virtual balance to ₹10,00,000 INR and clears open positions so you can test alternative strategies without bias.
        </p>
      </Card>

      {/* Behavioral Guardian Preferences */}
      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-sm text-text-primary pb-3 border-b border-border">
          Mindful Coach &amp; Risk Alerts
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div>
              <span className="font-semibold text-text-primary block">FOMO &amp; Gap-Up Alerts</span>
              <span className="text-text-secondary">Notify me when placing market buy orders on stocks up &gt;3% today.</span>
            </div>
            <input
              type="checkbox"
              checked={fomoAlerts}
              onChange={(e) => setFomoAlerts(e.target.checked)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div>
              <span className="font-semibold text-text-primary block">Stop-Loss Reminders</span>
              <span className="text-text-secondary">Remind me to specify an exit plan on every new paper position.</span>
            </div>
            <input
              type="checkbox"
              checked={stopLossEnforcement}
              onChange={(e) => setStopLossEnforcement(e.target.checked)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-background">
            <div>
              <span className="font-semibold text-text-primary block">Indian Number System (Lakhs &amp; Crores)</span>
              <span className="text-text-secondary">Display currency in ₹ Lakhs (₹10,00,000) rather than international millions.</span>
            </div>
            <input
              type="checkbox"
              checked={currencyFormat === 'INR_LAKHS'}
              onChange={(e) => setCurrencyFormat(e.target.checked ? 'INR_LAKHS' : 'INTERNATIONAL')}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </Card>

      {/* SEBI Compliance Statement */}
      <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm text-xs text-text-secondary flex items-start gap-3">
        <ShieldCheck size={20} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Aurivero adheres strictly to SEBI guidelines on financial literacy and investor education. All activities remain confined to the simulated virtual ledger.
        </p>
      </div>

      {/* Reset Confirmation Dialog */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Restore Initial ₹10 Lakhs Capital?"
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-secondary leading-relaxed">
            This will wipe your open simulated holdings and reset your liquid cash to ₹10,00,000.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="warning"
              size="sm"
              onClick={() => {
                resetPortfolio();
                setIsResetModalOpen(false);
              }}
            >
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
