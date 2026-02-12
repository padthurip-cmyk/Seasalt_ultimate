/**
 * SeaSalt Pickles - Cart & Checkout Module v10
 * =============================================
 * Fixed: Orders save in correct format for orders page
 * Fixed: Wallet deduction persists (pauses Supabase sync)
 * Fixed: Orders accessible via both Orders and OrdersFix globals
 */

const Cart = (function() {
    'use strict';

    let checkoutInProgress = false;
    let deliveryChargesCache = [];

    const RAZORPAY_KEY = 'rzp_test_SC97Hjqvf4LjoW';
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    const ORDERS_KEY = 'seasalt_orders';
    const GOOGLE_PLACES_KEY = 'AIzaSyA33gWiI28GPZw2v-sOYYcyEyMTz9Lm5s8';
    let googlePlacesLoaded = false;

    // ── Load Google Maps Places Library ──
    function loadGooglePlaces() {
        if (googlePlacesLoaded || document.querySelector('script[src*="maps.googleapis.com"]')) {
            googlePlacesLoaded = true;
            return;
        }
        var script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=' + GOOGLE_PLACES_KEY + '&libraries=places&callback=__gmapsReady';
        script.async = true;
        script.defer = true;
        window.__gmapsReady = function() { googlePlacesLoaded = true; console.log('[Cart] Google Places API loaded'); };
        document.head.appendChild(script);
    }

    // Load on module init
    try { loadGooglePlaces(); } catch(e) {}

    // ── Google Places Autocomplete for Address ──
    function initPlacesAutocomplete(modal) {
        var addressField = modal.querySelector('#checkout-address');
        var suggestionsDiv = modal.querySelector('#places-suggestions');
        var pincodeField = modal.querySelector('#checkout-pincode');
        var cityField = modal.querySelector('#checkout-city');
        var stateField = modal.querySelector('#checkout-state');
        var areaWrap = modal.querySelector('#area-dropdown-wrap');
        var areaSelect = modal.querySelector('#checkout-area');

        if (!addressField || !suggestionsDiv) return;

        var autocompleteService = null;
        var placesService = null;
        var sessionToken = null;
        var debounceTimer = null;

        function ensureServices() {
            if (!window.google || !window.google.maps || !window.google.maps.places) return false;
            if (!autocompleteService) autocompleteService = new google.maps.places.AutocompleteService();
            if (!placesService) {
                var dummyDiv = document.createElement('div');
                placesService = new google.maps.places.PlacesService(dummyDiv);
            }
            if (!sessionToken) sessionToken = new google.maps.places.AutocompleteSessionToken();
            return true;
        }

        function hideSuggestions() {
            suggestionsDiv.style.display = 'none';
            suggestionsDiv.innerHTML = '';
        }

        function showSuggestions(predictions) {
            suggestionsDiv.innerHTML = '';
            if (!predictions || predictions.length === 0) { hideSuggestions(); return; }

            predictions.forEach(function(prediction) {
                var item = document.createElement('div');
                item.className = 'px-4 py-3 cursor-pointer hover:bg-pickle-50 border-b border-gray-100 last:border-0 text-sm text-gray-700 flex items-start gap-2';
                item.innerHTML = '<span class="text-pickle-500 mt-0.5 flex-shrink-0">\uD83D\uDCCD</span>' +
                    '<div><div class="font-medium text-gray-800">' + (prediction.structured_formatting ? prediction.structured_formatting.main_text : prediction.description.split(',')[0]) + '</div>' +
                    '<div class="text-xs text-gray-500 mt-0.5">' + prediction.description + '</div></div>';

                item.addEventListener('click', function() {
                    selectPlace(prediction);
                });
                suggestionsDiv.appendChild(item);
            });

            // Add Google attribution
            var attr = document.createElement('div');
            attr.className = 'px-4 py-2 text-right';
            attr.innerHTML = '<img src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png" alt="Powered by Google" style="height:14px;display:inline;">';
            suggestionsDiv.appendChild(attr);

            suggestionsDiv.style.display = 'block';
        }

        function selectPlace(prediction) {
            hideSuggestions();

            if (!ensureServices()) {
                addressField.value = prediction.description;
                return;
            }

            placesService.getDetails({
                placeId: prediction.place_id,
                fields: ['address_components', 'formatted_address'],
                sessionToken: sessionToken
            }, function(place, status) {
                // Reset session token after Place Details call (end of session)
                sessionToken = new google.maps.places.AutocompleteSessionToken();

                if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
                    addressField.value = prediction.description;
                    return;
                }

                var components = place.address_components || [];
                var streetNumber = '', route = '', sublocality = '', locality = '', adminArea = '', postalCode = '', premise = '';

                components.forEach(function(c) {
                    var types = c.types;
                    if (types.indexOf('street_number') !== -1) streetNumber = c.long_name;
                    if (types.indexOf('route') !== -1) route = c.long_name;
                    if (types.indexOf('premise') !== -1) premise = c.long_name;
                    if (types.indexOf('sublocality_level_1') !== -1 || types.indexOf('sublocality') !== -1) sublocality = c.long_name;
                    if (types.indexOf('locality') !== -1) locality = c.long_name;
                    if (types.indexOf('administrative_area_level_1') !== -1) adminArea = c.long_name;
                    if (types.indexOf('postal_code') !== -1) postalCode = c.long_name;
                });

                // Build clean address for the address field
                var addressParts = [];
                if (premise) addressParts.push(premise);
                if (streetNumber) addressParts.push(streetNumber);
                if (route) addressParts.push(route);
                if (sublocality) addressParts.push(sublocality);
                addressField.value = addressParts.join(', ') || prediction.description.split(',').slice(0, 2).join(',');

                // Auto-fill city, state, pincode
                if (locality && cityField) cityField.value = locality;
                if (adminArea && stateField) stateField.value = adminArea;
                if (postalCode && pincodeField && !pincodeField.value) pincodeField.value = postalCode;

                // If pincode was filled, trigger its lookup for area dropdown
                if (postalCode && pincodeField) {
                    pincodeField.value = postalCode;
                    pincodeField.dispatchEvent(new Event('input', { bubbles: true }));
                }

                console.log('[Cart] Address auto-filled from Google Places:', {
                    address: addressField.value, city: locality, state: adminArea, pincode: postalCode
                });
            });
        }

        // Listen for typing in address field
        addressField.addEventListener('input', function() {
            var query = addressField.value.trim();
            clearTimeout(debounceTimer);

            if (query.length < 3) { hideSuggestions(); return; }

            debounceTimer = setTimeout(function() {
                if (!ensureServices()) {
                    console.warn('[Cart] Google Places not loaded yet');
                    return;
                }

                autocompleteService.getPlacePredictions({
                    input: query,
                    sessionToken: sessionToken,
                    componentRestrictions: { country: 'in' },
                    types: ['geocode', 'establishment']
                }, function(predictions, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        showSuggestions(predictions);
                    } else {
                        hideSuggestions();
                    }
                });
            }, 300);
        });

        // Hide suggestions on blur (with small delay for click)
        addressField.addEventListener('blur', function() {
            setTimeout(hideSuggestions, 250);
        });

        // Re-show on focus if there's text
        addressField.addEventListener('focus', function() {
            if (addressField.value.trim().length >= 3 && suggestionsDiv.children.length > 0) {
                suggestionsDiv.style.display = 'block';
            }
        });

        console.log('[Cart] Google Places Autocomplete initialized');
    }

    const DEFAULT_FREE_ABOVE = 500;
    const DEFAULT_FLAT_FEE = 50;

    function init() {
        console.log('[Cart] v10 Initializing...');
        loadDeliveryCharges();
        bindEvents();
        subscribeToChanges();
        console.log('[Cart] v10 Initialized');
    }

    async function loadDeliveryCharges() {
        try {
            const response = await fetch(SUPABASE_URL + '/rest/v1/delivery_charges?select=*', {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            });
            if (response.ok) {
                deliveryChargesCache = await response.json();
                console.log('[Cart] Delivery charges loaded:', deliveryChargesCache.length);
            }
        } catch (err) {
            console.warn('[Cart] Using default delivery charges');
        }
    }

    function getSpinWallet() {
        try {
            const raw = localStorage.getItem(SPIN_WALLET_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || !data.amount || data.amount <= 0) return null;
            const expiresAt = new Date(data.expiresAt);
            if (new Date() >= expiresAt) {
                localStorage.removeItem(SPIN_WALLET_KEY);
                return null;
            }
            return { amount: data.amount, expiresAt: expiresAt };
        } catch (e) {
            return null;
        }
    }

    function getDeliveryCharge(subtotal, country, region) {
        let freeAbove = DEFAULT_FREE_ABOVE;
        let flatFee = DEFAULT_FLAT_FEE;

        let userData = null;
        try {
            const raw = localStorage.getItem('seasalt_user');
            if (raw) userData = JSON.parse(raw);
        } catch (e) {}

        const userCountry = country || (userData && userData.country) || 'India';

        if (deliveryChargesCache && deliveryChargesCache.length > 0) {
            // Try region-specific match first
            let match = null;
            if (region) {
                match = deliveryChargesCache.find(function(dc) {
                    return dc.country === userCountry && dc.region === region;
                });
            }
            // Fall back to "All" region
            if (!match) {
                match = deliveryChargesCache.find(function(dc) {
                    return dc.country === userCountry && (dc.region === 'All' || !dc.region);
                });
            }
            // Fall back to any country match
            if (!match) {
                match = deliveryChargesCache.find(function(dc) {
                    return dc.country === userCountry;
                });
            }
            if (match) {
                freeAbove = match.min_order_free || DEFAULT_FREE_ABOVE;
                flatFee = match.flat_charge || DEFAULT_FLAT_FEE;
            }
        }

        return subtotal >= freeAbove ? 0 : flatFee;
    }

    function bindEvents() {
        document.addEventListener('change', function(e) {
            if (e.target && e.target.id === 'use-wallet') {
                if (typeof UI !== 'undefined') UI.updateCartTotal();
            }
        });
    }

    function subscribeToChanges() {
        if (typeof Store !== 'undefined' && Store.subscribe) {
            Store.subscribe('cart', function() {
                if (typeof UI !== 'undefined') {
                    UI.renderCartItems();
                    UI.updateCartUI();
                }
            });
        }
    }

    // ============ CHECKOUT FLOW ============

    function handleCheckout() {
        var cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [] };
        if (!cart.items || !cart.items.length) {
            if (typeof UI !== 'undefined') UI.showToast('Your cart is empty!', 'error');
            return;
        }
        
        var sidebar = document.getElementById('cart-sidebar');
        if (sidebar) sidebar.classList.add('hidden');
        document.body.style.overflow = '';
        showCheckoutForm();
    }

    function showCheckoutForm() {
        var cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [], subtotal: 0 };
        var user = typeof Store !== 'undefined' ? Store.getState().user || {} : {};
        
        // Also check localStorage for user data (from spinwheel/previous checkout)
        if (!user.name || !user.phone) {
            try {
                var savedUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                if (savedUser.name && !user.name) user.name = savedUser.name;
                if (savedUser.phone && !user.phone) user.phone = savedUser.phone;
                if (savedUser.address) user.address = savedUser.address;
                if (savedUser.pincode) user.pincode = savedUser.pincode;
            } catch(e) {}
            if (!user.phone) user.phone = localStorage.getItem('seasalt_phone') || '';
        }
        // Load address from localStorage if not in user object
        if (!user.address) {
            try {
                var savedUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                if (savedUser.address) user.address = savedUser.address;
                if (savedUser.pincode) user.pincode = savedUser.pincode;
            } catch(e) {}
            if (!user.address) user.address = localStorage.getItem('seasalt_address') || '';
            if (!user.pincode) user.pincode = localStorage.getItem('seasalt_pincode') || '';
        }
        // Clean phone display (remove +91 for input field)
        var displayPhone = (user.phone || '').replace(/^\+91/, '');

        var deliveryCharge = getDeliveryCharge(cart.subtotal);
        var spinWallet = getSpinWallet();
        var availableWallet = spinWallet ? spinWallet.amount : 0;
        var walletCheckbox = document.getElementById('use-wallet');
        var walletChecked = walletCheckbox ? walletCheckbox.checked : false;
        var walletDiscount = walletChecked && availableWallet > 0 ? Math.min(availableWallet, cart.subtotal + deliveryCharge) : 0;
        var finalTotal = Math.max(0, cart.subtotal + deliveryCharge - walletDiscount);

        var itemCount = 0;
        for (var i = 0; i < cart.items.length; i++) itemCount += (cart.items[i].quantity || 1);

        var itemsHtml = cart.items.map(function(item) {
            return '<div class="flex justify-between text-sm py-1">' +
                '<span class="text-gray-600">' + item.name + ' (' + (item.size || item.weight || '250g') + ') \u00d7 ' + item.quantity + '</span>' +
                '<span class="font-medium">\u20b9' + (item.price * item.quantity) + '</span></div>';
        }).join('');

        var walletHtml = availableWallet > 0 ? '<div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 mt-3">' +
            '<div class="flex items-center justify-between"><div class="flex items-center gap-2"><span class="text-xl">\uD83D\uDCB0</span>' +
            '<span class="font-semibold text-amber-800 text-sm">Wallet: \u20b9' + availableWallet + '</span></div>' +
            '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="checkout-use-wallet" ' + (walletChecked ? 'checked' : '') + 
            ' class="w-5 h-5 accent-amber-600"><span class="text-sm font-medium text-amber-700">Apply</span></label></div></div>' : '';

        var modal = document.createElement('div');
        modal.id = 'checkout-modal';
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center';
        modal.innerHTML = '<div class="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">' +
            // Sticky header
            '<div class="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10 rounded-t-3xl">' +
            '<h3 class="text-xl font-bold text-gray-800">Checkout</h3>' +
            '<button id="close-checkout" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">\u2715</button></div>' +
            
            '<div class="p-4 space-y-5">' +
            
            // 1. DELIVERY ADDRESS
            '<div>' +
            '<h4 class="font-semibold text-gray-800 mb-3">\uD83D\uDCCD Delivery Details</h4>' +
            '<div class="space-y-3">' +
            '<input type="text" id="checkout-name" placeholder="Full Name *" value="' + (user.name || '') + '" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800">' +
            '<input type="tel" id="checkout-phone" placeholder="Phone Number *" value="' + displayPhone + '" maxlength="10" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800">' +
            
            // Pincode with auto-lookup indicator
            '<div class="relative">' +
            '<input type="text" id="checkout-pincode" placeholder="Pincode *" value="' + (user.pincode || '') + '" maxlength="6" inputmode="numeric" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800 pr-10">' +
            '<span id="pincode-status" class="absolute right-3 top-1/2 -translate-y-1/2 text-sm"></span>' +
            '</div>' +
            
            // City & State (auto-filled from pincode)
            '<div class="grid grid-cols-2 gap-3">' +
            '<input type="text" id="checkout-city" placeholder="City *" value="' + (user.city || '') + '" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800">' +
            '<input type="text" id="checkout-state" placeholder="State *" value="' + (user.state || '') + '" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800">' +
            '</div>' +
            
            // Area/Post Office dropdown (populated from pincode)
            '<div id="area-dropdown-wrap" style="display:none;">' +
            '<select id="checkout-area" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800 bg-white">' +
            '<option value="">Select Area / Post Office</option>' +
            '</select></div>' +
            
            // Full address with Google Places Autocomplete
            '<div class="relative">' +
            '<textarea id="checkout-address" placeholder="Start typing your address... (House No, Street, Landmark) *" rows="2" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 resize-none text-gray-800" autocomplete="off">' + (user.address || '') + '</textarea>' +
            '<div id="places-suggestions" class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto" style="display:none;"></div>' +
            '</div>' +
            
            '</div></div>' +
            
            // 2. WALLET (if available)
            walletHtml +
            
            // 3. ORDER SUMMARY (collapsible - starts collapsed on mobile)
            '<div>' +
            '<button id="toggle-summary" class="w-full flex items-center justify-between py-2" type="button">' +
            '<h4 class="font-semibold text-gray-800">\uD83D\uDCE6 Order Summary (' + itemCount + ' items)</h4>' +
            '<svg id="summary-arrow" class="w-5 h-5 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>' +
            '</button>' +
            '<div id="order-summary-details" style="display:none;">' +
            '<div class="bg-gray-50 rounded-xl p-3 mt-2">' + itemsHtml + '</div></div>' +
            
            // Price breakdown (always visible)
            '<div class="bg-gray-50 rounded-xl p-3 mt-3 space-y-2">' +
            '<div class="flex justify-between text-sm"><span class="text-gray-600">Subtotal (' + itemCount + ' items)</span><span class="font-medium">\u20b9' + cart.subtotal + '</span></div>' +
            '<div class="flex justify-between text-sm"><span class="text-gray-600">Delivery</span><span class="font-medium ' + (deliveryCharge === 0 ? 'text-green-600' : '') + '">' + (deliveryCharge === 0 ? 'FREE' : '\u20b9' + deliveryCharge) + '</span></div>' +
            (walletDiscount > 0 ? '<div class="flex justify-between text-sm text-green-600"><span>Wallet Credit</span><span>-\u20b9' + walletDiscount + '</span></div>' : '') +
            '<div class="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-200"><span>Total</span><span class="text-pickle-600">\u20b9' + finalTotal + '</span></div>' +
            '</div></div>' +
            
            '</div>' +
            
            // Sticky PAY button at bottom
            '<div class="sticky bottom-0 bg-white p-4 border-t shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">' +
            '<button id="pay-now-btn" class="w-full py-4 bg-gradient-to-r from-pickle-500 to-pickle-600 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98]">' +
            '\uD83D\uDD12 Pay \u20b9' + finalTotal + '</button></div></div>';

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Close handlers
        modal.querySelector('#close-checkout').onclick = function() { modal.remove(); document.body.style.overflow = ''; };
        modal.onclick = function(e) { if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; } };
        
        // Toggle order summary
        var toggleBtn = modal.querySelector('#toggle-summary');
        var summaryDetails = modal.querySelector('#order-summary-details');
        var summaryArrow = modal.querySelector('#summary-arrow');
        if (toggleBtn && summaryDetails) {
            toggleBtn.addEventListener('click', function() {
                var isHidden = summaryDetails.style.display === 'none';
                summaryDetails.style.display = isHidden ? 'block' : 'none';
                if (summaryArrow) summaryArrow.style.transform = isHidden ? 'rotate(180deg)' : '';
            });
        }
        
        // Wallet checkbox
        var cwCheckbox = modal.querySelector('#checkout-use-wallet');
        if (cwCheckbox) {
            cwCheckbox.addEventListener('change', function(e) {
                var mainCb = document.getElementById('use-wallet');
                if (mainCb) mainCb.checked = e.target.checked;
                modal.remove();
                showCheckoutForm();
            });
        }

        // Pincode input filter
        var pincodeInput = modal.querySelector('#checkout-pincode');
        if (pincodeInput) pincodeInput.oninput = function(e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); };
        
        // Phone input filter
        var phoneInput = modal.querySelector('#checkout-phone');
        if (phoneInput) phoneInput.oninput = function(e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); };

        // ── GOOGLE PLACES AUTOCOMPLETE ──
        initPlacesAutocomplete(modal);

        modal._orderData = { subtotal: cart.subtotal, deliveryCharge: deliveryCharge, walletDiscount: walletDiscount, total: finalTotal, useWallet: walletChecked && walletDiscount > 0 };
        modal.querySelector('#pay-now-btn').onclick = function() { processPayment(modal); };
        
        // ── AUTO-POPULATE from Supabase (last order's address) ──
        // Only fetch if address or pincode is empty
        var addrField = modal.querySelector('#checkout-address');
        var pinField = modal.querySelector('#checkout-pincode');
        var nameField = modal.querySelector('#checkout-name');
        if (addrField && !addrField.value.trim()) {
            var userPhone = displayPhone || (user.phone || '').replace(/^\+91/, '');
            if (userPhone && userPhone.length >= 10) {
                try {
                    // Fetch last order for this phone from Supabase
                    var phoneVariants = [userPhone, '+91' + userPhone, '91' + userPhone];
                    var supaUrl = 'https://yosjbsncvghpscsrvxds.supabase.co';
                    var supaKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
                    
                    // Try each phone variant
                    (async function() {
                        for (var v = 0; v < phoneVariants.length; v++) {
                            try {
                                var res = await fetch(supaUrl + '/rest/v1/orders?customer_phone=eq.' + encodeURIComponent(phoneVariants[v]) + '&order=created_at.desc&limit=1', {
                                    headers: { 'apikey': supaKey, 'Authorization': 'Bearer ' + supaKey }
                                });
                                var orders = await res.json();
                                if (orders && orders.length > 0) {
                                    var lastOrder = orders[0];
                                    var addr = lastOrder.customer_address || lastOrder.shipping_address || '';
                                    var pin = lastOrder.customer_pincode || lastOrder.pincode || '';
                                    var cname = lastOrder.customer_name || '';
                                    
                                    // Also try parsing from a JSON address field
                                    if (!addr && lastOrder.address) {
                                        try {
                                            var addrObj = typeof lastOrder.address === 'string' ? JSON.parse(lastOrder.address) : lastOrder.address;
                                            addr = addrObj.address || addrObj.street || addrObj.full_address || '';
                                            pin = pin || addrObj.pincode || addrObj.zip || '';
                                        } catch(pe) { addr = lastOrder.address; }
                                    }
                                    
                                    // Fill empty fields
                                    if (addr && addrField && !addrField.value.trim()) {
                                        addrField.value = addr;
                                        console.log('[Cart] Auto-filled address from last order');
                                    }
                                    if (pin && pinField && !pinField.value.trim()) {
                                        pinField.value = pin;
                                        console.log('[Cart] Auto-filled pincode from last order:', pin);
                                    }
                                    if (cname && nameField && !nameField.value.trim()) {
                                        nameField.value = cname;
                                    }
                                    
                                    // Save to localStorage for future use
                                    if (addr) localStorage.setItem('seasalt_address', addr);
                                    if (pin) localStorage.setItem('seasalt_pincode', pin);
                                    try {
                                        var su = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                                        if (addr) su.address = addr;
                                        if (pin) su.pincode = pin;
                                        localStorage.setItem('seasalt_user', JSON.stringify(su));
                                    } catch(se) {}
                                    
                                    break; // Found an order, stop searching
                                }
                            } catch(fe) { console.warn('[Cart] Supabase address fetch error:', fe); }
                        }
                    })();
                } catch(e) { console.warn('[Cart] Address auto-fill error:', e); }
            }
        }
        
        // Auto-focus first empty field
        setTimeout(function() {
            var nameInput = modal.querySelector('#checkout-name');
            var phoneIn = modal.querySelector('#checkout-phone');
            var addrIn = modal.querySelector('#checkout-address');
            if (nameInput && !nameInput.value) nameInput.focus();
            else if (phoneIn && !phoneIn.value) phoneIn.focus();
            else if (addrIn && !addrIn.value) addrIn.focus();
        }, 300);
    }

    function processPayment(modal) {
        if (checkoutInProgress) return;

        var payBtn = modal.querySelector('#pay-now-btn');
        var name = modal.querySelector('#checkout-name').value.trim();
        var phone = modal.querySelector('#checkout-phone').value.trim();
        var address = modal.querySelector('#checkout-address').value.trim();
        var pincode = modal.querySelector('#checkout-pincode').value.trim();
        var city = modal.querySelector('#checkout-city') ? modal.querySelector('#checkout-city').value.trim() : '';
        var state = modal.querySelector('#checkout-state') ? modal.querySelector('#checkout-state').value.trim() : '';

        if (!name || !phone || !address || !pincode) { if (typeof UI !== 'undefined') UI.showToast('Please fill all fields', 'error'); return; }
        if (phone.length < 10) { if (typeof UI !== 'undefined') UI.showToast('Enter valid phone', 'error'); return; }
        if (pincode.length !== 6) { if (typeof UI !== 'undefined') UI.showToast('Enter 6-digit pincode', 'error'); return; }

        checkoutInProgress = true;
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="animate-pulse">Processing...</span>';

        // Save user info from checkout form to localStorage (for profile page + auto-fill)
        try {
            var existingUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            existingUser.name = name;
            existingUser.address = address;
            existingUser.pincode = pincode;
            existingUser.city = city;
            existingUser.state = state;
            if (phone) {
                var formattedPhone = phone.startsWith('+') ? phone : '+91' + phone.replace(/^0+/, '');
                existingUser.phone = formattedPhone;
            }
            localStorage.setItem('seasalt_user', JSON.stringify(existingUser));
            // Also save address separately for quick access
            localStorage.setItem('seasalt_address', address);
            localStorage.setItem('seasalt_pincode', pincode);
            if (phone && !localStorage.getItem('seasalt_phone')) {
                localStorage.setItem('seasalt_phone', phone.startsWith('+') ? phone : '+91' + phone.replace(/^0+/, ''));
            }
            console.log('[Cart] User info saved from checkout:', name, phone, address, pincode);
        } catch(e) {}

        var cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [] };
        var orderCalc = modal._orderData;
        var orderId = 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

        var orderData = { 
            orderId: orderId, 
            status: 'pending', 
            createdAt: new Date().toISOString(), 
            customer: { name: name, phone: phone, address: address, pincode: pincode, city: city, state: state }, 
            items: cart.items,
            subtotal: orderCalc.subtotal,
            deliveryCharge: orderCalc.deliveryCharge,
            walletDiscount: orderCalc.walletDiscount,
            total: orderCalc.total,
            useWallet: orderCalc.useWallet
        };

        if (orderCalc.total <= 0) { completeOrder(orderData, modal, 'wallet_full', 'Wallet'); return; }

        if (typeof Razorpay === 'undefined') { 
            if (typeof UI !== 'undefined') UI.showToast('Payment loading...', 'error'); 
            payBtn.disabled = false; payBtn.textContent = 'Pay \u20b9' + orderCalc.total; checkoutInProgress = false; return; 
        }

        try {
            var rzp = new Razorpay({
                key: RAZORPAY_KEY, amount: orderCalc.total * 100, currency: 'INR',
                name: 'SeaSalt Pickles', description: 'Order ' + orderId,
                prefill: { name: name, contact: phone }, theme: { color: '#D4451A' },
                handler: function(res) { completeOrder(orderData, modal, res.razorpay_payment_id, 'Razorpay'); },
                modal: { ondismiss: function() { payBtn.disabled = false; payBtn.textContent = 'Pay \u20b9' + orderCalc.total; checkoutInProgress = false; } }
            });
            rzp.on('payment.failed', function() { 
                if (typeof UI !== 'undefined') UI.showToast('Payment failed', 'error'); 
                payBtn.disabled = false; payBtn.textContent = 'Pay \u20b9' + orderCalc.total; checkoutInProgress = false; 
            });
            rzp.open();
        } catch (e) { 
            if (typeof UI !== 'undefined') UI.showToast('Payment error', 'error'); 
            payBtn.disabled = false; payBtn.textContent = 'Pay \u20b9' + orderCalc.total; checkoutInProgress = false; 
        }
    }

    // ============ ORDER COMPLETION ============

    async function completeOrder(orderData, modal, paymentId, paymentMethod) {
        console.log('[Cart] Completing order:', orderData.orderId, 'payment:', paymentMethod);
        
        orderData.paymentId = paymentId;
        orderData.paymentMethod = paymentMethod;
        orderData.status = 'confirmed';

        // === SAVE ORDER to localStorage in BOTH formats ===
        // Format that orders-fix.js and orders.js can read
        var orderForStorage = {
            id: orderData.orderId,
            orderId: orderData.orderId,
            items: orderData.items || [],
            customer: orderData.customer,
            // orders-fix.js reads these keys:
            address: {
                name: orderData.customer.name,
                phone: orderData.customer.phone,
                line1: orderData.customer.address,
                city: '',
                pincode: orderData.customer.pincode
            },
            subtotal: orderData.subtotal || 0,
            delivery: orderData.deliveryCharge || 0,
            deliveryCharge: orderData.deliveryCharge || 0,
            walletUsed: orderData.walletDiscount || 0,
            walletDiscount: orderData.walletDiscount || 0,
            total: orderData.total || 0,
            status: 'confirmed',
            paymentId: paymentId,
            paymentMethod: paymentMethod,
            createdAt: orderData.createdAt,
            updatedAt: new Date().toISOString(),
            statusHistory: [
                { status: 'pending', timestamp: orderData.createdAt, message: 'Order placed' },
                { status: 'confirmed', timestamp: new Date().toISOString(), message: 'Payment confirmed via ' + paymentMethod }
            ]
        };

        var orders = [];
        try { orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch (e) { orders = []; }
        orders.unshift(orderForStorage);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        console.log('[Cart] Order saved to localStorage:', orderData.orderId, 'Total orders:', orders.length);

        // === SAVE ORDER to Supabase ===
        await saveOrderToSupabase(orderData);

        // === DEDUCT WALLET ===
        if (orderData.walletDiscount > 0) {
            console.log('[Cart] Deducting wallet:', orderData.walletDiscount);
            
            // CRITICAL: Pause wallet sync so it doesn't overwrite our deduction
            window._walletSyncPaused = true;
            window._walletLastDeductedAt = Date.now();
            
            var spinWallet = getSpinWallet();
            if (spinWallet) {
                var remaining = spinWallet.amount - orderData.walletDiscount;
                if (remaining <= 0) {
                    // Fully used - remove wallet
                    localStorage.removeItem(SPIN_WALLET_KEY);
                    console.log('[Cart] Wallet fully used, removed from localStorage');
                } else {
                    // Partially used
                    localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify({ 
                        amount: remaining, 
                        expiresAt: spinWallet.expiresAt.toISOString(),
                        addedAt: new Date().toISOString()
                    }));
                    console.log('[Cart] Wallet reduced to:', remaining);
                }
                
                // Get phone in correct format (must match Supabase users.phone)
                // Priority: seasalt_phone (set by spinwheel with +91), then seasalt_user, then checkout form
                var userPhone = localStorage.getItem('seasalt_phone') || localStorage.getItem('seasalt_user_phone') || localStorage.getItem('seasalt_spin_phone');
                if (!userPhone) {
                    try { userPhone = JSON.parse(localStorage.getItem('seasalt_user') || '{}').phone; } catch(e) {}
                }
                if (!userPhone) {
                    userPhone = orderData.customer.phone;
                }
                // Ensure +91 prefix for India
                if (userPhone && !userPhone.startsWith('+')) {
                    userPhone = '+91' + userPhone.replace(/^0+/, '');
                }
                
                console.log('[Cart] Wallet deduct - using phone:', userPhone, 'new balance:', Math.max(0, remaining));
                
                if (userPhone) {
                    await updateWalletInSupabase(userPhone, Math.max(0, remaining));
                    console.log('[Cart] Wallet PATCHED in Supabase to:', Math.max(0, remaining));
                    
                    // Verify the update actually worked
                    try {
                        var verifyRes = await fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(userPhone) + '&select=wallet_balance', {
                            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
                        });
                        var verifyData = await verifyRes.json();
                        console.log('[Cart] Wallet verify after PATCH:', JSON.stringify(verifyData));
                        if (verifyData && verifyData[0] && verifyData[0].wallet_balance > 0 && remaining <= 0) {
                            // PATCH didn't work! Try again with different phone formats
                            console.warn('[Cart] Wallet PATCH may have failed, retrying...');
                            var altPhone = orderData.customer.phone;
                            if (altPhone && !altPhone.startsWith('+')) altPhone = '+91' + altPhone.replace(/^0+/, '');
                            if (altPhone !== userPhone) {
                                await updateWalletInSupabase(altPhone, Math.max(0, remaining));
                                console.log('[Cart] Wallet retry with:', altPhone);
                            }
                        }
                    } catch(ve) { console.warn('[Cart] Wallet verify failed:', ve); }
                }
                
                // Log wallet transaction
                if (userPhone) {
                    try {
                        await fetch(SUPABASE_URL + '/rest/v1/wallet_transactions', {
                            method: 'POST',
                            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                            body: JSON.stringify({ 
                                user_phone: userPhone, 
                                amount: -orderData.walletDiscount, 
                                type: 'order_deduction', 
                                description: 'Used for order ' + orderData.orderId, 
                                balance_after: Math.max(0, remaining) 
                            })
                        });
                    } catch (e) { console.warn('[Cart] Wallet transaction log failed:', e); }
                }
            }
            
            // Keep sync paused for 15 seconds (full sync cycle) to let Supabase propagate
            setTimeout(function() { 
                window._walletSyncPaused = false; 
                console.log('[Cart] Wallet sync unpaused');
            }, 16000);
        }

        // === CLEAR CART & UPDATE UI ===
        if (typeof Store !== 'undefined' && Store.clearCart) Store.clearCart();
        modal.remove();
        document.body.style.overflow = '';
        
        if (typeof UI !== 'undefined') {
            UI.showToast('\uD83C\uDF89 Order ' + orderData.orderId + ' confirmed!', 'success');
            UI.updateCartUI();
            // Force wallet display update
            if (UI.updateWalletDisplay) {
                var w = UI.getSpinWallet ? UI.getSpinWallet() : null;
                UI.updateWalletDisplay(w);
            }
            if (UI.startWalletTimer) UI.startWalletTimer();
        }
        
        showOrderSuccessModal(orderForStorage);
        checkoutInProgress = false;
    }

    async function saveOrderToSupabase(orderData) {
        try {
            // Format phone with +91 prefix
            var phone = orderData.customer.phone || '';
            if (phone && !phone.startsWith('+')) phone = '+91' + phone.replace(/^0+/, '');
            
            var payload = {
                id: orderData.orderId, 
                customer_name: orderData.customer.name, 
                customer_phone: phone,
                customer_address: orderData.customer.address, 
                customer_pincode: orderData.customer.pincode,
                items: JSON.stringify(orderData.items), 
                subtotal: orderData.subtotal, 
                delivery_charge: orderData.deliveryCharge,
                wallet_used: orderData.walletDiscount || 0, 
                total: orderData.total, 
                payment_method: orderData.paymentMethod,
                payment_id: orderData.paymentId, 
                status: 'confirmed', 
                created_at: orderData.createdAt
            };
            
            console.log('[Cart] Saving order to Supabase:', orderData.orderId, payload);
            
            var res = await fetch(SUPABASE_URL + '/rest/v1/orders', {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                var saved = await res.json();
                console.log('[Cart] Order saved to Supabase:', orderData.orderId, saved);
            } else {
                var errText = await res.text();
                console.error('[Cart] Supabase order save FAILED:', res.status, errText);
                
                // If 404 or column error, the orders table may not exist or have different columns
                // Try a minimal payload with just the essential columns
                if (res.status === 400 || res.status === 404 || res.status === 409) {
                    console.log('[Cart] Retrying with minimal payload...');
                    var minPayload = {
                        order_id: orderData.orderId,
                        customer_name: orderData.customer.name,
                        customer_phone: phone,
                        address: orderData.customer.address + ', ' + orderData.customer.pincode,
                        items: JSON.stringify(orderData.items),
                        total: orderData.total,
                        status: 'confirmed',
                        payment_id: orderData.paymentId,
                        payment_method: orderData.paymentMethod
                    };
                    
                    var res2 = await fetch(SUPABASE_URL + '/rest/v1/orders', {
                        method: 'POST',
                        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                        body: JSON.stringify(minPayload)
                    });
                    
                    if (res2.ok) {
                        console.log('[Cart] Order saved with minimal payload');
                    } else {
                        var errText2 = await res2.text();
                        console.error('[Cart] Minimal save also failed:', res2.status, errText2);
                        console.error('[Cart] You may need to create the "orders" table in Supabase.');
                        console.error('[Cart] Required columns: id (text PK), customer_name, customer_phone, customer_address, customer_pincode, items (jsonb), subtotal (numeric), delivery_charge (numeric), wallet_used (numeric), total (numeric), payment_method, payment_id, status, created_at (timestamptz)');
                    }
                }
            }
        } catch (e) { console.error('[Cart] Supabase order save network error:', e); }
    }

    async function updateWalletInSupabase(phone, balance) {
        try {
            await fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
                method: 'PATCH',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                body: JSON.stringify({ wallet_balance: balance })
            });
        } catch (e) { console.warn('[Cart] Wallet update failed:', e); }
    }

    function showOrderSuccessModal(order) {
        var itemsPreview = '';
        if (order.items && order.items.length > 0) {
            itemsPreview = '<div class="flex justify-center gap-2 mb-4">' +
                order.items.slice(0, 4).map(function(item) {
                    return '<div class="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">' +
                        '<img src="' + (item.image || 'https://via.placeholder.com/56?text=\uD83E\uDD52') + '" class="w-full h-full object-cover" onerror="this.src=\'https://via.placeholder.com/56?text=\uD83E\uDD52\'">' +
                    '</div>';
                }).join('') + '</div>';
        }
        
        var m = document.createElement('div');
        m.className = 'fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4';
        m.innerHTML = '<div class="bg-white rounded-2xl p-8 max-w-sm w-full text-center">' +
            '<div class="text-6xl mb-4">\uD83C\uDF89</div>' +
            '<h3 class="text-2xl font-bold mb-2">Order Confirmed!</h3>' +
            '<p class="text-gray-600 mb-2">Order ID: <strong>' + order.id + '</strong></p>' +
            '<p class="text-sm text-gray-500 mb-4">Total: <strong>\u20b9' + order.total + '</strong></p>' +
            itemsPreview +
            (order.walletUsed > 0 ? '<p class="text-sm text-green-600 mb-4">\u2705 \u20b9' + order.walletUsed + ' wallet credit applied</p>' : '') +
            '<div class="space-y-3">' +
            '<button class="w-full py-4 bg-pickle-500 text-white font-bold rounded-xl" onclick="this.closest(\'.fixed\').remove()">Continue Shopping</button>' +
            '<button class="w-full py-3 text-pickle-600 font-semibold border border-pickle-200 rounded-xl hover:bg-pickle-50" onclick="this.closest(\'.fixed\').remove(); if(typeof OrdersFix!==\'undefined\') OrdersFix.showOrdersPage(); else if(typeof OrdersPage!==\'undefined\') OrdersPage.init();">View My Orders</button>' +
            '</div></div>';
        document.body.appendChild(m);
    }

    // ============ ORDERS PAGE (accessible from app.js) ============
    
    function showOrdersPage() {
        // Delegate to OrdersFix or OrdersPage if available
        if (typeof OrdersFix !== 'undefined' && OrdersFix.showOrdersPage) {
            OrdersFix.showOrdersPage();
        } else if (typeof OrdersPage !== 'undefined' && OrdersPage.init) {
            OrdersPage.init();
        } else {
            // Inline simple orders view
            showSimpleOrdersModal();
        }
    }
    
    function showSimpleOrdersModal() {
        var orders = [];
        try { orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch(e) {}
        
        var existing = document.getElementById('orders-modal');
        if (existing) existing.remove();
        
        var modal = document.createElement('div');
        modal.id = 'orders-modal';
        modal.className = 'fixed inset-0 z-[85] flex items-end justify-center';
        
        var ordersHtml = '';
        if (orders.length === 0) {
            ordersHtml = '<div class="text-center py-12"><div class="text-6xl mb-4">\uD83D\uDCE6</div>' +
                '<h4 class="font-semibold text-gray-800 mb-2">No orders yet</h4>' +
                '<p class="text-gray-500 text-sm">Your orders will appear here after checkout</p></div>';
        } else {
            ordersHtml = '<div class="space-y-3 max-h-[60vh] overflow-y-auto">';
            for (var i = 0; i < orders.length; i++) {
                var o = orders[i];
                var statusLabel = o.status === 'confirmed' ? '\u2705 Confirmed' : o.status === 'delivered' ? '\uD83C\uDF89 Delivered' : o.status === 'cancelled' ? '\u274C Cancelled' : '\uD83D\uDCDD ' + (o.status || 'Pending');
                var itemCount = 0;
                if (o.items) { for (var j = 0; j < o.items.length; j++) itemCount += (o.items[j].quantity || 1); }
                ordersHtml += '<div class="bg-gray-50 rounded-xl p-4">' +
                    '<div class="flex justify-between items-start mb-2">' +
                    '<div><span class="font-bold text-gray-800">#' + (o.id || o.orderId) + '</span>' +
                    '<p class="text-xs text-gray-500 mt-1">' + new Date(o.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) + '</p></div>' +
                    '<span class="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800">' + statusLabel + '</span></div>' +
                    '<div class="flex justify-between items-center"><span class="text-sm text-gray-600">' + itemCount + ' item(s)</span>' +
                    '<span class="font-bold text-lg">\u20b9' + (o.total || 0) + '</span></div></div>';
            }
            ordersHtml += '</div>';
        }
        
        modal.innerHTML = '<div class="absolute inset-0 bg-black/60 backdrop-blur-sm close-orders-modal"></div>' +
            '<div class="relative bg-white rounded-t-3xl w-full max-w-lg p-6">' +
            '<div class="flex justify-between items-center mb-6">' +
            '<div><h3 class="font-bold text-xl text-gray-800">My Orders</h3>' +
            '<p class="text-sm text-gray-500">' + orders.length + ' order(s)</p></div>' +
            '<button class="close-orders-modal w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">\u2715</button></div>' +
            ordersHtml + '</div>';
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        modal.querySelectorAll('.close-orders-modal').forEach(function(btn) {
            btn.addEventListener('click', function() { modal.remove(); document.body.style.overflow = ''; });
        });
    }

    // ============ PUBLIC API ============
    return { 
        init: init, 
        checkout: handleCheckout, 
        getDeliveryCharge: getDeliveryCharge, 
        getSpinWallet: getSpinWallet, 
        SPIN_WALLET_KEY: SPIN_WALLET_KEY,
        showOrdersPage: showOrdersPage
    };
})();

// Export globally
window.Cart = Cart;

// Also export as Orders so app.js can find it
window.Orders = { showOrdersPage: Cart.showOrdersPage };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Cart.init);
else Cart.init();
