import { createRoute } from '@tanstack/react-router';
import { AccessMessage } from '../features/auth/access-message';
import { Route as rootRoute } from './root';
import { safeReturnTo } from '../../shared/auth-navigation';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: safeReturnTo(search.returnTo),
  }),
  component: SignInPage,
});

export function SignInPage() {
  const { auth } = Route.useRouteContext();
  const { returnTo } = Route.useSearch();
  return <AccessMessage auth={auth} returnTo={returnTo} />;
}
