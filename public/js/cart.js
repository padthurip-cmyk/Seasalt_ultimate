/**
 * SeaSalt Pickles - Cart & Checkout Module
 * =========================================
 * Handles cart operations and Razorpay checkout integration.
 * SeaSalt Pickles - Cart & Checkout Module v2
 * ============================================
 * Handles cart operations, delivery charges from Supabase, and Razorpay checkout.
 * 
 * v3 UPDATE: Now reads from 'seasalt_spin_wallet' for spin wheel rewards
 */

const Cart = (function() {
    // ============================================
    // STATE
    // ============================================
    let checkoutInProgress = false;
    let deliveryChargesCache = [];

    // Razorpay Key (Test Mode)
    const RAZORPAY_KEY = 'rzp_test_SC97Hjqvf4LjoW';

    // Supabase Config
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';

    // ============================================
    // SPIN WALLET KEY (matches ui.js and spinwheel.js)
    // ============================================
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        loadDeliveryCharges();
        bindEvents();
        subscribeToChanges();
        initWalletCheckbox(); // NEW: Initialize wallet checkbox
    }

    // ============================================
    // LOAD DELIVERY CHARGES FROM SUPABASE
    // ============================================

    async function loadDeliveryCharges() {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/delivery_charges?select=*`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (response.ok) {
                deliveryChargesCache = await response.json();
                console.log('[Cart] Loaded delivery charges:', deliveryChargesCache);
            }
        } catch (err) {
            console.warn('[Cart] Failed to load delivery charges:', err);
        }
    }

    // ============================================
    // GET SPIN WALLET (NEW)
    // ============================================

    function getSpinWallet() {
        try {
            const data = JSON.parse(localStorage.getItem(SPIN_WALLET_KEY) || '{}');
            if (!data.amount || data.amount <= 0) return null;

            const expiresAt = new Date(data.expiresAt);
            if (new Date() >= expiresAt) {
                localStorage.removeItem(SPIN_WALLET_KEY);
                return null;
            }

            return {
                amount: data.amount,
                expiresAt: expiresAt
            };
        } catch (e) {
            return null;
        }
    }

    // ============================================
    // GET DELIVERY CHARGE FOR USER
    // ============================================

    function getDeliveryCharge(subtotal, country, region) {
        // Default fallback
        let freeAbove = 500;
        let flatFee = 50;

        // Get user's country from localStorage
        const userData = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
        const userCountry = country || userData.country || 'India';
        const userRegion = region || userData.region || null;

        // Find matching delivery charge
        if (deliveryChargesCache && deliveryChargesCache.length > 0) {
            // First try to match country + region
            let match = deliveryChargesCache.find(dc =>
                dc.country === userCountry && dc.region && dc.region.toLowerCase() === (userRegion || '').toLowerCase()
            );

            // If no region match, try country only
            if (!match) {
                match = deliveryChargesCache.find(dc =>
                    dc.country === userCountry && (!dc.region || dc.region === '')
                );
            }

            // If still no match, use first available for country
            if (!match) {
                match = deliveryChargesCache.find(dc => dc.country === userCountry);
            }

            if (match) {
                freeAbove = match.min_order_free || 500;
                flatFee = match.flat_charge || 50;
                console.log('[Cart] Using delivery charge:', match);
            }
        }

        // Calculate delivery
        if (subtotal >= freeAbove) {
            return 0; // Free delivery
        }
        return flatFee;
    }

    // ============================================
    // WALLET CHECKBOX HANDLER (NEW)
    // ============================================

    function initWalletCheckbox() {
        document.addEventListener('change', function(e) {
            if (e.target && e.target.id === 'use-wallet') {
                handleWalletCheckboxChange(e.target.checked);
            }
        });
    }

    function handleWalletCheckboxChange(isChecked) {
        const spinWallet = getSpinWallet();
        const cart = Store.getCart();
        const deliveryCharge = getDeliveryCharge(cart.subtotal);
        const currentTotal = cart.subtotal + deliveryCharge;

        const totalEl = document.getElementById('cart-total');
        const discountRow = document.getElementById('wallet-discount-row');
        const discountEl = document.getElementById('wallet-discount');

        if (isChecked && spinWallet && spinWallet.amount > 0) {
            const discount = Math.min(spinWallet.amount, currentTotal);
            const newTotal = currentTotal - discount;

            if (totalEl) totalEl.textContent = '₹' + newTotal;
            if (discountRow) discountRow.style.display = 'flex';
            if (discountEl) discountEl.textContent = '-₹' + discount;

            console.log('[Cart] Wallet applied:', discount, 'New total:', newTotal);
        } else {
            if (totalEl) totalEl.textContent = '₹' + currentTotal;
            if (discountRow) discountRow.style.display = 'none';

            console.log('[Cart] Wallet removed, Total:', currentTotal);
        }
    }

    function bindEvents() {
        const elements = UI.getElements();

        // Close cart button
        if (elements.cartSidebar) {
            const closeBtn = elements.cartSidebar.querySelector('.close-cart, [data-close-cart]');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => UI.closeCart());
            }

            // Checkout button in cart sidebar
            const checkoutBtn = elements.cartSidebar.querySelector('#checkout-btn, .checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.addEventListener('click', handleCheckout);
            }
        }
    }

    function subscribeToChanges() {
        // Subscribe to cart changes
        Store.subscribe('cart', () => {
            UI.renderCartItems();
            UI.updateCartUI();
        });
    }

    // ============================================
    // ADD TO CART HANDLER
    // ============================================

    function handleAddToCart() {
        const state = Store.getState();
        const product = state.selectedProduct;
        const variant = state.selectedVariant;
        const quantity = state.quantity;

        if (!product || !variant) {
            UI.showToast('Please select a product and variant', 'error');
            return;
        }

        Store.addToCart(product, variant, quantity);
        UI.closeProductModal();
        UI.showToast(`${product.name} added to cart!`, 'success');

        // Subtle cart indicator animation
        const cartBtn = document.getElementById('cart-btn');
        if (cartBtn) {
            cartBtn.classList.add('animate-bounce');
            setTimeout(() => cartBtn.classList.remove('animate-bounce'), 500);
        }
    }

    // ============================================
    // CHECKOUT HANDLER
    // ============================================

    function handleCheckout() {
        const cart = Store.getCart();

        if (cart.items.length === 0) {
            UI.showToast('Your cart is empty!', 'error');
            return;
        }

        showCheckoutForm();
    }

    // ============================================
    // CHECKOUT FORM UI
    // ============================================

    function showCheckoutForm() {
        const cart = Store.getCart();
        const user = Store.getState().user;

        // Recalculate delivery charge from Supabase data
        const deliveryCharge = getDeliveryCharge(cart.subtotal);

        // Get wallet data from SPIN WALLET (not seasalt_wallet)
        const spinWallet = getSpinWallet();
        const availableWallet = spinWallet ? spinWallet.amount : 0;
        const walletExpiry = spinWallet ? spinWallet.expiresAt : null;

        // Calculate wallet discount (already applied in cart or apply now)
        const walletDiscount = cart.useWallet && availableWallet > 0
            ? Math.min(availableWallet, cart.subtotal + deliveryCharge)
            : 0;

        // Final total
        const finalTotal = Math.max(0, cart.subtotal + deliveryCharge - walletDiscount);

        // Create checkout modal
        const modal = document.createElement('div');
        modal.id = 'checkout-modal';
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl animate-slide-up">
                <!-- Header -->
                <div class="sticky top-0 bg-white p-4 border-b border-gray-100 rounded-t-3xl sm:rounded-t-2xl flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-800">Checkout</h3>
                    <button id="close-checkout" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="p-4 space-y-6">
                    <!-- Order Summary -->
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-3">Order Summary</h4>
                        <div class="bg-gray-50 rounded-xl p-4">
                            <div class="space-y-2">
                                ${cart.items.map(item => `
                                    <div class="flex justify-between text-sm">
                                        <span class="text-gray-600">${item.name} (${item.size || item.weight}) × ${item.quantity}</span>
                                        <span class="font-medium">₹${item.price * item.quantity}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="border-t border-gray-200 mt-3 pt-3 space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Subtotal</span>
                                    <span class="font-medium">₹${cart.subtotal}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Delivery</span>
                                    <span class="font-medium">${deliveryCharge === 0 ? 'FREE' : '₹' + deliveryCharge}</span>
                                </div>
                                ${walletDiscount > 0 ? `
                                <div class="flex justify-between text-green-600">
                                    <span>Wallet Discount</span>
                                    <span class="font-medium">-₹${walletDiscount}</span>
                                </div>
                                ` : ''}
                                <div class="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                                    <span>Total</span>
                                    <span class="text-pickle-600">₹${finalTotal}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Wallet Option -->
                    ${availableWallet > 0 ? `
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">💰</span>
                                <div>
                                    <div class="font-semibold text-green-800">Wallet: ₹${availableWallet}</div>
                                    <div class="text-xs text-green-600" id="checkout-wallet-timer">Expires in ${formatWalletTime(walletExpiry - new Date())}</div>
                                </div>
                            </div>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="checkout-use-wallet" ${cart.useWallet ? 'checked' : ''} class="w-5 h-5 accent-green-600">
                                <span class="text-sm font-medium text-green-700">Apply</span>
                            </label>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Delivery Address -->
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-3">Delivery Address</h4>
                        <div class="space-y-3">
                            <input type="text" id="checkout-name" placeholder="Full Name" value="${user?.name || ''}" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pickle-500 focus:border-transparent outline-none">
                            <input type="tel" id="checkout-phone" placeholder="Phone Number" value="${user?.phone || ''}" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pickle-500 focus:border-transparent outline-none">
                            <textarea id="checkout-address" placeholder="Full Address" rows="2" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pickle-500 focus:border-transparent outline-none resize-none"></textarea>
                            <input type="text" id="checkout-pincode" placeholder="Pincode" maxlength="6" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pickle-500 focus:border-transparent outline-none">
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="sticky bottom-0 bg-white p-4 border-t border-gray-100 rounded-b-2xl">
                    <button id="pay-now-btn" class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 transition-all flex items-center justify-center gap-2">
                        <span>Pay ₹${finalTotal}</span>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Close button
        modal.querySelector('#close-checkout').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });

        // Wallet checkbox
        const walletCheckbox = modal.querySelector('#checkout-use-wallet');
        if (walletCheckbox) {
            walletCheckbox.addEventListener('change', (e) => {
                Store.setUseWallet(e.target.checked);
                // Refresh checkout form
                modal.remove();
                document.body.style.overflow = '';
                showCheckoutForm();
            });
        }

        // Pincode validation
        const pincodeInput = modal.querySelector('#checkout-pincode');
        pincodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });

        // Update timer every second
        if (availableWallet > 0) {
            const timerEl = modal.querySelector('#checkout-wallet-timer');
            const timerInterval = setInterval(() => {
                const now = new Date();
                const remaining = walletExpiry - now;
                if (remaining <= 0) {
                    timerEl.textContent = 'EXPIRED';
                    clearInterval(timerInterval);
                } else {
                    timerEl.textContent = 'Expires in ' + formatWalletTime(remaining);
                }
            }, 1000);
        }

        // Store calculated values for payment
        modal._orderData = {
            subtotal: cart.subtotal,
            deliveryCharge: deliveryCharge,
            walletDiscount: walletDiscount,
            total: finalTotal,
            useWallet: cart.useWallet && walletDiscount > 0
        };

        // Pay button
        modal.querySelector('#pay-now-btn').addEventListener('click', () => {
            processPaymentWithRazorpay(modal);
        });
    }

    function formatWalletTime(ms) {
        if (ms <= 0) return 'EXPIRED';
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // ============================================
    // RAZORPAY PAYMENT - MAIN FUNCTION
    // ============================================

    function processPaymentWithRazorpay(modal) {
        // Prevent double submission
        if (checkoutInProgress) {
            console.log('Checkout already in progress');
            return;
        }

        const payBtn = modal.querySelector('#pay-now-btn');
        const name = modal.querySelector('#checkout-name').value.trim();
        const phone = modal.querySelector('#checkout-phone').value.trim();
        const address = modal.querySelector('#checkout-address').value.trim();
        const pincode = modal.querySelector('#checkout-pincode').value.trim();

        // Validation
        if (!name || !phone || !address || !pincode) {
            UI.showToast('Please fill all delivery details', 'error');
            return;
        }

        if (phone.length < 10) {
            UI.showToast('Please enter a valid phone number', 'error');
            return;
        }

        if (pincode.length !== 6) {
            UI.showToast('Please enter a valid 6-digit pincode', 'error');
            return;
        }

        checkoutInProgress = true;
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="animate-pulse">Processing...</span>';

        const cart = Store.getCart();
        const user = Store.getState().user;
        const orderCalc = modal._orderData || {
            subtotal: cart.subtotal,
            deliveryCharge: getDeliveryCharge(cart.subtotal),
            walletDiscount: 0,
            total: cart.total
        };

        // Generate order ID
        const orderId = 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

        // Order data for storage
        const orderData = {
            orderId: orderId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            customer: {
                name: name,
                phone: phone,
                address: address,
                pincode: pincode
            },
            items: cart.items,
            subtotal: orderCalc.subtotal,
            deliveryCharge: orderCalc.deliveryCharge,
            walletDiscount: orderCalc.walletDiscount,
            total: orderCalc.total,
            useWallet: orderCalc.useWallet
        };

        // If total is 0 (wallet covers everything), skip Razorpay
        if (orderCalc.total <= 0) {
            completeOrder(orderData, modal, 'wallet', 'Paid with Wallet');
            return;
        }

        // Initialize Razorpay
        try {
            const options = {
                key: RAZORPAY_KEY,
                amount: orderCalc.total * 100, // Amount in paise
                currency: 'INR',
                name: 'SeaSalt Pickles',
                description: 'Order ' + orderId,
                image: 'https://seasaltultimate.netlify.app/images/logo.png',
                prefill: {
                    name: name,
                    contact: phone,
                    email: ''
                },
                theme: {
                    color: '#D4451A'
                },
                handler: function(response) {
                    console.log('✅ Payment Success:', response);
                    completeOrder(orderData, modal, response.razorpay_payment_id, 'Razorpay');
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment cancelled by user');
                        payBtn.disabled = false;
                        payBtn.innerHTML = `<span>Pay ₹${orderCalc.total}</span>`;
                        checkoutInProgress = false;
                    }
                }
            };

            console.log('Opening Razorpay with options:', options);
            const rzp = new Razorpay(options);

            rzp.on('payment.failed', function(response) {
                console.error('❌ Payment Failed:', response.error);
                UI.showToast('Payment failed: ' + response.error.description, 'error');
                payBtn.disabled = false;
                payBtn.innerHTML = `<span>Pay ₹${orderCalc.total}</span>`;
                checkoutInProgress = false;
            });

            rzp.open();

        } catch (error) {
            console.error('Razorpay Error:', error);
            UI.showToast('Payment initialization failed. Please try again.', 'error');
            payBtn.disabled = false;
            payBtn.innerHTML = `<span>Pay ₹${orderCalc.total}</span>`;
            checkoutInProgress = false;
        }
    }

    // ============================================
    // COMPLETE ORDER (After successful payment)
    // ============================================

    function completeOrder(orderData, modal, paymentId, paymentMethod) {
        // Update order with payment info
        orderData.paymentId = paymentId;
        orderData.paymentMethod = paymentMethod;
        orderData.status = 'confirmed';

        console.log('✅ Order Completed:', orderData);

        // Save order to localStorage for history
        const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        orders.unshift(orderData);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));

        // Deduct wallet if used - FROM SPIN WALLET
        if (orderData.walletDiscount > 0) {
            const spinWallet = getSpinWallet();
            if (spinWallet) {
                const remaining = spinWallet.amount - orderData.walletDiscount;
                
                if (remaining <= 0) {
                    localStorage.removeItem(SPIN_WALLET_KEY);
                } else {
                    localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify({
                        amount: remaining,
                        expiresAt: spinWallet.expiresAt.toISOString()
                    }));
                }

                // Dispatch event for wallet UI update
                window.dispatchEvent(new CustomEvent('walletUpdated', {
                    detail: { amount: remaining, expiresAt: spinWallet.expiresAt }
                }));

                // Update UI
                if (typeof UI !== 'undefined') {
                    UI.updateCartUI();
                }
            }
        }

        // Clear cart
        Store.clearCart();

        // Close checkout modal
        modal.remove();
        document.body.style.overflow = '';

        // Close cart sidebar
        UI.closeCart();

        // Show success message
        UI.showToast(`🎉 Order ${orderData.orderId} confirmed!`, 'success');

        // Reset flag
        checkoutInProgress = false;
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        init,
        addToCart: handleAddToCart,
        checkout: handleCheckout,
        placeOrder: processPaymentWithRazorpay,
        getDeliveryCharge: getDeliveryCharge,
        loadDeliveryCharges: loadDeliveryCharges,
        getSpinWallet: getSpinWallet,
        SPIN_WALLET_KEY: SPIN_WALLET_KEY
    };
})();

window.Cart = Cart;
