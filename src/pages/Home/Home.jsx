import { useState } from 'react';
import './Home.css';

const POSTS_PER_PAGE = 10;

export default function Home({ posts }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [prevPosts  , setPrevPosts]   = useState(posts);

  if (posts !== prevPosts) {
    setPrevPosts(posts);
    setCurrentPage(0);
  }

  const startIndex   = currentPage * POSTS_PER_PAGE;
  const currentPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  const hasNext      = startIndex + POSTS_PER_PAGE < posts.length;
  const hasPrev      = currentPage > 0;

  return (
    <div>
      <h1 className="home-title">Recent Posts</h1>

      <ul className="post-list">
        {currentPosts.map(post => (
          <li key={post.originalName} className="post-item">
            <div>
              <span className="post-date">[{post.date}] --</span>
              <a href={`/${post.year}/${post.month}/${post.day}/${post.slug}.html`}>
                {post.title}
              </a>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="tag-list post-tags">
                {post.tags.map(tag => (
                  <a key={tag} href={`/tag/${tag}`} className="tag-link">
                    #{tag}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <nav className="pagination">
        {hasPrev && (
          <button
            className="link pagination-btn"
            onClick={() => setCurrentPage(p => p - 1)}
          >
            ← Newer
          </button>
        )}
        {hasNext && (
          <button
            className="link pagination-btn"
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Older →
          </button>
        )}
      </nav>
    </div>
  );
}