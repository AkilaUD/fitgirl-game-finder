import { Link } from 'react-router-dom';
import { HeaderBar } from '../components/header/HeaderBar';
import { useRig } from '../hooks/useRig';

export function NotFoundPage() {
  const rig = useRig();

  return (
    <>
      <HeaderBar query="" onQuery={() => undefined} onScan={() => rig.runScan()} scanning={rig.scanning} />
      <main className="page">
        <p className="page-kicker">Error</p>
        <p className="page-num" aria-hidden="true">
          404
        </p>
        <h1 className="page-title">Page not found</h1>
        <p className="page-lede">That URL doesn&apos;t match anything here. Head back to the repack list and try again.</p>
        <div className="page-actions">
          <Link className="btn primary" to="/">
            Back to Repack Finder
          </Link>
        </div>
      </main>
    </>
  );
}