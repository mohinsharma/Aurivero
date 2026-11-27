import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, ShieldAlert, Upload, X } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface FinancialOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  learningLevel: string;
  allowPortfolioAccess: boolean;
  onAnalysisComplete: (payload: {
    userPrompt: string;
    aiResponse: any;
    filename: string;
    previewUrl?: string;
  }) => void;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_BYTES = 8 * 1024 * 1024;

export const FinancialOCRModal: React.FC<FinancialOCRModalProps> = ({
  isOpen,
  onClose,
  learningLevel,
  allowPortfolioAccess,
  onAnalysisComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [userHint, setUserHint] = useState('');
  const [question, setQuestion] = useState('Explain this chart or financial screenshot and highlight key risks.');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [editableFields, setEditableFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setOcrResult(null);
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Unsupported file type. Please upload PNG, JPG/JPEG, WebP, or PDF.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('File exceeds 8 MB limit.');
      return;
    }

    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(undefined);
    }
  };

  const runOcr = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const res = await api.aiBuddy.uploadOcr(file, userHint);
    setUploading(false);

    if (!res.success || !res.data) {
      setError(typeof res.error === 'string' ? res.error : 'OCR extraction failed.');
      return;
    }
    if (res.data.allowed === false) {
      setError(res.data.guardrailMessage || 'Non-financial image rejected by MINDMARK Guardrail.');
      return;
    }

    setOcrResult(res.data);
    const initial: Record<string, string> = {};
    Object.entries(res.data.fields || {}).forEach(([k, v]: any) => {
      initial[k] = v?.value ?? 'UNKNOWN';
    });
    setEditableFields(initial);
  };

  const confirmAndAnalyze = async () => {
    if (!ocrResult) return;
    setAnalyzing(true);
    setError(null);
    const res = await api.aiBuddy.analyzeMultimodal({
      question,
      confirmedFields: editableFields,
      sanitizedOcrText: ocrResult.sanitizedText || userHint,
      learningLevel,
      allowPortfolioAccess,
    });
    setAnalyzing(false);

    if (res.success && res.data) {
      onAnalysisComplete({
        userPrompt: `[Uploaded ${file?.name || 'Financial Image'}] ${question}`,
        aiResponse: res.data,
        filename: file?.name || 'upload',
        previewUrl,
      });
      onClose();
    } else {
      setError('Failed to analyze confirmed financial data.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Financial Image & Document OCR"
      description="Upload charts, portfolio screenshots, or financial statements (PNG, JPG, WebP, PDF ≤ 8MB)."
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <label className="flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-primary/60 bg-background cursor-pointer">
            <Upload size={16} className="text-primary" />
            <span className="text-text-secondary font-mono">
              {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Choose financial chart, screenshot, or PDF'}
            </span>
            <input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={handleFileChange} className="hidden" />
          </label>

          {file && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFile(null);
                setPreviewUrl(undefined);
                setOcrResult(null);
              }}
              icon={<X size={14} />}
            >
              Remove
            </Button>
          )}
        </div>

        {previewUrl && (
          <div className="max-h-48 overflow-hidden rounded-xl border border-border bg-background flex justify-center p-2">
            <img src={previewUrl} alt="Uploaded financial preview" className="max-h-44 object-contain rounded" />
          </div>
        )}

        <div>
          <label className="block text-text-muted mb-1 font-mono">
            Optional Visible Text / Context (if screenshot has small numbers)
          </label>
          <input
            value={userHint}
            onChange={(e) => setUserHint(e.target.value)}
            placeholder="e.g., RELIANCE NSE LTP 2950 RSI 64.5 1D"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary"
          />
        </div>

        {!ocrResult ? (
          <Button variant="primary" size="sm" onClick={runOcr} disabled={!file || uploading}>
            {uploading ? 'Extracting Financial Data...' : 'Extract & Verify Financial Fields'}
          </Button>
        ) : (
          <div className="space-y-3 p-3.5 rounded-xl bg-surface-elevated border border-border">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-primary" /> Extracted Fields ({ocrResult.ocrProvider})
              </span>
              <span className="text-[10px] font-mono text-warning">
                Static screenshot values — NOT live prices
              </span>
            </div>

            {ocrResult.ocrNotice && (
              <div className="p-2 rounded bg-warning/10 border border-warning/30 text-[11px] text-warning flex items-start gap-1.5">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>{ocrResult.ocrNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(editableFields).map(([key, val]) => {
                const conf = ocrResult.fields?.[key]?.confidence || 'UNKNOWN';
                return (
                  <div key={key} className="p-2 rounded bg-background border border-border">
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-text-muted">{key}</span>
                      <span className={conf === 'HIGH' ? 'text-primary' : conf === 'MEDIUM' ? 'text-warning' : 'text-text-muted'}>
                        {conf}
                      </span>
                    </div>
                    <input
                      value={val}
                      onChange={(e) => setEditableFields((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-2 py-1 rounded bg-surface border border-border text-[11px] font-mono text-text-primary"
                    />
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-text-muted mb-1 font-mono">Question for MINDMARK AI</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  'Explain this chart',
                  'What does this RSI indicate?',
                  'Identify support & resistance',
                  'Explain my portfolio allocation',
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuestion(q)}
                    className="px-2 py-1 rounded bg-background border border-border hover:border-primary/50 text-[10px] font-mono text-text-secondary"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary"
              />
            </div>

            <Button variant="primary" size="sm" onClick={confirmAndAnalyze} disabled={analyzing}>
              {analyzing ? 'Analyzing with Finance Guardrail...' : 'Confirm & Ask MINDMARK AI'}
            </Button>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger flex items-center gap-2">
            <ShieldAlert size={15} className="shrink-0" /> {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
