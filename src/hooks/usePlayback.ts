import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimelineFrame } from '../lib/craneCompiler';

export function usePlayback(frames: TimelineFrame[], speedMs: number) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [frames]);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    if (indexRef.current >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => {
      setIndex((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, Math.max(40, speedMs));
    return () => window.clearTimeout(id);
  }, [playing, index, speedMs, frames.length]);

  const play = useCallback(() => {
    if (frames.length === 0) return;
    setIndex((i) => (i >= frames.length - 1 ? 0 : i));
    setPlaying(true);
  }, [frames.length]);

  const pause = useCallback(() => setPlaying(false), []);

  const stepForward = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.min(frames.length - 1, i + 1));
  }, [frames.length]);

  const stepBack = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const seek = useCallback(
    (i: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(frames.length - 1, i)));
    },
    [frames.length],
  );

  const frame = frames[index] ?? null;

  return {
    index,
    frame,
    playing,
    play,
    pause,
    stepForward,
    stepBack,
    seek,
    total: frames.length,
  };
}
