/**
 * SeaSalt Pickles - Complete App.js
 * ==================================
 * Main application file with all modules integrated
 * Version: 2.0.0
 * 
 * Modules: Store, UI, API, Products, Categories, Cart, Account, Orders, App
 */

'use strict';

// ============================================
// STORE MODULE - State Management
// ============================================
const Store = (function() {
    // Application State
    let state = {
        products: [],
        categories: [],
        cart: [],
        user: null,
        wallet: { balance: 0, transactions: [] },
        siteConfig: { spinWheelEnabled: true },
        currentCategory: 'all',
        searchQuery: '',
        isLoading: false
    };
    
    // Storage Keys (from CONFIG)
    const KEYS = {
        CART: 'seasalt_cart',
        USER: 'seasalt_user',
        WALLET: 'seasalt_wallet',
        SPIN_COMPLETED: 'seasalt_spin_done',
        AUTH_TOKEN: 'seasalt_auth_token',
        ORDERS: 'seasalt_orders'
    };
    
    // Initialize from localStorage
    function init() {
        loadCart();
        loadUser();
        loadWallet();
    }
    
    // Cart Operations
    function loadCart() {
        try {
            const saved = localStorage.getItem(KEYS.CART);
            state.cart = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading cart:', e);
            state.cart = [];
        }
    }
    
    function saveCart() {
        try {
            localStorage.setItem(KEYS.CART, JSON.stringify(state.cart));
        } catch (e) {
            console.error('Error saving cart:', e);
        }
    }
    
    function getCart() {
        return [...state.cart];
    }
    
    function addToCart(product, quantity = 1) {
        const existingIndex = state.cart.findIndex(item => item.id === product.id);
        
        if (existingIndex > -1) {
            state.cart[existingIndex].quantity += quantity;
        } else {
            state.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                weight: product.weight,
                category: product.category,
                quantity: quantity
            });
        }
        
        saveCart();
        UI.updateCartUI();
        return state.cart;
    }
    
    function updateCartQuantity(productId, quantity) {
        const index = state.cart.findIndex(item => item.id === productId);
        if (index > -1) {
            if (quantity <= 0) {
                state.cart.splice(index, 1);
            } else {
                state.cart[index].quantity = Math.min(quantity, 10);
            }
            saveCart();
            UI.updateCartUI();
        }
        return state.cart;
    }
    
    function removeFromCart(productId) {
        state.cart = state.cart.filter(item => item.id !== productId);
        saveCart();
        UI.updateCartUI();
        return state.cart;
    }
    
    function clearCart() {
        state.cart = [];
        saveCart();
        UI.updateCartUI();
    }
    
    function getCartTotal() {
        return state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    function getCartCount() {
        return state.cart.reduce((count, item) => count + item.quantity, 0);
    }
    
    // User Operations
    function loadUser() {
        try {
            const saved = localStorage.getItem(KEYS.USER);
            state.user = saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error('Error loading user:', e);
            state.user = null;
        }
    }
    
    function setUser(userData) {
        state.user = userData;
        try {
            localStorage.setItem(KEYS.USER, JSON.stringify(userData));
        } catch (e) {
            console.error('Error saving user:', e);
        }
    }
    
    function getUser() {
        return state.user;
    }
    
    function clearUser() {
        state.user = null;
        localStorage.removeItem(KEYS.USER);
        localStorage.removeItem(KEYS.AUTH_TOKEN);
    }
    
    // Wallet Operations
    function loadWallet() {
        try {
            const saved = localStorage.getItem(KEYS.WALLET);
            state.wallet = saved ? JSON.parse(saved) : { balance: 0, transactions: [] };
        } catch (e) {
            console.error('Error loading wallet:', e);
            state.wallet = { balance: 0, transactions: [] };
        }
    }
    
    function saveWallet() {
        try {
            localStorage.setItem(KEYS.WALLET, JSON.stringify(state.wallet));
        } catch (e) {
            console.error('Error saving wallet:', e);
        }
    }
    
    function getWallet() {
        return { ...state.wallet };
    }
    
    function addToWallet(amount, description = 'Credit') {
        state.wallet.balance += amount;
        state.wallet.transactions.unshift({
            id: Date.now(),
            type: 'credit',
            amount: amount,
            description: description,
            date: new Date().toISOString()
        });
        saveWallet();
        return state.wallet;
    }
    
    function deductFromWallet(amount, description = 'Order Payment') {
        if (amount > state.wallet.balance) return false;
        
        state.wallet.balance -= amount;
        state.wallet.transactions.unshift({
            id: Date.now(),
            type: 'debit',
            amount: amount,
            description: description,
            date: new Date().toISOString()
        });
        saveWallet();
        return true;
    }
    
    // Spin Wheel
    function hasUserSpun() {
        return localStorage.getItem(KEYS.SPIN_COMPLETED) === 'true';
    }
    
    function markSpinCompleted() {
        localStorage.setItem(KEYS.SPIN_COMPLETED, 'true');
    }
    
    // State Getters/Setters
    function getState(key) {
        return key ? state[key] : { ...state };
    }
    
    function setState(key, value) {
        state[key] = value;
    }
    
    function setProducts(products) {
        state.products = products;
    }
    
    function getProducts() {
        return [...state.products];
    }
    
    function setCategories(categories) {
        state.categories = categories;
    }
    
    function getCategories() {
        return [...state.categories];
    }
    
    return {
        init,
        getCart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        getCartTotal,
        getCartCount,
        getUser,
        setUser,
        clearUser,
        getWallet,
        addToWallet,
        deductFromWallet,
        hasUserSpun,
        markSpinCompleted,
        getState,
        setState,
        setProducts,
        getProducts,
        setCategories,
        getCategories
    };
})();


