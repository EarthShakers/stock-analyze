import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

export function MarkdownRenderer({ content, compact = false }: { content?: string; compact?: boolean }) {
  if (!content) {
    return <div style={{ color: 'var(--text-muted)' }}>暂无内容</div>;
  }

  return (
    <div className={`markdown-body${compact ? ' markdown-body-compact' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
