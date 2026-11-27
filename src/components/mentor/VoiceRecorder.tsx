import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2, Mic, RotateCcw, Square, X } from 'lucide-react';
import { api } from '../../services/api';

interface VoiceRecorderProps {
  onTranscriptConfirmed: (text: string) => void;
  onGuardrailRejected?: (msg: string) => void;
}

function pickSupportedAudioMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  return candidates.find((m) => {
    try {
      return MediaRecorder.isTypeSupported(m);
    } catch {
      return false;
    }
  });
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
  const [transcribing, setTranscribing] = useState(false);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);

  const recRef = useRef<any>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef<boolean>(false);
  const liveTranscriptRef = useRef<string>('');

  const speechApi =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const cleanupHardware = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        // Ignore
      }
      recRef.current = null;
    }
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      try {
        mediaRecRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupHardware();
  }, []);

  const transcribeAudioFallback = async (blob: Blob) => {
    setTranscribing(true);
    setError(null);
    const res = await api.aiBuddy.transcribeVoiceAudio(blob, lang);
    setTranscribing(false);

    if (res.success && res.data) {
      if (res.data.allowed === false && res.data.guardrailMessage) {
        setError(res.data.guardrailMessage);
        onGuardrailRejected?.(res.data.guardrailMessage);
        return;
      }
      if (res.data.transcribed && res.data.transcript) {
        setTranscript(res.data.transcript);
        return;
      }
      setError(res.data.reason || 'Could not transcribe audio. Please type your question or configure GEMINI_API_KEY.');
    } else {
      setError(typeof res.error === 'string' ? res.error : 'Network error during audio transcription.');
    }
  };

  const startRecording = async () => {
    if (isRecording || transcribing) return;
    setError(null);
    setTranscript('');
    setLastAudioBlob(null);
    liveTranscriptRef.current = '';
    cancelledRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia && !speechApi) {
      setError('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      // Request explicit mic permission via MediaDevices when available
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        if (typeof MediaRecorder !== 'undefined') {
          const mime = pickSupportedAudioMime();
          const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
          chunksRef.current = [];
          recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) {
              chunksRef.current.push(ev.data);
            }
          };
          recorder.onstop = async () => {
            const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
            stream.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            if (cancelledRef.current) return;

            if (audioBlob.size >= 200) {
              setLastAudioBlob(audioBlob);
              if (!liveTranscriptRef.current.trim()) {
                await transcribeAudioFallback(audioBlob);
              }
            } else if (!liveTranscriptRef.current.trim()) {
              setError('No speech detected (empty audio recording). Please try again.');
            }
          };
          mediaRecRef.current = recorder;
          recorder.start(250);
        }
      }

      if (speechApi) {
        const recognition = new speechApi();
        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event: any) => {
          let combined = '';
          for (let i = 0; i < event.results.length; i++) {
            combined += event.results[i][0].transcript + ' ';
          }
          const clean = combined.trim();
          liveTranscriptRef.current = clean;
          setTranscript(clean);
        };
        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError('Microphone permission denied. Allow mic access in browser settings.');
          }
        };
        recRef.current = recognition;
        recognition.start();
      }

      setIsRecording(true);
      setDurationSec(0);
      timerRef.current = window.setInterval(() => setDurationSec((d) => d + 1), 1000);
    } catch (err: any) {
      cleanupHardware();
      setIsRecording(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access to speak.');
      } else {
        setError(err?.message || 'Unable to access microphone.');
      }
    }
  };

  const stopRecording = () => {
    cancelledRef.current = false;
    setIsRecording(false);
    cleanupHardware();
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    setIsRecording(false);
    setTranscript('');
    liveTranscriptRef.current = '';
    setLastAudioBlob(null);
    cleanupHardware();
  };

  const confirmTranscript = async () => {
    const clean = transcript.trim();
    if (!clean) return;
    setTranscribing(true);
    const res = await api.aiBuddy.validateVoiceTranscript(clean, lang);
    setTranscribing(false);

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
            disabled={transcribing}
            aria-label="Start voice recording"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated border border-border hover:border-primary/60 text-xs font-mono text-text-primary transition-colors min-h-[38px] disabled:opacity-50"
          >
            {transcribing ? (
              <Loader2 size={14} className="text-primary animate-spin" />
            ) : (
              <Mic size={14} className="text-primary" />
            )}
            <span>{transcribing ? 'Transcribing...' : 'Speak'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Stop voice recording"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-danger/20 border border-danger/50 text-xs font-mono text-danger animate-pulse min-h-[38px]"
            >
              <Square size={13} />
              <span>Stop ({durationSec}s)</span>
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              aria-label="Cancel voice recording"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-mono text-text-muted hover:text-danger min-h-[38px]"
            >
              <X size={13} /> Cancel
            </button>
          </div>
        )}
      </div>

      {transcript && (
        <div className="p-2.5 rounded-xl bg-surface-elevated border border-primary/30 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
            <span>Voice Transcript (edit before sending)</span>
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
              disabled={transcribing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-background text-[11px] font-mono font-bold"
            >
              <Check size={12} /> {transcribing ? 'Checking...' : 'Use Transcript'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-2 rounded-lg bg-danger/10 border border-danger/30 text-[11px] text-danger flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </span>
          {lastAudioBlob && (
            <button
              type="button"
              onClick={() => transcribeAudioFallback(lastAudioBlob)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-text-primary shrink-0"
            >
              <RotateCcw size={10} /> Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};
