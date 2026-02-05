/**
 * SeaSalt Pickles - Main Application
 * ====================================
 * Entry point for the e-commerce application.
 * Initializes all modules and handles global events.
 */

const App = (function() {
    // ============================================
    // STATE
    // ============================================
    let isInitialized = false;
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async function init() {
        if (isInitialized) return;
        
        console.log('🫙 SeaSalt Pickles - Initializing...');
        
        // Initialize UI module
        UI.init();
        UI.showLoading();
        
        try {
            // Load data
            await loadData();
            
            // Initialize other modules
            Cart.init();
            
            // Setup event listeners
            setupEventListeners();
            
            // Hide loading
            UI.hideLoading();
            
            // Initialize spin wheel after a short delay
            setTimeout(() => {
                SpinWheel.init();
            }, 1000);
            
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
            
            // Try API module first
            var productsRes = null;
            var categoriesRes = null;
            var configRes = null;
            
            try {
                var results = await Promise.all([
                    API.getProducts().catch(function(e) { console.error('[App] API.getProducts error:', e); return null; }),
                    API.getCategories().catch(function(e) { console.error('[App] API.getCategories error:', e); return null; }),
                    API.getSiteConfig().catch(function(e) { return null; })
                ]);
                productsRes = results[0];
                categoriesRes = results[1];
                configRes = results[2];
            } catch(e) {
                console.error('[App] Promise.all failed:', e);
            }
            
            // Validate API results
            var hasProducts = productsRes && productsRes.data && Array.isArray(productsRes.data) && productsRes.data.length > 0;
            var hasCategories = categoriesRes && categoriesRes.data && Array.isArray(categoriesRes.data) && categoriesRes.data.length > 0;
            
            console.log('[App] API results - products:', hasProducts ? productsRes.data.length : 'NONE', '| categories:', hasCategories ? categoriesRes.data.length : 'NONE');
            
            if (hasProducts && hasCategories) {
                console.log('[App] ✅ Using Supabase data');
                Store.setProducts(productsRes.data);
                Store.setCategories(categoriesRes.data);
                if (configRes && configRes.data) Store.setSiteConfig(configRes.data);
            } else {
                // INLINE SUPABASE FALLBACK - direct fetch if API module failed
                console.log('[App] ⚠️ API module failed, trying direct Supabase fetch...');
                var loaded = await loadFromSupabaseDirect();
                if (!loaded) {
                    console.log('[App] ⚠️ Direct Supabase also failed, using seed data...');
                    await loadSeedData();
                }
            }
            
            // Final check
            console.log('[App] Final state - Products:', Store.getProducts().length, '| Categories:', Store.getCategories().length);
            
            // Render UI
            renderInitialUI();
            
        } catch (error) {
            console.error('[App] ❌ Fatal error:', error);
            await loadSeedData();
            renderInitialUI();
        }
    }
    
    // Direct Supabase fetch as fallback
    async function loadFromSupabaseDirect() {
        var SB_URL = 'https://yosjbsncvghpscsrvxds.supabase.co/rest/v1/';
        var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
        var SB_H = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
        var EMOJIS = { mango: '🥭', mixed: '🫙', nonveg: '🍗', specialty: '⭐' };
        
        try {
            console.log('[App-Direct] Fetching from Supabase...');
            
            var prodRes = await fetch(SB_URL + 'products?select=*', { headers: SB_H });
            var catRes = await fetch(SB_URL + 'categories?select=*', { headers: SB_H });
            
            if (!prodRes.ok || !catRes.ok) {
                console.error('[App-Direct] HTTP error - products:', prodRes.status, 'categories:', catRes.status);
                return false;
            }
            
            var rawProducts = await prodRes.json();
            var rawCategories = await catRes.json();
            
            console.log('[App-Direct] Raw products:', rawProducts.length, rawProducts);
            console.log('[App-Direct] Raw categories:', rawCategories.length, rawCategories);
            
            if (!rawProducts || rawProducts.length === 0) return false;
            
            // Transform products
            var products = [];
            for (var i = 0; i < rawProducts.length; i++) {
                var p = rawProducts[i];
                if (p.is_active === false) continue;
                
                var variants = [];
                try {
                    var v = (typeof p.variants === 'string') ? JSON.parse(p.variants) : p.variants;
                    if (Array.isArray(v)) variants = v;
                } catch(e) {}
                if (variants.length === 0) variants = [{ weight: '250g', price: 199 }];
                variants = variants.map(function(x) { return { weight: String(x.weight || '250g'), price: Number(x.price) || 199 }; });
                
                products.push({
                    id: p.id, name: p.name || 'Product', description: p.description || '',
                    category: p.category || 'mixed',
                    image: p.image || 'https://placehold.co/400x400/D4451A/fff?text=SeaSalt',
                    badge: p.badge || null,
                    isFeatured: (p.is_featured === true || p.is_featured === 'true'),
                    isActive: true, variants: variants, price: variants[0].price
                });
            }
            
            // Transform categories
            var categories = [];
            for (var j = 0; j < rawCategories.length; j++) {
                var c = rawCategories[j];
                if (c.is_active === false) continue;
                var emoji = (c.emoji && c.emoji !== '' && c.emoji !== 'null') ? c.emoji : (EMOJIS[c.id] || '🫙');
                categories.push({ id: c.id, name: c.name, emoji: emoji });
            }
            
            console.log('[App-Direct] Transformed:', products.length, 'products,', categories.length, 'categories');
            
            if (products.length > 0 && categories.length > 0) {
                Store.setProducts(products);
                Store.setCategories(categories);
                console.log('[App-Direct] ✅ SUCCESS - Data loaded directly from Supabase!');
                return true;
            }
            return false;
        } catch(e) {
            console.error('[App-Direct] ❌ Error:', e);
            return false;
        }
    }
    
    async function loadSeedData() {
        try {
            const response = await fetch('/data/products-seed.json');
            const data = await response.json();
            
            Store.setProducts(data.products);
            Store.setCategories(data.categories);
            Store.setSiteConfig(data.siteConfig);
            
        } catch (error) {
            console.error('Failed to load seed data:', error);
            // Use empty arrays as last resort
            Store.setProducts([]);
            Store.setCategories([]);
        }
    }
    
    // ============================================
    // UI RENDERING
    // ============================================
    
    function renderInitialUI() {
        const products = Store.getActiveProducts();
        const categories = Store.getCategories();
        
        // Render category pills
        UI.renderCategoryPills(categories);
        
        // Render featured products
        UI.renderFeaturedProducts(products);
        
        // Render category sections
        UI.renderCategorySections(categories, products);
        
        // Update cart UI
        UI.updateCartUI();
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    function setupEventListeners() {
        // Search functionality
        setupSearch();
        
        // Bottom navigation
        setupBottomNav();
        
        // Scroll behavior
        setupScrollBehavior();
        
        // Keyboard shortcuts
        setupKeyboardShortcuts();
    }
    
    function setupSearch() {
        const searchInput = document.getElementById('search-input');
        let debounceTimer = null;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Debounce search
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (query.length > 0) {
                    const results = Store.searchProducts(query);
                    UI.renderSearchResults(results);
                    
                    // Reset category pills
                    document.querySelectorAll('.category-pill').forEach(pill => {
                        pill.classList.remove('active');
                    });
                } else {
                    // Reset to default view
                    Store.setActiveCategory('all');
                    document.querySelector('.category-pill[data-category="all"]')?.classList.add('active');
                    
                    const products = Store.getActiveProducts();
                    const categories = Store.getCategories();
                    UI.renderCategorySections(categories, products);
                }
            }, CONFIG.UI.SEARCH_DEBOUNCE);
        });
        
        // Clear search on escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.blur();
            }
        });
    }
    
    function setupBottomNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                navigateToPage(page);
            });
        });
    }
    
    function navigateToPage(page) {
        UI.updateBottomNav(page);
        Store.setCurrentPage(page);
        
        switch (page) {
            case 'home':
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
                
            case 'categories':
                // Scroll to category section
                const categorySection = document.getElementById('category-sections');
                if (categorySection) {
                    categorySection.scrollIntoView({ behavior: 'smooth' });
                }
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
        const user = Store.getState().user;
        
        if (!user) {
            UI.showToast('Please login to view orders', 'info');
            return;
        }
        
        // In a full implementation, this would show the orders page
        UI.showToast('Orders feature coming soon!', 'info');
    }
    
    function showAccountPage() {
        const user = Store.getState().user;
        
        // Create account modal
        const modal = document.createElement('div');
        modal.id = 'account-modal';
        modal.className = 'fixed inset-0 z-[85] flex items-end justify-center';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-modal"></div>
            <div class="relative bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-display text-xl font-bold text-gray-800">My Account</h3>
                    <button class="close-modal w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                
                ${user ? `
                    <div class="flex items-center gap-4 p-4 bg-pickle-50 rounded-xl mb-6">
                        <div class="w-14 h-14 bg-pickle-500 rounded-full flex items-center justify-center text-white text-2xl">
                            👤
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800">${user.name || 'User'}</p>
                            <p class="text-sm text-gray-500">${user.phone}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3 mb-6">
                        <div class="bg-spice-gold/10 rounded-xl p-4 text-center">
                            <p class="text-2xl font-bold text-spice-gold">${CONFIG.formatPrice(Store.getWalletBalance())}</p>
                            <p class="text-sm text-gray-600">Wallet Balance</p>
                        </div>
                        <div class="bg-pickle-50 rounded-xl p-4 text-center">
                            <p class="text-2xl font-bold text-pickle-600">0</p>
                            <p class="text-sm text-gray-600">Total Orders</p>
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        <button class="w-full py-3 px-4 bg-gray-100 rounded-xl text-left flex items-center gap-3 hover:bg-gray-200 transition-colors">
                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                            <span>My Orders</span>
                        </button>
                        <button class="w-full py-3 px-4 bg-gray-100 rounded-xl text-left flex items-center gap-3 hover:bg-gray-200 transition-colors">
                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                            <span>Saved Addresses</span>
                        </button>
                        <button class="w-full py-3 px-4 bg-gray-100 rounded-xl text-left flex items-center gap-3 hover:bg-gray-200 transition-colors">
                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span>Help & Support</span>
                        </button>
                    </div>
                    
                    <button id="logout-btn" class="w-full mt-6 py-3 text-red-500 font-semibold hover:bg-red-50 rounded-xl transition-colors">
                        Logout
                    </button>
                ` : `
                    <div class="text-center py-8">
                        <div class="text-6xl mb-4">👤</div>
                        <h4 class="font-semibold text-gray-800 mb-2">Not Logged In</h4>
                        <p class="text-gray-500 text-sm mb-6">Login to view your orders and wallet</p>
                        <button id="login-btn" class="px-8 py-3 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 transition-colors">
                            Login / Sign Up
                        </button>
                    </div>
                `}
                
                <div class="mt-6 pt-4 border-t border-gray-100">
                    <div class="flex justify-center gap-4">
                        <a href="${CONFIG.SOCIAL.INSTAGRAM}" target="_blank" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                            📷
                        </a>
                        <a href="${CONFIG.SOCIAL.FACEBOOK}" target="_blank" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                            📘
                        </a>
                        <a href="${CONFIG.SOCIAL.YOUTUBE}" target="_blank" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                            📺
                        </a>
                    </div>
                    <p class="text-center text-xs text-gray-400 mt-4">Version ${CONFIG.APP_VERSION}</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Event handlers
        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = '';
        };
        
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        
        // Logout
        const logoutBtn = modal.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Store.logout();
                closeModal();
                UI.showToast('Logged out successfully', 'success');
            });
        }
        
        // Login
        const loginBtn = modal.querySelector('#login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                closeModal();
                SpinWheel.show();
            });
        }
    }
    
    function setupScrollBehavior() {
        const header = document.getElementById('main-header');
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            // Add shadow on scroll
            if (currentScroll > 10) {
                header.classList.add('shadow-md');
            } else {
                header.classList.remove('shadow-md');
            }
            
            lastScroll = currentScroll;
        }, { passive: true });
    }
    
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                const productModal = document.getElementById('product-modal');
                const cartSidebar = document.getElementById('cart-sidebar');
                const spinModal = document.getElementById('spin-modal');
                
                if (!productModal.classList.contains('hidden')) {
                    UI.closeProductModal();
                } else if (!cartSidebar.classList.contains('hidden')) {
                    UI.closeCart();
                }
            }
            
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('search-input').focus();
            }
        });
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    return {
        init,
        navigateTo: navigateToPage
    };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally available
window.App = App;
