/**
 * SeaSalt Pickles - Cart & Checkout Module v12
 * =============================================
 * v12 Changes:
 *  - Fixed wallet doubling bug (proper 3-key deduction: admin first, then spin)
 *  - Orders page now fetches from Supabase + localStorage (merged, deduped)
 *  - Clickable order cards → full order detail view with status timeline
 *  - Wallet timer smart formatting (days/hours/minutes)
 *  - WhatsApp notification on order completion
 */

const Cart = (function() {
    'use strict';

    let checkoutInProgress = false;
    let deliveryChargesCache = [];

    const RAZORPAY_KEY = 'rzp_live_SG5C0aU9GncpVi';
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    const ORDERS_KEY = 'seasalt_orders';
    const GOOGLE_PLACES_KEY = 'AIzaSyA33gWiI28GPZw2v-sOYYcyEyMTz9Lm5s8';
    const STORE_WHATSAPP = '919963971447';
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

    try { loadGooglePlaces(); } catch(e) {}

    // ── Google Places Autocomplete for Address ──
    function initPlacesAutocomplete(modal) {
        var addressField = modal.querySelector('#checkout-address');
        var suggestionsDiv = modal.querySelector('#places-suggestions');
        var pincodeField = modal.querySelector('#checkout-pincode');
        var cityField = modal.querySelector('#checkout-city');
        var stateField = modal.querySelector('#checkout-state');

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
                item.addEventListener('click', function() { selectPlace(prediction); });
                suggestionsDiv.appendChild(item);
            });
            var attr = document.createElement('div');
            attr.className = 'px-4 py-2 text-right';
            attr.innerHTML = '<img src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png" alt="Powered by Google" style="height:14px;display:inline;">';
            suggestionsDiv.appendChild(attr);
            suggestionsDiv.style.display = 'block';
        }

        function selectPlace(prediction) {
            hideSuggestions();
            if (!ensureServices()) { addressField.value = prediction.description; return; }
            placesService.getDetails({
                placeId: prediction.place_id,
                fields: ['address_components', 'formatted_address'],
                sessionToken: sessionToken
            }, function(place, status) {
                sessionToken = new google.maps.places.AutocompleteSessionToken();
                if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
                    addressField.value = prediction.description; return;
                }
                var components = place.address_components || [];
                var streetNumber = '', route = '', sublocality = '', locality = '', adminArea = '', postalCode = '', premise = '';
                components.forEach(function(c) {
                    var t = c.types;
                    if (t.indexOf('street_number') !== -1) streetNumber = c.long_name;
                    if (t.indexOf('route') !== -1) route = c.long_name;
                    if (t.indexOf('premise') !== -1) premise = c.long_name;
                    if (t.indexOf('sublocality_level_1') !== -1 || t.indexOf('sublocality') !== -1) sublocality = c.long_name;
                    if (t.indexOf('locality') !== -1) locality = c.long_name;
                    if (t.indexOf('administrative_area_level_1') !== -1) adminArea = c.long_name;
                    if (t.indexOf('postal_code') !== -1) postalCode = c.long_name;
                });
                var addressParts = [];
                if (premise) addressParts.push(premise);
                if (streetNumber) addressParts.push(streetNumber);
                if (route) addressParts.push(route);
                if (sublocality) addressParts.push(sublocality);
                addressField.value = addressParts.join(', ') || prediction.description.split(',').slice(0, 2).join(',');
                if (locality && cityField) cityField.value = locality;
                if (adminArea && stateField) stateField.value = adminArea;
                if (postalCode && pincodeField) {
                    pincodeField.value = postalCode;
                    pincodeField.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }

        addressField.addEventListener('input', function() {
            var query = addressField.value.trim();
            clearTimeout(debounceTimer);
            if (query.length < 3) { hideSuggestions(); return; }
            debounceTimer = setTimeout(function() {
                if (!ensureServices()) return;
                autocompleteService.getPlacePredictions({
                    input: query, sessionToken: sessionToken,
                    componentRestrictions: { country: 'in' }, types: ['geocode', 'establishment']
                }, function(predictions, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) showSuggestions(predictions);
                    else hideSuggestions();
                });
            }, 300);
        });
        addressField.addEventListener('blur', function() { setTimeout(hideSuggestions, 250); });
        addressField.addEventListener('focus', function() {
            if (addressField.value.trim().length >= 3 && suggestionsDiv.children.length > 0) suggestionsDiv.style.display = 'block';
        });
    }

    const DEFAULT_FREE_ABOVE = 500;
    const DEFAULT_FLAT_FEE = 50;

    function init() {
        console.log('[Cart] v12 Initializing...');
        loadDeliveryCharges();
        bindEvents();
        subscribeToChanges();
        // Patch wallet timer after a small delay (wait for UI to be defined)
        setTimeout(patchWalletTimer, 500);
        // Patch orders nav button
        setTimeout(patchOrdersNavButton, 300);
        console.log('[Cart] v12 Initialized');
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
        } catch (err) { console.warn('[Cart] Using default delivery charges'); }
    }

    function getSpinWallet() {
        try {
            const raw = localStorage.getItem(SPIN_WALLET_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || !data.amount || data.amount <= 0) return null;
            const expiresAt = new Date(data.expiresAt);
            if (new Date() >= expiresAt) { localStorage.removeItem(SPIN_WALLET_KEY); return null; }
            return { amount: data.amount, expiresAt: expiresAt };
        } catch (e) { return null; }
    }

    function getDeliveryCharge(subtotal, country, region) {
        let freeAbove = DEFAULT_FREE_ABOVE;
        let flatFee = DEFAULT_FLAT_FEE;
        let userData = null;
        try { const raw = localStorage.getItem('seasalt_user'); if (raw) userData = JSON.parse(raw); } catch (e) {}
        const userCountry = country || (userData && userData.country) || 'India';
        if (deliveryChargesCache && deliveryChargesCache.length > 0) {
            let match = null;
            if (region) match = deliveryChargesCache.find(function(dc) { return dc.country === userCountry && dc.region === region; });
            if (!match) match = deliveryChargesCache.find(function(dc) { return dc.country === userCountry && (dc.region === 'All' || !dc.region); });
            if (!match) match = deliveryChargesCache.find(function(dc) { return dc.country === userCountry; });
            if (match) { freeAbove = match.min_order_free || DEFAULT_FREE_ABOVE; flatFee = match.flat_charge || DEFAULT_FLAT_FEE; }
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
                if (typeof UI !== 'undefined') { UI.renderCartItems(); UI.updateCartUI(); }
            });
        }
    }

    // ╔══════════════════════════════════════════════╗
    // ║  WALLET TIMER FIX                             ║
    // ╚══════════════════════════════════════════════╝

    function patchWalletTimer() {
        if (typeof UI === 'undefined') return;

        UI.startWalletTimer = function() {
            if (window._walletTimerInterval) { clearInterval(window._walletTimerInterval); window._walletTimerInterval = null; }
            window._cartWalletTimerActive = true;

            var expiresAt = null;
            var sources = ['seasalt_spin_wallet', 'seasalt_admin_credit', 'seasalt_spin_reward'];
            for (var i = 0; i < sources.length; i++) {
                try {
                    var raw = localStorage.getItem(sources[i]);
                    if (raw) {
                        var data = JSON.parse(raw);
                        if (data && data.expiresAt) {
                            var exp = new Date(data.expiresAt);
                            if (exp > new Date() && (!expiresAt || exp < expiresAt)) expiresAt = exp;
                        }
                    }
                } catch(e) {}
            }
            if (!expiresAt) return;

            function tick() {
                var diff = expiresAt - new Date();
                if (diff <= 0) {
                    var btn = document.getElementById('wallet-btn');
                    var t = btn ? btn.querySelector('.wallet-timer') : null;
                    if (t) t.remove();
                    clearInterval(window._walletTimerInterval);
                    return;
                }
                var sec = Math.floor(diff / 1000);
                // Cap at 48 hours max
                if (sec > 48 * 3600) sec = 48 * 3600;
                var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
                var text = (h < 10 ? '0' : '') + h + ':' + p(m) + ':' + p(s);

                var btn = document.getElementById('wallet-btn');
                if (!btn) return;
                var el = btn.querySelector('.wallet-timer');
                if (!el) { el = document.createElement('span'); el.className = 'wallet-timer'; el.style.cssText = 'font-size:0.65rem;color:#b45309;margin-left:4px;white-space:nowrap;'; btn.appendChild(el); }
                el.textContent = '\u23F1 ' + text;
            }
            tick();
            window._walletTimerInterval = setInterval(tick, 1000);
        };
        UI.startWalletTimer();
        console.log('[Cart] Wallet timer patched');
    }
    function p(n) { return n < 10 ? '0' + n : '' + n; }

    // ╔══════════════════════════════════════════════╗
    // ║  ORDERS NAV BUTTON DIRECT PATCH               ║
    // ╚══════════════════════════════════════════════╝

    function patchOrdersNavButton() {
        var navBtns = document.querySelectorAll('#bottom-nav button[data-page]');
        navBtns.forEach(function(btn) {
            if (btn.getAttribute('data-page') === 'orders') {
                var newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', function(e) {
                    e.preventDefault(); e.stopPropagation();
                    document.querySelectorAll('#bottom-nav button[data-page]').forEach(function(b) { b.classList.remove('active'); });
                    newBtn.classList.add('active');
                    showBeautifulOrdersPage();
                });
                console.log('[Cart] Orders nav button patched directly');
            }
        });
    }

    // ╔══════════════════════════════════════════════╗
    // ║  CHECKOUT FLOW                                ║
    // ╚══════════════════════════════════════════════╝

    function handleCheckout() {
        var cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [] };
        if (!cart.items || !cart.items.length) {
            if (typeof UI !== 'undefined') UI.showToast('Your cart is empty!', 'error'); return;
        }
        var sidebar = document.getElementById('cart-sidebar');
        if (sidebar) sidebar.classList.add('hidden');
        document.body.style.overflow = '';
        showCheckoutForm();
    }

    function showCheckoutForm() {
        var cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [], subtotal: 0 };
        var user = typeof Store !== 'undefined' ? Store.getState().user || {} : {};
        
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
        if (!user.address) {
            try {
                var savedUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                if (savedUser.address) user.address = savedUser.address;
                if (savedUser.pincode) user.pincode = savedUser.pincode;
            } catch(e) {}
            if (!user.address) user.address = localStorage.getItem('seasalt_address') || '';
            if (!user.pincode) user.pincode = localStorage.getItem('seasalt_pincode') || '';
        }
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
            '<div class="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10 rounded-t-3xl">' +
            '<h3 class="text-xl font-bold text-gray-800">Checkout</h3>' +
            '<button id="close-checkout" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">\u2715</button></div>' +
            '<div class="p-4 space-y-5">' +
            '<div><h4 class="font-semibold text-gray-800 mb-3">\uD83D\uDCCD Delivery Details</h4>' +
            '<div class="space-y-3">' +
            '<input type="text" id="checkout-name" placeholder="Full Name *" value="' + (user.name || '') + '" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800">' +
            '<input type="tel" id="checkout-phone" placeholder="Phone Number *" value="' + displayPhone + '" maxlength="10" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800">' +
            '<div class="relative"><input type="text" id="checkout-pincode" placeholder="Pincode *" value="' + (user.pincode || '') + '" maxlength="6" inputmode="numeric" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800 pr-10"><span id="pincode-status" class="absolute right-3 top-1/2 -translate-y-1/2 text-sm"></span></div>' +
            '<div class="grid grid-cols-2 gap-3"><input type="text" id="checkout-city" placeholder="City *" value="' + (user.city || '') + '" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800"><input type="text" id="checkout-state" placeholder="State *" value="' + (user.state || '') + '" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800"></div>' +
            '<div id="area-dropdown-wrap" style="display:none;"><select id="checkout-area" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 text-gray-800 bg-white"><option value="">Select Area / Post Office</option></select></div>' +
            '<div class="relative"><textarea id="checkout-address" placeholder="Start typing your address... (House No, Street, Landmark) *" rows="2" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pickle-500 focus:ring-1 focus:ring-pickle-500/20 resize-none text-gray-800" autocomplete="off">' + (user.address || '') + '</textarea>' +
            '<div id="places-suggestions" class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto" style="display:none;"></div></div>' +
            '</div></div>' +
            walletHtml +
            '<div><button id="toggle-summary" class="w-full flex items-center justify-between py-2" type="button"><h4 class="font-semibold text-gray-800">\uD83D\uDCE6 Order Summary (' + itemCount + ' items)</h4><svg id="summary-arrow" class="w-5 h-5 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></button>' +
            '<div id="order-summary-details" style="display:none;"><div class="bg-gray-50 rounded-xl p-3 mt-2">' + itemsHtml + '</div></div>' +
            '<div class="bg-gray-50 rounded-xl p-3 mt-3 space-y-2">' +
            '<div class="flex justify-between text-sm"><span class="text-gray-600">Subtotal (' + itemCount + ' items)</span><span class="font-medium">\u20b9' + cart.subtotal + '</span></div>' +
            '<div class="flex justify-between text-sm"><span class="text-gray-600">Delivery</span><span class="font-medium ' + (deliveryCharge === 0 ? 'text-green-600' : '') + '">' + (deliveryCharge === 0 ? 'FREE' : '\u20b9' + deliveryCharge) + '</span></div>' +
            (walletDiscount > 0 ? '<div class="flex justify-between text-sm text-green-600"><span>Wallet Credit</span><span>-\u20b9' + walletDiscount + '</span></div>' : '') +
            '<div class="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-200"><span>Total</span><span class="text-pickle-600">\u20b9' + finalTotal + '</span></div></div></div>' +
            '</div>' +
            '<div class="sticky bottom-0 bg-white p-4 border-t shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"><button id="pay-now-btn" class="w-full py-4 bg-gradient-to-r from-pickle-500 to-pickle-600 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98]">\uD83D\uDD12 Pay \u20b9' + finalTotal + '</button></div></div>';

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        modal.querySelector('#close-checkout').onclick = function() { modal.remove(); document.body.style.overflow = ''; };
        modal.onclick = function(e) { if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; } };
        
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
        
        var cwCheckbox = modal.querySelector('#checkout-use-wallet');
        if (cwCheckbox) {
            cwCheckbox.addEventListener('change', function(e) {
                var mainCb = document.getElementById('use-wallet');
                if (mainCb) mainCb.checked = e.target.checked;
                modal.remove(); showCheckoutForm();
            });
        }

        var pincodeInput = modal.querySelector('#checkout-pincode');
        if (pincodeInput) pincodeInput.oninput = function(e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); };
        var phoneInput = modal.querySelector('#checkout-phone');
        if (phoneInput) phoneInput.oninput = function(e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); };

        initPlacesAutocomplete(modal);

        modal._orderData = { subtotal: cart.subtotal, deliveryCharge: deliveryCharge, walletDiscount: walletDiscount, total: finalTotal, useWallet: walletChecked && walletDiscount > 0 };
        modal.querySelector('#pay-now-btn').onclick = function() { processPayment(modal); };
        
        // Auto-populate from Supabase (last order's address)
        var addrField = modal.querySelector('#checkout-address');
        var pinField = modal.querySelector('#checkout-pincode');
        var nameField = modal.querySelector('#checkout-name');
        if (addrField && !addrField.value.trim()) {
            var userPhone = displayPhone || (user.phone || '').replace(/^\+91/, '');
            if (userPhone && userPhone.length >= 10) {
                (async function() {
                    var phoneVariants = [userPhone, '+91' + userPhone, '91' + userPhone];
                    for (var v = 0; v < phoneVariants.length; v++) {
                        try {
                            var res = await fetch(SUPABASE_URL + '/rest/v1/orders?customer_phone=eq.' + encodeURIComponent(phoneVariants[v]) + '&order=created_at.desc&limit=1', {
                                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
                            });
                            var orders = await res.json();
                            if (orders && orders.length > 0) {
                                var lo = orders[0];
                                var addr = lo.customer_address || lo.shipping_address || '';
                                var pin = lo.customer_pincode || lo.pincode || '';
                                var cname = lo.customer_name || '';
                                if (!addr && lo.address) { try { var ao = typeof lo.address === 'string' ? JSON.parse(lo.address) : lo.address; addr = ao.address || ao.street || ''; pin = pin || ao.pincode || ''; } catch(pe) { addr = lo.address; } }
                                if (addr && addrField && !addrField.value.trim()) addrField.value = addr;
                                if (pin && pinField && !pinField.value.trim()) pinField.value = pin;
                                if (cname && nameField && !nameField.value.trim()) nameField.value = cname;
                                if (addr) localStorage.setItem('seasalt_address', addr);
                                if (pin) localStorage.setItem('seasalt_pincode', pin);
                                try { var su = JSON.parse(localStorage.getItem('seasalt_user') || '{}'); if (addr) su.address = addr; if (pin) su.pincode = pin; localStorage.setItem('seasalt_user', JSON.stringify(su)); } catch(se) {}
                                break;
                            }
                        } catch(fe) {}
                    }
                })();
            }
        }
        
        setTimeout(function() {
            var nameIn = modal.querySelector('#checkout-name');
            var phoneIn = modal.querySelector('#checkout-phone');
            var addrIn = modal.querySelector('#checkout-address');
            if (nameIn && !nameIn.value) nameIn.focus();
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

        try {
            var existingUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            existingUser.name = name; existingUser.address = address; existingUser.pincode = pincode;
            existingUser.city = city; existingUser.state = state;
            if (phone) { existingUser.phone = phone.startsWith('+') ? phone : '+91' + phone.replace(/^0+/, ''); }
            localStorage.setItem('seasalt_user', JSON.stringify(existingUser));
            localStorage.setItem('seasalt_address', address);
            localStorage.setItem('seasalt_pincode', pincode);
            if (phone && !localStorage.getItem('seasalt_phone')) localStorage.setItem('seasalt_phone', phone.startsWith('+') ? phone : '+91' + phone.replace(/^0+/, ''));
        } catch(e) {}

        var cart = typeof Store !== 'undefined' ? Store.getCart() : { items: [] };
        var orderCalc = modal._orderData;
        var orderId = 'SS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

        var orderData = { 
            orderId: orderId, status: 'pending', createdAt: new Date().toISOString(),
            customer: { name: name, phone: phone, address: address, pincode: pincode, city: city, state: state },
            items: cart.items, subtotal: orderCalc.subtotal, deliveryCharge: orderCalc.deliveryCharge,
            walletDiscount: orderCalc.walletDiscount, total: orderCalc.total, useWallet: orderCalc.useWallet
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

    // ╔══════════════════════════════════════════════╗
    // ║  ORDER COMPLETION + WHATSAPP                  ║
    // ╚══════════════════════════════════════════════╝

    async function completeOrder(orderData, modal, paymentId, paymentMethod) {
        console.log('[Cart] Completing order:', orderData.orderId, 'payment:', paymentMethod);
        
        orderData.paymentId = paymentId;
        orderData.paymentMethod = paymentMethod;
        orderData.status = 'confirmed';

        var orderForStorage = {
            id: orderData.orderId, orderId: orderData.orderId,
            items: orderData.items || [],
            customer: orderData.customer,
            address: { name: orderData.customer.name, phone: orderData.customer.phone, line1: orderData.customer.address, city: '', pincode: orderData.customer.pincode },
            subtotal: orderData.subtotal || 0,
            delivery: orderData.deliveryCharge || 0, deliveryCharge: orderData.deliveryCharge || 0,
            walletUsed: orderData.walletDiscount || 0, walletDiscount: orderData.walletDiscount || 0,
            total: orderData.total || 0,
            status: 'confirmed', paymentId: paymentId, paymentMethod: paymentMethod,
            createdAt: orderData.createdAt, created_at: orderData.createdAt, date: orderData.createdAt,
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
        console.log('[Cart] Order saved:', orderData.orderId, 'total:', orderForStorage.total);

        await saveOrderToSupabase(orderData);

        // === WALLET DEDUCTION ===
        if (orderData.walletDiscount > 0) {
            window._walletSyncPaused = true;
            window._walletLastDeductedAt = Date.now();
            var spinWallet = getSpinWallet();
            if (spinWallet) {
                var remaining = spinWallet.amount - orderData.walletDiscount;
                if (remaining <= 0) { 
                    localStorage.removeItem(SPIN_WALLET_KEY); 
                    localStorage.removeItem('seasalt_spin_reward');
                    localStorage.removeItem('seasalt_admin_credit');
                }
                else { 
                    // Update display wallet
                    localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify({ amount: remaining, expiresAt: spinWallet.expiresAt.toISOString(), addedAt: new Date().toISOString() })); 
                    // Update source keys proportionally
                    var spinReward = null; try { spinReward = JSON.parse(localStorage.getItem('seasalt_spin_reward') || 'null'); } catch(e) {}
                    var adminCredit = null; try { adminCredit = JSON.parse(localStorage.getItem('seasalt_admin_credit') || 'null'); } catch(e) {}
                    var spinAmt = (spinReward && spinReward.expiresAt && new Date(spinReward.expiresAt) > new Date()) ? (parseFloat(spinReward.amount) || 0) : 0;
                    var adminAmt = (adminCredit && adminCredit.expiresAt && new Date(adminCredit.expiresAt) > new Date()) ? (parseFloat(adminCredit.amount) || 0) : 0;
                    // Deduct from admin credit first (expires sooner), then spin
                    var deductLeft = orderData.walletDiscount;
                    if (adminAmt > 0 && deductLeft > 0) {
                        var adminDeduct = Math.min(adminAmt, deductLeft);
                        adminAmt -= adminDeduct; deductLeft -= adminDeduct;
                        if (adminAmt <= 0) localStorage.removeItem('seasalt_admin_credit');
                        else { adminCredit.amount = adminAmt; localStorage.setItem('seasalt_admin_credit', JSON.stringify(adminCredit)); }
                    }
                    if (spinAmt > 0 && deductLeft > 0) {
                        var spinDeduct = Math.min(spinAmt, deductLeft);
                        spinAmt -= spinDeduct; deductLeft -= spinDeduct;
                        if (spinAmt <= 0) localStorage.removeItem('seasalt_spin_reward');
                        else { spinReward.amount = spinAmt; localStorage.setItem('seasalt_spin_reward', JSON.stringify(spinReward)); }
                    }
                }
                var userPhone = localStorage.getItem('seasalt_phone') || localStorage.getItem('seasalt_user_phone');
                if (!userPhone) try { userPhone = JSON.parse(localStorage.getItem('seasalt_user') || '{}').phone; } catch(e) {}
                if (!userPhone) userPhone = orderData.customer.phone;
                if (userPhone && !userPhone.startsWith('+')) userPhone = '+91' + userPhone.replace(/^0+/, '');
                if (userPhone) {
                    await updateWalletInSupabase(userPhone, Math.max(0, remaining));
                    try {
                        await fetch(SUPABASE_URL + '/rest/v1/wallet_transactions', {
                            method: 'POST',
                            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                            body: JSON.stringify({ user_phone: userPhone, amount: -orderData.walletDiscount, type: 'order_deduction', description: 'Used for order ' + orderData.orderId, balance_after: Math.max(0, remaining) })
                        });
                    } catch (e) {}
                }
            }
            setTimeout(function() { window._walletSyncPaused = false; }, 16000);
        }

        // === CLEAR CART & UI ===
        if (typeof Store !== 'undefined' && Store.clearCart) Store.clearCart();
        modal.remove();
        document.body.style.overflow = '';
        
        if (typeof UI !== 'undefined') {
            UI.showToast('\uD83C\uDF89 Order ' + orderData.orderId + ' confirmed!', 'success');
            UI.updateCartUI();
            if (UI.updateWalletDisplay) { var w = UI.getSpinWallet ? UI.getSpinWallet() : null; UI.updateWalletDisplay(w); }
            if (UI.startWalletTimer) UI.startWalletTimer();
        }
        
        showOrderSuccessModal(orderForStorage);

        // === WHATSAPP NOTIFICATION ===
        setTimeout(function() { sendWhatsAppNotification(orderForStorage); }, 2500);

        checkoutInProgress = false;
    }

    // ── WhatsApp Notification ──
    function sendWhatsAppNotification(order) {
        var items = [];
        try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch(e) {}

        var cust = order.customer || {};
        var custName = cust.name || order.customer_name || 'Customer';
        var custPhone = cust.phone || order.customer_phone || '';
        var custAddress = cust.address || '';
        var custPincode = cust.pincode || '';

        var msg = '\uD83E\uDDC2 *SeaSalt Pickles \u2014 New Order!*\n\n' +
            '\uD83D\uDCCB *Order ID:* #' + (order.id || order.orderId) + '\n' +
            '\uD83D\uDC64 *Customer:* ' + custName + '\n' +
            '\uD83D\uDCF1 *Phone:* ' + custPhone + '\n' +
            '\uD83D\uDCCD *Address:* ' + custAddress + (custPincode ? ', ' + custPincode : '') + '\n';

        var date = order.createdAt || order.created_at || new Date().toISOString();
        try {
            var d = new Date(date);
            msg += '\uD83D\uDCC5 *Date:* ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
                ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + '\n';
        } catch(e) {}

        msg += '\n\uD83D\uDED2 *Items:*\n';
        var calcTotal = 0;
        items.forEach(function(it, i) {
            var nm = it.name || 'Item';
            var sz = it.size || it.weight || '';
            var qty = it.quantity || 1;
            var price = parseFloat(it.price) || 0;
            var lineTotal = price * qty;
            calcTotal += lineTotal;
            msg += (i + 1) + '. ' + nm + (sz ? ' (' + sz + ')' : '') + ' \u00d7 ' + qty + ' = \u20b9' + lineTotal + '\n';
        });

        var total = parseFloat(order.total) || calcTotal;
        msg += '\n\uD83D\uDCB0 *Total: \u20b9' + total + '*\n';
        
        if (order.walletUsed > 0 || order.walletDiscount > 0) {
            msg += '\uD83D\uDCB3 *Wallet Used: \u20b9' + (order.walletUsed || order.walletDiscount) + '*\n';
        }
        
        msg += '\nThank you for ordering! \uD83D\uDE4F';

        var url = 'https://wa.me/' + STORE_WHATSAPP + '?text=' + encodeURIComponent(msg);
        window.open(url, '_blank');
    }

    async function saveOrderToSupabase(orderData) {
        try {
            var phone = orderData.customer.phone || '';
            if (phone && !phone.startsWith('+')) phone = '+91' + phone.replace(/^0+/, '');
            var payload = {
                id: orderData.orderId, customer_name: orderData.customer.name, customer_phone: phone,
                customer_address: orderData.customer.address, customer_pincode: orderData.customer.pincode,
                items: JSON.stringify(orderData.items), subtotal: orderData.subtotal,
                delivery_charge: orderData.deliveryCharge, wallet_used: orderData.walletDiscount || 0,
                total: orderData.total, payment_method: orderData.paymentMethod,
                payment_id: orderData.paymentId, status: 'confirmed', created_at: orderData.createdAt
            };
            var res = await fetch(SUPABASE_URL + '/rest/v1/orders', {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
            });
            if (res.ok) { console.log('[Cart] Order saved to Supabase'); }
            else {
                var errText = await res.text();
                console.error('[Cart] Supabase save failed:', res.status, errText);
                if (res.status === 400 || res.status === 404 || res.status === 409) {
                    var minPayload = { order_id: orderData.orderId, customer_name: orderData.customer.name, customer_phone: phone, address: orderData.customer.address + ', ' + orderData.customer.pincode, items: JSON.stringify(orderData.items), total: orderData.total, status: 'confirmed', payment_id: orderData.paymentId, payment_method: orderData.paymentMethod };
                    await fetch(SUPABASE_URL + '/rest/v1/orders', { method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(minPayload) });
                }
            }
        } catch (e) { console.error('[Cart] Supabase save error:', e); }
    }

    async function updateWalletInSupabase(phone, balance) {
        try {
            await fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
                method: 'PATCH',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                body: JSON.stringify({ wallet_balance: balance })
            });
        } catch (e) {}
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
            '<button class="w-full py-3 text-pickle-600 font-semibold border border-pickle-200 rounded-xl hover:bg-pickle-50" onclick="this.closest(\'.fixed\').remove(); Cart.showOrdersPage();">View My Orders</button>' +
            '</div></div>';
        document.body.appendChild(m);
    }

    // ╔══════════════════════════════════════════════╗
    // ║  BEAUTIFUL ORDERS PAGE (BUILT-IN) v12        ║
    // ╚══════════════════════════════════════════════╝

    function showBeautifulOrdersPage() {
        var old = document.getElementById('orders-modal');
        if (old) old.remove();

        var modal = document.createElement('div');
        modal.id = 'orders-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:86;display:flex;align-items:flex-end;justify-content:center;';

        // Backdrop
        var backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);';
        backdrop.onclick = function() { modal.remove(); document.body.style.overflow = ''; };
        modal.appendChild(backdrop);

        // Panel
        var panel = document.createElement('div');
        panel.style.cssText = 'position:relative;background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;max-height:85vh;display:flex;flex-direction:column;';
        modal.appendChild(panel);

        // Header
        var hdr = document.createElement('div');
        hdr.style.cssText = 'padding:20px 20px 16px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
        hdr.innerHTML = '<div><h3 style="font-weight:800;font-size:1.25rem;color:#1f2937;margin:0;">My Orders</h3>' +
            '<p id="orders-count" style="font-size:0.8rem;color:#9ca3af;margin:4px 0 0;">Loading...</p></div>' +
            '<button style="width:36px;height:36px;border-radius:50%;background:#f3f4f6;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;" id="close-orders-x">\u2715</button>';
        panel.appendChild(hdr);
        hdr.querySelector('#close-orders-x').onclick = function() { modal.remove(); document.body.style.overflow = ''; };

        // Body
        var body = document.createElement('div');
        body.id = 'orders-body';
        body.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px 24px;';
        body.innerHTML = '<div style="text-align:center;padding:40px 0;"><div class="animate-pulse" style="font-size:2rem;">⏳</div><p style="color:#9ca3af;font-size:0.9rem;margin-top:8px;">Loading orders...</p></div>';
        panel.appendChild(body);

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Fetch orders from BOTH localStorage and Supabase, merge & deduplicate
        loadAllOrders(function(orders) {
            var countEl = document.getElementById('orders-count');
            if (countEl) countEl.textContent = orders.length + ' order' + (orders.length !== 1 ? 's' : '');
            
            body.innerHTML = '';
            if (orders.length === 0) {
                body.innerHTML = '<div style="text-align:center;padding:60px 0;"><div style="font-size:4rem;margin-bottom:16px;">\uD83D\uDCE6</div>' +
                    '<h4 style="font-weight:700;color:#1f2937;font-size:1.1rem;margin:0 0 8px;">No orders yet</h4>' +
                    '<p style="color:#9ca3af;font-size:0.9rem;margin:0;">Your orders will appear here after checkout</p></div>';
            } else {
                orders.forEach(function(order) { 
                    var card = buildCard(order);
                    card.style.cursor = 'pointer';
                    card.onclick = function() { showOrderDetail(order, modal); };
                    body.appendChild(card); 
                });
            }
        });
    }

    function loadAllOrders(callback) {
        // Start with localStorage orders
        var localOrders = getStoredOrders();
        
        // Try to fetch from Supabase too
        var phone = localStorage.getItem('seasalt_phone') || '';
        if (!phone) { try { phone = JSON.parse(localStorage.getItem('seasalt_user') || '{}').phone || ''; } catch(e) {} }
        
        if (!phone || phone.length < 10) {
            callback(localOrders);
            return;
        }

        var variants = [phone];
        if (phone.startsWith('+91')) variants.push(phone.replace('+91', ''));
        if (!phone.startsWith('+')) variants.push('+91' + phone);

        var fetched = false;
        function tryVariant(idx) {
            if (idx >= variants.length || fetched) { callback(localOrders); return; }
            fetch(SUPABASE_URL + '/rest/v1/orders?customer_phone=eq.' + encodeURIComponent(variants[idx]) + '&order=created_at.desc&limit=50', {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            }).then(function(r) { return r.json(); }).then(function(serverOrders) {
                if (!serverOrders || !serverOrders.length) { tryVariant(idx + 1); return; }
                fetched = true;
                // Merge: use server orders as base (they have latest status), fill in with local
                var merged = {};
                serverOrders.forEach(function(so) {
                    var id = so.id || so.order_id || '';
                    merged[id] = {
                        id: id, orderId: id,
                        items: so.items || '[]',
                        customer: { name: so.customer_name, phone: so.customer_phone, address: so.customer_address, pincode: so.customer_pincode },
                        customer_name: so.customer_name, customer_phone: so.customer_phone,
                        customer_address: so.customer_address, customer_pincode: so.customer_pincode,
                        subtotal: so.subtotal || 0, delivery: so.delivery_charge || 0, deliveryCharge: so.delivery_charge || 0,
                        walletUsed: so.wallet_used || 0, walletDiscount: so.wallet_used || 0,
                        total: so.total || 0, status: so.status || 'pending',
                        paymentId: so.payment_id, paymentMethod: so.payment_method,
                        createdAt: so.created_at, created_at: so.created_at, date: so.created_at,
                        tracking_number: so.tracking_number || '',
                        _fromServer: true
                    };
                });
                // Add local orders not on server
                localOrders.forEach(function(lo) {
                    var id = lo.id || lo.orderId || lo.order_id || '';
                    if (!merged[id]) merged[id] = lo;
                });
                // Sort by date desc
                var all = Object.values(merged);
                all.sort(function(a, b) {
                    var da = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
                    var db = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
                    return db - da;
                });
                callback(all);
            }).catch(function() { tryVariant(idx + 1); });
        }
        tryVariant(0);
    }

    function buildCard(order) {
        var card = document.createElement('div');
        card.style.cssText = 'background:#f9fafb;border-radius:16px;padding:16px;margin-bottom:12px;border:1px solid #e5e7eb;transition:box-shadow 0.2s;';
        card.onmouseenter = function() { card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; };
        card.onmouseleave = function() { card.style.boxShadow = 'none'; };

        var orderId = order.id || order.orderId || order.order_id || '???';
        var status = order.status || 'pending';
        var date = order.createdAt || order.created_at || order.date || '';
        var total = parseFloat(order.total) || 0;

        var items = [];
        try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch(e) {}

        var itemCount = 0;
        items.forEach(function(it) { itemCount += (it.quantity || 1); });

        if (total === 0 && items.length > 0) {
            items.forEach(function(it) { total += (parseFloat(it.price) || 0) * (it.quantity || 1); });
            total += parseFloat(order.delivery || order.deliveryCharge || order.delivery_charge || 0);
            total -= parseFloat(order.walletUsed || order.walletDiscount || order.wallet_used || 0);
            if (total < 0) total = 0;
        }

        var sc = { 'confirmed': { bg:'#dcfce7', c:'#166534', i:'\u2705', l:'Confirmed' }, 'pending': { bg:'#fef3c7', c:'#92400e', i:'\u23F3', l:'Pending' }, 'preparing': { bg:'#fef3c7', c:'#92400e', i:'\uD83D\uDC68\u200D\uD83C\uDF73', l:'Preparing' }, 'shipped': { bg:'#dbeafe', c:'#1e40af', i:'\uD83D\uDE9A', l:'Shipped' }, 'delivered': { bg:'#d1fae5', c:'#065f46', i:'\uD83C\uDF89', l:'Delivered' }, 'cancelled': { bg:'#fee2e2', c:'#991b1b', i:'\u274C', l:'Cancelled' } };
        var s = sc[status] || sc['pending'];

        var dateStr = '';
        if (date) { try { var dd = new Date(date); dateStr = dd.toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) + ', ' + dd.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',hour12:true}); } catch(e) {} }

        // Show first 2 items as preview
        var previewHtml = '';
        var previewItems = items.slice(0, 2);
        previewItems.forEach(function(it) {
            var nm = it.name || 'Item';
            var qty = it.quantity || 1;
            previewHtml += '<span style="font-size:0.8rem;color:#6b7280;">' + nm + ' \u00d7' + qty + '</span>';
            if (previewItems.indexOf(it) < previewItems.length - 1) previewHtml += '<span style="color:#d1d5db;margin:0 4px;">•</span>';
        });
        if (items.length > 2) previewHtml += '<span style="font-size:0.75rem;color:#9ca3af;margin-left:4px;">+' + (items.length - 2) + ' more</span>';

        card.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
            '<div style="font-weight:700;color:#1f2937;font-size:0.95rem;">#' + orderId + '</div>' +
            '<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;font-weight:600;padding:4px 10px;border-radius:20px;background:' + s.bg + ';color:' + s.c + ';">' + s.i + ' ' + s.l + '</span></div>' +
            (dateStr ? '<div style="font-size:0.8rem;color:#9ca3af;margin-bottom:8px;">' + dateStr + '</div>' : '') +
            (previewHtml ? '<div style="margin-bottom:8px;display:flex;align-items:center;flex-wrap:wrap;">' + previewHtml + '</div>' : '') +
            '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb;padding-top:8px;">' +
            '<span style="font-size:0.85rem;color:#6b7280;">' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</span>' +
            '<div style="display:flex;align-items:center;gap:8px;"><span style="font-weight:800;font-size:1.15rem;color:#1f2937;">\u20b9' + total + '</span>' +
            '<span style="font-size:0.75rem;color:#9ca3af;">View \u203A</span></div></div>';

        return card;
    }

    // ╔══════════════════════════════════════════════╗
    // ║  ORDER DETAIL VIEW (NEW)                      ║
    // ╚══════════════════════════════════════════════╝

    function showOrderDetail(order, parentModal) {
        var orderId = order.id || order.orderId || order.order_id || '???';
        var status = order.status || 'pending';
        var date = order.createdAt || order.created_at || order.date || '';
        var total = parseFloat(order.total) || 0;
        var subtotal = parseFloat(order.subtotal) || 0;
        var delivery = parseFloat(order.delivery || order.deliveryCharge || order.delivery_charge || 0);
        var walletUsed = parseFloat(order.walletUsed || order.walletDiscount || order.wallet_used || 0);
        var paymentMethod = order.paymentMethod || order.payment_method || '';
        var paymentId = order.paymentId || order.payment_id || '';
        var tracking = order.tracking_number || '';

        var cust = order.customer || {};
        var custName = cust.name || order.customer_name || '';
        var custPhone = cust.phone || order.customer_phone || '';
        var custAddress = cust.address || order.customer_address || '';
        var custPincode = cust.pincode || order.customer_pincode || '';

        var items = [];
        try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch(e) {}

        if (total === 0 && items.length > 0) {
            items.forEach(function(it) { total += (parseFloat(it.price) || 0) * (it.quantity || 1); });
            subtotal = total;
            total += delivery - walletUsed;
            if (total < 0) total = 0;
        }
        if (subtotal === 0 && items.length > 0) {
            items.forEach(function(it) { subtotal += (parseFloat(it.price) || 0) * (it.quantity || 1); });
        }

        var sc = { 'confirmed': { bg:'#dcfce7', c:'#166534', i:'\u2705', l:'Confirmed' }, 'pending': { bg:'#fef3c7', c:'#92400e', i:'\u23F3', l:'Pending' }, 'preparing': { bg:'#fef3c7', c:'#92400e', i:'\uD83D\uDC68\u200D\uD83C\uDF73', l:'Preparing' }, 'shipped': { bg:'#dbeafe', c:'#1e40af', i:'\uD83D\uDE9A', l:'Shipped' }, 'delivered': { bg:'#d1fae5', c:'#065f46', i:'\uD83C\uDF89', l:'Delivered' }, 'cancelled': { bg:'#fee2e2', c:'#991b1b', i:'\u274C', l:'Cancelled' } };
        var s = sc[status] || sc['pending'];

        var dateStr = '';
        if (date) { try { var dd = new Date(date); dateStr = dd.toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) + ' at ' + dd.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',hour12:true}); } catch(e) {} }

        // Items HTML
        var itemsHtml = '';
        items.forEach(function(it) {
            var nm = it.name || 'Item';
            var sz = it.size || it.weight || it.variant || '';
            var qty = it.quantity || 1;
            var pr = parseFloat(it.price) || 0;
            var img = it.image || '';
            itemsHtml += '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6;">' +
                (img ? '<div style="width:48px;height:48px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#f3f4f6;"><img src="' + img + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML=\'🥒\'"></div>' : 
                '<div style="width:48px;height:48px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;">🥒</div>') +
                '<div style="flex:1;min-width:0;">' +
                '<div style="font-weight:600;color:#1f2937;font-size:0.9rem;">' + nm + '</div>' +
                (sz ? '<div style="font-size:0.78rem;color:#9ca3af;">' + sz + '</div>' : '') +
                '<div style="font-size:0.8rem;color:#6b7280;margin-top:2px;">\u20b9' + pr + ' \u00d7 ' + qty + '</div></div>' +
                '<div style="font-weight:700;color:#1f2937;font-size:0.95rem;flex-shrink:0;">\u20b9' + (pr * qty) + '</div></div>';
        });

        // Status timeline
        var statusOrder = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];
        var currentIdx = statusOrder.indexOf(status);
        if (status === 'cancelled') currentIdx = -1;
        var timelineHtml = '<div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px;position:relative;">';
        statusOrder.forEach(function(st, idx) {
            var done = idx <= currentIdx;
            var current = idx === currentIdx;
            var icon = { pending:'\u23F3', confirmed:'\u2705', preparing:'\uD83D\uDC68\u200D\uD83C\uDF73', shipped:'\uD83D\uDE9A', delivered:'\uD83C\uDF89' }[st];
            var label = st.charAt(0).toUpperCase() + st.slice(1);
            var color = done ? '#166534' : '#d1d5db';
            var bgCol = done ? '#dcfce7' : '#f3f4f6';
            timelineHtml += '<div style="display:flex;flex-direction:column;align-items:center;z-index:1;flex:1;">' +
                '<div style="width:28px;height:28px;border-radius:50%;background:' + bgCol + ';display:flex;align-items:center;justify-content:center;font-size:0.8rem;' + (current ? 'box-shadow:0 0 0 3px ' + bgCol + ';' : '') + '">' + icon + '</div>' +
                '<div style="font-size:0.6rem;color:' + color + ';margin-top:4px;font-weight:' + (current ? '700' : '500') + ';">' + label + '</div></div>';
        });
        timelineHtml += '</div>';
        if (status === 'cancelled') {
            timelineHtml = '<div style="text-align:center;padding:12px;background:#fee2e2;border-radius:12px;margin:8px 0;"><span style="font-size:1.2rem;">\u274C</span> <span style="font-weight:600;color:#991b1b;">Order Cancelled</span></div>';
        }

        // Build detail panel
        var detail = document.createElement('div');
        detail.id = 'order-detail-panel';
        detail.style.cssText = 'position:absolute;inset:0;background:#fff;border-radius:24px 24px 0 0;z-index:2;display:flex;flex-direction:column;animation:slideInRight 0.25s ease;';

        // Add animation
        var styleTag = document.getElementById('order-detail-anim');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'order-detail-anim';
            styleTag.textContent = '@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}';
            document.head.appendChild(styleTag);
        }

        detail.innerHTML =
            // Header
            '<div style="padding:16px 20px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:12px;flex-shrink:0;">' +
            '<button id="back-to-orders" style="width:36px;height:36px;border-radius:50%;background:#f3f4f6;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">\u2190</button>' +
            '<div style="flex:1;"><h3 style="font-weight:800;font-size:1.1rem;color:#1f2937;margin:0;">Order #' + orderId + '</h3>' +
            '<p style="font-size:0.78rem;color:#9ca3af;margin:2px 0 0;">' + dateStr + '</p></div>' +
            '<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:600;padding:4px 10px;border-radius:20px;background:' + s.bg + ';color:' + s.c + ';">' + s.i + ' ' + s.l + '</span></div>' +
            // Scrollable body
            '<div style="flex:1;overflow-y:auto;padding:16px 20px 24px;">' +
            // Status timeline
            timelineHtml +
            // Tracking
            (tracking ? '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px;margin:12px 0;font-size:0.85rem;"><strong style="color:#1e40af;">\uD83D\uDE9A Tracking:</strong> <span style="color:#1e40af;">' + tracking + '</span></div>' : '') +
            // Items
            '<div style="margin-top:16px;"><h4 style="font-weight:700;color:#1f2937;font-size:0.95rem;margin:0 0 8px;">Items</h4>' + itemsHtml + '</div>' +
            // Price breakdown
            '<div style="background:#f9fafb;border-radius:14px;padding:14px;margin-top:16px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#6b7280;margin-bottom:6px;"><span>Subtotal</span><span>\u20b9' + subtotal + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#6b7280;margin-bottom:6px;"><span>Delivery</span><span style="' + (delivery === 0 ? 'color:#16a34a;' : '') + '">' + (delivery === 0 ? 'FREE' : '\u20b9' + delivery) + '</span></div>' +
            (walletUsed > 0 ? '<div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#16a34a;margin-bottom:6px;"><span>\uD83D\uDCB0 Wallet Used</span><span>-\u20b9' + walletUsed + '</span></div>' : '') +
            '<div style="display:flex;justify-content:space-between;font-weight:800;font-size:1.1rem;color:#1f2937;border-top:1px solid #e5e7eb;padding-top:10px;margin-top:6px;"><span>Total</span><span>\u20b9' + total + '</span></div></div>' +
            // Payment info
            (paymentMethod ? '<div style="margin-top:12px;font-size:0.82rem;color:#9ca3af;">\uD83D\uDCB3 Paid via ' + paymentMethod + (paymentId ? ' (' + paymentId.substring(0, 16) + '...)' : '') + '</div>' : '') +
            // Delivery address
            (custAddress ? '<div style="margin-top:16px;"><h4 style="font-weight:700;color:#1f2937;font-size:0.95rem;margin:0 0 8px;">\uD83D\uDCCD Delivery Address</h4>' +
            '<div style="background:#f9fafb;border-radius:12px;padding:12px;font-size:0.85rem;color:#4b5563;">' +
            (custName ? '<div style="font-weight:600;">' + custName + '</div>' : '') +
            '<div>' + custAddress + '</div>' +
            (custPincode ? '<div>' + custPincode + '</div>' : '') +
            (custPhone ? '<div style="color:#9ca3af;margin-top:4px;">\uD83D\uDCF1 ' + custPhone + '</div>' : '') +
            '</div></div>' : '') +
            '</div>';

        // Find the panel (parent modal's second child = the white panel)
        var parentPanel = parentModal.children[1];
        if (!parentPanel) parentPanel = parentModal;
        parentPanel.appendChild(detail);

        detail.querySelector('#back-to-orders').onclick = function() {
            detail.style.animation = 'slideOutRight 0.2s ease forwards';
            var styleOut = document.getElementById('order-detail-anim-out');
            if (!styleOut) {
                styleOut = document.createElement('style');
                styleOut.id = 'order-detail-anim-out';
                styleOut.textContent = '@keyframes slideOutRight{from{transform:translateX(0)}to{transform:translateX(100%)}}';
                document.head.appendChild(styleOut);
            }
            setTimeout(function() { detail.remove(); }, 200);
        };
    }

    function getStoredOrders() {
        var orders = [];
        try { orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch(e) {}
        orders.sort(function(a, b) {
            var da = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
            var db = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
            return db - da;
        });
        return orders;
    }

    // ╔══════════════════════════════════════════════╗
    // ║  ORDERS PAGE ROUTING                          ║
    // ╚══════════════════════════════════════════════╝

    function showOrdersPage() {
        // Always use our built-in beautiful version
        showBeautifulOrdersPage();
    }
    
    function showSimpleOrdersModal() {
        // Redirect to beautiful version
        showBeautifulOrdersPage();
    }

    // ╔══════════════════════════════════════════════╗
    // ║  PUBLIC API                                   ║
    // ╚══════════════════════════════════════════════╝

    return { 
        init: init, 
        checkout: handleCheckout, 
        getDeliveryCharge: getDeliveryCharge, 
        getSpinWallet: getSpinWallet, 
        SPIN_WALLET_KEY: SPIN_WALLET_KEY,
        showOrdersPage: showOrdersPage
    };
})();

window.Cart = Cart;
window.Orders = { showOrdersPage: Cart.showOrdersPage };
window.OrdersFix = { showOrdersPage: Cart.showOrdersPage };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Cart.init);
else Cart.init();
