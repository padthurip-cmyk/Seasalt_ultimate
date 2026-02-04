/**
 * SeaSalt Pickles - Orders Fix v2
 * ================================
 * This file OVERRIDES the "Orders coming soon" with a real Orders page
 * 
 * IMPORTANT: Add this AFTER app.js in your index.html:
 * <script src="/js/app.js"></script>
 * <script src="/js/orders-fix.js"></script>
 */

(function() {
    'use strict';
    
    console.log('📦 Orders Fix v2: Loading...');
    
    // ========================================
    // SAFE CART HELPER
    // ========================================
    
    function getCartItems() {
        try {
            // Try Store.getCart() first
            if (typeof Store !== 'undefined' && Store.getCart) {
                const cart = Store.getCart();
                // Check if it's an array
                if (Array.isArray(cart)) {
                    return cart;
                }
                // If it's an object with items property
                if (cart && cart.items && Array.isArray(cart.items)) {
                    return cart.items;
                }
                // If it's an object, try to convert values to array
                if (cart && typeof cart === 'object') {
                    return Object.values(cart);
                }
            }
            
            // Try localStorage directly
            const stored = localStorage.getItem('seasalt_cart');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) return parsed;
                if (parsed && parsed.items) return parsed.items;
                if (parsed && typeof parsed === 'object') return Object.values(parsed);
            }
            
            return [];
        } catch (e) {
            console.log('📦 Orders Fix: Error getting cart:', e);
            return [];
        }
    }
    
    function getCartTotal() {
        try {
            if (typeof Store !== 'undefined' && Store.getCartTotal) {
                return Store.getCartTotal();
            }
            const items = getCartItems();
            return items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
        } catch (e) {
            return 0;
        }
    }
    
    // ========================================
    // ORDERS STORAGE FUNCTIONS
    // ========================================
    
    function getOrders() {
        try {
            return JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        } catch (e) {
            return [];
        }
    }
    
    function saveOrder(orderData) {
        try {
            const orders = getOrders();
            const orderId = 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
            
            const newOrder = {
                id: orderId,
                items: Array.isArray(orderData.items) ? orderData.items : [],
                address: orderData.address || {},
                subtotal: orderData.subtotal || orderData.total || 0,
                delivery: orderData.delivery || 0,
                walletUsed: orderData.walletUsed || 0,
                total: orderData.total || 0,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            orders.unshift(newOrder);
            localStorage.setItem('seasalt_orders', JSON.stringify(orders));
            console.log('📦 Order saved:', orderId);
            return newOrder;
        } catch (e) {
            console.error('📦 Orders Fix: Error saving order:', e);
            return null;
        }
    }
    
    function formatOrderDate(dateStr) {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    }
    
    function formatPrice(amount) {
        if (typeof CONFIG !== 'undefined' && CONFIG.formatPrice) {
            return CONFIG.formatPrice(amount);
        }
        return '₹' + (amount || 0).toLocaleString('en-IN');
    }
    
    function getStatusConfig(status) {
        const configs = {
            pending: { label: 'Order Placed', icon: '📝', bg: '#FEF3C7', color: '#92400E' },
            confirmed: { label: 'Confirmed', icon: '✅', bg: '#DBEAFE', color: '#1E40AF' },
            preparing: { label: 'Preparing', icon: '👨‍🍳', bg: '#FFEDD5', color: '#C2410C' },
            shipped: { label: 'Shipped', icon: '🚚', bg: '#E9D5FF', color: '#6B21A8' },
            delivered: { label: 'Delivered', icon: '🎉', bg: '#D1FAE5', color: '#065F46' },
            cancelled: { label: 'Cancelled', icon: '❌', bg: '#FEE2E2', color: '#991B1B' }
        };
        return configs[status] || configs.pending;
    }
    
    // ========================================
    // ORDERS PAGE UI
    // ========================================
    
    function showOrdersPage() {
        console.log('📦 Orders Fix: showOrdersPage called');
        
        const user = (typeof Store !== 'undefined' && Store.getState) ? Store.getState().user : null;
        
        if (!user) {
            if (typeof UI !== 'undefined' && UI.showToast) {
                UI.showToast('Please login to view orders', 'info');
            }
            if (typeof SpinWheel !== 'undefined' && SpinWheel.show) {
                SpinWheel.show();
            }
            return;
        }
        
        const orders = getOrders();
        
        // Remove any existing orders modal
        const existingModal = document.getElementById('orders-modal');
        if (existingModal) existingModal.remove();
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'orders-modal';
        modal.className = 'fixed inset-0 z-[85] flex items-end justify-center';
        
        let ordersHtml = '';
        
        if (orders.length === 0) {
            ordersHtml = `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">📦</div>
                    <h4 class="font-semibold text-gray-800 mb-2">No orders yet</h4>
                    <p class="text-gray-500 text-sm mb-6">Your order history will appear here</p>
                    <button class="close-modal px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors">
                        Start Shopping
                    </button>
                </div>
            `;
        } else {
            ordersHtml = `
                <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    ${orders.map(order => {
                        const statusConfig = getStatusConfig(order.status);
                        const items = Array.isArray(order.items) ? order.items : [];
                        const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
                        return `
                            <div class="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors" onclick="window.OrdersFix.showOrderDetail('${order.id}')">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <span class="font-bold text-gray-800">#${order.id}</span>
                                        <p class="text-xs text-gray-500 mt-1">${formatOrderDate(order.createdAt)}</p>
                                    </div>
                                    <span class="px-3 py-1 text-xs font-semibold rounded-full" style="background:${statusConfig.bg};color:${statusConfig.color}">
                                        ${statusConfig.icon} ${statusConfig.label}
                                    </span>
                                </div>
                                ${items.length > 0 ? `
                                    <div class="flex items-center gap-2 mb-3">
                                        ${items.slice(0, 3).map(item => `
                                            <div class="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                                                <img src="${item.image || 'https://via.placeholder.com/48?text=🥒'}" 
                                                     class="w-full h-full object-cover" 
                                                     onerror="this.src='https://via.placeholder.com/48?text=🥒'">
                                            </div>
                                        `).join('')}
                                        ${items.length > 3 ? `<span class="text-xs text-gray-500 ml-1">+${items.length - 3} more</span>` : ''}
                                    </div>
                                ` : ''}
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">${itemCount} item(s)</span>
                                    <span class="font-bold text-lg text-gray-800">${formatPrice(order.total)}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="document.getElementById('orders-modal').remove(); document.body.style.overflow='';"></div>
            <div class="relative bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="font-bold text-xl text-gray-800">My Orders</h3>
                        <p class="text-sm text-gray-500">${orders.length} order(s)</p>
                    </div>
                    <button onclick="document.getElementById('orders-modal').remove(); document.body.style.overflow='';" 
                            class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                ${ordersHtml}
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }
    
    // ========================================
    // ORDER DETAIL
    // ========================================
    
    function showOrderDetail(orderId) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        const statusConfig = getStatusConfig(order.status);
        const items = Array.isArray(order.items) ? order.items : [];
        
        // Close orders modal
        const ordersModal = document.getElementById('orders-modal');
        if (ordersModal) ordersModal.remove();
        
        // Create detail modal
        const modal = document.createElement('div');
        modal.id = 'order-detail-modal';
        modal.className = 'fixed inset-0 z-[90] flex items-end justify-center';
        
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="document.getElementById('order-detail-modal').remove(); document.body.style.overflow='';"></div>
            <div class="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
                <div class="sticky top-0 bg-white p-4 border-b border-gray-100 flex justify-between items-center z-10">
                    <div>
                        <h3 class="font-bold text-gray-800">Order #${order.id}</h3>
                        <p class="text-xs text-gray-500">${formatOrderDate(order.createdAt)}</p>
                    </div>
                    <button onclick="document.getElementById('order-detail-modal').remove(); document.body.style.overflow='';" 
                            class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Status -->
                <div class="p-4 bg-gray-50">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">${statusConfig.icon}</span>
                        <span class="px-4 py-2 rounded-full text-sm font-bold" style="background:${statusConfig.bg};color:${statusConfig.color}">
                            ${statusConfig.label}
                        </span>
                    </div>
                </div>
                
                <!-- Items -->
                <div class="p-4">
                    <h4 class="font-bold text-gray-800 mb-3">📦 Items (${items.length})</h4>
                    ${items.length > 0 ? `
                        <div class="space-y-3">
                            ${items.map(item => `
                                <div class="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div class="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src="${item.image || 'https://via.placeholder.com/64?text=🥒'}" 
                                             class="w-full h-full object-cover" 
                                             onerror="this.src='https://via.placeholder.com/64?text=🥒'">
                                    </div>
                                    <div class="flex-1">
                                        <h5 class="font-semibold text-gray-800">${item.name || 'Product'}</h5>
                                        <p class="text-xs text-gray-500">${item.weight || ''}</p>
                                        <div class="flex justify-between mt-2">
                                            <span class="text-sm text-gray-500">Qty: ${item.quantity || 1}</span>
                                            <span class="font-bold text-gray-800">${formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="text-gray-500 text-sm">No item details available</p>
                    `}
                </div>
                
                <!-- Payment Summary -->
                <div class="p-4 border-t border-gray-100">
                    <h4 class="font-bold text-gray-800 mb-3">💳 Payment Summary</h4>
                    <div class="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div class="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>${formatPrice(order.subtotal || order.total)}</span>
                        </div>
                        ${order.walletUsed ? `
                            <div class="flex justify-between text-green-600">
                                <span>Wallet Used</span>
                                <span>-${formatPrice(order.walletUsed)}</span>
                            </div>
                        ` : ''}
                        <div class="flex justify-between text-gray-600">
                            <span>Delivery</span>
                            <span>${order.delivery === 0 ? 'FREE' : formatPrice(order.delivery || 0)}</span>
                        </div>
                        <div class="border-t border-gray-200 pt-3 mt-3 flex justify-between font-bold text-lg text-gray-800">
                            <span>Total Paid</span>
                            <span>${formatPrice(order.total)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="p-4 border-t border-gray-100 flex gap-3">
                    <button onclick="window.OrdersFix.contactSupport('${order.id}')" 
                            class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                        💬 Need Help?
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }
    
    function contactSupport(orderId) {
        window.open('https://wa.me/919963971447?text=' + encodeURIComponent('Hi! I need help with order #' + orderId), '_blank');
    }
    
    // ========================================
    // OVERRIDE App.navigateTo FOR ORDERS
    // ========================================
    
    function overrideAppNavigation() {
        if (typeof App === 'undefined' || !App.navigateTo) {
            console.log('📦 Orders Fix: Waiting for App...');
            setTimeout(overrideAppNavigation, 200);
            return;
        }
        
        const originalNavigateTo = App.navigateTo;
        
        App.navigateTo = function(page) {
            if (page === 'orders') {
                console.log('📦 Orders Fix: Intercepted orders navigation');
                showOrdersPage();
                
                // Update bottom nav
                if (typeof UI !== 'undefined' && UI.updateBottomNav) {
                    UI.updateBottomNav(page);
                }
                if (typeof Store !== 'undefined' && Store.setCurrentPage) {
                    Store.setCurrentPage(page);
                }
                return;
            }
            
            return originalNavigateTo.apply(App, arguments);
        };
        
        console.log('📦 Orders Fix: App.navigateTo patched!');
    }
    
    // ========================================
    // AUTO-SAVE ORDERS ON CHECKOUT
    // ========================================
    
    let pendingOrderItems = [];
    let pendingOrderTotal = 0;
    
    function captureCartBeforeCheckout() {
        try {
            pendingOrderItems = getCartItems().map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                weight: item.weight,
                image: item.image
            }));
            pendingOrderTotal = getCartTotal();
            console.log('📦 Orders Fix: Captured', pendingOrderItems.length, 'items, total:', pendingOrderTotal);
        } catch (e) {
            console.log('📦 Orders Fix: Error capturing cart:', e);
        }
    }
    
    function patchCartCheckout() {
        if (typeof Cart === 'undefined') {
            setTimeout(patchCartCheckout, 500);
            return;
        }
        
        // Patch placeOrder
        if (Cart.placeOrder) {
            const original = Cart.placeOrder;
            Cart.placeOrder = function() {
                console.log('📦 Orders Fix: placeOrder intercepted');
                captureCartBeforeCheckout();
                return original.apply(Cart, arguments);
            };
            console.log('📦 Orders Fix: Cart.placeOrder patched!');
        }
        
        // Patch checkout
        if (Cart.checkout) {
            const original = Cart.checkout;
            Cart.checkout = function() {
                console.log('📦 Orders Fix: checkout intercepted');
                captureCartBeforeCheckout();
                return original.apply(Cart, arguments);
            };
            console.log('📦 Orders Fix: Cart.checkout patched!');
        }
    }
    
    // Watch for "Order Placed" modal
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType !== 1) return;
                
                const text = node.textContent || '';
                
                // Check for order success
                if ((text.includes('Order Placed') || text.includes('order placed')) && 
                    (text.includes('delicious pickles') || text.includes('Order Total') || text.includes('on the way'))) {
                    
                    console.log('📦 Orders Fix: Order modal detected!');
                    
                    // Extract total
                    const totalMatch = text.match(/₹([\d,]+)/);
                    const modalTotal = totalMatch ? parseInt(totalMatch[1].replace(/,/g, '')) : 0;
                    
                    // Use captured items or try to get from cart
                    let items = pendingOrderItems.length > 0 ? pendingOrderItems : getCartItems().map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity || 1,
                        weight: item.weight,
                        image: item.image
                    }));
                    
                    let total = pendingOrderTotal > 0 ? pendingOrderTotal : modalTotal;
                    
                    // Check for recent duplicate
                    const orders = getOrders();
                    if (orders.length > 0) {
                        const recent = orders[0];
                        const timeDiff = Date.now() - new Date(recent.createdAt).getTime();
                        if (timeDiff < 5000) {
                            console.log('📦 Orders Fix: Order already saved recently');
                            pendingOrderItems = [];
                            pendingOrderTotal = 0;
                            return;
                        }
                    }
                    
                    // Save order
                    if (total > 0) {
                        const user = (typeof Store !== 'undefined' && Store.getState) ? Store.getState().user : {};
                        
                        saveOrder({
                            items: items,
                            total: total,
                            subtotal: items.length > 0 ? items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0) : total,
                            delivery: 0,
                            address: {
                                name: user?.name || 'Customer',
                                phone: user?.phone || ''
                            }
                        });
                        
                        // Clear pending
                        pendingOrderItems = [];
                        pendingOrderTotal = 0;
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // ========================================
    // INITIALIZE
    // ========================================
    
    function init() {
        overrideAppNavigation();
        setTimeout(patchCartCheckout, 500);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ========================================
    // GLOBAL EXPORT
    // ========================================
    
    window.OrdersFix = {
        getOrders: getOrders,
        saveOrder: saveOrder,
        showOrdersPage: showOrdersPage,
        showOrderDetail: showOrderDetail,
        contactSupport: contactSupport
    };
    
    console.log('📦 Orders Fix v2: Ready!');
    
})();
