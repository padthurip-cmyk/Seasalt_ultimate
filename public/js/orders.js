/**
 * SeaSalt Pickles - Orders v4 (Live Supabase Sync)
 * ==================================================
 * Syncs orders from Supabase for live status updates & tracking numbers
 * Falls back to localStorage if Supabase unavailable
 */

(function() {
    'use strict';
    
    console.log('[Orders] v4 Loading...');
    
    var SU = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    var HDRS = { 'apikey': SK, 'Authorization': 'Bearer ' + SK };

    // ========================================
    // DATA LAYER - Merge localStorage + Supabase
    // ========================================
    
    function getLocalOrders() {
        try { return JSON.parse(localStorage.getItem('seasalt_orders') || '[]'); } catch(e) { return []; }
    }
    
    function getUserPhone() {
        return localStorage.getItem('seasalt_phone') || 
               localStorage.getItem('seasalt_user_phone') || 
               localStorage.getItem('seasalt_spin_phone') || 
               (function() { try { return JSON.parse(localStorage.getItem('seasalt_user') || '{}').phone || ''; } catch(e) { return ''; } })();
    }
    
    async function fetchSupabaseOrders() {
        var phone = getUserPhone();
        if (!phone) return [];
        
        // Normalize phone for query - try both formats
        var phones = [phone];
        if (phone.startsWith('+91')) phones.push(phone.replace('+91', ''));
        else phones.push('+91' + phone.replace(/^0+/, ''));
        
        var filter = 'customer_phone=in.(' + phones.map(function(p) { return '"' + p + '"'; }).join(',') + ')';
        
        try {
            var res = await fetch(SU + '/rest/v1/orders?' + filter + '&order=created_at.desc&limit=50', { headers: HDRS });
            if (res.ok) {
                var data = await res.json();
                console.log('[Orders] Supabase orders:', data.length);
                return data;
            }
        } catch(e) { console.warn('[Orders] Supabase fetch failed:', e); }
        return [];
    }
    
    async function getMergedOrders() {
        var local = getLocalOrders();
        var remote = await fetchSupabaseOrders();
        
        if (remote.length === 0) return local;
        
        // Merge: prefer Supabase for status/tracking, localStorage for items/address detail
        var merged = {};
        
        // Index local orders by ID
        for (var i = 0; i < local.length; i++) {
            var id = local[i].id || local[i].orderId;
            if (id) merged[id] = local[i];
        }
        
        // Overlay Supabase data (has latest status + tracking)
        for (var j = 0; j < remote.length; j++) {
            var r = remote[j];
            var rid = r.id || r.order_id;
            if (merged[rid]) {
                // Update status and tracking from Supabase (source of truth)
                merged[rid].status = r.status || merged[rid].status;
                merged[rid].tracking_number = r.tracking_number || merged[rid].tracking_number;
                merged[rid].tracking_url = r.tracking_url || merged[rid].tracking_url;
                merged[rid].updated_at = r.updated_at || merged[rid].updated_at;
            } else {
                // Order exists in Supabase but not local - reconstruct
                var items = r.items;
                if (typeof items === 'string') try { items = JSON.parse(items); } catch(e) { items = []; }
                merged[rid] = {
                    id: rid,
                    orderId: rid,
                    items: items || [],
                    customer: { name: r.customer_name, phone: r.customer_phone, address: r.customer_address, pincode: r.customer_pincode },
                    address: { name: r.customer_name, phone: r.customer_phone, line1: r.customer_address, pincode: r.customer_pincode },
                    subtotal: r.subtotal || r.total,
                    total: r.total,
                    deliveryCharge: r.delivery_charge || 0,
                    delivery: r.delivery_charge || 0,
                    walletUsed: r.wallet_used || 0,
                    walletDiscount: r.wallet_used || 0,
                    paymentMethod: r.payment_method,
                    paymentId: r.payment_id,
                    status: r.status || 'confirmed',
                    tracking_number: r.tracking_number,
                    tracking_url: r.tracking_url,
                    createdAt: r.created_at,
                    updated_at: r.updated_at
                };
            }
        }
        
        // Convert to sorted array (newest first)
        var result = Object.values(merged);
        result.sort(function(a, b) {
            return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
        });
        
        return result;
    }

    // ========================================
    // HELPERS
    // ========================================
    
    function getStatusConfig(status) {
        var map = {
            pending:    { icon: '\uD83D\uDCDD', label: 'Pending',     bg: '#FEF3C7', color: '#92400E' },
            confirmed:  { icon: '\u2705',       label: 'Confirmed',   bg: '#D1FAE5', color: '#065F46' },
            processing: { icon: '\uD83D\uDC68\u200D\uD83C\uDF73', label: 'Preparing', bg: '#DBEAFE', color: '#1E40AF' },
            preparing:  { icon: '\uD83D\uDC68\u200D\uD83C\uDF73', label: 'Preparing', bg: '#DBEAFE', color: '#1E40AF' },
            shipped:    { icon: '\uD83D\uDE9A', label: 'Shipped',     bg: '#E0E7FF', color: '#3730A3' },
            dispatched: { icon: '\uD83D\uDE9A', label: 'Dispatched',  bg: '#E0E7FF', color: '#3730A3' },
            delivered:  { icon: '\uD83C\uDF89', label: 'Delivered',   bg: '#D1FAE5', color: '#065F46' },
            cancelled:  { icon: '\u274C',       label: 'Cancelled',   bg: '#FEE2E2', color: '#991B1B' }
        };
        return map[status] || map.pending;
    }
    
    function formatOrderDate(dateStr) {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { return dateStr || ''; }
    }
    
    function formatPrice(p) {
        return '\u20b9' + (Math.round(Number(p) || 0).toLocaleString('en-IN'));
    }
    
    // ========================================
    // ORDERS LIST PAGE
    // ========================================
    
    async function showOrdersPage() {
        console.log('[Orders] v4 showOrdersPage called');
        
        // Remove any existing modal
        var existing = document.getElementById('orders-modal');
        if (existing) existing.remove();
        
        // Create modal with loading state
        var modal = document.createElement('div');
        modal.id = 'orders-modal';
        modal.className = 'fixed inset-0 z-[85] flex items-end justify-center';
        modal.innerHTML = '<div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-modal"></div>' +
            '<div class="relative bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">' +
            '<div class="flex justify-between items-center mb-6">' +
            '<h3 class="font-bold text-xl text-gray-800">My Orders</h3>' +
            '<button class="close-modal w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>' +
            '<div id="orders-content" class="flex items-center justify-center py-12"><div class="animate-spin w-8 h-8 border-3 border-pickle-500 border-t-transparent rounded-full"></div></div></div>';
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Close handlers
        modal.querySelectorAll('.close-modal').forEach(function(btn) {
            btn.addEventListener('click', function() { modal.remove(); document.body.style.overflow = ''; });
        });
        
        // Fetch merged orders (Supabase + localStorage)
        var orders = await getMergedOrders();
        var container = document.getElementById('orders-content');
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = '<div class="text-center py-8">' +
                '<div class="text-5xl mb-4">\uD83D\uDCE6</div>' +
                '<h4 class="font-semibold text-gray-800 mb-2">No orders yet</h4>' +
                '<p class="text-gray-500 text-sm">Your order history will appear here</p></div>';
            return;
        }
        
        var html = '<div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">';
        for (var i = 0; i < orders.length; i++) {
            var order = orders[i];
            var sc = getStatusConfig(order.status);
            var items = Array.isArray(order.items) ? order.items : [];
            var itemCount = 0;
            for (var j = 0; j < items.length; j++) itemCount += (items[j].quantity || 1);
            var oid = order.id || order.orderId || 'N/A';
            
            html += '<div class="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-all active:scale-[0.98]" onclick="window.OrdersFix.showOrderDetail(\'' + oid + '\')">' +
                '<div class="flex justify-between items-start mb-2">' +
                '<div><span class="font-bold text-gray-800 text-sm">#' + oid + '</span>' +
                '<p class="text-xs text-gray-500 mt-0.5">' + formatOrderDate(order.createdAt || order.created_at) + '</p></div>' +
                '<span class="px-2.5 py-1 text-xs font-semibold rounded-full" style="background:' + sc.bg + ';color:' + sc.color + '">' +
                sc.icon + ' ' + sc.label + '</span></div>';
            
            // Tracking badge
            if (order.tracking_number && (order.status === 'shipped' || order.status === 'dispatched')) {
                html += '<div class="flex items-center gap-2 mb-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">' +
                    '<span class="text-xs">\uD83D\uDCE6</span>' +
                    '<span class="text-xs font-medium text-indigo-700">Tracking: ' + order.tracking_number + '</span></div>';
            }
            
            // Item summary
            var itemNames = items.slice(0, 2).map(function(it) { return it.name; }).join(', ');
            if (items.length > 2) itemNames += ' +' + (items.length - 2) + ' more';
            if (itemNames) html += '<p class="text-xs text-gray-500 mb-2">' + itemNames + '</p>';
            
            html += '<div class="flex justify-between items-center">' +
                '<span class="text-xs text-gray-500">' + itemCount + ' item(s)</span>' +
                '<span class="font-bold text-gray-800">' + formatPrice(order.total) + '</span></div></div>';
        }
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    // ========================================
    // ORDER DETAIL
    // ========================================
    
    async function showOrderDetail(orderId) {
        var orders = await getMergedOrders();
        var order = null;
        for (var i = 0; i < orders.length; i++) {
            if (orders[i].id === orderId || orders[i].orderId === orderId) { order = orders[i]; break; }
        }
        if (!order) return;
        
        var sc = getStatusConfig(order.status);
        var items = Array.isArray(order.items) ? order.items : [];
        
        // Close list modal
        var lm = document.getElementById('orders-modal');
        if (lm) lm.remove();
        
        var modal = document.createElement('div');
        modal.id = 'order-detail-modal';
        modal.className = 'fixed inset-0 z-[90] flex items-end justify-center';
        
        // Items HTML
        var itemsHtml = '<div class="space-y-2">';
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            itemsHtml += '<div class="flex gap-3 p-3 bg-gray-50 rounded-xl">' +
                '<div class="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">' +
                '<img src="' + (it.image || 'https://via.placeholder.com/56?text=\uD83E\uDD52') + '" class="w-full h-full object-cover" onerror="this.src=\'https://via.placeholder.com/56?text=\uD83E\uDD52\'"></div>' +
                '<div class="flex-1"><h5 class="font-semibold text-gray-800 text-sm">' + (it.name || 'Product') + '</h5>' +
                '<p class="text-xs text-gray-500">' + (it.size || it.weight || '') + '</p>' +
                '<div class="flex justify-between mt-1"><span class="text-xs text-gray-500">Qty: ' + (it.quantity || 1) + '</span>' +
                '<span class="font-bold text-sm text-gray-800">' + formatPrice((it.price || 0) * (it.quantity || 1)) + '</span></div></div></div>';
        }
        itemsHtml += '</div>';
        
        // Address
        var addr = order.address || order.customer || {};
        var addrHtml = '<div class="p-4 border-t border-gray-100">' +
            '<h4 class="font-bold text-gray-800 mb-2 text-sm">\uD83D\uDCCD Delivery Address</h4>' +
            '<div class="bg-gray-50 rounded-xl p-3 text-sm">' +
            '<p class="font-medium text-gray-700">' + (addr.name || '') + '</p>' +
            '<p class="text-gray-600 mt-1">' + (addr.line1 || addr.address || '') + 
            (addr.pincode ? ' - ' + addr.pincode : '') +
            (addr.phone ? ' \uD83D\uDCDE ' + addr.phone : '') + '</p></div></div>';
        
        // Payment
        var subtotal = order.subtotal || order.total || 0;
        var delivery = order.delivery || order.deliveryCharge || order.delivery_charge || 0;
        var wallet = order.walletUsed || order.walletDiscount || order.wallet_used || 0;
        var total = order.total || 0;
        
        var payHtml = '<div class="p-4 border-t border-gray-100">' +
            '<h4 class="font-bold text-gray-800 mb-2 text-sm">\uD83D\uDCB3 Payment Summary</h4>' +
            '<div class="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">' +
            '<div class="flex justify-between text-gray-600"><span>Subtotal</span><span>' + formatPrice(subtotal) + '</span></div>' +
            (wallet > 0 ? '<div class="flex justify-between text-green-600"><span>\uD83D\uDCB0 Wallet Used</span><span>-' + formatPrice(wallet) + '</span></div>' : '') +
            '<div class="flex justify-between text-gray-600"><span>\uD83D\uDE9A Delivery</span><span>' + (delivery === 0 ? '<span class="text-green-600">FREE</span>' : formatPrice(delivery)) + '</span></div>' +
            (order.paymentMethod ? '<div class="flex justify-between text-gray-400 text-xs"><span>Payment</span><span>' + order.paymentMethod + (order.paymentId ? ' (' + order.paymentId.substring(0, 12) + '...)' : '') + '</span></div>' : '') +
            '<div class="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800"><span>Total Paid</span><span>' + formatPrice(total) + '</span></div></div></div>';
        
        // Tracking section
        var trackHtml = '';
        if (order.tracking_number) {
            var trackUrl = order.tracking_url || 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
            trackHtml = '<div class="p-4 border-t border-gray-100">' +
                '<h4 class="font-bold text-gray-800 mb-2 text-sm">\uD83D\uDCE6 Shipment Tracking</h4>' +
                '<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">' +
                '<div class="flex items-center justify-between">' +
                '<div><p class="text-xs text-indigo-500 font-medium">Tracking Number</p>' +
                '<p class="font-bold text-indigo-900 text-lg mt-1">' + order.tracking_number + '</p></div>' +
                '<a href="' + trackUrl + '" target="_blank" rel="noopener" class="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">' +
                'Track \u2197</a></div></div></div>';
        }
        
        // Status timeline
        var timelineHtml = '<div class="p-4 border-t border-gray-100">' +
            '<h4 class="font-bold text-gray-800 mb-3 text-sm">\uD83D\uDCCB Order Timeline</h4>' +
            '<div class="space-y-3">';
        
        // Build timeline from statusHistory or from status
        var history = order.statusHistory || [];
        if (history.length === 0) {
            // Create synthetic timeline from current status
            var statusFlow = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
            var currentIdx = statusFlow.indexOf(order.status);
            if (currentIdx === -1) currentIdx = statusFlow.indexOf('confirmed');
            
            for (var s = 0; s <= Math.min(currentIdx, statusFlow.length - 1); s++) {
                var st = statusFlow[s];
                var stc = getStatusConfig(st);
                var ts = s === 0 ? (order.createdAt || order.created_at) : (order.updated_at || order.createdAt);
                history.push({ status: st, timestamp: ts, message: stc.label });
            }
        }
        
        for (var t = 0; t < history.length; t++) {
            var h = history[t];
            var hsc = getStatusConfig(h.status);
            timelineHtml += '<div class="flex items-start gap-3">' +
                '<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style="background:' + hsc.bg + '">' + hsc.icon + '</div>' +
                '<div><p class="font-semibold text-gray-800 text-sm">' + hsc.label + '</p>' +
                '<p class="text-xs text-gray-500">' + formatOrderDate(h.timestamp) + '</p>' +
                (h.message ? '<p class="text-xs text-gray-600 mt-0.5">' + h.message + '</p>' : '') +
                '</div></div>';
        }
        timelineHtml += '</div></div>';
        
        modal.innerHTML = '<div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-detail"></div>' +
            '<div class="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto">' +
            
            // Header
            '<div class="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10 rounded-t-3xl">' +
            '<div><h3 class="font-bold text-gray-800">Order #' + (order.id || order.orderId) + '</h3>' +
            '<p class="text-xs text-gray-500">' + formatOrderDate(order.createdAt || order.created_at) + '</p></div>' +
            '<button class="close-detail w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>' +
            
            // Status badge
            '<div class="p-4 bg-gray-50"><div class="flex items-center gap-3"><span class="text-2xl">' + sc.icon + '</span>' +
            '<span class="px-4 py-2 rounded-full text-sm font-bold" style="background:' + sc.bg + ';color:' + sc.color + '">' + sc.label + '</span></div></div>' +
            
            // Tracking
            trackHtml +
            
            // Items
            '<div class="p-4"><h4 class="font-bold text-gray-800 mb-2 text-sm">\uD83D\uDCE6 Items (' + items.length + ')</h4>' + itemsHtml + '</div>' +
            
            // Address
            addrHtml +
            
            // Payment
            payHtml +
            
            // Timeline
            timelineHtml +
            
            // Help button
            '<div class="sticky bottom-0 p-4 border-t bg-white">' +
            '<button onclick="window.OrdersFix.contactSupport(\'' + (order.id || order.orderId) + '\')" class="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm">\uD83D\uDCAC Need Help?</button></div>' +
            '</div>';
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        modal.querySelectorAll('.close-detail').forEach(function(btn) {
            btn.addEventListener('click', function() { modal.remove(); document.body.style.overflow = ''; });
        });
    }
    
    function contactSupport(orderId) {
        window.open('https://wa.me/919963971447?text=' + encodeURIComponent('Hi! I need help with order #' + orderId), '_blank');
    }
    
    // ========================================
    // INIT & EXPORT
    // ========================================
    
    window.OrdersFix = {
        getOrders: getLocalOrders,
        showOrdersPage: showOrdersPage,
        showOrderDetail: showOrderDetail,
        contactSupport: contactSupport
    };
    window.Orders = { showOrdersPage: showOrdersPage };
    
    function overrideOldModules() {
        if (typeof OrdersPage !== 'undefined') {
            OrdersPage.init = showOrdersPage;
            OrdersPage.render = showOrdersPage;
        }
        window.Orders = { showOrdersPage: showOrdersPage };
        window.OrdersFix = { getOrders: getLocalOrders, showOrdersPage: showOrdersPage, showOrderDetail: showOrderDetail, contactSupport: contactSupport };
        
        if (typeof App !== 'undefined' && App.navigateTo && !App._ordersFixPatched) {
            var _origNav = App.navigateTo;
            App.navigateTo = function(page) {
                if (page === 'orders') {
                    showOrdersPage();
                    if (typeof UI !== 'undefined' && UI.updateBottomNav) UI.updateBottomNav(page);
                    if (typeof Store !== 'undefined' && Store.setCurrentPage) Store.setCurrentPage(page);
                    return;
                }
                return _origNav.apply(this, arguments);
            };
            App._ordersFixPatched = true;
        }
    }
    
    overrideOldModules();
    setTimeout(overrideOldModules, 300);
    setTimeout(overrideOldModules, 800);
    setTimeout(overrideOldModules, 2000);
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { overrideOldModules(); setTimeout(overrideOldModules, 500); });
    }
    
    console.log('[Orders] v4 Ready');
})();
