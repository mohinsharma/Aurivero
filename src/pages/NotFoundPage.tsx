import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-warning mb-4">
        <AlertCircle size={32} />
      </div>

      <h1 className="text-3xl font-mono font-bold text-text-primary">404 — Page Not Found</h1>
      <p className="text-xs text-text-secondary mt-2 max-w-sm">
        The Dalal Street route you requested does not exist or has been moved.
      </p>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} icon={<ArrowLeft size={14} />}>
          Go Back
        </Button>
        <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};
