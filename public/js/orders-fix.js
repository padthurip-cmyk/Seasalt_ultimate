/**
 * SeaSalt Pickles - Orders Fix
 * =============================
 * This file OVERRIDES the "Orders coming soon" with a real Orders page
 * 
 * IMPORTANT: Add this AFTER app.js in your index.html:
 * <script src="/js/app.js"></script>
 * <script src="/js/orders-fix.js"></script>  <!-- ADD THIS -->
 */

(function() {
    'use strict';
    
    console.log('📦 Orders Fix: Loading...');
    
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
        const orders = getOrders();
        const orderId = 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
        
        const newOrder = {
            id: orderId,
            items: orderData.items || [],
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
        console.log('📦 Order saved:', orderId, newOrder);
        return newOrder;
    }
    
    function formatOrderDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
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
    // OVERRIDE App.navigateTo FOR ORDERS
    // ========================================
    
    // Wait for App to be available
    function overrideAppNavigation() {
        if (typeof App === 'undefined' || !App.navigateTo) {
            console.log('📦 Orders Fix: Waiting for App...');
            setTimeout(overrideAppNavigation, 100);
            return;
        }
        
        const originalNavigateTo = App.navigateTo;
        
        App.navigateTo = function(page) {
            if (page === 'orders') {
                console.log('📦 Orders Fix: Showing orders page');
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
            
            // Call original for other pages
            return originalNavigateTo.apply(App, arguments);
        };
        
        // Also expose helper functions
        App.showOrderDetail = showOrderDetail;
        App.reorderItems = reorderItems;
        App.contactSupport = contactSupport;
        App.saveOrder = saveOrder;
        App.getOrders = getOrders;
        
        console.log('📦 Orders Fix: App.navigateTo patched successfully!');
    }
    
    // ========================================
    // ORDERS PAGE UI
    // ========================================
    
    function showOrdersPage() {
        const user = (typeof Store !== 'undefined' && Store.getState) ? Store.getState().user : null;
        
        if (!user) {
            if (typeof UI !== 'undefined') UI.showToast('Please login to view orders', 'info');
            if (typeof SpinWheel !== 'undefined') SpinWheel.show();
            return;
        }
        
        const orders = getOrders();
        
        // Remove any existing orders modal
        const existingModal = document.getElementById('orders-modal');
        if (existingModal) existingModal.remove();
        
        // Create orders modal
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
                        const items = order.items || [];
                        return `
                            <div class="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors" onclick="App.showOrderDetail('${order.id}')">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <span class="font-bold text-gray-800">#${order.id}</span>
                                        <p class="text-xs text-gray-500 mt-1">${formatOrderDate(order.createdAt)}</p>
                                    </div>
                                    <span class="px-3 py-1 text-xs font-semibold rounded-full" style="background:${statusConfig.bg};color:${statusConfig.color}">
                                        ${statusConfig.icon} ${statusConfig.label}
                                    </span>
                                </div>
                                <div class="flex items-center gap-2 mb-3">
                                    ${items.slice(0, 3).map(item => `
                                        <div class="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                                            <img src="${item.image || 'https://via.placeholder.com/48?text=🥒'}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/48?text=🥒'">
                                        </div>
                                    `).join('')}
                                    ${items.length > 3 ? `<span class="text-xs text-gray-500 ml-1">+${items.length - 3} more</span>` : ''}
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">${items.reduce((sum, i) => sum + (i.quantity || 1), 0)} item(s)</span>
                                    <span class="font-bold text-lg text-gray-800">${typeof CONFIG !== 'undefined' ? CONFIG.formatPrice(order.total) : '₹' + order.total}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-modal"></div>
            <div class="relative bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="font-bold text-xl text-gray-800">My Orders</h3>
                        <p class="text-sm text-gray-500">${orders.length} order(s)</p>
                    </div>
                    <button class="close-modal w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                ${ordersHtml}
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Close handlers
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
                document.body.style.overflow = '';
            });
        });
    }
    
    // ========================================
    // ORDER DETAIL
    // ========================================
    
    function showOrderDetail(orderId) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        const statusConfig = getStatusConfig(order.status);
        const items = order.items || [];
        
        // Close orders modal
        const ordersModal = document.getElementById('orders-modal');
        if (ordersModal) ordersModal.remove();
        
        // Create detail modal
        const modal = document.createElement('div');
        modal.id = 'order-detail-modal';
        modal.className = 'fixed inset-0 z-[90] flex items-end justify-center';
        
        const formatPrice = typeof CONFIG !== 'undefined' ? CONFIG.formatPrice : (p) => '₹' + p;
        
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-modal"></div>
            <div class="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
                <div class="sticky top-0 bg-white p-4 border-b border-gray-100 flex justify-between items-center z-10">
                    <div>
                        <h3 class="font-bold text-gray-800">Order #${order.id}</h3>
                        <p class="text-xs text-gray-500">${formatOrderDate(order.createdAt)}</p>
                    </div>
                    <button class="close-modal w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
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
                    <div class="space-y-3">
                        ${items.map(item => `
                            <div class="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                <div class="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src="${item.image || 'https://via.placeholder.com/64?text=🥒'}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/64?text=🥒'">
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
                    ${order.status === 'delivered' ? `
                        <button onclick="App.reorderItems('${order.id}')" class="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors">
                            🔄 Reorder
                        </button>
                    ` : ''}
                    <button onclick="App.contactSupport('${order.id}')" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                        💬 Need Help?
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Close handlers
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
                document.body.style.overflow = '';
            });
        });
    }
    
    function reorderItems(orderId) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order || !order.items) return;
        
        order.items.forEach(item => {
            if (typeof Store !== 'undefined' && Store.addToCart) {
                Store.addToCart(item.id, item.quantity || 1);
            }
        });
        
        const modal = document.getElementById('order-detail-modal');
        if (modal) { modal.remove(); document.body.style.overflow = ''; }
        
        if (typeof UI !== 'undefined') {
            UI.showToast('Items added to cart!', 'success');
            UI.updateCartUI();
        }
    }
    
    function contactSupport(orderId) {
        window.open('https://wa.me/919963971447?text=' + encodeURIComponent('Hi! I need help with order #' + orderId), '_blank');
    }
    
    // ========================================
    // AUTO-SAVE ORDERS ON CHECKOUT
    // ========================================
    
    // Watch for "Order Placed" modal and save order
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType !== 1) return;
                
                const text = node.textContent || '';
                
                // Check if this is order success modal
                if (text.includes('Order Placed') && text.includes('delicious pickles')) {
                    console.log('📦 Orders Fix: Order placed modal detected');
                    
                    // Extract total from modal
                    const totalMatch = text.match(/₹([\d,]+)/);
                    const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, '')) : 0;
                    
                    // Get cart items before they're cleared
                    let items = [];
                    if (typeof Store !== 'undefined' && Store.getCart) {
                        items = Store.getCart().map(item => ({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            weight: item.weight,
                            image: item.image
                        }));
                    }
                    
                    // Check if order was already saved (within last 3 seconds)
                    const orders = getOrders();
                    const recentOrder = orders[0];
                    if (recentOrder) {
                        const timeDiff = Date.now() - new Date(recentOrder.createdAt).getTime();
                        if (timeDiff < 3000) {
                            console.log('📦 Orders Fix: Order already saved recently');
                            return;
                        }
                    }
                    
                    // Save the order
                    if (total > 0 || items.length > 0) {
                        const user = (typeof Store !== 'undefined' && Store.getState) ? Store.getState().user : {};
                        
                        saveOrder({
                            items: items,
                            total: total || items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0),
                            subtotal: items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0),
                            delivery: 0,
                            address: {
                                name: user?.name || 'Customer',
                                phone: user?.phone || ''
                            }
                        });
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // ========================================
    // INITIALIZE
    // ========================================
    
    // Start patching when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', overrideAppNavigation);
    } else {
        overrideAppNavigation();
    }
    
    // Make functions globally available
    window.OrdersFix = {
        getOrders: getOrders,
        saveOrder: saveOrder,
        showOrdersPage: showOrdersPage,
        showOrderDetail: showOrderDetail
    };
    
    console.log('📦 Orders Fix: Loaded!');
    
})();
