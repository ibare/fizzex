import { useLang } from '../../i18n/context';
import type { StepItem } from '../../i18n/types';

const stepColors = [
  'var(--color-step-1)',
  'var(--color-step-2)',
  'var(--color-step-3)',
  'var(--color-step-4)',
  'var(--color-step-5)',
];

export default function PipelineSection() {
  const { t } = useLang();
  const steps = Object.values(t.pipeline.steps) as StepItem[];

  return (
    <section className="section">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.pipeline.title}</h2>
          <p className="section__sub">{t.pipeline.sub}</p>
        </div>
        <div style={styles.pipeline}>
          {steps.map((step, i) => (
            <div key={step.label} style={styles.stepWrapper}>
              <div style={styles.step}>
                <div style={{ ...styles.badge, background: stepColors[i] }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ ...styles.stepLabel, color: stepColors[i] }}>
                    {step.label}
                  </div>
                  <div style={styles.stepDesc}>{step.desc}</div>
                </div>
              </div>
              {i < steps.length - 1 && <div style={styles.arrow}>→</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pipeline: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '0.5em',
  },
  stepWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5em',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6em',
    padding: '1em',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    minWidth: '130px',
    maxWidth: '160px',
  },
  badge: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '0.75em',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepLabel: {
    fontSize: '0.85em',
    fontWeight: 700,
  },
  stepDesc: {
    fontSize: '0.75em',
    color: 'var(--color-muted)',
    lineHeight: 1.4,
    marginTop: '0.2em',
  },
  arrow: {
    color: 'var(--color-muted)',
    fontSize: '1.2em',
    flexShrink: 0,
  },
};
