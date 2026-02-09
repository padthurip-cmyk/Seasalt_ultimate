/**
 * SeaSalt Pickles - UI Module v11
 * ================================
 * Complete UI with ALL render functions
 */

const UI = (function() {
    'use strict';

    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    let scrollLockCount = 0;

    // ══════════════════════════════════════════
    // LOADING SCREEN
    // ══════════════════════════════════════════
    function showLoading() {
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = 'flex';
    }

    function hideLoading() {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 300);
        }
    }

    // ══════════════════════════════════════════
    // SCROLL LOCK
    // ══════════════════════════════════════════
    function lockScroll() {
        if (scrollLockCount === 0) {
            document.body.style.overflow = 'hidden';
        }
        scrollLockCount++;
    }

    function unlockScroll() {
        scrollLockCount--;
        if (scrollLockCount <= 0) {
            scrollLockCount = 0;
            document.body.style.overflow = '';
        }
    }

    function forceUnlockScroll() {
        scrollLockCount = 0;
        document.body.style.overflow = '';
    }

    // ══════════════════════════════════════════
    // TOAST NOTIFICATIONS
    // ══════════════════════════════════════════
    function showToast(message, type = 'info') {
        document.querySelectorAll('.toast-notification').forEach(t => t.remove());

        const colors = {
            success: '#10B981', error: '#EF4444', info: '#6366F1', warning: '#F59E0B'
        };

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
            background: ${colors[type] || colors.info}; color: white;
            padding: 14px 24px; border-radius: 12px; font-weight: 600;
            z-index: 99999; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ══════════════════════════════════════════
    // WALLET FUNCTIONS
    // ══════════════════════════════════════════
    function getUserPhone() {
        try {
            const user = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            if (user?.phone) return user.phone;
        } catch (e) {}
        return localStorage.getItem('seasalt_phone') || null;
    }

    async function syncWalletFromSupabase() {
        const phone = getUserPhone();
        if (!phone) return null;

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=wallet_balance,wallet_expires_at`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            });
            if (res.ok) {
                const users = await res.json();
                if (users?.[0]?.wallet_balance > 0 && users[0].wallet_expires_at) {
                    const expiry = new Date(users[0].wallet_expires_at);
                    if (new Date() < expiry) {
                        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify({
                            amount: users[0].wallet_balance,
                            expiresAt: users[0].wallet_expires_at,
                            phone: phone
                        }));
                        return { amount: users[0].wallet_balance, expiresAt: expiry };
                    }
                }
            }
        } catch (e) {}
        return null;
    }

    function getSpinWallet() {
        try {
            const data = JSON.parse(localStorage.getItem(SPIN_WALLET_KEY) || 'null');
            if (!data?.amount) return null;
            if (new Date() >= new Date(data.expiresAt)) {
                localStorage.removeItem(SPIN_WALLET_KEY);
                return null;
            }
            return { amount: data.amount, expiresAt: new Date(data.expiresAt) };
        } catch (e) { return null; }
    }

    // ══════════════════════════════════════════
    // RENDER CATEGORY PILLS
    // ══════════════════════════════════════════
    function renderCategoryPills(categories) {
        const container = document.getElementById('category-pills');
        if (!container || !categories) return;

        let html = '<button class="category-pill active" data-category="all">All</button>';
        categories.forEach(cat => {
            const name = cat.name || cat;
            const id = cat.id || cat.name?.toLowerCase().replace(/\s+/g, '-') || cat;
            html += `<button class="category-pill" data-category="${id}">${name}</button>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.category-pill').forEach(pill => {
            pill.onclick = function() {
                container.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                filterProducts(this.dataset.category);
            };
        });
    }

    // ══════════════════════════════════════════
    // RENDER FEATURED PRODUCTS (Hero section)
    // ══════════════════════════════════════════
    function renderFeaturedProducts(products) {
        const container = document.getElementById('featured-products');
        if (!container) return;

        const featured = products.filter(p => p.featured || p.badge).slice(0, 4);
        if (featured.length === 0) return;

        let html = '';
        featured.forEach(p => {
            const price = p.variants?.[0]?.price || p.price || 0;
            html += `
                <div class="featured-card bg-white rounded-2xl p-4 shadow-lg cursor-pointer" data-product-id="${p.id}">
                    <img src="${p.image || '/images/placeholder.jpg'}" alt="${p.name}" class="w-full aspect-square object-cover rounded-xl mb-3">
                    <h4 class="font-bold text-gray-800">${p.name}</h4>
                    <p class="text-pickle-600 font-bold">₹${price}</p>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // ══════════════════════════════════════════
    // RENDER PRODUCTS GRID
    // ══════════════════════════════════════════
    function renderProducts(products) {
        const container = document.getElementById('products-grid');
        if (!container) return;

        if (!products?.length) {
            container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No products found</div>';
            return;
        }

        let html = '';
        products.forEach(p => {
            const price = p.variants?.[0]?.price || p.price || 0;
            const badge = p.badge ? `<span class="absolute top-2 left-2 bg-pickle-500 text-white text-xs font-bold px-2 py-1 rounded-full">${p.badge}</span>` : '';
            
            html += `
                <div class="product-card bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer" data-product-id="${p.id}">
                    <div class="relative aspect-square bg-gray-100">
                        ${badge}
                        <img src="${p.image || '/images/placeholder.jpg'}" alt="${p.name}" class="w-full h-full object-cover" loading="lazy">
                    </div>
                    <div class="p-4">
                        <h3 class="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">${p.name}</h3>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-pickle-600 font-bold">₹${price}</span>
                            <button class="quick-add-btn w-8 h-8 bg-pickle-500 text-white rounded-full flex items-center justify-center hover:bg-pickle-600" data-product-id="${p.id}">+</button>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // ══════════════════════════════════════════
    // FILTER PRODUCTS
    // ══════════════════════════════════════════
    function filterProducts(category) {
        const state = typeof Store !== 'undefined' ? Store.getState() : {};
        let products = state.products || [];
        if (category && category !== 'all') {
            products = products.filter(p => p.category === category || p.category_id === category);
        }
        renderProducts(products);
    }

    // ══════════════════════════════════════════
    // RENDER PRODUCT MODAL
    // ══════════════════════════════════════════
    function renderProductModal(product) {
        if (!product) return;
        const modal = document.getElementById('product-modal');
        if (!modal) return;

        const variants = product.variants || [];
        const firstVariant = variants[0] || {};

        let variantsHtml = variants.map((v, i) => `
            <button class="variant-btn px-4 py-2 border-2 rounded-xl text-sm font-medium ${i === 0 ? 'border-pickle-500 bg-pickle-50' : 'border-gray-200'}" data-index="${i}" data-price="${v.price}">
                ${v.weight || v.size || v.name} - ₹${v.price}
            </button>
        `).join('');

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" id="modal-backdrop">
                <div class="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">
                    <div class="relative">
                        <img src="${product.image || '/images/placeholder.jpg'}" alt="${product.name}" class="w-full aspect-square object-cover">
                        <button id="close-product-modal" class="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">✕</button>
                    </div>
                    <div class="p-6">
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">${product.name}</h2>
                        <p class="text-gray-600 text-sm mb-4">${product.description || ''}</p>
                        ${variants.length ? `<div class="mb-4"><h4 class="font-semibold mb-2">Select Size</h4><div class="flex flex-wrap gap-2">${variantsHtml}</div></div>` : ''}
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                                <button id="qty-minus" class="w-10 h-10 flex items-center justify-center">−</button>
                                <span id="qty-display" class="w-8 text-center font-semibold">1</span>
                                <button id="qty-plus" class="w-10 h-10 flex items-center justify-center">+</button>
                            </div>
                            <div class="text-2xl font-bold text-pickle-600" id="modal-price">₹${firstVariant.price || product.price || 0}</div>
                        </div>
                        <button id="add-to-cart-btn" class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        lockScroll();

        let selectedIdx = 0, qty = 1;
        const updatePrice = () => {
            const v = variants[selectedIdx] || {};
            modal.querySelector('#modal-price').textContent = '₹' + ((v.price || product.price || 0) * qty);
        };

        modal.querySelector('#close-product-modal').onclick = closeProductModal;
        modal.querySelector('#modal-backdrop').onclick = (e) => { if (e.target.id === 'modal-backdrop') closeProductModal(); };
        
        modal.querySelectorAll('.variant-btn').forEach(btn => {
            btn.onclick = function() {
                modal.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('border-pickle-500', 'bg-pickle-50'));
                this.classList.add('border-pickle-500', 'bg-pickle-50');
                selectedIdx = parseInt(this.dataset.index);
                updatePrice();
            };
        });

        modal.querySelector('#qty-minus').onclick = () => { if (qty > 1) { qty--; modal.querySelector('#qty-display').textContent = qty; updatePrice(); } };
        modal.querySelector('#qty-plus').onclick = () => { if (qty < 10) { qty++; modal.querySelector('#qty-display').textContent = qty; updatePrice(); } };
        
        modal.querySelector('#add-to-cart-btn').onclick = () => {
            if (typeof Store !== 'undefined') Store.addToCart(product, variants[selectedIdx], qty);
            closeProductModal();
            showToast(product.name + ' added to cart!', 'success');
        };
    }

    function openProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) { modal.classList.remove('hidden'); lockScroll(); }
    }

    function closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) { modal.classList.add('hidden'); unlockScroll(); }
    }

    // ══════════════════════════════════════════
    // RENDER CART SIDEBAR
    // ══════════════════════════════════════════
    function renderCartItems() {
        const container = document.getElementById('cart-items');
        if (!container) return;

        const cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [], subtotal: 0 };

        if (!cart.items?.length) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-gray-400">
                <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                <p>Your cart is empty</p>
            </div>`;
            return;
        }

        let html = '';
        cart.items.forEach((item, i) => {
            html += `
                <div class="flex gap-3 p-3 bg-gray-50 rounded-xl">
                    <img src="${item.image || '/images/placeholder.jpg'}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-800 text-sm">${item.name}</h4>
                        <p class="text-xs text-gray-500">${item.size || item.weight || ''}</p>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center gap-2 bg-white rounded-lg border">
                                <button class="w-7 h-7 flex items-center justify-center" onclick="Store.updateQuantity(${i}, ${item.quantity - 1})">−</button>
                                <span class="w-6 text-center text-sm">${item.quantity}</span>
                                <button class="w-7 h-7 flex items-center justify-center" onclick="Store.updateQuantity(${i}, ${item.quantity + 1})">+</button>
                            </div>
                            <span class="font-bold text-pickle-600">₹${item.price * item.quantity}</span>
                        </div>
                    </div>
                    <button class="text-gray-400 hover:text-red-500" onclick="Store.removeFromCart(${i})">✕</button>
                </div>
            `;
        });
        container.innerHTML = html;

        const subtotalEl = document.getElementById('cart-subtotal');
        if (subtotalEl) subtotalEl.textContent = '₹' + cart.subtotal;
        updateCartTotal();
    }

    function updateCartTotal() {
        const cart = typeof Store !== 'undefined' ? Store.getCart() : { subtotal: 0 };
        const wallet = getSpinWallet();
        const useWallet = document.getElementById('use-wallet')?.checked || false;
        
        let delivery = 0;
        if (typeof Cart !== 'undefined' && Cart.getDeliveryCharge) {
            delivery = Cart.getDeliveryCharge(cart.subtotal);
        }
        
        let total = cart.subtotal + delivery;
        let discount = 0;
        
        if (useWallet && wallet?.amount > 0) {
            discount = Math.min(wallet.amount, total);
            total -= discount;
        }

        const deliveryEl = document.getElementById('cart-delivery');
        if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'FREE' : '₹' + delivery;

        const totalEl = document.getElementById('cart-total');
        if (totalEl) totalEl.textContent = '₹' + Math.max(0, total);

        const discountRow = document.getElementById('wallet-discount-row');
        const discountEl = document.getElementById('wallet-discount');
        if (discountRow) discountRow.style.display = discount > 0 ? 'flex' : 'none';
        if (discountEl) discountEl.textContent = '-₹' + discount;
    }

    function openCart() {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar) { sidebar.classList.remove('hidden'); lockScroll(); renderCartItems(); }
    }

    function closeCart() {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar) { sidebar.classList.add('hidden'); unlockScroll(); }
    }

    // ══════════════════════════════════════════
    // UPDATE CART UI
    // ══════════════════════════════════════════
    async function updateCartUI() {
        await syncWalletFromSupabase();
        const cart = typeof Store !== 'undefined' ? Store.getCart() : { count: 0 };
        
        document.querySelectorAll('#cart-count, .cart-count, [data-cart-count]').forEach(el => {
            el.textContent = cart.count || 0;
            el.style.display = cart.count > 0 ? 'flex' : 'none';
        });

        updateWalletDisplay();
    }

    function updateWalletDisplay() {
        const wallet = getSpinWallet();
        const section = document.getElementById('wallet-section');
        const checkbox = document.getElementById('use-wallet');

        if (section) {
            if (wallet?.amount > 0) {
                section.classList.remove('hidden');
                const balanceEl = section.querySelector('.wallet-amount, #wallet-balance');
                if (balanceEl) balanceEl.textContent = '₹' + wallet.amount;
            } else {
                section.classList.add('hidden');
                if (checkbox) checkbox.checked = false;
            }
        }
    }

    // ══════════════════════════════════════════
    // ACCOUNT MODAL
    // ══════════════════════════════════════════
    async function showAccountModal() {
        const phone = getUserPhone();
        await syncWalletFromSupabase();
        const wallet = getSpinWallet();
        const orders = JSON.parse(localStorage.getItem('seasalt_orders') || '[]');

        document.getElementById('account-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'account-modal';
        modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl w-full max-w-md overflow-hidden">
                <div class="p-6 border-b flex justify-between items-center">
                    <h3 class="text-xl font-bold">My Account</h3>
                    <button id="close-account" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">✕</button>
                </div>
                <div class="p-6">
                    ${phone ? `
                        <div class="bg-orange-50 rounded-xl p-4 mb-4 flex items-center gap-4">
                            <div class="w-14 h-14 rounded-full bg-pickle-500 flex items-center justify-center text-white text-2xl">👤</div>
                            <div><div class="font-semibold">User</div><div class="text-gray-600 text-sm">${phone}</div></div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="bg-amber-50 rounded-xl p-4 text-center">
                                <div class="text-2xl font-bold text-amber-600">₹${wallet?.amount || 0}</div>
                                <div class="text-sm text-gray-600">Wallet</div>
                            </div>
                            <div class="bg-blue-50 rounded-xl p-4 text-center">
                                <div class="text-2xl font-bold text-blue-600">${orders.length}</div>
                                <div class="text-sm text-gray-600">Orders</div>
                            </div>
                        </div>
                        <button id="logout-btn" class="w-full py-3 text-red-500 font-semibold hover:bg-red-50 rounded-xl">Logout</button>
                    ` : `
                        <div class="text-center py-8">
                            <div class="text-5xl mb-4">🎰</div>
                            <h4 class="font-bold text-lg mb-2">Not logged in</h4>
                            <p class="text-gray-500 mb-6">Spin the wheel to create an account!</p>
                            <button id="spin-to-login" class="px-6 py-3 bg-pickle-500 text-white font-bold rounded-xl">Spin & Win!</button>
                        </div>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        lockScroll();

        modal.querySelector('#close-account').onclick = () => { modal.remove(); unlockScroll(); };
        modal.onclick = (e) => { if (e.target === modal) { modal.remove(); unlockScroll(); } };
        
        modal.querySelector('#logout-btn')?.addEventListener('click', () => {
            localStorage.removeItem('seasalt_user');
            localStorage.removeItem('seasalt_phone');
            localStorage.removeItem(SPIN_WALLET_KEY);
            localStorage.removeItem('seasalt_spin_completed');
            modal.remove(); unlockScroll();
            showToast('Logged out', 'success');
            updateCartUI();
        });

        modal.querySelector('#spin-to-login')?.addEventListener('click', () => {
            modal.remove(); unlockScroll();
            if (typeof SpinWheel !== 'undefined') SpinWheel.show();
        });
    }

    // ══════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════
    function init() {
        console.log('[UI] v11 Initializing...');
        updateCartUI();
        setInterval(syncWalletFromSupabase, 30000);

        document.querySelectorAll('[data-open-cart], #cart-btn').forEach(b => b.onclick = openCart);
        document.querySelectorAll('[data-close-cart], #close-cart').forEach(b => b.onclick = closeCart);
        document.querySelectorAll('[data-open-account], #account-btn').forEach(b => b.onclick = showAccountModal);
        document.getElementById('use-wallet')?.addEventListener('change', updateCartTotal);

        console.log('[UI] v11 Initialized ✅');
    }

    function getElements() {
        return {
            cartSidebar: document.getElementById('cart-sidebar'),
            productModal: document.getElementById('product-modal')
        };
    }

    // ══════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════
    return {
        init,
        showLoading,
        hideLoading,
        showToast,
        renderCategoryPills,
        renderFeaturedProducts,
        renderProducts,
        renderProductModal,
        renderCartItems,
        filterProducts,
        openCart,
        closeCart,
        openProductModal,
        closeProductModal,
        showAccountModal,
        updateCartUI,
        updateCartTotal,
        updateWalletDisplay,
        getSpinWallet,
        syncWalletFromSupabase,
        getElements,
        lockScroll,
        unlockScroll,
        forceUnlockScroll
    };
})();

window.UI = UI;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', UI.init);
else UI.init();
