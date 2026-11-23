import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  RotateCcw,
  ShieldAlert,
  Bell,
  Sliders,
  CheckCircle2,
  User,
  ShieldCheck
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const SettingsPage: React.FC = () => {
  const { resetPortfolio, virtualCash } = useSimulator();
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex items-center justify-between">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Preferences & Configuration
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Simulator Settings & Risk Parameters
          </h1>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-primary font-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Simulator Capital Controls */}
      <Card variant="elevated" className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="font-bold text-sm text-text-primary">
              Virtual Trading Capital Management
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Current paper balance: <span className="font-mono text-primary font-bold">₹{virtualCash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
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

        <p className="text-xs text-text-muted leading-relaxed">
          Resetting restores your virtual balance to ₹10,00,000 INR and clears open positions so you can test alternative strategies without bias.
        </p>
      </Card>

      {/* Behavioral Guardian Preferences */}
      <Card variant="elevated" className="p-6 space-y-4">
        <h3 className="font-bold text-sm text-text-primary pb-3 border-b border-border/60">
          AI Behavioral Guardian & Risk Alerts
        </h3>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-text-primary block">FOMO & Gap-Up Warning Alerts</span>
              <span className="text-text-muted">Notify me when placing market buy orders on stocks up &gt;3% today.</span>
            </div>
            <input
              type="checkbox"
              checked={fomoAlerts}
              onChange={(e) => setFomoAlerts(e.target.checked)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-text-primary block">Mandatory Stop-Loss Prompting</span>
              <span className="text-text-muted">Remind me to specify an exit plan on every new paper position.</span>
            </div>
            <input
              type="checkbox"
              checked={stopLossEnforcement}
              onChange={(e) => setStopLossEnforcement(e.target.checked)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-text-primary block">Indian Number System (Lakhs & Crores)</span>
              <span className="text-text-muted">Display currency in ₹ Lakhs (₹10,00,000) rather than international millions.</span>
            </div>
            <input
              type="checkbox"
              checked={currencyFormat === 'INR_LAKHS'}
              onChange={(e) => setCurrencyFormat(e.target.checked ? 'INR_LAKHS' : 'INTERNATIONAL')}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border/50 flex justify-end">
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </Card>

      {/* SEBI Compliance Statement */}
      <div className="p-4 rounded-xl bg-surface border border-warning/20 text-xs text-text-secondary flex items-start gap-3">
        <ShieldCheck size={20} className="text-warning flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          BULLSEYE adheres strictly to SEBI guidelines on financial literacy and investor education. All activities remain confined to the simulated virtual ledger.
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
