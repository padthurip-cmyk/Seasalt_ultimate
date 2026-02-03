/**
 * SeaSalt Pickles - Order Save Patch
 * ===================================
 * Add this AFTER all your other JS files in index.html
 * This ensures orders are saved when the "Order Placed" modal shows
 * 
 * Usage: <script src="/js/order-save-patch.js"></script>
 */

(function() {
    'use strict';
    
    console.log('📦 Order Save Patch: Loading...');
    
    // Helper to save order to localStorage
    function saveOrderToStorage(orderData) {
        try {
            const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
            
            // Generate order ID
            const orderId = 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
            
            const newOrder = {
                id: orderId,
                items: orderData.items || [],
                address: orderData.address || {},
                subtotal: orderData.subtotal || 0,
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
            console.error('Failed to save order:', e);
            return null;
        }
    }
    
    // Expose globally for Cart to use
    window.saveOrderToStorage = saveOrderToStorage;
    
    // If Cart module exists, patch the placeOrder function
    if (typeof Cart !== 'undefined') {
        const originalPlaceOrder = Cart.placeOrder;
        
        if (originalPlaceOrder) {
            Cart.placeOrder = function() {
                // Get cart items before clearing
                const cartItems = Store.getCart ? Store.getCart() : [];
                const user = Store.getState ? Store.getState().user : null;
                const cartTotal = Store.getCartTotal ? Store.getCartTotal() : 0;
                const walletUsed = Store.getWalletUsed ? Store.getWalletUsed() : 0;
                const delivery = cartTotal >= 500 ? 0 : 50;
                
                // Save order BEFORE the original function clears cart
                if (cartItems.length > 0) {
                    saveOrderToStorage({
                        items: cartItems.map(item => ({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            weight: item.weight,
                            image: item.image
                        })),
                        address: {
                            name: user?.name || 'Customer',
                            phone: user?.phone || '',
                            address: user?.address || '',
                            city: 'Hyderabad',
                            pincode: user?.pincode || ''
                        },
                        subtotal: cartTotal,
                        delivery: delivery,
                        walletUsed: walletUsed,
                        total: cartTotal + delivery - walletUsed
                    });
                }
                
                // Call original function
                if (typeof originalPlaceOrder === 'function') {
                    return originalPlaceOrder.apply(Cart, arguments);
                }
            };
            
            console.log('📦 Order Save Patch: Cart.placeOrder patched');
        }
    }
    
    // Also watch for order success modal
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // Check if this is an order success modal
                    const text = node.textContent || '';
                    if (text.includes('Order Placed') || text.includes('order placed') || 
                        text.includes('Your delicious pickles') || text.includes('Order Total')) {
                        
                        // Try to extract order total
                        const totalMatch = text.match(/₹([\d,]+)/);
                        const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, '')) : 0;
                        
                        // Check if we need to save (if no orders saved in last 5 seconds)
                        const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
                        const recentOrder = orders[0];
                        const fiveSecondsAgo = Date.now() - 5000;
                        
                        if (!recentOrder || new Date(recentOrder.createdAt).getTime() < fiveSecondsAgo) {
                            // Get cart items if available
                            let items = [];
                            if (typeof Store !== 'undefined' && Store.getCart) {
                                items = Store.getCart();
                            }
                            
                            // Only save if we have items or a total
                            if (items.length > 0 || total > 0) {
                                saveOrderToStorage({
                                    items: items.map(item => ({
                                        id: item.id,
                                        name: item.name,
                                        price: item.price,
                                        quantity: item.quantity,
                                        weight: item.weight,
                                        image: item.image
                                    })),
                                    total: total || items.reduce((sum, i) => sum + (i.price * i.quantity), 0),
                                    subtotal: items.reduce((sum, i) => sum + (i.price * i.quantity), 0),
                                    delivery: 0
                                });
                            }
                        }
                    }
                }
            });
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('📦 Order Save Patch: Ready!');
    
})();
