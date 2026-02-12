/**
 * SeaSalt Pickles - Search Fix
 * ============================
 * Add this script AFTER all other scripts in index.html:
 * <script src="js/search-fix.js"></script>
 * 
 * This fixes the search bar by:
 * 1. Adding Store.searchProducts() if missing
 * 2. Re-binding the search input event listener
 */
(function() {
    'use strict';

    function initSearchFix() {
        console.log('[SearchFix] Initializing...');

        // 1. Patch Store.searchProducts if missing
        if (typeof Store !== 'undefined') {
            if (typeof Store.searchProducts !== 'function') {
                Store.searchProducts = function(query) {
                    var products = Store.getProducts ? Store.getProducts() : [];
                    if (!query || !query.trim()) return products;
                    var q = query.toLowerCase().trim();
                    return products.filter(function(p) {
                        var name = (p.name || '').toLowerCase();
                        var desc = (p.description || '').toLowerCase();
                        var cat = (p.category || '').toLowerCase();
                        var badge = (p.badge || '').toLowerCase();
                        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1 || cat.indexOf(q) !== -1 || badge.indexOf(q) !== -1;
                    });
                };
                console.log('[SearchFix] Store.searchProducts patched ✅');
            } else {
                console.log('[SearchFix] Store.searchProducts already exists ✅');
            }
        } else {
            console.error('[SearchFix] ❌ Store not found! Cannot patch search.');
            return;
        }

        // 2. Find the search input
        var searchInput = document.getElementById('search-input');
        
        // Try alternative selectors if not found
        if (!searchInput) {
            searchInput = document.querySelector('input[type="search"]');
        }
        if (!searchInput) {
            searchInput = document.querySelector('input[placeholder*="Search"]');
        }
        if (!searchInput) {
            searchInput = document.querySelector('input[placeholder*="search"]');
        }
        if (!searchInput) {
            // Last resort: find any input in the header area
            var header = document.querySelector('header') || document.querySelector('.header') || document.querySelector('[class*="header"]');
            if (header) {
                searchInput = header.querySelector('input');
            }
        }

        if (!searchInput) {
            console.error('[SearchFix] ❌ Search input element not found! Tried: #search-input, input[type=search], input[placeholder*=Search]');
            // Log all inputs on the page for debugging
            var allInputs = document.querySelectorAll('input');
            console.log('[SearchFix] All inputs on page:', allInputs.length);
            allInputs.forEach(function(inp, i) {
                console.log('[SearchFix]   Input ' + i + ':', inp.id || '(no id)', inp.type, inp.placeholder || '(no placeholder)', inp.className);
            });
            return;
        }

        console.log('[SearchFix] Found search input:', searchInput.id || searchInput.placeholder || searchInput.className);

        // 3. Remove existing listeners by cloning
        var newInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newInput, searchInput);
        searchInput = newInput;

        // 4. Attach fresh search listener
        var debounceTimer = null;

        searchInput.addEventListener('input', function(e) {
            var query = e.target.value.trim();
            clearTimeout(debounceTimer);

            debounceTimer = setTimeout(function() {
                if (query.length > 0) {
                    console.log('[SearchFix] Searching: "' + query + '"');

                    var products = Store.getProducts ? Store.getProducts() : [];
                    var q = query.toLowerCase();
                    var results = products.filter(function(p) {
                        var name = (p.name || '').toLowerCase();
                        var desc = (p.description || '').toLowerCase();
                        var cat = (p.category || '').toLowerCase();
                        var badge = (p.badge || '').toLowerCase();
                        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1 || cat.indexOf(q) !== -1 || badge.indexOf(q) !== -1;
                    });

                    console.log('[SearchFix] Found ' + results.length + ' results from ' + products.length + ' products');

                    // Render results
                    if (typeof UI !== 'undefined' && typeof UI.renderSearchResults === 'function') {
                        UI.renderSearchResults(results);
                        console.log('[SearchFix] Rendered via UI.renderSearchResults ✅');
                    } else {
                        // Fallback: render results manually
                        console.warn('[SearchFix] UI.renderSearchResults not available, using fallback');
                        var container = document.getElementById('category-sections') || document.querySelector('[class*="category-section"]') || document.querySelector('.product-grid') || document.querySelector('main');
                        if (container && results.length === 0) {
                            container.innerHTML = '<div style="text-align:center;padding:60px 20px;"><div style="font-size:3rem;margin-bottom:12px;">🔍</div><h3 style="font-size:1.2rem;font-weight:700;color:#333;margin-bottom:8px;">No products found</h3><p style="color:#999;">Try a different search term</p></div>';
                        } else if (container) {
                            // Re-render with filtered products would need card templates
                            console.log('[SearchFix] Results:', results.map(function(p) { return p.name; }));
                        }
                    }

                    // Deactivate category pills
                    document.querySelectorAll('.category-pill, [class*="category"]').forEach(function(pill) {
                        pill.classList.remove('active', 'bg-pickle-500', 'text-white');
                    });

                } else {
                    // Empty search — restore all products
                    console.log('[SearchFix] Search cleared, restoring all products');
                    try {
                        if (Store.setActiveCategory) Store.setActiveCategory('all');
                        var allPill = document.querySelector('.category-pill[data-category="all"]') || document.querySelector('[data-category="all"]');
                        if (allPill) {
                            document.querySelectorAll('.category-pill, [class*="category-pill"]').forEach(function(p) {
                                p.classList.remove('active', 'bg-pickle-500', 'text-white');
                                p.classList.add('bg-gray-100', 'text-gray-700');
                            });
                            allPill.classList.add('active', 'bg-pickle-500', 'text-white');
                            allPill.classList.remove('bg-gray-100', 'text-gray-700');
                        }
                        if (typeof UI !== 'undefined' && UI.renderCategorySections) {
                            UI.renderCategorySections(Store.getCategories(), Store.getActiveProducts());
                        }
                    } catch(e) {
                        console.error('[SearchFix] Restore error:', e);
                        // Last resort: reload
                        // location.reload();
                    }
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

        console.log('[SearchFix] ✅ Search fully initialized! Type to search.');
    }

    // Run after everything is loaded
    if (document.readyState === 'complete') {
        setTimeout(initSearchFix, 500);
    } else {
        window.addEventListener('load', function() {
            setTimeout(initSearchFix, 500);
        });
    }
})();
