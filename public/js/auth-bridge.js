/**
 * SeaSalt Pickles - Auth Bridge v1.2
 * =================================
 * Fixes the gap between SpinWheel auth, Firebase auth, and the Account/Orders pages.
 * 
 * PROBLEMS SOLVED:
 * 1. SpinWheel saves phone/name to localStorage but Account page shows "Not Logged In"
 *    → Bridge syncs localStorage data into Store.user on every page load
 * 2. After spin, Login button in Account tries SpinWheel again → "Already spun"
 *    → Bridge ensures Login always uses SeaSaltAuth (the proper OTP login)
 * 3. Orders page can't find orders because phone format mismatch
 *    → Bridge normalizes phone format across all localStorage keys
 * 4. Analytics shows anonymous ID because Firebase currentUser is null
 *    → Fixed in analytics.js v2.4 (reads localStorage instead)
 * 
 * ADD TO index.html AFTER firebase-auth.js and spinwheel.js:
 *   <script src="js/auth-bridge.js"></script>
 */
(function() {
    'use strict';

    console.log('[AuthBridge] v1.2 Loading...');

    // Fix: Move cart FAB above WhatsApp button so they don't overlap
    // Also ensure wallet badge keeps its vibrant styling
    var fabStyle = document.createElement('style');
    fabStyle.textContent = '#cart-fab { bottom: 150px !important; } ' +
        '.wallet-badge, [class*="wallet-badge"], [onclick*="wallet"], .header-wallet { ' +
        '  background: linear-gradient(135deg, #e8590c, #d9480f) !important; ' +
        '  color: #fff !important; ' +
        '  padding: 8px 16px !important; ' +
        '  border-radius: 25px !important; ' +
        '  font-weight: 700 !important; ' +
        '  font-size: 0.85rem !important; ' +
        '  display: inline-flex !important; ' +
        '  align-items: center !important; ' +
        '  gap: 4px !important; ' +
        '  box-shadow: 0 2px 8px rgba(232, 89, 12, 0.3) !important; ' +
        '}';
    document.head.appendChild(fabStyle);

    // ═══════════════════════════════════════════
    // FIX: Wallet timer — show days format from the start (no flicker)
    // Completely replaces UI.startWalletTimer before it ever runs
    // ═══════════════════════════════════════════
    var _timerPatched = false;
    function patchWalletTimer() {
        if (typeof UI === 'undefined' || _timerPatched) return;
        _timerPatched = true;

        // Save reference to original so we can call it for badge creation
        var _origTimer = UI.startWalletTimer;

        UI.startWalletTimer = function() {
            // Clear any existing intervals
            if (window._walletTimerInterval) clearInterval(window._walletTimerInterval);
            if (window._origWalletTimerInterval) clearInterval(window._origWalletTimerInterval);

            var wallet = null;
            try { wallet = JSON.parse(localStorage.getItem('seasalt_spin_wallet') || 'null'); } catch(e) {}
            if (!wallet || !wallet.expiresAt) return;

            var expiresAt = new Date(wallet.expiresAt).getTime();

            function formatTime() {
                var diff = expiresAt - Date.now();
                if (diff <= 0) return 'Expired';
                var totalSec = Math.floor(diff / 1000);
                var days = Math.floor(totalSec / 86400);
                var hrs = Math.floor((totalSec % 86400) / 3600);
                var mins = Math.floor((totalSec % 3600) / 60);
                var secs = totalSec % 60;
                if (days > 0) {
                    return days + 'd ' + hrs + 'h ' + mins + 'm';
                }
                return String(hrs).padStart(2,'0') + ':' + String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
            }

            function replaceTimerText() {
                var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                var node;
                var timeStr = formatTime();
                while (node = walker.nextNode()) {
                    // Match any HH:MM:SS or HHH:MM:SS pattern
                    if (/\d{2,}:\d{2}:\d{2}/.test(node.textContent)) {
                        node.textContent = node.textContent.replace(/\d{2,}:\d{2}:\d{2}/, timeStr);
                    }
                    // Also replace if our own format is already there (for re-updates)
                    else if (/\d+d \d+h \d+m/.test(node.textContent)) {
                        node.textContent = node.textContent.replace(/\d+d \d+h \d+m/, timeStr);
                    }
                }
            }

            // Let original create the badge HTML first, then immediately fix it
            if (_origTimer) {
                // Temporarily suppress the original's setInterval
                var realSetInterval = window.setInterval;
                window.setInterval = function(fn, ms) {
                    // Capture the original timer's interval ID so we can kill it
                    var id = realSetInterval(fn, ms);
                    window._origWalletTimerInterval = id;
                    return id;
                };
                _origTimer.call(UI);
                window.setInterval = realSetInterval; // Restore
                // Kill the original's interval immediately
                if (window._origWalletTimerInterval) {
                    clearInterval(window._origWalletTimerInterval);
                }
            }

            // Fix the display immediately (no flash)
            replaceTimerText();

            // Our own interval with correct format
            window._walletTimerInterval = setInterval(replaceTimerText, 1000);
        };

        console.log('[AuthBridge] ✅ Wallet timer patched (no flicker)');

        // If wallet exists, start our timer now
        var wallet = null;
        try { wallet = JSON.parse(localStorage.getItem('seasalt_spin_wallet') || 'null'); } catch(e) {}
        if (wallet && wallet.expiresAt) {
            UI.startWalletTimer();
        }
    }

    // Patch ASAP — try multiple times in case UI loads late
    setTimeout(patchWalletTimer, 100);
    setTimeout(patchWalletTimer, 300);
    setTimeout(patchWalletTimer, 800);
    setTimeout(patchWalletTimer, 1500);

    // ═══════════════════════════════════════════
    // 1. SYNC LOGIN STATE: localStorage → Store
    // ═══════════════════════════════════════════
    function syncLoginState() {
        // Read from all possible sources
        var phone = localStorage.getItem('seasalt_phone') || '';
        var name = '';
        var userData = null;

        try {
            userData = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            if (userData.phone && !phone) phone = userData.phone;
            if (userData.name) name = userData.name;
        } catch(e) {}

        // Also check other phone keys
        if (!phone) {
            var keys = ['seasalt_user_phone', 'seasalt_spin_phone'];
            for (var i = 0; i < keys.length; i++) {
                var val = localStorage.getItem(keys[i]);
                if (val && val.length >= 10) { phone = val; break; }
            }
        }

        if (!phone || phone.length < 10) {
            console.log('[AuthBridge] No logged-in user detected');
            return;
        }

        // Normalize phone format (always +91XXXXXXXXXX)
        var normalizedPhone = phone;
        if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+91' + normalizedPhone.replace(/^0+/, '');
        }

        // Ensure seasalt_phone is set (some code only checks this key)
        if (!localStorage.getItem('seasalt_phone')) {
            localStorage.setItem('seasalt_phone', normalizedPhone);
        }

        // Ensure seasalt_user has phone
        if (!userData) userData = {};
        if (!userData.phone) {
            userData.phone = normalizedPhone;
            localStorage.setItem('seasalt_user', JSON.stringify(userData));
        }

        // Sync to Store.user (so Account page can find it)
        if (typeof Store !== 'undefined' && Store.setUser) {
            var currentUser = (Store.getState && Store.getState().user) || {};
            if (!currentUser || !currentUser.phone) {
                Store.setUser({
                    name: name || currentUser.name || '',
                    phone: normalizedPhone,
                    country: userData.country || 'India'
                });
                console.log('[AuthBridge] Synced user to Store:', normalizedPhone, name);
            }
        }

        // Update analytics user ID
        if (typeof Analytics !== 'undefined' && Analytics.linkPhone) {
            var session = Analytics.getSession ? Analytics.getSession() : {};
            if (session.userId && session.userId.startsWith('u_')) {
                Analytics.linkPhone(normalizedPhone);
                console.log('[AuthBridge] Updated analytics userId:', normalizedPhone);
            }
        }

        console.log('[AuthBridge] User state synced | phone:', normalizedPhone, '| name:', name);

        // ═══════════════════════════════════════════
        // WALLET SYNC: Fetch wallet from Supabase → update localStorage
        // Admin credits wallet in Supabase, but store reads from localStorage.
        // This bridges the gap so admin-credited wallet shows on customer UI.
        // ═══════════════════════════════════════════
        syncWalletFromSupabase(normalizedPhone);
    }

    function syncWalletFromSupabase(phone) {
        if (!phone || phone.length < 10) return;

        var SU = 'https://yosjbsncvghpscsrvxds.supabase.co';
        var SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';

        // Try with exact phone first, then try variants
        var variants = [phone];
        if (phone.startsWith('+91')) variants.push(phone.replace('+91', ''));
        if (!phone.startsWith('+')) variants.push('+91' + phone);

        function tryFetch(idx) {
            if (idx >= variants.length) return;
            var p = variants[idx];

            fetch(SU + '/rest/v1/users?phone=eq.' + encodeURIComponent(p) + '&select=wallet_balance,name', {
                headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK }
            }).then(function(r) { return r.json(); }).then(function(users) {
                if (!users || !users.length || !users[0]) {
                    tryFetch(idx + 1);
                    return;
                }

                var user = users[0];
                var supabaseBalance = parseFloat(user.wallet_balance) || 0;

                // Read current localStorage wallet
                var localWallet = null;
                try { localWallet = JSON.parse(localStorage.getItem('seasalt_spin_wallet') || 'null'); } catch(e) {}
                var localBalance = localWallet ? (parseFloat(localWallet.amount) || 0) : 0;
                var localExpiry = localWallet ? localWallet.expiresAt : null;

                // Default expiry: 30 days from now
                var defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

                // CASE 1: Supabase has MORE than local → admin added money
                // Update local to match Supabase (source of truth for admin credits)
                if (supabaseBalance > localBalance) {
                    var walletData = { amount: supabaseBalance, expiresAt: localExpiry || defaultExpiry };
                    localStorage.setItem('seasalt_spin_wallet', JSON.stringify(walletData));
                    console.log('[AuthBridge] ✅ Wallet updated from Supabase: ₹' + supabaseBalance + ' (was ₹' + localBalance + ')');
                    applyWalletToUI(walletData);
                }
                // CASE 2: Local has MORE than Supabase → spin reward not yet synced
                // Push local to Supabase so admin sees correct balance
                else if (localBalance > supabaseBalance && localBalance > 0) {
                    fetch(SU + '/rest/v1/users?phone=eq.' + encodeURIComponent(p), {
                        method: 'PATCH',
                        headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                        body: JSON.stringify({ wallet_balance: localBalance })
                    }).catch(function(){});
                    console.log('[AuthBridge] Synced local wallet → Supabase: ₹' + localBalance);
                }
                // CASE 3: Both equal and > 0 — already in sync
                else if (supabaseBalance > 0 && supabaseBalance === localBalance) {
                    console.log('[AuthBridge] Wallet in sync: ₹' + supabaseBalance);
                }

                // Sync name if missing locally
                if (user.name) {
                    try {
                        var u = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                        if (!u.name) {
                            u.name = user.name;
                            u.phone = phone;
                            localStorage.setItem('seasalt_user', JSON.stringify(u));
                        }
                    } catch(e) {}
                }

            }).catch(function(err) {
                console.warn('[AuthBridge] Wallet sync error:', err);
                tryFetch(idx + 1);
            });
        }

        tryFetch(0);
    }

    function applyWalletToUI(walletData) {
        // Update Store
        if (typeof Store !== 'undefined') {
            if (Store.setWallet) Store.setWallet(walletData);
            else if (Store.getState) {
                var state = Store.getState();
                if (state) state.wallet = walletData;
            }
        }
        // Refresh cart UI to show wallet badge
        if (typeof UI !== 'undefined' && UI.updateCartUI) UI.updateCartUI();
        if (typeof UI !== 'undefined' && UI.startWalletTimer) UI.startWalletTimer();
        // Dispatch event
        try { window.dispatchEvent(new CustomEvent('walletUpdated', { detail: walletData })); } catch(e) {}
    }

    // ═══════════════════════════════════════════
    // 2. FIX: Login button should NEVER use SpinWheel for returning users
    // ═══════════════════════════════════════════
    // The problem: Account page's loginBtn calls SpinWheel.show() if SeaSaltAuth is undefined,
    // but SpinWheel blocks with "Already spun" for returning users.
    // Fix: Ensure SeaSaltAuth is always available, or provide a fallback login.
    
    function ensureLoginAvailable() {
        // If SeaSaltAuth isn't defined (firebase-auth.js failed to load),
        // create a minimal fallback that opens the Firebase OTP modal
        if (typeof SeaSaltAuth === 'undefined') {
            console.log('[AuthBridge] SeaSaltAuth not found, creating fallback');
            window.SeaSaltAuth = {
                showLogin: function() {
                    // If SpinWheel hasn't been used yet, let it handle login
                    if (!localStorage.getItem('seasalt_spin_done') && typeof SpinWheel !== 'undefined') {
                        SpinWheel.show();
                        return;
                    }
                    // Otherwise show a simple phone login prompt
                    showSimpleLogin();
                },
                logout: function() {
                    localStorage.removeItem('seasalt_phone');
                    localStorage.removeItem('seasalt_user');
                    localStorage.removeItem('seasalt_spin_phone');
                    localStorage.removeItem('seasalt_user_phone');
                    if (typeof Store !== 'undefined' && Store.logout) Store.logout();
                    console.log('[AuthBridge] Logged out');
                },
                isLoggedIn: function() {
                    return !!localStorage.getItem('seasalt_phone');
                },
                getUser: function() {
                    try { return JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) { return {}; }
                },
                getPhone: function() {
                    return localStorage.getItem('seasalt_phone') || '';
                }
            };
        }
    }

    // Simple phone login fallback (no OTP — just collects phone for account linking)
    function showSimpleLogin() {
        var overlay = document.createElement('div');
        overlay.id = 'simple-login-overlay';
        overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4';
        overlay.style.background = 'rgba(0,0,0,0.6)';
        overlay.style.backdropFilter = 'blur(4px)';
        
        overlay.innerHTML = '<div style="background:white;border-radius:24px;width:100%;max-width:380px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
            '<div style="text-align:center;margin-bottom:20px;">' +
            '<div style="font-size:48px;margin-bottom:8px;">🌶️</div>' +
            '<h2 style="font-size:22px;font-weight:800;color:#374151;margin:0 0 4px;">Welcome Back!</h2>' +
            '<p style="font-size:14px;color:#6B7280;margin:0;">Enter your phone to see your orders</p></div>' +
            
            '<div style="margin-bottom:12px;">' +
            '<input type="text" id="sl-name" placeholder="Your Name" style="width:100%;padding:14px 16px;border:2px solid #E5E7EB;border-radius:12px;font-size:16px;color:#374151;outline:none;box-sizing:border-box;margin-bottom:8px;">' +
            '<div style="display:flex;gap:8px;">' +
            '<input type="text" value="+91" readonly style="width:70px;padding:14px 8px;border:2px solid #E5E7EB;border-radius:12px;font-size:16px;font-weight:700;text-align:center;color:#374151;background:#F9FAFB;box-sizing:border-box;">' +
            '<input type="tel" id="sl-phone" placeholder="Phone number" maxlength="10" inputmode="numeric" style="flex:1;padding:14px 16px;border:2px solid #E5E7EB;border-radius:12px;font-size:16px;color:#374151;outline:none;box-sizing:border-box;">' +
            '</div></div>' +
            
            '<button id="sl-submit" style="width:100%;padding:16px;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#D4451A,#B91C1C);color:white;box-shadow:0 4px 15px rgba(212,69,26,0.3);" disabled>Continue</button>' +
            
            '<button id="sl-cancel" style="width:100%;padding:12px;border:none;background:none;color:#6B7280;font-size:14px;cursor:pointer;margin-top:8px;">Cancel</button>' +
            '</div>';
        
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        var nameInput = document.getElementById('sl-name');
        var phoneInput = document.getElementById('sl-phone');
        var submitBtn = document.getElementById('sl-submit');
        var cancelBtn = document.getElementById('sl-cancel');

        // Pre-fill from any existing data
        try {
            var existing = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            if (existing.name) nameInput.value = existing.name;
            var savedPhone = (localStorage.getItem('seasalt_phone') || '').replace(/^\+91/, '');
            if (savedPhone) phoneInput.value = savedPhone;
        } catch(e) {}

        function validate() {
            var name = nameInput.value.trim();
            var phone = phoneInput.value.replace(/\D/g, '');
            submitBtn.disabled = !(name.length >= 2 && phone.length >= 10);
        }

        nameInput.addEventListener('input', validate);
        phoneInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            validate();
        });

        function close() {
            overlay.remove();
            document.body.style.overflow = '';
        }

        cancelBtn.addEventListener('click', close);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });

        submitBtn.addEventListener('click', function() {
            var name = nameInput.value.trim();
            var phone = '+91' + phoneInput.value.replace(/\D/g, '');

            // Save to localStorage
            localStorage.setItem('seasalt_phone', phone);
            localStorage.setItem('seasalt_user', JSON.stringify({ name: name, phone: phone, country: 'India' }));

            // Sync to Store
            if (typeof Store !== 'undefined' && Store.setUser) {
                Store.setUser({ name: name, phone: phone, country: 'India' });
            }

            // Update analytics
            if (typeof Analytics !== 'undefined' && Analytics.linkPhone) {
                Analytics.linkPhone(phone);
            }

            // Sync to Supabase users table
            try {
                var SU = 'https://yosjbsncvghpscsrvxds.supabase.co';
                var SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
                fetch(SU + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
                    headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK }
                }).then(function(r) { return r.json(); }).then(function(users) {
                    if (users && users.length > 0) {
                        // Update existing
                        fetch(SU + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
                            method: 'PATCH',
                            headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                            body: JSON.stringify({ name: name, last_seen: new Date().toISOString() })
                        }).catch(function(){});
                    }
                    // If user name was found in Supabase, update local
                    if (users && users[0] && users[0].name && !name) {
                        var u = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                        u.name = users[0].name;
                        localStorage.setItem('seasalt_user', JSON.stringify(u));
                    }
                }).catch(function(){});
            } catch(e) {}

            close();
            
            if (typeof UI !== 'undefined' && UI.showToast) {
                UI.showToast('Welcome, ' + name + '!', 'success');
            }

            console.log('[AuthBridge] Simple login complete:', phone, name);
        });

        // Focus first empty field
        setTimeout(function() {
            if (!nameInput.value) nameInput.focus();
            else if (!phoneInput.value) phoneInput.focus();
        }, 300);
    }

    // ═══════════════════════════════════════════
    // 3. LISTEN FOR AUTH EVENTS FROM SPINWHEEL
    // ═══════════════════════════════════════════
    // When SpinWheel completes, it dispatches 'walletUpdated' event.
    // We use this to immediately sync login state.
    window.addEventListener('walletUpdated', function() {
        console.log('[AuthBridge] walletUpdated event — syncing login state');
        setTimeout(syncLoginState, 500);
    });

    // Also watch for localStorage changes (from spinwheel or firebase-auth in other tabs)
    window.addEventListener('storage', function(e) {
        if (e.key === 'seasalt_phone' || e.key === 'seasalt_user') {
            console.log('[AuthBridge] localStorage changed:', e.key, '— syncing');
            setTimeout(syncLoginState, 200);
        }
    });

    // ═══════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════
    function init() {
        ensureLoginAvailable();
        syncLoginState();
        console.log('[AuthBridge] v1 Ready');
    }

    // Run once after DOM and other scripts are loaded
    var _initialized = false;
    function initOnce() {
        if (_initialized) return;
        _initialized = true;
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initOnce, 300);
        });
    } else {
        setTimeout(initOnce, 300);
    }

    // Export for other modules
    window.AuthBridge = {
        sync: syncLoginState,
        showLogin: function() {
            if (typeof SeaSaltAuth !== 'undefined') SeaSaltAuth.showLogin();
            else showSimpleLogin();
        },
        isLoggedIn: function() {
            return !!(localStorage.getItem('seasalt_phone'));
        }
    };

})();
