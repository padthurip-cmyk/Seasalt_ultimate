/**
 * SeaSalt Pickles - Analytics Module v2
 * =====================================
 * Tracks user behavior and links to phone number when logged in
 */

const Analytics = (function() {
    'use strict';

    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';

    let sessionId = null;
    let pageLoadTime = Date.now();

    // ══════════════════════════════
    // GET USER PHONE (from various sources)
    // ══════════════════════════════
    function getUserPhone() {
        // Check multiple localStorage keys where phone might be stored
        
        // 1. Check seasalt_user (main user storage)
        try {
            const user = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            if (user && user.phone) return user.phone;
        } catch (e) {}
        
        // 2. Check seasalt_spin_user (spin wheel user)
        try {
            const spinUser = JSON.parse(localStorage.getItem('seasalt_spin_user') || '{}');
            if (spinUser && spinUser.phone) return spinUser.phone;
        } catch (e) {}
        
        // 3. Check direct phone storage
        const directPhone = localStorage.getItem('seasalt_phone');
        if (directPhone) return directPhone;
        
        // 4. Check Firebase auth state
        try {
            const fbUser = JSON.parse(localStorage.getItem('firebase_user') || '{}');
            if (fbUser && fbUser.phoneNumber) return fbUser.phoneNumber;
        } catch (e) {}
        
        return null;
    }

    // ══════════════════════════════
    // SESSION MANAGEMENT
    // ══════════════════════════════
    function getOrCreateSession() {
        const SESSION_KEY = 'seasalt_session';
        const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

        try {
            const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
            const now = Date.now();

            if (stored.id && stored.lastActivity && (now - stored.lastActivity) < SESSION_DURATION) {
                stored.lastActivity = now;
                localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
                return stored.id;
            }

            // Create new session
            const newSession = {
                id: 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                lastActivity: now,
                startTime: now
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
            return newSession.id;
        } catch (e) {
            return 'sess_' + Date.now().toString(36);
        }
    }

    // ══════════════════════════════
    // DEVICE INFO
    // ══════════════════════════════
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        let deviceType = 'desktop';
        let browser = 'unknown';

        if (/mobile/i.test(ua)) deviceType = 'mobile';
        else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

        if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
        else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
        else if (/firefox/i.test(ua)) browser = 'Firefox';
        else if (/edge/i.test(ua)) browser = 'Edge';
        else if (/msie|trident/i.test(ua)) browser = 'IE';

        return { deviceType, browser };
    }

    // ══════════════════════════════
    // REFERRER INFO
    // ══════════════════════════════
    function getReferrer() {
        const ref = document.referrer;
        if (!ref) return 'direct';
        if (/google\./i.test(ref)) return 'google';
        if (/facebook\.|fb\./i.test(ref)) return 'facebook';
        if (/instagram\./i.test(ref)) return 'instagram';
        if (/whatsapp\./i.test(ref)) return 'whatsapp';
        if (/twitter\.|x\.com/i.test(ref)) return 'twitter';
        if (/youtube\./i.test(ref)) return 'youtube';
        try {
            return new URL(ref).hostname;
        } catch (e) {
            return 'other';
        }
    }

    // ══════════════════════════════
    // TRACK EVENT
    // ══════════════════════════════
    async function trackEvent(eventType, data = {}) {
        if (!sessionId) sessionId = getOrCreateSession();

        const userPhone = getUserPhone();
        const deviceInfo = getDeviceInfo();

        const eventData = {
            session_id: sessionId,
            event_type: eventType,
            user_phone: userPhone, // Will be null for guests
            page: data.page || window.location.pathname,
            product_id: data.productId || null,
            product_name: data.productName || null,
            device_type: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            referrer: data.referrer || getReferrer(),
            data: JSON.stringify(data.extra || {}),
            created_at: new Date().toISOString()
        };

        // Log for debugging
        console.log('[Analytics] Event:', eventType, userPhone ? '📱 ' + userPhone : '👤 Guest');

        try {
            await fetch(SUPABASE_URL + '/rest/v1/analytics_events', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(eventData)
            });
        } catch (err) {
            console.warn('[Analytics] Failed to track event:', err);
        }
    }

    // ══════════════════════════════
    // PAGE VIEW TRACKING
    // ══════════════════════════════
    function trackPageView(page) {
        pageLoadTime = Date.now();
        trackEvent('page_view', { 
            page: page || 'home',
            referrer: getReferrer()
        });
    }

    // ══════════════════════════════
    // PAGE EXIT TRACKING
    // ══════════════════════════════
    function trackPageExit() {
        const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
        
        // Use sendBeacon for reliability on page unload
        const eventData = {
            session_id: sessionId,
            event_type: 'page_exit',
            user_phone: getUserPhone(),
            page: window.location.pathname,
            time_on_page: timeOnPage,
            device_type: getDeviceInfo().deviceType,
            created_at: new Date().toISOString()
        };

        if (navigator.sendBeacon) {
            navigator.sendBeacon(
                SUPABASE_URL + '/rest/v1/analytics_events',
                new Blob([JSON.stringify(eventData)], { type: 'application/json' })
            );
        }
    }

    // ══════════════════════════════
    // PRODUCT VIEW
    // ══════════════════════════════
    function trackProductView(product) {
        trackEvent('product_view', {
            page: 'product',
            productId: product.id,
            productName: product.name,
            extra: {
                category: product.category,
                price: product.price || (product.variants && product.variants[0] ? product.variants[0].price : null)
            }
        });
    }

    // ══════════════════════════════
    // ADD TO CART
    // ══════════════════════════════
    function trackAddToCart(product, variant, quantity) {
        trackEvent('add_to_cart', {
            productId: product.id,
            productName: product.name,
            extra: {
                variant: variant ? variant.weight || variant.size : null,
                price: variant ? variant.price : null,
                quantity: quantity
            }
        });
    }

    // ══════════════════════════════
    // CHECKOUT START
    // ══════════════════════════════
    function trackCheckoutStart(cart) {
        trackEvent('checkout_start', {
            extra: {
                itemCount: cart.items ? cart.items.length : 0,
                subtotal: cart.subtotal,
                total: cart.total
            }
        });
    }

    // ══════════════════════════════
    // PURCHASE COMPLETE
    // ══════════════════════════════
    function trackPurchase(orderData) {
        trackEvent('purchase', {
            extra: {
                orderId: orderData.orderId,
                total: orderData.total,
                itemCount: orderData.items ? orderData.items.length : 0,
                paymentMethod: orderData.paymentMethod,
                walletUsed: orderData.walletDiscount || 0
            }
        });
    }

    // ══════════════════════════════
    // SEARCH
    // ══════════════════════════════
    function trackSearch(query, resultsCount) {
        trackEvent('search', {
            extra: {
                query: query,
                resultsCount: resultsCount
            }
        });
    }

    // ══════════════════════════════
    // SPIN WHEEL
    // ══════════════════════════════
    function trackSpinWheel(result, amount) {
        trackEvent('spin_wheel', {
            extra: {
                result: result, // 'win' or 'lose'
                amount: amount || 0
            }
        });
    }

    // ══════════════════════════════
    // USER LOGIN (called after spin wheel verification)
    // ══════════════════════════════
    function trackUserLogin(phone, method) {
        trackEvent('user_login', {
            extra: {
                method: method || 'otp',
                phone: phone
            }
        });
    }

    // ══════════════════════════════
    // INITIALIZE
    // ══════════════════════════════
    function init() {
        sessionId = getOrCreateSession();

        // Track initial page view
        trackPageView('home');

        // Track page exit
        window.addEventListener('beforeunload', trackPageExit);
        window.addEventListener('pagehide', trackPageExit);

        // Log user status
        const phone = getUserPhone();
        console.log('[Analytics] v2 Initialized', phone ? '📱 User: ' + phone : '👤 Guest');
    }

    // ══════════════════════════════
    // PUBLIC API
    // ══════════════════════════════
    return {
        init: init,
        trackPageView: trackPageView,
        trackProductView: trackProductView,
        trackAddToCart: trackAddToCart,
        trackCheckoutStart: trackCheckoutStart,
        trackPurchase: trackPurchase,
        trackSearch: trackSearch,
        trackSpinWheel: trackSpinWheel,
        trackUserLogin: trackUserLogin,
        trackEvent: trackEvent,
        getUserPhone: getUserPhone
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Analytics.init);
} else {
    Analytics.init();
}

window.Analytics = Analytics;
