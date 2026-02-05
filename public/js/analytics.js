// =============================================
// SeaSalt Pickles — Analytics Tracker v2
// Sends ALL user behavior to Supabase
// Deploy to: Seasalt_ultimate → public/js/analytics.js
// =============================================

const Analytics = (function () {
    'use strict';

    // ── Supabase Config ──
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';

    // ── Session ──
    let sessionId = '';
    let currentPage = 'home';
    let pageEnterTime = Date.now();
    let maxScrollDepth = 0;
    let isIdle = false;
    let idleTimer = null;

    // ── Device Detection ──
    function getDeviceType() {
        const w = window.innerWidth;
        if (w <= 768) return 'mobile';
        if (w <= 1024) return 'tablet';
        return 'desktop';
    }

    function getBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Edg')) return 'Edge';
        return 'Other';
    }

    function getOS() {
        const ua = navigator.userAgent;
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac')) return 'macOS';
        if (ua.includes('Linux')) return 'Linux';
        return 'Other';
    }

    function getReferrer() {
        const ref = document.referrer;
        if (!ref) return 'direct';
        try {
            const host = new URL(ref).hostname;
            if (host.includes('google')) return 'google';
            if (host.includes('facebook') || host.includes('fb.')) return 'facebook';
            if (host.includes('instagram')) return 'instagram';
            if (host.includes('whatsapp')) return 'whatsapp';
            if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
            if (host.includes('youtube')) return 'youtube';
            return host;
        } catch (e) {
            return 'other';
        }
    }

    // ── Generate Session ID ──
    function generateSessionId() {
        const stored = sessionStorage.getItem('seasalt_session_id');
        if (stored) return stored;
        const id = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
        sessionStorage.setItem('seasalt_session_id', id);
        return id;
    }

    // ── Send Event to Supabase ──
    function sendEvent(eventType, extraData) {
        const payload = {
            session_id: sessionId,
            event_type: eventType,
            page: currentPage,
            product_id: (extraData && extraData.productId) || null,
            product_name: (extraData && extraData.productName) || null,
            data: extraData ? JSON.stringify(extraData) : '{}',
            device_type: getDeviceType(),
            browser: getBrowser(),
            os: getOS(),
            referrer: getReferrer(),
            user_phone: getUserPhone(),
            time_on_page: Math.round((Date.now() - pageEnterTime) / 1000),
            scroll_depth: maxScrollDepth
        };

        // Fire and forget — don't block the UI
        fetch(SUPABASE_URL + '/rest/v1/analytics_events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        }).then(function (res) {
            if (!res.ok) {
                console.warn('[Analytics] Event send failed:', res.status);
            }
        }).catch(function (err) {
            console.warn('[Analytics] Network error:', err.message);
        });
    }

    function getUserPhone() {
        try {
            var user = localStorage.getItem('seasalt_user');
            if (user) {
                var parsed = JSON.parse(user);
                return parsed.phone || null;
            }
        } catch (e) { }
        return null;
    }

    // ── Scroll Tracking ──
    function setupScrollTracking() {
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                window.requestAnimationFrame(function () {
                    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    if (docHeight > 0) {
                        var depth = Math.round((scrollTop / docHeight) * 100);
                        if (depth > maxScrollDepth) {
                            maxScrollDepth = depth;
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // ── Idle Detection ──
    function setupIdleDetection() {
        var events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
        function resetIdle() {
            if (isIdle) {
                isIdle = false;
            }
            clearTimeout(idleTimer);
            idleTimer = setTimeout(function () {
                isIdle = true;
            }, 60000); // 60 seconds idle
        }
        events.forEach(function (evt) {
            document.addEventListener(evt, resetIdle, { passive: true });
        });
        resetIdle();
    }

    // ── Send page exit data ──
    function sendPageExit() {
        var timeSpent = Math.round((Date.now() - pageEnterTime) / 1000);
        if (timeSpent > 1) { // only track if user spent more than 1 second
            sendEvent('page_exit', {
                timeOnPage: timeSpent,
                scrollDepth: maxScrollDepth,
                wasIdle: isIdle
            });
        }
    }

    // ── Public API ──
    function init() {
        sessionId = generateSessionId();
        currentPage = 'home';
        pageEnterTime = Date.now();
        maxScrollDepth = 0;

        setupScrollTracking();
        setupIdleDetection();

        // Track initial page view
        sendEvent('page_view', { page: 'home' });

        // Track page exit on unload
        window.addEventListener('beforeunload', sendPageExit);

        // Track visibility changes (tab switch)
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                sendPageExit();
            } else {
                pageEnterTime = Date.now();
            }
        });

        console.log('[Analytics] Tracker initialized — session:', sessionId);
    }

    function trackPageView(page) {
        // Send exit for previous page
        sendPageExit();

        // Reset for new page
        currentPage = page || 'unknown';
        pageEnterTime = Date.now();
        maxScrollDepth = 0;
        isIdle = false;

        sendEvent('page_view', { page: currentPage });
    }

    function trackProductView(product) {
        if (!product) return;
        sendEvent('product_view', {
            productId: product.id || product.name,
            productName: product.name,
            category: product.category,
            price: product.price || (product.variants && product.variants[0] && product.variants[0].price)
        });
    }

    function trackAddToCart(product, quantity, variant) {
        if (!product) return;
        sendEvent('add_to_cart', {
            productId: product.id || product.name,
            productName: product.name,
            quantity: quantity || 1,
            variant: variant || '',
            price: product.price || (product.variants && product.variants[0] && product.variants[0].price)
        });
    }

    function trackRemoveFromCart(product) {
        if (!product) return;
        sendEvent('remove_from_cart', {
            productId: product.id || product.name,
            productName: product.name
        });
    }

    function trackCheckoutStart(cartTotal) {
        sendEvent('checkout_start', {
            cartTotal: cartTotal || 0
        });
    }

    function trackPurchase(order) {
        if (!order) return;
        sendEvent('purchase', {
            orderId: order.id || order.orderId,
            total: order.total || 0,
            itemCount: order.items ? order.items.length : 0,
            paymentMethod: order.paymentMethod || 'razorpay'
        });

        // Also update daily stats
        updateDailyStats(order.total || 0);
    }

    function trackSearch(query) {
        sendEvent('search', { query: query });
    }

    function trackSpinWheel(result) {
        sendEvent('spin_wheel', { result: result });
    }

    // ── Update Daily Aggregates ──
    function updateDailyStats(purchaseAmount) {
        var today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Try to upsert daily stats
        fetch(SUPABASE_URL + '/rest/v1/analytics_daily?date=eq.' + today, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        }).then(function (res) { return res.json(); })
          .then(function (rows) {
            if (rows && rows.length > 0) {
                // Update existing row
                var row = rows[0];
                fetch(SUPABASE_URL + '/rest/v1/analytics_daily?date=eq.' + today, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        purchases: (row.purchases || 0) + 1,
                        revenue: parseFloat(row.revenue || 0) + purchaseAmount
                    })
                });
            } else {
                // Insert new row for today
                fetch(SUPABASE_URL + '/rest/v1/analytics_daily', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        date: today,
                        total_sessions: 1,
                        page_views: 1,
                        purchases: purchaseAmount > 0 ? 1 : 0,
                        revenue: purchaseAmount || 0
                    })
                });
            }
        }).catch(function (err) {
            console.warn('[Analytics] Daily stats update failed:', err.message);
        });
    }

    return {
        init: init,
        trackPageView: trackPageView,
        trackProductView: trackProductView,
        trackAddToCart: trackAddToCart,
        trackRemoveFromCart: trackRemoveFromCart,
        trackCheckoutStart: trackCheckoutStart,
        trackPurchase: trackPurchase,
        trackSearch: trackSearch,
        trackSpinWheel: trackSpinWheel
    };

})();

// ── Auto-initialize when DOM is ready ──
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        Analytics.init();
    });
} else {
    Analytics.init();
}
