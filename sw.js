// Service Worker — Active Gym PRO
// الهدف: تخزين نسخة من صفحة البرنامج على الجهاز عشان تفتح من غير نت خالص بعد أول مرة.
// مهم: السكريبت ده بيتعامل بس مع ملفات البرنامج نفسه (نفس الدومين)، وبيسيب أي طلب
// خاص بفايربيز أو أي دومين خارجي يروح للإنترنت عادي من غير أي تدخل، عشان منكسرش المزامنة.

const CACHE_NAME = 'active-gym-pro-v1';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// ---------- التثبيت: تحميل نسخة من ملفات البرنامج الأساسية على الجهاز ----------
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(APP_SHELL);
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

// ---------- التفعيل: مسح أي نسخ قديمة من الكاش لو فيه تحديث جديد للبرنامج ----------
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (key) { return key !== CACHE_NAME; })
                    .map(function (key) { return caches.delete(key); })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// ---------- التعامل مع الطلبات ----------
self.addEventListener('fetch', function (event) {
    const req = event.request;
    const url = new URL(req.url);

    // أي طلب مش لنفس موقع البرنامج (زي فايربيز، جوجل، إلخ) → يسيبه يروح للإنترنت عادي
    // بدون أي تدخل من الكاش، عشان المزامنة السحابية تفضل شغالة بشكل طبيعي تمامًا.
    if (url.origin !== self.location.origin) {
        return;
    }

    // ملفات البرنامج نفسه: جرب الإنترنت الأول (عشان تاخد آخر تحديث)، ولو مفيش نت
    // ارجع للنسخة المحفوظة على الجهاز فورًا بدل ما البرنامج يفشل يفتح.
    event.respondWith(
        fetch(req).then(function (networkResponse) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
            return networkResponse;
        }).catch(function () {
            return caches.match(req).then(function (cached) {
                return cached || caches.match('./index.html');
            });
        })
    );
});
