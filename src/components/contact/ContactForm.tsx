import { useState, type FormEvent } from 'react';

interface ContactFormProps {
  /** Compact layout for footer panel — no duplicate heading. */
  embedded?: boolean;
}

export function ContactForm({ embedded = false }: ContactFormProps) {
  const [status, setStatus] = useState<{ cls: string; text: string }>({ cls: '', text: '' });
  const [sending, setSending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim();
    const message = String(data.message || '').trim();
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ cls: 'err', text: 'Please add your name, a valid email address and a message.' });
      return;
    }
    setSending(true);
    setStatus({ cls: '', text: '' });
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((body as { error?: string }).error || 'Sending failed. Please try again later.');
      form.reset();
      setStatus({ cls: 'ok', text: 'Message sent — thanks! I will reply to the address you left.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sending failed.';
      setStatus({
        cls: 'err',
        text: /^Failed to fetch/i.test(msg)
          ? 'The message service is not reachable right now. Please try again later.'
          : msg,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={embedded ? 'contact contact--embedded' : 'contact'} id={embedded ? undefined : 'contact'}>
      {!embedded ? (
        <>
          <h2 className="contact-head">Send a message</h2>
          <p className="contact-lede">
            Questions, bug reports and messages go straight to my inbox. Add your email if you would like a reply.
          </p>
        </>
      ) : null}
      <form className="contact-form" noValidate onSubmit={onSubmit}>
        <div className="contact-row">
          <label className="field">
            <span>Your name</span>
            <input name="name" type="text" required maxLength={80} autoComplete="name" />
          </label>
          <label className="field">
            <span>Your email</span>
            <input name="email" type="email" required maxLength={160} autoComplete="email" />
          </label>
        </div>
        <label className="field">
          <span>Message</span>
          <textarea name="message" rows={embedded ? 3 : 4} required maxLength={4000} />
        </label>
        <div className="contact-actions">
          <button className="btn primary" type="submit" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
          <span className="contact-note">No account needed — reply goes to your email.</span>
        </div>
        <p className={`contact-status ${status.cls}`} role="status" aria-live="polite">
          {status.text}
        </p>
      </form>
    </section>
  );
}