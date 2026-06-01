// ==================== common.js – Ramz‑X (النسخة النهائية) ====================

// 1. تعريف عميل Supabase
var supabaseClient = window.supabase.createClient(
    "https://zlkpoghjbqtnhzhmmdbw.supabase.co",
    "sb_publishable_7evDsA5aEgPMsRBTFjntrg_XZQFmNLw"
);
var supabase = supabaseClient;

// ==================== 2. دوال العرض والتنسيق ====================

function showToast(msg, isError = false) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: var(--toast-bg, #000000dd); color: var(--toast-text, white);
            padding: 10px 24px; border-radius: 30px; z-index: 9999;
            font-family: 'Cairo', sans-serif; font-size: 14px; transition: opacity 0.3s;
            border: 1px solid var(--border, #2c2c2c); white-space: nowrap;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.borderColor = isError ? '#ff6b6b' : 'var(--border, #2c2c2c)';
    setTimeout(function () { toast.style.opacity = '0'; }, 3000);
}

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function timeAgo(date) {
    var diff = Math.floor((new Date() - new Date(date)) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return 'منذ ' + Math.floor(diff / 60) + ' د';
    if (diff < 86400) return 'منذ ' + Math.floor(diff / 3600) + ' س';
    return 'منذ ' + Math.floor(diff / 86400) + ' يوم';
}

function parseImages(imageField) {
    if (!imageField) return [];
    if (Array.isArray(imageField)) return imageField;
    try {
        var parsed = JSON.parse(imageField);
        if (Array.isArray(parsed)) return parsed;
        return [imageField];
    } catch (e) {
        return imageField.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
}

// ==================== 3. إدارة المستخدم ====================

async function addGuestToWelcomeChat(guestUserId) {
    try {
        var welcomeConvId = 'd1000000-0000-0000-0000-000000000001';
        var { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', welcomeConvId)
            .single();
        if (!conv) {
            await supabase.from('conversations').insert({ id: welcomeConvId });
            await supabase.from('conversation_participants').insert({
                conversation_id: welcomeConvId,
                user_id: 'a1000000-0000-0000-0000-000000000005'
            });
        }
        await supabase.from('conversation_participants')
            .upsert({ conversation_id: welcomeConvId, user_id: guestUserId });
        var { data: msgs } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', welcomeConvId)
            .eq('sender_id', 'a1000000-0000-0000-0000-000000000005')
            .limit(1);
        if (!msgs || msgs.length === 0) {
            await supabase.from('messages').insert({
                conversation_id: welcomeConvId,
                sender_id: 'a1000000-0000-0000-0000-000000000005',
                text: '👋 مرحباً بك في Ramz‑X! هذه محادثة ترحيبية.'
            });
        }
    } catch (err) {
        console.error('فشل إضافة الزائر للمحادثة الترحيبية:', err);
    }
}

async function checkSession() {
    var user = null;
    try {
        user = JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {}

    if (user && user.id) {
        var { data: dbUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();
        if (dbUser) return user;
    }

    var guestId = crypto.randomUUID();
    var guestUser = {
        id: guestId,
        username: 'زائر_' + Math.floor(Math.random() * 10000),
        full_name: 'زائر',
        avatar: 'https://randomuser.me/api/portraits/lego/' + (Math.floor(Math.random() * 8) + 1) + '.jpg',
        is_guest: true,
        verified: false
    };

    await supabase.from('users').upsert(guestUser);
    localStorage.setItem('currentUser', JSON.stringify(guestUser));
    await addGuestToWelcomeChat(guestUser.id);
    return guestUser;
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
        return null;
    }
}

// ==================== 4. دوال التفاعلات (RPC) ====================

async function incrementLikes(rowId) { await supabase.rpc('increment_likes', { row_id: rowId }); }
async function decrementLikes(rowId) { await supabase.rpc('decrement_likes', { row_id: rowId }); }
async function incrementFavorites(rowId) { await supabase.rpc('increment_favorites', { row_id: rowId }); }
async function decrementFavorites(rowId) { await supabase.rpc('decrement_favorites', { row_id: rowId }); }
async function incrementReposts(rowId) { await supabase.rpc('increment_reposts', { row_id: rowId }); }
async function decrementReposts(rowId) { await supabase.rpc('decrement_reposts', { row_id: rowId }); }
async function incrementViews(rowId) { await supabase.rpc('increment_views', { row_id: rowId }); }
async function incrementCommentsCount(rowId) { await supabase.rpc('increment_comments_count', { row_id: rowId }); }
async function decrementCommentsCount(rowId) { await supabase.rpc('decrement_comments_count', { row_id: rowId }); }

// ==================== 5. الثيم (ليلي / نهاري) ====================

function initTheme() {
    var saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
        document.body.classList.remove('light');
    } else {
        document.body.classList.add('light');
    }
}

function toggleTheme() {
    var isLight = document.body.classList.contains('light');
    if (isLight) {
        document.body.classList.remove('light');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.add('light');
        localStorage.setItem('darkMode', 'false');
    }
    return !isLight;
}

// ==================== 6. التهيئة التلقائية ====================

document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    var themeBtn = document.getElementById('darkModeToggle');
    if (themeBtn) {
        var icon = themeBtn.querySelector('i');
        if (icon) {
            var isDarkNow = !document.body.classList.contains('light');
            icon.className = isDarkNow ? 'fas fa-moon' : 'fas fa-sun';
        }
        themeBtn.addEventListener('click', function () {
            var isDark = toggleTheme();
            var ic = themeBtn.querySelector('i');
            if (ic) {
                ic.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
            }
        });
    }
});
