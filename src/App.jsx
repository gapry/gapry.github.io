import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Analytics from './components/Analytics';
import NotFound from './pages/NotFound/NotFound';
import Home from './pages/Home/Home';
import './styles/App.css';

export default function App() {
  const [content, setContent] = useState('');
  const [posts  , setPosts]   = useState([]);
  const [status , setStatus]  = useState('loading');

  useEffect(() => {
    const params         = new URLSearchParams(window.location.search);
    const redirectedPath = params.get('p');

    let currentPath = redirectedPath || window.location.pathname;

    if (redirectedPath) {
      window.history.replaceState(null, '', redirectedPath);
    }

    fetch('/posts.json')
      .then(res => res.json())
      .then(data => {
        setPosts(data);

        const pathClean = currentPath.replace(/\.html$/, '');
        const parts     = pathClean.split('/').filter(Boolean);

        if (parts.length === 0 || (parts.length === 1 && parts[0] === 'index')) {
          setStatus('home');
          return;
        }

        if (parts.length === 4) {
          const [year, month, day, slug] = parts;

          const found = data.find(p =>
            p.year  === year  &&
            p.month === month &&
            p.day   === day   &&
            p.slug  === slug
          );
          
          if (found) {
            fetch(`/posts/${year}/${found.originalName}.md`)
              .then(res => res.text())
              .then(text => {
                setContent(text);
                setStatus('post');
              })
              .catch(() => setStatus('404'));
          } else {
            setStatus('404');
          }
        } else {
          setStatus('404');
        }
      })
      .catch(() => setStatus('404'));
  }, []);

  if (status === 'loading') {
    return <div className="app-shell">Loading...</div>;
  }

  return (
    <>
      <Analytics />
      <div className="app-shell">
        {status === '404' ? (
          <NotFound />
        ) : status === 'home' ? (
          <Home posts={posts} />
        ) : (
          <article className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
            <hr />
            <a href="/" className="back-link">← Back to Home</a>
          </article>
        )}
      </div>
    </>
  );
}
