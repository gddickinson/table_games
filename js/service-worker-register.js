// Register service worker for PWA / offline support
//
// This module attempts to register the service worker (sw.js) so the game
// can be installed as a Progressive Web App and played offline.  If the
// browser does not support service workers the registration silently fails.

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        // Check for updates on each page load
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[SW] New version activated — refresh for updates.');
              }
            });
          }
        });
      })
      .catch(() => {
        // Service worker registration failed — offline mode unavailable
      });
  });
}
