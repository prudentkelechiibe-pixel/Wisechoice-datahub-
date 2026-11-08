const CACHE_NAME = "wisechoice-cache-v1";

const PAGES_TO_CACHE = [
    "/",
    "/index.html",
    "/store.html",
    "/about.html",
    "/contact.html"
];

// Install service worker
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PAGES_TO_CACHE))
    );

    self.skipWaiting();
});

// Activate service worker
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );

    self.clients.claim();
});

// Handle page requests
self.addEventListener("fetch", event => {

    if (
        event.request.method !== "GET" ||
        event.request.mode !== "navigate"
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(
                            event.request,
                            copy
                        ));
                }

                return response;
            })
            .catch(async () => {
                return await caches.match(event.request) ||
                       await caches.match("/index.html");
            })
    );
});

// Receive push notifications
self.addEventListener("push", event => {

    let data = {
        title: "WiseChoice Data Hub",
        body: "Check out our latest offers and updates!",
        url: "/"
    };

    if (event.data) {
        try {
            data = {
                ...data,
                ...event.data.json()
            };
        } catch (error) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: "/icons/wisechoice-192.png",
            badge: "/icons/wisechoice-192.png",
            data: {
                url: data.url
            }
        })
    );
});

// Handle notification clicks
self.addEventListener("notificationclick", event => {

    event.notification.close();

    const targetUrl = event.notification.data.url || "/";

    event.waitUntil(
        self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(clients => {

            for (const client of clients) {
                if ("focus" in client) {
                    return client.focus();
                }
            }

            return self.clients.openWindow(targetUrl);
        })
    );
});
