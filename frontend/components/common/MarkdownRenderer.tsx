import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export function MarkdownRenderer({ content }: { content?: string }) {
  if (!content) {
    return <div style={{ color: 'var(--text-muted)' }}>暂无内容</div>;
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
    </div>
  );
}
