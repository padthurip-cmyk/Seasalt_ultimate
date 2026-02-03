/**
 * SeaSalt Pickles - Complete Orders Page Module
 * ==============================================
 * Full orders page with order history, tracking, and management
 * 
 * INSTALLATION:
 * 1. Copy this file to public/js/orders.js
 * 2. Add <script src="/js/orders.js"></script> to index.html BEFORE app.js
 * 3. The orders page will work automatically when clicking "Orders" in bottom nav
 */

(function() {
    'use strict';
    
    // Inject required CSS
    const styles = `
        /* Orders Page Animations */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { 
                transform: translateY(100%);
                opacity: 0;
            }
            to { 
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideInRight {
            from { 
                transform: translateX(20px);
                opacity: 0;
            }
            to { 
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .animate-slideInRight {
            animation: slideInRight 0.3s ease-out;
        }
        
        /* Order Card Hover Effect */
        .order-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .order-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        /* Status Badge Colors */
        .status-pending { background: #FEF3C7; color: #92400E; }
        .status-confirmed { background: #DBEAFE; color: #1E40AF; }
        .status-preparing { background: #FFEDD5; color: #C2410C; }
        .status-shipped { background: #E9D5FF; color: #6B21A8; }
        .status-out_for_delivery { background: #E0E7FF; color: #3730A3; }
        .status-delivered { background: #D1FAE5; color: #065F46; }
        .status-cancelled { background: #FEE2E2; color: #991B1B; }
        
        /* Timeline Line */
        .timeline-item:not(:last-child)::after {
            content: '';
            position: absolute;
            left: 16px;
            top: 32px;
            bottom: -12px;
            width: 2px;
            background: #E5E7EB;
        }
        
        /* Modal Backdrop */
        #order-details-modal {
            backdrop-filter: blur(4px);
        }
        
        /* Smooth scrolling for modal */
        #order-details-modal > div {
            scrollbar-width: thin;
            scrollbar-color: #D1D5DB transparent;
        }
        
        #order-details-modal > div::-webkit-scrollbar {
            width: 6px;
        }
        
        #order-details-modal > div::-webkit-scrollbar-track {
            background: transparent;
        }
        
        #order-details-modal > div::-webkit-scrollbar-thumb {
            background: #D1D5DB;
            border-radius: 3px;
        }
        
        /* Empty State Animation */
        .empty-state-icon {
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
        }
    `;
    
    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    // Storage key
    const ORDERS_KEY = 'seasalt_orders';
    
    // Order status configurations
    const ORDER_STATUS = {
        'pending': { label: 'Order Placed', color: 'status-pending', icon: '📝', bg: 'bg-yellow-100 text-yellow-800' },
        'confirmed': { label: 'Confirmed', color: 'status-confirmed', icon: '✅', bg: 'bg-blue-100 text-blue-800' },
        'preparing': { label: 'Preparing', color: 'status-preparing', icon: '👨‍🍳', bg: 'bg-orange-100 text-orange-800' },
        'shipped': { label: 'Shipped', color: 'status-shipped', icon: '🚚', bg: 'bg-purple-100 text-purple-800' },
        'out_for_delivery': { label: 'Out for Delivery', color: 'status-out_for_delivery', icon: '📦', bg: 'bg-indigo-100 text-indigo-800' },
        'delivered': { label: 'Delivered', color: 'status-delivered', icon: '🎉', bg: 'bg-green-100 text-green-800' },
        'cancelled': { label: 'Cancelled', color: 'status-cancelled', icon: '❌', bg: 'bg-red-100 text-red-800' }
    };
    
    // Utility functions
    function getOrders() {
        try {
            const orders = localStorage.getItem(ORDERS_KEY);
            return orders ? JSON.parse(orders) : [];
        } catch (e) {
            console.error('Error loading orders:', e);
            return [];
        }
    }
    
    function saveOrders(orders) {
        try {
            localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        } catch (e) {
            console.error('Error saving orders:', e);
        }
    }
    
    function generateOrderId() {
        const prefix = 'SS';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    function formatPrice(amount) {
        return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
    }
    
    function showToast(message, type = 'info') {
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(message, type);
        } else {
            // Fallback toast
            const toast = document.createElement('div');
            toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-sm z-50 animate-fadeIn ${
                type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-gray-800'
            }`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }
    
    // Create new order (called from checkout)
    function createOrder(orderData) {
        const orders = getOrders();
        const newOrder = {
            id: generateOrderId(),
            ...orderData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            statusHistory: [{
                status: 'pending',
                timestamp: new Date().toISOString(),
                message: 'Order placed successfully'
            }]
        };
        orders.unshift(newOrder);
        saveOrders(orders);
        return newOrder;
    }
    
    // Render empty state
    function renderEmptyState() {
        return `
            <div class="flex flex-col items-center justify-center py-16 px-4">
                <div class="w-32 h-32 mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center empty-state-icon">
                    <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">No orders yet</h3>
                <p class="text-gray-500 text-center mb-6 max-w-xs">Start shopping to see your orders here. We have delicious pickles waiting for you!</p>
                <button onclick="OrdersPage.goHome()" class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                    🛒 Start Shopping
                </button>
                <button onclick="OrdersPage.addDemoOrders()" class="mt-4 text-sm text-gray-500 hover:text-gray-700 underline">
                    Add demo orders for testing
                </button>
            </div>
        `;
    }
    
    // Render order card
    function renderOrderCard(order, index) {
        const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
        const itemCount = order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
        const itemsPreview = order.items ? order.items.slice(0, 3) : [];
        
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden order-card animate-slideInRight" 
                 style="animation-delay: ${index * 0.1}s" 
                 data-order-id="${order.id}">
                <!-- Order Header -->
                <div class="p-4 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">${status.icon}</span>
                            <span class="font-bold text-gray-800">Order #${order.id}</span>
                        </div>
                        <span class="px-3 py-1 rounded-full text-xs font-semibold ${status.bg}">
                            ${status.label}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500">${formatDate(order.createdAt)}</p>
                </div>
                
                <!-- Order Items Preview -->
                <div class="p-4">
                    <div class="flex items-center gap-3 mb-4">
                        ${itemsPreview.map(item => `
                            <div class="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                <img src="${item.image || 'https://via.placeholder.com/100x100?text=🥒'}" 
                                     alt="${item.name || 'Product'}" 
                                     class="w-full h-full object-cover"
                                     onerror="this.src='https://via.placeholder.com/100x100?text=🥒'">
                            </div>
                        `).join('')}
                        ${order.items && order.items.length > 3 ? `
                            <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                                <span class="text-sm font-bold text-gray-600">+${order.items.length - 3}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500">${itemCount} ${itemCount === 1 ? 'item' : 'items'}</p>
                            <p class="text-xl font-bold text-gray-800">${formatPrice(order.total)}</p>
                        </div>
                        <button onclick="OrdersPage.viewOrderDetails('${order.id}')" 
                                class="px-5 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:from-gray-200 hover:to-gray-300 transition-all">
                            View Details →
                        </button>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                ${order.status === 'delivered' ? `
                    <div class="px-4 pb-4">
                        <button onclick="OrdersPage.reorder('${order.id}')" 
                                class="w-full py-3 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-xl text-sm font-semibold border border-green-200 hover:from-green-100 hover:to-emerald-100 transition-all">
                            🔄 Reorder Items
                        </button>
                    </div>
                ` : ''}
                
                ${order.status === 'pending' ? `
                    <div class="px-4 pb-4">
                        <button onclick="OrdersPage.cancelOrder('${order.id}')" 
                                class="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all">
                            ❌ Cancel Order
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Render orders page
    function renderOrdersPage() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('main-content element not found');
            return;
        }
        
        const orders = getOrders();
        
        let html = `
            <div class="orders-page pb-24 min-h-screen bg-gray-50">
                <!-- Header -->
                <div class="sticky top-0 bg-white z-10 px-4 py-4 border-b border-gray-100 shadow-sm">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-xl font-bold text-gray-800">My Orders</h1>
                            <p class="text-sm text-gray-500 mt-0.5">${orders.length > 0 ? `${orders.length} order${orders.length > 1 ? 's' : ''}` : 'Track your orders'}</p>
                        </div>
                        ${orders.length > 0 ? `
                            <button onclick="OrdersPage.refreshOrders()" class="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="px-4 py-4">
        `;
        
        if (orders.length === 0) {
            html += renderEmptyState();
        } else {
            html += `<div class="space-y-4">`;
            orders.forEach((order, index) => {
                html += renderOrderCard(order, index);
            });
            html += `</div>`;
        }
        
        html += `
                </div>
            </div>
        `;
        
        mainContent.innerHTML = html;
    }
    
    // View order details
    function viewOrderDetails(orderId) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (!order) {
            showToast('Order not found', 'error');
            return;
        }
        
        const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
        
        const modalHtml = `
            <div id="order-details-modal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fadeIn" onclick="if(event.target === this) OrdersPage.closeModal()">
                <div class="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slideUp">
                    <!-- Modal Header -->
                    <div class="sticky top-0 bg-white z-10 p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 class="text-lg font-bold text-gray-800">Order #${order.id}</h2>
                            <p class="text-sm text-gray-500">${formatDate(order.createdAt)}</p>
                        </div>
                        <button onclick="OrdersPage.closeModal()" class="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Status Badge -->
                    <div class="p-4 bg-gradient-to-r from-gray-50 to-white">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">${status.icon}</span>
                            <div>
                                <span class="px-4 py-1.5 rounded-full text-sm font-semibold ${status.bg}">
                                    ${status.label}
                                </span>
                                ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                                    <p class="text-xs text-gray-500 mt-2">📅 Expected delivery in 2-3 business days</p>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Order Items -->
                    <div class="p-4 border-t border-gray-100">
                        <h3 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <span>📦</span> Items (${order.items ? order.items.length : 0})
                        </h3>
                        <div class="space-y-3">
                            ${order.items ? order.items.map(item => `
                                <div class="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                    <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                        <img src="${item.image || 'https://via.placeholder.com/100x100?text=🥒'}" 
                                             alt="${item.name || 'Product'}" 
                                             class="w-full h-full object-cover"
                                             onerror="this.src='https://via.placeholder.com/100x100?text=🥒'">
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <h4 class="font-semibold text-gray-800 text-sm truncate">${item.name || 'Product'}</h4>
                                        <p class="text-xs text-gray-500">${item.weight || ''}</p>
                                        <div class="flex items-center justify-between mt-1">
                                            <span class="text-sm text-gray-600">Qty: ${item.quantity || 1}</span>
                                            <span class="font-bold text-gray-800">${formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('') : '<p class="text-gray-500 text-center py-4">No items found</p>'}
                        </div>
                    </div>
                    
                    <!-- Delivery Address -->
                    ${order.address ? `
                        <div class="p-4 border-t border-gray-100">
                            <h3 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <span>📍</span> Delivery Address
                            </h3>
                            <div class="bg-gray-50 rounded-xl p-3">
                                <p class="text-sm text-gray-700 font-medium">${order.address.name || 'Customer'}</p>
                                <p class="text-sm text-gray-600 mt-1">
                                    ${order.address.line1 || ''}<br>
                                    ${order.address.line2 ? order.address.line2 + '<br>' : ''}
                                    ${order.address.city || ''} - ${order.address.pincode || ''}<br>
                                    📞 ${order.address.phone || 'N/A'}
                                </p>
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Price Breakdown -->
                    <div class="p-4 border-t border-gray-100">
                        <h3 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <span>💳</span> Payment Summary
                        </h3>
                        <div class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                            <div class="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>${formatPrice(order.subtotal || order.total)}</span>
                            </div>
                            ${order.discount ? `
                                <div class="flex justify-between text-green-600">
                                    <span>🎉 Discount</span>
                                    <span>-${formatPrice(order.discount)}</span>
                                </div>
                            ` : ''}
                            ${order.walletUsed ? `
                                <div class="flex justify-between text-green-600">
                                    <span>💰 Wallet Used</span>
                                    <span>-${formatPrice(order.walletUsed)}</span>
                                </div>
                            ` : ''}
                            <div class="flex justify-between text-gray-600">
                                <span>🚚 Delivery</span>
                                <span>${order.delivery === 0 ? '<span class="text-green-600 font-medium">FREE</span>' : formatPrice(order.delivery || 0)}</span>
                            </div>
                            <div class="border-t border-gray-200 pt-2 mt-2">
                                <div class="flex justify-between font-bold text-gray-800 text-base">
                                    <span>Total Paid</span>
                                    <span class="text-lg">${formatPrice(order.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Status Timeline -->
                    ${order.statusHistory && order.statusHistory.length > 0 ? `
                        <div class="p-4 border-t border-gray-100">
                            <h3 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <span>📋</span> Order Timeline
                            </h3>
                            <div class="space-y-4 relative">
                                ${order.statusHistory.map((history, index) => {
                                    const historyStatus = ORDER_STATUS[history.status] || ORDER_STATUS.pending;
                                    return `
                                        <div class="flex items-start gap-3 relative timeline-item">
                                            <div class="w-8 h-8 rounded-full ${historyStatus.bg} flex items-center justify-center text-sm flex-shrink-0 relative z-10">
                                                ${historyStatus.icon}
                                            </div>
                                            <div class="flex-1 pb-1">
                                                <p class="font-semibold text-gray-800 text-sm">${historyStatus.label}</p>
                                                <p class="text-xs text-gray-500">${formatDate(history.timestamp)}</p>
                                                ${history.message ? `<p class="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg px-2 py-1 inline-block">${history.message}</p>` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Actions -->
                    <div class="sticky bottom-0 p-4 border-t border-gray-100 bg-white flex gap-3">
                        ${order.status === 'delivered' ? `
                            <button onclick="OrdersPage.reorder('${order.id}')" 
                                    class="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg">
                                🔄 Reorder
                            </button>
                        ` : ''}
                        ${order.status === 'pending' ? `
                            <button onclick="OrdersPage.cancelOrder('${order.id}')" 
                                    class="flex-1 py-3 border-2 border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all">
                                ❌ Cancel
                            </button>
                        ` : ''}
                        <button onclick="OrdersPage.contactSupport('${order.id}')" 
                                class="flex-1 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all">
                            💬 Need Help?
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';
    }
    
    // Close modal
    function closeModal() {
        const modal = document.getElementById('order-details-modal');
        if (modal) {
            modal.classList.add('animate-fadeOut');
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
            }, 200);
        }
    }
    
    // Reorder
    function reorder(orderId) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (!order || !order.items) {
            showToast('Unable to reorder', 'error');
            return;
        }
        
        let addedCount = 0;
        order.items.forEach(item => {
            if (typeof Store !== 'undefined' && Store.addToCart) {
                Store.addToCart({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    image: item.image,
                    weight: item.weight,
                    category: item.category
                }, item.quantity || 1);
                addedCount++;
            }
        });
        
        closeModal();
        
        if (addedCount > 0) {
            showToast(`${addedCount} items added to cart!`, 'success');
            if (typeof UI !== 'undefined' && UI.updateCartUI) {
                UI.updateCartUI();
            }
        } else {
            showToast('Added items to cart', 'success');
        }
    }
    
    // Cancel order
    function cancelOrder(orderId) {
        if (!confirm('Are you sure you want to cancel this order?')) return;
        
        const orders = getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            showToast('Order not found', 'error');
            return;
        }
        
        orders[orderIndex].status = 'cancelled';
        orders[orderIndex].updatedAt = new Date().toISOString();
        orders[orderIndex].statusHistory.push({
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            message: 'Order cancelled by customer'
        });
        
        saveOrders(orders);
        closeModal();
        renderOrdersPage();
        showToast('Order cancelled successfully', 'success');
    }
    
    // Contact support
    function contactSupport(orderId) {
        const whatsappNumber = '919963971447';
        const message = encodeURIComponent(`Hi! I need help with my order #${orderId} on SeaSalt Pickles`);
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    }
    
    // Navigate to home
    function goHome() {
        if (typeof App !== 'undefined' && App.navigateTo) {
            App.navigateTo('home');
        } else {
            window.location.href = '/';
        }
    }
    
    // Refresh orders
    function refreshOrders() {
        showToast('Refreshing orders...', 'info');
        setTimeout(() => {
            renderOrdersPage();
            showToast('Orders refreshed!', 'success');
        }, 500);
    }
    
    // Add demo orders for testing
    function addDemoOrders() {
        const demoOrders = [
            {
                id: generateOrderId(),
                items: [
                    { id: 1, name: 'Avakaya Mango Pickle', price: 299, quantity: 2, weight: '500gm', image: '' },
                    { id: 2, name: 'Gongura Pickle', price: 249, quantity: 1, weight: '250gm', image: '' },
                    { id: 3, name: 'Tomato Pickle', price: 199, quantity: 1, weight: '250gm', image: '' }
                ],
                subtotal: 1046,
                delivery: 0,
                total: 1046,
                status: 'delivered',
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                address: {
                    name: 'Ramesh Kumar',
                    line1: '123 Banjara Hills',
                    line2: 'Road No. 12',
                    city: 'Hyderabad',
                    pincode: '500034',
                    phone: '9876543210'
                },
                statusHistory: [
                    { status: 'pending', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), message: 'Order placed successfully' },
                    { status: 'confirmed', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1800000).toISOString(), message: 'Order confirmed by seller' },
                    { status: 'preparing', timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), message: 'Your order is being prepared' },
                    { status: 'shipped', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), message: 'Shipped via DTDC - AWB: DT123456789' },
                    { status: 'out_for_delivery', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 3600000).toISOString(), message: 'Out for delivery' },
                    { status: 'delivered', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), message: 'Delivered successfully' }
                ]
            },
            {
                id: generateOrderId(),
                items: [
                    { id: 4, name: 'Kura Karam', price: 300, quantity: 1, weight: '500gm', image: '' },
                    { id: 5, name: 'Turmeric Powder', price: 125, quantity: 2, weight: '250gm', image: '' }
                ],
                subtotal: 550,
                delivery: 50,
                total: 600,
                status: 'shipped',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                address: {
                    name: 'Priya Sharma',
                    line1: '456 Jubilee Hills',
                    city: 'Hyderabad',
                    pincode: '500033',
                    phone: '9123456789'
                },
                statusHistory: [
                    { status: 'pending', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), message: 'Order placed' },
                    { status: 'confirmed', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 900000).toISOString(), message: 'Payment confirmed' },
                    { status: 'shipped', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), message: 'Shipped via BlueDart - AWB: BD987654321' }
                ]
            },
            {
                id: generateOrderId(),
                items: [
                    { id: 6, name: 'Red Chilli Pickle', price: 249, quantity: 1, weight: '500gm', image: '' }
                ],
                subtotal: 249,
                delivery: 50,
                total: 299,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                address: {
                    name: 'Test Customer',
                    line1: '789 Madhapur',
                    city: 'Hyderabad',
                    pincode: '500081',
                    phone: '9876543210'
                },
                statusHistory: [
                    { status: 'pending', timestamp: new Date().toISOString(), message: 'Order placed - Awaiting confirmation' }
                ]
            }
        ];
        
        saveOrders(demoOrders);
        renderOrdersPage();
        showToast('Demo orders added! 🎉', 'success');
    }
    
    // Initialize
    function init() {
        renderOrdersPage();
        
        // Listen for escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }
    
    // Export to global
    window.OrdersPage = {
        init,
        render: renderOrdersPage,
        getOrders,
        createOrder,
        viewOrderDetails,
        closeModal,
        reorder,
        cancelOrder,
        contactSupport,
        goHome,
        refreshOrders,
        addDemoOrders
    };
    
    // Auto-intercept Orders nav click
    document.addEventListener('DOMContentLoaded', function() {
        const ordersNav = document.querySelector('[data-page="orders"], .bottom-nav-item:has([data-page="orders"])');
        if (ordersNav) {
            ordersNav.addEventListener('click', function(e) {
                // Let the normal navigation happen, but also init orders
                setTimeout(() => {
                    if (typeof OrdersPage !== 'undefined') {
                        OrdersPage.init();
                    }
                }, 100);
            });
        }
    });
})();
