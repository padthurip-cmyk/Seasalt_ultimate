/**
 * SeaSalt Pickles - Cart Module v2
 * =================================
 * FIXED: Wallet checkbox now properly deducts from spin wallet
 * Uses 'seasalt_spin_wallet' localStorage key (same as ui.js v7 and spinwheel.js v14)
 */

const Cart = (function() {
    // Same localStorage key as ui.js and spinwheel.js
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    
    // Cart state
    let useWalletBalance = false;
    
    /**
     * Get spin wallet data from localStorage
     */
    function getSpinWallet() {
        try {
            const data = JSON.parse(localStorage.getItem(SPIN_WALLET_KEY) || '{}');
            if (!data.amount || data.amount <= 0) return null;
            
            const expiresAt = new Date(data.expiresAt);
            const now = new Date();
            
            if (now >= expiresAt) {
                localStorage.removeItem(SPIN_WALLET_KEY);
                return null;
            }
            
            return {
                amount: data.amount,
                expiresAt: data.expiresAt
            };
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Calculate cart totals with optional wallet deduction
     */
    function calculateTotals(applyWallet = false) {
        const cart = Store.getCart();
        const spinWallet = getSpinWallet();
        const walletBalance = spinWallet ? spinWallet.amount : 0;
        
        let subtotal = cart.subtotal || 0;
        let deliveryCharge = cart.deliveryCharge || 0;
        let total = subtotal + deliveryCharge;
        let walletDiscount = 0;
        
        // Apply wallet discount if checkbox is checked and wallet has balance
        if (applyWallet && walletBalance > 0) {
            // Wallet discount cannot exceed the total
            walletDiscount = Math.min(walletBalance, total);
            total = total - walletDiscount;
        }
        
        return {
            subtotal,
            deliveryCharge,
            walletDiscount,
            total,
            walletBalance
        };
    }
    
    /**
     * Update the cart UI with calculated totals
     */
    function updateCartDisplay() {
        const totals = calculateTotals(useWalletBalance);
        const fmt = (amount) => '₹' + amount;
        
        // Update subtotal
        const subtotalEl = document.getElementById('cart-subtotal');
        if (subtotalEl) subtotalEl.textContent = fmt(totals.subtotal);
        
        // Update delivery
        const deliveryEl = document.getElementById('delivery-charge');
        if (deliveryEl) {
            deliveryEl.innerHTML = totals.deliveryCharge === 0 
                ? '<span class="text-spice-leaf font-medium">FREE</span>' 
                : fmt(totals.deliveryCharge);
        }
        
        // Update wallet discount row
        const walletDiscountRow = document.getElementById('wallet-discount-row');
        const walletDiscountEl = document.getElementById('wallet-discount');
        if (walletDiscountRow && walletDiscountEl) {
            if (totals.walletDiscount > 0) {
                walletDiscountRow.style.display = 'flex';
                walletDiscountEl.textContent = '-' + fmt(totals.walletDiscount);
            } else {
                walletDiscountRow.style.display = 'none';
            }
        }
        
        // Update total
        const totalEl = document.getElementById('cart-total');
        if (totalEl) totalEl.textContent = fmt(totals.total);
        
        // Update available wallet display
        const availableWalletEl = document.getElementById('available-wallet');
        if (availableWalletEl) availableWalletEl.textContent = fmt(totals.walletBalance);
        
        console.log('[Cart] Display updated:', totals);
    }
    
    /**
     * Initialize cart event listeners
     */
    function init() {
        console.log('[Cart] Initializing...');
        
        // Listen for wallet checkbox changes
        const walletCheckbox = document.getElementById('use-wallet');
        if (walletCheckbox) {
            walletCheckbox.addEventListener('change', function(e) {
                useWalletBalance = e.target.checked;
                console.log('[Cart] Use wallet changed:', useWalletBalance);
                updateCartDisplay();
            });
        }
        
        // Subscribe to Store cart changes
        if (typeof Store !== 'undefined' && Store.subscribe) {
            Store.subscribe('cart', function() {
                console.log('[Cart] Store cart changed, updating display');
                UI.updateCartUI();
                updateCartDisplay();
            });
        }
        
        console.log('[Cart] Initialized');
    }
    
    /**
     * Get checkout data for Razorpay
     */
    function getCheckoutData() {
        const totals = calculateTotals(useWalletBalance);
        const cart = Store.getCart();
        
        return {
            items: cart.items,
            subtotal: totals.subtotal,
            deliveryCharge: totals.deliveryCharge,
            walletDiscount: totals.walletDiscount,
            total: totals.total,
            useWallet: useWalletBalance
        };
    }
    
    /**
     * Clear wallet after successful order
     */
    function clearWalletAfterOrder() {
        if (useWalletBalance) {
            const spinWallet = getSpinWallet();
            if (spinWallet) {
                const totals = calculateTotals(true);
                const remainingBalance = spinWallet.amount - totals.walletDiscount;
                
                if (remainingBalance <= 0) {
                    // Remove wallet completely
                    localStorage.removeItem(SPIN_WALLET_KEY);
                } else {
                    // Update wallet with remaining balance
                    localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify({
                        amount: remainingBalance,
                        expiresAt: spinWallet.expiresAt
                    }));
                }
                
                // Update UI
                if (typeof UI !== 'undefined') {
                    UI.updateCartUI();
                }
            }
        }
        
        // Reset checkbox state
        useWalletBalance = false;
        const walletCheckbox = document.getElementById('use-wallet');
        if (walletCheckbox) walletCheckbox.checked = false;
    }
    
    /**
     * Handle Razorpay checkout
     */
    function initiateCheckout() {
        const checkoutData = getCheckoutData();
        
        if (checkoutData.items.length === 0) {
            UI.showToast('Your cart is empty', 'error');
            return;
        }
        
        if (checkoutData.total <= 0) {
            // Free order (fully covered by wallet)
            handleFreeOrder(checkoutData);
            return;
        }
        
        // Regular Razorpay checkout
        const options = {
            key: CONFIG.RAZORPAY_KEY_ID,
            amount: checkoutData.total * 100, // Razorpay expects paise
            currency: 'INR',
            name: 'SeaSalt Pickles',
            description: 'Order Payment',
            handler: function(response) {
                handlePaymentSuccess(response, checkoutData);
            },
            prefill: {
                name: '',
                email: '',
                contact: ''
            },
            theme: {
                color: '#D4451A'
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
    }
    
    /**
     * Handle free orders (wallet covers entire amount)
     */
    function handleFreeOrder(checkoutData) {
        UI.showToast('Order placed successfully with wallet balance!', 'success');
        clearWalletAfterOrder();
        Store.clearCart();
        UI.closeCart();
    }
    
    /**
     * Handle successful payment
     */
    function handlePaymentSuccess(response, checkoutData) {
        console.log('[Cart] Payment successful:', response);
        UI.showToast('Payment successful! Order placed.', 'success');
        clearWalletAfterOrder();
        Store.clearCart();
        UI.closeCart();
    }
    
    // Public API
    return {
        init: init,
        updateCartDisplay: updateCartDisplay,
        getCheckoutData: getCheckoutData,
        initiateCheckout: initiateCheckout,
        clearWalletAfterOrder: clearWalletAfterOrder,
        getSpinWallet: getSpinWallet,
        SPIN_WALLET_KEY: SPIN_WALLET_KEY
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Cart.init();
});

// Export for global access
window.Cart = Cart;
