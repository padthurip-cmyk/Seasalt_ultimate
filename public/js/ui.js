/**
 * SeaSalt Pickles - UI Module (Fixed for Supabase)
 * =================================================
 */

const UI = (function() {
    let elements = {};
    
    function cacheElements() {
        elements = {
            loadingOverlay: document.getElementById('loading-overlay'),
            categoryScroll: document.getElementById('category-scroll'),
            featuredProducts: document.getElementById('featured-products'),
            categorySections: document.getElementById('category-sections'),
            productModal: document.getElementById('product-modal'),
            cartSidebar: document.getElementById('cart-sidebar'),
            cartItems: document.getElementById('cart-items'),
            cartFooter: document.getElementById('cart-footer'),
            cartBtn: document.getElementById('cart-btn'),
            cartCount: document.getElementById('cart-count'),
            walletBalance: document.getElementById('wallet-balance'),
            walletBtn: document.getElementById('wallet-btn'),
            useWalletCheckbox: document.getElementById('use-wallet'),
            qtyValue: document.getElementById('qty-value'),
            toastContainer: document.getElementById('toast-container')
        };
    }
    
    function init() { cacheElements(); }
    function getElements() { return elements; }
    
    function showLoading() {
        if (elements.loadingOverlay) elements.loadingOverlay.classList.remove('hidden');
    }
    
    function hideLoading() {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.style.opacity = '0';
            setTimeout(function() {
                elements.loadingOverlay.classList.add('hidden');
                elements.loadingOverlay.style.opacity = '1';
            }, 500);
        }
    }
    
    function renderCategoryPills(categories) {
        if (!elements.categoryScroll) return;
        console.log('[UI] Rendering category pills:', categories.length, categories);
        
        var allPill = '<button class="category-pill active flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all bg-pickle-500 text-white" data-category="all">🫙 All</button>';
        var categoryPills = '';
        for (var i = 0; i < categories.length; i++) {
            var cat = categories[i];
            var emoji = cat.emoji || '🫙';
            // Sanitize emoji - if it's "undefined" or "null" string, use fallback
            if (emoji === 'undefined' || emoji === 'null' || emoji === '') {
                var emojiMap = { mango: '🥭', mixed: '🫙', nonveg: '🍗', specialty: '⭐' };
                emoji = emojiMap[cat.id] || '🫙';
            }
            categoryPills += '<button class="category-pill flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all bg-gray-100 text-gray-700 hover:bg-gray-200" data-category="' + cat.id + '">' + emoji + ' ' + cat.name + '</button>';
        }
        
        elements.categoryScroll.innerHTML = allPill + categoryPills;
        
        document.querySelectorAll('.category-pill').forEach(function(pill) {
            pill.addEventListener('click', function() {
                document.querySelectorAll('.category-pill').forEach(function(p) {
                    p.classList.remove('active', 'bg-pickle-500', 'text-white');
                    p.classList.add('bg-gray-100', 'text-gray-700');
                });
                pill.classList.add('active', 'bg-pickle-500', 'text-white');
                pill.classList.remove('bg-gray-100', 'text-gray-700');
                Store.setActiveCategory(pill.dataset.category);
                var products = Store.getActiveProducts();
                var cats = Store.getCategories();
                renderCategorySections(cats, products);
            });
        });
    }
    
    function createProductCard(product) {
        // Ultra-safe property access
        var variants = product.variants;
        if (!variants || !Array.isArray(variants) || variants.length === 0) {
            variants = [{ price: product.price || 199, weight: '250g' }];
        }
        var defaultVariant = variants[0] || { price: 199, weight: '250g' };
        var price = Number(defaultVariant.price) || 199;
        var weight = String(defaultVariant.weight || '250g');
        var imageUrl = product.image || 'https://placehold.co/300x300/D4451A/fff?text=Pickle';
        var name = product.name || 'Product';
        var id = product.id || 'unknown';
        var badge = product.badge || '';
        
        var badgeHTML = badge ? '<span class="absolute top-3 left-3 px-2 py-1 bg-spice-gold text-white text-xs font-bold rounded-full">' + badge + '</span>' : '';
        
        return '<div class="product-card bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg" data-product-id="' + id + '">' +
            '<div class="relative aspect-square bg-gradient-to-br from-pickle-50 to-orange-50">' +
                '<img src="' + imageUrl + '" alt="' + name + '" class="w-full h-full object-cover" loading="lazy" onerror="this.src=\'https://placehold.co/300x300/D4451A/fff?text=Pickle\'">' +
                badgeHTML +
            '</div>' +
            '<div class="p-4">' +
                '<h3 class="font-display font-bold text-gray-800 mb-1 line-clamp-1">' + name + '</h3>' +
                '<p class="text-gray-500 text-sm mb-2">' + weight + '</p>' +
                '<div class="flex items-center justify-between">' +
                    '<span class="text-lg font-bold text-pickle-600">₹' + price + '</span>' +
                    '<button class="add-btn w-8 h-8 bg-pickle-500 text-white rounded-full flex items-center justify-center hover:bg-pickle-600 transition-colors">' +
                        '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }
    
    function renderFeaturedProducts(products) {
        if (!elements.featuredProducts) {
            console.log('[UI] featuredProducts element not found');
            return;
        }
        
        // Flexible isFeatured check - handles boolean, string, truthy values
        var featured = products.filter(function(p) {
            return p.isFeatured === true || p.isFeatured === 'true' || p.is_featured === true || p.is_featured === 'true';
        }).slice(0, 6);
        
        console.log('[UI] Featured products:', featured.length, 'from', products.length, 'total');
        console.log('[UI] Product isFeatured values:', products.map(function(p) { return p.name + ':' + p.isFeatured + '(' + typeof p.isFeatured + ')'; }));
        
        if (featured.length === 0) {
            // If no featured products, show ALL products instead of hiding
            console.log('[UI] No featured products found, showing first 6 products instead');
            featured = products.slice(0, 6);
        }
        
        if (featured.length === 0) {
            // Truly no products at all
            elements.featuredProducts.parentElement.classList.add('hidden');
            return;
        }
        
        // Make sure parent is visible
        elements.featuredProducts.parentElement.classList.remove('hidden');
        var featuredSection = document.getElementById('featured-section');
        if (featuredSection) featuredSection.classList.remove('hidden');
        
        var html = '';
        for (var i = 0; i < featured.length; i++) {
            try {
                html += createProductCard(featured[i]);
            } catch(e) {
                console.error('[UI] Error creating card for:', featured[i], e);
            }
        }
        elements.featuredProducts.innerHTML = html;
        bindProductCardEvents(elements.featuredProducts);
    }
    
    function renderCategorySections(categories, products) {
        if (!elements.categorySections) {
            console.log('[UI] categorySections element not found');
            return;
        }
        var activeCategory = Store.getState().activeCategory;
        
        console.log('[UI] Rendering categories:', categories.length, '| Products:', products.length, '| Active:', activeCategory);
        
        var emojiMap = { mango: '🥭', mixed: '🫙', nonveg: '🍗', specialty: '⭐' };
        var html = '';
        
        if (activeCategory === 'all') {
            for (var i = 0; i < categories.length; i++) {
                var cat = categories[i];
                var catProducts = products.filter(function(p) { return p.category === cat.id; });
                console.log('[UI] Category "' + cat.id + '" (' + cat.name + '): ' + catProducts.length + ' products');
                
                if (catProducts.length === 0) continue;
                
                var emoji = cat.emoji || emojiMap[cat.id] || '🫙';
                if (emoji === 'undefined' || emoji === 'null') emoji = emojiMap[cat.id] || '🫙';
                
                html += '<section class="mb-8"><div class="max-w-lg mx-auto px-4">';
                html += '<div class="flex items-center justify-between mb-4">';
                html += '<h2 class="font-display text-xl font-bold text-gray-800">' + emoji + ' ' + cat.name + '</h2>';
                html += '</div>';
                html += '<div class="grid grid-cols-2 gap-4">';
                for (var j = 0; j < catProducts.length; j++) {
                    try {
                        html += createProductCard(catProducts[j]);
                    } catch(e) {
                        console.error('[UI] Card error:', e);
                    }
                }
                html += '</div></div></section>';
            }
        } else {
            var catProducts = products.filter(function(p) { return p.category === activeCategory; });
            var cat = categories.find(function(c) { return c.id === activeCategory; });
            var catName = cat ? cat.name : 'Products';
            var catEmoji = (cat && cat.emoji) ? cat.emoji : (emojiMap[activeCategory] || '🫙');
            
            html += '<section class="mb-8"><div class="max-w-lg mx-auto px-4">';
            html += '<div class="flex items-center justify-between mb-4">';
            html += '<h2 class="font-display text-xl font-bold text-gray-800">' + catEmoji + ' ' + catName + '</h2>';
            html += '</div>';
            html += '<div class="grid grid-cols-2 gap-4">';
            for (var k = 0; k < catProducts.length; k++) {
                try {
                    html += createProductCard(catProducts[k]);
                } catch(e) {
                    console.error('[UI] Card error:', e);
                }
            }
            html += '</div></div></section>';
        }
        
        elements.categorySections.innerHTML = html;
        
        if (html === '') {
            console.warn('[UI] No category sections rendered! Product categories:', products.map(function(p) { return p.category; }));
            console.warn('[UI] Category IDs:', categories.map(function(c) { return c.id; }));
        }
        
        bindProductCardEvents(elements.categorySections);
    }
    
    function renderSearchResults(products) {
        if (!elements.categorySections) return;
        if (products.length === 0) {
            elements.categorySections.innerHTML = '<div class="text-center py-12"><div class="text-6xl mb-4">🔍</div><h3 class="font-display text-xl font-bold text-gray-800 mb-2">No products found</h3><p class="text-gray-500">Try a different search term</p></div>';
            return;
        }
        var html = '<section class="mb-8"><div class="max-w-lg mx-auto px-4"><h2 class="font-display text-xl font-bold text-gray-800 mb-4">Search Results (' + products.length + ')</h2><div class="grid grid-cols-2 gap-4">';
        for (var i = 0; i < products.length; i++) {
            html += createProductCard(products[i]);
        }
        html += '</div></div></section>';
        elements.categorySections.innerHTML = html;
        bindProductCardEvents(elements.categorySections);
    }
    
    function bindProductCardEvents(container) {
        container.querySelectorAll('.product-card').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.add-btn')) return;
                var productId = card.dataset.productId;
                var product = Store.getProducts().find(function(p) { return p.id === productId; });
                if (product) openProductModal(product);
            });
            
            // Quick add button
            var addBtn = card.querySelector('.add-btn');
            if (addBtn) {
                addBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var productId = card.dataset.productId;
                    var product = Store.getProducts().find(function(p) { return p.id === productId; });
                    if (product) {
                        var variant = product.variants && product.variants[0] ? product.variants[0] : { weight: '250g', price: 199 };
                        Store.addToCart(product, variant, 1);
                        updateCartUI();
                        showToast(product.name + ' added to cart!', 'success');
                    }
                });
            }
        });
    }
    
    function openProductModal(product) {
        var modal = elements.productModal;
        if (!modal) return;
        
        Store.setSelectedProduct(product);
        
        var variants = product.variants || [{ weight: '250g', price: 199 }];
        var selectedVariant = variants[0];
        var imageUrl = product.image || 'https://placehold.co/400x400/D4451A/fff?text=Pickle';
        
        modal.innerHTML = '<div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-modal"></div>' +
            '<div class="relative bg-white rounded-t-3xl w-full max-w-lg mt-auto animate-slide-up max-h-[90vh] overflow-y-auto">' +
                '<button class="close-modal absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center z-10">' +
                    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
                '</button>' +
                '<div class="aspect-square bg-gradient-to-br from-pickle-50 to-orange-50">' +
                    '<img src="' + imageUrl + '" alt="' + product.name + '" class="w-full h-full object-cover" onerror="this.src=\'https://placehold.co/400x400/D4451A/fff?text=Pickle\'">' +
                '</div>' +
                '<div class="p-6">' +
                    (product.badge ? '<span class="inline-block px-3 py-1 bg-spice-gold/10 text-spice-gold text-sm font-bold rounded-full mb-2">' + product.badge + '</span>' : '') +
                    '<h2 class="font-display text-2xl font-bold text-gray-800 mb-2">' + product.name + '</h2>' +
                    '<p class="text-gray-500 mb-4">' + (product.description || '') + '</p>' +
                    '<div class="flex flex-wrap gap-2 mb-4" id="modal-variants">' +
                        variants.map(function(v, idx) {
                            return '<button class="variant-btn px-4 py-2 rounded-xl text-sm font-medium transition-all ' +
                                (idx === 0 ? 'bg-pickle-500 text-white' : 'bg-gray-100 text-gray-700') +
                                '" data-variant-index="' + idx + '">' + v.weight + ' - ₹' + v.price + '</button>';
                        }).join('') +
                    '</div>' +
                    '<div class="flex items-center justify-between">' +
                        '<div class="flex items-center gap-3">' +
                            '<button id="qty-minus" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold">−</button>' +
                            '<span id="qty-value" class="text-lg font-bold">1</span>' +
                            '<button id="qty-plus" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold">+</button>' +
                        '</div>' +
                        '<button id="add-to-cart-btn" class="px-6 py-3 bg-pickle-500 text-white font-bold rounded-xl hover:bg-pickle-600 transition-colors">' +
                            'Add ₹<span id="product-modal-price">' + selectedVariant.price + '</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        // Close handlers
        modal.querySelectorAll('.close-modal').forEach(function(btn) {
            btn.addEventListener('click', closeProductModal);
        });
        
        // Variant selection
        modal.querySelectorAll('.variant-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                modal.querySelectorAll('.variant-btn').forEach(function(b) {
                    b.classList.remove('bg-pickle-500', 'text-white');
                    b.classList.add('bg-gray-100', 'text-gray-700');
                });
                btn.classList.add('bg-pickle-500', 'text-white');
                btn.classList.remove('bg-gray-100', 'text-gray-700');
                var variantIndex = parseInt(btn.dataset.variantIndex);
                Store.setSelectedVariant(variants[variantIndex]);
                updateModalPrice();
            });
        });
        
        // Quantity buttons
        var qtyEl = modal.querySelector('#qty-value');
        modal.querySelector('#qty-minus').addEventListener('click', function() {
            var qty = Store.getState().quantity;
            if (qty > 1) { Store.setQuantity(qty - 1); qtyEl.textContent = qty - 1; updateModalPrice(); }
        });
        modal.querySelector('#qty-plus').addEventListener('click', function() {
            var qty = Store.getState().quantity;
            if (qty < 10) { Store.setQuantity(qty + 1); qtyEl.textContent = qty + 1; updateModalPrice(); }
        });
        
        // Add to cart
        modal.querySelector('#add-to-cart-btn').addEventListener('click', function() {
            var state = Store.getState();
            var variant = state.selectedVariant || variants[0];
            Store.addToCart(product, variant, state.quantity);
            closeProductModal();
            updateCartUI();
            showToast(product.name + ' added to cart!', 'success');
        });
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    function closeProductModal() {
        if (elements.productModal) {
            elements.productModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    function updateModalPrice() {
        var state = Store.getState();
        var variant = state.selectedVariant;
        var quantity = state.quantity || 1;
        if (variant) {
            var priceEl = document.getElementById('product-modal-price');
            if (priceEl) priceEl.textContent = variant.price * quantity;
        }
    }
    
    function openCart() {
        if (elements.cartSidebar) {
            elements.cartSidebar.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeCart() {
        if (elements.cartSidebar) {
            elements.cartSidebar.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    function renderCartItems() {
        var cart = Store.getCart();
        if (!elements.cartItems) return;
        
        if (cart.items.length === 0) {
            elements.cartItems.innerHTML = '<div class="text-center py-12"><div class="text-6xl mb-4">🛒</div><h3 class="font-display text-xl font-bold text-gray-800 mb-2">Your cart is empty</h3><p class="text-gray-500">Add some delicious pickles!</p></div>';
            if (elements.cartFooter) elements.cartFooter.classList.add('hidden');
            return;
        }
        
        var html = '';
        for (var i = 0; i < cart.items.length; i++) {
            var item = cart.items[i];
            html += '<div class="cart-item flex gap-4 p-4 bg-white rounded-xl" data-item-id="' + item.id + '">' +
                '<img src="' + (item.image || 'https://placehold.co/80x80/D4451A/fff?text=Pickle') + '" class="w-20 h-20 rounded-lg object-cover" alt="' + item.name + '">' +
                '<div class="flex-1">' +
                    '<h4 class="font-semibold text-gray-800">' + item.name + '</h4>' +
                    '<p class="text-sm text-gray-500">' + item.weight + '</p>' +
                    '<div class="flex items-center justify-between mt-2">' +
                        '<div class="flex items-center gap-2">' +
                            '<button class="qty-btn w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center" data-action="decrease">−</button>' +
                            '<span class="font-medium">' + item.quantity + '</span>' +
                            '<button class="qty-btn w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center" data-action="increase">+</button>' +
                        '</div>' +
                        '<span class="font-bold text-pickle-600">₹' + (item.price * item.quantity) + '</span>' +
                    '</div>' +
                '</div>' +
                '<button class="remove-btn text-gray-400 hover:text-red-500">' +
                    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
                '</button>' +
            '</div>';
        }
        elements.cartItems.innerHTML = html;
        
        elements.cartItems.querySelectorAll('.qty-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var itemId = btn.closest('.cart-item').dataset.itemId;
                var item = cart.items.find(function(i) { return i.id === itemId; });
                if (item) {
                    var newQty = btn.dataset.action === 'increase' ? item.quantity + 1 : item.quantity - 1;
                    Store.updateCartItem(itemId, newQty);
                    renderCartItems();
                    updateCartTotals();
                }
            });
        });
        
        elements.cartItems.querySelectorAll('.remove-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var itemId = btn.closest('.cart-item').dataset.itemId;
                Store.removeFromCart(itemId);
                renderCartItems();
                updateCartTotals();
            });
        });
        
        if (elements.cartFooter) elements.cartFooter.classList.remove('hidden');
        updateCartTotals();
    }
    
    function updateCartTotals() {
        var cart = Store.getCart();
        var subtotalEl = document.getElementById('cart-subtotal');
        var deliveryEl = document.getElementById('delivery-charge');
        var walletEl = document.getElementById('wallet-discount');
        var totalEl = document.getElementById('cart-total');
        
        if (subtotalEl) subtotalEl.textContent = '₹' + cart.subtotal;
        if (deliveryEl) deliveryEl.textContent = cart.deliveryCharge === 0 ? 'FREE' : '₹' + cart.deliveryCharge;
        if (walletEl) walletEl.textContent = cart.walletDiscount > 0 ? '-₹' + cart.walletDiscount : '₹0';
        if (totalEl) totalEl.textContent = '₹' + cart.total;
    }
    
    function updateCartUI() {
        var count = Store.getCartItemCount();
        if (elements.cartCount) {
            elements.cartCount.textContent = count;
            elements.cartCount.classList.toggle('hidden', count === 0);
        }
        var walletBalance = Store.getWalletBalance();
        if (elements.walletBalance) {
            elements.walletBalance.textContent = '₹' + walletBalance;
        }
    }
    
    function updateBottomNav(page) {
        document.querySelectorAll('.nav-item').forEach(function(item) {
            item.classList.toggle('text-pickle-500', item.dataset.page === page);
            item.classList.toggle('text-gray-400', item.dataset.page !== page);
        });
    }
    
    function showToast(message, type) {
        type = type || 'info';
        var toast = document.createElement('div');
        var bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-gray-800';
        toast.className = 'px-4 py-3 rounded-xl shadow-lg text-white text-sm animate-slide-in ' + bgColor;
        toast.textContent = message;
        
        if (elements.toastContainer) {
            elements.toastContainer.appendChild(toast);
            setTimeout(function() {
                toast.style.opacity = '0';
                setTimeout(function() { toast.remove(); }, 300);
            }, 3000);
        }
    }
    
    return {
        init: init, getElements: getElements, showLoading: showLoading, hideLoading: hideLoading,
        renderCategoryPills: renderCategoryPills, renderFeaturedProducts: renderFeaturedProducts,
        renderCategorySections: renderCategorySections, renderSearchResults: renderSearchResults,
        openProductModal: openProductModal, closeProductModal: closeProductModal, updateModalPrice: updateModalPrice,
        openCart: openCart, closeCart: closeCart, renderCartItems: renderCartItems,
        updateCartTotals: updateCartTotals, updateCartUI: updateCartUI,
        updateBottomNav: updateBottomNav, showToast: showToast
    };
})();

window.UI = UI;
