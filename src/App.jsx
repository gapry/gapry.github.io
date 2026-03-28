import { useState, useEffect, useCallback } from 'react';
import Analytics from './components/Analytics';
import NotFound from './pages/NotFound/NotFound';
import Home from './pages/Home/Home';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import MarkdownRenderer from './components/MarkdownRenderer/MarkdownRenderer';
import Tags from './pages/Tags/Tags';
import siteConfig from './data/config.json';
import './styles/App.css';

export default function App() {
  const [content, setContent] = useState('');
  const [posts  , setPosts]   = useState([]);
  const [status , setStatus]  = useState('loading');

  const fetchMarkdown = useCallback((url, title) => {
    fetch(url)
      .then(res => res.text())
      .then(text => {
        document.title = title;
        setContent(text);
        setStatus('post');
      })
      .catch(() => setStatus('404'));
  }, []);

  const handleRouting = useCallback((allPosts) => {
    console.log("Current Path Parts:", window.location.pathname.split('/').filter(Boolean));
    console.log("All Posts Data:", allPosts)

    const params         = new URLSearchParams(window.location.search);
    const redirectedPath = params.get('p');
    const currentPath    = redirectedPath || window.location.pathname;

    if (redirectedPath) {
      window.history.replaceState(null, '', redirectedPath);
    }

    const pathClean = currentPath.replace(/\.html$/, '');
    const parts     = pathClean.split('/').filter(Boolean);
    
    if (parts.length === 1 && parts[0] === 'tags') {
      document.title = `Tags | ${siteConfig.siteName}`;
      setStatus('tags-cloud'); 
      return;
    }

    if (parts[0] === 'tag' && parts[1]) {
      const tagName  = decodeURIComponent(parts[1]);
      const filtered = allPosts.filter(p => p.tags && p.tags.includes(tagName));
      
      document.title = `Tag: ${tagName} | ${siteConfig.siteName}`;      
      setPosts(filtered); 
      setStatus('home'); 
      return;
    }

    if (parts.length === 0 || (parts.length === 1 && parts[0] === 'index')) {
      document.title = siteConfig.siteName;
      setPosts(allPosts);
      setStatus('home');
      return;
    }

    if (parts.length === 1 && parts[0] === 'about') {
      fetchMarkdown('/about.md', `About | ${siteConfig.siteName}`);
      return;
    }

    if (parts.length === 4) {
      const [year, month, day, slug] = parts;

      const found = allPosts.find(p => 
        p.year === year && p.month === month && p.day === day && p.slug === slug
      );

      if (found) {
        fetchMarkdown(`/posts/${year}/${found.originalName}.md`, `${found.title} | ${siteConfig.siteName}`);
        return;
      }
    }

    setStatus('404');
  }, [fetchMarkdown]);

  useEffect(() => {
    fetch('/posts.json')
      .then(res => res.json())
      .then(data => {
        setPosts(data);
        handleRouting(data);
      })
      .catch(() => setStatus('404'));

    const onPopState = () => {
      fetch('/posts.json').then(res => res.json()).then(handleRouting);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleRouting]);

  const renderContent = () => {
    switch (status) {
      case 'loading':    return <div className="loading">Loading...</div>;
      case '404':        return <NotFound />;
      case 'home':       return <Home posts={posts} />;
      case 'tags-cloud': return <Tags allPosts={posts} />;
      case 'post':       return <MarkdownRenderer content={content} />;
      default:           return <NotFound />;
    }
  };

  return (
    <>
      <Analytics />
      <div className="app-shell">
        <Header allPosts={posts} />
        <main className="main-container">
          {renderContent()}
        </main>
        <Footer />
      </div>
    </>
  );
}
