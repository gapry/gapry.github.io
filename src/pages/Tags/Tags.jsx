import { useMemo } from 'react';
import './Tags.css';

export default function Tags({ allPosts }) {
  const tagStats = useMemo(() => {
    const counts = {};
    allPosts.forEach(post => {
      (post.tags || []).forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allPosts]);

  return (
    <div className="tags-page">
      <div className="tags-cloud-wrapper">
        {tagStats.map(([tag, count]) => (
          <a key={tag} href={`/tag/${tag}`} className="tag-cloud-item">
            <span className="tag-hash">#</span>
            <span className="tag-name">{tag}</span>
            <span className="tag-count">{count}</span>
          </a>
        ))}
      </div>
    </div>
  );
}