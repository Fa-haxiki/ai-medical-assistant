import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import './ChatInterface.css';

interface MarkdownContentProps {
  content: string | unknown;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const safeContent = React.useMemo(() => {
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return '';
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'text' in item) {
            return (item as { text: string }).text;
          }
          return JSON.stringify(item);
        })
        .join('\n');
    }
    if (typeof content === 'object') {
      if ('text' in content) return String((content as { text: unknown }).text);
      if ('content' in content) {
        return String((content as { content: unknown }).content);
      }
      return JSON.stringify(content);
    }
    return String(content);
  }, [content]);

  return (
    <div className="markdown-content">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
        {safeContent}
      </ReactMarkdown>
    </div>
  );
};

