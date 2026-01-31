/**
 * SeaSalt Pickles - Configuration
 * ================================
 * Central configuration for the application.
 * Update these values for production deployment.
 */

const CONFIG = {
    // ============================================
    // APP SETTINGS
    // ============================================
    APP_NAME: 'SeaSalt Pickles',
    APP_VERSION: '1.0.0',
    BRAND_NAME: 'Sea Salt Pickles',
    
    // ============================================
    // API ENDPOINTS
    // ============================================
    API_BASE_URL: '/.netlify/functions',
    
    // API Routes
    API: {
        PRODUCTS: '/products',
        CATEGORIES: '/categories',
        ORDERS: '/orders',
        USERS: '/users',
        WALLET: '/wallet',
        SPIN: '/spin',
        CONFIG: '/config',
        ADMIN: '/admin'
    },
    
    // ============================================
    // FIREBASE CONFIGURATION
    // ============================================
    // Replace these with your Firebase project credentials
    FIREBASE: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    },
    
    // ============================================
    // RAZORPAY CONFIGURATION
    // ============================================
    RAZORPAY: {
        KEY_ID: "YOUR_RAZORPAY_KEY_ID",
        CURRENCY: "INR",
        NAME: "SeaSalt Pickles",
        DESCRIPTION: "Order Payment",
        IMAGE: "/images/logo.png",
        THEME_COLOR: "#D4451A"
    },
    
    // ============================================
    // SPIN WHEEL SETTINGS
    // ============================================
    SPIN_WHEEL: {
        // Master switch to enable/disable spin wheel
        ENABLED: true,
        
        // Odds: 1 in N chance of winning
        WINNING_ODDS: 30,
        
        // Available rewards (in INR)
        REWARDS: [99, 299, 599],
        
        // Reward probabilities (must sum to 1)
        REWARD_PROBABILITIES: {
            99: 0.7,    // 70% of wins get ₹99
            299: 0.25,  // 25% of wins get ₹299
            599: 0.05   // 5% of wins get ₹599
        }
    },
    
    // ============================================
    // DELIVERY SETTINGS
    // ============================================
    DELIVERY: {
        // Standard delivery charge
        STANDARD_CHARGE: 50,
        
        // Free delivery threshold
        FREE_DELIVERY_ABOVE: 500,
        
        // Delivery areas (can be expanded)
        SERVICEABLE_PINCODES: [
            '500001', '500002', '500003', '500004', '500005',
            '500006', '500007', '500008', '500009', '500010',
            '500011', '500012', '500013', '500014', '500015',
            '500016', '500017', '500018', '500019', '500020',
            // Add more pincodes as needed
        ],
        
        // Estimated delivery days
        ESTIMATED_DAYS: {
            LOCAL: '2-3',
            OUTSTATION: '5-7'
        }
    },
    
    // ============================================
    // CART SETTINGS
    // ============================================
    CART: {
        MAX_ITEMS: 50,
        MAX_QUANTITY_PER_ITEM: 10,
        MIN_ORDER_VALUE: 199
    },
    
    // ============================================
    // IMAGE SETTINGS
    // ============================================
    IMAGES: {
        // Base URL for product images (from seasaltpickles.com or your CDN)
        BASE_URL: 'https://static.wixstatic.com/media/',
        
        // Fallback/placeholder image
        PLACEHOLDER: '/images/placeholder.jpg',
        
        // Image quality settings for Wix images
        QUALITY: 85,
        
        // Image sizes
        SIZES: {
            THUMBNAIL: { width: 150, height: 150 },
            CARD: { width: 300, height: 300 },
            DETAIL: { width: 600, height: 600 },
            FULL: { width: 1200, height: 1200 }
        }
    },
    
    // ============================================
    // UI SETTINGS
    // ============================================
    UI: {
        // Animation durations
        ANIMATION: {
            FAST: 200,
            NORMAL: 300,
            SLOW: 500
        },
        
        // Toast notification duration
        TOAST_DURATION: 3000,
        
        // Debounce delay for search
        SEARCH_DEBOUNCE: 300,
        
        // Products per page for pagination
        PRODUCTS_PER_PAGE: 12
    },
    
    // ============================================
    // LOCAL STORAGE KEYS
    // ============================================
    STORAGE_KEYS: {
        CART: 'seasalt_cart',
        USER: 'seasalt_user',
        WALLET: 'seasalt_wallet',
        SPIN_COMPLETED: 'seasalt_spin_done',
        AUTH_TOKEN: 'seasalt_auth_token',
        PREFERENCES: 'seasalt_preferences'
    },
    
    // ============================================
    // CONTACT INFORMATION
    // ============================================
    CONTACT: {
        PHONE: '+91-XXXXXXXXXX',
        EMAIL: 'support@seasaltpickles.com',
        WHATSAPP: '+91-XXXXXXXXXX',
        ADDRESS: 'Hyderabad, Telangana, India'
    },
    
    // ============================================
    // SOCIAL MEDIA LINKS
    // ============================================
    SOCIAL: {
        INSTAGRAM: 'https://instagram.com/seasaltpickles',
        FACEBOOK: 'https://facebook.com/seasaltpickles',
        YOUTUBE: 'https://youtube.com/@seasaltpickles'
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get full image URL from filename
 */
CONFIG.getImageUrl = function(filename, size = 'CARD') {
    if (!filename) return this.IMAGES.PLACEHOLDER;
    
    // If it's already a full URL, return as-is
    if (filename.startsWith('http')) return filename;
    
    // Build Wix image URL with sizing
    const sizeConfig = this.IMAGES.SIZES[size] || this.IMAGES.SIZES.CARD;
    return `${this.IMAGES.BASE_URL}${filename}/v1/fill/w_${sizeConfig.width},h_${sizeConfig.height},al_c,q_${this.IMAGES.QUALITY}/image.jpg`;
};

/**
 * Format price with currency symbol
 */
CONFIG.formatPrice = function(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
};

/**
 * Check if pincode is serviceable
 */
CONFIG.isPincodeServiceable = function(pincode) {
    return this.DELIVERY.SERVICEABLE_PINCODES.includes(pincode.toString());
};

/**
 * Calculate delivery charge
 */
CONFIG.getDeliveryCharge = function(cartTotal) {
    if (cartTotal >= this.DELIVERY.FREE_DELIVERY_ABOVE) {
        return 0;
    }
    return this.DELIVERY.STANDARD_CHARGE;
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.FIREBASE);
Object.freeze(CONFIG.RAZORPAY);
Object.freeze(CONFIG.SPIN_WHEEL);
Object.freeze(CONFIG.DELIVERY);
Object.freeze(CONFIG.CART);
Object.freeze(CONFIG.IMAGES);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.CONTACT);
Object.freeze(CONFIG.SOCIAL);
