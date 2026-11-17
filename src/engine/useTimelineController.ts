import { useCallback, useEffect, useState } from 'react';

export interface TimelineState {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  reducedMotion: boolean;
  setReducedMotion: (val: boolean) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  scrubTo: (step: number) => void;
  setSpeed: (s: number) => void;
  reset: () => void;
}

export function useTimelineController(
  topicId: string,
  sceneIdx: number,
  totalSteps: number,
  keyboardEnabled = true
): TimelineState {
  const safeTotal = Math.max(1, totalSteps);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Reset step cleanly when switching scene/topic
  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [topicId, sceneIdx, safeTotal]);

  // Update URL hash deep link (#explainer/<topic>/<scene>/<step>)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targetHash = `#explainer/${topicId}/s${sceneIdx + 1}/t${currentStep}`;
    if (window.location.hash.startsWith('#explainer/')) {
      window.history.replaceState(null, '', targetHash);
    }
  }, [topicId, sceneIdx, currentStep]);

  // Playback timer synchronized cleanly to one shared step index
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(220, Math.round(950 / speed));
    const id = window.setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % safeTotal);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [isPlaying, speed, safeTotal]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((prev) => (prev + 1) % safeTotal);
  }, [safeTotal]);

  const stepBackward = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((prev) => (prev - 1 + safeTotal) % safeTotal);
  }, [safeTotal]);

  const scrubTo = useCallback(
    (step: number) => {
      setIsPlaying(false);
      setCurrentStep(Math.max(0, Math.min(safeTotal - 1, Math.round(step))));
    },
    [safeTotal]
  );

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  // Keyboard accessibility: Space toggles play/pause, Left/Right arrows step cycle
  useEffect(() => {
    if (!keyboardEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepBackward();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [keyboardEnabled, togglePlay, stepForward, stepBackward]);

  return {
    currentStep,
    totalSteps: safeTotal,
    isPlaying,
    speed,
    reducedMotion,
    setReducedMotion,
    play,
    pause,
    togglePlay,
    stepForward,
    stepBackward,
    scrubTo,
    setSpeed,
    reset,
  };
}
