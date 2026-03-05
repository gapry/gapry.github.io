import { useState } from 'react';

const POSTS_PER_PAGE = 10;

export default function Home({ posts }) {
  const [currentPage, setCurrentPage] = useState(0);

  const startIndex = currentPage * POSTS_PER_PAGE;
  const currentPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  const hasNext = startIndex + POSTS_PER_PAGE < posts.length;
  const hasPrev = currentPage > 0;

  return (
    <div className="home-container">
      <h1>Recent Posts</h1>
      <ul className="post-list">
        {currentPosts.map(post => (
          <li key={post.originalName} className="post-item">
            <span className="post-date">{post.date}</span>
            <a href={`/${post.year}/${post.month}/${post.day}/${post.slug}.html`} className="post-link">
              {post.title}
            </a>
          </li>
        ))}
      </ul>

      <nav className="pagination" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        {hasPrev && (
          <button onClick={() => setCurrentPage(p => p - 1)}>← Newer</button>
        )}
        {hasNext && (
          <button onClick={() => setCurrentPage(p => p + 1)}>Older →</button>
        )}
      </nav>
    </div>
  );
}