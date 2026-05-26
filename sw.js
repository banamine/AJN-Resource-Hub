self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. Force network-only for your RSS feed
  // We use a timestamp to guarantee the URL is unique, 
  // bypassing browser/CDN caches entirely.
  if (url.includes('AJNHourlyVideo')) {
    const urlWithTimestamp = new URL(url);
    urlWithTimestamp.searchParams.set('t', Date.now()); // Forces a fresh request
    
    event.respondWith(
      fetch(urlWithTimestamp, { 
        mode: 'no-cors',
        cache: 'reload' // Forces the browser to ignore its own cache
      })
    );
    return;
  }
  
  // ... rest of your code
});
