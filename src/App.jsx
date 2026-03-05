import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Analytics from './Analytics';
import NotFound from './NotFound';
import Home from './Home';

export default function App() {
  const [content, setContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
        const parts = pathClean.split('/').filter(Boolean);

        if (parts.length === 0 || (parts.length === 1 && parts[0] === 'index')) {
          setStatus('home');
          return;
        }

        if (parts.length === 4) {
          const [year, month, day, slug] = parts;

          const found = data.find(p =>
            p.year === year &&
            p.month === month &&
            p.day === day &&
            p.slug === slug
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

  if (status === 'loading') return <div>Loading...</div>;

  return (
    <>
      <Analytics />
      <div className="app-shell" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        {status === '404' ? (
          <NotFound />
        ) : status === 'home' ? (
          <Home posts={posts} />
        ) : (
          <article>
            <ReactMarkdown>{content}</ReactMarkdown>
            <hr />
            <a href="/" style={{ display: 'block', marginTop: '20px' }}>← Back to Home</a>
          </article>
        )}
      </div>
    </>
  );
}