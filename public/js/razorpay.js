/**
 * SeaSalt Pickles - Razorpay Payment Integration
 * ===============================================
 * 
 * SETUP:
 * 1. Add to index.html before </head>:
 *    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
 * 
 * 2. Add this file after other scripts:
 *    <script src="/js/razorpay.js"></script>
 * 
 * 3. Update RAZORPAY_KEY_ID with your key
 */

const RazorpayPayment = (function() {
    'use strict';
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    // Razorpay Key ID (Live Mode)
    const RAZORPAY_KEY_ID = 'rzp_live_yjiOeJIzOI1s5k';
    
    // Business details
    const BUSINESS = {
        name: 'SeaSalt Pickles',
        description: 'Authentic Andhra Pickles',
        logo: 'https://seasaltultimate.netlify.app/images/logo.png', // Update with your logo URL
        theme_color: '#EA580C'
    };
    
    // ============================================
    // PAYMENT HANDLER
    // ============================================
    
    /**
     * Initiate Razorpay Payment
     * @param {Object} options - Payment options
     * @param {number} options.amount - Amount in rupees (will be converted to paise)
     * @param {string} options.orderId - Your internal order ID
     * @param {Object} options.customer - Customer details
     * @param {string} options.customer.name - Customer name
     * @param {string} options.customer.email - Customer email (optional)
     * @param {string} options.customer.phone - Customer phone
     * @param {Function} options.onSuccess - Callback on successful payment
     * @param {Function} options.onFailure - Callback on failed payment
     */
    function initiatePayment(options) {
        const {
            amount,
            orderId,
            customer = {},
            onSuccess,
            onFailure
        } = options;
        
        // Validate
        if (!amount || amount <= 0) {
            console.error('Invalid amount');
            if (onFailure) onFailure({ error: 'Invalid amount' });
            return;
        }
        
        // Convert to paise (Razorpay uses smallest currency unit)
        const amountInPaise = Math.round(amount * 100);
        
        // Razorpay options
        const rzpOptions = {
            key: RAZORPAY_KEY_ID,
            amount: amountInPaise,
            currency: 'INR',
            name: BUSINESS.name,
            description: options.description || BUSINESS.description,
            image: BUSINESS.logo,
            order_id: options.razorpayOrderId || '', // From backend if using Orders API
            prefill: {
                name: customer.name || '',
                email: customer.email || '',
                contact: customer.phone || ''
            },
            notes: {
                order_id: orderId,
                customer_phone: customer.phone || ''
            },
            theme: {
                color: BUSINESS.theme_color
            },
            handler: function(response) {
                // Payment successful
                console.log('✅ Payment Success:', response);
                
                const paymentData = {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    order_id: orderId,
                    amount: amount
                };
                
                // Save order
                saveOrder(orderId, amount, paymentData);
                
                // Show success
                showPaymentSuccess(amount, response.razorpay_payment_id);
                
                // Callback
                if (onSuccess) onSuccess(paymentData);
            },
            modal: {
                ondismiss: function() {
                    console.log('Payment modal closed');
                    if (onFailure) onFailure({ error: 'Payment cancelled by user' });
                }
            }
        };
        
        // Create Razorpay instance
        try {
            const rzp = new Razorpay(rzpOptions);
            
            rzp.on('payment.failed', function(response) {
                console.error('❌ Payment Failed:', response.error);
                
                showPaymentFailure(response.error.description);
                
                if (onFailure) onFailure(response.error);
            });
            
            // Open payment modal
            rzp.open();
            
        } catch (error) {
            console.error('Razorpay Error:', error);
            if (onFailure) onFailure({ error: 'Failed to initialize payment' });
        }
    }
    
    // ============================================
    // CHECKOUT INTEGRATION
    // ============================================
    
    /**
     * Process checkout with Razorpay
     * Call this from your cart checkout
     */
    function processCheckout(cartData, addressData) {
        const {
            items = [],
            subtotal = 0,
            delivery = 0,
            walletUsed = 0,
            total = 0
        } = cartData;
        
        // Get user info
        const user = (typeof Store !== 'undefined' && Store.getState) 
            ? Store.getState().user 
            : {};
        
        // Generate order ID
        const orderId = 'SS' + Date.now().toString(36).toUpperCase() + 
                        Math.random().toString(36).substr(2, 4).toUpperCase();
        
        // If total is 0 or fully paid by wallet, skip payment
        if (total <= 0) {
            // Direct order (wallet covered everything)
            completeOrder({
                orderId,
                items,
                subtotal,
                delivery,
                walletUsed,
                total: 0,
                address: addressData,
                paymentMethod: 'wallet'
            });
            return;
        }
        
        // Initiate Razorpay payment
        initiatePayment({
            amount: total,
            orderId: orderId,
            description: `Order ${orderId} - ${items.length} item(s)`,
            customer: {
                name: addressData?.name || user?.name || 'Customer',
                email: addressData?.email || '',
                phone: addressData?.phone || user?.phone?.replace(/^\+\d+/, '') || ''
            },
            onSuccess: (paymentData) => {
                completeOrder({
                    orderId,
                    items,
                    subtotal,
                    delivery,
                    walletUsed,
                    total,
                    address: addressData,
                    paymentMethod: 'razorpay',
                    paymentId: paymentData.razorpay_payment_id
                });
            },
            onFailure: (error) => {
                console.log('Payment failed or cancelled:', error);
                // User can retry
            }
        });
    }
    
    /**
     * Complete order after successful payment
     */
    function completeOrder(orderData) {
        // Save to localStorage
        const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        
        const newOrder = {
            id: orderData.orderId,
            items: orderData.items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                weight: item.weight,
                image: item.image
            })),
            address: orderData.address,
            subtotal: orderData.subtotal,
            delivery: orderData.delivery,
            walletUsed: orderData.walletUsed,
            total: orderData.total,
            paymentMethod: orderData.paymentMethod,
            paymentId: orderData.paymentId || null,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        orders.unshift(newOrder);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));
        
        // Deduct wallet if used
        if (orderData.walletUsed > 0 && typeof Store !== 'undefined' && Store.deductFromWallet) {
            Store.deductFromWallet(orderData.walletUsed);
        }
        
        // Clear cart
        if (typeof Store !== 'undefined' && Store.clearCart) {
            Store.clearCart();
        }
        
        // Update UI
        if (typeof UI !== 'undefined' && UI.updateCartUI) {
            UI.updateCartUI();
        }
        
        console.log('✅ Order completed:', newOrder);
    }
    
    // ============================================
    // SAVE ORDER
    // ============================================
    
    function saveOrder(orderId, amount, paymentData) {
        // Get cart data
        let items = [];
        let subtotal = amount;
        
        if (typeof Store !== 'undefined' && Store.getCart) {
            const cart = Store.getCart();
            if (Array.isArray(cart)) {
                items = cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    weight: item.weight,
                    image: item.image
                }));
                subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }
        }
        
        // Get user
        const user = (typeof Store !== 'undefined' && Store.getState) 
            ? Store.getState().user 
            : {};
        
        // Save order
        const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        
        const newOrder = {
            id: orderId,
            items: items,
            subtotal: subtotal,
            delivery: 0,
            total: amount,
            paymentMethod: 'razorpay',
            paymentId: paymentData.razorpay_payment_id,
            status: 'pending',
            createdAt: new Date().toISOString(),
            address: {
                name: user?.name || 'Customer',
                phone: user?.phone || ''
            }
        };
        
        orders.unshift(newOrder);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));
        
        // Clear cart
        if (typeof Store !== 'undefined' && Store.clearCart) {
            Store.clearCart();
        }
        
        // Update UI
        if (typeof UI !== 'undefined' && UI.updateCartUI) {
            UI.updateCartUI();
        }
    }
    
    // ============================================
    // UI HELPERS
    // ============================================
    
    function showPaymentSuccess(amount, paymentId) {
        // Remove any existing modal
        const existing = document.getElementById('payment-success-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'payment-success-modal';
        modal.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div style="background:white;border-radius:20px;padding:32px;text-align:center;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                    <div style="font-size:64px;margin-bottom:16px;">🎉</div>
                    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1F2937;">Order Placed!</h2>
                    <p style="margin:0 0 16px;color:#6B7280;">Your delicious pickles are on the way!</p>
                    <div style="background:#FEF3C7;border-radius:12px;padding:16px;margin-bottom:20px;">
                        <p style="margin:0;font-size:14px;color:#92400E;">Order Total</p>
                        <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:#D97706;">₹${amount}</p>
                    </div>
                    <p style="font-size:12px;color:#9CA3AF;margin-bottom:20px;">Payment ID: ${paymentId}</p>
                    <button onclick="document.getElementById('payment-success-modal').remove();" 
                            style="width:100%;padding:16px;background:linear-gradient(135deg,#F97316,#EA580C);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">
                        Continue Shopping
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    function showPaymentFailure(message) {
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(message || 'Payment failed. Please try again.', 'error');
        } else {
            alert(message || 'Payment failed. Please try again.');
        }
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    return {
        pay: initiatePayment,
        checkout: processCheckout,
        
        // Quick pay button helper
        createPayButton: function(containerId, amount, buttonText = 'Pay Now') {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = `
                <button id="rzp-pay-btn" style="
                    padding: 16px 32px;
                    background: linear-gradient(135deg, #3B82F6, #2563EB);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
                ">
                    ${buttonText} - ₹${amount}
                </button>
            `;
            
            document.getElementById('rzp-pay-btn').onclick = () => {
                initiatePayment({
                    amount: amount,
                    orderId: 'ORD' + Date.now(),
                    onSuccess: (data) => console.log('Payment success:', data),
                    onFailure: (err) => console.log('Payment failed:', err)
                });
            };
        }
    };
})();

// Make globally available
window.RazorpayPayment = RazorpayPayment;

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Example 1: Simple payment
RazorpayPayment.pay({
    amount: 599,
    orderId: 'ORDER123',
    customer: {
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@example.com'
    },
    onSuccess: (data) => {
        console.log('Payment successful!', data);
    },
    onFailure: (error) => {
        console.log('Payment failed', error);
    }
});

// Example 2: Checkout integration (call from your cart)
RazorpayPayment.checkout(
    {
        items: cartItems,
        subtotal: 500,
        delivery: 50,
        walletUsed: 0,
        total: 550
    },
    {
        name: 'John Doe',
        phone: '9876543210',
        address: '123 Main St',
        city: 'Hyderabad',
        pincode: '500001'
    }
);

// Example 3: Add a pay button to page
RazorpayPayment.createPayButton('pay-button-container', 299, 'Buy Now');
*/
