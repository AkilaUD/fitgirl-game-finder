import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ContactForm } from '../contact/ContactForm';

export function Footer() {
  const contactRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash !== '#contact') return;
      const el = contactRef.current;
      if (!el) return;
      el.open = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-grid hud-corners">
          <div className="foot-col">
            <p className="foot-kicker">Unofficial fan tool</p>
            <p className="foot-blurb">
              Filter repacks by size, requirements, and your PC. Catalogue data from{' '}
              <a href="https://fitgirl-repacks.site/" target="_blank" rel="noopener noreferrer">
                fitgirl-repacks.site
              </a>
              ; requirements cross-checked with Steam. Not affiliated with FitGirl or publishers.
            </p>
          </div>

          <nav className="foot-col" aria-label="Footer">
            <p className="foot-col-title">Navigate</p>
            <ul className="foot-links">
              <li>
                <a href="#rig">Your PC profile</a>
              </li>
              <li>
                <a href="#main">Browse repacks</a>
              </li>
              <li>
                <Link to="/thank-you">Support the project</Link>
              </li>
              <li>
                <a href="#contact">Send a message</a>
              </li>
            </ul>
          </nav>

          <div className="foot-col foot-col-cta">
            <p className="foot-col-title">Support</p>
            <p className="foot-cta-text">If this saved you some hunting, you can chip in or report a bug.</p>
            <div className="foot-cta-actions">
              <Link className="btn primary" to="/thank-you">
                Buy me a coffee
              </Link>
              <a className="btn ghost" href="#contact">
                Message
              </a>
            </div>
          </div>
        </div>

        <details className="foot-contact hud-corners" id="contact" ref={contactRef}>
          <summary className="foot-contact-summary">
            <span className="foot-contact-label">Send a message</span>
            <span className="foot-contact-hint">Bug reports · questions · feedback</span>
          </summary>
          <ContactForm embedded />
        </details>

        <div className="foot-bar">
          <span>Repack Finder · fan-made</span>
          <span className="foot-credit">
            Built by <b>Akila Udara</b>
          </span>
        </div>
      </div>
    </footer>
  );
}