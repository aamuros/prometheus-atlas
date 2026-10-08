import { useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';
import { logoutAccess } from '../../lib/api';
import { safeReturnTo } from '../../../shared/auth-navigation';

export function SignOutButton({
  children,
  className,
  returnTo = '/',
}: {
  children: ReactNode;
  className?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function signOut() {
    setPending(true);
    setFailed(false);
    try {
      await logoutAccess();
      await router.navigate({
        to: '/sign-in',
        search: { returnTo: safeReturnTo(returnTo) },
        replace: true,
      });
      await router.invalidate();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-sign-out">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          void signOut();
        }}
      >
        {pending ? 'Signing out…' : children}
      </button>
      {failed && <p role="alert">Could not sign out. Please try again.</p>}
    </div>
  );
}
