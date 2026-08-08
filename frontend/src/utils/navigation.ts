// The app renders routes from window.location.pathname (see App.tsx), so any
// imperative navigation outside the nav bar's own navigate() must update the
// URL and notify AppShell the same way a real link click would.
export const navigateTo = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
