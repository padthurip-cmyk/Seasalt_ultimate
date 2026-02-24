/**
 * SeaSalt Pickles - SpinWheel Login Fix v1
 * ==========================================
 * Patches SpinWheel to save user login data even when "already spun".
 * 
 * PROBLEM: When SpinWheel detects user already spun (via Supabase check),
 * it shows "Already spun" and discards the name+phone the user entered.
 * Result: Account page shows "Not Logged In" even though user identified themselves.
 * 
 * FIX: Intercept SpinWheel's "already spun" flow to save login state.
 * 
 * ADD TO index.html AFTER spinwheel.js:
 *   <script src="js/spinwheel-login-fix.js"></script>
 */
(function() {
    'use strict';
    
    console.log('[SpinWheelFix] Loading...');
    
    // ═══════════════════════════════════════════
    // STRATEGY: Watch for the "already spun" screen appearing.
    // When it shows, grab the name+phone from the claim form inputs
    // and save them to localStorage so the Account page works.
    // ═══════════════════════════════════════════
    
    // MutationObserver to detect when "already" step becomes visible
    function watchForAlreadySpun() {
        var alreadyStep = document.getElementById('sw-step-already');
        if (!alreadyStep) {
            // SpinWheel hasn't created its modal yet, retry
            setTimeout(watchForAlreadySpun, 1000);
            return;
        }
        
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'attributes' && m.attributeName === 'class') {
                    // Check if "already" step just became visible
                    if (!alreadyStep.classList.contains('sw-hidden')) {
                        saveSpinWheelUserData();
                    }
                }
            }
        });
        
        observer.observe(alreadyStep, { attributes: true, attributeFilter: ['class', 'style'] });
        
        // Also check style changes (display:none vs display:block)
        var styleObserver = new MutationObserver(function() {
            if (alreadyStep.style.display !== 'none' && !alreadyStep.classList.contains('sw-hidden')) {
                saveSpinWheelUserData();
            }
        });
        styleObserver.observe(alreadyStep, { attributes: true, attributeFilter: ['style'] });
        
        console.log('[SpinWheelFix] Watching for "already spun" screen');
    }
    
    function saveSpinWheelUserData() {
        // Grab name and phone from SpinWheel's claim form inputs
        var nameInput = document.getElementById('sw-name');
        var phoneInput = document.getElementById('sw-phone');
        var countrySelect = document.getElementById('sw-country');
        var phoneCodeInput = document.getElementById('sw-phone-code');
        
        var name = nameInput ? nameInput.value.trim() : '';
        var rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
        var countryCode = phoneCodeInput ? phoneCodeInput.value : '+91';
        var country = 'India';
        
        if (countrySelect) {
            var selected = countrySelect.options[countrySelect.selectedIndex];
            if (selected && selected.dataset.country) country = selected.dataset.country;
        }
        
        if (!rawPhone || rawPhone.length < 7) {
            console.log('[SpinWheelFix] No valid phone found in form');
            return;
        }
        
        var fullPhone = countryCode + rawPhone;
        
        // Check if already saved (avoid duplicate work)
        if (localStorage.getItem('seasalt_phone') === fullPhone) {
            console.log('[SpinWheelFix] Already saved:', fullPhone);
            return;
        }
        
        // SAVE to localStorage — this is what Account page reads
        localStorage.setItem('seasalt_phone', fullPhone);
        localStorage.setItem('seasalt_user', JSON.stringify({
            name: name,
            phone: fullPhone,
            country: country
        }));
        localStorage.setItem('seasalt_spin_done', 'true');
        
        console.log('[SpinWheelFix] ✅ Saved login from SpinWheel:', fullPhone, name);
        
        // Sync to Store (so Account page shows logged-in immediately)
        if (typeof Store !== 'undefined' && Store.setUser) {
            Store.setUser({ name: name, phone: fullPhone, country: country });
        }
        
        // Update Analytics user ID
        if (typeof Analytics !== 'undefined' && Analytics.linkPhone) {
            Analytics.linkPhone(fullPhone);
        }
        
        // Sync to Supabase (update last_seen, ensure user exists)
        try {
            var SU = 'https://yosjbsncvghpscsrvxds.supabase.co';
            var SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
            fetch(SU + '/rest/v1/users?phone=eq.' + encodeURIComponent(fullPhone), {
                headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK }
            }).then(function(r) { return r.json(); }).then(function(users) {
                if (users && users.length > 0) {
                    // Update name + last_seen
                    var update = { last_seen: new Date().toISOString() };
                    if (name) update.name = name;
                    fetch(SU + '/rest/v1/users?phone=eq.' + encodeURIComponent(fullPhone), {
                        method: 'PATCH',
                        headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                        body: JSON.stringify(update)
                    }).catch(function(){});
                    
                    // If Supabase has a name and user didn't enter one, use it
                    if (users[0].name && !name) {
                        var u = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                        u.name = users[0].name;
                        localStorage.setItem('seasalt_user', JSON.stringify(u));
                    }
                    
                    // If wallet exists in Supabase, restore it locally
                    if (users[0].wallet_balance > 0 && users[0].wallet_expires_at) {
                        var exp = new Date(users[0].wallet_expires_at);
                        if (exp > new Date()) {
                            localStorage.setItem('seasalt_spin_wallet', JSON.stringify({
                                amount: users[0].wallet_balance,
                                expiresAt: users[0].wallet_expires_at
                            }));
                            console.log('[SpinWheelFix] Restored wallet: ₹' + users[0].wallet_balance);
                            // Update wallet UI
                            if (typeof UI !== 'undefined') {
                                UI.updateCartUI();
                                if (UI.startWalletTimer) UI.startWalletTimer();
                            }
                        }
                    }
                }
            }).catch(function(e) { console.warn('[SpinWheelFix] Supabase sync error:', e); });
        } catch(e) {}
    }
    
    // ═══════════════════════════════════════════
    // Also patch: When "Continue Shopping" is clicked on "already" screen,
    // ensure the user sees themselves as logged in
    // ═══════════════════════════════════════════
    function patchCloseButton() {
        var closeBtn = document.getElementById('sw-close-already');
        if (!closeBtn) {
            setTimeout(patchCloseButton, 1000);
            return;
        }
        
        var originalOnClick = closeBtn.onclick;
        closeBtn.onclick = function() {
            // Ensure data is saved before closing
            saveSpinWheelUserData();
            
            // Call original close handler
            if (originalOnClick) originalOnClick.call(this);
        };
        
        console.log('[SpinWheelFix] Patched close button');
    }
    
    // ═══════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════
    function init() {
        watchForAlreadySpun();
        patchCloseButton();
        console.log('[SpinWheelFix] ✅ Ready');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 500); });
    } else {
        setTimeout(init, 500);
    }
    
    // Re-init after SpinWheel creates its modal (it may be delayed)
    setTimeout(init, 2000);
    setTimeout(init, 5000);
    
})();
