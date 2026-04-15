import { useEffect, useRef, useCallback } from 'react';
import { DOMRendererView } from 'fizzex/headless';

interface FormulaEntry {
  latex: string;
  x: number;       // % from left
  y: number;       // % from top
  fontSize: number;
  opacity: number;
  color?: string;
  rotate?: number;  // degrees
}

const FORMULAS: FormulaEntry[] = [
  // ── Line 1: Foundation ──
  {
    latex: 'e^{ix} = \\cos x + i\\sin x',
    x: 2, y: 0,
    fontSize: 13, opacity: 0.6,
    rotate: -1,
  },
  {
    latex: '\\omega = 2\\pi\\xi',
    x: 62, y: 1,
    fontSize: 12, opacity: 0.6,
    rotate: 1,
  },

  // ── Line 2: Fourier series + coefficients ──
  {
    latex: 'f(x) = \\sum_{n=-\\infty}^{\\infty} c_n\\, e^{inx}',
    x: 4, y: 9,
    fontSize: 14, opacity: 0.6,
    rotate: -1,
  },
  {
    latex: 'c_n = \\frac{1}{2\\pi}\\int_{-\\pi}^{\\pi} f(x)\\, e^{-inx}\\, dx',
    x: 44, y: 7,
    fontSize: 13, opacity: 0.6,
    rotate: 1,
  },

  // ── Line 3: Dirac delta ──
  {
    latex: '\\delta(x) = \\frac{1}{2\\pi}\\int_{-\\infty}^{\\infty} e^{ix\\xi}\\, d\\xi',
    x: 8, y: 22,
    fontSize: 11, opacity: 0.6,
    rotate: 1,
  },

  // ── Center: The Fourier Transform — MAIN ──
  {
    latex: '\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x)\\, e^{-2\\pi i x \\xi}\\, dx',
    x: 6, y: 32,
    fontSize: 36, opacity: 1.0,
    color: '#1a1a1a',
  },

  // ── Line 5: Inverse transform ──
  {
    latex: 'f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\, e^{2\\pi ix\\xi}\\, d\\xi',
    x: 4, y: 58,
    fontSize: 14, opacity: 0.6,
    rotate: 1,
  },

  // ── Line 6: Parseval + convolution ──
  {
    latex: '\\int_{-\\infty}^{\\infty} |f(x)|^2 dx = \\int_{-\\infty}^{\\infty} |\\hat{f}(\\xi)|^2 d\\xi',
    x: 6, y: 70,
    fontSize: 12, opacity: 0.6,
    rotate: -1,
  },
  {
    latex: '\\hat{f}(\\xi) \\cdot \\hat{g}(\\xi)',
    x: 70, y: 62,
    fontSize: 13, opacity: 0.6,
    rotate: 2,
  },

  // ── Line 7: Convolution + notes ──
  {
    latex: '(f * g)(t) = \\int f(\\tau)\\,g(t-\\tau)\\,d\\tau',
    x: 12, y: 82,
    fontSize: 11, opacity: 0.6,
    rotate: -1,
  },
  {
    latex: '\\left\\| \\hat{f} \\right\\|_2 = \\left\\| f \\right\\|_2',
    x: 60, y: 78,
    fontSize: 12, opacity: 0.6,
    rotate: 2,
  },
];

export default function HeroFormulas() {
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const renderersRef = useRef<DOMRendererView[]>([]);

  const setRef = useCallback((el: HTMLDivElement | null, idx: number) => {
    wrapperRefs.current[idx] = el;
  }, []);

  useEffect(() => {
    // cleanup previous
    renderersRef.current.forEach(r => r.destroy());
    renderersRef.current = [];

    FORMULAS.forEach((f, i) => {
      const el = wrapperRefs.current[i];
      if (!el) return;

      const renderer = new DOMRendererView(el, {
        baseFontSize: f.fontSize,
        color: f.color ?? '#9ca3af',
        padding: 0,
      });
      renderer.render(f.latex);
      renderersRef.current.push(renderer);
    });

    return () => {
      renderersRef.current.forEach(r => r.destroy());
      renderersRef.current = [];
    };
  }, []);

  return (
    <div style={styles.container} aria-hidden="true">
      {FORMULAS.map((f, i) => (
        <div
          key={i}
          ref={(el) => setRef(el, i)}
          style={{
            position: 'absolute',
            left: `${f.x}%`,
            top: `${f.y}%`,
            opacity: f.opacity,
            transform: f.rotate ? `rotate(${f.rotate}deg)` : undefined,
            pointerEvents: 'none',
            transition: 'opacity 0.6s ease',
          }}
        />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 380,
  },
};
