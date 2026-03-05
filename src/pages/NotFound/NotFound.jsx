import './NotFound.css';

export default function NotFound() {
  return (
    <>
      <div className="not-found-container">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="not-found-text">
          Sorry, the article or page you are looking for seems to have moved or no longer exists.
        </p>
        <a href="/" className="not-found-link">
          ← Return to homepage
        </a>
      </div>
    </>
  );
}
