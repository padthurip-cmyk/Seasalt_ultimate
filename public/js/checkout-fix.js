/**
 * SeaSalt Pickles - Checkout with Razorpay Integration
 * =====================================================
 * This file intercepts the checkout process and adds Razorpay payment
 * 
 * Add this AFTER razorpay.js in your index.html:
 * <script src="js/razorpay.js"></script>
 * <script src="js/checkout-fix.js"></script>
 */

(function() {
    'use strict';
    
    console.log('💳 Checkout Fix: Initializing Razorpay integration...');
    
    // Wait for DOM to be ready
    function init() {
        const checkoutBtn = document.getElementById('checkout-btn');
        
        if (!checkoutBtn) {
            console.log('Checkout button not found, retrying...');
            setTimeout(init, 500);
            return;
        }
        
        console.log('✅ Checkout Fix: Found checkout button, attaching Razorpay handler');
        
        // Remove existing click handlers and add our own
        const newCheckoutBtn = checkoutBtn.cloneNode(true);
        checkoutBtn.parentNode.replaceChild(newCheckoutBtn, checkoutBtn);
        
        newCheckoutBtn.addEventListener('click', handleCheckout);
    }
    
    function handleCheckout(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('💳 Checkout clicked - initiating Razorpay payment');
        
        // Get cart data
        const cart = getCartData();
        
        if (!cart || cart.items.length === 0) {
            showToast('Your cart is empty!', 'error');
            return;
        }
        
        // Check minimum order value
        if (cart.total < 199) {
            showToast('Minimum order value is ₹199', 'error');
            return;
        }
        
        // If total is 0 (fully paid by wallet), place order directly
        if (cart.total <= 0) {
            placeOrderDirectly(cart);
            return;
        }
        
        // Initiate Razorpay payment
        initiateRazorpayPayment(cart);
    }
    
    function getCartData() {
        try {
            // Try to get cart from Store
            let items = [];
            let subtotal = 0;
            let walletUsed = 0;
            let delivery = 50;
            
            // Get cart items
            if (typeof Store !== 'undefined' && Store.getCart) {
                const cartData = Store.getCart();
                if (Array.isArray(cartData)) {
                    items = cartData;
                } else if (cartData && typeof cartData === 'object') {
                    items = Object.values(cartData);
                }
            }
            
            // Fallback: try localStorage
            if (items.length === 0) {
                const savedCart = localStorage.getItem('seasalt_cart');
                if (savedCart) {
                    const parsed = JSON.parse(savedCart);
                    items = Array.isArray(parsed) ? parsed : Object.values(parsed);
                }
            }
            
            // Calculate subtotal
            subtotal = items.reduce((sum, item) => {
                const price = item.price || 0;
                const qty = item.quantity || 1;
                return sum + (price * qty);
            }, 0);
            
            // Get wallet usage from UI
            const useWalletCheckbox = document.getElementById('use-wallet');
            const walletBalanceEl = document.getElementById('wallet-balance');
            
            if (useWalletCheckbox && useWalletCheckbox.checked && walletBalanceEl) {
                const walletBalance = parseInt(walletBalanceEl.textContent.replace(/[₹,]/g, '')) || 0;
                walletUsed = Math.min(walletBalance, subtotal + delivery);
            }
            
            // Free delivery above 500
            if (subtotal >= 500) {
                delivery = 0;
            }
            
            const total = Math.max(0, subtotal + delivery - walletUsed);
            
            return {
                items,
                subtotal,
                delivery,
                walletUsed,
                total
            };
        } catch (error) {
            console.error('Error getting cart data:', error);
            return null;
        }
    }
    
    function initiateRazorpayPayment(cart) {
        // Generate order ID
        const orderId = 'SS' + Date.now().toString(36).toUpperCase() + 
                        Math.random().toString(36).substr(2, 4).toUpperCase();
        
        // Get user info
        let userName = 'Customer';
        let userPhone = '';
        let userEmail = '';
        
        if (typeof Store !== 'undefined' && Store.getState) {
            const state = Store.getState();
            if (state.user) {
                userName = state.user.name || 'Customer';
                userPhone = (state.user.phone || '').replace(/^\+\d+/, '');
                userEmail = state.user.email || '';
            }
        }
        
        // Razorpay options
        const options = {
            key: 'rzp_live_yjiOeJIzOI1s5k', // Your Razorpay Key ID
            amount: cart.total * 100, // Amount in paise
            currency: 'INR',
            name: 'SeaSalt Pickles',
            description: `Order ${orderId} - ${cart.items.length} item(s)`,
            image: 'https://seasaltultimate.netlify.app/images/logo.png',
            prefill: {
                name: userName,
                email: userEmail,
                contact: userPhone
            },
            notes: {
                order_id: orderId,
                items_count: cart.items.length
            },
            theme: {
                color: '#D4451A'
            },
            handler: function(response) {
                // Payment successful
                console.log('✅ Payment Success:', response);
                onPaymentSuccess(cart, orderId, response);
            },
            modal: {
                ondismiss: function() {
                    console.log('Payment modal closed');
                    showToast('Payment cancelled', 'info');
                }
            }
        };
        
        try {
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function(response) {
                console.error('❌ Payment Failed:', response.error);
                showToast('Payment failed: ' + response.error.description, 'error');
            });
            
            // Close cart sidebar before opening Razorpay
            const cartSidebar = document.getElementById('cart-sidebar');
            if (cartSidebar) {
                cartSidebar.classList.add('hidden');
            }
            
            // Open Razorpay payment modal
            rzp.open();
            
        } catch (error) {
            console.error('Razorpay Error:', error);
            showToast('Failed to initialize payment. Please try again.', 'error');
        }
    }
    
    function onPaymentSuccess(cart, orderId, paymentResponse) {
        // Save order to localStorage
        const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        
        const newOrder = {
            id: orderId,
            items: cart.items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                weight: item.weight,
                image: item.image
            })),
            subtotal: cart.subtotal,
            delivery: cart.delivery,
            walletUsed: cart.walletUsed,
            total: cart.total,
            paymentMethod: 'razorpay',
            paymentId: paymentResponse.razorpay_payment_id,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };
        
        orders.unshift(newOrder);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));
        
        // Deduct wallet if used
        if (cart.walletUsed > 0 && typeof Store !== 'undefined' && Store.deductFromWallet) {
            Store.deductFromWallet(cart.walletUsed);
        }
        
        // Clear cart
        if (typeof Store !== 'undefined' && Store.clearCart) {
            Store.clearCart();
        }
        localStorage.removeItem('seasalt_cart');
        
        // Update UI
        if (typeof UI !== 'undefined' && UI.updateCartUI) {
            UI.updateCartUI();
        }
        
        // Close cart sidebar
        const cartSidebar = document.getElementById('cart-sidebar');
        if (cartSidebar) {
            cartSidebar.classList.add('hidden');
        }
        
        // Show success modal
        showSuccessModal(cart.total, paymentResponse.razorpay_payment_id);
    }
    
    function placeOrderDirectly(cart) {
        // For orders fully paid by wallet (total = 0)
        const orderId = 'SS' + Date.now().toString(36).toUpperCase() + 
                        Math.random().toString(36).substr(2, 4).toUpperCase();
        
        const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        
        const newOrder = {
            id: orderId,
            items: cart.items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                weight: item.weight,
                image: item.image
            })),
            subtotal: cart.subtotal,
            delivery: cart.delivery,
            walletUsed: cart.walletUsed,
            total: 0,
            paymentMethod: 'wallet',
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };
        
        orders.unshift(newOrder);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));
        
        // Deduct wallet
        if (typeof Store !== 'undefined' && Store.deductFromWallet) {
            Store.deductFromWallet(cart.walletUsed);
        }
        
        // Clear cart
        if (typeof Store !== 'undefined' && Store.clearCart) {
            Store.clearCart();
        }
        localStorage.removeItem('seasalt_cart');
        
        // Update UI
        if (typeof UI !== 'undefined' && UI.updateCartUI) {
            UI.updateCartUI();
        }
        
        // Close cart sidebar
        const cartSidebar = document.getElementById('cart-sidebar');
        if (cartSidebar) {
            cartSidebar.classList.add('hidden');
        }
        
        // Show success
        showSuccessModal(0, 'Paid with Wallet');
    }
    
    function showSuccessModal(amount, paymentId) {
        // Remove any existing modal
        const existing = document.getElementById('payment-success-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'payment-success-modal';
        modal.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div style="background:white;border-radius:24px;padding:32px;text-align:center;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:bounceIn 0.5s ease;">
                    <div style="font-size:72px;margin-bottom:16px;">🎉</div>
                    <h2 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#1F2937;">Order Placed!</h2>
                    <p style="margin:0 0 20px;color:#6B7280;font-size:15px;">Your delicious pickles are on the way!</p>
                    <div style="background:#FEF3C7;border-radius:16px;padding:20px;margin-bottom:24px;">
                        <p style="margin:0;font-size:14px;color:#92400E;">Order Total</p>
                        <p style="margin:6px 0 0;font-size:36px;font-weight:800;color:#D97706;">₹${amount}</p>
                    </div>
                    ${paymentId ? `<p style="font-size:11px;color:#9CA3AF;margin-bottom:20px;">Payment ID: ${paymentId}</p>` : ''}
                    <button onclick="document.getElementById('payment-success-modal').remove();" 
                            style="width:100%;padding:16px;background:linear-gradient(135deg,#F97316,#EA580C);color:white;border:none;border-radius:14px;font-size:17px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(249,115,22,0.4);">
                        Continue Shopping
                    </button>
                </div>
            </div>
            <style>
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); opacity: 1; }
                }
            </style>
        `;
        document.body.appendChild(modal);
    }
    
    function showToast(message, type) {
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(message, type);
            return;
        }
        
        // Fallback toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 99999;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#6B7280'};
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('💳 Checkout Fix: Loaded successfully');
})();
