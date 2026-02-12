/**
 * SeaSalt Pickles - Search Fix v3
 * ================================
 * Add AFTER all other scripts: <script src="js/search-fix.js"></script>
 * 
 * v3: Directly targets known page elements by ID/class instead of 
 * trying to detect siblings. Much more reliable.
 */
(function() {
    'use strict';

    function initSearchFix() {
        console.log('[SearchFix] v3 Initializing...');

        if (typeof Store === 'undefined') { console.error('[SearchFix] Store not found!'); return; }

        // Patch searchProducts if missing
        if (typeof Store.searchProducts !== 'function') {
            Store.searchProducts = function(query) {
                var products = Store.getProducts ? Store.getProducts() : [];
                if (!query || !query.trim()) return products;
                var q = query.toLowerCase().trim();
                return products.filter(function(p) {
                    return (p.name || '').toLowerCase().indexOf(q) !== -1
                        || (p.description || '').toLowerCase().indexOf(q) !== -1
                        || (p.category || '').toLowerCase().indexOf(q) !== -1
                        || (p.badge || '').toLowerCase().indexOf(q) !== -1;
                });
            };
            console.log('[SearchFix] Store.searchProducts patched');
        }

        // Find search input
        var searchInput = document.getElementById('search-input')
            || document.querySelector('input[type="search"]')
            || document.querySelector('input[placeholder*="earch"]');
        if (!searchInput) { console.error('[SearchFix] Search input not found!'); return; }
        console.log('[SearchFix] Found input:', searchInput.id || searchInput.placeholder);

        var categorySections = document.getElementById('category-sections');
        console.log('[SearchFix] category-sections found:', !!categorySections);

        // ── AGGRESSIVE SECTION FINDER ──
        // Directly collect ALL elements we want to hide during search
        var sectionsToToggle = [];
        var originalDisplays = [];

        // 1. Find by known IDs
        var knownIds = ['hero-banner', 'featured-section', 'featured-products', 'bestsellers', 
                        'bestsellers-section', 'home-banner', 'promo-banner', 'offers-section'];
        knownIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) { sectionsToToggle.push(el); originalDisplays.push(el.style.display || ''); }
        });

        // 2. Find by common class names
        var knownSelectors = [
            '.hero-banner', '.hero-section', '.hero', '[class*="hero"]',
            '.featured-section', '.bestsellers', '[class*="bestseller"]', '[class*="featured"]',
            '.swiper', '.swiper-container', '.carousel',
            '.promo-banner', '.offers-banner'
        ];
        knownSelectors.forEach(function(sel) {
            try {
                document.querySelectorAll(sel).forEach(function(el) {
                    // Don't add duplicates and don't add category-sections itself
                    if (sectionsToToggle.indexOf(el) === -1 && el !== categorySections) {
                        // Don't hide the search bar, modals, cart, etc.
                        var id = (el.id || '').toLowerCase();
                        if (id.indexOf('modal') !== -1 || id.indexOf('cart') !== -1 || id.indexOf('search') !== -1) return;
                        if (el.contains && el.contains(searchInput)) return;
                        sectionsToToggle.push(el);
                        originalDisplays.push(el.style.display || '');
                    }
                });
            } catch(e) {}
        });

        // 3. NUCLEAR OPTION: If we still found 0 sections, scan ALL children of category-sections' 
        //    ancestors looking for large visible sections that aren't the search or category-sections
        if (sectionsToToggle.length === 0 && categorySections) {
            console.log('[SearchFix] No sections found by ID/class, scanning DOM tree...');
            
            // Walk up to find the main scrollable container
            var container = categorySections.parentElement;
            // Try up to 3 levels
            for (var level = 0; level < 3 && container; level++) {
                var kids = container.children;
                for (var i = 0; i < kids.length; i++) {
                    var el = kids[i];
                    if (el === categorySections) continue;
                    if (el.tagName === 'HEADER' || el.tagName === 'FOOTER' || el.tagName === 'NAV' || el.tagName === 'SCRIPT') continue;
                    
                    var elId = (el.id || '').toLowerCase();
                    var elCls = (el.className || '').toString().toLowerCase();
                    
                    // Skip UI elements
                    if (elId.indexOf('modal') !== -1 || elId.indexOf('sidebar') !== -1 || elId.indexOf('cart') !== -1) continue;
                    if (elId.indexOf('overlay') !== -1 || elId.indexOf('bottom-nav') !== -1 || elId.indexOf('toast') !== -1) continue;
                    if (elId.indexOf('loading') !== -1 || elId.indexOf('search') !== -1 || elId.indexOf('spinwheel') !== -1) continue;
                    if (elCls.indexOf('modal') !== -1 || elCls.indexOf('sidebar') !== -1 || elCls.indexOf('overlay') !== -1) continue;
                    if (elCls.indexOf('bottom-nav') !== -1 || elCls.indexOf('fixed') !== -1) continue;
                    
                    // Skip if it contains search input or category pills
                    if (el.contains && el.contains(searchInput)) continue;
                    if (el.querySelector && el.querySelector('.category-pill')) continue;
                    if (el.querySelector && el.querySelector('#category-scroll')) continue;
                    
                    // Skip if it contains category-sections (we're at a parent level)
                    if (el.contains && el.contains(categorySections)) continue;
                    
                    // Check if it's visible and has meaningful height
                    var rect = el.getBoundingClientRect();
                    if (rect.height > 30) {
                        sectionsToToggle.push(el);
                        originalDisplays.push(el.style.display || '');
                    }
                }
                
                if (sectionsToToggle.length > 0) break;
                container = container.parentElement;
            }
        }

        console.log('[SearchFix] Sections to toggle: ' + sectionsToToggle.length);
        sectionsToToggle.forEach(function(el, i) {
            console.log('[SearchFix]   → ' + (el.id || el.className || el.tagName) + ' (' + el.getBoundingClientRect().height + 'px)');
        });

        // Clone input to remove old listeners
        var newInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newInput, searchInput);
        searchInput = newInput;

        var debounceTimer = null;
        var isSearchActive = false;

        searchInput.addEventListener('input', function(e) {
            var query = e.target.value.trim();
            clearTimeout(debounceTimer);

            debounceTimer = setTimeout(function() {
                if (query.length > 0) {
                    console.log('[SearchFix] Searching: "' + query + '"');

                    var results = Store.searchProducts(query);
                    console.log('[SearchFix] Found ' + results.length + ' results');

                    // HIDE home sections
                    if (!isSearchActive) {
                        sectionsToToggle.forEach(function(el) { el.style.display = 'none'; });
                        isSearchActive = true;
                    }

                    // Ensure category-sections is visible
                    if (categorySections) {
                        categorySections.style.display = '';
                        categorySections.style.minHeight = '300px';
                    }

                    // Render
                    if (typeof UI !== 'undefined' && typeof UI.renderSearchResults === 'function') {
                        UI.renderSearchResults(results);
                    }

                    // Deactivate pills
                    document.querySelectorAll('.category-pill').forEach(function(pill) {
                        pill.classList.remove('active', 'bg-pickle-500', 'text-white');
                    });

                } else {
                    // Clear → restore home
                    if (isSearchActive) {
                        console.log('[SearchFix] Restoring home');
                        sectionsToToggle.forEach(function(el, i) { el.style.display = originalDisplays[i]; });
                        if (categorySections) categorySections.style.minHeight = '';
                        isSearchActive = false;
                    }
                    try {
                        if (Store.setActiveCategory) Store.setActiveCategory('all');
                        var allPill = document.querySelector('[data-category="all"]');
                        if (allPill) {
                            document.querySelectorAll('.category-pill').forEach(function(p) {
                                p.classList.remove('active', 'bg-pickle-500', 'text-white');
                                p.classList.add('bg-gray-100', 'text-gray-700');
                            });
                            allPill.classList.add('active', 'bg-pickle-500', 'text-white');
                            allPill.classList.remove('bg-gray-100', 'text-gray-700');
                        }
                        if (typeof UI !== 'undefined' && UI.renderCategorySections) {
                            UI.renderCategorySections(Store.getCategories(), Store.getActiveProducts());
                        }
                    } catch(e) {}
                }
            }, 250);
        });

        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.blur();
            }
        });

        console.log('[SearchFix] v3 ✅ Ready!');
    }

    if (document.readyState === 'complete') {
        setTimeout(initSearchFix, 500);
    } else {
        window.addEventListener('load', function() { setTimeout(initSearchFix, 500); });
    }
})();
