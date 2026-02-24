/**
 * SeaSalt Pickles - Auth Bridge v1.3
 * =================================
 * v1.3: Fixed wallet doubling — Supabase balance is TOTAL, not additive with spin reward
 *       Added deduction guard (pauses sync during checkout)
 *       Properly separates spin vs admin credits from server balance
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
    var fabStyle = document.createElement('style');
    fabStyle.textContent = '#cart-fab { bottom: 150px !important; }';
    document.head.appendChild(fabStyle);

    // ═══════════════════════════════════════════
    // FIX: Wallet timer — catch old 30-day wallets showing 700+ hrs
    // With new 48hr admin credits, this is mainly for cleanup
    // ═══════════════════════════════════════════
    function checkAndFixExpiry() {
        // Fix any old admin credits that had 30-day expiry
        var adminCredit = null;
        try { adminCredit = JSON.parse(localStorage.getItem('seasalt_admin_credit') || 'null'); } catch(e) {}
        if (adminCredit && adminCredit.expiresAt) {
            var hoursLeft = (new Date(adminCredit.expiresAt).getTime() - Date.now()) / (60*60*1000);
            if (hoursLeft > 48) {
                // Old 30-day expiry — cap it to 48hrs from now
                adminCredit.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
                localStorage.setItem('seasalt_admin_credit', JSON.stringify(adminCredit));
                console.log('[AuthBridge] Fixed old admin credit expiry to 48hrs');
            }
            if (hoursLeft <= 0) {
                // Expired — remove it
                localStorage.removeItem('seasalt_admin_credit');
                console.log('[AuthBridge] Admin credit expired, removed');
                // Recalculate total wallet
                recalcWallet();
            }
        }

        // Also fix seasalt_spin_wallet if it shows admin credit with wrong expiry
        var wallet = null;
        try { wallet = JSON.parse(localStorage.getItem('seasalt_spin_wallet') || 'null'); } catch(e) {}
        if (wallet && wallet.expiresAt) {
            var walletHoursLeft = (new Date(wallet.expiresAt).getTime() - Date.now()) / (60*60*1000);
            // If expiry > 48hrs AND there's an admin credit, the combined wallet has wrong expiry
            if (walletHoursLeft > 48 && adminCredit) {
                wallet.expiresAt = adminCredit.expiresAt;
                localStorage.setItem('seasalt_spin_wallet', JSON.stringify(wallet));
            }
        }
    }

    function recalcWallet() {
        var spinReward = null;
        try { spinReward = JSON.parse(localStorage.getItem('seasalt_spin_reward') || 'null'); } catch(e) {}
        var spinBalance = 0;
        if (spinReward && spinReward.expiresAt && new Date(spinReward.expiresAt) > new Date()) {
            spinBalance = parseFloat(spinReward.amount) || 0;
        }

        var adminCredit = null;
        try { adminCredit = JSON.parse(localStorage.getItem('seasalt_admin_credit') || 'null'); } catch(e) {}
        var adminBalance = 0;
        if (adminCredit && adminCredit.expiresAt && new Date(adminCredit.expiresAt) > new Date()) {
            adminBalance = parseFloat(adminCredit.amount) || 0;
        }

        var total = spinBalance + adminBalance;
        if (total > 0) {
            var expiry = (adminBalance > 0 && adminCredit) ? adminCredit.expiresAt :
                         (spinReward ? spinReward.expiresAt : null);
            var walletData = { amount: total, expiresAt: expiry, source: 'combined' };
            localStorage.setItem('seasalt_spin_wallet', JSON.stringify(walletData));
            applyWalletToUI(walletData);
        } else {
            localStorage.removeItem('seasalt_spin_wallet');
            applyWalletToUI({ amount: 0, expiresAt: null });
        }
    }

    // Check expiry every 30 seconds to auto-remove expired credits
    setTimeout(checkAndFixExpiry, 500);
    setInterval(function() {
        var adminCredit = null;
        try { adminCredit = JSON.parse(localStorage.getItem('seasalt_admin_credit') || 'null'); } catch(e) {}
        if (adminCredit && adminCredit.expiresAt && new Date(adminCredit.expiresAt) <= new Date()) {
            localStorage.removeItem('seasalt_admin_credit');
            recalcWallet();
            console.log('[AuthBridge] Admin credit expired — wallet updated');
        }
    }, 30000);

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

        // CRITICAL: Don't sync if cart.js just deducted wallet
        if (window._walletSyncPaused) {
            console.log('[AuthBridge] Wallet sync paused (order in progress)');
            return;
        }
        var lastDeduction = window._walletLastDeductedAt || 0;
        if (Date.now() - lastDeduction < 30000) {
            console.log('[AuthBridge] Wallet sync skipped (recent deduction)');
            return;
        }

        // Try with exact phone first, then try variants
        var variants = [phone];
        if (phone.startsWith('+91')) variants.push(phone.replace('+91', ''));
        if (!phone.startsWith('+')) variants.push('+91' + phone);

        function tryFetch(idx) {
            if (idx >= variants.length) return;
            var p = variants[idx];

            fetch(SU + '/rest/v1/users?phone=eq.' + encodeURIComponent(p) + '&select=wallet_balance,wallet_expires_at,name', {
                headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK }
            }).then(function(r) { return r.json(); }).then(function(users) {
                if (!users || !users.length || !users[0]) {
                    tryFetch(idx + 1);
                    return;
                }

                var user = users[0];
                var supabaseBalance = parseFloat(user.wallet_balance) || 0;
                var supabaseExpiry = user.wallet_expires_at || null;

                // ══════════════════════════════════════════
                // 3-KEY WALLET ARCHITECTURE (v1.3 — fixed doubling)
                //
                // seasalt_spin_reward  = spin prize only (set by spinwheel.js)
                // seasalt_admin_credit = admin-added credit (set here from Supabase)
                // seasalt_spin_wallet  = DISPLAY TOTAL (set here, read by UI)
                //
                // RULE: Supabase wallet_balance is the TOTAL (spin + admin).
                // We do NOT add spin + supabase. We use the HIGHER of:
                //   - local spin_reward (if Supabase hasn't synced yet)
                //   - Supabase balance (source of truth once synced)
                // ══════════════════════════════════════════

                // Read ORIGINAL spin reward
                var spinReward = null;
                try { spinReward = JSON.parse(localStorage.getItem('seasalt_spin_reward') || 'null'); } catch(e) {}
                var spinBalance = 0;
                if (spinReward && spinReward.amount) {
                    if (spinReward.expiresAt && new Date(spinReward.expiresAt) > new Date()) {
                        spinBalance = parseFloat(spinReward.amount) || 0;
                    } else {
                        localStorage.removeItem('seasalt_spin_reward');
                    }
                }

                // Read existing admin credit
                var adminCredit = null;
                try { adminCredit = JSON.parse(localStorage.getItem('seasalt_admin_credit') || 'null'); } catch(e) {}
                var adminBalance = 0;
                if (adminCredit && adminCredit.amount) {
                    if (adminCredit.expiresAt && new Date(adminCredit.expiresAt) > new Date()) {
                        adminBalance = parseFloat(adminCredit.amount) || 0;
                    } else {
                        localStorage.removeItem('seasalt_admin_credit');
                        adminBalance = 0;
                    }
                }

                // Detect if Supabase has MORE than just the spin reward
                // If supabaseBalance > spinBalance, the difference is admin credit
                var adminCreditFromServer = 0;
                if (supabaseBalance > spinBalance) {
                    adminCreditFromServer = supabaseBalance - spinBalance;
                } else if (supabaseBalance > 0 && spinBalance === 0) {
                    // No local spin, supabase has balance — could be admin credit or synced spin
                    adminCreditFromServer = supabaseBalance;
                }

                // Only update admin credit if server shows new/different amount
                if (adminCreditFromServer > 0 && adminCreditFromServer !== adminBalance) {
                    var adminExpiry = supabaseExpiry ? supabaseExpiry : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
                    // Cap admin credit expiry to 48hrs
                    var adminExpDate = new Date(adminExpiry);
                    var maxExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
                    if (adminExpDate > maxExpiry) adminExpiry = maxExpiry.toISOString();
                    
                    localStorage.setItem('seasalt_admin_credit', JSON.stringify({
                        amount: adminCreditFromServer,
                        expiresAt: adminExpiry,
                        source: 'admin'
                    }));
                    adminBalance = adminCreditFromServer;
                }

                // Write COMBINED display wallet
                // Total = spin reward + admin credit (NOT supabase, to avoid double counting)
                var total = spinBalance + adminBalance;
                
                // Safety: total should never exceed supabase balance (if supabase is source of truth)
                if (supabaseBalance > 0 && total > supabaseBalance) {
                    total = supabaseBalance;
                }
                
                if (total > 0) {
                    // Use the EARLIEST expiry for display
                    var expiry = null;
                    if (spinReward && spinReward.expiresAt && new Date(spinReward.expiresAt) > new Date()) {
                        expiry = spinReward.expiresAt;
                    }
                    if (adminBalance > 0) {
                        var ac = null;
                        try { ac = JSON.parse(localStorage.getItem('seasalt_admin_credit') || 'null'); } catch(e) {}
                        if (ac && ac.expiresAt) {
                            if (!expiry || new Date(ac.expiresAt) < new Date(expiry)) {
                                expiry = ac.expiresAt;
                            }
                        }
                    }
                    if (!expiry) expiry = new Date(Date.now() + 48*60*60*1000).toISOString();
                    
                    var walletData = { amount: total, expiresAt: expiry, source: 'combined' };
                    localStorage.setItem('seasalt_spin_wallet', JSON.stringify(walletData));
                    applyWalletToUI(walletData);
                } else if (supabaseBalance <= 0) {
                    // Server says 0 and no local rewards — clear everything
                    localStorage.removeItem('seasalt_spin_wallet');
                    localStorage.removeItem('seasalt_admin_credit');
                    applyWalletToUI({ amount: 0, expiresAt: null });
                }

                // Sync name
                if (user.name) {
                    try {
                        var u = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
                        if (!u.name) { u.name = user.name; u.phone = phone; localStorage.setItem('seasalt_user', JSON.stringify(u)); }
                    } catch(e) {}
                }

                console.log('[AuthBridge] Wallet sync done — spin:₹' + spinBalance + ' admin:₹' + adminBalance + ' total:₹' + total + ' supabase:₹' + supabaseBalance);

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
        // NOTE: Do NOT dispatch walletUpdated here — it causes infinite loop
        // (applyWalletToUI → walletUpdated → syncLoginState → syncWallet → applyWalletToUI)
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
    var _lastWalletSync = 0;
    window.addEventListener('walletUpdated', function() {
        // Debounce: only sync once per 5 seconds to prevent loops
        if (Date.now() - _lastWalletSync < 5000) return;
        _lastWalletSync = Date.now();
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
