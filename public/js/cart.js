/**
 * SeaSalt Pickles - Cart & Checkout Module v6
 * ============================================
 * FIXED: Layout shift during cart to checkout transition
 */

const Cart = (function() {
    let checkoutInProgress = false;
    let deliveryChargesCache = [];

    const RAZORPAY_KEY = 'rzp_test_SC97Hjqvf4LjoW';
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';

    function init() {
        loadDeliveryCharges();
        bindEvents();
        subscribeToChanges();
        initWalletCheckbox();
        console.log('[Cart] v6 Initialized');
    }

    // Prevent layout shift when hiding scrollbar
    function lockScroll() {
        var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = scrollbarWidth + 'px';
    }

    function unlockScroll() {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    async function loadDeliveryCharges() {
        try {
            const response = await fetch(SUPABASE_URL + '/rest/v1/delivery_charges?select=*', {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            });
            if (response.ok) {
                deliveryChargesCache = await response.json();
            }
        } catch (err) {
            console.warn('[Cart] Failed to load delivery charges');
        }
    }

    function getSpinWallet() {
        try {
            var raw = localStorage.getItem(SPIN_WALLET_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!data || !data.amount || data.amount <= 0) return null;
            var expiresAt = new Date(data.expiresAt);
            if (new Date() >= expiresAt) {
                localStorage.removeItem(SPIN_WALLET_KEY);
                return null;
            }
            return { amount: data.amount, expiresAt: expiresAt };
        } catch (e) {
            return null;
        }
    }

    function getDeliveryCharge(subtotal, country, region) {
        var freeAbove = 500;
        var flatFee = 50;

        var userData = null;
        try {
            var raw = localStorage.getItem('seasalt_user');
            if (raw && raw !== 'null' && raw !== 'undefined') {
                userData = JSON.parse(raw);
            }
        } catch (e) {
            userData = null;
        }

        var userCountry = country || (userData && userData.country ? userData.country : 'India');
        var userRegion = region || (userData && userData.region ? userData.region : null);

        if (deliveryChargesCache && deliveryChargesCache.length > 0) {
            var match = null;
            for (var i = 0; i < deliveryChargesCache.length; i++) {
                var dc = deliveryChargesCache[i];
                if (dc.country === userCountry && dc.region && userRegion && dc.region.toLowerCase() === userRegion.toLowerCase()) {
                    match = dc;
                    break;
                }
            }
            if (!match) {
                for (var i = 0; i < deliveryChargesCache.length; i++) {
                    var dc = deliveryChargesCache[i];
                    if (dc.country === userCountry && (!dc.region || dc.region === '')) {
                        match = dc;
                        break;
                    }
                }
            }
            if (!match) {
                for (var i = 0; i < deliveryChargesCache.length; i++) {
                    var dc = deliveryChargesCache[i];
                    if (dc.country === userCountry) {
                        match = dc;
                        break;
                    }
                }
            }
            if (match) {
                freeAbove = match.min_order_free || 500;
                flatFee = match.flat_charge || 50;
            }
        }

        return subtotal >= freeAbove ? 0 : flatFee;
    }

    function initWalletCheckbox() {
        document.addEventListener('change', function(e) {
            if (e.target && e.target.id === 'use-wallet') {
                handleWalletCheckboxChange(e.target.checked);
            }
        });
    }

    function handleWalletCheckboxChange(isChecked) {
        var spinWallet = getSpinWallet();
        var cart = Store.getCart();
        var deliveryCharge = getDeliveryCharge(cart.subtotal);
        var currentTotal = cart.subtotal + deliveryCharge;

        var totalEl = document.getElementById('cart-total');
        var discountRow = document.getElementById('wallet-discount-row');
        var discountEl = document.getElementById('wallet-discount');

        if (isChecked && spinWallet && spinWallet.amount > 0) {
            var discount = Math.min(spinWallet.amount, currentTotal);
            var newTotal = currentTotal - discount;
            if (totalEl) totalEl.textContent = '₹' + newTotal;
            if (discountRow) discountRow.style.display = 'flex';
            if (discountEl) discountEl.textContent = '-₹' + discount;
        } else {
            if (totalEl) totalEl.textContent = '₹' + currentTotal;
            if (discountRow) discountRow.style.display = 'none';
        }
    }

    function bindEvents() {
        var elements = UI.getElements();
        if (elements.cartSidebar) {
            var closeBtn = elements.cartSidebar.querySelector('.close-cart, [data-close-cart], #close-cart');
            if (closeBtn) closeBtn.addEventListener('click', function() { UI.closeCart(); });
        }
    }

    function subscribeToChanges() {
        if (typeof Store !== 'undefined' && Store.subscribe) {
            Store.subscribe('cart', function() {
                UI.renderCartItems();
                UI.updateCartUI();
            });
        }
    }

    function handleAddToCart() {
        var state = Store.getState();
        var product = state.selectedProduct;
        var variant = state.selectedVariant;
        var quantity = state.quantity || 1;

        if (!product || !variant) {
            UI.showToast('Please select a product', 'error');
            return;
        }

        Store.addToCart(product, variant, quantity);
        UI.closeProductModal();
        UI.showToast(product.name + ' added to cart!', 'success');
    }

    // FIXED: Smooth transition from cart to checkout without layout shift
    function handleCheckout() {
        var cart = Store.getCart();
        if (!cart.items || cart.items.length === 0) {
            UI.showToast('Your cart is empty!', 'error');
            return;
        }
        
        // Keep scroll locked during transition
        lockScroll();
        
        // Close cart sidebar without unlocking scroll
        var cartSidebar = document.getElementById('cart-sidebar');
        if (cartSidebar) {
            cartSidebar.classList.add('hidden');
        }
        
        // Show checkout immediately (scroll already locked)
        showCheckoutForm();
    }

    function showCheckoutForm() {
        var cart = Store.getCart();
        var user = Store.getState().user || {};

        var deliveryCharge = getDeliveryCharge(cart.subtotal);
        var spinWallet = getSpinWallet();
        var availableWallet = spinWallet ? spinWallet.amount : 0;
        var walletExpiry = spinWallet ? spinWallet.expiresAt : null;

        var useWalletEl = document.getElementById('use-wallet');
        var walletChecked = useWalletEl ? useWalletEl.checked : false;
        
        var walletDiscount = walletChecked && availableWallet > 0 ? Math.min(availableWallet, cart.subtotal + deliveryCharge) : 0;
        var finalTotal = Math.max(0, cart.subtotal + deliveryCharge - walletDiscount);

        var itemsHtml = '';
        for (var i = 0; i < cart.items.length; i++) {
            var item = cart.items[i];
            itemsHtml += '<div class="flex justify-between text-sm"><span class="text-gray-600">' + item.name + ' (' + (item.size || item.weight || '250g') + ') × ' + item.quantity + '</span><span class="font-medium">₹' + (item.price * item.quantity) + '</span></div>';
        }

        var walletHtml = availableWallet > 0 ? '<div class="bg-green-50 border border-green-200 rounded-xl p-4"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><span class="text-2xl">💰</span><div><div class="font-semibold text-green-800">Wallet: ₹' + availableWallet + '</div><div class="text-xs text-green-600" id="checkout-wallet-timer"></div></div></div><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="checkout-use-wallet" ' + (walletChecked ? 'checked' : '') + ' class="w-5 h-5 accent-green-600"><span class="text-sm font-medium text-green-700">Apply</span></label></div></div>' : '';

        var modal = document.createElement('div');
        modal.id = 'checkout-modal';
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center';
        modal.innerHTML = '<div class="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl animate-slide-up"><div class="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between"><h3 class="text-xl font-bold text-gray-800">Checkout</h3><button id="close-checkout" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div><div class="p-4 space-y-6"><div><h4 class="font-semibold text-gray-800 mb-3">Order Summary</h4><div class="bg-gray-50 rounded-xl p-4"><div class="space-y-2">' + itemsHtml + '</div><div class="border-t border-gray-200 mt-3 pt-3 space-y-2"><div class="flex justify-between"><span class="text-gray-600">Subtotal</span><span class="font-medium">₹' + cart.subtotal + '</span></div><div class="flex justify-between"><span class="text-gray-600">Delivery</span><span class="font-medium">' + (deliveryCharge === 0 ? 'FREE' : '₹' + deliveryCharge) + '</span></div>' + (walletDiscount > 0 ? '<div class="flex justify-between text-green-600"><span>Wallet Discount</span><span class="font-medium">-₹' + walletDiscount + '</span></div>' : '') + '<div class="flex justify-between text-lg font-bold mt-2 pt-2 border-t"><span>Total</span><span class="text-pickle-600">₹' + finalTotal + '</span></div></div></div></div>' + walletHtml + '<div><h4 class="font-semibold text-gray-800 mb-3">Delivery Address</h4><div class="space-y-3"><input type="text" id="checkout-name" placeholder="Full Name" value="' + (user.name || '') + '" class="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"><input type="tel" id="checkout-phone" placeholder="Phone Number" value="' + (user.phone || '') + '" class="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"><textarea id="checkout-address" placeholder="Full Address" rows="2" class="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none resize-none"></textarea><input type="text" id="checkout-pincode" placeholder="Pincode" maxlength="6" class="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"></div></div></div><div class="sticky bottom-0 bg-white p-4 border-t border-gray-100"><button id="pay-now-btn" class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 flex items-center justify-center gap-2"><span>Pay ₹' + finalTotal + '</span><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg></button></div></div>';

        document.body.appendChild(modal);
        
        // Ensure scroll is locked
        lockScroll();

        modal.querySelector('#close-checkout').onclick = function() { 
            modal.remove(); 
            unlockScroll();
        };

        var walletCheckbox = modal.querySelector('#checkout-use-wallet');
        if (walletCheckbox) {
            walletCheckbox.onchange = function(e) {
                var cartCheckbox = document.getElementById('use-wallet');
                if (cartCheckbox) cartCheckbox.checked = e.target.checked;
                modal.remove();
                showCheckoutForm();
            };
        }

        var pincodeInput = modal.querySelector('#checkout-pincode');
        if (pincodeInput) pincodeInput.oninput = function(e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); };

        modal._orderData = { subtotal: cart.subtotal, deliveryCharge: deliveryCharge, walletDiscount: walletDiscount, total: finalTotal, useWallet: walletChecked && walletDiscount > 0 };

        modal.querySelector('#pay-now-btn').onclick = function() { processPayment(modal); };
    }

    function processPayment(modal) {
        if (checkoutInProgress) return;

        var payBtn = modal.querySelector('#pay-now-btn');
        var name = modal.querySelector('#checkout-name').value.trim();
        var phone = modal.querySelector('#checkout-phone').value.trim();
        var address = modal.querySelector('#checkout-address').value.trim();
        var pincode = modal.querySelector('#checkout-pincode').value.trim();

        if (!name || !phone || !address || !pincode) { UI.showToast('Please fill all details', 'error'); return; }
        if (phone.length < 10) { UI.showToast('Enter valid phone number', 'error'); return; }
        if (pincode.length !== 6) { UI.showToast('Enter valid 6-digit pincode', 'error'); return; }

        checkoutInProgress = true;
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="animate-pulse">Processing...</span>';

        var cart = Store.getCart();
        var orderCalc = modal._orderData;
        var orderId = 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

        var orderData = { orderId: orderId, status: 'pending', createdAt: new Date().toISOString(), customer: { name: name, phone: phone, address: address, pincode: pincode }, items: cart.items, subtotal: orderCalc.subtotal, deliveryCharge: orderCalc.deliveryCharge, walletDiscount: orderCalc.walletDiscount, total: orderCalc.total, useWallet: orderCalc.useWallet };

        if (orderCalc.total <= 0) { completeOrder(orderData, modal, 'wallet', 'Wallet'); return; }

        if (typeof Razorpay === 'undefined') { UI.showToast('Payment loading...', 'error'); payBtn.disabled = false; payBtn.innerHTML = '<span>Pay ₹' + orderCalc.total + '</span>'; checkoutInProgress = false; return; }

        try {
            var rzp = new Razorpay({
                key: RAZORPAY_KEY,
                amount: orderCalc.total * 100,
                currency: 'INR',
                name: 'SeaSalt Pickles',
                description: 'Order ' + orderId,
                prefill: { name: name, contact: phone },
                theme: { color: '#D4451A' },
                handler: function(response) { completeOrder(orderData, modal, response.razorpay_payment_id, 'Razorpay'); },
                modal: { ondismiss: function() { payBtn.disabled = false; payBtn.innerHTML = '<span>Pay ₹' + orderCalc.total + '</span>'; checkoutInProgress = false; } }
            });
            rzp.on('payment.failed', function(response) { UI.showToast('Payment failed', 'error'); payBtn.disabled = false; payBtn.innerHTML = '<span>Pay ₹' + orderCalc.total + '</span>'; checkoutInProgress = false; });
            rzp.open();
        } catch (e) { UI.showToast('Payment error', 'error'); payBtn.disabled = false; payBtn.innerHTML = '<span>Pay ₹' + orderCalc.total + '</span>'; checkoutInProgress = false; }
    }

    function completeOrder(orderData, modal, paymentId, paymentMethod) {
        orderData.paymentId = paymentId;
        orderData.paymentMethod = paymentMethod;
        orderData.status = 'confirmed';

        var orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        orders.unshift(orderData);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));

        if (orderData.walletDiscount > 0) {
            var spinWallet = getSpinWallet();
            if (spinWallet) {
                var remaining = spinWallet.amount - orderData.walletDiscount;
                if (remaining <= 0) localStorage.removeItem(SPIN_WALLET_KEY);
                else localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify({ amount: remaining, expiresAt: spinWallet.expiresAt.toISOString() }));
                UI.updateCartUI();
            }
        }

        Store.clearCart();
        modal.remove();
        unlockScroll();
        UI.showToast('🎉 Order ' + orderData.orderId + ' confirmed!', 'success');
        checkoutInProgress = false;
    }

    return {
        init: init,
        addToCart: handleAddToCart,
        checkout: handleCheckout,
        getDeliveryCharge: getDeliveryCharge,
        getSpinWallet: getSpinWallet,
        SPIN_WALLET_KEY: SPIN_WALLET_KEY
    };
})();

window.Cart = Cart;
