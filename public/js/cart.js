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
        if (cart.items.length === 0) {
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
                    
                    <div class="p-4 space-y-4">
                        <!-- Delivery Address -->
                        <div class="checkout-section">
                            <h4 class="checkout-section-title">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                Delivery Address
                            </h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="form-label">Full Name</label>
                                    <input type="text" id="checkout-name" class="form-input" placeholder="Enter your full name">
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="form-label">Phone</label>
                                        <input type="tel" id="checkout-phone-display" class="form-input" value="${user.phone.replace('+91', '')}" readonly>
                                    </div>
                                    <div>
                                        <label class="form-label">Pincode</label>
                                        <input type="text" id="checkout-pincode" maxlength="6" class="form-input" placeholder="6-digit pincode">
                                    </div>
                                </div>
                                <div>
                                    <label class="form-label">Address</label>
                                    <textarea id="checkout-address" class="form-input" rows="3" placeholder="House/Flat No, Building, Street, Area"></textarea>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="form-label">City</label>
                                        <input type="text" id="checkout-city" class="form-input" placeholder="City">
                                    </div>
                                    <div>
                                        <label class="form-label">State</label>
                                        <input type="text" id="checkout-state" class="form-input" placeholder="State">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Order Summary -->
                        <div class="checkout-section">
                            <h4 class="checkout-section-title">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                                Order Summary
                            </h4>
                            <div class="space-y-2 text-sm">
                                ${cart.items.map(item => `
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">${item.name} (${item.size}) × ${item.quantity}</span>
                                        <span class="font-medium">${CONFIG.formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                `).join('')}
                                <hr class="my-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Subtotal</span>
                                    <span class="font-medium">${CONFIG.formatPrice(cart.subtotal)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Delivery</span>
                                    <span class="font-medium">${cart.deliveryCharge === 0 ? '<span class="text-spice-leaf">FREE</span>' : CONFIG.formatPrice(cart.deliveryCharge)}</span>
                                </div>
                                ${cart.walletDiscount > 0 ? `
                                    <div class="flex justify-between text-spice-gold">
                                        <span>Wallet Discount</span>
                                        <span class="font-medium">-${CONFIG.formatPrice(cart.walletDiscount)}</span>
                                    </div>
                                ` : ''}
                                <hr class="my-2">
                                <div class="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span class="text-pickle-600">${CONFIG.formatPrice(cart.total)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Pay Button -->
                        <button id="pay-now-btn" class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 transition-all flex items-center justify-center gap-2">
                            <span>Pay ${CONFIG.formatPrice(cart.total)}</span>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                        </button>
                        
                        <p class="text-center text-xs text-gray-500">
                            By placing this order, you agree to our Terms & Conditions
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Close handlers
        const closeCheckout = () => {
            modal.remove();
            document.body.style.overflow = '';
        };
        
        modal.querySelector('.close-checkout').addEventListener('click', closeCheckout);
        
        // Pincode validation
        const pincodeInput = modal.querySelector('#checkout-pincode');
        pincodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });
        
        // Pay button
        modal.querySelector('#pay-now-btn').addEventListener('click', () => {
            processPayment(modal);
        });
    }
    
    async function processPayment(modal) {
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
        
        // Create order data
        const orderData = {
            user: {
                phone: user.phone,
                name
            },
            address: {
                fullName: name,
                phone: user.phone,
                address,
                city,
                state,
                pincode
            },
            items: cart.items,
            subtotal: cart.subtotal,
            deliveryCharge: cart.deliveryCharge,
            walletDiscount: cart.walletDiscount,
            total: cart.total,
            useWallet: cart.useWallet
        };
        
        try {
            // For demo: simulate successful payment
            // In production, integrate Razorpay here
            
            await simulatePayment(orderData, modal);
            
        } catch (error) {
            console.error('Payment Error:', error);
            UI.showToast('Payment failed. Please try again.', 'error');
            payBtn.disabled = false;
            payBtn.innerHTML = `<span>Pay ${CONFIG.formatPrice(cart.total)}</span>`;
        } finally {
            checkoutInProgress = false;
        }
    }
    
    async function simulatePayment(orderData, modal) {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
        showOrderSuccess(orderData);
    }
    
    function showOrderSuccess(orderData) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div class="relative bg-white rounded-2xl p-8 w-full max-w-sm text-center animate-bounce-in">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="font-display text-2xl font-bold text-gray-800 mb-2">Order Placed!</h3>
                <p class="text-gray-600 mb-6">Your delicious pickles are on the way!</p>
                <div class="bg-pickle-50 rounded-xl p-4 mb-6">
                    <p class="text-sm text-gray-600 mb-1">Order Total</p>
                    <p class="text-2xl font-bold text-pickle-600">${CONFIG.formatPrice(orderData.total)}</p>
                </div>
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
    // RAZORPAY INTEGRATION (Production)
    // ============================================
    
    async function initRazorpayPayment(orderData) {
        try {
            // Create Razorpay order via backend
            const { orderId, amount } = await API.createPaymentOrder(
                orderData.total * 100, // Amount in paise
                `ORDER_${Date.now()}`
            );
            
            const options = {
                key: CONFIG.RAZORPAY.KEY_ID,
                amount: amount,
                currency: CONFIG.RAZORPAY.CURRENCY,
                name: CONFIG.RAZORPAY.NAME,
                description: CONFIG.RAZORPAY.DESCRIPTION,
                order_id: orderId,
                handler: async function(response) {
                    // Verify payment
                    const verified = await API.verifyPayment({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    });
                    
                    if (verified.success) {
                        // Create order
                        await API.createOrder({
                            ...orderData,
                            paymentId: response.razorpay_payment_id,
                            status: 'confirmed'
                        });
                        
                        // Handle success
                        handlePaymentSuccess(orderData);
                    } else {
                        UI.showToast('Payment verification failed', 'error');
                    }
                },
                prefill: {
                    contact: orderData.user.phone
                },
                theme: {
                    color: CONFIG.RAZORPAY.THEME_COLOR
                }
            };
            
            const rzp = new Razorpay(options);
            rzp.open();
            
        } catch (error) {
            console.error('Razorpay Error:', error);
            throw error;
        }
    }
    
    function handlePaymentSuccess(orderData) {
        // Deduct wallet if used
        if (orderData.walletDiscount > 0) {
            Store.deductFromWallet(orderData.walletDiscount, 'Order Payment');
        }
        
        // Clear cart
        Store.clearCart();
        UI.updateCartUI();
        UI.closeCart();
        
        // Show success
        showOrderSuccess(orderData);
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    return {
        init,
        addToCart: handleAddToCart,
        checkout: handleCheckout
    };
})();

// Make Cart globally available
window.Cart = Cart;
