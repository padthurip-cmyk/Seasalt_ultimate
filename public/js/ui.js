/**
 * SeaSalt Pickles - UI Module v10
 * ================================
 * Fixed: Wallet syncs from Supabase (admin credits show properly)
 */

const UI = (function() {
    'use strict';

    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    
    let scrollLockCount = 0;
    let scrollbarWidth = 0;

    // ============================================
    // SCROLL LOCK
    // ============================================
    function calculateScrollbarWidth() {
        return window.innerWidth - document.documentElement.clientWidth;
    }

    function lockScroll() {
        if (scrollLockCount === 0) {
            scrollbarWidth = calculateScrollbarWidth();
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }
        scrollLockCount++;
    }

    function unlockScroll() {
        scrollLockCount--;
        if (scrollLockCount <= 0) {
            scrollLockCount = 0;
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
    }

    function forceUnlockScroll() {
        scrollLockCount = 0;
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    function showToast(message, type = 'info') {
        const existing = document.querySelectorAll('.toast-notification');
        existing.forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        
        const bgColors = {
            success: 'linear-gradient(135deg, #10B981, #059669)',
            error: 'linear-gradient(135deg, #EF4444, #DC2626)',
            info: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            warning: 'linear-gradient(135deg, #F59E0B, #D97706)'
        };
        
        const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

        toast.innerHTML = `
            <span style="font-size:1.2rem;margin-right:8px;">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;
        
        toast.style.cssText = `
            position: fixed;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: ${bgColors[type] || bgColors.info};
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            z-index: 99999;
            box-shadow: 0 8px 30px rgba(0,0,0,0.25);
            opacity: 0;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
        `;

        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================
    // GET USER PHONE
    // ============================================
    function getUserPhone() {
        try {
            const user = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            if (user && user.phone) return user.phone;
        } catch (e) {}
        
        const directPhone = localStorage.getItem('seasalt_phone');
        if (directPhone) return directPhone;
        
        try {
            const spinWallet = JSON.parse(localStorage.getItem(SPIN_WALLET_KEY) || '{}');
            if (spinWallet && spinWallet.phone) return spinWallet.phone;
        } catch (e) {}
        
        return null;
    }

    // ============================================
    // SYNC WALLET FROM SUPABASE
    // ============================================
    async function syncWalletFromSupabase() {
        const phone = getUserPhone();
        if (!phone) return null;

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=wallet_balance,wallet_expires_at`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });

            if (res.ok) {
                const users = await res.json();
                if (users && users.length > 0) {
                    const user = users[0];
                    const balance = user.wallet_balance || 0;
                    const expiresAt = user.wallet_expires_at;

                    if (balance > 0 && expiresAt) {
                        const expiry = new Date(expiresAt);
                        if (new Date() < expiry) {
                            // Update local storage with server data
                            const walletData = {
                                amount: balance,
                                expiresAt: expiresAt,
                                phone: phone,
                                syncedAt: new Date().toISOString()
                            };
                            localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify(walletData));
                            console.log('[UI] 💰 Wallet synced from Supabase:', balance);
                            return walletData;
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('[UI] Wallet sync error:', err);
        }
        return null;
    }

    // ============================================
    // GET WALLET (with Supabase sync)
    // ============================================
    async function getWalletAsync() {
        // First sync from Supabase
        await syncWalletFromSupabase();
        
        // Then return local data
        return getSpinWallet();
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

    // ============================================
    // UPDATE CART UI (with wallet sync)
    // ============================================
    async function updateCartUI() {
        // Sync wallet from Supabase first
        await syncWalletFromSupabase();
        
        const cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [], count: 0 };
        
        // Update cart count badges
        const countEls = document.querySelectorAll('#cart-count, .cart-count, [data-cart-count]');
        countEls.forEach(el => {
            el.textContent = cart.count || 0;
            el.style.display = cart.count > 0 ? 'flex' : 'none';
        });

        // Update wallet display
        updateWalletDisplay();
    }

    function updateWalletDisplay() {
        const wallet = getSpinWallet();
        const walletEls = document.querySelectorAll('#wallet-balance, .wallet-balance, [data-wallet]');
        
        walletEls.forEach(el => {
            if (wallet && wallet.amount > 0) {
                el.textContent = '₹' + wallet.amount;
                el.closest('.wallet-container, .wallet-section')?.classList.remove('hidden');
            } else {
                el.textContent = '₹0';
            }
        });

        // Update timer if exists
        const timerEls = document.querySelectorAll('#wallet-timer, .wallet-timer, [data-wallet-timer]');
        timerEls.forEach(el => {
            if (wallet && wallet.expiresAt) {
                startWalletTimer(el, wallet.expiresAt);
            }
        });

        // Update wallet checkbox in cart
        const walletSection = document.getElementById('wallet-section');
        const walletCheckbox = document.getElementById('use-wallet');
        
        if (walletSection) {
            if (wallet && wallet.amount > 0) {
                walletSection.classList.remove('hidden');
                const balanceEl = walletSection.querySelector('.wallet-amount, #wallet-balance');
                if (balanceEl) balanceEl.textContent = '₹' + wallet.amount;
            } else {
                walletSection.classList.add('hidden');
                if (walletCheckbox) walletCheckbox.checked = false;
            }
        }
    }

    function startWalletTimer(element, expiresAt) {
        const updateTimer = () => {
            const now = new Date();
            const expiry = new Date(expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                element.textContent = 'Expired';
                localStorage.removeItem(SPIN_WALLET_KEY);
                updateWalletDisplay();
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            element.textContent = `${hours}h ${minutes}m ${seconds}s`;
        };

        updateTimer();
        const interval = setInterval(() => {
            const now = new Date();
            const expiry = new Date(expiresAt);
            if (now >= expiry) {
                clearInterval(interval);
            } else {
                updateTimer();
            }
        }, 1000);
    }

    // ============================================
    // ACCOUNT MODAL (with wallet sync)
    // ============================================
    async function showAccountModal() {
        const phone = getUserPhone();
        
        // Sync wallet from Supabase before showing
        await syncWalletFromSupabase();
        const wallet = getSpinWallet();
        
        const walletAmount = wallet ? wallet.amount : 0;
        const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');

        const existingModal = document.getElementById('account-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'account-modal';
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl w-full max-w-md overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-800">My Account</h3>
                    <button id="close-account" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="p-6">
                    ${phone ? `
                        <div class="bg-orange-50 rounded-xl p-4 mb-4 flex items-center gap-4">
                            <div class="w-14 h-14 rounded-full bg-pickle-500 flex items-center justify-center">
                                <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                            </div>
                            <div>
                                <div class="font-semibold text-gray-800">User</div>
                                <div class="text-gray-600 text-sm">${phone}</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="bg-amber-50 rounded-xl p-4 text-center">
                                <div class="text-2xl font-bold text-amber-600">₹${walletAmount}</div>
                                <div class="text-sm text-gray-600">Wallet</div>
                                ${wallet ? `<div class="text-xs text-gray-400 mt-1" id="modal-wallet-timer"></div>` : ''}
                            </div>
                            <div class="bg-blue-50 rounded-xl p-4 text-center">
                                <div class="text-2xl font-bold text-blue-600">${orders.length}</div>
                                <div class="text-sm text-gray-600">Orders</div>
                            </div>
                        </div>
                        <button id="logout-btn" class="w-full py-3 text-red-500 font-semibold hover:bg-red-50 rounded-xl transition">
                            Logout
                        </button>
                    ` : `
                        <div class="text-center py-8">
                            <div class="text-5xl mb-4">🎰</div>
                            <h4 class="font-bold text-lg text-gray-800 mb-2">Not logged in</h4>
                            <p class="text-gray-500 mb-6">Spin the wheel to create an account!</p>
                            <button id="spin-to-login" class="px-6 py-3 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600">
                                Spin & Win! 🎉
                            </button>
                        </div>
                    `}
                </div>
                <div class="p-4 border-t border-gray-100 text-center text-sm text-gray-400">
                    Version 1.0.0
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        lockScroll();

        // Start timer if wallet exists
        if (wallet) {
            const timerEl = modal.querySelector('#modal-wallet-timer');
            if (timerEl) startWalletTimer(timerEl, wallet.expiresAt);
        }

        modal.querySelector('#close-account').onclick = () => {
            modal.remove();
            unlockScroll();
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                unlockScroll();
            }
        };

        const logoutBtn = modal.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                localStorage.removeItem('seasalt_user');
                localStorage.removeItem('seasalt_phone');
                localStorage.removeItem(SPIN_WALLET_KEY);
                localStorage.removeItem('seasalt_spin_completed');
                modal.remove();
                unlockScroll();
                showToast('Logged out successfully', 'success');
                updateCartUI();
            };
        }

        const spinBtn = modal.querySelector('#spin-to-login');
        if (spinBtn) {
            spinBtn.onclick = () => {
                modal.remove();
                unlockScroll();
                if (typeof SpinWheel !== 'undefined') SpinWheel.show();
            };
        }
    }

    // ============================================
    // CART SIDEBAR
    // ============================================
    function openCart() {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar) {
            sidebar.classList.remove('hidden');
            lockScroll();
            renderCartItems();
        }
    }

    function closeCart() {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar) {
            sidebar.classList.add('hidden');
            unlockScroll();
        }
    }

    function renderCartItems() {
        const container = document.getElementById('cart-items');
        if (!container) return;

        const cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [], subtotal: 0 };
        
        if (!cart.items || cart.items.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                    </svg>
                    <p class="font-medium">Your cart is empty</p>
                </div>
            `;
            return;
        }

        let html = '';
        cart.items.forEach((item, index) => {
            html += `
                <div class="flex gap-3 p-3 bg-gray-50 rounded-xl">
                    <img src="${item.image || '/images/placeholder.jpg'}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover bg-gray-200">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-800 text-sm truncate">${item.name}</h4>
                        <p class="text-xs text-gray-500">${item.size || item.weight || '250g'}</p>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center gap-2 bg-white rounded-lg border">
                                <button class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-pickle-600" onclick="Store.updateQuantity(${index}, ${item.quantity - 1})">−</button>
                                <span class="w-6 text-center text-sm font-medium">${item.quantity}</span>
                                <button class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-pickle-600" onclick="Store.updateQuantity(${index}, ${item.quantity + 1})">+</button>
                            </div>
                            <span class="font-bold text-pickle-600">₹${item.price * item.quantity}</span>
                        </div>
                    </div>
                    <button class="text-gray-400 hover:text-red-500 self-start" onclick="Store.removeFromCart(${index})">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

        // Update subtotal
        const subtotalEl = document.getElementById('cart-subtotal');
        if (subtotalEl) subtotalEl.textContent = '₹' + cart.subtotal;

        // Update total
        updateCartTotal();
    }

    function updateCartTotal() {
        const cart = typeof Store !== 'undefined' ? Store.getCart() : { subtotal: 0 };
        const wallet = getSpinWallet();
        const useWallet = document.getElementById('use-wallet')?.checked || false;
        
        // Get delivery charge
        let deliveryCharge = 0;
        if (typeof Cart !== 'undefined' && Cart.getDeliveryCharge) {
            deliveryCharge = Cart.getDeliveryCharge(cart.subtotal);
        }
        
        let total = cart.subtotal + deliveryCharge;
        let walletDiscount = 0;
        
        if (useWallet && wallet && wallet.amount > 0) {
            walletDiscount = Math.min(wallet.amount, total);
            total = total - walletDiscount;
        }
        
        // Update delivery display
        const deliveryEl = document.getElementById('cart-delivery');
        if (deliveryEl) {
            deliveryEl.textContent = deliveryCharge === 0 ? 'FREE' : '₹' + deliveryCharge;
        }
        
        // Update total
        const totalEl = document.getElementById('cart-total');
        if (totalEl) totalEl.textContent = '₹' + Math.max(0, total);
        
        // Update wallet discount row
        const discountRow = document.getElementById('wallet-discount-row');
        const discountEl = document.getElementById('wallet-discount');
        if (discountRow && discountEl) {
            if (walletDiscount > 0) {
                discountRow.style.display = 'flex';
                discountEl.textContent = '-₹' + walletDiscount;
            } else {
                discountRow.style.display = 'none';
            }
        }
    }

    // ============================================
    // PRODUCT MODAL
    // ============================================
    function openProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.remove('hidden');
            lockScroll();
        }
    }

    function closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.add('hidden');
            unlockScroll();
        }
    }

    // ============================================
    // ELEMENTS
    // ============================================
    function getElements() {
        return {
            cartSidebar: document.getElementById('cart-sidebar'),
            productModal: document.getElementById('product-modal'),
            header: document.querySelector('header'),
            bottomNav: document.querySelector('.bottom-nav, #bottom-nav')
        };
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        console.log('[UI] v10 Initializing...');
        
        // Initial cart UI update with wallet sync
        updateCartUI();
        
        // Sync wallet every 30 seconds
        setInterval(syncWalletFromSupabase, 30000);
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('[UI] v10 Initialized ✅');
    }

    function setupEventListeners() {
        // Cart toggle
        document.querySelectorAll('[data-open-cart], #cart-btn, .cart-btn').forEach(btn => {
            btn.addEventListener('click', openCart);
        });

        // Close cart
        document.querySelectorAll('[data-close-cart], #close-cart, .close-cart').forEach(btn => {
            btn.addEventListener('click', closeCart);
        });

        // Account button
        document.querySelectorAll('[data-open-account], #account-btn, .account-btn').forEach(btn => {
            btn.addEventListener('click', showAccountModal);
        });

        // Wallet checkbox
        const walletCheckbox = document.getElementById('use-wallet');
        if (walletCheckbox) {
            walletCheckbox.addEventListener('change', updateCartTotal);
        }

        // Close product modal
        document.querySelectorAll('[data-close-product], #close-product-modal').forEach(btn => {
            btn.addEventListener('click', closeProductModal);
        });
    }

    // ============================================
    // LOADING SCREEN
    // ============================================
    function showLoading() {
        // Loading screen is handled by HTML, just ensure it's visible
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = 'flex';
    }

    function hideLoading() {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        init,
        showToast,
        showLoading,
        hideLoading,
        openCart,
        closeCart,
        openProductModal,
        closeProductModal,
        showAccountModal,
        updateCartUI,
        updateCartTotal,
        renderCartItems,
        getElements,
        getSpinWallet,
        getWalletAsync,
        syncWalletFromSupabase,
        lockScroll,
        unlockScroll,
        forceUnlockScroll
    };
})();

window.UI = UI;

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', UI.init);
} else {
    UI.init();
}
