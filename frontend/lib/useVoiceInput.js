'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

const WS_BASE = (process.env.NEXT_PUBLIC_AGENT_WS_URL || 'ws://localhost:8001').replace(/\/$/, '');
const TARGET_RATE = 16000;

// AudioWorklet source (inlined as a Blob so no extra file in /public is needed)
const WORKLET_SRC = `
class PcmTap extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('pcm-tap', PcmTap);
`;

function toPcm16(float32, inRate) {
  let data = float32;
  if (inRate !== TARGET_RATE) {
    const ratio = inRate / TARGET_RATE;
    const outLen = Math.floor(float32.length / ratio);
    data = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(Math.floor((i + 1) * ratio), float32.length);
      let sum = 0;
      for (let j = start; j < end; j++) sum += float32[j];
      data[i] = sum / Math.max(1, end - start);
    }
  }
  const out = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

export default function useVoiceInput({ onPartial, onFinal, onError, onEnd, lang } = {}) {
  const [status, setStatus] = useState('idle'); // idle | connecting | listening | finishing
  const wsRef = useRef(null);
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const nodeRef = useRef(null);
  const readyRef = useRef(false);

  const stoppingRef = useRef(false); // true once the user pressed the red stop button
  const firedRef = useRef(false);    // onEnd fires at most once per recording
  const cbRef = useRef({});
  cbRef.current = { onPartial, onFinal, onError, onEnd };

  const fireEnd = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    cbRef.current.onEnd?.(); // recording finished cleanly -> caller can auto-run
  }, []);

  const teardownAudio = useCallback(() => {
    try {
      nodeRef.current?.disconnect();
    } catch (e) {
      /* ignore */
    }
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (e) {
      /* ignore */
    }
    try {
      ctxRef.current?.close();
    } catch (e) {
      /* ignore */
    }
    nodeRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
  }, []);

  const fail = useCallback(
    (msg) => {
      firedRef.current = true; // errors must NOT auto-run anything
      cbRef.current.onError?.(msg);
      teardownAudio();
      try {
        wsRef.current?.close();
      } catch (e) {
        /* ignore */
      }
      wsRef.current = null;
      readyRef.current = false;
      setStatus('idle');
    },
    [teardownAudio]
  );

  const start = useCallback(async () => {
    if (status !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      cbRef.current.onError?.('Microphone is not available in this browser (needs https or localhost).');
      return;
    }
    setStatus('connecting');
    stoppingRef.current = false;
    firedRef.current = false;
    try {
      const tRes = await apiFetch('/api/voice/ticket', { method: 'POST' });
      const tData = await tRes.json();
      if (!tRes.ok || !tData.success) throw new Error(tData.error || 'Could not start voice session');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const url = `${WS_BASE}/ws/stt?ticket=${encodeURIComponent(tData.ticket)}${lang ? `&lang=${encodeURIComponent(lang)}` : ''}`;
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;
      readyRef.current = false;

      ws.onmessage = (ev) => {
        let m;
        try {
          m = JSON.parse(ev.data);
        } catch (e) {
          return;
        }
        if (m.type === 'ready') {
          readyRef.current = true;
          setStatus('listening');
        } else if (m.type === 'partial') cbRef.current.onPartial?.(m.text || '');
        else if (m.type === 'final') cbRef.current.onFinal?.(m.text || '');
        else if (m.type === 'error') {
          if (m.fatal) fail(m.message);
          else cbRef.current.onError?.(m.message);
        } else if (m.type === 'end') {
          fireEnd();
          teardownAudio();
          wsRef.current = null;
          readyRef.current = false;
          setStatus('idle');
        }
      };

      ws.onerror = () => fail('Could not connect to the voice service. Is the agent service running?');
      ws.onclose = () => {
        if (stoppingRef.current) fireEnd();
        teardownAudio();
        readyRef.current = false;
        setStatus((s) => (s === 'idle' ? s : 'idle'));
      };

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      const blobUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);

      const src = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, 'pcm-tap');
      nodeRef.current = node;

      node.port.onmessage = (e) => {
        if (readyRef.current && ws.readyState === WebSocket.OPEN) ws.send(toPcm16(e.data, ctx.sampleRate));
      };

      src.connect(node);
    } catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      fail(
        denied
          ? 'Microphone permission was denied. Allow it in the browser address bar and try again.'
          : e.message || 'Voice input failed'
      );
    }
  }, [status, lang, fail, teardownAudio, fireEnd]);

  const stop = useCallback(() => {
    if (status === 'idle') return;
    setStatus('finishing');
    stoppingRef.current = true;
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (e) {
      /* ignore */
    }
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'end' })); // server flushes the last words, then sends {type:'end'}
      setTimeout(() => {
        if (wsRef.current === ws) {
          try {
            ws.close();
          } catch (e) {
            /* ignore */
          }
        }
      }, 9000);
    } else {
      teardownAudio();
      setStatus('idle');
    }
  }, [status, teardownAudio]);

  useEffect(
    () => () => {
      // unmount (e.g. user switches tab) -> release the mic
      try {
        wsRef.current?.close();
      } catch (e) {
        /* ignore */
      }
      teardownAudio();
    },
    [teardownAudio]
  );

  return { status, start, stop, toggle: () => (status === 'idle' ? start() : stop()) };
}
