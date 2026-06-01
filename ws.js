// ==================== Ramz‑X Service Worker ====================
const CACHE_NAME = 'ramz-x-cache-v2';

// الملفات التي سيتم تخزينها تلقائياً عند تثبيت العامل
const ASSETS_TO_CACHE = [
    '/',
    '/home.html',
    '/explore.html',
    '/create-post.html',
    '/inbox.html',
    '/profile.html',
    '/public-profile.html',
    '/edit-profile.html',
    '/friends.html',
    '/search.html',
    '/login.html',
    '/settings.html',
    '/common.js',
    '/manifest.json',
    // أيقونات التطبيق
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    '/icons/maskable-icon.png',
    // الخطوط والمكتبات الخارجية (اختياري لكن مهم للأوفلاين)
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ========== حدث التثبيت ==========
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('✅ [SW] تخزين الملفات الأساسية');
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('⚠️ لم يتم تخزين بعض الملفات:', err);
            });
        })
    );
    // تفعيل العامل الجديد فوراً دون انتظار إغلاق التبويبات القديمة
    self.skipWaiting();
});

// ========== حدث التفعيل (تنظيف الكاش القديم) ==========
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => {
            console.log('✅ [SW] تم تنظيف الكاش القديم');
            // السيطرة على جميع الصفحات فوراً
            return self.clients.claim();
        })
    );
});

// ========== استراتيجية التخزين: الشبكة أولاً، ثم الكاش ==========
self.addEventListener('fetch', event => {
    // تجاهل طلبات Supabase API (لتظل مباشرة)
    if (event.request.url.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // تخزين النسخة الجديدة في الكاش
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                // إذا فشل الاتصال، استخدم الكاش
                return caches.match(event.request).then(cachedResponse => {
                    return cachedResponse || new Response('أنت غير متصل بالإنترنت', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    });
                });
            })
    );
});
