import { api } from '@/lib/api';

export function ExportButtons({ sessionId }: { sessionId: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <a className="ghost-button" href={api.exportUrl(sessionId, 'markdown')}>
        下载 MD
      </a>
      <a className="ghost-button" href={api.exportUrl(sessionId, 'pdf')}>
        下载 PDF
      </a>
      <a className="ghost-button" href={api.exportUrl(sessionId, 'docx')}>
        下载 DOCX
      </a>
    </div>
  );
}
