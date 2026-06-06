// ==================== ramz-x-sw.js ====================
// إصدار الخدمة العامل – يُحدّث عند كل تغيير
const CACHE_VERSION = 'ramzx-static-v2';
const DYNAMIC_CACHE = 'ramzx-dynamic-v1';

// الملفات الأساسية التي يتم تخزينها مؤقتاً عند التثبيت
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/home.html',
  '/profile.html',
  '/explore.html',
  '/create-post.html',
  '/inbox.html',
  '/friends.html',
  '/public-profile.html',
  '/search.html',
  '/settings.html',
  '/login.html',
  '/edit-profile.html',
  '/common.js',
  // الخطوط والأيقونات (CDN)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// تثبيت الخدمة العامل وتخزين الملفات الأساسية
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => console.error('[SW] Cache addAll error:', err))
  );
  self.skipWaiting(); // تفعيل الخدمة فوراً
});

// تنظيف الإصدارات القديمة عند التفعيل
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_VERSION && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // السيطرة على الصفحات المفتوحة فوراً
});

// استراتيجيات التخزين المؤقت:
// - HTML (ملفات التنقل): network-first ثم cache
// - CSS/JS/الخطوط: cache-first ثم network
// - الصور والملفات الثابتة: cache-first ثم network (مع تخزين ديناميكي)
// - طلب API (supabase): network-only (لا يتم تخزينها)
// - أي طلب آخر: network-first مع fallback لصفحة عدم الاتصال

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const request = event.request;

  // تجاوز طلبات التحليلات أو التتبع إن وجدت
  if (url.pathname.includes('/api/') || url.pathname.includes('/auth/')) {
    return; // لا نتعامل معها
  }

  // طلبات Supabase REST API (لا يتم تخزينها)
  if (url.hostname.includes('supabase.co')) {
    return event.respondWith(fetch(request));
  }

  // طلبات الصور من تخزين Supabase (نخزّنها مؤقتاً)
  if (url.hostname.includes('supabase.co') && (url.pathname.includes('/storage/v1/object/') || url.pathname.includes('/ramz-x-images'))) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(cache => {
        return cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(networkResponse => {
            if (networkResponse.ok) cache.put(request, networkResponse.clone());
            return networkResponse;
          }).catch(() => cached);
        });
      })
    );
    return;
  }

  // طلبات HTML (تنقل بين الصفحات) – Network First
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request).then(response => {
        // تخزين نسخة جديدة من الصفحة في ذاكرة التخزين المؤقت الديناميكية
        if (response.ok) {
          const copy = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(async () => {
        // في حالة عدم الاتصال، نعيد الصفحة الرئيسية المخزنة أو صفحة مخصصة
        const cachedHome = await caches.match('/home.html');
        const cachedIndex = await caches.match('/index.html');
        return cachedHome || cachedIndex || new Response('⚠️ لا يوجد اتصال بالإنترنت، يرجى المحاولة لاحقاً.', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      })
    );
    return;
  }

  // الملفات الثابتة (CSS, JS, Fonts) – Cache First
  if (request.url.match(/\.(css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp)$/i) || 
      request.url.includes('fontawesome') || request.url.includes('googleapis')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(networkResponse => {
          if (networkResponse.ok && request.method === 'GET') {
            const copy = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, copy));
          }
          return networkResponse;
        }).catch(error => {
          console.warn('[SW] Failed to fetch static asset:', request.url, error);
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // أي طلب آخر (مثلاً AJAX عادي) – Network First مع تخزين اختياري
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && request.method === 'GET') {
        const copy = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response(JSON.stringify({ error: 'غير متصل' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    })
  );
});
