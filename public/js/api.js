/**
 * SeaSalt Pickles - API Module (Supabase Connected)
 * ===================================================
 * Fetches products, categories, orders from Supabase.
 * Admin changes reflect LIVE on the store instantly.
 */

const API = (function() {
    'use strict';

    // ============================================
    // SUPABASE CONFIG
    // ============================================
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';

    const HEADERS = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
    };

    // Cache for performance
    let cache = {
        products: null,
        categories: null,
        config: null,
        timestamp: 0
    };
    const CACHE_TTL = 60000; // 1 minute cache

    // ============================================
    // CORE FETCH HELPER
    // ============================================

    async function supabaseQuery(table, params) {
        const url = SUPABASE_URL + '/rest/v1/' + table + (params ? '?' + params : '');
        try {
            const response = await fetch(url, { headers: HEADERS });
            if (!response.ok) {
                console.error('Supabase error [' + table + ']:', response.status, response.statusText);
                throw new Error('Supabase Error: ' + response.status);
            }
            return await response.json();
        } catch (error) {
            console.error('API Error [' + table + ']:', error);
            throw error;
        }
    }

    // ============================================
    // DATA TRANSFORMATION
    // ============================================

    // Supabase uses snake_case, Store uses camelCase
    function transformProduct(p) {
        var variants = [];
        try {
            if (typeof p.variants === 'string') {
                variants = JSON.parse(p.variants);
            } else if (Array.isArray(p.variants)) {
                variants = p.variants;
            }
        } catch (e) {
            console.warn('Failed to parse variants for', p.id, e);
            variants = [{ weight: '250g', price: 199 }];
        }

        return {
            id: p.id,
            name: p.name,
            description: p.description || '',
            category: p.category,
            image: p.image || 'https://placehold.co/400x400/D4451A/fff?text=SeaSalt',
            badge: p.badge || null,
            isFeatured: p.is_featured === true,
            isActive: p.is_active === true,
            variants: variants,
            createdAt: p.created_at
        };
    }

    function transformCategory(c) {
        return {
            id: c.id,
            name: c.name,
            emoji: c.emoji || '🫙',
            sortOrder: c.sort_order || 0,
            isActive: c.is_active !== false
        };
    }

    // ============================================
    // PUBLIC API METHODS
    // ============================================

    async function getProducts() {
        // Check cache
        if (cache.products && (Date.now() - cache.timestamp) < CACHE_TTL) {
            return { data: cache.products };
        }

        try {
            var raw = await supabaseQuery('products', 'select=*&is_active=eq.true&order=created_at.asc');
            var products = raw.map(transformProduct);

            // Update cache
            cache.products = products;
            cache.timestamp = Date.now();

            console.log('✅ Loaded ' + products.length + ' products from Supabase');
            return { data: products };
        } catch (error) {
            console.warn('⚠️ Supabase fetch failed, using fallback data');
            return { data: null }; // Will trigger seed data fallback
        }
    }

    async function getCategories() {
        // Check cache
        if (cache.categories && (Date.now() - cache.timestamp) < CACHE_TTL) {
            return { data: cache.categories };
        }

        try {
            var raw = await supabaseQuery('categories', 'select=*&is_active=eq.true&order=sort_order.asc');
            var categories = raw.map(transformCategory);

            cache.categories = categories;

            console.log('✅ Loaded ' + categories.length + ' categories from Supabase');
            return { data: categories };
        } catch (error) {
            console.warn('⚠️ Categories fetch failed');
            return { data: null };
        }
    }

    async function getSiteConfig() {
        try {
            var raw = await supabaseQuery('settings', 'select=*&limit=1');
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
        } catch (error) {
            return { data: null };
        }
    }

    async function createOrder(orderData) {
        try {
            // Save to Supabase
            var supabaseOrder = {
                id: orderData.id,
                customer_name: orderData.address ? orderData.address.fullName || '' : '',
                customer_phone: orderData.address ? orderData.address.phone || '' : '',
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

            var response = await fetch(SUPABASE_URL + '/rest/v1/orders', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Prefer': 'return=representation' }),
                body: JSON.stringify(supabaseOrder)
            });

            if (response.ok) {
                console.log('✅ Order saved to Supabase:', orderData.id);
            }
        } catch (error) {
            console.error('Order save to Supabase error:', error);
        }

        // Also save locally for backward compatibility
        var orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        orders.unshift(orderData);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));

        return { success: true, orderId: orderData.id };
    }

    async function getOrders(userId) {
        // Try Supabase first
        try {
            var raw = await supabaseQuery('orders', 'select=*&order=created_at.desc');
            if (raw && raw.length > 0) {
                return { data: raw };
            }
        } catch (e) {
            // Fallback below
        }

        // Fallback to localStorage
        var orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        return { data: orders };
    }

    // Force refresh (clear cache)
    function clearCache() {
        cache = { products: null, categories: null, config: null, timestamp: 0 };
        console.log('🔄 API cache cleared');
    }

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
