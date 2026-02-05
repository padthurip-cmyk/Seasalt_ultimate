/**
 * SeaSalt Pickles - API Module v3 (Supabase Live)
 * Minimal, bulletproof version.
 */

var API = (function() {

    var SB = 'https://yosjbsncvghpscsrvxds.supabase.co/rest/v1/';
    var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    var H = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };

    // Emoji lookup by category id
    var EM = { mango: '🥭', mixed: '🫙', nonveg: '🍗', specialty: '⭐', spicy: '🌶️', sweet: '🍯', veg: '🥒', combo: '🎁' };

    // Simple fetch wrapper
    function query(table) {
        return fetch(SB + table + '?select=*', { headers: H }).then(function(r) {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        });
    }

    // Parse variants safely from any format
    function parseV(raw) {
        if (!raw) return [{ weight: '250g', price: 199 }];
        var v;
        try {
            v = (typeof raw === 'string') ? JSON.parse(raw) : raw;
        } catch(e) {
            return [{ weight: '250g', price: 199 }];
        }
        if (!Array.isArray(v)) v = [v];
        if (v.length === 0) return [{ weight: '250g', price: 199 }];
        return v.map(function(x) { return { weight: String(x.weight || '250g'), price: Number(x.price) || 199 }; });
    }

    function getProducts() {
        return query('products').then(function(rows) {
            console.log('[API] Raw products from Supabase:', rows.length, rows);
            var products = [];
            for (var i = 0; i < rows.length; i++) {
                var p = rows[i];
                // Skip inactive
                if (p.is_active === false) continue;

                var variants = parseV(p.variants);
                products.push({
                    id: p.id || ('prod-' + i),
                    name: p.name || 'Product',
                    description: p.description || '',
                    category: p.category || 'mixed',
                    image: p.image || 'https://placehold.co/400x400/D4451A/fff?text=' + encodeURIComponent(p.name || 'Pickle'),
                    badge: p.badge || null,
                    isFeatured: (p.is_featured === true || p.is_featured === 'true'),
                    isActive: true,
                    variants: variants,
                    price: variants[0].price
                });
            }
            console.log('[API] Transformed products:', products.length);
            if (products.length > 0) return { data: products };
            return { data: null };
        }).catch(function(e) {
            console.error('[API] Products error:', e);
            return { data: null };
        });
    }

    function getCategories() {
        return query('categories').then(function(rows) {
            console.log('[API] Raw categories from Supabase:', rows);
            var cats = [];
            for (var i = 0; i < rows.length; i++) {
                var c = rows[i];
                if (c.is_active === false) continue;
                // Emoji: try db value, fallback to map, fallback to jar
                var emoji = (c.emoji && c.emoji !== '' && c.emoji !== 'null') ? c.emoji : (EM[c.id] || '🫙');
                cats.push({
                    id: c.id || ('cat-' + i),
                    name: c.name || 'Category',
                    emoji: emoji
                });
            }
            console.log('[API] Transformed categories:', cats);
            if (cats.length > 0) return { data: cats };
            return { data: null };
        }).catch(function(e) {
            console.error('[API] Categories error:', e);
            return { data: null };
        });
    }

    function getSiteConfig() {
        return query('settings').then(function(rows) {
            if (rows && rows.length > 0) {
                var s = rows[0];
                return { data: { siteName: s.store_name || 'SeaSalt Pickles', tagline: s.tagline || '', phone: s.phone || '', email: s.email || '', minOrderValue: s.min_order_value || 199, freeDeliveryAbove: s.free_delivery_above || 500, deliveryCharge: s.delivery_charge || 50 } };
            }
            return { data: null };
        }).catch(function() { return { data: null }; });
    }

    function createOrder(orderData) {
        // Save locally always
        var orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        orders.unshift(orderData);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));
        // Try Supabase
        fetch(SB + 'orders', {
            method: 'POST',
            headers: Object.assign({}, H, { 'Prefer': 'return=representation' }),
            body: JSON.stringify({
                id: orderData.id, customer_name: (orderData.address || {}).fullName || '',
                customer_phone: (orderData.address || {}).phone || '',
                customer_address: JSON.stringify(orderData.address || {}),
                items: JSON.stringify(orderData.items || []),
                subtotal: orderData.subtotal || 0, delivery_charge: orderData.delivery || 0,
                wallet_used: orderData.walletUsed || 0, total: orderData.total || 0,
                payment_method: orderData.paymentMethod || 'razorpay',
                payment_id: orderData.paymentId || '', status: 'confirmed'
            })
        }).catch(function() {});
        return Promise.resolve({ success: true, orderId: orderData.id });
    }

    function getOrders() {
        return query('orders').then(function(rows) {
            if (rows && rows.length > 0) return { data: rows };
            return { data: JSON.parse(localStorage.getItem('seasalt_orders') || '[]') };
        }).catch(function() {
            return { data: JSON.parse(localStorage.getItem('seasalt_orders') || '[]') };
        });
    }

    function clearCache() {}

    return {
        getProducts: getProducts,
        getCategories: getCategories,
        getSiteConfig: getSiteConfig,
        createOrder: createOrder,
        getOrders: getOrders,
        clearCache: clearCache
    };
})();

window.API = API;