// ============================================
// UI MODULE - User Interface Helpers
// ============================================
const UI = (function() {
    // Toast notification
    function showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        document.querySelectorAll('.toast-notification').forEach(t => t.remove());
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-gray-800'
        };
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast-notification fixed bottom-24 left-1/2 -translate-x-1/2 ${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 animate-slideUp`;
        toast.innerHTML = `
            <span class="text-lg">${icons[type]}</span>
            <span class="font-medium">${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('animate-fadeOut');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    // Update cart badge/count in UI
    function updateCartUI() {
        const count = Store.getCartCount();
        const total = Store.getCartTotal();
        
        // Update cart count badge
        const cartBadge = document.getElementById('cart-count');
        if (cartBadge) {
            cartBadge.textContent = count;
            cartBadge.classList.toggle('hidden', count === 0);
        }
        
        // Update wallet display
        const walletDisplay = document.getElementById('wallet-display');
        if (walletDisplay) {
            const wallet = Store.getWallet();
            walletDisplay.textContent = formatPrice(wallet.balance);
        }
        
        // Update header cart total
        const cartTotal = document.getElementById('cart-total');
        if (cartTotal) {
            cartTotal.textContent = formatPrice(total);
        }
    }
    
    // Format price with currency
    function formatPrice(amount) {
        return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
    }
    
    // Show loading spinner
    function showLoading(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                <p class="mt-4 text-gray-500">Loading...</p>
            </div>
        `;
    }
    
    // Hide loading
    function hideLoading(container) {
        const loader = container?.querySelector('.animate-spin');
        if (loader) loader.parentElement.remove();
    }
    
    // Render product card
    function renderProductCard(product) {
        const inCart = Store.getCart().find(item => item.id === product.id);
        
        return `
            <div class="product-card bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow" data-product-id="${product.id}">
                <div class="relative aspect-square bg-gray-100">
                    <img src="${product.image || 'https://via.placeholder.com/300x300?text=🥒'}" 
                         alt="${product.name}" 
                         class="w-full h-full object-cover"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300x300?text=🥒'">
                    ${product.badge ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">${product.badge}</span>` : ''}
                </div>
                <div class="p-3">
                    <h3 class="font-semibold text-gray-800 text-sm line-clamp-2 h-10">${product.name}</h3>
                    <p class="text-xs text-orange-600 mt-1">${product.category || ''}</p>
                    <div class="flex items-center justify-between mt-2">
                        <div>
                            <span class="text-lg font-bold text-gray-800">${formatPrice(product.price)}</span>
                            ${product.weight ? `<span class="text-xs text-gray-500">/ ${product.weight}</span>` : ''}
                        </div>
                    </div>
                    ${inCart ? `
                        <div class="flex items-center justify-between mt-3 bg-orange-50 rounded-xl p-1">
                            <button onclick="App.updateQuantity(${product.id}, ${inCart.quantity - 1})" 
                                    class="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-orange-600 font-bold shadow-sm hover:bg-orange-100">
                                −
                            </button>
                            <span class="font-semibold text-gray-800">${inCart.quantity}</span>
                            <button onclick="App.updateQuantity(${product.id}, ${inCart.quantity + 1})" 
                                    class="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-orange-600 font-bold shadow-sm hover:bg-orange-100">
                                +
                            </button>
                        </div>
                    ` : `
                        <button onclick="App.addToCart(${product.id})" 
                                class="w-full mt-3 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold text-sm hover:from-orange-600 hover:to-red-600 transition-all">
                            Add to Cart
                        </button>
                    `}
                </div>
            </div>
        `;
    }
    
    return {
        showToast,
        updateCartUI,
        formatPrice,
        showLoading,
        hideLoading,
        renderProductCard
    };
})();


// ============================================
// API MODULE - Data Fetching
// ============================================
const API = (function() {
    const BASE_URL = '/.netlify/functions';
    
    // Generic fetch wrapper
    async function fetchAPI(endpoint, options = {}) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // Get all products
    async function getProducts() {
        try {
            const data = await fetchAPI('/products');
            return data.products || data || [];
        } catch (error) {
            console.error('Failed to fetch products:', error);
            return [];
        }
    }
    
    // Get categories
    async function getCategories() {
        try {
            const data = await fetchAPI('/categories');
            return data.categories || data || [];
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            return [];
        }
    }
    
    // Get site config
    async function getConfig() {
        try {
            const data = await fetchAPI('/config');
            return data;
        } catch (error) {
            console.error('Failed to fetch config:', error);
            return { spinWheelEnabled: true };
        }
    }
    
    // Record spin result
    async function recordSpin(phone, result, amount) {
        try {
            await fetchAPI('/spin', {
                method: 'POST',
                body: JSON.stringify({ phone, result, amount })
            });
        } catch (error) {
            console.error('Failed to record spin:', error);
        }
    }
    
    // Create order
    async function createOrder(orderData) {
        try {
            const data = await fetchAPI('/orders', {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
            return data;
        } catch (error) {
            console.error('Failed to create order:', error);
            throw error;
        }
    }
    
    return {
        getProducts,
        getCategories,
        getConfig,
        recordSpin,
        createOrder
    };
})();


// ============================================
// PRODUCTS MODULE - Product Display
// ============================================
const Products = (function() {
    let allProducts = [];
    let currentCategory = 'all';
    let searchQuery = '';
    
    // Initialize products
    async function init() {
        const container = document.getElementById('products-grid');
        if (!container) return;
        
        UI.showLoading(container);
        
        try {
            allProducts = await API.getProducts();
            Store.setProducts(allProducts);
            render();
        } catch (error) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-8">
                    <p class="text-gray-500">Failed to load products</p>
                    <button onclick="Products.init()" class="mt-2 text-orange-500 underline">Try again</button>
                </div>
            `;
        }
    }
    
    // Filter products
    function filter(category = 'all', query = '') {
        currentCategory = category;
        searchQuery = query.toLowerCase();
        render();
    }
    
    // Get filtered products
    function getFiltered() {
        let filtered = [...allProducts];
        
        if (currentCategory && currentCategory !== 'all') {
            filtered = filtered.filter(p => 
                p.category?.toLowerCase() === currentCategory.toLowerCase()
            );
        }
        
        if (searchQuery) {
            filtered = filtered.filter(p => 
                p.name?.toLowerCase().includes(searchQuery) ||
                p.category?.toLowerCase().includes(searchQuery)
            );
        }
        
        return filtered;
    }
    
    // Render products grid
    function render() {
        const container = document.getElementById('products-grid');
        if (!container) return;
        
        const products = getFiltered();
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-12">
                    <div class="text-4xl mb-3">🔍</div>
                    <p class="text-gray-500">No products found</p>
                    ${searchQuery ? `<button onclick="Products.filter('all', '')" class="mt-2 text-orange-500 underline">Clear search</button>` : ''}
                </div>
            `;
            return;
        }
        
        container.innerHTML = products.map(product => UI.renderProductCard(product)).join('');
    }
    
    // Get product by ID
    function getById(id) {
        return allProducts.find(p => p.id === parseInt(id) || p.id === id);
    }
    
    return {
        init,
        filter,
        render,
        getById,
        getFiltered
    };
})();


// ============================================
// CATEGORIES MODULE - Category Management
// ============================================
const Categories = (function() {
    let categories = [];
    let activeCategory = 'all';
    
    // Initialize categories
    async function init() {
        try {
            categories = await API.getCategories();
            Store.setCategories(categories);
            render();
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }
    
    // Render category tabs
    function render() {
        const container = document.getElementById('category-tabs');
        if (!container) return;
        
        const allCategories = [
            { id: 'all', name: 'All', icon: '🥒' },
            ...categories
        ];
        
        container.innerHTML = allCategories.map(cat => `
            <button onclick="Categories.select('${cat.id}')" 
                    class="category-tab flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                        activeCategory === cat.id 
                            ? 'bg-orange-500 text-white shadow-md' 
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
                    }"
                    data-category="${cat.id}">
                <span>${cat.icon || '🍴'}</span>
                <span class="font-medium">${cat.name}</span>
            </button>
        `).join('');
    }
    
    // Select category
    function select(categoryId) {
        activeCategory = categoryId;
        render();
        Products.filter(categoryId, Store.getState('searchQuery'));
    }
    
    // Render categories page
    function renderPage() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        const allCategories = [
            { id: 'all', name: 'All Products', icon: '🥒', description: 'Browse all our products' },
            ...categories
        ];
        
        mainContent.innerHTML = `
            <div class="categories-page pb-24">
                <div class="sticky top-0 bg-white z-10 px-4 py-4 border-b border-gray-100">
                    <h1 class="text-xl font-bold text-gray-800">Categories</h1>
                    <p class="text-sm text-gray-500 mt-1">Browse by category</p>
                </div>
                <div class="p-4 grid grid-cols-2 gap-4">
                    ${allCategories.map(cat => `
                        <div onclick="Categories.select('${cat.id}'); App.navigateTo('home');" 
                             class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
                            <div class="text-4xl mb-2">${cat.icon || '🍴'}</div>
                            <h3 class="font-semibold text-gray-800">${cat.name}</h3>
                            <p class="text-xs text-gray-500 mt-1">${cat.description || ''}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    return {
        init,
        render,
        select,
        renderPage
    };
})();


// ============================================
// CART MODULE - Shopping Cart
// ============================================
const Cart = (function() {
    // Show cart modal/page
    function show() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        render();
    }
    
    // Render cart
    function render() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        const cart = Store.getCart();
        const subtotal = Store.getCartTotal();
        const delivery = subtotal >= 500 ? 0 : 50;
        const wallet = Store.getWallet();
        const walletUsable = Math.min(wallet.balance, subtotal + delivery);
        const total = subtotal + delivery - walletUsable;
        
        if (cart.length === 0) {
            mainContent.innerHTML = `
                <div class="cart-page pb-24">
                    <div class="sticky top-0 bg-white z-10 px-4 py-4 border-b border-gray-100">
                        <h1 class="text-xl font-bold text-gray-800">My Cart</h1>
                    </div>
                    <div class="flex flex-col items-center justify-center py-16 px-4">
                        <div class="w-32 h-32 mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <span class="text-5xl">🛒</span>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h3>
                        <p class="text-gray-500 text-center mb-6">Add some delicious pickles to get started!</p>
                        <button onclick="App.navigateTo('home')" class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl font-semibold">
                            Start Shopping
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        mainContent.innerHTML = `
            <div class="cart-page pb-48">
                <div class="sticky top-0 bg-white z-10 px-4 py-4 border-b border-gray-100">
                    <div class="flex items-center justify-between">
                        <h1 class="text-xl font-bold text-gray-800">My Cart</h1>
                        <span class="text-sm text-gray-500">${cart.length} items</span>
                    </div>
                </div>
                
                <!-- Cart Items -->
                <div class="p-4 space-y-4">
                    ${cart.map(item => `
                        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex gap-4">
                            <div class="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                <img src="${item.image || 'https://via.placeholder.com/100?text=🥒'}" 
                                     alt="${item.name}" 
                                     class="w-full h-full object-cover"
                                     onerror="this.src='https://via.placeholder.com/100?text=🥒'">
                            </div>
                            <div class="flex-1">
                                <h3 class="font-semibold text-gray-800 line-clamp-2">${item.name}</h3>
                                <p class="text-xs text-gray-500">${item.weight || ''}</p>
                                <div class="flex items-center justify-between mt-2">
                                    <span class="font-bold text-gray-800">${UI.formatPrice(item.price * item.quantity)}</span>
                                    <div class="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                        <button onclick="App.updateQuantity(${item.id}, ${item.quantity - 1})" 
                                                class="w-7 h-7 flex items-center justify-center bg-white rounded text-orange-600 font-bold shadow-sm">
                                            ${item.quantity === 1 ? '🗑️' : '−'}
                                        </button>
                                        <span class="w-6 text-center font-medium">${item.quantity}</span>
                                        <button onclick="App.updateQuantity(${item.id}, ${item.quantity + 1})" 
                                                class="w-7 h-7 flex items-center justify-center bg-white rounded text-orange-600 font-bold shadow-sm">
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Wallet Section -->
                ${wallet.balance > 0 ? `
                    <div class="mx-4 p-4 bg-green-50 rounded-2xl border border-green-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-xl">💰</span>
                                <div>
                                    <p class="font-semibold text-green-800">Wallet Balance</p>
                                    <p class="text-sm text-green-600">${UI.formatPrice(wallet.balance)} available</p>
                                </div>
                            </div>
                            <span class="text-green-600 font-bold">-${UI.formatPrice(walletUsable)}</span>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Price Summary -->
                <div class="mx-4 mt-4 p-4 bg-gray-50 rounded-2xl">
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>${UI.formatPrice(subtotal)}</span>
                        </div>
                        <div class="flex justify-between text-gray-600">
                            <span>Delivery</span>
                            <span>${delivery === 0 ? '<span class="text-green-600">FREE</span>' : UI.formatPrice(delivery)}</span>
                        </div>
                        ${walletUsable > 0 ? `
                            <div class="flex justify-between text-green-600">
                                <span>Wallet Applied</span>
                                <span>-${UI.formatPrice(walletUsable)}</span>
                            </div>
                        ` : ''}
                        <div class="border-t border-gray-200 pt-2 mt-2">
                            <div class="flex justify-between font-bold text-gray-800 text-lg">
                                <span>Total</span>
                                <span>${UI.formatPrice(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${subtotal < 500 ? `
                    <div class="mx-4 mt-4 p-3 bg-orange-50 rounded-xl text-center">
                        <p class="text-sm text-orange-700">
                            Add ${UI.formatPrice(500 - subtotal)} more for <strong>FREE delivery!</strong>
                        </p>
                    </div>
                ` : ''}
            </div>
            
            <!-- Fixed Checkout Button -->
            <div class="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
                <button onclick="Cart.checkout()" 
                        class="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all">
                    Proceed to Checkout • ${UI.formatPrice(total)}
                </button>
            </div>
        `;
    }
    
    // Checkout
    function checkout() {
        const cart = Store.getCart();
        if (cart.length === 0) {
            UI.showToast('Your cart is empty', 'error');
            return;
        }
        
        const user = Store.getUser();
        if (!user || !user.phone) {
            UI.showToast('Please login to continue', 'warning');
            App.navigateTo('account');
            return;
        }
        
        // Show checkout form
        showCheckoutForm();
    }
    
    // Show checkout form
    function showCheckoutForm() {
        const mainContent = document.getElementById('main-content');
        const cart = Store.getCart();
        const subtotal = Store.getCartTotal();
        const delivery = subtotal >= 500 ? 0 : 50;
        const wallet = Store.getWallet();
        const walletUsable = Math.min(wallet.balance, subtotal + delivery);
        const total = subtotal + delivery - walletUsable;
        
        mainContent.innerHTML = `
            <div class="checkout-page pb-24">
                <div class="sticky top-0 bg-white z-10 px-4 py-4 border-b border-gray-100">
                    <div class="flex items-center gap-3">
                        <button onclick="Cart.show()" class="p-2 rounded-full bg-gray-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                        <h1 class="text-xl font-bold text-gray-800">Checkout</h1>
                    </div>
                </div>
                
                <form id="checkout-form" class="p-4 space-y-6">
                    <!-- Delivery Address -->
                    <div class="bg-white rounded-2xl p-4 border border-gray-100">
                        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>📍</span> Delivery Address
                        </h3>
                        <div class="space-y-4">
                            <input type="text" name="name" placeholder="Full Name" required
                                   class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none">
                            <input type="text" name="line1" placeholder="Address Line 1" required
                                   class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none">
                            <input type="text" name="line2" placeholder="Address Line 2 (optional)"
                                   class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none">
                            <div class="flex gap-4">
                                <input type="text" name="city" placeholder="City" required
                                       class="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none">
                                <input type="text" name="pincode" placeholder="Pincode" required maxlength="6" pattern="[0-9]{6}"
                                       class="w-32 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none">
                            </div>
                            <input type="tel" name="phone" placeholder="Phone Number" required maxlength="10" pattern="[0-9]{10}"
                                   value="${Store.getUser()?.phone?.replace(/^\+91/, '') || ''}"
                                   class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none">
                        </div>
                    </div>
                    
                    <!-- Order Summary -->
                    <div class="bg-gray-50 rounded-2xl p-4">
                        <h3 class="font-bold text-gray-800 mb-3">Order Summary</h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between text-gray-600">
                                <span>${cart.length} items</span>
                                <span>${UI.formatPrice(subtotal)}</span>
                            </div>
                            <div class="flex justify-between text-gray-600">
                                <span>Delivery</span>
                                <span>${delivery === 0 ? 'FREE' : UI.formatPrice(delivery)}</span>
                            </div>
                            ${walletUsable > 0 ? `
                                <div class="flex justify-between text-green-600">
                                    <span>Wallet</span>
                                    <span>-${UI.formatPrice(walletUsable)}</span>
                                </div>
                            ` : ''}
                            <div class="border-t border-gray-200 pt-2 mt-2">
                                <div class="flex justify-between font-bold text-gray-800 text-lg">
                                    <span>Total</span>
                                    <span>${UI.formatPrice(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" 
                            class="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-lg shadow-lg">
                        Place Order • ${UI.formatPrice(total)}
                    </button>
                </form>
            </div>
        `;
        
        // Handle form submit
        document.getElementById('checkout-form').addEventListener('submit', handleCheckoutSubmit);
    }
    
    // Handle checkout submit
    async function handleCheckoutSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const address = {
            name: formData.get('name'),
            line1: formData.get('line1'),
            line2: formData.get('line2'),
            city: formData.get('city'),
            pincode: formData.get('pincode'),
            phone: formData.get('phone')
        };
        
        const cart = Store.getCart();
        const subtotal = Store.getCartTotal();
        const delivery = subtotal >= 500 ? 0 : 50;
        const wallet = Store.getWallet();
        const walletUsable = Math.min(wallet.balance, subtotal + delivery);
        const total = subtotal + delivery - walletUsable;
        
        // Create order
        const orderData = {
            items: cart,
            address: address,
            subtotal: subtotal,
            delivery: delivery,
            walletUsed: walletUsable,
            total: total
        };
        
        // Save order locally
        if (typeof OrdersPage !== 'undefined' && OrdersPage.createOrder) {
            const order = OrdersPage.createOrder(orderData);
            
            // Deduct wallet if used
            if (walletUsable > 0) {
                Store.deductFromWallet(walletUsable, `Order #${order.id}`);
            }
            
            // Clear cart
            Store.clearCart();
            
            // Show success
            UI.showToast('Order placed successfully! 🎉', 'success');
            
            // Navigate to orders
            setTimeout(() => {
                App.navigateTo('orders');
            }, 1000);
        } else {
            UI.showToast('Order placed!', 'success');
            Store.clearCart();
            App.navigateTo('home');
        }
    }
    
    return {
        show,
        render,
        checkout,
        showCheckoutForm
    };
})();


// ============================================
// ACCOUNT MODULE - User Account
// ============================================
const Account = (function() {
    // Render account page
    function render() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        const user = Store.getUser();
        const wallet = Store.getWallet();
        
        mainContent.innerHTML = `
            <div class="account-page pb-24">
                <div class="sticky top-0 bg-white z-10 px-4 py-4 border-b border-gray-100">
                    <h1 class="text-xl font-bold text-gray-800">My Account</h1>
                </div>
                
                ${user ? renderLoggedInView(user, wallet) : renderLoginView()}
            </div>
        `;
    }
    
    // Logged in view
    function renderLoggedInView(user, wallet) {
        return `
            <!-- Profile Card -->
            <div class="m-4 p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                        👤
                    </div>
                    <div>
                        <h2 class="font-bold text-lg">${user.name || 'Customer'}</h2>
                        <p class="text-white/80">${user.phone || ''}</p>
                    </div>
                </div>
            </div>
            
            <!-- Wallet Card -->
            <div class="mx-4 p-4 bg-green-50 rounded-2xl border border-green-200">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">💰</span>
                        <div>
                            <p class="text-sm text-green-600">Wallet Balance</p>
                            <p class="text-2xl font-bold text-green-800">${UI.formatPrice(wallet.balance)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Menu Items -->
            <div class="m-4 space-y-3">
                <button onclick="App.navigateTo('orders')" class="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">📦</span>
                        <span class="font-medium text-gray-800">My Orders</span>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </button>
                
                <button onclick="Account.showWalletHistory()" class="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">💳</span>
                        <span class="font-medium text-gray-800">Wallet History</span>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </button>
                
                <button onclick="Account.contactSupport()" class="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">💬</span>
                        <span class="font-medium text-gray-800">Contact Support</span>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </button>
                
                <button onclick="Account.logout()" class="w-full flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">🚪</span>
                        <span class="font-medium text-red-600">Logout</span>
                    </div>
                </button>
            </div>
        `;
    }
    
    // Login view
    function renderLoginView() {
        return `
            <div class="flex flex-col items-center justify-center py-16 px-4">
                <div class="w-24 h-24 mb-6 bg-orange-100 rounded-full flex items-center justify-center">
                    <span class="text-4xl">👤</span>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Welcome to SeaSalt</h3>
                <p class="text-gray-500 text-center mb-6">Sign in to track orders and manage your account</p>
                
                <div class="w-full max-w-sm space-y-4">
                    <div class="flex gap-2">
                        <select id="account-country-code" class="px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm">
                            <option value="+91">🇮🇳 +91</option>
                            <option value="+1">🇺🇸 +1</option>
                            <option value="+44">🇬🇧 +44</option>
                        </select>
                        <input type="tel" id="account-phone" placeholder="Enter phone number" maxlength="10"
                               class="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none">
                    </div>
                    <button onclick="Account.login()" 
                            class="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold">
                        Continue
                    </button>
                </div>
            </div>
        `;
    }
    
    // Login
    function login() {
        const countryCode = document.getElementById('account-country-code')?.value || '+91';
        const phone = document.getElementById('account-phone')?.value?.trim();
        
        if (!phone || phone.length < 10) {
            UI.showToast('Please enter a valid phone number', 'error');
            return;
        }
        
        // For demo, directly set user (in production, use OTP)
        Store.setUser({
            phone: `${countryCode}${phone}`,
            name: 'Customer'
        });
        
        UI.showToast('Welcome! 🎉', 'success');
        render();
    }
    
    // Logout
    function logout() {
        if (confirm('Are you sure you want to logout?')) {
            Store.clearUser();
            UI.showToast('Logged out successfully', 'info');
            render();
        }
    }
    
    // Show wallet history
    function showWalletHistory() {
        const wallet = Store.getWallet();
        
        if (wallet.transactions.length === 0) {
            UI.showToast('No transactions yet', 'info');
            return;
        }
        
        const modalHtml = `
            <div id="wallet-modal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onclick="if(event.target === this) Account.closeModal()">
                <div class="bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
                    <div class="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 class="text-lg font-bold text-gray-800">Wallet History</h2>
                        <button onclick="Account.closeModal()" class="p-2 rounded-full bg-gray-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="p-4 space-y-3">
                        ${wallet.transactions.map(t => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p class="font-medium text-gray-800">${t.description}</p>
                                    <p class="text-xs text-gray-500">${new Date(t.date).toLocaleDateString('en-IN')}</p>
                                </div>
                                <span class="font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}">
                                    ${t.type === 'credit' ? '+' : '-'}${UI.formatPrice(t.amount)}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';
    }
    
    // Close modal
    function closeModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }
    
    // Contact support
    function contactSupport() {
        const whatsappNumber = '919963971447';
        const message = encodeURIComponent('Hi! I need help with my SeaSalt Pickles order.');
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    }
    
    return {
        render,
        login,
        logout,
        showWalletHistory,
        closeModal,
        contactSupport
    };
})();


// ============================================
// MAIN APP MODULE - Navigation & Initialization
// ============================================
const App = (function() {
    let currentPage = 'home';
    
    // Initialize app
    async function init() {
        console.log('🥒 SeaSalt Pickles App Initializing...');
        
        // Initialize store
        Store.init();
        
        // Bind navigation
        bindNavigation();
        
        // Bind search
        bindSearch();
        
        // Load initial data
        await loadInitialData();
        
        // Update UI
        UI.updateCartUI();
        
        // Initialize spin wheel if available
        if (typeof SpinWheel !== 'undefined' && SpinWheel.shouldShow && SpinWheel.shouldShow()) {
            SpinWheel.init();
        }
        
        console.log('✅ SeaSalt Pickles App Ready!');
    }
    
    // Load initial data
    async function loadInitialData() {
        try {
            // Load config
            const config = await API.getConfig();
            Store.setState('siteConfig', config);
            
            // Load categories
            await Categories.init();
            
            // Load products
            await Products.init();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }
    
    // Bind navigation
    function bindNavigation() {
        // Bottom nav clicks
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = btn.dataset.nav;
                navigateTo(page);
            });
        });
        
        // Also handle clicks on elements with data-page attribute
        document.querySelectorAll('.bottom-nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = btn.dataset.page || btn.querySelector('[data-page]')?.dataset.page;
                if (page) navigateTo(page);
            });
        });
    }
    
    // Bind search
    function bindSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const query = e.target.value.trim();
                    Store.setState('searchQuery', query);
                    Products.filter(Store.getState('currentCategory'), query);
                }, 300);
            });
        }
    }
    
    // Navigate to page
    function navigateTo(page) {
        currentPage = page;
        
        // Update bottom nav active state
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            const itemPage = item.dataset.page || item.dataset.nav;
            if (itemPage === page) {
                item.classList.add('text-orange-500');
                item.classList.remove('text-gray-500');
            } else {
                item.classList.remove('text-orange-500');
                item.classList.add('text-gray-500');
            }
        });
        
        // Render page content
        switch(page) {
            case 'home':
                renderHomePage();
                break;
            case 'categories':
                Categories.renderPage();
                break;
            case 'orders':
                if (typeof OrdersPage !== 'undefined') {
                    OrdersPage.init();
                } else {
                    UI.showToast('Loading orders...', 'info');
                    renderOrdersPlaceholder();
                }
                break;
            case 'account':
                Account.render();
                break;
            case 'cart':
                Cart.show();
                break;
            default:
                renderHomePage();
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
    
    // Render home page
    function renderHomePage() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        mainContent.innerHTML = `
            <div class="home-page pb-24">
                <!-- Search Bar -->
                <div class="px-4 py-3">
                    <div class="relative">
                        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input type="text" id="search-input" placeholder="Search pickles, masalas, sweets..."
                               class="w-full py-3 pl-12 pr-4 bg-gray-100 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-200">
                    </div>
                </div>
                
                <!-- Category Tabs -->
                <div id="category-tabs" class="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                    <!-- Categories will be rendered here -->
                </div>
                
                <!-- Products Grid -->
                <div id="products-grid" class="px-4 grid grid-cols-2 gap-4">
                    <!-- Products will be rendered here -->
                </div>
            </div>
        `;
        
        // Re-render categories and products
        Categories.render();
        Products.render();
        
        // Re-bind search
        bindSearch();
    }
    
    // Orders placeholder
    function renderOrdersPlaceholder() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        mainContent.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full mb-4"></div>
                <p class="text-gray-500">Loading orders...</p>
            </div>
        `;
    }
    
    // Add to cart (called from product cards)
    function addToCart(productId) {
        const product = Products.getById(productId);
        if (product) {
            Store.addToCart(product, 1);
            UI.showToast('Added to cart! 🛒', 'success');
            Products.render(); // Re-render to update buttons
        }
    }
    
    // Update cart quantity (called from product cards)
    function updateQuantity(productId, quantity) {
        Store.updateCartQuantity(productId, quantity);
        
        // Re-render current view
        if (currentPage === 'home') {
            Products.render();
        } else if (currentPage === 'cart') {
            Cart.render();
        }
    }
    
    return {
        init,
        navigateTo,
        addToCart,
        updateQuantity
    };
})();


// ============================================
// INITIALIZE APP ON DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});


// ============================================
// GLOBAL EXPORTS
// ============================================
window.Store = Store;
window.UI = UI;
window.API = API;
window.Products = Products;
window.Categories = Categories;
window.Cart = Cart;
window.Account = Account;
window.App = App;
