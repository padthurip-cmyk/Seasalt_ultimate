/**
 * SeaSalt Pickles - Analytics v2.4 (Supabase-Backed)
 * ==================================================
 * v2.4 FIX: Reads phone from localStorage 'seasalt_phone' key
 * Firebase auth.currentUser is ALWAYS null because both firebase-auth.js
 * and spinwheel.js call auth.signOut() on page load / after OTP.
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

    function init() {
        sessionId = getSessionId();
        userId = getUserId();
        deviceInfo = getDeviceInfo();
        trackPageView('home');
        setupListeners();
        startLoginWatcher();
        console.log('📊 Analytics v2.4: Ready | session=' + sessionId + ' | user=' + userId);
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
        var phone = getLoggedInPhone();
        if (phone) { userId = phone; return phone; }
        var uid = localStorage.getItem('seasalt_user_id');
        if (!uid) {
            uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('seasalt_user_id', uid);
        }
        return uid;
    }

    // v2.4: Read phone from localStorage (the ONLY reliable source)
    function getLoggedInPhone() {
        // 1. Direct phone key — set by both spinwheel.js and firebase-auth.js
        var phone = localStorage.getItem('seasalt_phone');
        if (phone && phone.length >= 10) return phone;
        // 2. seasalt_user JSON object
        try {
            var u = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            if (u.phone && u.phone.length >= 10) return u.phone;
        } catch(e) {}
        // 3. Other keys
        var keys = ['seasalt_user_phone', 'seasalt_spin_phone'];
        for (var i = 0; i < keys.length; i++) {
            var val = localStorage.getItem(keys[i]);
            if (val && val.length >= 10) return val;
        }
        return null;
    }

    function startLoginWatcher() {
        setInterval(function() {
            var phone = getLoggedInPhone();
            if (phone && userId !== phone) {
                var oldId = userId;
                userId = phone;
                console.log('📊 User identified: ' + oldId + ' → ' + phone);
            }
        }, 3000);
    }

    function linkPhone(phone) {
        if (!phone) return;
        userId = phone;
        console.log('📊 Phone linked: ' + phone);
    }

    function getDeviceInfo() {
        var ua = navigator.userAgent;
        var device = /mobile/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop';
        var browser = /chrome/i.test(ua) && !/edge/i.test(ua) ? 'chrome' : /firefox/i.test(ua) ? 'firefox' : /safari/i.test(ua) && !/chrome/i.test(ua) ? 'safari' : /edge/i.test(ua) ? 'edge' : 'other';
        var os = /windows/i.test(ua) ? 'windows' : /mac/i.test(ua) ? 'macos' : /android/i.test(ua) ? 'android' : /iphone|ipad|ios/i.test(ua) ? 'ios' : /linux/i.test(ua) ? 'linux' : 'other';
        return { type: device, browser: browser, os: os };
    }

    function sendEvent(eventType, page, action, label, value) {
        // v2.4: Always re-check localStorage for phone at send time
        var phone = getLoggedInPhone();
        if (phone && userId !== phone) {
            console.log('📊 Phone update: ' + userId + ' → ' + phone);
            userId = phone;
        }

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

        try {
            fetch(SB + 'analytics_events', {
                method: 'POST', headers: HEADERS, body: JSON.stringify(payload)
            }).then(function(r) {
                if (!r.ok) r.text().then(function(t) { console.error('📊 Analytics INSERT failed:', r.status, t); });
            }).catch(function(err) { console.error('📊 Analytics network error:', err); });
        } catch(e) { console.error('📊 Analytics exception:', e); }

        updateDailyStats(eventType, value);
    }

    function updateDailyStats(eventType, value) {
        var today = new Date().toISOString().split('T')[0];
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
                if (!existing) data.unique_users = 1;
                fetch(SB + 'analytics_daily', {
                    method: 'POST',
                    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
                    body: JSON.stringify(data)
                }).catch(function(err) { console.error('📊 Daily upsert failed:', err); });
            }).catch(function(err) { console.error('📊 Daily fetch failed:', err); });
        } catch(e) { console.error('📊 Daily stats exception:', e); }
    }

    function trackPageView(pageName) {
        currentPage = pageName || 'home';
        pageStartTime = Date.now();
        sendEvent('page_view', currentPage);
        console.log('📊 Page view:', currentPage);
    }
    function trackEvent(category, action, label, value) { sendEvent('event', currentPage, category + ':' + action, label, value); }
    function trackProductView(product) { if (!product) return; sendEvent('product_view', currentPage, 'view', product.name || product.id, product.price || 0); }
    function trackAddToCart(product, quantity, variant) { if (!product) return; var price = (variant && variant.price) ? variant.price : (product.price || 0); sendEvent('add_to_cart', currentPage, 'add', product.name || product.id, price * (quantity || 1)); }
    function trackRemoveFromCart(product) { if (!product) return; sendEvent('remove_from_cart', currentPage, 'remove', product.name || product.id, 0); }
    function trackCheckoutStart(cart) { sendEvent('checkout_start', 'checkout', 'start', null, (cart && cart.total) ? cart.total : 0); }
    function trackPurchase(orderData) { sendEvent('purchase', 'checkout', 'complete', (orderData && orderData.id) ? orderData.id : '', (orderData && orderData.total) ? orderData.total : 0); }
    function trackSearch(query) { sendEvent('search', currentPage, 'query', query, 0); }

    function getReport() { return fetchReport().catch(function() { return getEmptyReport(); }); }
    function fetchReport() {
        var today = new Date(); var sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); var fromDate = sevenDaysAgo.toISOString();
        return Promise.all([
            fetch(SB + 'analytics_events?select=*&created_at=gte.' + fromDate + '&order=created_at.desc&limit=500', { headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY } }).then(function(r) { return r.json(); }).catch(function() { return []; }),
            fetch(SB + 'analytics_daily?select=*&order=date.desc&limit=30', { headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY } }).then(function(r) { return r.json(); }).catch(function() { return []; })
        ]).then(function(results) { return buildReport(results[0] || [], results[1] || []); });
    }
    function buildReport(events, dailyRows) {
        var sessions={},pageViews=0,productViews=0,cartAdds=0,checkouts=0,purchases=0,revenue=0,devices={mobile:0,desktop:0,tablet:0},sources={},productStats={},pageStats={};
        events.forEach(function(e){if(e.session_id&&!sessions[e.session_id]){sessions[e.session_id]={start:e.created_at,device:e.device,referrer:e.referrer};var dev=e.device||'desktop';devices[dev]=(devices[dev]||0)+1;var src=e.referrer||'direct';if(src!=='direct'){try{src=new URL(src).hostname}catch(x){src='other'}}else{src='Direct'}sources[src]=(sources[src]||0)+1}switch(e.event_type){case'page_view':pageViews++;var pg=e.page||'home';if(!pageStats[pg])pageStats[pg]={visits:0};pageStats[pg].visits++;break;case'product_view':productViews++;if(e.label){if(!productStats[e.label])productStats[e.label]={views:0,cartAdds:0};productStats[e.label].views++}break;case'add_to_cart':cartAdds++;if(e.label){if(!productStats[e.label])productStats[e.label]={views:0,cartAdds:0};productStats[e.label].cartAdds++}break;case'checkout_start':checkouts++;break;case'purchase':purchases++;revenue+=(e.value||0);break}});
        var totalSessions=Object.keys(sessions).length;
        var dailyData=[];for(var i=6;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);var dateStr=d.toISOString().split('T')[0];var found=dailyRows.find(function(r){return r.date===dateStr});dailyData.push({date:dateStr,views:found?found.views:0,unique_users:found?found.unique_users:0,uniqueUsers:[],cartAdds:found?found.cart_adds:0,checkouts:found?found.checkouts:0,purchases:found?found.purchases:0,revenue:found?found.revenue:0})}
        var topPages=Object.entries(pageStats).map(function(e){return{page:e[0],visits:e[1].visits,avgTime:0,bounces:0}}).sort(function(a,b){return b.visits-a.visits}).slice(0,10);
        var topProducts=Object.entries(productStats).map(function(e){return{id:e[0],name:e[0],views:e[1].views,cartAdds:e[1].cartAdds}}).sort(function(a,b){return b.views-a.views}).slice(0,10);
        var recentEvents=events.slice(0,50).map(function(e){return{category:e.event_type,action:e.action||'',label:e.label||'',page:e.page||'',timestamp:new Date(e.created_at).getTime()}});
        return{summary:{totalSessions:totalSessions,totalPageViews:pageViews,avgSessionDuration:0,bounceRate:'0.0',conversionRate:pageViews>0?(purchases/pageViews*100).toFixed(2):'0.00'},funnel:{views:pageViews,productViews:productViews,cartAdds:cartAdds,checkoutStarts:checkouts,purchases:purchases},topPages:topPages,topProducts:topProducts,dailyData:dailyData,devices:devices,sources:sources,recentEvents:recentEvents,pageStats:pageStats};
    }
    function getEmptyReport(){return{summary:{totalSessions:0,totalPageViews:0,avgSessionDuration:0,bounceRate:'0.0',conversionRate:'0.00'},funnel:{views:0,productViews:0,cartAdds:0,checkoutStarts:0,purchases:0},topPages:[],topProducts:[],dailyData:[],devices:{mobile:0,desktop:0,tablet:0},sources:{},recentEvents:[],pageStats:{}};}
    function clearAnalytics(){fetch(SB+'analytics_events',{method:'DELETE',headers:HEADERS}).catch(function(){});fetch(SB+'analytics_daily',{method:'DELETE',headers:HEADERS}).catch(function(){});console.log('📊 Analytics cleared');}

    function setupListeners() {
        document.addEventListener('click', function(e) { lastActivity = Date.now(); var target = e.target.closest('button, a'); if (target) { var text = (target.textContent || '').trim().substring(0, 50); trackEvent('Click', target.tagName, text); } });
        window.addEventListener('beforeunload', function() {
            var payload = JSON.stringify({ event_type: 'session_end', session_id: sessionId, user_id: userId, page: currentPage, device: deviceInfo.type, browser: deviceInfo.browser, os: deviceInfo.os, referrer: document.referrer || 'direct' });
            try { fetch(SB + 'analytics_events', { method: 'POST', headers: HEADERS, body: payload, keepalive: true }).catch(function(){}); } catch(e) { if (navigator.sendBeacon) { var blob = new Blob([payload], { type: 'application/json' }); navigator.sendBeacon(SB + 'analytics_events?apikey=' + KEY, blob); } }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    return {
        init: init, trackPageView: trackPageView, trackEvent: trackEvent,
        trackProductView: trackProductView, trackAddToCart: trackAddToCart,
        trackRemoveFromCart: trackRemoveFromCart, trackCheckoutStart: trackCheckoutStart,
        trackPurchase: trackPurchase, trackSearch: trackSearch,
        getReport: getReport, clearAnalytics: clearAnalytics,
        getSession: function() { return { id: sessionId, userId: userId }; },
        linkPhone: linkPhone
    };
})();
window.Analytics = Analytics;
