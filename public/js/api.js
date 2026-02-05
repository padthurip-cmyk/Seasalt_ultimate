/**
 * SeaSalt Pickles - API Module (Supabase Connected)
 * ===================================================
 * Fetches products, categories, orders from Supabase.
 * Admin changes reflect LIVE on the store instantly.
 * 
 * DEBUG: Open browser console to see all Supabase logs.
 */

var API = (function() {

    // ============================================
    // SUPABASE CONFIG
    // ============================================
    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';

    var HEADERS = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
    };

    // ============================================
    // EMOJI FALLBACK MAP
    // ============================================
    var EMOJI_MAP = {
        'mango': '🥭',
        'mixed': '🫙',
        'nonveg': '🍗',
        'specialty': '⭐',
        'spicy': '🌶️',
        'sweet': '🍯',
        'veg': '🥒',
        'combo': '🎁'
    };

    // ============================================
    // CORE FETCH HELPER
    // ============================================

    function supabaseQuery(table, params) {
        var url = SUPABASE_URL + '/rest/v1/' + table;
        if (params) url += '?' + params;

        console.log('[API] Fetching:', url);

        return fetch(url, { headers: HEADERS })
            .then(function(response) {
                console.log('[API] Response status:', response.status, 'for', table);
                if (!response.ok) {
                    throw new Error('Supabase Error: ' + response.status + ' ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                console.log('[API] Got ' + (data ? data.length : 0) + ' rows from ' + table, data);
                return data;
            });
    }

    // ============================================
    // DATA TRANSFORMATION
    // ============================================

    function parseVariants(raw) {
        var variants = [];

        if (!raw) {
            return [{ weight: '250g', price: 199 }];
        }

        try {
            if (typeof raw === 'string') {
                variants = JSON.parse(raw);
            } else if (Array.isArray(raw)) {
                variants = raw;
            } else if (typeof raw === 'object') {
                // Single object
                variants = [raw];
            }
        } catch (e) {
            console.warn('[API] Variant parse error:', e, 'raw:', raw);
            return [{ weight: '250g', price: 199 }];
        }

        if (!Array.isArray(variants) || variants.length === 0) {
            return [{ weight: '250g', price: 199 }];
        }

        // Ensure each variant has proper types
        return variants.map(function(v) {
            return {
                weight: String(v.weight || v.size || '250g'),
                price: Number(v.price) || 199
            };
        });
    }

    function transformProduct(p) {
        var variants = parseVariants(p.variants);

        var product = {
            id: String(p.id || ''),
            name: String(p.name || 'Unnamed Product'),
            description: String(p.description || ''),
            category: String(p.category || 'mixed'),
            image: String(p.image || 'https://placehold.co/400x400/D4451A/fff?text=SeaSalt'),
            badge: p.badge || null,
            isFeatured: Boolean(p.is_featured),
            isActive: Boolean(p.is_active),
            variants: variants,
            price: variants[0].price,
            createdAt: p.created_at || new Date().toISOString()
        };

        return product;
    }

    function transformCategory(c) {
        // Robust emoji handling - Supabase may return null, empty, or encoded emoji
        var emoji = '';
        if (c.emoji && c.emoji !== 'null' && c.emoji !== 'undefined' && String(c.emoji).trim() !== '') {
            emoji = String(c.emoji).trim();
        } else {
            emoji = EMOJI_MAP[c.id] || EMOJI_MAP[String(c.id).toLowerCase()] || '🫙';
        }

        return {
            id: String(c.id || ''),
            name: String(c.name || 'Category'),
            emoji: emoji,
            sortOrder: Number(c.sort_order) || 0,
            isActive: c.is_active !== false
        };
    }

    // ============================================
    // PUBLIC API METHODS
    // ============================================

    function getProducts() {
        console.log('[API] getProducts() called');

        return supabaseQuery('products', 'select=*&is_active=eq.true&order=created_at.asc')
            .then(function(raw) {
                if (!raw || !Array.isArray(raw) || raw.length === 0) {
                    console.warn('[API] No products from Supabase');
                    return { data: null };
                }

                var products = [];
                for (var i = 0; i < raw.length; i++) {
                    try {
                        var transformed = transformProduct(raw[i]);
                        products.push(transformed);
                        console.log('[API] Product OK:', transformed.name, '| Variants:', transformed.variants.length, '| Featured:', transformed.isFeatured);
                    } catch (e) {
                        console.error('[API] Failed to transform product:', raw[i], e);
                    }
                }

                console.log('[API] ✅ Total products loaded:', products.length);
                return { data: products };
            })
            .catch(function(error) {
                console.error('[API] ❌ Products fetch failed:', error);
                return { data: null };
            });
    }

    function getCategories() {
        console.log('[API] getCategories() called');

        return supabaseQuery('categories', 'select=*&is_active=eq.true&order=sort_order.asc')
            .then(function(raw) {
                if (!raw || !Array.isArray(raw) || raw.length === 0) {
                    console.warn('[API] No categories from Supabase');
                    return { data: null };
                }

                var categories = [];
                for (var i = 0; i < raw.length; i++) {
                    try {
                        var transformed = transformCategory(raw[i]);
                        categories.push(transformed);
                        console.log('[API] Category OK:', transformed.name, '| emoji:', transformed.emoji);
                    } catch (e) {
                        console.error('[API] Failed to transform category:', raw[i], e);
                    }
                }

                console.log('[API] ✅ Total categories loaded:', categories.length);
                return { data: categories };
            })
            .catch(function(error) {
                console.error('[API] ❌ Categories fetch failed:', error);
                return { data: null };
            });
    }

    function getSiteConfig() {
        return supabaseQuery('settings', 'select=*&limit=1')
            .then(function(raw) {
                if (raw && raw.length > 0) {
                    var s = raw[0];
                    return {
                        data: {
                            siteName: s.store_name || 'SeaSalt Pickles',
                            tagline: s.tagline || 'Authentic Andhra Pickles',
                            phone: s.phone || '+91-9963971447',
                            email: s.email || 'support@seasaltpickles.com',
                            minOrderValue: s.min_order_value || 199,
                            freeDeliveryAbove: s.free_delivery_above || 500,
                            deliveryCharge: s.delivery_charge || 50
                        }
                    };
                }
                return { data: null };
            })
            .catch(function() {
                return { data: null };
            });
    }

    function createOrder(orderData) {
        // Always save locally first (guaranteed to work)
        var orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        orders.unshift(orderData);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));

        // Then try Supabase (fire and forget)
        try {
            var supabaseOrder = {
                id: orderData.id,
                customer_name: (orderData.address && orderData.address.fullName) || '',
                customer_phone: (orderData.address && orderData.address.phone) || '',
                customer_address: JSON.stringify(orderData.address || {}),
                items: JSON.stringify(orderData.items || []),
                subtotal: orderData.subtotal || 0,
                delivery_charge: orderData.delivery || 0,
                wallet_used: orderData.walletUsed || 0,
                total: orderData.total || 0,
                payment_method: orderData.paymentMethod || 'razorpay',
                payment_id: orderData.paymentId || '',
                status: 'confirmed',
                created_at: new Date().toISOString()
            };

            fetch(SUPABASE_URL + '/rest/v1/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(supabaseOrder)
            }).then(function(res) {
                if (res.ok) console.log('[API] ✅ Order saved to Supabase:', orderData.id);
                else console.warn('[API] Order save failed:', res.status);
            }).catch(function(err) {
                console.warn('[API] Order save error:', err);
            });
        } catch (e) {
            console.warn('[API] Order Supabase error:', e);
        }

        return Promise.resolve({ success: true, orderId: orderData.id });
    }

    function getOrders(userId) {
        return supabaseQuery('orders', 'select=*&order=created_at.desc')
            .then(function(raw) {
                if (raw && raw.length > 0) return { data: raw };
                // Fallback
                var orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
                return { data: orders };
            })
            .catch(function() {
                var orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
                return { data: orders };
            });
    }

    function clearCache() {
        console.log('[API] 🔄 Cache cleared');
    }

    return {
        getProducts: getProducts,
        getCategories: getCategories,
        getSiteConfig: getSiteConfig,
        createOrder: createOrder,
        getOrders: getOrders,
        clearCache: clearCache,
        // Debug helpers
        _supabaseQuery: supabaseQuery,
        _SUPABASE_URL: SUPABASE_URL
    };
})();

window.API = API;
