import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { TourStep, TourCallbackData } from '@root/types/tour';

interface CustomTourProps {
  steps: TourStep[];
  run: boolean;
  onCallback?: (data: TourCallbackData) => void;
  onEnd?: () => void;
  onSkip?: () => void;
  showProgress?: boolean;
  showSkipButton?: boolean;
  disableScrolling?: boolean;
  locale?: {
    back: string;
    close: string;
    last: string;
    next: string;
    skip: string;
  };
}

function getElement(target: string | HTMLElement | undefined | null): HTMLElement | null {
  if (!target) return null;
  if (typeof target === 'string') return document.querySelector(target) as HTMLElement | null;
  return target;
}

export default function CustomTour({
  steps,
  run,
  onCallback,
  onEnd,
  onSkip,
  showProgress = true,
  showSkipButton = true,
  disableScrolling = true,
  locale = { back: 'Back', close: 'Close', last: 'Done', next: 'Next', skip: 'Skip' },
}: CustomTourProps) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const stepRef = useRef<TourStep | null>(null);

  const currentStep = useMemo(() => steps[index], [steps, index]);

  const updateRect = useCallback(() => {
    const el = getElement(currentStep?.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect(r);
  }, [currentStep]);

  // Manage mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Disable page scrolling while tour is active
  useEffect(() => {
    if (!disableScrolling) return;
    if (run && steps.length > 0) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [run, steps.length, disableScrolling]);

  // Scroll target into view and update rectangle when step changes
  useEffect(() => {
    if (!run || steps.length === 0) return;
    const step = steps[index];
    stepRef.current = step;
    const el = getElement(step?.target);
    if (el) {
      onCallback?.({ type: 'step:before', index, step });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll to settle
      const timer = setTimeout(() => {
        updateRect();
        onCallback?.({ type: 'step:after', index, step });
      }, 300);
      return () => clearTimeout(timer);
    } else {
      updateRect();
    }
  }, [index, run, steps, updateRect, onCallback]);

  // Listen to resize/scroll to keep tooltip aligned
  useEffect(() => {
    if (!run) return;
    function handler() {
      updateRect();
    }
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [run, updateRect]);

  // Fire start callback
  useEffect(() => {
    if (run && steps.length > 0) {
      onCallback?.({ type: 'start', index: 0, step: steps[0] });
    }
  }, [run, steps, onCallback]);

  const isLast = index === steps.length - 1;

  const goNext = () => {
    if (isLast) {
      onCallback?.({ type: 'tour:end', index, step: stepRef.current || undefined });
      onEnd?.();
    } else {
      setIndex(i => Math.min(i + 1, steps.length - 1));
    }
  };
  const goBack = () => setIndex(i => Math.max(i - 1, 0));
  const skip = () => {
    onCallback?.({ type: 'skipped', index, step: stepRef.current || undefined });
    onSkip?.();
  };

  if (!mounted || !run || steps.length === 0) return null;

  const placement = currentStep?.placement || 'auto';
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

  let tooltipStyle: React.CSSProperties = {};
  if (rect) {
    const margin = 12;
    const computedPlacement = placement === 'auto' ? (rect.top > viewportHeight / 2 ? 'top' : 'bottom') : placement;
    if (computedPlacement === 'top') {
      tooltipStyle.top = Math.max(8, rect.top + window.scrollY - margin);
      tooltipStyle.left = Math.min(viewportWidth - 8, Math.max(8, rect.left + rect.width / 2));
      tooltipStyle.transform = 'translate(-50%, -100%)';
    } else if (computedPlacement === 'bottom') {
      tooltipStyle.top = rect.top + window.scrollY + rect.height + margin;
      tooltipStyle.left = Math.min(viewportWidth - 8, Math.max(8, rect.left + rect.width / 2));
      tooltipStyle.transform = 'translate(-50%, 0)';
    } else if (computedPlacement === 'left') {
      tooltipStyle.top = rect.top + window.scrollY + rect.height / 2;
      tooltipStyle.left = rect.left - margin;
      tooltipStyle.transform = 'translate(-100%, -50%)';
    } else if (computedPlacement === 'right') {
      tooltipStyle.top = rect.top + window.scrollY + rect.height / 2;
      tooltipStyle.left = rect.right + margin;
      tooltipStyle.transform = 'translate(0, -50%)';
    }
  } else {
    tooltipStyle.top = viewportHeight / 2 + window.scrollY;
    tooltipStyle.left = viewportWidth / 2;
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={skip} />

      {/* Spotlight highlight */}
      {rect && (
        <div
          className="absolute pointer-events-none rounded-lg border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
          style={{
            top: rect.top + window.scrollY - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6), 0 10px 30px rgba(0,0,0,0.3)',
          }}
        />
      )}

      {/* Tooltip card matching chapter look */}
      <div
        className={classNames(
          'absolute max-w-[90vw] sm:max-w-md text-white',
        )}
        style={tooltipStyle}
      >
        <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-black/40 backdrop-blur-xl shadow-2xl">
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex-1 text-sm sm:text-base">
                {currentStep?.content}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              {showProgress && (
                <div className="text-xs opacity-70">
                  {index + 1} / {steps.length}
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                {showSkipButton && (
                  <button
                    type="button"
                    onClick={skip}
                    className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 transition-colors text-xs"
                  >
                    {locale.skip}
                  </button>
                )}
                <button
                  type="button"
                  onClick={goBack}
                  disabled={index === 0}
                  className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors text-xs"
                >
                  {locale.back}
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="px-3 py-1.5 rounded-xl border border-white/20 bg-gradient-to-r from-blue-500/40 to-indigo-500/40 hover:from-blue-500/60 hover:to-indigo-500/60 transition-colors text-xs"
                >
                  {isLast ? locale.last : locale.next}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

