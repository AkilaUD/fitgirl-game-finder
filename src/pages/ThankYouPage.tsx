import { Link } from 'react-router-dom';
import { HeaderBar } from '../components/header/HeaderBar';
import { PayPalDonateForm } from '../components/support/PayPalDonateForm';
import { useRig } from '../hooks/useRig';

export function ThankYouPage() {
  const rig = useRig();

  return (
    <>
      <HeaderBar query="" onQuery={() => undefined} onScan={() => rig.runScan()} scanning={rig.scanning} />
      <main className="page">
        <p className="page-kicker">Support</p>
        <h2 className="page-title thanks-title">Thank you</h2>
        <p className="page-lede">
          Repack Finder is a free, fan-made tool: it filters games by download size and system requirements, and scans
          your own PC to show what should actually run. No accounts, no ads, nothing sent anywhere.
        </p>
        <p className="page-lede">
          Keeping the data fresh takes time, so if the tool saved you some hunting, buying me a coffee is genuinely
          appreciated — and it goes straight back into keeping the list current.
        </p>

        <div className="support-box">
          <p className="support-label">Donation</p>
          <p className="support-text">
            PayPal opens in a new tab. After donating you can come back here or jump straight to the repacks — thanks for
            supporting the project.
          </p>
          <PayPalDonateForm />
        </div>

        <p className="page-lede">
          Questions, bug reports or just want to say something? Send a message and it lands straight in my inbox at{' '}
          <a href="mailto:nexorasoftwarestudio@gmail.com">nexorasoftwarestudio@gmail.com</a>.
        </p>

        <div className="page-actions">
          <Link className="btn primary" to="/">
            Back to the repacks
          </Link>
          <a
            className="btn ghost"
            href="mailto:nexorasoftwarestudio@gmail.com?subject=Message%20for%20Repack%20Finder"
          >
            Send a message
          </a>
        </div>
      </main>
    </>
  );
}