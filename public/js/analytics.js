/**
 * SeaSalt Pickles - Analytics v2 (Supabase-Backed)
 * ==================================================
 * Tracks page views, product views, cart events, purchases.
 * All data goes to Supabase so the admin dashboard can see
 * real visitor analytics across all users and devices.
 */

var Analytics = (function() {

    var SB = 'https://yosjbsncvghpscsrvxds.supabase.co/rest/v1/';
    var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    var HEADERS = {
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    };

    var sessionId = '';
    var userId = '';
    var currentPage = 'home';
    var pageStartTime = Date.now();
    var lastActivity = Date.now();
    var deviceInfo = {};

    // ============================================
    // INIT
    // ============================================

    function init() {
        sessionId = getSessionId();
        userId = getUserId();
        deviceInfo = getDeviceInfo();
        
        trackPageView('home');
        setupListeners();
        console.log('📊 Analytics v2: Ready | session=' + sessionId);
    }

    function getSessionId() {
        var sid = sessionStorage.getItem('ss_sid');
        if (!sid) {
            sid = 's_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
            sessionStorage.setItem('ss_sid', sid);
        }
        return sid;
    }

    function getUserId() {
        var uid = localStorage.getItem('seasalt_user_id');
        if (!uid) {
            uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('seasalt_user_id', uid);
        }
        return uid;
    }

    function getDeviceInfo() {
        var ua = navigator.userAgent;
        var device = 'desktop';
        if (/mobile/i.test(ua)) device = 'mobile';
        else if (/tablet|ipad/i.test(ua)) device = 'tablet';
        var browser = 'other';
        if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'chrome';
        else if (/firefox/i.test(ua)) browser = 'firefox';
        else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'safari';
        else if (/edge/i.test(ua)) browser = 'edge';
        var os = 'other';
        if (/windows/i.test(ua)) os = 'windows';
        else if (/mac/i.test(ua)) os = 'macos';
        else if (/android/i.test(ua)) os = 'android';
        else if (/iphone|ipad|ios/i.test(ua)) os = 'ios';
        else if (/linux/i.test(ua)) os = 'linux';
        return { type: device, browser: browser, os: os };
    }

    // ============================================
    // SEND EVENT TO SUPABASE
    // ============================================

    function sendEvent(eventType, page, action, label, value) {
        var payload = {
            event_type: eventType || 'page_view',
            session_id: sessionId,
            user_id: userId,
            page: page || currentPage,
            action: action || null,
            label: label || null,
            value: value || null,
            device: deviceInfo.type || 'desktop',
            browser: deviceInfo.browser || null,
            os: deviceInfo.os || null,
            referrer: document.referrer || 'direct'
        };

        // Fire and forget — don't block the UI
        try {
            fetch(SB + 'analytics_events', {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify(payload)
            }).catch(function() {});
        } catch(e) {}

        // Also update daily aggregate
        updateDailyStats(eventType, value);
    }

    function updateDailyStats(eventType, value) {
        var today = new Date().toISOString().split('T')[0];

        // Use upsert to increment counters
        // First try to get existing row, then upsert
        try {
            fetch(SB + 'analytics_daily?date=eq.' + today, {
                headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
            }).then(function(r) { return r.json(); })
            .then(function(rows) {
                var existing = (rows && rows.length > 0) ? rows[0] : null;

                var data = {
                    date: today,
                    views: (existing ? existing.views : 0) + (eventType === 'page_view' ? 1 : 0),
                    unique_users: existing ? existing.unique_users : 1,
                    cart_adds: (existing ? existing.cart_adds : 0) + (eventType === 'add_to_cart' ? 1 : 0),
                    checkouts: (existing ? existing.checkouts : 0) + (eventType === 'checkout_start' ? 1 : 0),
                    purchases: (existing ? existing.purchases : 0) + (eventType === 'purchase' ? 1 : 0),
                    revenue: (existing ? existing.revenue : 0) + (eventType === 'purchase' ? (value || 0) : 0),
                    updated_at: new Date().toISOString()
                };

                // If new user for today, increment unique count
                if (!existing) {
                    data.unique_users = 1;
                }

                fetch(SB + 'analytics_daily', {
                    method: 'POST',
                    headers: {
                        'apikey': KEY,
                        'Authorization': 'Bearer ' + KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates,return=minimal'
                    },
                    body: JSON.stringify(data)
                }).catch(function() {});
            }).catch(function() {});
        } catch(e) {}
    }

    // ============================================
    // TRACKING METHODS (called by other modules)
    // ============================================

    function trackPageView(pageName) {
        currentPage = pageName || 'home';
        pageStartTime = Date.now();
        sendEvent('page_view', currentPage);
        console.log('📊 Page view:', currentPage);
    }

    function trackEvent(category, action, label, value) {
        sendEvent('event', currentPage, category + ':' + action, label, value);
    }

    function trackProductView(product) {
        if (!product) return;
        sendEvent('product_view', currentPage, 'view', product.name || product.id, product.price || 0);
    }

    function trackAddToCart(product, quantity, variant) {
        if (!product) return;
        var price = (variant && variant.price) ? variant.price : (product.price || 0);
        sendEvent('add_to_cart', currentPage, 'add', product.name || product.id, price * (quantity || 1));
    }

    function trackRemoveFromCart(product) {
        if (!product) return;
        sendEvent('remove_from_cart', currentPage, 'remove', product.name || product.id, 0);
    }

    function trackCheckoutStart(cart) {
        var total = (cart && cart.total) ? cart.total : 0;
        sendEvent('checkout_start', 'checkout', 'start', null, total);
    }

    function trackPurchase(orderData) {
        var total = (orderData && orderData.total) ? orderData.total : 0;
        var orderId = (orderData && orderData.id) ? orderData.id : '';
        sendEvent('purchase', 'checkout', 'complete', orderId, total);
    }

    function trackSearch(query) {
        sendEvent('search', currentPage, 'query', query, 0);
    }

    // ============================================
    // REPORT GENERATION (called by admin dashboard)
    // ============================================

    function getReport() {
        // Return a promise that fetches from Supabase
        return fetchReport().then(function(report) {
            return report;
        }).catch(function() {
            return getEmptyReport();
        });
    }

    function fetchReport() {
        var today = new Date();
        var sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        var fromDate = sevenDaysAgo.toISOString();

        return Promise.all([
            // Get recent events (last 7 days)
            fetch(SB + 'analytics_events?select=*&created_at=gte.' + fromDate + '&order=created_at.desc&limit=500', {
                headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
            }).then(function(r) { return r.json(); }).catch(function() { return []; }),

            // Get daily stats
            fetch(SB + 'analytics_daily?select=*&order=date.desc&limit=30', {
                headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
            }).then(function(r) { return r.json(); }).catch(function() { return []; })
        ]).then(function(results) {
            var events = results[0] || [];
            var dailyRows = results[1] || [];
            return buildReport(events, dailyRows);
        });
    }

    function buildReport(events, dailyRows) {
        // Aggregate from events
        var sessions = {};
        var pageViews = 0;
        var productViews = 0;
        var cartAdds = 0;
        var checkouts = 0;
        var purchases = 0;
        var revenue = 0;
        var devices = { mobile: 0, desktop: 0, tablet: 0 };
        var sources = {};
        var productStats = {};
        var pageStats = {};

        events.forEach(function(e) {
            // Sessions
            if (e.session_id && !sessions[e.session_id]) {
                sessions[e.session_id] = { start: e.created_at, device: e.device, referrer: e.referrer };
                var dev = e.device || 'desktop';
                devices[dev] = (devices[dev] || 0) + 1;
                var src = e.referrer || 'direct';
                if (src !== 'direct') {
                    try { src = new URL(src).hostname; } catch(x) { src = 'other'; }
                } else { src = 'Direct'; }
                sources[src] = (sources[src] || 0) + 1;
            }

            // Count event types
            switch(e.event_type) {
                case 'page_view':
                    pageViews++;
                    var pg = e.page || 'home';
                    if (!pageStats[pg]) pageStats[pg] = { visits: 0, totalTime: 0, avgTime: 0, bounces: 0 };
                    pageStats[pg].visits++;
                    break;
                case 'product_view':
                    productViews++;
                    if (e.label) {
                        if (!productStats[e.label]) productStats[e.label] = { views: 0, cartAdds: 0, purchases: 0 };
                        productStats[e.label].views++;
                    }
                    break;
                case 'add_to_cart':
                    cartAdds++;
                    if (e.label) {
                        if (!productStats[e.label]) productStats[e.label] = { views: 0, cartAdds: 0, purchases: 0 };
                        productStats[e.label].cartAdds++;
                    }
                    break;
                case 'checkout_start': checkouts++; break;
                case 'purchase':
                    purchases++;
                    revenue += (e.value || 0);
                    break;
            }
        });

        var totalSessions = Object.keys(sessions).length;

        // Build daily data for last 7 days
        var dailyData = [];
        for (var i = 6; i >= 0; i--) {
            var d = new Date();
            d.setDate(d.getDate() - i);
            var dateStr = d.toISOString().split('T')[0];
            var found = dailyRows.find(function(r) { return r.date === dateStr; });
            dailyData.push({
                date: dateStr,
                views: found ? found.views : 0,
                unique_users: found ? found.unique_users : 0,
                uniqueUsers: found ? [].fill(0, 0, found.unique_users || 0) : [],
                cartAdds: found ? found.cart_adds : 0,
                checkouts: found ? found.checkouts : 0,
                purchases: found ? found.purchases : 0,
                revenue: found ? found.revenue : 0
            });
        }

        // Top pages
        var topPages = Object.entries(pageStats)
            .map(function(entry) { return { page: entry[0], visits: entry[1].visits, avgTime: 0, bounces: 0 }; })
            .sort(function(a, b) { return b.visits - a.visits; })
            .slice(0, 10);

        // Top products
        var topProducts = Object.entries(productStats)
            .map(function(entry) { return { id: entry[0], name: entry[0], views: entry[1].views, cartAdds: entry[1].cartAdds }; })
            .sort(function(a, b) { return b.views - a.views; })
            .slice(0, 10);

        // Recent events
        var recentEvents = events.slice(0, 50).map(function(e) {
            return {
                category: e.event_type,
                action: e.action || '',
                label: e.label || '',
                page: e.page || '',
                timestamp: new Date(e.created_at).getTime()
            };
        });

        var conversionRate = pageViews > 0 ? (purchases / pageViews * 100).toFixed(2) : '0.00';
        var bounceRate = '0.0';

        return {
            summary: {
                totalSessions: totalSessions,
                totalPageViews: pageViews,
                avgSessionDuration: 0,
                bounceRate: bounceRate,
                conversionRate: conversionRate
            },
            funnel: {
                views: pageViews,
                productViews: productViews,
                cartAdds: cartAdds,
                checkoutStarts: checkouts,
                purchases: purchases
            },
            topPages: topPages,
            topProducts: topProducts,
            dailyData: dailyData,
            devices: devices,
            sources: sources,
            recentEvents: recentEvents,
            pageStats: pageStats
        };
    }

    function getEmptyReport() {
        return {
            summary: { totalSessions: 0, totalPageViews: 0, avgSessionDuration: 0, bounceRate: '0.0', conversionRate: '0.00' },
            funnel: { views: 0, productViews: 0, cartAdds: 0, checkoutStarts: 0, purchases: 0 },
            topPages: [], topProducts: [], dailyData: [],
            devices: { mobile: 0, desktop: 0, tablet: 0 },
            sources: {}, recentEvents: [], pageStats: {}
        };
    }

    function clearAnalytics() {
        // Clear Supabase tables
        fetch(SB + 'analytics_events', { method: 'DELETE', headers: HEADERS }).catch(function() {});
        fetch(SB + 'analytics_daily', { method: 'DELETE', headers: HEADERS }).catch(function() {});
        console.log('📊 Analytics cleared');
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    function setupListeners() {
        // Track clicks on buttons and links
        document.addEventListener('click', function(e) {
            lastActivity = Date.now();
            var target = e.target.closest('button, a');
            if (target) {
                var text = (target.textContent || '').trim().substring(0, 50);
                trackEvent('Click', target.tagName, text);
            }
        });

        // Track before unload
        window.addEventListener('beforeunload', function() {
            // Send session end event with navigator.sendBeacon for reliability
            var payload = JSON.stringify({
                event_type: 'session_end',
                session_id: sessionId,
                user_id: userId,
                page: currentPage,
                device: deviceInfo.type,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                referrer: document.referrer || 'direct'
            });
            
            if (navigator.sendBeacon) {
                var blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(SB + 'analytics_events?apikey=' + KEY, blob);
            }
        });
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init: init,
        trackPageView: trackPageView,
        trackEvent: trackEvent,
        trackProductView: trackProductView,
        trackAddToCart: trackAddToCart,
        trackRemoveFromCart: trackRemoveFromCart,
        trackCheckoutStart: trackCheckoutStart,
        trackPurchase: trackPurchase,
        trackSearch: trackSearch,
        getReport: getReport,
        clearAnalytics: clearAnalytics,
        getSession: function() { return { id: sessionId, userId: userId }; }
    };
})();

window.Analytics = Analytics;
