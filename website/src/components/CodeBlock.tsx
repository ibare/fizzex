import { useEffect, useState } from 'react';
import CopyButton from './CopyButton';
import { codeToHtml, type BundledLanguage } from 'shiki';

interface CodeBlockProps {
  children: string;
  lang?: BundledLanguage;
  copyable?: boolean;
  inline?: boolean;
}

export default function CodeBlock({ children, lang = 'typescript', copyable = true, inline = false }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (inline) return;
    let cancelled = false;
    codeToHtml(children, {
      lang,
      theme: 'catppuccin-mocha',
    }).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => { cancelled = true; };
  }, [children, lang, inline]);

  if (inline) {
    return (
      <pre className="code-block code-block--inline">
        {copyable && <CopyButton text={children} />}
        <code>{children}</code>
      </pre>
    );
  }

  return (
    <div className="code-block code-block--highlighted">
      {copyable && <CopyButton text={children} />}
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre><code>{children}</code></pre>
      )}
    </div>
  );
}
