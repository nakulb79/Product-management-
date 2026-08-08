import { navigateTo } from '../utils/navigation';

function NotFoundPage() {
  return (
    <div className="panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '480px', margin: '3rem auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>404</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>The page you're looking for doesn't exist.</p>
      <button type="button" className="btn btn-primary" onClick={() => navigateTo('/dashboard')}>
        Back to Dashboard
      </button>
    </div>
  );
}

export default NotFoundPage;
