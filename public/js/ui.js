/**
 * SeaSalt Pickles - UI Rendering Module
 * ======================================
 * Handles all DOM manipulation and UI rendering.
 * Creates product cards, modals, and other UI components.
 */

const UI = (function() {
    // ============================================
    // CACHED DOM ELEMENTS
    // ============================================
    const elements = {};
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function cacheElements() {
        elements.loadingOverlay = document.getElementById('loading-overlay');
        elements.app = document.getElementById('app');
        elements.categoryScroll = document.getElementById('category-scroll');
        elements.featuredProducts = document.getElementById('featured-products');
        elements.categorySections = document.getElementById('category-sections');
        elements.searchInput = document.getElementById('search-input');
        elements.cartBtn = document.getElementById('cart-btn');
        elements.cartCount = document.getElementById('cart-count');
        elements.walletBtn = document.getElementById('wallet-btn');
        elements.walletBalance = document.getElementById('wallet-balance');
        elements.toastContainer = document.getElementById('toast-container');
        elements.bottomNav = document.getElementById('bottom-nav');
        
        // Product modal elements
        elements.productModal = document.getElementById('product-modal');
        elements.modalProductName = document.getElementById('modal-product-name');
        elements.modalProductImage = document.getElementById('modal-product-image');
        elements.modalProductRibbon = document.getElementById('modal-product-ribbon');
        elements.modalProductCategory = document.getElementById('modal-product-category');
        elements.modalProductDescription = document.getElementById('modal-product-description');
        elements.variantOptions = document.getElementById('variant-options');
        elements.modalTotalPrice = document.getElementById('modal-total-price');
        elements.qtyValue = document.getElementById('qty-value');
        
        // Cart elements
        elements.cartSidebar = document.getElementById('cart-sidebar');
        elements.cartItems = document.getElementById('cart-items');
        elements.emptyCart = document.getElementById('empty-cart');
        elements.cartFooter = document.getElementById('cart-footer');
        elements.cartSubtotal = document.getElementById('cart-subtotal');
        elements.cartTotal = document.getElementById('cart-total');
        elements.deliveryCharge = document.getElementById('delivery-charge');
        elements.walletApplySection = document.getElementById('wallet-apply-section');
        elements.availableWallet = document.getElementById('available-wallet');
        elements.useWalletCheckbox = document.getElementById('use-wallet');
        elements.walletDiscountRow = document.getElementById('wallet-discount-row');
        elements.walletDiscount = document.getElementById('wallet-discount');
    }
    
    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    
    function showToast(message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠'
        }[type] || 'ℹ';
        
        toast.innerHTML = `
            <span class="text-lg">${icon}</span>
            <span>${message}</span>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Remove after duration
        setTimeout(() => {
            toast.remove();
        }, duration);
    }
    
    // ============================================
    // LOADING STATES
    // ============================================
    
    function showLoading() {
        elements.loadingOverlay.classList.remove('opacity-0', 'pointer-events-none');
        elements.app.classList.add('hidden');
    }
    
    function hideLoading() {
        elements.loadingOverlay.classList.add('opacity-0', 'pointer-events-none');
        elements.app.classList.remove('hidden');
        
        setTimeout(() => {
            elements.loadingOverlay.classList.add('hidden');
        }, 500);
    }
    
    // ============================================
    // PRODUCT CARD RENDERING
    // ============================================
    
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product.id;
        
        const imageUrl = CONFIG.getImageUrl(product.images[0], 'CARD');
        const lowestPrice = Math.min(...product.variants.map(v => v.price));
        const smallestSize = product.variants[0].size;
        
        card.innerHTML = `
            <div class="product-image-container">
                <img src="${imageUrl}" 
                     alt="${product.name}" 
                     loading="lazy"
                     onerror="this.src='${CONFIG.IMAGES.PLACEHOLDER}'">
                ${product.ribbon ? `<span class="product-ribbon">${product.ribbon}</span>` : ''}
                <button class="product-quick-add" data-product-id="${product.id}">+</button>
            </div>
            <div class="product-info">
                <h4 class="product-name">${product.name}</h4>
                <p class="product-category">${product.primaryCategory}</p>
                <div class="product-price">
                    <span class="current">${CONFIG.formatPrice(lowestPrice)}</span>
                    <span class="size">/ ${smallestSize}</span>
                </div>
            </div>
        `;
        
        // Click handler for opening product modal
        card.addEventListener('click', (e) => {
            // Prevent if clicking quick add button
            if (e.target.closest('.product-quick-add')) {
                e.stopPropagation();
                handleQuickAdd(product);
                return;
            }
            openProductModal(product);
        });
        
        return card;
    }
    
    function handleQuickAdd(product) {
        // Add first variant with quantity 1
        const variant = product.variants[0];
        Store.addToCart(product, variant, 1);
        updateCartUI();
        showToast(`${product.name} added to cart`, 'success');
    }
    
    // ============================================
    // CATEGORY PILLS RENDERING
    // ============================================
    
    function renderCategoryPills(categories) {
        const container = elements.categoryScroll;
        container.innerHTML = '';
        
        // Add "All" pill
        const allPill = document.createElement('button');
        allPill.className = 'category-pill active';
        allPill.dataset.category = 'all';
        allPill.innerHTML = `<span class="emoji">🍽️</span><span>All</span>`;
        container.appendChild(allPill);
        
        // Add category pills
        categories.forEach(cat => {
            const pill = document.createElement('button');
            pill.className = 'category-pill';
            pill.dataset.category = cat.name;
            pill.innerHTML = `<span class="emoji">${cat.icon}</span><span>${cat.name}</span>`;
            container.appendChild(pill);
        });
        
        // Add click handlers
        container.querySelectorAll('.category-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                // Update active state
                container.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                
                // Filter products
                const category = pill.dataset.category;
                Store.setActiveCategory(category);
                renderProductsByCategory(category);
            });
        });
    }
    
    // ============================================
    // PRODUCTS RENDERING
    // ============================================
    
    function renderFeaturedProducts(products) {
        const container = elements.featuredProducts;
        container.innerHTML = '';
        
        products.slice(0, 6).forEach(product => {
            container.appendChild(createProductCard(product));
        });
    }
    
    function renderCategorySections(categories, products) {
        const container = elements.categorySections;
        container.innerHTML = '';
        
        categories.forEach(category => {
            const categoryProducts = products.filter(
                p => p.active && p.primaryCategory === category.name
            );
            
            if (categoryProducts.length === 0) return;
            
            const section = document.createElement('section');
            section.className = 'category-section';
            section.id = `category-${category.name.replace(/\s+/g, '-').toLowerCase()}`;
            
            section.innerHTML = `
                <div class="category-banner">
                    <div class="category-banner-info">
                        <h3>${category.name}</h3>
                        <p>${categoryProducts.length} products</p>
                    </div>
                    <div class="category-banner-icon">${category.icon}</div>
                </div>
                <div class="grid grid-cols-2 gap-3 product-grid"></div>
            `;
            
            const grid = section.querySelector('.product-grid');
            categoryProducts.forEach(product => {
                grid.appendChild(createProductCard(product));
            });
            
            container.appendChild(section);
        });
    }
    
    function renderProductsByCategory(category) {
        const products = Store.getProductsByCategory(category);
        const container = elements.categorySections;
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3 class="empty-state-title">No products found</h3>
                    <p class="empty-state-text">Try a different category</p>
                </div>
            `;
            return;
        }
        
        const section = document.createElement('section');
        section.className = 'category-section';
        section.innerHTML = `<div class="grid grid-cols-2 gap-3 product-grid"></div>`;
        
        const grid = section.querySelector('.product-grid');
        products.forEach(product => {
            grid.appendChild(createProductCard(product));
        });
        
        container.appendChild(section);
    }
    
    function renderSearchResults(products) {
        const container = elements.categorySections;
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3 class="empty-state-title">No results found</h3>
                    <p class="empty-state-text">Try a different search term</p>
                </div>
            `;
            return;
        }
        
        const section = document.createElement('section');
        section.className = 'category-section';
        section.innerHTML = `
            <div class="section-header">
                <h3 class="section-title">Search Results (${products.length})</h3>
            </div>
            <div class="grid grid-cols-2 gap-3 product-grid"></div>
        `;
        
        const grid = section.querySelector('.product-grid');
        products.forEach(product => {
            grid.appendChild(createProductCard(product));
        });
        
        container.appendChild(section);
    }
    
    // ============================================
    // PRODUCT MODAL
    // ============================================
    
    function openProductModal(product) {
        Store.setSelectedProduct(product);
        
        const imageUrl = CONFIG.getImageUrl(product.images[0], 'DETAIL');
        
        elements.modalProductName.textContent = product.name;
        elements.modalProductImage.src = imageUrl;
        elements.modalProductImage.alt = product.name;
        elements.modalProductRibbon.textContent = product.ribbon || '';
        elements.modalProductRibbon.style.display = product.ribbon ? 'block' : 'none';
        elements.modalProductCategory.textContent = `${product.primaryCategory}${product.subCategory ? ' • ' + product.subCategory : ''}`;
        elements.modalProductDescription.textContent = product.description;
        
        // Render variants
        renderVariantOptions(product.variants);
        
        // Update price
        updateModalPrice();
        
        // Reset quantity
        elements.qtyValue.textContent = '1';
        
        // Show modal
        elements.productModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    function closeProductModal() {
        elements.productModal.classList.add('hidden');
        document.body.style.overflow = '';
        Store.setSelectedProduct(null);
    }
    
    function renderVariantOptions(variants) {
        const container = elements.variantOptions;
        container.innerHTML = '';
        
        variants.forEach((variant, index) => {
            const option = document.createElement('button');
            option.className = `variant-option ${index === 0 ? 'selected' : ''}`;
            option.dataset.index = index;
            option.innerHTML = `
                <span class="size">${variant.size}</span>
                <span class="price">${CONFIG.formatPrice(variant.price)}</span>
            `;
            
            option.addEventListener('click', () => {
                container.querySelectorAll('.variant-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                Store.setSelectedVariant(variant);
                updateModalPrice();
            });
            
            container.appendChild(option);
        });
    }
    
    function updateModalPrice() {
        const state = Store.getState();
        const variant = state.selectedVariant;
        const quantity = state.quantity || 1;
        
        if (variant) {
            const total = variant.price * quantity;
            elements.modalTotalPrice.textContent = CONFIG.formatPrice(total);
        }
    }
    
    // ============================================
    // CART UI
    // ============================================
    
    function openCart() {
        elements.cartSidebar.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        renderCartItems();
    }
    
    function closeCart() {
        elements.cartSidebar.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    function updateCartUI() {
        const cart = Store.getCart();
        const count = Store.getCartItemCount();
        
        // Update cart count badge
        if (count > 0) {
            elements.cartCount.textContent = count;
            elements.cartCount.classList.remove('hidden');
        } else {
            elements.cartCount.classList.add('hidden');
        }
        
        // Update wallet balance
        const walletBalance = Store.getWalletBalance();
        elements.walletBalance.textContent = CONFIG.formatPrice(walletBalance);
    }
    
    function renderCartItems() {
        const cart = Store.getCart();
        const container = elements.cartItems;
        
        if (cart.items.length === 0) {
            elements.emptyCart.classList.remove('hidden');
            elements.cartFooter.classList.add('hidden');
            return;
        }
        
        elements.emptyCart.classList.add('hidden');
        elements.cartFooter.classList.remove('hidden');
        
        // Clear existing items (except empty cart message)
        const existingItems = container.querySelectorAll('.cart-item');
        existingItems.forEach(item => item.remove());
        
        // Render cart items
        cart.items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.dataset.itemId = item.id;
            
            const imageUrl = CONFIG.getImageUrl(item.image, 'THUMBNAIL');
            
            itemEl.innerHTML = `
                <div class="cart-item-image">
                    <img src="${imageUrl}" alt="${item.name}" loading="lazy">
                </div>
                <div class="cart-item-info">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <p class="cart-item-variant">${item.size}</p>
                    <div class="cart-item-controls">
                        <div class="cart-qty-control">
                            <button class="cart-qty-btn" data-action="decrease" data-item-id="${item.id}">−</button>
                            <span class="cart-qty-value">${item.quantity}</span>
                            <button class="cart-qty-btn" data-action="increase" data-item-id="${item.id}">+</button>
                        </div>
                        <span class="cart-item-price">${CONFIG.formatPrice(item.price * item.quantity)}</span>
                    </div>
                </div>
            `;
            
            // Add event listeners
            itemEl.querySelectorAll('.cart-qty-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = btn.dataset.action;
                    const itemId = btn.dataset.itemId;
                    const currentItem = cart.items.find(i => i.id === itemId);
                    
                    if (action === 'increase') {
                        Store.updateCartQuantity(itemId, currentItem.quantity + 1);
                    } else {
                        Store.updateCartQuantity(itemId, currentItem.quantity - 1);
                    }
                    
                    renderCartItems();
                    updateCartUI();
                });
            });
            
            container.insertBefore(itemEl, elements.emptyCart);
        });
        
        // Update totals
        updateCartTotals();
    }
    
    function updateCartTotals() {
        const cart = Store.getCart();
        const walletBalance = Store.getWalletBalance();
        
        elements.cartSubtotal.textContent = CONFIG.formatPrice(cart.subtotal);
        
        // Delivery charge
        if (cart.deliveryCharge === 0) {
            elements.deliveryCharge.innerHTML = '<span class="text-spice-leaf font-medium">FREE</span>';
        } else {
            elements.deliveryCharge.textContent = CONFIG.formatPrice(cart.deliveryCharge);
        }
        
        // Wallet section
        if (walletBalance > 0) {
            elements.walletApplySection.classList.remove('hidden');
            elements.availableWallet.textContent = CONFIG.formatPrice(walletBalance);
        } else {
            elements.walletApplySection.classList.add('hidden');
        }
        
        // Wallet discount
        if (cart.walletDiscount > 0) {
            elements.walletDiscountRow.style.display = 'flex';
            elements.walletDiscount.textContent = `-${CONFIG.formatPrice(cart.walletDiscount)}`;
        } else {
            elements.walletDiscountRow.style.display = 'none';
        }
        
        // Total
        elements.cartTotal.textContent = CONFIG.formatPrice(cart.total);
    }
    
    // ============================================
    // BOTTOM NAVIGATION
    // ============================================
    
    function updateBottomNav(page) {
        elements.bottomNav.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    return {
        init() {
            cacheElements();
        },
        
        // Loading
        showLoading,
        hideLoading,
        
        // Toast
        showToast,
        
        // Products
        renderCategoryPills,
        renderFeaturedProducts,
        renderCategorySections,
        renderProductsByCategory,
        renderSearchResults,
        createProductCard,
        
        // Product Modal
        openProductModal,
        closeProductModal,
        updateModalPrice,
        
        // Cart
        openCart,
        closeCart,
        updateCartUI,
        renderCartItems,
        updateCartTotals,
        
        // Navigation
        updateBottomNav,
        
        // Elements access
        getElements() {
            return elements;
        }
    };
})();

// Make UI globally available
window.UI = UI;
