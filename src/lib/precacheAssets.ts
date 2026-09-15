// Scripts and styles fetched before the service worker controlled the page never passed through
// it, so after a first visit the app (and the offline map chunk) would not open without internet.
// Hand every same-origin asset this page loads to the worker, which caches whatever it lacks.
const ASSET_PATH = /\.(?:js|css|webp|png|jpe?g|svg|woff2?)$/i;

export function precacheLoadedAssets() {
  if (!("serviceWorker" in navigator) || typeof PerformanceObserver === "undefined") return;

  navigator.serviceWorker.ready.then((registration) => {
    const send = (urls: string[]) => {
      if (urls.length > 0) registration.active?.postMessage({ type: "CACHE_URLS", urls });
    };

    send([location.pathname]);
    new PerformanceObserver((list) => {
      send(
        list
          .getEntries()
          .map((entry) => entry.name)
          .filter((url) => {
            const parsed = new URL(url);
            return parsed.origin === location.origin && ASSET_PATH.test(parsed.pathname);
          })
      );
    }).observe({ type: "resource", buffered: true });
  });
}
