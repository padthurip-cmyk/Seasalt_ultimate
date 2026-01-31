/**
 * SeaSalt Pickles - API Service
 * ==============================
 * Handles all communication with Netlify Functions backend.
 * Provides methods for products, orders, users, and payments.
 */

const API = (function() {
    // ============================================
    // PRIVATE VARIABLES
    // ============================================
    const baseUrl = CONFIG.API_BASE_URL;
    
    // ============================================
    // PRIVATE METHODS
    // ============================================
    
    /**
     * Make HTTP request to API
     */
    async function _request(endpoint, options = {}) {
        const url = `${baseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Add auth token if available
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            if (!response.ok) {
                throw new Error(data.message || data || `HTTP error ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    return {
        // ============================================
        // PRODUCTS API
        // ============================================
        
        /**
         * Get all products
         */
        async getProducts() {
            return _request(CONFIG.API.PRODUCTS);
        },
        
        /**
         * Get single product by ID
         */
        async getProduct(id) {
            return _request(`${CONFIG.API.PRODUCTS}?id=${id}`);
        },
        
        /**
         * Get products by category
         */
        async getProductsByCategory(category) {
            return _request(`${CONFIG.API.PRODUCTS}?category=${encodeURIComponent(category)}`);
        },
        
        /**
         * Search products
         */
        async searchProducts(query) {
            return _request(`${CONFIG.API.PRODUCTS}?search=${encodeURIComponent(query)}`);
        },
        
        // ============================================
        // CATEGORIES API
        // ============================================
        
        /**
         * Get all categories
         */
        async getCategories() {
            return _request(CONFIG.API.CATEGORIES);
        },
        
        // ============================================
        // ORDERS API
        // ============================================
        
        /**
         * Create new order
         */
        async createOrder(orderData) {
            return _request(CONFIG.API.ORDERS, {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
        },
        
        /**
         * Get user orders
         */
        async getOrders(phone) {
            return _request(`${CONFIG.API.ORDERS}?phone=${encodeURIComponent(phone)}`);
        },
        
        /**
         * Get single order
         */
        async getOrder(orderId) {
            return _request(`${CONFIG.API.ORDERS}?id=${orderId}`);
        },
        
        // ============================================
        // USER API
        // ============================================
        
        /**
         * Create or update user
         */
        async upsertUser(userData) {
            return _request(CONFIG.API.USERS, {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },
        
        /**
         * Get user by phone
         */
        async getUser(phone) {
            return _request(`${CONFIG.API.USERS}?phone=${encodeURIComponent(phone)}`);
        },
        
        // ============================================
        // WALLET API
        // ============================================
        
        /**
         * Get wallet balance
         */
        async getWalletBalance(phone) {
            return _request(`${CONFIG.API.WALLET}?phone=${encodeURIComponent(phone)}`);
        },
        
        /**
         * Add to wallet (credit)
         */
        async creditWallet(phone, amount, description) {
            return _request(CONFIG.API.WALLET, {
                method: 'POST',
                body: JSON.stringify({
                    phone,
                    amount,
                    type: 'credit',
                    description
                })
            });
        },
        
        /**
         * Deduct from wallet (debit)
         */
        async debitWallet(phone, amount, description) {
            return _request(CONFIG.API.WALLET, {
                method: 'POST',
                body: JSON.stringify({
                    phone,
                    amount,
                    type: 'debit',
                    description
                })
            });
        },
        
        // ============================================
        // SPIN WHEEL API
        // ============================================
        
        /**
         * Check spin eligibility
         */
        async checkSpinEligibility(phone) {
            return _request(`${CONFIG.API.SPIN}?phone=${encodeURIComponent(phone)}`);
        },
        
        /**
         * Record spin result
         */
        async recordSpin(phone, result, amount = 0) {
            return _request(CONFIG.API.SPIN, {
                method: 'POST',
                body: JSON.stringify({
                    phone,
                    result, // 'win' or 'lose'
                    amount
                })
            });
        },
        
        // ============================================
        // CONFIG API
        // ============================================
        
        /**
         * Get site configuration
         */
        async getSiteConfig() {
            return _request(CONFIG.API.CONFIG);
        },
        
        // ============================================
        // PAYMENT API (Razorpay)
        // ============================================
        
        /**
         * Create Razorpay order
         */
        async createPaymentOrder(amount, orderId) {
            return _request('/create-payment', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    orderId,
                    currency: CONFIG.RAZORPAY.CURRENCY
                })
            });
        },
        
        /**
         * Verify payment
         */
        async verifyPayment(paymentData) {
            return _request('/verify-payment', {
                method: 'POST',
                body: JSON.stringify(paymentData)
            });
        },
        
        // ============================================
        // ADMIN API
        // ============================================
        
        admin: {
            /**
             * Admin login
             */
            async login(credentials) {
                return _request(`${CONFIG.API.ADMIN}/login`, {
                    method: 'POST',
                    body: JSON.stringify(credentials)
                });
            },
            
            /**
             * Get all products (including inactive)
             */
            async getProducts() {
                return _request(`${CONFIG.API.ADMIN}/products`);
            },
            
            /**
             * Update product
             */
            async updateProduct(productId, data) {
                return _request(`${CONFIG.API.ADMIN}/products`, {
                    method: 'PUT',
                    body: JSON.stringify({ id: productId, ...data })
                });
            },
            
            /**
             * Create product
             */
            async createProduct(data) {
                return _request(`${CONFIG.API.ADMIN}/products`, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            },
            
            /**
             * Delete product
             */
            async deleteProduct(productId) {
                return _request(`${CONFIG.API.ADMIN}/products?id=${productId}`, {
                    method: 'DELETE'
                });
            },
            
            /**
             * Get site config
             */
            async getConfig() {
                return _request(`${CONFIG.API.ADMIN}/config`);
            },
            
            /**
             * Update site config
             */
            async updateConfig(config) {
                return _request(`${CONFIG.API.ADMIN}/config`, {
                    method: 'PUT',
                    body: JSON.stringify(config)
                });
            },
            
            /**
             * Get all orders
             */
            async getOrders(filters = {}) {
                const params = new URLSearchParams(filters).toString();
                return _request(`${CONFIG.API.ADMIN}/orders${params ? '?' + params : ''}`);
            },
            
            /**
             * Update order status
             */
            async updateOrderStatus(orderId, status) {
                return _request(`${CONFIG.API.ADMIN}/orders`, {
                    method: 'PUT',
                    body: JSON.stringify({ id: orderId, status })
                });
            },
            
            /**
             * Get all users
             */
            async getUsers() {
                return _request(`${CONFIG.API.ADMIN}/users`);
            },
            
            /**
             * Reset user spin
             */
            async resetUserSpin(phone) {
                return _request(`${CONFIG.API.ADMIN}/reset-spin`, {
                    method: 'POST',
                    body: JSON.stringify({ phone })
                });
            },
            
            /**
             * Get dashboard stats
             */
            async getDashboardStats() {
                return _request(`${CONFIG.API.ADMIN}/dashboard`);
            }
        }
    };
})();

// ============================================
// MOCK DATA (Used when API is not available)
// ============================================

const MockAPI = {
    products: null,
    categories: null,
    
    async loadSeedData() {
        if (this.products) return;
        
        try {
            // Try to load from seed file
            const response = await fetch('/data/products-seed.json');
            const data = await response.json();
            this.products = data.products;
            this.categories = data.categories;
        } catch (error) {
            console.warn('Could not load seed data, using embedded data');
            // Fallback to hardcoded minimal data
            this.products = [];
            this.categories = [];
        }
    },
    
    async getProducts() {
        await this.loadSeedData();
        return { success: true, data: this.products };
    },
    
    async getCategories() {
        await this.loadSeedData();
        return { success: true, data: this.categories };
    },
    
    async getSiteConfig() {
        return {
            success: true,
            data: {
                spinWheelEnabled: CONFIG.SPIN_WHEEL.ENABLED,
                deliveryCharges: {
                    standard: CONFIG.DELIVERY.STANDARD_CHARGE,
                    freeAbove: CONFIG.DELIVERY.FREE_DELIVERY_ABOVE
                }
            }
        };
    }
};

// Export for use in other modules
window.API = API;
window.MockAPI = MockAPI;
