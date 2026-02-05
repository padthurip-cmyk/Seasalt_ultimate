/**
 * SeaSalt Pickles - Store Module
 * ================================
 * Centralized state management
 */

const Store = (function() {
    let state = {
        products: [],
        categories: [],
        cart: [],
        user: null,
        wallet: { balance: 0, transactions: [] },
        siteConfig: {},
        selectedProduct: null,
        selectedVariant: null,
        quantity: 1,
        activeCategory: 'all',
        useWallet: false,
        currentPage: 'home'
    };
    
    const subscribers = { cart: [], wallet: [], user: [], products: [] };
    
    function init() {
        loadFromStorage();
        console.log('Store initialized');
    }
    
    function loadFromStorage() {
        try {
            var savedCart = localStorage.getItem('seasalt_cart');
            if (savedCart) state.cart = JSON.parse(savedCart);
            var savedUser = localStorage.getItem('seasalt_user');
            if (savedUser) state.user = JSON.parse(savedUser);
            var savedWallet = localStorage.getItem('seasalt_wallet');
            if (savedWallet) state.wallet = JSON.parse(savedWallet);
        } catch (e) { console.error('Storage error:', e); }
    }
    
    function saveToStorage() {
        try {
            localStorage.setItem('seasalt_cart', JSON.stringify(state.cart));
            localStorage.setItem('seasalt_user', JSON.stringify(state.user));
            localStorage.setItem('seasalt_wallet', JSON.stringify(state.wallet));
        } catch (e) { console.error('Storage error:', e); }
    }
    
    function subscribe(key, callback) {
        if (subscribers[key]) subscribers[key].push(callback);
    }
    
    function notify(key) {
        if (subscribers[key]) subscribers[key].forEach(function(cb) { cb(state[key]); });
    }
    
    function getState() { return state; }
    function getProducts() { return state.products; }
    function getCategories() { return state.categories; }
    
    // FIXED: Accept ALL products unless explicitly marked inactive
    function getActiveProducts() {
        var all = state.products;
        // Only exclude if isActive is literally false or string "false"
        var active = all.filter(function(p) {
            if (p.isActive === false || p.isActive === 'false') return false;
            if (p.is_active === false || p.is_active === 'false') return false;
            return true;
        });
        if (state.activeCategory === 'all') {
            return active;
        }
        return active.filter(function(p) { return p.category === state.activeCategory; });
    }
    
    function getProductsByCategory(category) {
        if (category === 'all') return getActiveProducts();
        return state.products.filter(function(p) {
            var isActive = (p.isActive !== false && p.isActive !== 'false' && p.is_active !== false && p.is_active !== 'false');
            return isActive && p.category === category;
        });
    }
    
    function getCart() {
        var items = state.cart;
        var subtotal = items.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
        var deliveryCharge = subtotal >= 500 ? 0 : 50;
        var walletDiscount = 0;
        if (state.useWallet && state.wallet.balance > 0) {
            walletDiscount = Math.min(state.wallet.balance, subtotal + deliveryCharge);
        }
        var total = Math.max(0, subtotal + deliveryCharge - walletDiscount);
        return { items: items, subtotal: subtotal, deliveryCharge: deliveryCharge, walletDiscount: walletDiscount, total: total, useWallet: state.useWallet };
    }
    
    function getCartItemCount() {
        return state.cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);
    }
    
    function getWalletBalance() { return state.wallet.balance; }
    
    function searchProducts(query) {
        var q = query.toLowerCase();
        return state.products.filter(function(p) {
            if (p.isActive === false || p.is_active === false) return false;
            var nameMatch = p.name && p.name.toLowerCase().indexOf(q) >= 0;
            var descMatch = p.description && p.description.toLowerCase().indexOf(q) >= 0;
            var catMatch = p.category && p.category.toLowerCase().indexOf(q) >= 0;
            return nameMatch || descMatch || catMatch;
        });
    }
    
    function setProducts(products) { state.products = products; notify('products'); }
    function setCategories(categories) { state.categories = categories; }
    function setSiteConfig(config) { state.siteConfig = config; }
    function setActiveCategory(cat) { state.activeCategory = cat; }
    function setSelectedProduct(product) {
        state.selectedProduct = product;
        state.selectedVariant = (product && product.variants && product.variants[0]) ? product.variants[0] : null;
        state.quantity = 1;
    }
    function setSelectedVariant(variant) { state.selectedVariant = variant; }
    function setQuantity(qty) { state.quantity = qty; }
    function setUseWallet(use) { state.useWallet = use; }
    function setCurrentPage(page) { state.currentPage = page; }
    function setUser(user) { state.user = user; saveToStorage(); notify('user'); }
    
    function addToCart(product, variant, quantity) {
        quantity = quantity || 1;
        var weight = variant.weight || variant.size || '250g';
        var cartItem = {
            id: product.id + '-' + weight,
            productId: product.id,
            name: product.name,
            image: product.image || (product.images && product.images[0]) || '',
            category: product.category,
            weight: weight,
            size: weight,
            price: variant.price,
            quantity: quantity
        };
        var existingIndex = state.cart.findIndex(function(item) { return item.id === cartItem.id; });
        if (existingIndex >= 0) {
            state.cart[existingIndex].quantity += quantity;
        } else {
            state.cart.push(cartItem);
        }
        saveToStorage();
        notify('cart');
        if (typeof Analytics !== 'undefined' && Analytics.trackAddToCart) Analytics.trackAddToCart(product, quantity, variant);
    }
    
    function updateCartItem(itemId, quantity) {
        var index = state.cart.findIndex(function(item) { return item.id === itemId; });
        if (index >= 0) {
            if (quantity <= 0) state.cart.splice(index, 1);
            else state.cart[index].quantity = quantity;
            saveToStorage();
            notify('cart');
        }
    }
    
    // Alias for compatibility
    function updateCartQuantity(itemId, quantity) { updateCartItem(itemId, quantity); }
    
    function removeFromCart(itemId) {
        state.cart = state.cart.filter(function(item) { return item.id !== itemId; });
        saveToStorage();
        notify('cart');
    }
    
    function clearCart() {
        state.cart = [];
        state.useWallet = false;
        saveToStorage();
        notify('cart');
    }
    
    function addToWallet(amount, description) {
        description = description || 'Credit';
        state.wallet.balance += amount;
        state.wallet.transactions.push({ type: 'credit', amount: amount, description: description, date: new Date().toISOString() });
        saveToStorage();
        notify('wallet');
    }
    
    function deductFromWallet(amount, description) {
        description = description || 'Debit';
        if (amount <= state.wallet.balance) {
            state.wallet.balance -= amount;
            state.wallet.transactions.push({ type: 'debit', amount: amount, description: description, date: new Date().toISOString() });
            saveToStorage();
            notify('wallet');
            return true;
        }
        return false;
    }
    
    function logout() { state.user = null; saveToStorage(); notify('user'); }
    
    // SpinWheel compatibility
    function hasUserSpun() {
        return localStorage.getItem('seasalt_spun') === 'true';
    }
    function markSpinCompleted() {
        localStorage.setItem('seasalt_spun', 'true');
    }
    
    init();
    
    return {
        getState: getState, getProducts: getProducts, getActiveProducts: getActiveProducts,
        getProductsByCategory: getProductsByCategory,
        getCategories: getCategories, getCart: getCart, getCartItemCount: getCartItemCount,
        getWalletBalance: getWalletBalance, searchProducts: searchProducts,
        setProducts: setProducts, setCategories: setCategories, setSiteConfig: setSiteConfig,
        setActiveCategory: setActiveCategory, setSelectedProduct: setSelectedProduct,
        setSelectedVariant: setSelectedVariant, setQuantity: setQuantity, setUseWallet: setUseWallet,
        setCurrentPage: setCurrentPage, setUser: setUser,
        addToCart: addToCart, updateCartItem: updateCartItem, updateCartQuantity: updateCartQuantity,
        removeFromCart: removeFromCart, clearCart: clearCart,
        addToWallet: addToWallet, deductFromWallet: deductFromWallet,
        logout: logout, subscribe: subscribe,
        hasUserSpun: hasUserSpun, markSpinCompleted: markSpinCompleted
    };
})();

window.Store = Store;
