'use client';

import React, { useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import useVoiceInput from '@/lib/useVoiceInput';

export default function VoiceMicButton({
  value,
  onChange,
  onDone,
  normalize,
  lang,
  className = '',
  size = 'md',
}) {
  const [err, setErr] = useState(null);
  const baseRef = useRef('');
  const finalsRef = useRef('');

  const compose = (partial = '') => {
    const raw = [baseRef.current, finalsRef.current, partial]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join(' ');
    return normalize ? normalize(raw) : raw;
  };

  const { status, start, stop } = useVoiceInput({
    lang,
    onPartial: (t) => onChange(compose(t)),
    onFinal: (t) => {
      finalsRef.current = `${finalsRef.current} ${t}`.trim();
      onChange(compose());
    },
    onError: (m) => setErr(m),
    // red button pressed -> last words flushed -> run the action with the final text
    onEnd: () => {
      const t = compose();
      if (t.trim() && onDone) onDone(t);
    },
  });

  const listening = status === 'listening';
  const busy = status === 'connecting' || status === 'finishing';
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

  const click = () => {
    setErr(null);
    if (status === 'idle') {
      baseRef.current = value || '';
      finalsRef.current = '';
      start();
    } else if (status === 'listening') {
      stop();
    }
  };

  return (
    <span className={`inline-flex flex-col items-end ${className}`}>
      <button
        type="button"
        onClick={click}
        disabled={busy}
        title={listening ? 'Stop recording' : 'Speak (English, Hindi, Hinglish & other Indian languages)'}
        className={`${dim} shrink-0 rounded-xl flex items-center justify-center border transition ${
          listening
            ? 'bg-rose-600 border-rose-600 text-white animate-pulse'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700'
        } disabled:opacity-60`}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : listening ? (
          <Square className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
      {listening && <span className="text-[10px] text-rose-600 mt-0.5">Listening… tap to stop</span>}
      {err && <span className="text-[10px] text-rose-600 mt-0.5 max-w-[220px] text-right">{err}</span>}
    </span>
  );
}
