import CopyButton from './CopyButton';

interface CodeBlockProps {
  children: string;
  copyable?: boolean;
  inline?: boolean;
}

export default function CodeBlock({ children, copyable = true, inline = false }: CodeBlockProps) {
  const className = inline ? 'code-block code-block--inline' : 'code-block';

  return (
    <pre className={className}>
      {copyable && !inline && <CopyButton text={children} />}
      <code>{children}</code>
    </pre>
  );
}
