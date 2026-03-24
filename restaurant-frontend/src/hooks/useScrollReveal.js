import { useEffect, useRef, useState } from 'react';

/**
 * useScrollReveal - Returns a ref and a boolean `inView`.
 * When the element enters the viewport, `inView` becomes true.
 * @param {number} threshold - 0 to 1, how much of the element must be visible.
 * @param {number} rootMargin - CSS margin string, e.g. "0px 0px -80px 0px"
 */
const useScrollReveal = (threshold = 0.15, rootMargin = '0px 0px -60px 0px') => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el); // Only animate once
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
};

export default useScrollReveal;
