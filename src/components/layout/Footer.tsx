import { Link } from 'react-router-dom';
import { ContactForm } from '../contact/ContactForm';

export function Footer() {
  return (
    <footer className="foot">
      <p>
        Data scraped from{' '}
        <a href="https://fitgirl-repacks.site/" target="_blank" rel="noopener noreferrer">
          fitgirl-repacks.site
        </a>
        ; system requirements cross-referenced with Steam store listings. Sizes and specs belong to their respective
        publishers. This is an unofficial fan tool.
      </p>
      <div className="support">
        <p>
          A free, fan-made tool for filtering games by size, requirements and what your PC can run. If it saved you some
          hunting, you can buy me a coffee — questions, bug reports and messages are welcome too.
        </p>
        <div className="support-actions">
          <Link className="btn ghost" to="/thank-you">
            Buy me a coffee
          </Link>
          <a className="btn ghost" href="#contact">
            Send a message
          </a>
        </div>
      </div>
      <ContactForm />
      <p className="foot-credit">
        Developed by <b>Akila Udara</b> — Nexora Software Studio ·{' '}
        <a href="mailto:nexorasoftwarestudio@gmail.com">nexorasoftwarestudio@gmail.com</a>
      </p>
    </footer>
  );
}