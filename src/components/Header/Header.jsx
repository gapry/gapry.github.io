import siteConfig from '../../data/config.json';
import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-container">
        <div className="header-left">
          <a href="/" className="logo">{siteConfig.siteName}</a>
        </div>

        <nav className="header-right">
          <ul className="nav-menu">
            <li><a href="/tags" className="nav-link">Tags</a></li>
            <li><a href="/about" className="nav-link">About Me</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}