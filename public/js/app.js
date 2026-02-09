/**
 * SeaSalt Pickles - Main Application v5
 * =======================================
 * Entry point. Initializes all modules.
 * FIXED: Added all missing event bindings for cart, product modal, checkout
 */

const App = (function() {
    let isInitialized = false;
    
    async function init() {
        if (isInitialized) return;
        
        console.log('🫙 SeaSalt Pickles - Initializing...');
        
        UI.init();
        UI.showLoading();
        
        try {
            await loadData();
            Cart.init();
            setupEventListeners();
            UI.hideLoading();
            
            isInitialized = true;
            console.log('✅ SeaSalt Pickles - Ready!');
            
        } catch (error) {
            console.error('❌ Initialization Error:', error);
            UI.hideLoading();
            UI.showToast('Failed to load. Please refresh.', 'error');
        }
    }
    
    // ============================================
    // DATA LOADING
    // ============================================
    
    async function loadData() {
        try {
            console.log('[App] Loading data...');
            
            var productsRes = null;
            var categoriesRes = null;
            var configRes = null;
            
            try {
                var results = await Promise.all([
                    API.getProducts().catch(function(e) { console.error('[App] Products error:', e); return null; }),
                    API.getCategories().catch(function(e) { console.error('[App] Categories error:', e); return null; }),
                    API.getSiteConfig().catch(function() { return null; })
                ]);
                productsRes = results[0];
                categoriesRes = results[1];
                configRes = results[2];
            } catch(e) {
                console.error('[App] Promise.all failed:', e);
            }
            
            var hasProducts = productsRes && productsRes.data && Array.isArray(productsRes.data) && productsRes.data.length > 0;
            var hasCategories = categoriesRes && categoriesRes.data && Array.isArray(categoriesRes.data) && categoriesRes.data.length > 0;
            
            console.log('[App] API results - products:', hasProducts ? productsRes.data.length : 'NONE', '| categories:', hasCategories ? categoriesRes.data.length : 'NONE');
            
            if (hasProducts && hasCategories) {
                console.log('[App] ✅ Using Supabase data');
                Store.setProducts(productsRes.data);
                Store.setCategories(categoriesRes.data);
                if (configRes && configRes.data) Store.setSiteConfig(configRes.data);
            } else {
                console.log('[App] ⚠️ Supabase failed, using seed data');
                await loadSeedData();
            }
            
            console.log('[App] Final - Products:', Store.getProducts().length, '| Categories:', Store.getCategories().length);
            renderInitialUI();
            
        } catch (error) {
            console.error('[App] ❌ Fatal error:', error);
            await loadSeedData();
            renderInitialUI();
        }
    }
    
    async function loadSeedData() {
        try {
            var response = await fetch('/data/products-seed.json');
            var data = await response.json();
            Store.setProducts(data.products || []);
            Store.setCategories(data.categories || []);
            if (data.siteConfig) Store.setSiteConfig(data.siteConfig);
        } catch (error) {
            console.error('Failed to load seed data:', error);
            Store.setProducts([]);
            Store.setCategories([]);
        }
    }
    
    // ============================================
    // UI RENDERING
    // ============================================
    
    function renderInitialUI() {
        var products = Store.getActiveProducts();
        var categories = Store.getCategories();
        
        console.log('[App] Rendering UI - Products:', products.length, '| Categories:', categories.length);
        
        UI.renderCategoryPills(categories);
        UI.renderFeaturedProducts(products);
        UI.renderCategorySections(categories, products);
        UI.updateCartUI();
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    function setupEventListeners() {
        setupSearch();
        setupBottomNav();
        setupScrollBehavior();
        setupKeyboardShortcuts();
        setupCartEvents();
        setupProductModalEvents();
        console.log('[App] ✅ Product event listeners attached');
    }

    // ============================================
    // CART EVENTS (was missing in v4!)
    // ============================================
    
    function setupCartEvents() {
        // Open cart
        var cartBtn = document.getElementById('cart-btn');
        if (cartBtn) {
            cartBtn.addEventListener('click', function() {
                UI.openCart();
            });
        }

        // Close cart
        var closeCartBtn = document.getElementById('close-cart');
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', function() {
                UI.closeCart();
            });
        }

        // Cart overlay click to close
        var cartOverlay = document.getElementById('cart-overlay');
        if (cartOverlay) {
            cartOverlay.addEventListener('click', function() {
                UI.closeCart();
            });
        }

        // Checkout button
        var checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function() {
                if (typeof Cart !== 'undefined' && Cart.checkout) {
                    Cart.checkout();
                }
            });
        }

        // Wallet checkbox in cart
        var useWalletCheckbox = document.getElementById('use-wallet');
        if (useWalletCheckbox) {
            useWalletCheckbox.addEventListener('change', function(e) {
                Store.setUseWallet(e.target.checked);
                UI.renderCartItems();
                UI.updateCartUI();
            });
        }
    }
    
    // ============================================
    // PRODUCT MODAL EVENTS (was missing in v4!)
    // ============================================
    
    function setupProductModalEvents() {
        // Close product modal
        var closeProductModal = document.getElementById('close-product-modal');
        if (closeProductModal) {
            closeProductModal.addEventListener('click', function() {
                UI.closeProductModal();
            });
        }
        
        // Product modal overlay click to close
        var productModalOverlay = document.getElementById('product-modal-overlay');
        if (productModalOverlay) {
            productModalOverlay.addEventListener('click', function() {
                UI.closeProductModal();
            });
        }
        
        // Quantity decrease
        var qtyDecrease = document.getElementById('qty-decrease');
        if (qtyDecrease) {
            qtyDecrease.addEventListener('click', function() {
                var state = Store.getState();
                var newQty = Math.max(1, (state.quantity || 1) - 1);
                Store.setQuantity(newQty);
                var qtyEl = document.getElementById('qty-value');
                if (qtyEl) qtyEl.textContent = newQty;
                UI.updateModalPrice();
            });
        }
        
        // Quantity increase
        var qtyIncrease = document.getElementById('qty-increase');
        if (qtyIncrease) {
            qtyIncrease.addEventListener('click', function() {
                var state = Store.getState();
                var newQty = (state.quantity || 1) + 1;
                Store.setQuantity(newQty);
                var qtyEl = document.getElementById('qty-value');
                if (qtyEl) qtyEl.textContent = newQty;
                UI.updateModalPrice();
            });
        }
        
        // ADD TO CART button
        var addToCartBtn = document.getElementById('add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', function() {
                var state = Store.getState();
                var product = state.selectedProduct;
                var variant = state.selectedVariant;
                var quantity = state.quantity || 1;
                
                if (!product || !variant) {
                    UI.showToast('Please select a product', 'error');
                    return;
                }
                
                Store.addToCart(product, variant, quantity);
                UI.updateCartUI();
                UI.closeProductModal();
                UI.showToast(product.name + ' added to cart!', 'success');
            });
        }
    }
    
    function setupSearch() {
        var searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        var debounceTimer = null;
        
        searchInput.addEventListener('input', function(e) {
            var query = e.target.value.trim();
            clearTimeout(debounceTimer);
            var delay = (typeof CONFIG !== 'undefined' && CONFIG.UI && CONFIG.UI.SEARCH_DEBOUNCE) ? CONFIG.UI.SEARCH_DEBOUNCE : 300;
            debounceTimer = setTimeout(function() {
                if (query.length > 0) {
                    var results = Store.searchProducts(query);
                    UI.renderSearchResults(results);
                    document.querySelectorAll('.category-pill').forEach(function(pill) { pill.classList.remove('active'); });
                } else {
                    Store.setActiveCategory('all');
                    var allPill = document.querySelector('.category-pill[data-category="all"]');
                    if (allPill) {
                        document.querySelectorAll('.category-pill').forEach(function(p) {
                            p.classList.remove('active', 'bg-pickle-500', 'text-white');
                            p.classList.add('bg-gray-100', 'text-gray-700');
                        });
                        allPill.classList.add('active', 'bg-pickle-500', 'text-white');
                        allPill.classList.remove('bg-gray-100', 'text-gray-700');
                    }
                    UI.renderCategorySections(Store.getCategories(), Store.getActiveProducts());
                }
            }, delay);
        });
        
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.blur();
            }
        });
    }
    
    function setupBottomNav() {
        document.querySelectorAll('.nav-item').forEach(function(item) {
            item.addEventListener('click', function() {
                navigateToPage(item.dataset.page);
            });
        });
    }
    
    function navigateToPage(page) {
        UI.updateBottomNav(page);
        Store.setCurrentPage(page);
        
        switch (page) {
            case 'home':
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            case 'categories':
                var catSection = document.getElementById('category-sections');
                if (catSection) catSection.scrollIntoView({ behavior: 'smooth' });
                break;
            case 'orders':
                showOrdersPage();
                break;
            case 'account':
                showAccountPage();
                break;
        }
    }
    
    function showOrdersPage() {
        if (typeof Orders !== 'undefined' && Orders.showOrdersPage) {
            Orders.showOrdersPage();
        }
    }
    
    function showAccountPage() {
        var user = Store.getState().user;
        var modal = document.createElement('div');
        modal.id = 'account-modal';
        modal.className = 'fixed inset-0 z-[85] flex items-end justify-center';
        
        var walletBalance = Store.getWalletBalance();
        var walletText = (typeof CONFIG !== 'undefined' && CONFIG.formatPrice) ? CONFIG.formatPrice(walletBalance) : '₹' + walletBalance;
        var version = (typeof CONFIG !== 'undefined' && CONFIG.APP_VERSION) ? CONFIG.APP_VERSION : '1.0';
        
        var content = '';
        if (user) {
            content = '<div class="flex items-center gap-4 p-4 bg-pickle-50 rounded-xl mb-6">' +
                '<div class="w-14 h-14 bg-pickle-500 rounded-full flex items-center justify-center text-white text-2xl">👤</div>' +
                '<div><p class="font-semibold text-gray-800">' + (user.name || 'User') + '</p><p class="text-sm text-gray-500">' + (user.phone || '') + '</p></div></div>' +
                '<div class="grid grid-cols-2 gap-3 mb-6">' +
                '<div class="bg-spice-gold/10 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-spice-gold">' + walletText + '</p><p class="text-sm text-gray-600">Wallet</p></div>' +
                '<div class="bg-pickle-50 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-pickle-600">0</p><p class="text-sm text-gray-600">Orders</p></div></div>' +
                '<button id="logout-btn" class="w-full mt-4 py-3 text-red-500 font-semibold hover:bg-red-50 rounded-xl transition-colors">Logout</button>';
        } else {
            content = '<div class="text-center py-8"><div class="text-6xl mb-4">👤</div><h4 class="font-semibold text-gray-800 mb-2">Not Logged In</h4><p class="text-gray-500 text-sm mb-6">Login to view orders and wallet</p>' +
                '<button id="login-btn" class="px-8 py-3 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 transition-colors">Login / Sign Up</button></div>';
        }
        
        modal.innerHTML = '<div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-modal"></div>' +
            '<div class="relative bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">' +
            '<div class="flex justify-between items-center mb-6"><h3 class="font-display text-xl font-bold text-gray-800">My Account</h3>' +
            '<button class="close-modal w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>' +
            content +
            '<p class="text-center text-xs text-gray-400 mt-6">Version ' + version + '</p></div>';
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        var closeModal = function() { modal.remove(); document.body.style.overflow = ''; };
        modal.querySelectorAll('.close-modal').forEach(function(btn) { btn.addEventListener('click', closeModal); });
        
        var logoutBtn = modal.querySelector('#logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', function() { Store.logout(); closeModal(); UI.showToast('Logged out', 'success'); });
        
        var loginBtn = modal.querySelector('#login-btn');
        if (loginBtn) loginBtn.addEventListener('click', function() { closeModal(); if (typeof SpinWheel !== 'undefined') SpinWheel.show(); });
    }
    
    function setupScrollBehavior() {
        var header = document.getElementById('main-header');
        if (!header) return;
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 10) header.classList.add('shadow-md');
            else header.classList.remove('shadow-md');
        }, { passive: true });
    }
    
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                var productModal = document.getElementById('product-modal');
                var cartSidebar = document.getElementById('cart-sidebar');
                if (productModal && !productModal.classList.contains('hidden')) {
                    UI.closeProductModal();
                } else if (cartSidebar && !cartSidebar.classList.contains('hidden')) {
                    UI.closeCart();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                var si = document.getElementById('search-input');
                if (si) si.focus();
            }
        });
    }
    
    return {
        init: init,
        navigateTo: navigateToPage
    };
})();

document.addEventListener('DOMContentLoaded', function() { App.init(); });
window.App = App;
