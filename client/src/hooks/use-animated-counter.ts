import { useState, useEffect, useRef, useCallback } from "react";

interface UseAnimatedCounterOptions {
  duration?: number;
  delay?: number;
  enabled?: boolean;
  formatter?: (value: number) => string;
}

export function useAnimatedCounter(
  targetValue: number,
  options: UseAnimatedCounterOptions = {}
) {
  const { duration = 1200, delay = 0, enabled = true, formatter } = options;
  const [displayValue, setDisplayValue] = useState(0);
  const startValueRef = useRef(0);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const hasAnimatedRef = useRef(false);

  const easeOutExpo = (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };

  useEffect(() => {
    if (!enabled) return;

    if (hasAnimatedRef.current) {
      startValueRef.current = displayValue;
    }
    hasAnimatedRef.current = true;

    const timeout = setTimeout(() => {
      startTimeRef.current = undefined;

      const animate = (timestamp: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutExpo(progress);

        const current = startValueRef.current + (targetValue - startValueRef.current) * easedProgress;
        setDisplayValue(Math.round(current));

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, duration, delay, enabled]);

  const formatted = formatter ? formatter(displayValue) : displayValue.toString();

  return { value: displayValue, formatted };
}

export function useInViewCounter(targetValue: number, options: UseAnimatedCounterOptions = {}) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const counter = useAnimatedCounter(targetValue, {
    ...options,
    enabled: inView,
  });

  return { ref, ...counter };
}
