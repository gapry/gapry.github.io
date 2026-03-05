import Analytics from './Analytics';

export default function NotFound() {
  return (
    <>
      <Analytics />
      <div style={{ textAlign: 'center', padding: '10vh 20px' }}>
        <h1 style={{ fontSize: '3rem', color: '#ff4d4f' }}>404</h1>
        <h2>Page Not Found</h2>
        <p>Sorry, the article or page you are looking for seems to have moved or no longer exists.</p>
        <a href="/" style={{ color: '#1890ff', textDecoration: 'none' }}>
          ← Return to homepage
        </a>
      </div>
    </>
  );
}