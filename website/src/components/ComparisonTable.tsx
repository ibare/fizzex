import type { ComparisonRow } from '../i18n/types';

interface ComparisonTableProps {
  headers: {
    feature: string;
    katex: string;
    mathjax: string;
    mathlive: string;
    fizzex: string;
  };
  rows: Record<string, ComparisonRow>;
}

export default function ComparisonTable({ headers, rows }: ComparisonTableProps) {
  const headerKeys = ['feature', 'katex', 'mathjax', 'mathlive', 'fizzex'] as const;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="comparison-table">
        <thead>
          <tr>
            {headerKeys.map((key) => (
              <th
                key={key}
                className={key === 'fizzex' ? 'highlight-col-header' : ''}
              >
                {headers[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.values(rows).map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              {row.values.map((val, i) => (
                <td
                  key={i}
                  className={i === 3 ? 'highlight-col' : ''}
                  style={{ color: val === '-' ? 'var(--color-border)' : undefined }}
                >
                  {val === '-' ? '\u2014' : val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
