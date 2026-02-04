/**
 * SeaSalt Pickles - Cart & Checkout Module
 * =========================================
 * Handles cart operations and Razorpay checkout integration.
 */

const Cart = (function() {
    // ============================================
    // STATE
    // ============================================
    let checkoutInProgress = false;
    
    // Razorpay Key (Test Mode)
    const RAZORPAY_KEY = 'rzp_test_SC97Hjqvf4LjoW';
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function init() {
        bindEvents();
        subscribeToChanges();
    }
    
    function bindEvents() {
        const elements = UI.getElements();
        
        // Cart button
        elements.cartBtn.addEventListener('click', () => {
            UI.openCart();
            UI.renderCartItems();
        });
        
        // Close cart
        document.getElementById('close-cart').addEventListener('click', UI.closeCart);
        document.getElementById('cart-overlay').addEventListener('click', UI.closeCart);
        
        // Use wallet checkbox
        elements.useWalletCheckbox.addEventListener('change', (e) => {
            Store.setUseWallet(e.target.checked);
            UI.updateCartTotals();
        });
        
        // Checkout button
        document.getElementById('checkout-btn').addEventListener('click', handleCheckout);
        
        // Product modal events
        bindProductModalEvents();
    }
    
    function bindProductModalEvents() {
        const elements = UI.getElements();
        
        // Close modal
        document.getElementById('close-product-modal').addEventListener('click', UI.closeProductModal);
        document.getElementById('product-modal-overlay').addEventListener('click', UI.closeProductModal);
        
        // Quantity controls
        document.getElementById('qty-decrease').addEventListener('click', () => {
            const current = Store.getState().quantity || 1;
            if (current > 1) {
                Store.setQuantity(current - 1);
                elements.qtyValue.textContent = current - 1;
                UI.updateModalPrice();
            }
        });
        
        document.getElementById('qty-increase').addEventListener('click', () => {
            const current = Store.getState().quantity || 1;
            if (current < CONFIG.CART.MAX_QUANTITY_PER_ITEM) {
                Store.setQuantity(current + 1);
                elements.qtyValue.textContent = current + 1;
                UI.updateModalPrice();
            }
        });
        
        // Add to cart
        document.getElementById('add-to-cart-btn').addEventListener('click', handleAddToCart);
    }
    
    function subscribeToChanges() {
        Store.subscribe('cart', () => {
            UI.updateCartUI();
        });
        
        Store.subscribe('wallet', () => {
            UI.updateCartUI();
        });
    }
    
    // ============================================
    // CART OPERATIONS
    // ============================================
    
    function handleAddToCart() {
        const state = Store.getState();
        const product = state.selectedProduct;
        const variant = state.selectedVariant;
        const quantity = state.quantity || 1;
        
        if (!product || !variant) {
            UI.showToast('Please select a variant', 'error');
            return;
        }
        
        Store.addToCart(product, variant, quantity);
        UI.updateCartUI();
        UI.closeProductModal();
        
        UI.showToast(`${product.name} added to cart`, 'success');
    }
    
    // ============================================
    // CHECKOUT
    // ============================================
    
    async function handleCheckout() {
        if (checkoutInProgress) return;
        
        const cart = Store.getCart();
        
        // Validate cart
        if (!cart || !cart.items || cart.items.length === 0) {
            UI.showToast('Your cart is empty', 'error');
            return;
        }
        
        if (cart.subtotal < CONFIG.CART.MIN_ORDER_VALUE) {
            UI.showToast(`Minimum order value is ${CONFIG.formatPrice(CONFIG.CART.MIN_ORDER_VALUE)}`, 'error');
            return;
        }
        
        // Check if user is authenticated
        const user = Store.getState().user;
        if (!user) {
            // Show phone input for quick checkout
            showQuickAuth();
            return;
        }
        
        // Show checkout form
        showCheckoutForm();
    }
    
    function showQuickAuth() {
        // Create quick auth modal
        const modal = document.createElement('div');
        modal.id = 'quick-auth-modal';
        modal.className = 'fixed inset-0 z-[95] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div class="relative bg-white rounded-2xl p-6 w-full max-w-sm animate-bounce-in">
                <button class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center close-modal">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                
                <h3 class="font-display text-xl font-bold text-gray-800 mb-4">Quick Checkout</h3>
                <p class="text-gray-600 text-sm mb-4">Enter your phone number to continue</p>
                
                <div class="space-y-4">
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+91</span>
                        <input type="tel" id="checkout-phone" maxlength="10" placeholder="Enter mobile number"
                            class="w-full py-4 pl-14 pr-4 bg-gray-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-pickle-500 focus:bg-white">
                    </div>
                    <button id="continue-checkout" class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 transition-all">
                        Continue to Checkout
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event handlers
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('.absolute').addEventListener('click', () => modal.remove());
        
        const phoneInput = modal.querySelector('#checkout-phone');
        phoneInput.focus();
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });
        
        modal.querySelector('#continue-checkout').addEventListener('click', () => {
            const phone = phoneInput.value.trim();
            if (phone.length !== 10) {
                UI.showToast('Please enter a valid phone number', 'error');
                return;
            }
            
            // Save user (simplified auth for checkout)
            Store.setUser({ phone: `+91${phone}` });
            modal.remove();
            showCheckoutForm();
        });
    }
    
    function showCheckoutForm() {
        const cart = Store.getCart();
        const user = Store.getState().user;
        
        // Create checkout modal
        const modal = document.createElement('div');
        modal.id = 'checkout-modal';
        modal.className = 'fixed inset-0 z-[95] overflow-y-auto';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div class="relative min-h-full flex items-start justify-center p-4 py-10">
                <div class="bg-white rounded-2xl w-full max-w-lg animate-slide-up">
                    <!-- Header -->
                    <div class="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl z-10">
                        <h3 class="font-display text-xl font-bold text-gray-800">Checkout</h3>
                        <button class="close-checkout w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    
                    <!-- Content -->
                    <div class="p-4 space-y-4">
                        <!-- Order Summary -->
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="font-semibold text-gray-800 mb-3">Order Summary</h4>
                            <div class="space-y-2 text-sm">
                                ${cart.items.map(item => `
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">${item.name} (${item.weight}) × ${item.quantity}</span>
                                        <span class="font-medium">${CONFIG.formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                `).join('')}
                                <div class="border-t pt-2 mt-2">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Subtotal</span>
                                        <span class="font-medium">${CONFIG.formatPrice(cart.subtotal)}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Delivery</span>
                                        <span class="font-medium">${cart.deliveryCharge === 0 ? 'FREE' : CONFIG.formatPrice(cart.deliveryCharge)}</span>
                                    </div>
                                    ${cart.walletDiscount > 0 ? `
                                    <div class="flex justify-between text-spice-gold">
                                        <span>Wallet Discount</span>
                                        <span class="font-medium">-${CONFIG.formatPrice(cart.walletDiscount)}</span>
                                    </div>
                                    ` : ''}
                                    <div class="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                                        <span>Total</span>
                                        <span class="text-pickle-600">${CONFIG.formatPrice(cart.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Delivery Address -->
                        <div>
                            <h4 class="font-semibold text-gray-800 mb-3">Delivery Address</h4>
                            <div class="space-y-3">
                                <input type="text" id="checkout-name" placeholder="Full Name" 
                                    class="w-full py-3 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pickle-500 focus:bg-white">
                                <input type="text" id="checkout-pincode" maxlength="6" placeholder="Pincode" 
                                    class="w-full py-3 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pickle-500 focus:bg-white">
                                <textarea id="checkout-address" placeholder="Full Address" rows="2"
                                    class="w-full py-3 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pickle-500 focus:bg-white resize-none"></textarea>
                                <div class="grid grid-cols-2 gap-3">
                                    <input type="text" id="checkout-city" placeholder="City" 
                                        class="w-full py-3 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pickle-500 focus:bg-white">
                                    <input type="text" id="checkout-state" placeholder="State" 
                                        class="w-full py-3 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pickle-500 focus:bg-white">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="sticky bottom-0 bg-white p-4 border-t border-gray-100 rounded-b-2xl">
                        <button id="pay-now-btn" class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 transition-all flex items-center justify-center gap-2">
                            <span>Pay ${CONFIG.formatPrice(cart.total)}</span>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Close cart sidebar
        UI.closeCart();
        
        // Event handlers
        modal.querySelector('.close-checkout').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
        
        // Pincode validation
        const pincodeInput = modal.querySelector('#checkout-pincode');
        pincodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });
        
        // Pay button - NOW USES RAZORPAY
        modal.querySelector('#pay-now-btn').addEventListener('click', () => {
            processPaymentWithRazorpay(modal);
        });
    }
    
    // ============================================
    // RAZORPAY PAYMENT - MAIN FUNCTION
    // ============================================
    
    async function processPaymentWithRazorpay(modal) {
        // Validate form
        const name = modal.querySelector('#checkout-name').value.trim();
        const pincode = modal.querySelector('#checkout-pincode').value.trim();
        const address = modal.querySelector('#checkout-address').value.trim();
        const city = modal.querySelector('#checkout-city').value.trim();
        const state = modal.querySelector('#checkout-state').value.trim();
        
        if (!name || !pincode || !address || !city || !state) {
            UI.showToast('Please fill all address fields', 'error');
            return;
        }
        
        if (pincode.length !== 6) {
            UI.showToast('Please enter a valid 6-digit pincode', 'error');
            return;
        }
        
        checkoutInProgress = true;
        const payBtn = modal.querySelector('#pay-now-btn');
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="animate-spin">⏳</span> Processing...';
        
        const cart = Store.getCart();
        const user = Store.getState().user;
        
        // Generate order ID
        const orderId = 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
        
        // Create order data
        const orderData = {
            orderId: orderId,
            user: {
                phone: user.phone,
                name: name
            },
            address: {
                fullName: name,
                phone: user.phone,
                address: address,
                city: city,
                state: state,
                pincode: pincode
            },
            items: cart.items,
            subtotal: cart.subtotal,
            deliveryCharge: cart.deliveryCharge,
            walletDiscount: cart.walletDiscount,
            total: cart.total,
            useWallet: cart.useWallet
        };
        
        // If total is 0 (wallet covers everything), skip Razorpay
        if (cart.total <= 0) {
            completeOrder(orderData, modal, 'wallet', 'Paid with Wallet');
            return;
        }
        
        // Open Razorpay
        try {
            const options = {
                key: RAZORPAY_KEY,
                amount: cart.total * 100, // Amount in paise
                currency: 'INR',
                name: 'SeaSalt Pickles',
                description: 'Order ' + orderId,
                image: 'https://seasaltultimate.netlify.app/images/logo.png',
                prefill: {
                    name: name,
                    contact: user.phone ? user.phone.replace(/^\+91/, '') : ''
                },
                notes: {
                    order_id: orderId,
                    address: address + ', ' + city
                },
                theme: {
                    color: '#D4451A'
                },
                handler: function(response) {
                    // Payment successful!
                    console.log('✅ Razorpay Payment Success:', response);
                    completeOrder(orderData, modal, 'razorpay', response.razorpay_payment_id);
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment cancelled by user');
                        payBtn.disabled = false;
                        payBtn.innerHTML = `<span>Pay ${CONFIG.formatPrice(cart.total)}</span>`;
                        checkoutInProgress = false;
                    }
                }
            };
            
            if (typeof Razorpay === 'undefined') {
                throw new Error('Razorpay not loaded');
            }
            
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function(response) {
                console.error('❌ Payment Failed:', response.error);
                UI.showToast('Payment failed: ' + response.error.description, 'error');
                payBtn.disabled = false;
                payBtn.innerHTML = `<span>Pay ${CONFIG.formatPrice(cart.total)}</span>`;
                checkoutInProgress = false;
            });
            
            // Open Razorpay payment modal
            rzp.open();
            
        } catch (error) {
            console.error('Razorpay Error:', error);
            UI.showToast('Payment initialization failed. Please try again.', 'error');
            payBtn.disabled = false;
            payBtn.innerHTML = `<span>Pay ${CONFIG.formatPrice(cart.total)}</span>`;
            checkoutInProgress = false;
        }
    }
    
    // ============================================
    // COMPLETE ORDER AFTER PAYMENT
    // ============================================
    
    function completeOrder(orderData, modal, paymentMethod, paymentId) {
        // Save order to localStorage
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
            delivery: orderData.deliveryCharge,
            walletUsed: orderData.walletDiscount,
            total: orderData.total,
            paymentMethod: paymentMethod,
            paymentId: paymentId,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };
        
        orders.unshift(newOrder);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));
        
        // Deduct wallet if used
        if (orderData.walletDiscount > 0) {
            Store.deductFromWallet(orderData.walletDiscount, 'Order Payment');
        }
        
        // Clear cart
        Store.clearCart();
        UI.updateCartUI();
        UI.closeCart();
        
        // Close checkout modal
        modal.remove();
        document.body.style.overflow = '';
        
        // Show success
        showOrderSuccess(orderData, paymentId);
        
        checkoutInProgress = false;
    }
    
    function showOrderSuccess(orderData, paymentId) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div class="relative bg-white rounded-2xl p-8 w-full max-w-sm text-center animate-bounce-in">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="font-display text-2xl font-bold text-gray-800 mb-2">Order Placed!</h3>
                <p class="text-gray-600 mb-4">Your delicious pickles are on the way!</p>
                <div class="bg-pickle-50 rounded-xl p-4 mb-4">
                    <p class="text-sm text-gray-600 mb-1">Order Total</p>
                    <p class="text-2xl font-bold text-pickle-600">${CONFIG.formatPrice(orderData.total)}</p>
                </div>
                ${paymentId ? `<p class="text-xs text-gray-400 mb-4">Payment ID: ${paymentId}</p>` : ''}
                <button class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 transition-all" id="order-success-close">
                    Continue Shopping
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#order-success-close').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    return {
        init,
        addToCart: handleAddToCart,
        checkout: handleCheckout,
        placeOrder: processPaymentWithRazorpay
    };
})();

// Make Cart globally available
window.Cart = Cart;
