import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, X, AlertCircle, Check } from 'lucide-react';
import { api } from '../../services/api';

interface VoiceRecorderProps {
  onTranscriptConfirmed: (text: string) => void;
  onGuardrailRejected?: (msg: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptConfirmed,
  onGuardrailRejected,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [lang, setLang] = useState<'en-IN' | 'en-US' | 'hi-IN'>('en-IN');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const recRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  const speechApi =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recRef.current) {
        try {
          recRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const startRecording = () => {
    setError(null);
    if (!speechApi) {
      setError('Speech recognition is not supported in this browser. Please use Chrome/Edge or type your question.');
      return;
    }

    try {
      const recognition = new speechApi();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event: any) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript + ' ';
        }
        setTranscript(combined.trim());
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission denied. Please allow mic access in your browser.');
        } else {
          setError(`Speech recognition error: ${event.error || 'unknown'}`);
        }
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setDurationSec(0);
      timerRef.current = window.setInterval(() => setDurationSec((d) => d + 1), 1000);
    } catch (err: any) {
      setError(err?.message || 'Unable to start microphone.');
    }
  };

  const stopRecording = () => {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const confirmTranscript = async () => {
    const clean = transcript.trim();
    if (!clean) return;
    setValidating(true);
    const res = await api.aiBuddy.validateVoiceTranscript(clean, lang);
    setValidating(false);

    if (res.success && res.data) {
      if (!res.data.allowed && res.data.guardrailMessage) {
        setError(res.data.guardrailMessage);
        onGuardrailRejected?.(res.data.guardrailMessage);
        return;
      }
      onTranscriptConfirmed(res.data.transcript || clean);
      setTranscript('');
      setError(null);
    } else {
      onTranscriptConfirmed(clean);
      setTranscript('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          aria-label="Voice input language"
          disabled={isRecording}
          className="px-2 py-1.5 rounded-lg bg-surface-elevated border border-border text-[11px] font-mono text-text-secondary"
        >
          <option value="en-IN">English (India)</option>
          <option value="en-US">English (US)</option>
          <option value="hi-IN">Hindi (हिन्दी)</option>
        </select>

        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            aria-label="Start voice recording"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated border border-border hover:border-primary/60 text-xs font-mono text-text-primary transition-colors min-h-[38px]"
          >
            <Mic size={14} className="text-primary" />
            <span>Speak</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            aria-label="Stop voice recording"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-danger/20 border border-danger/50 text-xs font-mono text-danger animate-pulse min-h-[38px]"
          >
            <Square size={13} />
            <span>Stop ({durationSec}s)</span>
          </button>
        )}
      </div>

      {transcript && (
        <div className="p-2.5 rounded-xl bg-surface-elevated border border-primary/30 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
            <span>Voice Transcript (editable before sending)</span>
            <button
              type="button"
              onClick={() => setTranscript('')}
              className="text-text-muted hover:text-danger"
              aria-label="Discard transcript"
            >
              <X size={13} />
            </button>
          </div>
          <input
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-background border border-border text-xs text-text-primary"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={confirmTranscript}
              disabled={validating}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-background text-[11px] font-mono font-bold"
            >
              <Check size={12} /> {validating ? 'Checking...' : 'Use Transcript'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-2 rounded-lg bg-danger/10 border border-danger/30 text-[11px] text-danger flex items-center gap-1.5">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
