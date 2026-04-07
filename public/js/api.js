/**
 * SeaSalt Pickles - API Module v5 (Supabase Live — Full Sync)
 * =============================================================
 * Fetches categories FIRST, builds a name-to-id lookup, then loads
 * products and normalizes each product's category to the category
 * table's id. This ensures category pills always match products
 * regardless of how the admin saved the category field.
 */

var API = (function() {

    var SB = 'https://yosjbsncvghpscsrvxds.supabase.co/rest/v1/';
    var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    var H = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };

    var EM = { mango: '🥭', mixed: '🫙', nonveg: '🍗', specialty: '⭐', spicy: '🌶️', sweet: '🍯', veg: '🥒', combo: '🎁', masala: '🌶️', sweets: '🍬' };

    // Category lookup cache
    var catNameToId = {};
    var catIdToName = {};

    function query(table) {
        return fetch(SB + table + '?select=*', { headers: H }).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function parseVariants(raw) {
        if (!raw) return [{ weight: '250g', price: 199 }];
        var v;
        try { v = (typeof raw === 'string') ? JSON.parse(raw) : raw; } catch(e) { return [{ weight: '250g', price: 199 }]; }
        if (!Array.isArray(v)) v = [v];
        if (v.length === 0) return [{ weight: '250g', price: 199 }];
        return v.map(function(x) {
            return { weight: String(x.weight || x.size || '250g'), price: Number(x.price) || 199 };
        });
    }

    function resolveImage(img) {
        if (!img) return null;
        if (img.startsWith('http')) return img;
        if (img.startsWith('data:')) return img;
        if (img.indexOf('~mv2') >= 0 || img.startsWith('163af4_') || img.startsWith('53b0e3_')) {
            return 'https://static.wixstatic.com/media/' + img + '/v1/fill/w_400,h_400,al_c,q_85/image.jpg';
        }
        if (img.startsWith('/')) return img;
        return null;
    }

    // Match product category string to category table id
    function matchCategory(productCat) {
        if (!productCat) return 'mixed';
        var val = productCat.trim();
        var valLower = val.toLowerCase();

        // Exact id match
        if (catIdToName[val]) return val;
        // Exact name match
        if (catNameToId[val]) return catNameToId[val];

        // Case-insensitive on name
        for (var key in catNameToId) {
            if (key.toLowerCase() === valLower) return catNameToId[key];
        }
        // Case-insensitive on id
        for (var key in catIdToName) {
            if (key.toLowerCase() === valLower) return key;
        }

        // Contains match on name
        for (var key in catNameToId) {
            var kl = key.toLowerCase();
            if (kl.indexOf(valLower) >= 0 || valLower.indexOf(kl) >= 0) return catNameToId[key];
        }
        // Contains match on id
        for (var key in catIdToName) {
            var kl = key.toLowerCase();
            if (kl.indexOf(valLower) >= 0 || valLower.indexOf(kl) >= 0) return key;
        }

        return val;
    }

    function getCategories() {
        return query('categories').then(function(rows) {
            console.log('[API] Raw categories:', rows.length);
            var cats = [];
            catNameToId = {};
            catIdToName = {};

            for (var i = 0; i < rows.length; i++) {
                var c = rows[i];
                if (c.is_active === false || c.is_active === 'false') continue;
                var id = c.id || ('cat-' + i);
                var name = c.name || 'Category';
                var emoji = (c.emoji && c.emoji !== '' && c.emoji !== 'null' && c.emoji !== 'undefined') ? c.emoji : (EM[id] || '🫙');

                catNameToId[name] = id;
                catIdToName[id] = name;

                cats.push({ id: id, name: name, emoji: emoji, icon: emoji });
            }
            console.log('[API] Category map:', JSON.stringify(catNameToId));
            if (cats.length > 0) return { data: cats };
            return { data: null };
        }).catch(function(e) {
            console.error('[API] Categories error:', e);
            return { data: null };
        });
    }

    function getProducts() {
        // Load categories first so the name-to-id map exists
        var catPromise = (Object.keys(catNameToId).length > 0) ? Promise.resolve() : getCategories();

        return catPromise.then(function() {
            return query('products');
        }).then(function(rows) {
            console.log('[API] Raw products:', rows.length);
            var products = [];
            for (var i = 0; i < rows.length; i++) {
                var p = rows[i];
                if (p.is_active === false || p.is_active === 'false') continue;

                var variants = parseVariants(p.variants);
                var rawImg = p.image || (p.images && p.images.length ? p.images[0] : null);
                var resolvedImg = resolveImage(rawImg) || 'https://placehold.co/400x400/D4451A/fff?text=' + encodeURIComponent(p.name || 'Pickle');
                var resolvedImages = [];
                if (p.images && Array.isArray(p.images)) {
                    for (var j = 0; j < p.images.length; j++) {
                        var ri = resolveImage(p.images[j]);
                        if (ri) resolvedImages.push(ri);
                    }
                }
                if (!resolvedImages.length) resolvedImages = [resolvedImg];

                var normalizedCat = matchCategory(p.category);

                products.push({
                    id: p.id || ('prod-' + i),
                    name: p.name || 'Product',
                    description: p.description || '',
                    category: normalizedCat,
                    categoryRaw: p.category || '',
                    image: resolvedImg,
                    images: resolvedImages,
                    badge: p.badge || null,
                    ribbon: p.badge || null,
                    isFeatured: p.is_featured !== false,
                    isActive: true,
                    is_featured: p.is_featured !== false,
                    is_active: true,
                    variants: variants,
                    price: variants[0].price,
                    primaryCategory: normalizedCat
                });
            }
            console.log('[API] Products loaded:', products.length, '| Sample:', products.slice(0,3).map(function(p){return p.categoryRaw+' -> '+p.category}));
            if (products.length > 0) return { data: products };
            return { data: null };
        }).catch(function(e) {
            console.error('[API] Products error:', e);
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
        try {
            var orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
            orders.unshift(orderData);
            localStorage.setItem('seasalt_orders', JSON.stringify(orders));
        } catch(e) {}
        try {
            fetch(SB + 'orders', {
                method: 'POST', headers: H,
                body: JSON.stringify({
                    id: orderData.id,
                    customer_name: (orderData.address || {}).fullName || '',
                    customer_phone: (orderData.address || {}).phone || '',
                    customer_address: JSON.stringify(orderData.address || {}),
                    items: JSON.stringify(orderData.items || []),
                    subtotal: orderData.subtotal || 0,
                    delivery_charge: orderData.delivery || 0,
                    wallet_used: orderData.walletUsed || 0,
                    total: orderData.total || 0,
                    payment_method: orderData.paymentMethod || 'razorpay',
                    payment_id: orderData.paymentId || '',
                    status: 'confirmed'
                })
            }).catch(function() {});
        } catch(e) {}
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

    function clearCache() { catNameToId = {}; catIdToName = {}; }

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
