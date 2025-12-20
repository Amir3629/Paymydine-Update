// Service Worker for PWA and Push Notifications

self.addEventListener("install", (event) => {
  console.log("Service Worker installing.")
  // Pre-cache essential assets
  event.waitUntil(
    caches.open("paymydine-static-v1").then((cache) => {
      return cache.addAll(["/", "/offline.html", "/icons/icon-192x192.png"])
    }),
  )
})

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating.")
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => caches.match("/offline.html"))
    }),
  )
})

self.addEventListener("push", (event) => {
  const data = event.data.json()
  console.log("Push received:", data)

  const title = data.title || "PayMyDine"
  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
  }

  event.waitUntil(self.registration.showNotification(title, options))
})
