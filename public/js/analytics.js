// =============================================
// SeaSalt Pickles — Analytics Tracker v3
// With Location Tracking, Repeat Visitor Detection, Wallet Integration
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
    let userLocation = { city: null, country: null, region: null };

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

    // ── Get User Location via IP ──
    function fetchUserLocation() {
        // Use free IP geolocation API
        fetch('https://ipapi.co/json/')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                userLocation = {
                    city: data.city || null,
                    country: data.country_name || null,
                    region: data.region || null
                };
                // Save to localStorage for future use
                localStorage.setItem('seasalt_location', JSON.stringify(userLocation));
                console.log('[Analytics] Location detected:', userLocation.city + ', ' + userLocation.country);
            })
            .catch(function(err) {
                console.warn('[Analytics] Location fetch failed:', err.message);
                // Try to load from localStorage
                try {
                    var saved = localStorage.getItem('seasalt_location');
                    if (saved) userLocation = JSON.parse(saved);
                } catch(e) {}
            });
    }

    // ── Get User Phone ──
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
            scroll_depth: maxScrollDepth,
            city: userLocation.city,
            country: userLocation.country,
            region: userLocation.region
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

        // Check for repeat visitor (4+ visits in 24h) and notify admin
        if (eventType === 'page_view') {
            checkRepeatVisitor();
        }
    }

    // ── Check for Repeat Visitor (4+ visits in 24h) ──
    function checkRepeatVisitor() {
        var phone = getUserPhone();
        if (!phone) return; // Only track logged-in users

        // Count visits in last 24 hours
        var visits = JSON.parse(localStorage.getItem('seasalt_visits_24h') || '[]');
        var now = Date.now();
        var twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        
        // Filter to last 24 hours and add current visit
        visits = visits.filter(function(v) { return v > twentyFourHoursAgo; });
        visits.push(now);
        localStorage.setItem('seasalt_visits_24h', JSON.stringify(visits));

        // If 4+ visits, create admin notification
        if (visits.length === 4) {
            createAdminNotification(phone, visits.length);
        }
    }

    // ── Create Admin Notification for Repeat Visitor ──
    function createAdminNotification(phone, visitCount) {
        var notification = {
            type: 'high_activity',
            user_phone: phone,
            message: 'User ' + phone + ' has visited ' + visitCount + ' times in the last 24 hours without purchasing!',
            data: JSON.stringify({
                visitCount: visitCount,
                city: userLocation.city,
                country: userLocation.country,
                device: getDeviceType()
            }),
            is_read: false,
            email_sent: false,
            sms_sent: false
        };

        fetch(SUPABASE_URL + '/rest/v1/admin_notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(notification)
        }).then(function(res) {
            if (res.ok) {
                console.log('[Analytics] Admin notified about repeat visitor');
            }
        }).catch(function(err) {
            console.warn('[Analytics] Notification failed:', err.message);
        });
    }

    // ── Update/Create User Profile ──
    function updateUserProfile() {
        var phone = getUserPhone();
        if (!phone) return;

        // First check if user exists
        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        })
        .then(function(res) { return res.json(); })
        .then(function(users) {
            if (users && users.length > 0) {
                // Update existing user
                var user = users[0];
                fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        total_visits: (user.total_visits || 0) + 1,
                        last_seen: new Date().toISOString(),
                        city: userLocation.city || user.city,
                        country: userLocation.country || user.country,
                        device_type: getDeviceType(),
                        is_repeat_visitor: (user.total_visits || 0) >= 2
                    })
                });
            } else {
                // Create new user
                fetch(SUPABASE_URL + '/rest/v1/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        phone: phone,
                        wallet_balance: 0,
                        total_visits: 1,
                        city: userLocation.city,
                        country: userLocation.country,
                        device_type: getDeviceType()
                    })
                });
            }
        })
        .catch(function(err) {
            console.warn('[Analytics] User profile update failed:', err.message);
        });
    }

    // ── Check for Wallet Messages ──
    function checkWalletMessages() {
        var phone = getUserPhone();
        if (!phone) return;

        fetch(SUPABASE_URL + '/rest/v1/user_messages?user_phone=eq.' + encodeURIComponent(phone) + '&is_read=eq.false', {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        })
        .then(function(res) { return res.json(); })
        .then(function(messages) {
            if (messages && messages.length > 0) {
                messages.forEach(function(msg) {
                    // Show message to user
                    if (msg.wallet_amount > 0) {
                        showWalletNotification(msg.message, msg.wallet_amount);
                    }
                    // Mark as read
                    fetch(SUPABASE_URL + '/rest/v1/user_messages?id=eq.' + msg.id, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_KEY,
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ is_read: true })
                    });
                });
            }
        })
        .catch(function(err) {
            console.warn('[Analytics] Message check failed:', err.message);
        });
    }

    // ── Show Wallet Notification to User ──
    function showWalletNotification(message, amount) {
        // Create toast notification
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:16px 24px;border-radius:12px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.3);text-align:center;animation:slideDown 0.5s ease;max-width:90vw;';
        toast.innerHTML = '<div style="font-size:1.5rem;margin-bottom:4px;">🎉 You received ₹' + amount + '!</div><div style="font-size:0.9rem;opacity:0.9;">' + message + '</div>';
        document.body.appendChild(toast);

        // Update local wallet
        try {
            var wallet = parseFloat(localStorage.getItem('seasalt_wallet') || '0');
            localStorage.setItem('seasalt_wallet', (wallet + amount).toString());
            // Trigger wallet update event
            window.dispatchEvent(new CustomEvent('walletUpdated', { detail: { balance: wallet + amount } }));
        } catch(e) {}

        // Remove after 5 seconds
        setTimeout(function() {
            toast.style.animation = 'slideUp 0.5s ease';
            setTimeout(function() { toast.remove(); }, 500);
        }, 5000);
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
        if (timeSpent > 1) {
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

        // Fetch user location
        fetchUserLocation();

        setupScrollTracking();
        setupIdleDetection();

        // Track initial page view
        sendEvent('page_view', { page: 'home' });

        // Update user profile if logged in
        setTimeout(updateUserProfile, 1000);

        // Check for wallet messages
        setTimeout(checkWalletMessages, 2000);

        // Track page exit on unload
        window.addEventListener('beforeunload', sendPageExit);

        // Track visibility changes (tab switch)
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                sendPageExit();
            } else {
                pageEnterTime = Date.now();
                checkWalletMessages(); // Check messages when user returns
            }
        });

        console.log('[Analytics] Tracker v3 initialized — session:', sessionId);
    }

    function trackPageView(page) {
        sendPageExit();
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
        sendEvent('checkout_start', { cartTotal: cartTotal || 0 });
    }

    function trackPurchase(order) {
        if (!order) return;
        sendEvent('purchase', {
            orderId: order.id || order.orderId,
            total: order.total || 0,
            itemCount: order.items ? order.items.length : 0,
            paymentMethod: order.paymentMethod || 'razorpay'
        });

        // Clear repeat visitor counter on purchase
        localStorage.removeItem('seasalt_visits_24h');

        // Update user purchase stats
        updateUserPurchaseStats(order.total || 0);
    }

    function updateUserPurchaseStats(amount) {
        var phone = getUserPhone();
        if (!phone) return;

        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        })
        .then(function(res) { return res.json(); })
        .then(function(users) {
            if (users && users.length > 0) {
                var user = users[0];
                fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        total_purchases: (user.total_purchases || 0) + 1,
                        total_spent: parseFloat(user.total_spent || 0) + amount,
                        is_repeat_visitor: false // They purchased!
                    })
                });
            }
        });
    }

    function trackSearch(query) {
        sendEvent('search', { query: query });
    }

    function trackSpinWheel(result) {
        sendEvent('spin_wheel', { result: result });
    }

    // ── Get User's Wallet Balance ──
    function getWalletBalance(callback) {
        var phone = getUserPhone();
        if (!phone) {
            callback(0);
            return;
        }

        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone) + '&select=wallet_balance', {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        })
        .then(function(res) { return res.json(); })
        .then(function(users) {
            var balance = (users && users.length > 0) ? parseFloat(users[0].wallet_balance || 0) : 0;
            callback(balance);
        })
        .catch(function() {
            callback(0);
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
        trackSpinWheel: trackSpinWheel,
        getWalletBalance: getWalletBalance
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

// ── Add CSS animation for wallet notification ──
(function() {
    var style = document.createElement('style');
    style.textContent = '@keyframes slideDown{from{transform:translateX(-50%) translateY(-100px);opacity:0;}to{transform:translateX(-50%) translateY(0);opacity:1;}}@keyframes slideUp{from{transform:translateX(-50%) translateY(0);opacity:1;}to{transform:translateX(-50%) translateY(-100px);opacity:0;}}';
    document.head.appendChild(style);
})();
