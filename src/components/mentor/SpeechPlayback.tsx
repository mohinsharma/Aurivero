import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Square, Volume2 } from 'lucide-react';

interface SpeechPlaybackProps {
  text: string;
}

export const SpeechPlayback: React.FC<SpeechPlaybackProps> = ({ text }) => {
  const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED'>('IDLE');
  const [rate, setRate] = useState<number>(1.0);
  const [activeParaIdx, setActiveParaIdx] = useState<number | null>(null);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supported]);

  if (!supported || !text.trim()) return null;

  const speakText = (content: string, paraIdx: number | null = null) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(content);
    utter.lang = 'en-IN';
    utter.rate = rate;
    utter.onend = () => {
      setStatus('IDLE');
      setActiveParaIdx(null);
    };
    utter.onerror = () => {
      setStatus('IDLE');
      setActiveParaIdx(null);
    };
    setActiveParaIdx(paraIdx);
    setStatus('PLAYING');
    window.speechSynthesis.speak(utter);
  };

  const handlePauseResume = () => {
    if (status === 'PLAYING') {
      window.speechSynthesis.pause();
      setStatus('PAUSED');
    } else if (status === 'PAUSED') {
      window.speechSynthesis.resume();
      setStatus('PLAYING');
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setStatus('IDLE');
    setActiveParaIdx(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
      {status === 'IDLE' ? (
        <button
          type="button"
          onClick={() => speakText(text, null)}
          aria-label="Listen to response"
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-border hover:border-primary/50 text-text-secondary hover:text-primary"
        >
          <Volume2 size={12} /> Listen
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={handlePauseResume}
            aria-label={status === 'PLAYING' ? 'Pause speech' : 'Resume speech'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/15 border border-primary/40 text-primary"
          >
            {status === 'PLAYING' ? <Pause size={11} /> : <Play size={11} />}
            {status === 'PLAYING' ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={handleStop}
            aria-label="Stop speech"
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-border text-danger"
          >
            <Square size={10} /> Stop
          </button>
          <button
            type="button"
            onClick={() => speakText(text, activeParaIdx)}
            aria-label="Replay speech"
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-border text-text-secondary"
          >
            <RotateCcw size={10} />
          </button>
        </>
      )}

      <select
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
        aria-label="Speech playback speed"
        className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted"
      >
        <option value={0.85}>0.85x</option>
        <option value={1.0}>1x</option>
        <option value={1.25}>1.25x</option>
        <option value={1.5}>1.5x</option>
      </select>

      {paragraphs.length > 1 && (
        <div className="flex items-center gap-1">
          {paragraphs.slice(0, 4).map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => speakText(p, idx)}
              title={`Listen to paragraph ${idx + 1}`}
              className={`px-1.5 py-0.5 rounded border ${
                activeParaIdx === idx
                  ? 'bg-primary text-background border-primary'
                  : 'bg-surface border-border text-text-muted hover:text-text-primary'
              }`}
            >
              P{idx + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
