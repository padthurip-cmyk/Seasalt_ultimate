/**
 * SeaSalt Pickles - Main Application v5
 * =======================================
 * Entry point. Initializes all modules.
 * FIXED: Added all missing event bindings for cart, product modal, checkout
 */

// ── POLYFILL: Add searchProducts to Store if missing ──
(function() {
    function patchStore() {
        if (typeof Store === 'undefined') return;
        if (typeof Store.searchProducts === 'function') return;
        
        Store.searchProducts = function(query) {
            if (!query || !query.trim()) return Store.getProducts ? Store.getProducts() : [];
            var products = Store.getProducts ? Store.getProducts() : [];
            var q = query.toLowerCase().trim();
            return products.filter(function(p) {
                var name = (p.name || '').toLowerCase();
                var desc = (p.description || '').toLowerCase();
                var cat = (p.category || '').toLowerCase();
                var badge = (p.badge || '').toLowerCase();
                return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1 || cat.indexOf(q) !== -1 || badge.indexOf(q) !== -1;
            });
        };
        console.log('[App] Store.searchProducts patched ✅');
    }
    
    // Patch immediately if Store exists, otherwise patch after a short delay
    patchStore();
    if (typeof Store === 'undefined') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(patchStore, 100);
            setTimeout(patchStore, 500);
            setTimeout(patchStore, 1500);
        });
    }
})();

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
                    if (typeof Store !== 'undefined' && typeof Store.searchProducts === 'function') {
                        var results = Store.searchProducts(query);
                        UI.renderSearchResults(results);
                    } else {
                        console.warn('[Search] Store.searchProducts not available');
                    }
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
                showCategoriesModal();
                break;
            case 'orders':
                showOrdersPage();
                break;
            case 'account':
                showAccountPage();
                break;
        }
    }
    
    function showCategoriesModal() {
        var categories = Store.getCategories();
        if (!categories || categories.length === 0) return;
        
        var EMOJI_MAP = { mango: '🥭', mixed: '🫙', nonveg: '🍗', specialty: '⭐', spicy: '🌶️', sweet: '🍯', veg: '🥒', combo: '🎁' };
        
        var listHtml = '';
        
        // "All" option
        listHtml += '<button class="cat-list-item w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-pickle-50 transition-colors text-left" data-category="all">' +
            '<span class="w-12 h-12 bg-pickle-100 rounded-xl flex items-center justify-center text-2xl">🫙</span>' +
            '<div class="flex-1"><p class="font-semibold text-gray-800">All Products</p><p class="text-sm text-gray-500">Browse everything</p></div>' +
            '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' +
            '</button>';
        
        for (var i = 0; i < categories.length; i++) {
            var cat = categories[i];
            var emoji = (cat.emoji || cat.icon || '');
            if (!emoji || emoji === 'undefined' || emoji === 'null' || emoji === 'NULL' || emoji === '') {
                emoji = EMOJI_MAP[cat.id] || '🫙';
            }
            var productCount = Store.getProducts().filter(function(p) {
                var isActive = (p.isActive !== false && p.isActive !== 'false' && p.is_active !== false && p.is_active !== 'false');
                return isActive && p.category === cat.id;
            }).length;
            
            listHtml += '<button class="cat-list-item w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-pickle-50 transition-colors text-left" data-category="' + cat.id + '">' +
                '<span class="w-12 h-12 bg-pickle-100 rounded-xl flex items-center justify-center text-2xl">' + emoji + '</span>' +
                '<div class="flex-1"><p class="font-semibold text-gray-800">' + cat.name + '</p><p class="text-sm text-gray-500">' + productCount + ' product' + (productCount !== 1 ? 's' : '') + '</p></div>' +
                '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' +
                '</button>';
        }
        
        var modal = document.createElement('div');
        modal.id = 'categories-modal';
        modal.className = 'fixed inset-0 z-[85] flex items-end justify-center';
        modal.innerHTML = '<div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-cat-modal"></div>' +
            '<div class="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-slide-up">' +
                '<div class="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10">' +
                    '<h3 class="font-display text-xl font-bold text-gray-800">📂 Categories</h3>' +
                    '<button class="close-cat-modal w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">' +
                        '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
                    '</button>' +
                '</div>' +
                '<div class="p-4 overflow-y-auto max-h-[calc(80vh-70px)] space-y-2">' +
                    listHtml +
                '</div>' +
            '</div>';
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        var closeModal = function() { 
            modal.remove(); 
            document.body.style.overflow = ''; 
            UI.updateBottomNav('home');
        };
        
        modal.querySelectorAll('.close-cat-modal').forEach(function(btn) { 
            btn.addEventListener('click', closeModal); 
        });
        
        // Handle category selection
        modal.querySelectorAll('.cat-list-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var catId = item.dataset.category;
                Store.setActiveCategory(catId);
                
                // Update top pills to match selection
                var pills = document.querySelectorAll('.category-pill');
                pills.forEach(function(p) {
                    p.classList.remove('active', 'bg-pickle-500', 'text-white');
                    p.classList.add('bg-gray-100', 'text-gray-700');
                    if (p.dataset.category === catId) {
                        p.classList.add('active', 'bg-pickle-500', 'text-white');
                        p.classList.remove('bg-gray-100', 'text-gray-700');
                    }
                });
                
                // Re-render products
                UI.renderCategorySections(Store.getCategories(), Store.getActiveProducts());
                
                closeModal();
                
                // Scroll to products
                var catSection = document.getElementById('category-sections');
                if (catSection) {
                    setTimeout(function() {
                        catSection.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            });
        });
    }
    
    function showOrdersPage() {
        // Try all possible orders module exports
        if (typeof OrdersFix !== 'undefined' && OrdersFix.showOrdersPage) {
            OrdersFix.showOrdersPage();
        } else if (typeof Orders !== 'undefined' && Orders.showOrdersPage) {
            Orders.showOrdersPage();
        } else if (typeof OrdersPage !== 'undefined' && OrdersPage.init) {
            OrdersPage.init();
        } else if (typeof Cart !== 'undefined' && Cart.showOrdersPage) {
            Cart.showOrdersPage();
        } else {
            UI.showToast('Orders page loading...', 'info');
        }
    }
    
    async function showAccountPage() {
        // Gather user data from all sources
        var user = null;
        
        // 1. Try Store
        if (typeof Store !== 'undefined' && Store.getState) {
            user = Store.getState().user;
        }
        // 2. Try seasalt_user localStorage
        if (!user || (!user.name && !user.phone)) {
            try {
                var savedUser = localStorage.getItem('seasalt_user');
                if (savedUser) {
                    var parsed = JSON.parse(savedUser);
                    if (parsed && (parsed.name || parsed.phone)) user = parsed;
                }
            } catch (e) {}
        }
        // 3. Try individual phone keys
        if (!user || !user.phone) {
            var phone = localStorage.getItem('seasalt_phone') || localStorage.getItem('seasalt_user_phone') || localStorage.getItem('seasalt_spin_phone');
            if (phone) {
                if (!user) user = {};
                user.phone = phone;
                try {
                    var su = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                    if (su.name) user.name = su.name;
                    if (su.country) user.country = su.country;
                } catch(e) {}
            }
        }
        
        console.log('[Account] User data:', JSON.stringify(user));
        console.log('[Account] seasalt_user raw:', localStorage.getItem('seasalt_user'));
        
        // 4. If we have phone but no name, fetch from Supabase BEFORE rendering
        if (user && user.phone && (!user.name || user.name.trim() === '')) {
            try {
                var supaUrl = 'https://yosjbsncvghpscsrvxds.supabase.co';
                var supaKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
                var res = await fetch(supaUrl + '/rest/v1/users?phone=eq.' + encodeURIComponent(user.phone) + '&select=name', {
                    headers: { 'apikey': supaKey, 'Authorization': 'Bearer ' + supaKey }
                });
                var data = await res.json();
                console.log('[Account] Supabase user data:', JSON.stringify(data));
                if (data && data[0] && data[0].name && data[0].name.trim()) {
                    user.name = data[0].name;
                    // Also save to localStorage for next time
                    try {
                        var u = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                        u.name = data[0].name;
                        u.phone = user.phone;
                        localStorage.setItem('seasalt_user', JSON.stringify(u));
                    } catch(e) {}
                }
            } catch (e) { console.warn('[Account] Supabase fetch failed:', e); }
        }
        
        var modal = document.createElement('div');
        modal.id = 'account-modal';
        modal.className = 'fixed inset-0 z-[85] flex items-end justify-center';
        
        var walletBalance = 0;
        if (typeof Store !== 'undefined' && Store.getWalletBalance) walletBalance = Store.getWalletBalance();
        if (!walletBalance || walletBalance <= 0) {
            try {
                var wData = JSON.parse(localStorage.getItem('seasalt_spin_wallet') || '{}');
                if (wData.amount && new Date(wData.expiresAt) > new Date()) walletBalance = wData.amount;
            } catch(e) {}
        }
        var walletText = '\u20b9' + (walletBalance || 0);
        
        var orderCount = 0;
        try { orderCount = JSON.parse(localStorage.getItem('seasalt_orders') || '[]').length; } catch(e) {}
        
        var version = (typeof CONFIG !== 'undefined' && CONFIG.APP_VERSION) ? CONFIG.APP_VERSION : '1.0';
        
        var content = '';
        if (user) {
            var displayName = user.name || '';
            var displayPhone = user.phone || '';
            var hasName = displayName && displayName !== 'User' && displayName.trim() !== '';
            var initials = hasName ? displayName.charAt(0).toUpperCase() : '\uD83D\uDC64';
            
            content = '<div class="p-4 bg-pickle-50 rounded-xl mb-6">' +
                '<div class="flex items-center gap-4">' +
                '<div id="profile-initial" class="w-14 h-14 bg-pickle-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">' + initials + '</div>' +
                '<div class="flex-1">' +
                // Name section - editable
                '<div class="flex items-center gap-2">' +
                '<p id="profile-display-name" class="font-semibold text-gray-800">' + (hasName ? displayName : '<span class=\"text-gray-400 italic\">Tap to add name</span>') + '</p>' +
                '<button id="edit-name-btn" class="text-pickle-500 hover:text-pickle-600" title="Edit name">' +
                '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button></div>' +
                // Name edit input (hidden by default)
                '<div id="name-edit-row" style="display:none" class="mt-2 flex gap-2">' +
                '<input type="text" id="edit-name-input" placeholder="Enter your name" value="' + (hasName ? displayName : '') + '" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-pickle-500">' +
                '<button id="save-name-btn" class="px-3 py-2 bg-pickle-500 text-white rounded-lg text-sm font-semibold">Save</button></div>' +
                '<p class="text-sm text-gray-500 mt-1">' + displayPhone + '</p>' +
                '</div></div></div>' +
                
                '<div class="grid grid-cols-2 gap-3 mb-6">' +
                '<div class="bg-spice-gold/10 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-spice-gold">' + walletText + '</p><p class="text-sm text-gray-600">Wallet</p></div>' +
                '<div class="bg-pickle-50 rounded-xl p-4 text-center cursor-pointer" onclick="document.getElementById(\'account-modal\').remove();document.body.style.overflow=\'\';if(typeof App!==\'undefined\')App.navigateTo(\'orders\');">' +
                '<p class="text-2xl font-bold text-pickle-600">' + orderCount + '</p><p class="text-sm text-gray-600">Orders</p></div></div>' +
                '<button id="logout-btn" class="w-full mt-4 py-3 text-red-500 font-semibold hover:bg-red-50 rounded-xl transition-colors">Logout</button>';
        } else {
            content = '<div class="text-center py-8"><div class="text-6xl mb-4">\uD83D\uDC64</div><h4 class="font-semibold text-gray-800 mb-2">Not Logged In</h4><p class="text-gray-500 text-sm mb-6">Login to view orders and wallet</p>' +
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
        
        // Edit name functionality
        var editNameBtn = modal.querySelector('#edit-name-btn');
        var nameEditRow = modal.querySelector('#name-edit-row');
        var editNameInput = modal.querySelector('#edit-name-input');
        var saveNameBtn = modal.querySelector('#save-name-btn');
        var profileDisplayName = modal.querySelector('#profile-display-name');
        var profileInitial = modal.querySelector('#profile-initial');
        
        if (editNameBtn && nameEditRow) {
            editNameBtn.addEventListener('click', function() {
                nameEditRow.style.display = 'flex';
                editNameInput.focus();
            });
        }
        if (saveNameBtn && editNameInput) {
            var saveName = function() {
                var newName = editNameInput.value.trim();
                if (!newName) { 
                    if (typeof UI !== 'undefined') UI.showToast('Please enter a name', 'error'); 
                    return; 
                }
                // Save to localStorage
                try {
                    var u = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                    u.name = newName;
                    localStorage.setItem('seasalt_user', JSON.stringify(u));
                } catch(e) {
                    localStorage.setItem('seasalt_user', JSON.stringify({ name: newName, phone: user.phone }));
                }
                // Update Supabase
                if (user.phone) {
                    var supaUrl = 'https://yosjbsncvghpscsrvxds.supabase.co';
                    var supaKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
                    fetch(supaUrl + '/rest/v1/users?phone=eq.' + encodeURIComponent(user.phone), {
                        method: 'PATCH',
                        headers: { 'apikey': supaKey, 'Authorization': 'Bearer ' + supaKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                        body: JSON.stringify({ name: newName })
                    }).catch(function() {});
                }
                // Update UI
                if (profileDisplayName) profileDisplayName.textContent = newName;
                if (profileInitial) profileInitial.textContent = newName.charAt(0).toUpperCase();
                nameEditRow.style.display = 'none';
                if (typeof UI !== 'undefined') UI.showToast('Name updated!', 'success');
            };
            saveNameBtn.addEventListener('click', saveName);
            editNameInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') saveName(); });
        }
        
        // If no name set, auto-show the edit field
        if (user && (!user.name || user.name === 'User' || user.name.trim() === '') && nameEditRow) {
            nameEditRow.style.display = 'flex';
            setTimeout(function() { if (editNameInput) editNameInput.focus(); }, 300);
        }
        
        var logoutBtn = modal.querySelector('#logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', function() { 
            localStorage.removeItem('seasalt_user');
            localStorage.removeItem('seasalt_phone');
            localStorage.removeItem('seasalt_user_phone');
            localStorage.removeItem('seasalt_spin_phone');
            localStorage.removeItem('seasalt_spin_done');
            if (typeof Store !== 'undefined' && Store.logout) Store.logout(); 
            closeModal(); 
            UI.showToast('Logged out', 'success'); 
        });
        
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
