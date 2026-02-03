/**
 * SeaSalt Pickles - Orders Page Patch
 * ====================================
 * Drop-in solution - Add this AFTER app.js in your HTML
 * This will automatically override the "Orders coming soon" behavior
 * 
 * USAGE: Add to index.html AFTER app.js:
 * <script src="/js/orders-patch.js"></script>
 */

(function() {
    'use strict';
    
    console.log('🛒 Orders Patch Loading...');
    
    // ========================================
    // INJECT CSS
    // ========================================
    const css = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .order-card { transition: transform 0.2s, box-shadow 0.2s; }
        .order-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    
    // ========================================
    // STORAGE
    // ========================================
    const ORDERS_KEY = 'seasalt_orders';
    
    function getOrders() {
        try {
            return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }
    
    function saveOrders(orders) {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
    
    function generateOrderId() {
        return 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
    }
    
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
    
    function formatPrice(amount) {
        return '₹' + parseFloat(amount || 0).toLocaleString('en-IN');
    }
    
    // ========================================
    // STATUS CONFIG
    // ========================================
    const STATUS = {
        'pending': { label: 'Order Placed', icon: '📝', bg: 'background: #FEF3C7; color: #92400E;' },
        'confirmed': { label: 'Confirmed', icon: '✅', bg: 'background: #DBEAFE; color: #1E40AF;' },
        'preparing': { label: 'Preparing', icon: '👨‍🍳', bg: 'background: #FFEDD5; color: #C2410C;' },
        'shipped': { label: 'Shipped', icon: '🚚', bg: 'background: #E9D5FF; color: #6B21A8;' },
        'delivered': { label: 'Delivered', icon: '🎉', bg: 'background: #D1FAE5; color: #065F46;' },
        'cancelled': { label: 'Cancelled', icon: '❌', bg: 'background: #FEE2E2; color: #991B1B;' }
    };
    
    // ========================================
    // RENDER ORDERS PAGE
    // ========================================
    function renderOrdersPage() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('main-content not found');
            return;
        }
        
        const orders = getOrders();
        
        let html = `
            <div style="padding-bottom: 100px; min-height: 100vh; background: #F9FAFB;">
                <!-- Header -->
                <div style="position: sticky; top: 0; background: white; z-index: 10; padding: 16px; border-bottom: 1px solid #E5E7EB; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <h1 style="font-size: 20px; font-weight: 700; color: #1F2937; margin: 0;">My Orders</h1>
                    <p style="font-size: 14px; color: #6B7280; margin-top: 4px;">${orders.length > 0 ? orders.length + ' order' + (orders.length > 1 ? 's' : '') : 'Track your orders'}</p>
                </div>
                
                <div style="padding: 16px;">
        `;
        
        if (orders.length === 0) {
            html += `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 16px; text-align: center;">
                    <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #F3F4F6, #E5E7EB); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                        <svg style="width: 60px; height: 60px; color: #9CA3AF;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                        </svg>
                    </div>
                    <h3 style="font-size: 20px; font-weight: 700; color: #1F2937; margin-bottom: 8px;">No orders yet</h3>
                    <p style="color: #6B7280; margin-bottom: 24px; max-width: 280px;">Start shopping to see your orders here. We have delicious pickles waiting!</p>
                    <button onclick="if(typeof App !== 'undefined') App.navigateTo('home'); else window.location.reload();" 
                            style="background: linear-gradient(to right, #F97316, #EF4444); color: white; padding: 14px 32px; border-radius: 12px; font-weight: 600; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(249,115,22,0.4);">
                        🛒 Start Shopping
                    </button>
                    <button onclick="OrdersPage.addDemoOrders()" 
                            style="margin-top: 16px; background: none; border: none; color: #6B7280; text-decoration: underline; cursor: pointer; font-size: 14px;">
                        Add demo orders for testing
                    </button>
                </div>
            `;
        } else {
            html += `<div style="display: flex; flex-direction: column; gap: 16px;">`;
            orders.forEach((order, index) => {
                const status = STATUS[order.status] || STATUS.pending;
                const items = order.items || [];
                const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                
                html += `
                    <div class="order-card animate-slideInRight" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB; animation-delay: ${index * 0.1}s;">
                        <!-- Order Header -->
                        <div style="padding: 16px; border-bottom: 1px solid #F3F4F6; background: linear-gradient(to right, #F9FAFB, white);">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 20px;">${status.icon}</span>
                                    <span style="font-weight: 700; color: #1F2937;">Order #${order.id}</span>
                                </div>
                                <span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; ${status.bg}">
                                    ${status.label}
                                </span>
                            </div>
                            <p style="font-size: 12px; color: #6B7280; margin: 0;">${formatDate(order.createdAt)}</p>
                        </div>
                        
                        <!-- Order Items -->
                        <div style="padding: 16px;">
                            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                                ${items.slice(0, 3).map(item => `
                                    <div style="width: 56px; height: 56px; border-radius: 12px; overflow: hidden; background: #F3F4F6; flex-shrink: 0; border: 1px solid #E5E7EB;">
                                        <img src="${item.image || 'https://via.placeholder.com/100?text=🥒'}" 
                                             style="width: 100%; height: 100%; object-fit: cover;"
                                             onerror="this.src='https://via.placeholder.com/100?text=🥒'">
                                    </div>
                                `).join('')}
                                ${items.length > 3 ? `
                                    <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #F3F4F6, #E5E7EB); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <span style="font-size: 14px; font-weight: 600; color: #6B7280;">+${items.length - 3}</span>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <p style="font-size: 14px; color: #6B7280; margin: 0 0 4px 0;">${itemCount} item${itemCount !== 1 ? 's' : ''}</p>
                                    <p style="font-size: 20px; font-weight: 700; color: #1F2937; margin: 0;">${formatPrice(order.total)}</p>
                                </div>
                                <button onclick="OrdersPage.viewDetails('${order.id}')" 
                                        style="padding: 10px 20px; background: linear-gradient(to right, #F3F4F6, #E5E7EB); color: #374151; border-radius: 12px; font-size: 14px; font-weight: 600; border: none; cursor: pointer;">
                                    View Details →
                                </button>
                            </div>
                        </div>
                        
                        ${order.status === 'delivered' ? `
                            <div style="padding: 0 16px 16px 16px;">
                                <button onclick="OrdersPage.reorder('${order.id}')" 
                                        style="width: 100%; padding: 12px; background: linear-gradient(to right, #ECFDF5, #D1FAE5); color: #065F46; border-radius: 12px; font-weight: 600; border: 1px solid #A7F3D0; cursor: pointer;">
                                    🔄 Reorder Items
                                </button>
                            </div>
                        ` : ''}
                        
                        ${order.status === 'pending' ? `
                            <div style="padding: 0 16px 16px 16px;">
                                <button onclick="OrdersPage.cancelOrder('${order.id}')" 
                                        style="width: 100%; padding: 12px; background: white; color: #DC2626; border-radius: 12px; font-weight: 600; border: 2px solid #FECACA; cursor: pointer;">
                                    ❌ Cancel Order
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            html += `</div>`;
        }
        
        html += `</div></div>`;
        
        mainContent.innerHTML = html;
        console.log('✅ Orders page rendered');
    }
    
    // ========================================
    // VIEW ORDER DETAILS
    // ========================================
    function viewDetails(orderId) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        const status = STATUS[order.status] || STATUS.pending;
        const items = order.items || [];
        
        const modal = document.createElement('div');
        modal.id = 'order-modal';
        modal.className = 'animate-fadeIn';
        modal.style.cssText = 'position: fixed; inset: 0; z-index: 9999; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);';
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        
        modal.innerHTML = `
            <div class="animate-slideUp" style="background: white; border-radius: 24px 24px 0 0; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <!-- Header -->
                <div style="position: sticky; top: 0; background: white; padding: 16px; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between; z-index: 1;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; color: #1F2937; margin: 0;">Order #${order.id}</h2>
                        <p style="font-size: 14px; color: #6B7280; margin: 4px 0 0 0;">${formatDate(order.createdAt)}</p>
                    </div>
                    <button onclick="OrdersPage.closeModal()" style="padding: 8px; background: #F3F4F6; border-radius: 50%; border: none; cursor: pointer;">
                        <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Status -->
                <div style="padding: 16px; background: linear-gradient(to right, #F9FAFB, white);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 32px;">${status.icon}</span>
                        <div>
                            <span style="display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; ${status.bg}">
                                ${status.label}
                            </span>
                            ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                                <p style="font-size: 12px; color: #6B7280; margin: 8px 0 0 0;">📅 Expected delivery in 2-3 business days</p>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Items -->
                <div style="padding: 16px; border-top: 1px solid #E5E7EB;">
                    <h3 style="font-weight: 700; color: #1F2937; margin: 0 0 12px 0;">📦 Items (${items.length})</h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${items.map(item => `
                            <div style="display: flex; gap: 12px; padding: 12px; background: #F9FAFB; border-radius: 12px;">
                                <div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: #E5E7EB; flex-shrink: 0;">
                                    <img src="${item.image || 'https://via.placeholder.com/100?text=🥒'}" 
                                         style="width: 100%; height: 100%; object-fit: cover;"
                                         onerror="this.src='https://via.placeholder.com/100?text=🥒'">
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <h4 style="font-weight: 600; color: #1F2937; margin: 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name || 'Product'}</h4>
                                    <p style="font-size: 12px; color: #6B7280; margin: 2px 0;">${item.weight || ''}</p>
                                    <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                        <span style="font-size: 14px; color: #6B7280;">Qty: ${item.quantity || 1}</span>
                                        <span style="font-weight: 700; color: #1F2937;">${formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${order.address ? `
                    <!-- Address -->
                    <div style="padding: 16px; border-top: 1px solid #E5E7EB;">
                        <h3 style="font-weight: 700; color: #1F2937; margin: 0 0 8px 0;">📍 Delivery Address</h3>
                        <div style="background: #F9FAFB; padding: 12px; border-radius: 12px;">
                            <p style="font-weight: 600; color: #1F2937; margin: 0;">${order.address.name || 'Customer'}</p>
                            <p style="font-size: 14px; color: #4B5563; margin: 4px 0 0 0;">
                                ${order.address.line1 || ''}<br>
                                ${order.address.line2 ? order.address.line2 + '<br>' : ''}
                                ${order.address.city || ''} - ${order.address.pincode || ''}<br>
                                📞 ${order.address.phone || 'N/A'}
                            </p>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Price Summary -->
                <div style="padding: 16px; border-top: 1px solid #E5E7EB;">
                    <h3 style="font-weight: 700; color: #1F2937; margin: 0 0 12px 0;">💳 Payment Summary</h3>
                    <div style="background: #F9FAFB; padding: 16px; border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; color: #4B5563; font-size: 14px; margin-bottom: 8px;">
                            <span>Subtotal</span>
                            <span>${formatPrice(order.subtotal || order.total)}</span>
                        </div>
                        ${order.walletUsed ? `
                            <div style="display: flex; justify-content: space-between; color: #059669; font-size: 14px; margin-bottom: 8px;">
                                <span>💰 Wallet</span>
                                <span>-${formatPrice(order.walletUsed)}</span>
                            </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; color: #4B5563; font-size: 14px; margin-bottom: 8px;">
                            <span>🚚 Delivery</span>
                            <span>${order.delivery === 0 ? '<span style="color: #059669;">FREE</span>' : formatPrice(order.delivery || 0)}</span>
                        </div>
                        <div style="border-top: 1px solid #E5E7EB; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-weight: 700; color: #1F2937; font-size: 18px;">
                            <span>Total</span>
                            <span>${formatPrice(order.total)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div style="position: sticky; bottom: 0; padding: 16px; background: white; border-top: 1px solid #E5E7EB; display: flex; gap: 12px;">
                    ${order.status === 'delivered' ? `
                        <button onclick="OrdersPage.reorder('${order.id}')" 
                                style="flex: 1; padding: 14px; background: linear-gradient(to right, #F97316, #EF4444); color: white; border-radius: 12px; font-weight: 600; border: none; cursor: pointer;">
                            🔄 Reorder
                        </button>
                    ` : ''}
                    ${order.status === 'pending' ? `
                        <button onclick="OrdersPage.cancelOrder('${order.id}')" 
                                style="flex: 1; padding: 14px; background: white; color: #DC2626; border-radius: 12px; font-weight: 600; border: 2px solid #FECACA; cursor: pointer;">
                            ❌ Cancel
                        </button>
                    ` : ''}
                    <button onclick="OrdersPage.contactSupport('${order.id}')" 
                            style="flex: 1; padding: 14px; background: linear-gradient(to right, #F3F4F6, #E5E7EB); color: #374151; border-radius: 12px; font-weight: 600; border: none; cursor: pointer;">
                        💬 Need Help?
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }
    
    function closeModal() {
        const modal = document.getElementById('order-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }
    
    // ========================================
    // ACTIONS
    // ========================================
    function reorder(orderId) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order || !order.items) return;
        
        order.items.forEach(item => {
            if (typeof Store !== 'undefined' && Store.addToCart) {
                Store.addToCart(item, item.quantity || 1);
            }
        });
        
        closeModal();
        showToast('Items added to cart! 🛒', 'success');
        
        if (typeof UI !== 'undefined' && UI.updateCartUI) {
            UI.updateCartUI();
        }
    }
    
    function cancelOrder(orderId) {
        if (!confirm('Are you sure you want to cancel this order?')) return;
        
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        order.status = 'cancelled';
        order.updatedAt = new Date().toISOString();
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            message: 'Cancelled by customer'
        });
        
        saveOrders(orders);
        closeModal();
        renderOrdersPage();
        showToast('Order cancelled', 'success');
    }
    
    function contactSupport(orderId) {
        window.open(`https://wa.me/919963971447?text=${encodeURIComponent('Hi! I need help with order #' + orderId)}`, '_blank');
    }
    
    function createOrder(orderData) {
        const orders = getOrders();
        const newOrder = {
            id: generateOrderId(),
            ...orderData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            statusHistory: [{ status: 'pending', timestamp: new Date().toISOString(), message: 'Order placed' }]
        };
        orders.unshift(newOrder);
        saveOrders(orders);
        return newOrder;
    }
    
    function addDemoOrders() {
        const demos = [
            {
                id: generateOrderId(),
                items: [
                    { id: 1, name: 'Avakaya Mango Pickle', price: 299, quantity: 2, weight: '500gm' },
                    { id: 2, name: 'Gongura Pickle', price: 249, quantity: 1, weight: '250gm' }
                ],
                subtotal: 847, delivery: 0, total: 847, status: 'delivered',
                createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
                address: { name: 'Demo User', line1: '123 Main St', city: 'Hyderabad', pincode: '500001', phone: '9876543210' },
                statusHistory: [
                    { status: 'pending', timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
                    { status: 'delivered', timestamp: new Date(Date.now() - 3 * 86400000).toISOString() }
                ]
            },
            {
                id: generateOrderId(),
                items: [
                    { id: 3, name: 'Kura Karam', price: 300, quantity: 1, weight: '500gm' }
                ],
                subtotal: 300, delivery: 50, total: 350, status: 'shipped',
                createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
                address: { name: 'Demo User', line1: '456 Market Rd', city: 'Hyderabad', pincode: '500002', phone: '9876543210' },
                statusHistory: [
                    { status: 'pending', timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
                    { status: 'shipped', timestamp: new Date(Date.now() - 12 * 3600000).toISOString() }
                ]
            }
        ];
        
        saveOrders(demos);
        renderOrdersPage();
        showToast('Demo orders added! 🎉', 'success');
    }
    
    function showToast(message, type) {
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(message, type);
        } else {
            const toast = document.createElement('div');
            toast.style.cssText = `position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 12px; color: white; font-weight: 500; z-index: 9999; ${type === 'success' ? 'background: #10B981;' : 'background: #1F2937;'}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }
    
    // ========================================
    // GLOBAL EXPORT
    // ========================================
    window.OrdersPage = {
        init: renderOrdersPage,
        render: renderOrdersPage,
        viewDetails,
        closeModal,
        reorder,
        cancelOrder,
        contactSupport,
        createOrder,
        addDemoOrders,
        getOrders
    };
    
    // ========================================
    // INTERCEPT ORDERS NAV CLICKS
    // ========================================
    function interceptOrdersNav() {
        // Find all possible orders nav elements
        const selectors = [
            '[data-nav="orders"]',
            '[data-page="orders"]',
            '.bottom-nav-item:nth-child(3)',
            'a[href*="orders"]',
            'button:has(svg):has(+ *:contains("Orders"))'
        ];
        
        document.querySelectorAll('.bottom-nav-item, [data-nav], [data-page]').forEach(el => {
            const text = el.textContent?.toLowerCase() || '';
            const page = el.dataset?.nav || el.dataset?.page || '';
            
            if (text.includes('order') || page === 'orders') {
                // Remove existing listeners by cloning
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                
                newEl.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('🛒 Orders nav clicked - rendering orders page');
                    
                    // Update active state
                    document.querySelectorAll('.bottom-nav-item').forEach(item => {
                        item.classList.remove('text-orange-500', 'text-red-500');
                        item.classList.add('text-gray-500');
                    });
                    newEl.classList.remove('text-gray-500');
                    newEl.classList.add('text-orange-500');
                    
                    // Render orders page
                    renderOrdersPage();
                });
                
                console.log('✅ Intercepted orders nav:', newEl);
            }
        });
    }
    
    // ========================================
    // OVERRIDE App.navigateTo if it exists
    // ========================================
    function patchAppNavigation() {
        if (typeof App !== 'undefined' && App.navigateTo) {
            const originalNavigateTo = App.navigateTo;
            
            App.navigateTo = function(page, data) {
                if (page === 'orders') {
                    console.log('🛒 App.navigateTo("orders") intercepted');
                    
                    // Update nav state
                    document.querySelectorAll('.bottom-nav-item').forEach(item => {
                        const itemPage = item.dataset?.nav || item.dataset?.page || item.textContent?.toLowerCase().trim();
                        if (itemPage.includes('order')) {
                            item.classList.remove('text-gray-500');
                            item.classList.add('text-orange-500');
                        } else {
                            item.classList.remove('text-orange-500');
                            item.classList.add('text-gray-500');
                        }
                    });
                    
                    renderOrdersPage();
                    window.scrollTo(0, 0);
                    return;
                }
                
                return originalNavigateTo.call(App, page, data);
            };
            
            console.log('✅ Patched App.navigateTo');
        }
    }
    
    // ========================================
    // INITIALIZE ON DOM READY
    // ========================================
    function init() {
        console.log('🛒 Initializing Orders Patch...');
        interceptOrdersNav();
        patchAppNavigation();
        console.log('✅ Orders Patch Ready!');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Also re-init after a short delay in case app loads dynamically
    setTimeout(init, 500);
    setTimeout(init, 1500);
    
})();
