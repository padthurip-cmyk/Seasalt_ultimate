// ui.js v10 - SeaSalt Pickles
// WITH Supabase wallet sync for admin credits
// Date: February 8, 2026
// CRITICAL: All function names MUST match what app.js expects

var UI = (function () {
    'use strict';

    // ==================== CONFIG ====================
    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNTIzNTEsImV4cCI6MjA1MzYyODM1MX0.LPSwMPKBiMxMTmHOVJxWBbS8kgGDo4RaPNCR63P55Cw';
    var SPIN_WALLET_KEY = 'seasalt_spin_wallet';

    // ==================== SYNC ENGINE ====================
    // Deep sync: polls Supabase every 15 seconds + on page load + on visibility change
    var syncInterval = null;
    var SYNC_INTERVAL_MS = 15000; // 15 seconds for faster reflection

    function getUserPhone() {
        // Check ALL possible localStorage keys where phone might be stored
        var sources = [
            'seasalt_phone',
            'seasalt_user_phone',
            'seasalt_spin_phone'
        ];

        for (var i = 0; i < sources.length; i++) {
            var val = localStorage.getItem(sources[i]);
            if (val && val.length >= 10) return val;
        }

        // Check seasalt_user object
        try {
            var userData = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            if (userData.phone && userData.phone.length >= 10) return userData.phone;
        } catch (e) {}

        // Check wallet data itself
        try {
            var walletData = JSON.parse(localStorage.getItem(SPIN_WALLET_KEY) || '{}');
            if (walletData.phone && walletData.phone.length >= 10) return walletData.phone;
        } catch (e) {}

        return null;
    }

    function syncWalletFromSupabase() {
        var phone = getUserPhone();
        if (!phone) {
            console.log('[UI v10] No phone found for wallet sync');
            return Promise.resolve(null);
        }

        console.log('[UI v10] Syncing wallet from Supabase for:', phone);

        return fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone) + '&select=wallet_balance,wallet_expires_at', {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        })
        .then(function (res) {
            if (!res.ok) {
                console.error('[UI v10] Supabase fetch failed:', res.status);
                return [];
            }
            return res.json();
        })
        .then(function (users) {
            if (users && users.length > 0 && users[0]) {
                var serverBalance = users[0].wallet_balance || 0;
                var serverExpiry = users[0].wallet_expires_at;

                // Get current local wallet data
                var localWallet = null;
                try {
                    localWallet = JSON.parse(localStorage.getItem(SPIN_WALLET_KEY) || 'null');
                } catch (e) {}

                var localBalance = localWallet ? (localWallet.amount || 0) : 0;

                // KEY LOGIC: Server balance is the source of truth
                // Admin sends credits -> server balance increases -> we pick it up here
                if (serverBalance > 0 && serverExpiry) {
                    var expiry = new Date(serverExpiry);
                    if (new Date() < expiry) {
                        // Server has valid wallet data
                        // Always use server balance (admin credits + spin credits are combined on server)
                        var walletData = {
                            amount: serverBalance,
                            expiresAt: serverExpiry,
                            phone: phone,
                            lastSync: new Date().toISOString()
                        };
                        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify(walletData));

                        // Update UI immediately
                        updateWalletDisplay();
                        startWalletTimer();

                        if (serverBalance !== localBalance) {
                            console.log('[UI v10] Wallet updated from Supabase: ₹' + localBalance + ' → ₹' + serverBalance);

                            // Show toast if balance increased (admin sent credits)
                            if (serverBalance > localBalance && localBalance > 0) {
                                showToast('Wallet updated! New balance: ₹' + serverBalance, 'success');
                            } else if (localBalance === 0 && serverBalance > 0) {
                                showToast('You have ₹' + serverBalance + ' wallet credits!', 'success');
                            }
                        }

                        return { amount: serverBalance, timeLeft: expiry - new Date() };
                    } else {
                        // Expired on server
                        console.log('[UI v10] Wallet expired on server');
                        localStorage.removeItem(SPIN_WALLET_KEY);
                        updateWalletDisplay();
                        return null;
                    }
                } else if (serverBalance === 0 && localBalance > 0) {
                    // Server says 0 but local has data - server is truth, clear local
                    console.log('[UI v10] Server balance is 0, clearing local wallet');
                    localStorage.removeItem(SPIN_WALLET_KEY);
                    updateWalletDisplay();
                    return null;
                }
            }
            return null;
        })
        .catch(function (err) {
            console.error('[UI v10] Wallet sync error:', err);
            return null;
        });
    }

    function startWalletSync() {
        // Initial sync
        syncWalletFromSupabase();

        // Recurring sync every 15 seconds
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(function () {
            syncWalletFromSupabase();
        }, SYNC_INTERVAL_MS);

        // Sync when user returns to tab (critical for mobile)
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
                console.log('[UI v10] Tab visible - syncing wallet');
                syncWalletFromSupabase();
            }
        });

        // Sync on focus (for desktop)
        window.addEventListener('focus', function () {
            syncWalletFromSupabase();
        });

        console.log('[UI v10] Wallet sync engine started (every ' + (SYNC_INTERVAL_MS / 1000) + 's)');
    }

    // ==================== DOM ELEMENTS ====================
    var elements = {};

    function getElements() {
        elements = {
            productsContainer: document.getElementById('products-container'),
            categorySections: document.getElementById('category-sections'),
            featuredContainer: document.getElementById('featured-products'),
            categoryPills: document.getElementById('category-pills'),
            cartSidebar: document.getElementById('cart-sidebar'),
            cartOverlay: document.getElementById('cart-overlay'),
            cartItems: document.getElementById('cart-items'),
            cartCount: document.getElementById('cart-count'),
            cartTotal: document.getElementById('cart-total'),
            productModal: document.getElementById('product-modal'),
            modalOverlay: document.getElementById('modal-overlay'),
            searchResults: document.getElementById('search-results'),
            loadingSpinner: document.getElementById('loading-spinner'),
            bottomNav: document.getElementById('bottom-nav'),
            toastContainer: document.getElementById('toast-container'),
            walletBtn: document.getElementById('wallet-btn'),
            walletAmount: document.getElementById('wallet-amount'),
            walletTimer: document.getElementById('wallet-timer')
        };
        return elements;
    }

    // ==================== INIT ====================
    function init() {
        getElements();
        startWalletSync(); // Start the Supabase sync engine
        updateWalletDisplay();
        console.log('[UI v10] Initialized with Supabase wallet sync');
    }

    // ==================== LOADING ====================
    function showLoading() {
        if (elements.loadingSpinner) elements.loadingSpinner.style.display = 'flex';
    }

    function hideLoading() {
        if (elements.loadingSpinner) elements.loadingSpinner.style.display = 'none';
    }

    // ==================== TOAST ====================
    function showToast(message, type) {
        type = type || 'info';
        var container = elements.toastContainer || document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;';
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        var bgColor = type === 'success' ? '#16A34A' : type === 'error' ? '#DC2626' : '#D4451A';
        toast.style.cssText = 'background:' + bgColor + ';color:#fff;padding:12px 20px;border-radius:10px;margin-bottom:8px;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);transform:translateX(120%);transition:transform 0.3s ease;max-width:300px;';
        toast.textContent = message;
        container.appendChild(toast);

        // Slide in
        setTimeout(function () { toast.style.transform = 'translateX(0)'; }, 50);

        // Slide out and remove
        setTimeout(function () {
            toast.style.transform = 'translateX(120%)';
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // ==================== WALLET DISPLAY ====================
    function getSpinWallet() {
        try {
            var data = JSON.parse(localStorage.getItem(SPIN_WALLET_KEY));
            if (data && data.amount && data.expiresAt) {
                var expiry = new Date(data.expiresAt);
                if (new Date() < expiry) {
                    return {
                        amount: data.amount,
                        expiresAt: data.expiresAt,
                        timeLeft: expiry - new Date()
                    };
                } else {
                    // Expired
                    localStorage.removeItem(SPIN_WALLET_KEY);
                }
            }
        } catch (e) {}
        return null;
    }

    function updateWalletDisplay() {
        var wallet = getSpinWallet();
        var walletBtn = document.getElementById('wallet-btn') || elements.walletBtn;
        var walletAmount = document.getElementById('wallet-amount') || elements.walletAmount;

        if (wallet && wallet.amount > 0) {
            if (walletBtn) walletBtn.style.display = 'flex';
            if (walletAmount) walletAmount.textContent = '₹' + wallet.amount;
        } else {
            if (walletBtn) walletBtn.style.display = 'none';
        }
    }

    var walletTimerInterval = null;

    function startWalletTimer() {
        if (walletTimerInterval) clearInterval(walletTimerInterval);

        walletTimerInterval = setInterval(function () {
            var wallet = getSpinWallet();
            var timerEl = document.getElementById('wallet-timer') || elements.walletTimer;

            if (!wallet) {
                if (timerEl) timerEl.textContent = 'Expired';
                updateWalletDisplay();
                clearInterval(walletTimerInterval);
                return;
            }

            var ms = wallet.timeLeft;
            var hours = Math.floor(ms / 3600000);
            var mins = Math.floor((ms % 3600000) / 60000);
            var secs = Math.floor((ms % 60000) / 1000);

            if (timerEl) {
                timerEl.textContent = hours + 'h ' + mins + 'm ' + secs + 's';
            }
        }, 1000);
    }

    // ==================== CATEGORY PILLS ====================
    function renderCategoryPills(categories) {
        var container = elements.categoryPills || document.getElementById('category-pills');
        if (!container || !categories) return;

        container.innerHTML = '';

        var allPill = document.createElement('button');
        allPill.className = 'category-pill active';
        allPill.textContent = 'All';
        allPill.setAttribute('data-category', 'all');
        container.appendChild(allPill);

        categories.forEach(function (cat) {
            var pill = document.createElement('button');
            pill.className = 'category-pill';
            pill.textContent = cat.name || cat;
            pill.setAttribute('data-category', cat.id || cat.name || cat);
            container.appendChild(pill);
        });
    }

    // ==================== PRODUCT CARD ====================
    function createProductCard(product) {
        var card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-product-id', product.id);

        var img = product.image || product.image_url || 'https://via.placeholder.com/200x200?text=SeaSalt';
        var name = product.name || 'Product';
        var price = product.price || product.selling_price || 0;
        var mrp = product.mrp || product.original_price || price;
        var discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

        card.innerHTML =
            '<div class="product-image-wrap">' +
            '<img src="' + img + '" alt="' + name + '" loading="lazy" onerror="this.src=\'https://via.placeholder.com/200x200?text=SeaSalt\'">' +
            (discount > 0 ? '<span class="discount-badge">' + discount + '% OFF</span>' : '') +
            '</div>' +
            '<div class="product-info">' +
            '<h3 class="product-name">' + name + '</h3>' +
            '<div class="product-price">' +
            '<span class="selling-price">₹' + price + '</span>' +
            (mrp > price ? '<span class="original-price">₹' + mrp + '</span>' : '') +
            '</div>' +
            '</div>';

        card.addEventListener('click', function () {
            openProductModal(product);
        });

        return card;
    }

    // ==================== FEATURED PRODUCTS ====================
    function renderFeaturedProducts(products) {
        var container = elements.featuredContainer || document.getElementById('featured-products');
        if (!container) return;

        container.innerHTML = '';

        if (!products || products.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No featured products</p>';
            return;
        }

        var featured = products.filter(function (p) {
            return p.featured || p.is_featured;
        });

        if (featured.length === 0) {
            featured = products.slice(0, 6);
        }

        featured.forEach(function (product) {
            container.appendChild(createProductCard(product));
        });
    }

    // ==================== CATEGORY SECTIONS ====================
    function renderCategorySections(categories, products) {
        var container = elements.categorySections || document.getElementById('category-sections');
        if (!container) return;

        container.innerHTML = '';

        if (!categories || !products) return;

        categories.forEach(function (cat) {
            var catId = cat.id || cat.name || cat;
            var catName = cat.name || cat;
            var catProducts = products.filter(function (p) {
                return p.category === catId || p.category_id === catId || p.category === catName;
            });

            if (catProducts.length === 0) return;

            var section = document.createElement('div');
            section.className = 'category-section';
            section.id = 'category-' + catId;

            section.innerHTML = '<h2 class="section-title">' + catName + '</h2><div class="products-grid"></div>';

            var grid = section.querySelector('.products-grid');
            catProducts.forEach(function (product) {
                grid.appendChild(createProductCard(product));
            });

            container.appendChild(section);
        });
    }

    // ==================== PRODUCTS BY CATEGORY ====================
    function renderProductsByCategory(products, categoryId) {
        var container = elements.productsContainer || document.getElementById('products-container');
        if (!container) return;

        container.innerHTML = '';

        var filtered = categoryId && categoryId !== 'all'
            ? products.filter(function (p) {
                  return p.category === categoryId || p.category_id === categoryId;
              })
            : products;

        filtered.forEach(function (product) {
            container.appendChild(createProductCard(product));
        });
    }

    // ==================== SEARCH RESULTS ====================
    function renderSearchResults(products) {
        var container = elements.searchResults || document.getElementById('search-results');
        if (!container) return;

        container.innerHTML = '';

        if (!products || products.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;padding:40px 20px;">No products found</p>';
            return;
        }

        products.forEach(function (product) {
            container.appendChild(createProductCard(product));
        });
    }

    // ==================== PRODUCT MODAL ====================
    function openProductModal(product) {
        var modal = elements.productModal || document.getElementById('product-modal');
        var overlay = elements.modalOverlay || document.getElementById('modal-overlay');
        if (!modal) return;

        var img = product.image || product.image_url || '';
        var name = product.name || '';
        var price = product.price || product.selling_price || 0;
        var mrp = product.mrp || product.original_price || price;
        var desc = product.description || '';
        var sizes = product.sizes || product.variants || [];

        var sizesHTML = '';
        if (sizes.length > 0) {
            sizesHTML = '<div class="modal-sizes">';
            sizes.forEach(function (s, idx) {
                var sName = s.name || s.size || s;
                var sPrice = s.price || price;
                sizesHTML += '<button class="size-btn' + (idx === 0 ? ' active' : '') + '" data-price="' + sPrice + '" data-size="' + sName + '">' + sName + '</button>';
            });
            sizesHTML += '</div>';
        }

        modal.innerHTML =
            '<div class="modal-content">' +
            '<button class="modal-close" onclick="UI.closeProductModal()">&times;</button>' +
            '<img src="' + img + '" alt="' + name + '" class="modal-image">' +
            '<div class="modal-info">' +
            '<h2>' + name + '</h2>' +
            '<div class="modal-price">' +
            '<span class="selling-price" id="modal-selling-price">₹' + price + '</span>' +
            (mrp > price ? '<span class="original-price">₹' + mrp + '</span>' : '') +
            '</div>' +
            (desc ? '<p class="modal-desc">' + desc + '</p>' : '') +
            sizesHTML +
            '<div class="modal-quantity">' +
            '<button class="qty-btn" id="qty-minus">-</button>' +
            '<span id="qty-value">1</span>' +
            '<button class="qty-btn" id="qty-plus">+</button>' +
            '</div>' +
            '<button class="add-to-cart-btn" id="modal-add-cart">Add to Cart</button>' +
            '</div></div>';

        modal.style.display = 'flex';
        if (overlay) overlay.style.display = 'block';
        modal.setAttribute('data-product', JSON.stringify(product));
        lockScroll();
    }

    function closeProductModal() {
        var modal = elements.productModal || document.getElementById('product-modal');
        var overlay = elements.modalOverlay || document.getElementById('modal-overlay');
        if (modal) modal.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        unlockScroll();
    }

    function updateModalPrice() {
        var modal = elements.productModal || document.getElementById('product-modal');
        if (!modal) return;
        var activeSize = modal.querySelector('.size-btn.active');
        var priceEl = document.getElementById('modal-selling-price');
        if (activeSize && priceEl) {
            priceEl.textContent = '₹' + activeSize.getAttribute('data-price');
        }
    }

    // ==================== CART ====================
    function openCart() {
        var sidebar = elements.cartSidebar || document.getElementById('cart-sidebar');
        var overlay = elements.cartOverlay || document.getElementById('cart-overlay');
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.style.display = 'block';
        lockScroll();
    }

    function closeCart() {
        var sidebar = elements.cartSidebar || document.getElementById('cart-sidebar');
        var overlay = elements.cartOverlay || document.getElementById('cart-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.style.display = 'none';
        unlockScroll();
    }

    function updateCartUI() {
        var cart = [];
        try {
            cart = JSON.parse(localStorage.getItem('seasalt_cart') || '[]');
        } catch (e) {}

        var countEl = elements.cartCount || document.getElementById('cart-count');
        var totalItems = cart.reduce(function (sum, item) { return sum + (item.quantity || 1); }, 0);

        if (countEl) {
            countEl.textContent = totalItems;
            countEl.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    function renderCartItems(cart) {
        var container = elements.cartItems || document.getElementById('cart-items');
        if (!container) return;

        container.innerHTML = '';

        if (!cart || cart.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#999;"><p>Your cart is empty</p></div>';
            return;
        }

        cart.forEach(function (item, index) {
            var div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML =
                '<img src="' + (item.image || '') + '" alt="' + (item.name || '') + '">' +
                '<div class="cart-item-info">' +
                '<h4>' + (item.name || 'Item') + '</h4>' +
                (item.size ? '<span class="cart-item-size">' + item.size + '</span>' : '') +
                '<span class="cart-item-price">₹' + (item.price || 0) + '</span>' +
                '</div>' +
                '<div class="cart-item-qty">' +
                '<button class="qty-btn cart-qty-minus" data-index="' + index + '">-</button>' +
                '<span>' + (item.quantity || 1) + '</span>' +
                '<button class="qty-btn cart-qty-plus" data-index="' + index + '">+</button>' +
                '</div>';
            container.appendChild(div);
        });
    }

    function updateCartTotals(subtotal, delivery, walletDeduction, total) {
        var cartTotal = elements.cartTotal || document.getElementById('cart-total');
        if (!cartTotal) return;

        var html = '<div class="cart-totals">';
        html += '<div class="total-row"><span>Subtotal</span><span>₹' + (subtotal || 0) + '</span></div>';

        if (delivery !== undefined && delivery !== null) {
            html += '<div class="total-row"><span>Delivery</span><span>' + (delivery > 0 ? '₹' + delivery : 'FREE') + '</span></div>';
        }

        if (walletDeduction && walletDeduction > 0) {
            html += '<div class="total-row wallet-row"><span>🎰 Wallet Credit</span><span style="color:#16A34A;">-₹' + walletDeduction + '</span></div>';
        }

        html += '<div class="total-row total-final"><span>Total</span><span>₹' + (total || subtotal || 0) + '</span></div>';
        html += '</div>';

        cartTotal.innerHTML = html;
    }

    // ==================== NAVIGATION ====================
    function updateBottomNav(page) {
        if (!elements.bottomNav) return;
        var items = elements.bottomNav.querySelectorAll('.nav-item');
        items.forEach(function (item) {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });
    }

    // ==================== SCROLL LOCK ====================
    function lockScroll() {
        document.body.style.overflow = 'hidden';
    }

    function unlockScroll() {
        document.body.style.overflow = '';
    }

    function forceUnlockScroll() {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.documentElement.style.overflow = '';
    }

    // ==================== PUBLIC API ====================
    // ALL functions that app.js expects MUST be here
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
