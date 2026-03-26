import { useState, useCallback } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      style={{
        position: 'absolute',
        top: '0.6em',
        right: '0.6em',
        padding: '0.25em 0.6em',
        fontSize: '0.75em',
        fontFamily: 'inherit',
        background: copied ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
        color: copied ? '#fff' : 'var(--color-muted)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
