/**
 * SeaSalt Pickles - UI Module v10 (Supabase Wallet Sync)
 * ======================================================
 * Based on v9 (Header Shift Fix) - ALL original functions preserved
 * ADDED: syncWalletFromSupabase() for admin credits to reflect in customer wallet
 */

const UI = (function() {
    var elements = {};
    var walletTimerInterval = null;
    var scrollLockCount = 0;
    var scrollbarWidth = 0;
    
    var SPIN_WALLET_KEY = 'seasalt_spin_wallet';

    // ============================================
    // SUPABASE WALLET SYNC ENGINE (v10 addition)
    // ============================================
    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    var walletSyncInterval = null;
    var SYNC_INTERVAL_MS = 15000; // 15 seconds

    function getUserPhone() {
        var sources = ['seasalt_phone', 'seasalt_user_phone', 'seasalt_spin_phone'];
        for (var i = 0; i < sources.length; i++) {
            var val = localStorage.getItem(sources[i]);
            if (val && val.length >= 10) return val;
        }
        try {
            var userData = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            if (userData.phone && userData.phone.length >= 10) return userData.phone;
        } catch (e) {}
        try {
            var walletData = JSON.parse(localStorage.getItem(SPIN_WALLET_KEY) || '{}');
            if (walletData.phone && walletData.phone.length >= 10) return walletData.phone;
        } catch (e) {}
        return null;
    }

    function syncWalletFromSupabase() {
        // v10.1: DISABLED — wallet sync is now handled exclusively by auth-bridge.js v1.3
        // Having two modules writing to seasalt_spin_wallet caused doubling bugs.
        // auth-bridge.js handles: Supabase fetch → 3-key split → combined display write
        console.log('[UI v10.1] Wallet sync delegated to auth-bridge.js');
        return Promise.resolve(null);
    }

    function startWalletSync() {
        // Initial sync
        syncWalletFromSupabase();

        // Recurring sync
        if (walletSyncInterval) clearInterval(walletSyncInterval);
        walletSyncInterval = setInterval(syncWalletFromSupabase, SYNC_INTERVAL_MS);

        // Sync when tab becomes visible (critical for mobile)
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') syncWalletFromSupabase();
        });

        // Sync on window focus
        window.addEventListener('focus', syncWalletFromSupabase);

        console.log('[UI v10] Wallet sync engine started (every ' + (SYNC_INTERVAL_MS / 1000) + 's)');
    }
    
    // ============================================
    // SCROLL LOCK - Prevents layout shift on ALL elements
    // ============================================
    function getScrollbarWidth() {
        return window.innerWidth - document.documentElement.clientWidth;
    }
    
    function lockScroll() {
        if (scrollLockCount === 0) {
            scrollbarWidth = getScrollbarWidth();
            
            // Add padding to body
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = scrollbarWidth + 'px';
            
            // Add padding to fixed elements
            var header = document.getElementById('main-header') || document.querySelector('header');
            var bottomNav = document.getElementById('bottom-nav') || document.querySelector('.bottom-nav');
            
            if (header) header.style.paddingRight = scrollbarWidth + 'px';
            if (bottomNav) bottomNav.style.paddingRight = scrollbarWidth + 'px';
        }
        scrollLockCount++;
    }
    
    function unlockScroll() {
        scrollLockCount--;
        if (scrollLockCount <= 0) {
            scrollLockCount = 0;
            
            // Remove padding from body
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            // Remove padding from fixed elements
            var header = document.getElementById('main-header') || document.querySelector('header');
            var bottomNav = document.getElementById('bottom-nav') || document.querySelector('.bottom-nav');
            
            if (header) header.style.paddingRight = '';
            if (bottomNav) bottomNav.style.paddingRight = '';
        }
    }
    
    function forceUnlockScroll() {
        scrollLockCount = 0;
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        var header = document.getElementById('main-header') || document.querySelector('header');
        var bottomNav = document.getElementById('bottom-nav') || document.querySelector('.bottom-nav');
        
        if (header) header.style.paddingRight = '';
        if (bottomNav) bottomNav.style.paddingRight = '';
    }
    
    function cacheElements() {
        elements.loadingOverlay = document.getElementById('loading-overlay');
        elements.app = document.getElementById('app');
        elements.categoryScroll = document.getElementById('category-scroll');
        elements.featuredProducts = document.getElementById('featured-products');
        elements.categorySections = document.getElementById('category-sections');
        elements.searchInput = document.getElementById('search-input');
        elements.productModal = document.getElementById('product-modal');
        elements.cartSidebar = document.getElementById('cart-sidebar');
        elements.cartItems = document.getElementById('cart-items');
        elements.emptyCart = document.getElementById('empty-cart');
        elements.cartFooter = document.getElementById('cart-footer');
        elements.cartSubtotal = document.getElementById('cart-subtotal');
        elements.cartTotal = document.getElementById('cart-total');
        elements.deliveryCharge = document.getElementById('delivery-charge');
        elements.walletApplySection = document.getElementById('wallet-apply-section');
        elements.availableWallet = document.getElementById('available-wallet');
        elements.cartBtn = document.getElementById('cart-btn');
        elements.cartCount = document.getElementById('cart-count');
        elements.walletBalance = document.getElementById('wallet-balance');
        elements.walletBtn = document.getElementById('wallet-btn');
        elements.useWalletCheckbox = document.getElementById('use-wallet');
        elements.walletDiscountRow = document.getElementById('wallet-discount-row');
        elements.walletDiscount = document.getElementById('wallet-discount');
        elements.qtyValue = document.getElementById('qty-value');
        elements.toastContainer = document.getElementById('toast-container');
        elements.bottomNav = document.getElementById('bottom-nav');
        elements.modalProductName = document.getElementById('modal-product-name');
        elements.modalProductImage = document.getElementById('modal-product-image');
        elements.modalProductRibbon = document.getElementById('modal-product-ribbon');
        elements.modalProductCategory = document.getElementById('modal-product-category');
        elements.modalProductDescription = document.getElementById('modal-product-description');
        elements.variantOptions = document.getElementById('variant-options');
        elements.modalTotalPrice = document.getElementById('modal-total-price');
    }
    
    function init() { 
        cacheElements(); 
        injectWalletStyles();
        
        // Fix category pills clickability - ensure pills are above hero banner
        var catPillsSection = document.getElementById('category-pills');
        if (catPillsSection) {
            catPillsSection.style.zIndex = '45';
            catPillsSection.style.pointerEvents = 'auto';
            catPillsSection.style.isolation = 'isolate';
        }
        var catScroll = document.getElementById('category-scroll');
        if (catScroll) {
            catScroll.style.position = 'relative';
            catScroll.style.zIndex = '5';
            catScroll.style.pointerEvents = 'auto';
        }
        // Ensure hero doesn't overlap pills
        var hero = document.getElementById('hero-banner');
        if (hero) {
            hero.style.position = 'relative';
            hero.style.zIndex = '1';
        }
        
        setTimeout(function() {
            var wallet = getSpinWallet();
            if (wallet) {
                updateWalletDisplay(wallet);
                startWalletTimer();
            }
        }, 100);

        // v10: Start Supabase wallet sync engine
        startWalletSync();
        console.log('[UI v10] Initialized with Supabase wallet sync');
    }
    
    function getElements() { return elements; }
    
    function injectWalletStyles() {
        if (document.getElementById('wallet-timer-css')) return;
        
        var style = document.createElement('style');
        style.id = 'wallet-timer-css';
        style.textContent = '#wallet-btn.has-timer{background:linear-gradient(135deg,#f97316 0%,#ea580c 100%)!important;color:white!important;padding:6px 12px!important;animation:walletGlow 2s ease-in-out infinite}#wallet-btn.has-timer svg{stroke:white!important}#wallet-btn.has-timer #wallet-balance{display:flex!important;flex-direction:column!important;align-items:center!important;line-height:1.1!important;gap:1px!important}.wallet-amount{font-size:14px!important;font-weight:700!important;color:white!important}.wallet-timer{font-size:9px!important;font-weight:600!important;color:rgba(255,255,255,0.9)!important;font-family:monospace!important;background:rgba(0,0,0,0.2)!important;padding:1px 6px!important;border-radius:4px!important}@keyframes walletGlow{0%,100%{box-shadow:0 2px 10px rgba(249,115,22,0.4)}50%{box-shadow:0 2px 20px rgba(249,115,22,0.6)}}';
        document.head.appendChild(style);
    }
    
    function getSpinWallet() {
        try {
            var data = JSON.parse(localStorage.getItem(SPIN_WALLET_KEY) || '{}');
            if (!data.amount || data.amount <= 0) return null;
            var expiresAt = new Date(data.expiresAt);
            var now = new Date();
            if (now >= expiresAt) {
                localStorage.removeItem(SPIN_WALLET_KEY);
                return null;
            }
            return { amount: data.amount, timeLeft: expiresAt - now };
        } catch (e) {
            return null;
        }
    }
    
    function formatTime(ms) {
        if (ms <= 0) return '00:00:00';
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    
    function updateWalletDisplay(wallet) {
        if (!elements.walletBalance) elements.walletBalance = document.getElementById('wallet-balance');
        if (!elements.walletBtn) elements.walletBtn = document.getElementById('wallet-btn');
        if (!elements.walletBalance) return;
        
        if (wallet && wallet.amount > 0) {
            if (elements.walletBtn) elements.walletBtn.classList.add('has-timer');
            elements.walletBalance.innerHTML = '<span class="wallet-amount">₹' + wallet.amount + '</span><span class="wallet-timer">⏱ ' + formatTime(wallet.timeLeft) + '</span>';
        } else {
            if (elements.walletBtn) elements.walletBtn.classList.remove('has-timer');
            elements.walletBalance.textContent = '₹0';
        }
    }
    
    function startWalletTimer() {
        // If cart.js has already patched this function, don't run the original
        // cart.js v12 patches UI.startWalletTimer with its own version
        if (window._cartWalletTimerActive) return;
        
        if (walletTimerInterval) {
            clearInterval(walletTimerInterval);
            walletTimerInterval = null;
        }
        
        walletTimerInterval = setInterval(function() {
            // Stop if cart.js took over
            if (window._cartWalletTimerActive) {
                clearInterval(walletTimerInterval);
                walletTimerInterval = null;
                return;
            }
            var wallet = getSpinWallet();
            if (!wallet) {
                clearInterval(walletTimerInterval);
                walletTimerInterval = null;
                updateWalletDisplay(null);
                return;
            }
            var timerEl = document.querySelector('#wallet-balance .wallet-timer');
            if (timerEl) {
                timerEl.textContent = '⏱ ' + formatTime(wallet.timeLeft);
            } else {
                updateWalletDisplay(wallet);
            }
        }, 1000);
    }

    function fmt(amount) {
        if (typeof CONFIG !== 'undefined' && CONFIG.formatPrice) return CONFIG.formatPrice(amount);
        return '₹' + amount;
    }

    function showLoading() {
        if (elements.loadingOverlay) elements.loadingOverlay.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
        if (elements.app) elements.app.classList.add('hidden');
    }
    
    function hideLoading() {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(function() { elements.loadingOverlay.classList.add('hidden'); }, 500);
        }
        if (elements.app) elements.app.classList.remove('hidden');
    }
    
    function showToast(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;
        var toast = document.createElement('div');
        var bg = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-gray-800';
        var icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
        toast.className = 'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm animate-slide-down ' + bg;
        toast.innerHTML = '<span class="text-lg">' + (icons[type] || 'ℹ') + '</span><span>' + message + '</span>';
        if (elements.toastContainer) {
            elements.toastContainer.appendChild(toast);
            setTimeout(function() { toast.remove(); }, duration);
        }
    }
    
    var EMOJI_MAP = { mango: '🥭', mixed: '🫙', nonveg: '🍗', specialty: '⭐', spicy: '🌶️', sweet: '🍯', veg: '🥒', combo: '🎁' };
    
    function safeEmoji(val, catId) {
        if (val && val !== '' && val !== 'undefined' && val !== 'null' && val !== 'NULL') return val;
        return EMOJI_MAP[catId] || '🫙';
    }
    
    function renderCategoryPills(categories) {
        if (!elements.categoryScroll) return;
        
        // Ensure pills container is clickable (fix z-index overlap from hero)
        elements.categoryScroll.style.position = 'relative';
        elements.categoryScroll.style.zIndex = '10';
        elements.categoryScroll.style.pointerEvents = 'auto';
        // Also fix parent if needed
        if (elements.categoryScroll.parentElement) {
            elements.categoryScroll.parentElement.style.position = 'relative';
            elements.categoryScroll.parentElement.style.zIndex = '10';
        }
        
        var html = '<button class="category-pill active flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all bg-pickle-500 text-white" data-category="all" style="pointer-events:auto;cursor:pointer;">🫙 All</button>';
        for (var i = 0; i < categories.length; i++) {
            var c = categories[i];
            var emoji = safeEmoji(c.emoji || c.icon, c.id);
            html += '<button class="category-pill flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all bg-gray-100 text-gray-700 hover:bg-gray-200" data-category="' + c.id + '" style="pointer-events:auto;cursor:pointer;">' + emoji + ' ' + c.name + '</button>';
        }
        elements.categoryScroll.innerHTML = html;
        
        elements.categoryScroll.querySelectorAll('.category-pill').forEach(function(pill) {
            pill.addEventListener('click', function(e) {
                e.stopPropagation();
                console.log('[UI] Category pill clicked:', pill.dataset.category);
                elements.categoryScroll.querySelectorAll('.category-pill').forEach(function(p) {
                    p.classList.remove('active', 'bg-pickle-500', 'text-white');
                    p.classList.add('bg-gray-100', 'text-gray-700');
                });
                pill.classList.add('active', 'bg-pickle-500', 'text-white');
                pill.classList.remove('bg-gray-100', 'text-gray-700');
                Store.setActiveCategory(pill.dataset.category);
                renderCategorySections(Store.getCategories(), Store.getActiveProducts());
                
                // Scroll to products
                var catSection = document.getElementById('category-sections');
                if (catSection) catSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
        
        console.log('[UI] Category pills rendered:', categories.length + 1, 'pills');
    }
    
    function createProductCard(product) {
        var variants = product.variants;
        if (!variants || !Array.isArray(variants) || variants.length === 0) {
            variants = [{ price: product.price || 199, weight: '250g' }];
        }
        var v = variants[0] || { price: 199, weight: '250g' };
        var price = Number(v.price) || 199;
        var weight = String(v.weight || v.size || '250g');
        var img = product.image || (product.images && product.images[0]) || 'https://placehold.co/300x300/D4451A/fff?text=Pickle';
        var name = product.name || 'Product';
        var id = product.id || 'unknown';
        var badge = product.badge || product.ribbon || '';
        var badgeHTML = badge ? '<span class="absolute top-3 left-3 px-2 py-1 bg-spice-gold text-white text-xs font-bold rounded-full">' + badge + '</span>' : '';
        
        return '<div class="product-card bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg" data-product-id="' + id + '">' +
            '<div class="relative aspect-square bg-gradient-to-br from-pickle-50 to-orange-50">' +
                '<img src="' + img + '" alt="' + name + '" class="w-full h-full object-cover" loading="lazy" onerror="this.src=\'https://placehold.co/300x300/D4451A/fff?text=Pickle\'">' +
                badgeHTML +
                '<button class="product-quick-add absolute bottom-2 right-2 w-8 h-8 bg-pickle-500 text-white rounded-full flex items-center justify-center hover:bg-pickle-600 transition-colors shadow-lg" data-product-id="' + id + '">' +
                    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="p-4">' +
                '<h3 class="font-display font-bold text-gray-800 mb-1 line-clamp-1">' + name + '</h3>' +
                '<p class="text-gray-500 text-sm mb-2">' + weight + '</p>' +
                '<div class="flex items-center justify-between">' +
                    '<span class="text-lg font-bold text-pickle-600">' + fmt(price) + '</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    }
    
    function handleQuickAdd(product) {
        var variant = (product.variants && product.variants[0]) ? product.variants[0] : { weight: '250g', price: 199 };
        Store.addToCart(product, variant, 1);
        updateCartUI();
        showToast(product.name + ' added to cart', 'success');
    }
    
    function renderFeaturedProducts(products) {
        if (!elements.featuredProducts) return;
        var featured = products.slice(0, 6);
        if (featured.length === 0) {
            var section = document.getElementById('featured-section');
            if (section) section.classList.add('hidden');
            return;
        }
        var section = document.getElementById('featured-section');
        if (section) section.classList.remove('hidden');
        var parent = elements.featuredProducts.parentElement;
        if (parent) parent.classList.remove('hidden');
        var html = '';
        for (var i = 0; i < featured.length; i++) {
            try { html += createProductCard(featured[i]); } catch(e) {}
        }
        elements.featuredProducts.innerHTML = html;
        bindProductCardEvents(elements.featuredProducts);
    }
    
    function renderCategorySections(categories, products) {
        if (!elements.categorySections) return;
        var activeCategory = Store.getState().activeCategory;
        var html = '';
        
        if (activeCategory === 'all') {
            for (var i = 0; i < categories.length; i++) {
                var cat = categories[i];
                var catProducts = products.filter(function(p) { return p.category === cat.id; });
                if (catProducts.length === 0) continue;
                var emoji = safeEmoji(cat.emoji || cat.icon, cat.id);
                html += '<section class="mb-8"><div class="max-w-lg mx-auto px-4">';
                html += '<div class="flex items-center justify-between mb-4"><h2 class="font-display text-xl font-bold text-gray-800">' + emoji + ' ' + cat.name + '</h2></div>';
                html += '<div class="grid grid-cols-2 gap-3">';
                for (var j = 0; j < catProducts.length; j++) {
                    try { html += createProductCard(catProducts[j]); } catch(e) {}
                }
                html += '</div></div></section>';
            }
        } else {
            var catProducts = products.filter(function(p) { return p.category === activeCategory; });
            var cat = categories.find(function(c) { return c.id === activeCategory; });
            var emoji = cat ? safeEmoji(cat.emoji || cat.icon, cat.id) : '🫙';
            var catName = cat ? cat.name : 'Products';
            html += '<section class="mb-8"><div class="max-w-lg mx-auto px-4">';
            html += '<div class="flex items-center justify-between mb-4"><h2 class="font-display text-xl font-bold text-gray-800">' + emoji + ' ' + catName + '</h2></div>';
            html += '<div class="grid grid-cols-2 gap-3">';
            for (var k = 0; k < catProducts.length; k++) {
                try { html += createProductCard(catProducts[k]); } catch(e) {}
            }
            html += '</div></div></section>';
        }
        
        elements.categorySections.innerHTML = html;
        bindProductCardEvents(elements.categorySections);
    }
    
    function renderProductsByCategory(category) {
        var products = (typeof Store.getProductsByCategory === 'function') ? Store.getProductsByCategory(category) : Store.getActiveProducts();
        renderCategorySections(Store.getCategories(), products);
    }
    
    function renderSearchResults(products) {
        if (!elements.categorySections) return;
        if (products.length === 0) {
            elements.categorySections.innerHTML = '<div class="text-center py-12"><div class="text-6xl mb-4">🔍</div><h3 class="font-display text-xl font-bold text-gray-800 mb-2">No products found</h3><p class="text-gray-500">Try a different search term</p></div>';
            return;
        }
        var html = '<section class="mb-8"><div class="max-w-lg mx-auto px-4"><div class="flex items-center justify-between mb-4"><h3 class="font-display text-xl font-bold text-gray-800">Search Results (' + products.length + ')</h3></div><div class="grid grid-cols-2 gap-3">';
        for (var i = 0; i < products.length; i++) {
            try { html += createProductCard(products[i]); } catch(e) {}
        }
        html += '</div></div></section>';
        elements.categorySections.innerHTML = html;
        bindProductCardEvents(elements.categorySections);
    }
    
    function bindProductCardEvents(container) {
        if (!container) return;
        container.querySelectorAll('.product-card').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.product-quick-add')) {
                    e.stopPropagation();
                    var pid = (e.target.closest('.product-quick-add').dataset.productId) || card.dataset.productId;
                    var product = Store.getProducts().find(function(p) { return p.id === pid; });
                    if (product) handleQuickAdd(product);
                    return;
                }
                var product = Store.getProducts().find(function(p) { return p.id === card.dataset.productId; });
                if (product) openProductModal(product);
            });
        });
    }
    
    function openProductModal(product) {
        if (!elements.productModal) return;
        Store.setSelectedProduct(product);
        
        var variants = product.variants || [{ weight: '250g', price: 199 }];
        var selectedVariant = variants[0];
        var img = product.image || (product.images && product.images[0]) || 'https://placehold.co/400x400/D4451A/fff?text=Pickle';
        
        if (elements.modalProductName) elements.modalProductName.textContent = product.name;
        if (elements.modalProductImage) { elements.modalProductImage.src = img; elements.modalProductImage.alt = product.name; }
        if (elements.modalProductRibbon) {
            var ribbon = product.badge || product.ribbon || '';
            elements.modalProductRibbon.textContent = ribbon;
            elements.modalProductRibbon.style.display = ribbon ? 'block' : 'none';
        }
        if (elements.modalProductCategory) elements.modalProductCategory.textContent = product.category || product.primaryCategory || '';
        if (elements.modalProductDescription) elements.modalProductDescription.textContent = product.description || '';
        
        if (elements.variantOptions) {
            var vh = '';
            for (var i = 0; i < variants.length; i++) {
                var v = variants[i];
                var w = v.weight || v.size || '250g';
                vh += '<button class="variant-option px-4 py-2 rounded-xl text-sm font-medium transition-all ' + (i === 0 ? 'bg-pickle-500 text-white selected' : 'bg-gray-100 text-gray-700') + '" data-index="' + i + '">' + w + ' - ' + fmt(v.price) + '</button>';
            }
            elements.variantOptions.innerHTML = vh;
            elements.variantOptions.querySelectorAll('.variant-option').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    elements.variantOptions.querySelectorAll('.variant-option').forEach(function(b) {
                        b.classList.remove('bg-pickle-500', 'text-white', 'selected');
                        b.classList.add('bg-gray-100', 'text-gray-700');
                    });
                    btn.classList.add('bg-pickle-500', 'text-white', 'selected');
                    btn.classList.remove('bg-gray-100', 'text-gray-700');
                    Store.setSelectedVariant(variants[parseInt(btn.dataset.index)]);
                    updateModalPrice();
                });
            });
        }
        
        Store.setSelectedVariant(selectedVariant);
        Store.setQuantity(1);
        if (elements.qtyValue) elements.qtyValue.textContent = '1';
        updateModalPrice();
        
        elements.productModal.classList.remove('hidden');
        lockScroll();
    }
    
    function closeProductModal() {
        if (elements.productModal) {
            elements.productModal.classList.add('hidden');
            unlockScroll();
            Store.setSelectedProduct(null);
        }
    }
    
    function updateModalPrice() {
        var state = Store.getState();
        var variant = state.selectedVariant;
        var quantity = state.quantity || 1;
        if (variant && elements.modalTotalPrice) {
            elements.modalTotalPrice.textContent = fmt(variant.price * quantity);
        }
    }
    
    function openCart() {
        if (elements.cartSidebar) {
            elements.cartSidebar.classList.remove('hidden');
            lockScroll();
            renderCartItems();
        }
    }
    
    function closeCart() {
        if (elements.cartSidebar) {
            elements.cartSidebar.classList.add('hidden');
            unlockScroll();
        }
    }
    
    function updateCartUI() {
        var count = Store.getCartItemCount();
        if (elements.cartCount) {
            elements.cartCount.textContent = count;
            elements.cartCount.classList.toggle('hidden', count === 0);
        }
        
        // Update floating cart FAB
        updateFloatingCartFab(count);
        
        var spinWallet = getSpinWallet();
        if (spinWallet && spinWallet.amount > 0) {
            updateWalletDisplay(spinWallet);
            if (!walletTimerInterval) startWalletTimer();
        } else {
            updateWalletDisplay(null);
        }
    }
    
    // ============ FLOATING CART FAB ============
    function createFloatingCartFab() {
        // Don't create if already exists
        if (document.getElementById('cart-fab')) return;
        
        var fab = document.createElement('div');
        fab.id = 'cart-fab';
        fab.style.cssText = 'display:none;position:fixed;bottom:80px;right:16px;z-index:80;' +
            'background:linear-gradient(135deg,#D4451A,#B91C1C);color:#fff;' +
            'border-radius:20px;padding:12px 20px;cursor:pointer;' +
            'box-shadow:0 4px 20px rgba(212,69,26,0.4);' +
            'transition:transform 0.2s,opacity 0.2s;transform:scale(0.9);opacity:0;' +
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        fab.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
            '<span id="cart-fab-text" style="font-weight:700;font-size:14px;">View Cart</span>' +
            '<span id="cart-fab-count" style="background:#fff;color:#D4451A;font-weight:800;font-size:12px;' +
            'min-width:22px;height:22px;border-radius:11px;display:flex;align-items:center;justify-content:center;">0</span>' +
            '</div>';
        
        fab.addEventListener('click', function() {
            openCart();
        });
        
        document.body.appendChild(fab);
    }
    
    function updateFloatingCartFab(count) {
        var fab = document.getElementById('cart-fab');
        if (!fab) {
            if (count > 0) {
                createFloatingCartFab();
                fab = document.getElementById('cart-fab');
            } else {
                return;
            }
        }
        
        var fabCount = document.getElementById('cart-fab-count');
        var fabText = document.getElementById('cart-fab-text');
        
        if (count > 0) {
            fab.style.display = 'block';
            // Small delay for animation
            setTimeout(function() {
                fab.style.transform = 'scale(1)';
                fab.style.opacity = '1';
            }, 50);
            if (fabCount) fabCount.textContent = count;
            
            // Show subtotal if available
            try {
                var cart = Store.getCart();
                if (cart && cart.subtotal > 0 && fabText) {
                    fabText.textContent = '\u20b9' + cart.subtotal + ' \u2022 View Cart';
                }
            } catch(e) {}
        } else {
            fab.style.transform = 'scale(0.9)';
            fab.style.opacity = '0';
            setTimeout(function() { fab.style.display = 'none'; }, 200);
        }
    }
    
    function renderCartItems() {
        var cart = Store.getCart();
        if (!elements.cartItems) return;
        
        if (cart.items.length === 0) {
            if (elements.emptyCart) elements.emptyCart.classList.remove('hidden');
            if (elements.cartFooter) elements.cartFooter.classList.add('hidden');
            return;
        }
        
        if (elements.emptyCart) elements.emptyCart.classList.add('hidden');
        if (elements.cartFooter) elements.cartFooter.classList.remove('hidden');
        
        var existing = elements.cartItems.querySelectorAll('.cart-item');
        existing.forEach(function(item) { item.remove(); });
        
        cart.items.forEach(function(item) {
            var el = document.createElement('div');
            el.className = 'cart-item flex gap-3 p-3 bg-white rounded-xl mb-2';
            el.dataset.itemId = item.id;
            var img = item.image || 'https://placehold.co/80x80/D4451A/fff?text=Pickle';
            var size = item.size || item.weight || '250g';
            el.innerHTML = '<div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"><img src="' + img + '" alt="' + item.name + '" class="w-full h-full object-cover"></div><div class="flex-1 min-w-0"><h4 class="font-semibold text-gray-800 text-sm truncate">' + item.name + '</h4><p class="text-xs text-gray-500">' + size + '</p><div class="flex items-center justify-between mt-1"><div class="flex items-center gap-2"><button class="cart-qty-btn w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs" data-action="decrease" data-item-id="' + item.id + '">−</button><span class="text-sm font-medium">' + item.quantity + '</span><button class="cart-qty-btn w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs" data-action="increase" data-item-id="' + item.id + '">+</button></div><span class="font-bold text-pickle-600 text-sm">' + fmt(item.price * item.quantity) + '</span></div></div>';
            
            el.querySelectorAll('.cart-qty-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var currentItem = cart.items.find(function(i) { return i.id === btn.dataset.itemId; });
                    if (currentItem) {
                        var newQty = btn.dataset.action === 'increase' ? currentItem.quantity + 1 : currentItem.quantity - 1;
                        Store.updateCartItem(btn.dataset.itemId, newQty);
                        renderCartItems();
                        updateCartUI();
                    }
                });
            });
            
            if (elements.emptyCart) {
                elements.cartItems.insertBefore(el, elements.emptyCart);
            } else {
                elements.cartItems.appendChild(el);
            }
        });
        
        updateCartTotals();
    }
    
    function updateCartTotals() {
        var cart = Store.getCart();
        var spinWallet = getSpinWallet();
        var walletBalance = spinWallet ? spinWallet.amount : 0;
        
        // Check if wallet checkbox is checked
        var useWalletCheckbox = document.getElementById('use-wallet');
        var useWallet = useWalletCheckbox ? useWalletCheckbox.checked : false;
        
        // Get delivery charge - try Cart module first, then calculate directly
        var subtotal = cart.subtotal || 0;
        var deliveryCharge = 0;
        
        try {
            if (typeof Cart !== 'undefined' && typeof Cart.getDeliveryCharge === 'function') {
                deliveryCharge = Cart.getDeliveryCharge(subtotal);
            }
        } catch (e) {}
        
        // Fallback: if Cart module didn't return a number, use default logic
        if (typeof deliveryCharge !== 'number' || isNaN(deliveryCharge)) {
            deliveryCharge = subtotal >= 500 ? 0 : 50;
        }
        
        console.log('[UI] Cart totals - subtotal:', subtotal, 'delivery:', deliveryCharge, 'wallet:', walletBalance);
        
        // Calculate wallet discount from SPIN wallet (not Store.wallet)
        var walletDiscount = 0;
        if (useWallet && walletBalance > 0) {
            walletDiscount = Math.min(walletBalance, subtotal + deliveryCharge);
        }
        var total = Math.max(0, subtotal + deliveryCharge - walletDiscount);
        
        if (elements.cartSubtotal) elements.cartSubtotal.textContent = fmt(subtotal);
        if (elements.deliveryCharge) {
            if (subtotal === 0) {
                elements.deliveryCharge.textContent = fmt(0);
            } else if (deliveryCharge === 0) {
                elements.deliveryCharge.innerHTML = '<span class="text-spice-leaf font-medium">FREE</span>';
            } else {
                elements.deliveryCharge.textContent = fmt(deliveryCharge);
            }
        }
        if (walletBalance > 0 && elements.walletApplySection) {
            elements.walletApplySection.classList.remove('hidden');
            if (elements.availableWallet) elements.availableWallet.textContent = fmt(walletBalance);
        } else if (elements.walletApplySection) {
            elements.walletApplySection.classList.add('hidden');
        }
        if (walletDiscount > 0 && elements.walletDiscountRow) {
            elements.walletDiscountRow.style.display = 'flex';
            if (elements.walletDiscount) elements.walletDiscount.textContent = '-' + fmt(walletDiscount);
        } else if (elements.walletDiscountRow) {
            elements.walletDiscountRow.style.display = 'none';
        }
        if (elements.cartTotal) elements.cartTotal.textContent = fmt(total);
    }
    
    function updateBottomNav(page) {
        document.querySelectorAll('.nav-item').forEach(function(item) {
            item.classList.remove('active');
            if (item.dataset.page === page) item.classList.add('active');
        });
    }
    
    return {
        init: init,
        getElements: getElements,
        showLoading: showLoading,
        hideLoading: hideLoading,
        showToast: showToast,
        renderCategoryPills: renderCategoryPills,
        createProductCard: createProductCard,
        renderFeaturedProducts: renderFeaturedProducts,
        renderCategorySections: renderCategorySections,
        renderProductsByCategory: renderProductsByCategory,
        renderSearchResults: renderSearchResults,
        openProductModal: openProductModal,
        closeProductModal: closeProductModal,
        updateModalPrice: updateModalPrice,
        openCart: openCart,
        closeCart: closeCart,
        updateCartUI: updateCartUI,
        renderCartItems: renderCartItems,
        updateCartTotals: updateCartTotals,
        updateBottomNav: updateBottomNav,
        startWalletTimer: startWalletTimer,
        updateWalletDisplay: updateWalletDisplay,
        getSpinWallet: getSpinWallet,
        syncWalletFromSupabase: syncWalletFromSupabase,
        getUserPhone: getUserPhone,
        SPIN_WALLET_KEY: SPIN_WALLET_KEY,
        lockScroll: lockScroll,
        unlockScroll: unlockScroll,
        forceUnlockScroll: forceUnlockScroll
    };
})();

window.UI = UI;
