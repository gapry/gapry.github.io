import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MarkdownRenderer.css'

const CodeBlock = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');

  if (!inline && match) {
    const language = match[1];
    const content  = String(children).replace(/\n$/, '');

    return (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        {...props}
      >
        {content}
      </SyntaxHighlighter>
    );
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

const MarkdownComponents = {
  code: CodeBlock,
};

export default function MarkdownRenderer({ content }) {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  
  let tags = [];
  let cleanContent = content;

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const tagsLine = frontmatter.match(/^tags:\s*(.*)$/m);
    if (tagsLine) {
      tags = tagsLine[1].split(',').map(t => t.trim()).filter(Boolean);
    }
    cleanContent = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '').trim();
  }

  return (
    <article className="markdown-body">
      {tags.length > 0 && (
        <div className="post-metadata">
          <div className="post-tags-row">
            {tags.map(tag => (
              <a key={tag} href={`/tag/${tag}`} className="tag-pill">
                #{tag}
              </a>
            ))}
          </div>
        </div>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MarkdownComponents}
      >
        {cleanContent}
      </ReactMarkdown>
    </article>
  );
}
