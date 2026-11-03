// Retire the previous cache-first worker. Private usage must never enter Cache Storage.
self.addEventListener('install',() => self.skipWaiting());
self.addEventListener('activate',event => event.waitUntil((async () => {
  await caches.delete('gpt-usage-v1');
  await self.registration.unregister();
  await self.clients.claim();
})()));
