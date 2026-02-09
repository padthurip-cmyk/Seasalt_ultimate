/**
 * SeaSalt Pickles - Cart & Checkout Module v9
 * ============================================
 * Fixed: Delivery charges display, Wallet sync from Supabase
 */

const Cart = (function() {
    'use strict';

    let checkoutInProgress = false;
    let deliveryChargesCache = [];

    const RAZORPAY_KEY = 'rzp_test_SC97Hjqvf4LjoW';
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';

    const DEFAULT_FREE_ABOVE = 500;
    const DEFAULT_FLAT_FEE = 50;

    function init() {
        console.log('[Cart] v9 Initializing...');
        loadDeliveryCharges();
        bindEvents();
        subscribeToChanges();
        console.log('[Cart] v9 Initialized ✅');
    }

    async function loadDeliveryCharges() {
        try {
            const response = await fetch(SUPABASE_URL + '/rest/v1/delivery_charges?select=*', {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            });
            if (response.ok) {
                deliveryChargesCache = await response.json();
                console.log('[Cart] Delivery charges loaded:', deliveryChargesCache.length);
            }
        } catch (err) {
            console.warn('[Cart] Using default delivery charges');
        }
    }

    function getSpinWallet() {
        try {
            const raw = localStorage.getItem(SPIN_WALLET_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || !data.amount || data.amount <= 0) return null;
            const expiresAt = new Date(data.expiresAt);
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
        let freeAbove = DEFAULT_FREE_ABOVE;
        let flatFee = DEFAULT_FLAT_FEE;

        let userData = null;
        try {
            const raw = localStorage.getItem('seasalt_user');
            if (raw) userData = JSON.parse(raw);
        } catch (e) {}

        const userCountry = country || (userData?.country) || 'India';

        if (deliveryChargesCache?.length > 0) {
            const match = deliveryChargesCache.find(dc => dc.country === userCountry);
            if (match) {
                freeAbove = match.min_order_free || DEFAULT_FREE_ABOVE;
                flatFee = match.flat_charge || DEFAULT_FLAT_FEE;
            }
        }

        return subtotal >= freeAbove ? 0 : flatFee;
    }

    function bindEvents() {
        document.addEventListener('change', function(e) {
            if (e.target?.id === 'use-wallet') {
                if (typeof UI !== 'undefined') UI.updateCartTotal();
            }
        });
    }

    function subscribeToChanges() {
        if (typeof Store !== 'undefined' && Store.subscribe) {
            Store.subscribe('cart', function() {
                if (typeof UI !== 'undefined') {
                    UI.renderCartItems();
                    UI.updateCartUI();
                }
            });
        }
    }

    function handleCheckout() {
        const cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [] };
        if (!cart.items?.length) {
            UI?.showToast('Your cart is empty!', 'error');
            return;
        }
        
        document.getElementById('cart-sidebar')?.classList.add('hidden');
        document.body.style.overflow = '';
        showCheckoutForm();
    }

    function showCheckoutForm() {
        const cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [], subtotal: 0 };
        const user = typeof Store !== 'undefined' ? Store.getState().user || {} : {};

        const deliveryCharge = getDeliveryCharge(cart.subtotal);
        const spinWallet = getSpinWallet();
        const availableWallet = spinWallet?.amount || 0;
        const walletChecked = document.getElementById('use-wallet')?.checked || false;
        const walletDiscount = walletChecked && availableWallet > 0 ? Math.min(availableWallet, cart.subtotal + deliveryCharge) : 0;
        const finalTotal = Math.max(0, cart.subtotal + deliveryCharge - walletDiscount);

        let itemsHtml = cart.items.map(item => `
            <div class="flex justify-between text-sm py-1">
                <span class="text-gray-600">${item.name} (${item.size || item.weight || '250g'}) × ${item.quantity}</span>
                <span class="font-medium">₹${item.price * item.quantity}</span>
            </div>
        `).join('');

        let walletHtml = availableWallet > 0 ? `
            <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mt-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">💰</span>
                        <div>
                            <div class="font-semibold text-amber-800">Wallet: ₹${availableWallet}</div>
                        </div>
                    </div>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="checkout-use-wallet" ${walletChecked ? 'checked' : ''} class="w-5 h-5 accent-amber-600">
                        <span class="text-sm font-medium text-amber-700">Apply</span>
                    </label>
                </div>
            </div>
        ` : '';

        const modal = document.createElement('div');
        modal.id = 'checkout-modal';
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">
                <div class="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10">
                    <h3 class="text-xl font-bold text-gray-800">Checkout</h3>
                    <button id="close-checkout" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">✕</button>
                </div>
                <div class="p-4 space-y-6">
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-3">📦 Order Summary</h4>
                        <div class="bg-gray-50 rounded-xl p-4">
                            ${itemsHtml}
                            <div class="border-t mt-3 pt-3 space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Subtotal</span>
                                    <span class="font-medium">₹${cart.subtotal}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Delivery</span>
                                    <span class="font-medium ${deliveryCharge === 0 ? 'text-green-600' : ''}">${deliveryCharge === 0 ? 'FREE' : '₹' + deliveryCharge}</span>
                                </div>
                                ${walletDiscount > 0 ? `<div class="flex justify-between text-sm text-green-600"><span>Wallet</span><span>-₹${walletDiscount}</span></div>` : ''}
                                <div class="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                                    <span>Total</span>
                                    <span class="text-pickle-600">₹${finalTotal}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${walletHtml}
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-3">📍 Delivery Address</h4>
                        <div class="space-y-3">
                            <input type="text" id="checkout-name" placeholder="Full Name *" value="${user.name || ''}" class="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-pickle-500">
                            <input type="tel" id="checkout-phone" placeholder="Phone *" value="${user.phone || ''}" class="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-pickle-500">
                            <textarea id="checkout-address" placeholder="Address *" rows="2" class="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-pickle-500 resize-none"></textarea>
                            <input type="text" id="checkout-pincode" placeholder="Pincode *" maxlength="6" class="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-pickle-500">
                        </div>
                    </div>
                </div>
                <div class="sticky bottom-0 bg-white p-4 border-t">
                    <button id="pay-now-btn" class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600">Pay ₹${finalTotal}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        modal.querySelector('#close-checkout').onclick = () => { modal.remove(); document.body.style.overflow = ''; };
        modal.onclick = (e) => { if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; } };
        
        modal.querySelector('#checkout-use-wallet')?.addEventListener('change', (e) => {
            document.getElementById('use-wallet').checked = e.target.checked;
            modal.remove();
            showCheckoutForm();
        });

        modal.querySelector('#checkout-pincode').oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); };

        modal._orderData = { subtotal: cart.subtotal, deliveryCharge, walletDiscount, total: finalTotal, useWallet: walletChecked && walletDiscount > 0 };
        modal.querySelector('#pay-now-btn').onclick = () => processPayment(modal);
    }

    function processPayment(modal) {
        if (checkoutInProgress) return;

        const payBtn = modal.querySelector('#pay-now-btn');
        const name = modal.querySelector('#checkout-name').value.trim();
        const phone = modal.querySelector('#checkout-phone').value.trim();
        const address = modal.querySelector('#checkout-address').value.trim();
        const pincode = modal.querySelector('#checkout-pincode').value.trim();

        if (!name || !phone || !address || !pincode) { UI?.showToast('Please fill all fields', 'error'); return; }
        if (phone.length < 10) { UI?.showToast('Enter valid phone', 'error'); return; }
        if (pincode.length !== 6) { UI?.showToast('Enter 6-digit pincode', 'error'); return; }

        checkoutInProgress = true;
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="animate-pulse">Processing...</span>';

        const cart = Store?.getCart() || { items: [] };
        const orderCalc = modal._orderData;
        const orderId = 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

        const orderData = { 
            orderId, status: 'pending', createdAt: new Date().toISOString(), 
            customer: { name, phone, address, pincode }, 
            items: cart.items, ...orderCalc 
        };

        if (orderCalc.total <= 0) { completeOrder(orderData, modal, 'wallet', 'Wallet'); return; }

        if (typeof Razorpay === 'undefined') { 
            UI?.showToast('Payment loading...', 'error'); 
            payBtn.disabled = false; 
            payBtn.textContent = 'Pay ₹' + orderCalc.total; 
            checkoutInProgress = false; 
            return; 
        }

        try {
            const rzp = new Razorpay({
                key: RAZORPAY_KEY, amount: orderCalc.total * 100, currency: 'INR',
                name: 'SeaSalt Pickles', description: 'Order ' + orderId,
                prefill: { name, contact: phone }, theme: { color: '#D4451A' },
                handler: (res) => completeOrder(orderData, modal, res.razorpay_payment_id, 'Razorpay'),
                modal: { ondismiss: () => { payBtn.disabled = false; payBtn.textContent = 'Pay ₹' + orderCalc.total; checkoutInProgress = false; } }
            });
            rzp.on('payment.failed', () => { UI?.showToast('Payment failed', 'error'); payBtn.disabled = false; payBtn.textContent = 'Pay ₹' + orderCalc.total; checkoutInProgress = false; });
            rzp.open();
        } catch (e) { UI?.showToast('Payment error', 'error'); payBtn.disabled = false; payBtn.textContent = 'Pay ₹' + orderCalc.total; checkoutInProgress = false; }
    }

    async function completeOrder(orderData, modal, paymentId, paymentMethod) {
        orderData.paymentId = paymentId;
        orderData.paymentMethod = paymentMethod;
        orderData.status = 'confirmed';

        const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');
        orders.unshift(orderData);
        localStorage.setItem('seasalt_orders', JSON.stringify(orders));

        await saveOrderToSupabase(orderData);

        if (orderData.walletDiscount > 0) {
            const spinWallet = getSpinWallet();
            if (spinWallet) {
                const remaining = spinWallet.amount - orderData.walletDiscount;
                if (remaining <= 0) localStorage.removeItem(SPIN_WALLET_KEY);
                else localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify({ amount: remaining, expiresAt: spinWallet.expiresAt }));
                await updateWalletInSupabase(orderData.customer.phone, Math.max(0, remaining));
            }
        }

        Store?.clearCart();
        modal.remove();
        document.body.style.overflow = '';
        UI?.showToast('🎉 Order ' + orderData.orderId + ' confirmed!', 'success');
        UI?.updateCartUI();
        showOrderSuccessModal(orderData);
        checkoutInProgress = false;
    }

    async function saveOrderToSupabase(orderData) {
        try {
            await fetch(SUPABASE_URL + '/rest/v1/orders', {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                    id: orderData.orderId, customer_name: orderData.customer.name, customer_phone: orderData.customer.phone,
                    customer_address: orderData.customer.address, customer_pincode: orderData.customer.pincode,
                    items: JSON.stringify(orderData.items), subtotal: orderData.subtotal, delivery_charge: orderData.deliveryCharge,
                    wallet_used: orderData.walletDiscount, total: orderData.total, payment_method: orderData.paymentMethod,
                    payment_id: orderData.paymentId, status: orderData.status, created_at: orderData.createdAt
                })
            });
        } catch (e) { console.error('[Cart] Save error:', e); }
    }

    async function updateWalletInSupabase(phone, balance) {
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}`, {
                method: 'PATCH',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet_balance: balance })
            });
        } catch (e) {}
    }

    function showOrderSuccessModal(orderData) {
        const m = document.createElement('div');
        m.className = 'fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4';
        m.innerHTML = `<div class="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div class="text-6xl mb-4">🎉</div>
            <h3 class="text-2xl font-bold mb-2">Order Confirmed!</h3>
            <p class="text-gray-600 mb-6">Order ID: <strong>${orderData.orderId}</strong></p>
            <button class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl" onclick="this.closest('.fixed').remove()">Continue Shopping</button>
        </div>`;
        document.body.appendChild(m);
    }

    return { init, checkout: handleCheckout, getDeliveryCharge, getSpinWallet, SPIN_WALLET_KEY };
})();

window.Cart = Cart;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Cart.init);
else Cart.init();
