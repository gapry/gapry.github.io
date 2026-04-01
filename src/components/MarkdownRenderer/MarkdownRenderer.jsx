import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as PrismHighlighter } from 'react-syntax-highlighter';
import { Light as HLJSHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as PrismStyles } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { darcula as HLJSStyles } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import './MarkdownRenderer.css'

import x86asm from 'react-syntax-highlighter/dist/esm/languages/hljs/x86asm';
import armasm from 'react-syntax-highlighter/dist/esm/languages/hljs/armasm';

HLJSHighlighter.registerLanguage('x86asm', x86asm);
HLJSHighlighter.registerLanguage('armasm', armasm);

const HLJS_LANGS = []; // ['x86asm', 'armasm'];

const HLJSCodeBlock = ({ language, content, ...props }) => (
  <HLJSHighlighter
    style={HLJSStyles}
    language={language}
    PreTag="div"
    {...props}
  >
    {content}
  </HLJSHighlighter>
);

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
    const language = match[1];
    const content  = String(children).replace(/\n$/, '');
    
    const isHLJS    = HLJS_LANGS.includes(language);
    const Component = isHLJS ? HLJSCodeBlock : PrismCodeBlock;

    return <Component language={language} content={content} {...props} />;
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
              <a key={tag} href={`/tag/${tag}`} className="blog-post-tags">
                #{tag}
              </a>
            ))}
          </div>
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
