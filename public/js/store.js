/**
 * SeaSalt Pickles - State Management Store
 * =========================================
 * Centralized state management with reactive updates.
 * Implements observer pattern for UI updates.
 */

const Store = (function() {
    // ============================================
    // PRIVATE STATE
    // ============================================
    let _state = {
        // User state
        user: null,
        isAuthenticated: false,
        phone: null,
        
        // Wallet state
        wallet: {
            balance: 0,
            transactions: []
        },
        
        // Cart state
        cart: {
            items: [],
            subtotal: 0,
            deliveryCharge: 0,
            walletDiscount: 0,
            total: 0,
            useWallet: false
        },
        
        // Products state
        products: [],
        categories: [],
        featuredProducts: [],
        
        // UI state
        activeCategory: 'all',
        searchQuery: '',
        isLoading: true,
        currentPage: 'home',
        
        // Spin wheel state
        spinWheelEnabled: true,
        hasSpun: false,
        
        // Selected product for modal
        selectedProduct: null,
        selectedVariant: null,
        quantity: 1,
        
        // Site config (from backend)
        siteConfig: {
            spinWheelEnabled: true,
            deliveryCharges: {
                standard: 50,
                freeAbove: 500
            }
        }
    };
    
    // Subscribers for state changes
    const _subscribers = new Map();
    
    // ============================================
    // PRIVATE METHODS
    // ============================================
    
    /**
     * Notify subscribers of state changes
     */
    function _notify(key) {
        const callbacks = _subscribers.get(key) || [];
        callbacks.forEach(callback => {
            try {
                callback(_state[key]);
            } catch (error) {
                console.error(`Error in subscriber for ${key}:`, error);
            }
        });
        
        // Also notify 'all' subscribers
        const allCallbacks = _subscribers.get('*') || [];
        allCallbacks.forEach(callback => {
            try {
                callback(_state);
            } catch (error) {
                console.error('Error in global subscriber:', error);
            }
        });
    }
    
    /**
     * Deep clone an object
     */
    function _deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    /**
     * Calculate cart totals
     */
    function _recalculateCart() {
        const items = _state.cart.items;
        
        // Calculate subtotal
        const subtotal = items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        
        // Calculate delivery charge
        const deliveryCharge = subtotal >= CONFIG.DELIVERY.FREE_DELIVERY_ABOVE ? 0 : CONFIG.DELIVERY.STANDARD_CHARGE;
        
        // Calculate wallet discount
        let walletDiscount = 0;
        if (_state.cart.useWallet && _state.wallet.balance > 0) {
            const maxDiscount = subtotal + deliveryCharge;
            walletDiscount = Math.min(_state.wallet.balance, maxDiscount);
        }
        
        // Calculate total
        const total = Math.max(0, subtotal + deliveryCharge - walletDiscount);
        
        _state.cart = {
            ..._state.cart,
            subtotal,
            deliveryCharge,
            walletDiscount,
            total
        };
        
        // Persist cart to localStorage
        _persistCart();
    }
    
    /**
     * Persist cart to localStorage
     */
    function _persistCart() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(_state.cart.items));
        } catch (error) {
            console.error('Failed to persist cart:', error);
        }
    }
    
    /**
     * Load cart from localStorage
     */
    function _loadCart() {
        try {
            const savedCart = localStorage.getItem(CONFIG.STORAGE_KEYS.CART);
            if (savedCart) {
                _state.cart.items = JSON.parse(savedCart);
                _recalculateCart();
            }
        } catch (error) {
            console.error('Failed to load cart:', error);
        }
    }
    
    /**
     * Persist wallet to localStorage
     */
    function _persistWallet() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.WALLET, JSON.stringify(_state.wallet));
        } catch (error) {
            console.error('Failed to persist wallet:', error);
        }
    }
    
    /**
     * Load wallet from localStorage
     */
    function _loadWallet() {
        try {
            const savedWallet = localStorage.getItem(CONFIG.STORAGE_KEYS.WALLET);
            if (savedWallet) {
                _state.wallet = JSON.parse(savedWallet);
            }
        } catch (error) {
            console.error('Failed to load wallet:', error);
        }
    }
    
    /**
     * Check spin status from localStorage
     */
    function _loadSpinStatus() {
        try {
            const hasSpun = localStorage.getItem(CONFIG.STORAGE_KEYS.SPIN_COMPLETED);
            _state.hasSpun = hasSpun === 'true';
        } catch (error) {
            console.error('Failed to load spin status:', error);
        }
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    return {
        /**
         * Initialize the store
         */
        init() {
            _loadCart();
            _loadWallet();
            _loadSpinStatus();
            console.log('Store initialized');
        },
        
        /**
         * Get current state (returns a clone to prevent mutations)
         */
        getState(key) {
            if (key) {
                return _deepClone(_state[key]);
            }
            return _deepClone(_state);
        },
        
        /**
         * Subscribe to state changes
         */
        subscribe(key, callback) {
            if (!_subscribers.has(key)) {
                _subscribers.set(key, []);
            }
            _subscribers.get(key).push(callback);
            
            // Return unsubscribe function
            return () => {
                const callbacks = _subscribers.get(key);
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            };
        },
        
        // ============================================
        // USER ACTIONS
        // ============================================
        
        setUser(user) {
            _state.user = user;
            _state.isAuthenticated = !!user;
            _state.phone = user?.phone || null;
            _notify('user');
        },
        
        logout() {
            _state.user = null;
            _state.isAuthenticated = false;
            _state.phone = null;
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
            _notify('user');
        },
        
        // ============================================
        // WALLET ACTIONS
        // ============================================
        
        getWalletBalance() {
            return _state.wallet.balance;
        },
        
        addToWallet(amount, description = 'Credit') {
            _state.wallet.balance += amount;
            _state.wallet.transactions.push({
                id: Date.now(),
                type: 'credit',
                amount,
                description,
                timestamp: new Date().toISOString()
            });
            _persistWallet();
            _recalculateCart();
            _notify('wallet');
        },
        
        deductFromWallet(amount, description = 'Debit') {
            if (_state.wallet.balance >= amount) {
                _state.wallet.balance -= amount;
                _state.wallet.transactions.push({
                    id: Date.now(),
                    type: 'debit',
                    amount,
                    description,
                    timestamp: new Date().toISOString()
                });
                _persistWallet();
                _recalculateCart();
                _notify('wallet');
                return true;
            }
            return false;
        },
        
        // ============================================
        // CART ACTIONS
        // ============================================
        
        getCart() {
            return _deepClone(_state.cart);
        },
        
        getCartItemCount() {
            return _state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
        },
        
        addToCart(product, variant, quantity = 1) {
            const cartItem = {
                id: `${product.id}_${variant.size}`,
                productId: product.id,
                name: product.name,
                image: product.images[0],
                size: variant.size,
                price: variant.price,
                quantity,
                maxQuantity: CONFIG.CART.MAX_QUANTITY_PER_ITEM
            };
            
            // Check if item already exists
            const existingIndex = _state.cart.items.findIndex(
                item => item.id === cartItem.id
            );
            
            if (existingIndex > -1) {
                // Update quantity
                const newQty = Math.min(
                    _state.cart.items[existingIndex].quantity + quantity,
                    CONFIG.CART.MAX_QUANTITY_PER_ITEM
                );
                _state.cart.items[existingIndex].quantity = newQty;
            } else {
                // Add new item
                _state.cart.items.push(cartItem);
            }
            
            _recalculateCart();
            _notify('cart');
            
            return true;
        },
        
        updateCartQuantity(itemId, quantity) {
            const index = _state.cart.items.findIndex(item => item.id === itemId);
            
            if (index > -1) {
                if (quantity <= 0) {
                    // Remove item
                    _state.cart.items.splice(index, 1);
                } else {
                    // Update quantity
                    _state.cart.items[index].quantity = Math.min(
                        quantity,
                        CONFIG.CART.MAX_QUANTITY_PER_ITEM
                    );
                }
                
                _recalculateCart();
                _notify('cart');
                return true;
            }
            
            return false;
        },
        
        removeFromCart(itemId) {
            const index = _state.cart.items.findIndex(item => item.id === itemId);
            
            if (index > -1) {
                _state.cart.items.splice(index, 1);
                _recalculateCart();
                _notify('cart');
                return true;
            }
            
            return false;
        },
        
        clearCart() {
            _state.cart.items = [];
            _state.cart.useWallet = false;
            _recalculateCart();
            _notify('cart');
        },
        
        setUseWallet(useWallet) {
            _state.cart.useWallet = useWallet;
            _recalculateCart();
            _notify('cart');
        },
        
        // ============================================
        // PRODUCTS ACTIONS
        // ============================================
        
        setProducts(products) {
            _state.products = products;
            
            // Set featured products (first 6 active products)
            _state.featuredProducts = products
                .filter(p => p.active)
                .slice(0, 6);
            
            _notify('products');
        },
        
        getProducts() {
            return _deepClone(_state.products);
        },
        
        getActiveProducts() {
            return _state.products.filter(p => p.active);
        },
        
        getProductById(id) {
            return _state.products.find(p => p.id === id);
        },
        
        getProductsByCategory(category) {
            if (category === 'all') {
                return _state.products.filter(p => p.active);
            }
            return _state.products.filter(p => 
                p.active && p.primaryCategory === category
            );
        },
        
        searchProducts(query) {
            const searchTerm = query.toLowerCase().trim();
            if (!searchTerm) return _state.products.filter(p => p.active);
            
            return _state.products.filter(p => 
                p.active && (
                    p.name.toLowerCase().includes(searchTerm) ||
                    p.description.toLowerCase().includes(searchTerm) ||
                    p.primaryCategory.toLowerCase().includes(searchTerm) ||
                    (p.subCategory && p.subCategory.toLowerCase().includes(searchTerm))
                )
            );
        },
        
        // ============================================
        // CATEGORIES ACTIONS
        // ============================================
        
        setCategories(categories) {
            _state.categories = categories;
            _notify('categories');
        },
        
        getCategories() {
            return _deepClone(_state.categories);
        },
        
        setActiveCategory(category) {
            _state.activeCategory = category;
            _notify('activeCategory');
        },
        
        // ============================================
        // UI ACTIONS
        // ============================================
        
        setLoading(isLoading) {
            _state.isLoading = isLoading;
            _notify('isLoading');
        },
        
        setCurrentPage(page) {
            _state.currentPage = page;
            _notify('currentPage');
        },
        
        setSearchQuery(query) {
            _state.searchQuery = query;
            _notify('searchQuery');
        },
        
        // ============================================
        // PRODUCT MODAL ACTIONS
        // ============================================
        
        setSelectedProduct(product) {
            _state.selectedProduct = product;
            _state.selectedVariant = product?.variants?.[0] || null;
            _state.quantity = 1;
            _notify('selectedProduct');
        },
        
        setSelectedVariant(variant) {
            _state.selectedVariant = variant;
            _notify('selectedVariant');
        },
        
        setQuantity(qty) {
            _state.quantity = Math.max(1, Math.min(qty, CONFIG.CART.MAX_QUANTITY_PER_ITEM));
            _notify('quantity');
        },
        
        // ============================================
        // SPIN WHEEL ACTIONS
        // ============================================
        
        setSpinWheelEnabled(enabled) {
            _state.spinWheelEnabled = enabled;
            _notify('spinWheelEnabled');
        },
        
        markSpinCompleted() {
            _state.hasSpun = true;
            localStorage.setItem(CONFIG.STORAGE_KEYS.SPIN_COMPLETED, 'true');
            _notify('hasSpun');
        },
        
        hasUserSpun() {
            return _state.hasSpun;
        },
        
        isSpinWheelEnabled() {
            return _state.spinWheelEnabled && !_state.hasSpun;
        },
        
        // ============================================
        // SITE CONFIG ACTIONS
        // ============================================
        
        setSiteConfig(config) {
            _state.siteConfig = { ..._state.siteConfig, ...config };
            _state.spinWheelEnabled = config.spinWheelEnabled ?? true;
            _notify('siteConfig');
        }
    };
})();

// Initialize store on load
document.addEventListener('DOMContentLoaded', () => {
    Store.init();
});
