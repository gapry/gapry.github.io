import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Analytics from './Analytics';
import NotFound from './NotFound';

const allPostFiles = import.meta.glob('/public/posts/**/*.md', { query: '?url', import: 'default' });

function App() {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectedPath = params.get('p');
    const currentPath = redirectedPath || window.location.pathname;

    if (redirectedPath) {
      window.history.replaceState(null, '', redirectedPath);
    }

    if (currentPath === '/' || currentPath === '/index.html') {
      setContent('# Welcome My Blog');
      setStatus('success');
      return;
    }

    const parts = currentPath.replace(/\.html$/, '').split('/').filter(Boolean);
    const [year, slug] = parts;

    if (year && slug) {
      const expectedPath = `/public/posts/${year}/${slug}.md`;
      
      if (allPostFiles[expectedPath]) {
        fetch(`/posts/${year}/${slug}.md`)
          .then(res => res.text())
          .then(text => {
            setContent(text);
            setStatus('success');
          })
          .catch(() => setStatus('404'));
      } else {
        setStatus('404');
      }
    } else {
      setStatus('404');
    }
  }, []);

  if (status === 'loading') return <div>Loading...</div>;
  if (status === '404')     return <NotFound />;

  return (
    <>
      <Analytics />
      <article style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
    </>
  );
}

export default App;