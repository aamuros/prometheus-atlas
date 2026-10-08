import type { AuthState } from './profile';
import { signInHref, safeReturnTo } from '../../../shared/auth-navigation';
import { SignOutButton } from './sign-out-button';

export function AccessMessage({
  auth,
  returnTo = '/',
}: {
  auth: AuthState;
  returnTo?: string;
}) {
  const { status } = auth;
  return (
    <main id="main-content" className="auth-page" tabIndex={-1}>
      <section className="auth-side" aria-labelledby="auth-title">
        <div className="auth-content">
          <a className="auth-brand" href="/" aria-label="Atlas home">
            <img src="/atlas-logo.png" alt="" width={48} height={48} />
          </a>
          <header className="auth-intro" role="alert">
            <h1 id="auth-title">
              {status === 'authenticated'
                ? 'Welcome back to Atlas'
                : status === 'denied'
                  ? 'Atlas access denied'
                  : status === 'authentication'
                    ? 'Sign in to Atlas'
                    : 'Atlas is unavailable'}
            </h1>
            <p>
              {status === 'authenticated'
                ? 'Continue to your Prometheus engineering workspace.'
                : status === 'denied'
                  ? 'Your account does not have active Atlas membership. Contact an Atlas administrator.'
                  : status === 'authentication'
                    ? 'Use your approved GitHub account to access the Prometheus engineering workspace.'
                    : 'Your profile could not be loaded. Try again later or contact an Atlas administrator.'}
            </p>
            {auth.status === 'authenticated' && (
              <p className="auth-member">
                {auth.user.email} ·{' '}
                {auth.user.role === 'admin' ? 'Admin' : 'Developer'}
              </p>
            )}
          </header>
          <div className="auth-actions">
            {status === 'authenticated' ? (
              <a className="auth-primary" href={safeReturnTo(returnTo)}>
                Continue to Atlas
              </a>
            ) : status === 'authentication' ? (
              <a className="auth-primary" href={signInHref(returnTo)}>
                Continue with GitHub
              </a>
            ) : status === 'denied' ? (
              <SignOutButton className="auth-primary" returnTo={returnTo}>
                Use a different account
              </SignOutButton>
            ) : (
              <button
                className="auth-primary"
                type="button"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>
            )}
            <p className="auth-access-note">
              {status === 'denied'
                ? 'Membership is managed by your Atlas administrator.'
                : 'Access is limited to approved team members.'}
            </p>
          </div>
          {status !== 'denied' && (
            <SignOutButton className="auth-secondary">
              Sign out of Access
            </SignOutButton>
          )}
          <footer className="auth-footer">
            Prometheus Co. <span aria-hidden="true">·</span> Engineering
          </footer>
        </div>
      </section>
      <aside className="auth-gallery" aria-hidden="true">
        <div className="auth-gallery-track">
          {Array.from({ length: 8 }, (_, row) => (
            <div className="auth-gallery-row" key={row}>
              {Array.from({ length: 6 }, (_, column) => (
                <div className="auth-gallery-tile" key={column}>
                  <span className="auth-tile-nav" />
                  <span className="auth-tile-title" />
                  <span className="auth-tile-lines" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
