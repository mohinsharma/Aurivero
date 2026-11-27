import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Aurivero Uncaught Component Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#131722] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F23645]/10 text-[#F23645] border border-[#F23645]/25 flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#131722]">
            Something went wrong while rendering
          </h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-md">
            Aurivero encountered an unexpected runtime error. Your simulated data is preserved.
          </p>

          {this.state.error && (
            <div className="mt-4 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm text-left max-w-lg w-full text-xs text-[#F23645] overflow-x-auto">
              <span className="font-semibold text-[#131722] block mb-1">Error Details:</span>
              {this.state.error.toString()}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReload}
              icon={<RotateCcw size={14} />}
            >
              Reload Application
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
            >
              Clear Storage & Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
