import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as PrismHighlighter, PrismLight } from 'react-syntax-highlighter';
import { vscDarkPlus as PrismStyles } from 'react-syntax-highlighter/dist/esm/styles/prism';
import x86asm from './prism/x86asm';
import armasm from './prism/armasm';
import radare2 from './prism/radare2';
import './MarkdownRenderer.css'

PrismLight.registerLanguage(x86asm.displayName, x86asm);
PrismLight.registerLanguage(armasm.displayName, armasm);
PrismLight.registerLanguage(radare2.displayName, radare2);

const LANGUAGE_OVERRIDES = {
  armasm: armasm.displayName,
};

const PrismCodeBlock = ({ language, content, ...props }) => (
  <PrismHighlighter
    style={PrismStyles}
    language={language}
    PreTag="div"
    {...props}
  >
    {content}
  </PrismHighlighter>
);

const CodeBlock = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');

  if (!inline && match) {
    const language = LANGUAGE_OVERRIDES[match[1]] || match[1];
    const content  = String(children).replace(/\n$/, '');

    return <PrismCodeBlock language={language} content={content} {...props} />;
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
        <div className="tag-list post-metadata">
          {tags.map(tag => (
            <a key={tag} href={`/tag/${tag}`} className="blog-post-tags">
              #{tag}
            </a>
          ))}
        </div>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={MarkdownComponents}
      >
        {cleanContent}
      </ReactMarkdown>
    </article>
  );
}
