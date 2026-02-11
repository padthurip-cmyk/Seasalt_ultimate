/**
 * SeaSalt Pickles - Orders Fix v3
 * ================================
 * Fixed: No longer blocks orders page if Store.user is null
 * Fixed: Reads user from localStorage (spinwheel/checkout saves)
 * Fixed: Reads both order data formats (cart.js v9 and v10)
 */

(function() {
    'use strict';
    
    console.log('[OrdersFix] v3 Loading...');
    
    // ========================================
    // ORDERS STORAGE
    // ========================================
    
    function getOrders() {
        try {
            return JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        } catch (e) {
            return [];
        }
    }
    
    function formatOrderDate(dateStr) {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return dateStr || '';
        }
    }
    
    function formatPrice(amount) {
        return '\u20b9' + (amount || 0).toLocaleString('en-IN');
    }
    
    function getStatusConfig(status) {
        var configs = {
            pending:   { label: 'Order Placed', icon: '\uD83D\uDCDD', bg: '#FEF3C7', color: '#92400E' },
            confirmed: { label: 'Confirmed',    icon: '\u2705',       bg: '#DBEAFE', color: '#1E40AF' },
            preparing: { label: 'Preparing',    icon: '\uD83D\uDC68\u200D\uD83C\uDF73', bg: '#FFEDD5', color: '#C2410C' },
            shipped:   { label: 'Shipped',      icon: '\uD83D\uDE9A',  bg: '#E9D5FF', color: '#6B21A8' },
            delivered: { label: 'Delivered',    icon: '\uD83C\uDF89',  bg: '#D1FAE5', color: '#065F46' },
            cancelled: { label: 'Cancelled',    icon: '\u274C',        bg: '#FEE2E2', color: '#991B1B' }
        };
        return configs[status] || configs.pending;
    }
    
    // ========================================
    // ORDERS PAGE UI
    // ========================================
    
    function showOrdersPage() {
        console.log('[OrdersFix] showOrdersPage called');
        
        var orders = getOrders();
        
        // Remove any existing orders modal
        var existing = document.getElementById('orders-modal');
        if (existing) existing.remove();
        
        // Create modal
        var modal = document.createElement('div');
        modal.id = 'orders-modal';
        modal.className = 'fixed inset-0 z-[85] flex items-end justify-center';
        
        var ordersHtml = '';
        
        if (orders.length === 0) {
            ordersHtml = '<div class="text-center py-12">' +
                '<div class="text-6xl mb-4">\uD83D\uDCE6</div>' +
                '<h4 class="font-semibold text-gray-800 mb-2">No orders yet</h4>' +
                '<p class="text-gray-500 text-sm mb-6">Your order history will appear here after checkout</p>' +
                '<button class="close-modal px-8 py-3 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 transition-colors">' +
                '\uD83D\uDED2 Start Shopping</button></div>';
        } else {
            ordersHtml = '<div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">';
            for (var i = 0; i < orders.length; i++) {
                var order = orders[i];
                var statusConfig = getStatusConfig(order.status);
                var items = Array.isArray(order.items) ? order.items : [];
                var itemCount = 0;
                for (var j = 0; j < items.length; j++) itemCount += (items[j].quantity || 1);
                var orderId = order.id || order.orderId || 'N/A';
                
                ordersHtml += '<div class="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors" onclick="window.OrdersFix.showOrderDetail(\'' + orderId + '\')">' +
                    '<div class="flex justify-between items-start mb-3">' +
                    '<div><span class="font-bold text-gray-800">#' + orderId + '</span>' +
                    '<p class="text-xs text-gray-500 mt-1">' + formatOrderDate(order.createdAt) + '</p></div>' +
                    '<span class="px-3 py-1 text-xs font-semibold rounded-full" style="background:' + statusConfig.bg + ';color:' + statusConfig.color + '">' +
                    statusConfig.icon + ' ' + statusConfig.label + '</span></div>';
                
                // Item thumbnails
                if (items.length > 0) {
                    ordersHtml += '<div class="flex items-center gap-2 mb-3">';
                    var showItems = items.slice(0, 3);
                    for (var k = 0; k < showItems.length; k++) {
                        ordersHtml += '<div class="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">' +
                            '<img src="' + (showItems[k].image || 'https://via.placeholder.com/48?text=\uD83E\uDD52') + '" ' +
                            'class="w-full h-full object-cover" onerror="this.src=\'https://via.placeholder.com/48?text=\uD83E\uDD52\'"></div>';
                    }
                    if (items.length > 3) {
                        ordersHtml += '<span class="text-xs text-gray-500 ml-1">+' + (items.length - 3) + ' more</span>';
                    }
                    ordersHtml += '</div>';
                }
                
                ordersHtml += '<div class="flex justify-between items-center">' +
                    '<span class="text-sm text-gray-600">' + itemCount + ' item(s)</span>' +
                    '<span class="font-bold text-lg text-gray-800">' + formatPrice(order.total) + '</span></div>';
                
                // Payment method badge
                if (order.paymentMethod) {
                    ordersHtml += '<div class="mt-2 flex items-center gap-2">' +
                        '<span class="text-xs text-gray-400">Paid via ' + order.paymentMethod + '</span></div>';
                }
                
                ordersHtml += '</div>';
            }
            ordersHtml += '</div>';
        }
        
        modal.innerHTML = '<div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-modal"></div>' +
            '<div class="relative bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">' +
            '<div class="flex justify-between items-center mb-6">' +
            '<div><h3 class="font-bold text-xl text-gray-800">My Orders</h3>' +
            '<p class="text-sm text-gray-500">' + orders.length + ' order(s)</p></div>' +
            '<button class="close-modal w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>' +
            ordersHtml + '</div>';
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Close handlers
        modal.querySelectorAll('.close-modal').forEach(function(btn) {
            btn.addEventListener('click', function() { modal.remove(); document.body.style.overflow = ''; });
        });
    }
    
    // ========================================
    // ORDER DETAIL
    // ========================================
    
    function showOrderDetail(orderId) {
        var orders = getOrders();
        var order = null;
        for (var i = 0; i < orders.length; i++) {
            if (orders[i].id === orderId || orders[i].orderId === orderId) { order = orders[i]; break; }
        }
        if (!order) return;
        
        var statusConfig = getStatusConfig(order.status);
        var items = Array.isArray(order.items) ? order.items : [];
        
        // Close orders list modal
        var ordersModal = document.getElementById('orders-modal');
        if (ordersModal) ordersModal.remove();
        
        var modal = document.createElement('div');
        modal.id = 'order-detail-modal';
        modal.className = 'fixed inset-0 z-[90] flex items-end justify-center';
        
        // Items HTML
        var itemsHtml = '';
        if (items.length > 0) {
            itemsHtml = '<div class="space-y-3">';
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                itemsHtml += '<div class="flex gap-3 p-3 bg-gray-50 rounded-xl">' +
                    '<div class="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">' +
                    '<img src="' + (item.image || 'https://via.placeholder.com/64?text=\uD83E\uDD52') + '" class="w-full h-full object-cover" onerror="this.src=\'https://via.placeholder.com/64?text=\uD83E\uDD52\'"></div>' +
                    '<div class="flex-1"><h5 class="font-semibold text-gray-800">' + (item.name || 'Product') + '</h5>' +
                    '<p class="text-xs text-gray-500">' + (item.size || item.weight || '') + '</p>' +
                    '<div class="flex justify-between mt-2"><span class="text-sm text-gray-500">Qty: ' + (item.quantity || 1) + '</span>' +
                    '<span class="font-bold text-gray-800">' + formatPrice((item.price || 0) * (item.quantity || 1)) + '</span></div></div></div>';
            }
            itemsHtml += '</div>';
        } else {
            itemsHtml = '<p class="text-gray-500 text-sm text-center py-4">No item details available</p>';
        }
        
        // Address - handle both formats
        var addrHtml = '';
        var addr = order.address || order.customer;
        if (addr) {
            var addrName = addr.name || '';
            var addrPhone = addr.phone || '';
            var addrLine = addr.line1 || addr.address || '';
            var addrCity = addr.city || '';
            var addrPin = addr.pincode || '';
            
            addrHtml = '<div class="p-4 border-t border-gray-100">' +
                '<h4 class="font-bold text-gray-800 mb-2">\uD83D\uDCCD Delivery Address</h4>' +
                '<div class="bg-gray-50 rounded-xl p-3">' +
                '<p class="text-sm text-gray-700 font-medium">' + addrName + '</p>' +
                '<p class="text-sm text-gray-600 mt-1">' + addrLine + 
                (addrCity ? '<br>' + addrCity : '') +
                (addrPin ? ' - ' + addrPin : '') +
                (addrPhone ? '<br>\uD83D\uDCDE ' + addrPhone : '') +
                '</p></div></div>';
        }
        
        // Payment summary - handle both key formats
        var subtotal = order.subtotal || order.total || 0;
        var delivery = order.delivery || order.deliveryCharge || 0;
        var walletUsed = order.walletUsed || order.walletDiscount || 0;
        var total = order.total || 0;
        
        // Status timeline
        var timelineHtml = '';
        if (order.statusHistory && order.statusHistory.length > 0) {
            timelineHtml = '<div class="p-4 border-t border-gray-100">' +
                '<h4 class="font-bold text-gray-800 mb-3">\uD83D\uDCCB Order Timeline</h4>' +
                '<div class="space-y-3">';
            for (var t = 0; t < order.statusHistory.length; t++) {
                var h = order.statusHistory[t];
                var hStatus = getStatusConfig(h.status);
                timelineHtml += '<div class="flex items-start gap-3">' +
                    '<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style="background:' + hStatus.bg + '">' + hStatus.icon + '</div>' +
                    '<div><p class="font-semibold text-gray-800 text-sm">' + hStatus.label + '</p>' +
                    '<p class="text-xs text-gray-500">' + formatOrderDate(h.timestamp) + '</p>' +
                    (h.message ? '<p class="text-xs text-gray-600 mt-1">' + h.message + '</p>' : '') +
                    '</div></div>';
            }
            timelineHtml += '</div></div>';
        }
        
        modal.innerHTML = '<div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-detail"></div>' +
            '<div class="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto">' +
            '<div class="sticky top-0 bg-white p-4 border-b border-gray-100 flex justify-between items-center z-10">' +
            '<div><h3 class="font-bold text-gray-800">Order #' + (order.id || order.orderId) + '</h3>' +
            '<p class="text-xs text-gray-500">' + formatOrderDate(order.createdAt) + '</p></div>' +
            '<button class="close-detail w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>' +
            
            // Status
            '<div class="p-4 bg-gray-50"><div class="flex items-center gap-3"><span class="text-3xl">' + statusConfig.icon + '</span>' +
            '<span class="px-4 py-2 rounded-full text-sm font-bold" style="background:' + statusConfig.bg + ';color:' + statusConfig.color + '">' + statusConfig.label + '</span></div></div>' +
            
            // Items
            '<div class="p-4"><h4 class="font-bold text-gray-800 mb-3">\uD83D\uDCE6 Items (' + items.length + ')</h4>' + itemsHtml + '</div>' +
            
            // Address
            addrHtml +
            
            // Payment
            '<div class="p-4 border-t border-gray-100">' +
            '<h4 class="font-bold text-gray-800 mb-3">\uD83D\uDCB3 Payment Summary</h4>' +
            '<div class="bg-gray-50 rounded-xl p-4 space-y-2">' +
            '<div class="flex justify-between text-gray-600 text-sm"><span>Subtotal</span><span>' + formatPrice(subtotal) + '</span></div>' +
            (walletUsed > 0 ? '<div class="flex justify-between text-green-600 text-sm"><span>\uD83D\uDCB0 Wallet Used</span><span>-' + formatPrice(walletUsed) + '</span></div>' : '') +
            '<div class="flex justify-between text-gray-600 text-sm"><span>\uD83D\uDE9A Delivery</span><span>' + (delivery === 0 ? '<span class="text-green-600 font-medium">FREE</span>' : formatPrice(delivery)) + '</span></div>' +
            (order.paymentMethod ? '<div class="flex justify-between text-gray-400 text-xs"><span>Payment</span><span>' + order.paymentMethod + (order.paymentId ? ' (' + order.paymentId.substring(0, 12) + '...)' : '') + '</span></div>' : '') +
            '<div class="border-t border-gray-200 pt-3 mt-3 flex justify-between font-bold text-lg text-gray-800"><span>Total Paid</span><span>' + formatPrice(total) + '</span></div>' +
            '</div></div>' +
            
            // Timeline
            timelineHtml +
            
            // Actions
            '<div class="sticky bottom-0 p-4 border-t border-gray-100 bg-white">' +
            '<button onclick="window.OrdersFix.contactSupport(\'' + (order.id || order.orderId) + '\')" class="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">\uD83D\uDCAC Need Help?</button></div>' +
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
        getOrders: getOrders,
        showOrdersPage: showOrdersPage,
        showOrderDetail: showOrderDetail,
        contactSupport: contactSupport
    };
    
    // Also register as Orders for app.js compatibility
    window.Orders = { showOrdersPage: showOrdersPage };
    
    // Override function - neutralize old modules and patch navigation
    function overrideOldModules() {
        // Override old OrdersPage (orders.js) that tries #main-content
        if (typeof OrdersPage !== 'undefined') {
            OrdersPage.init = showOrdersPage;
            OrdersPage.render = showOrdersPage;
            if (OrdersPage.renderOrdersPage) OrdersPage.renderOrdersPage = showOrdersPage;
        }
        
        // Always re-register to beat any overwrites
        window.Orders = { showOrdersPage: showOrdersPage };
        window.OrdersFix = {
            getOrders: getOrders,
            showOrdersPage: showOrdersPage,
            showOrderDetail: showOrderDetail,
            contactSupport: contactSupport
        };
        
        // Patch App.navigateTo to intercept 'orders'
        if (typeof App !== 'undefined' && App.navigateTo) {
            // Don't re-patch if already patched by us
            if (!App._ordersFixPatched) {
                var _origNav = App.navigateTo;
                App.navigateTo = function(page) {
                    if (page === 'orders') {
                        console.log('[OrdersFix] v3 Intercepted orders navigation');
                        showOrdersPage();
                        if (typeof UI !== 'undefined' && UI.updateBottomNav) UI.updateBottomNav(page);
                        if (typeof Store !== 'undefined' && Store.setCurrentPage) Store.setCurrentPage(page);
                        return;
                    }
                    return _origNav.apply(this, arguments);
                };
                App._ordersFixPatched = true;
                console.log('[OrdersFix] v3 App.navigateTo patched');
            }
        }
    }
    
    // Run override at multiple times to beat race conditions
    overrideOldModules();
    setTimeout(overrideOldModules, 300);
    setTimeout(overrideOldModules, 800);
    setTimeout(overrideOldModules, 2000);
    
    // Also override on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            overrideOldModules();
            setTimeout(overrideOldModules, 500);
        });
    }
    
    console.log('[OrdersFix] v3 Ready');
    
})();
