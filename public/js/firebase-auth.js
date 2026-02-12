/**
 * SeaSalt Pickles - Firebase Phone OTP Authentication v2
 * =======================================================
 * CHANGES from v1:
 *  - reCAPTCHA is fully invisible (zero user interaction)
 *  - Always requires OTP on login (signs out Firebase session on load)
 *  - No auto-login from old sessions
 *  - Cleaned up flow
 * 
 * Add to index.html BEFORE app.js:
 *   <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
 *   <script src="js/firebase-auth.js"></script>
 */
(function() {
    'use strict';

    // ── Firebase Config ──
    var firebaseConfig = {
        apiKey: "AIzaSyBxFGj5F3JQw9RMYvRUqV18LGoZ62ereEE",
        authDomain: "seasaltpickles-c058e.firebaseapp.com",
        projectId: "seasaltpickles-c058e",
        storageBucket: "seasaltpickles-c058e.firebasestorage.app",
        messagingSenderId: "110925953869",
        appId: "1:110925953869:web:b47246f06a91ce1bf35504"
    };

    // ── Supabase Config (for syncing user) ──
    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';

    // ── Initialize Firebase ──
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    var auth = firebase.auth();
    auth.languageCode = 'en';

    // IMPORTANT: Always sign out Firebase on page load
    // This ensures OTP is ALWAYS required when user clicks "Login"
    // The user's "logged in" state is tracked via localStorage, NOT Firebase session
    auth.signOut().then(function() {
        console.log('[Auth] Firebase session cleared (OTP required every login)');
    }).catch(function() {});

    var confirmationResult = null;
    var recaptchaVerifier = null;
    var resendTimer = null;
    var resendCountdown = 0;

    // ── STYLES ──
    var STYLES = '.otp-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;visibility:hidden;transition:all 0.3s ease}' +
        '.otp-overlay.active{opacity:1;visibility:visible}' +
        '.otp-modal{background:white;border-radius:24px;width:100%;max-width:380px;padding:0;position:relative;transform:scale(0.9);transition:transform 0.3s ease;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden}' +
        '.otp-overlay.active .otp-modal{transform:scale(1)}' +
        '.otp-header{background:linear-gradient(135deg,#D4451A 0%,#B91C1C 100%);padding:28px 24px 24px;text-align:center;color:white}' +
        '.otp-header h2{margin:0 0 4px;font-size:22px;font-weight:800}' +
        '.otp-header p{margin:0;font-size:14px;opacity:0.9}' +
        '.otp-body{padding:24px}' +
        '.otp-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;color:white;font-size:18px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center}' +
        '.otp-input-group{margin-bottom:16px}' +
        '.otp-label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}' +
        '.otp-phone-row{display:flex;gap:8px}' +
        '.otp-prefix{width:70px;padding:14px 12px;border:2px solid #E5E7EB;border-radius:12px;font-size:16px;font-weight:700;color:#374151;text-align:center;background:#F9FAFB}' +
        '.otp-phone-input{flex:1;padding:14px 16px;border:2px solid #E5E7EB;border-radius:12px;font-size:16px;font-weight:500;color:#374151;outline:none;transition:border 0.2s}' +
        '.otp-phone-input:focus{border-color:#D4451A}' +
        '.otp-boxes{display:flex;gap:8px;justify-content:center;margin-bottom:16px}' +
        '.otp-box{width:48px;height:56px;border:2px solid #E5E7EB;border-radius:12px;font-size:24px;font-weight:700;text-align:center;color:#374151;outline:none;transition:border 0.2s}' +
        '.otp-box:focus{border-color:#D4451A;box-shadow:0 0 0 3px rgba(212,69,26,0.1)}' +
        '.otp-btn{width:100%;padding:16px;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s}' +
        '.otp-btn:disabled{opacity:0.6;cursor:not-allowed}' +
        '.otp-btn-primary{background:linear-gradient(135deg,#D4451A,#B91C1C);color:white;box-shadow:0 4px 15px rgba(212,69,26,0.3)}' +
        '.otp-btn-primary:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(212,69,26,0.4)}' +
        '.otp-error{background:#FEE2E2;color:#DC2626;padding:10px 14px;border-radius:10px;font-size:13px;text-align:center;margin-bottom:12px;display:none}' +
        '.otp-resend{text-align:center;margin-top:12px;font-size:13px;color:#6B7280}' +
        '.otp-resend-link{color:#D4451A;cursor:pointer;font-weight:600;background:none;border:none;font-size:13px}' +
        '.otp-resend-link:disabled{color:#9CA3AF;cursor:not-allowed}' +
        '.otp-change{text-align:center;margin-top:8px}' +
        '.otp-change-link{color:#6B7280;cursor:pointer;font-size:12px;background:none;border:none;text-decoration:underline}' +
        '.otp-name-input{width:100%;padding:14px 16px;border:2px solid #E5E7EB;border-radius:12px;font-size:16px;font-weight:500;color:#374151;outline:none;transition:border 0.2s;box-sizing:border-box}' +
        '.otp-name-input:focus{border-color:#D4451A}' +
        '.otp-success{text-align:center;padding:20px 0}' +
        '.otp-success-icon{font-size:60px;margin-bottom:12px}' +
        '.otp-success h3{margin:0 0 8px;font-size:20px;font-weight:800;color:#374151}' +
        '.otp-success p{margin:0;color:#6B7280;font-size:14px}';

    // Inject styles
    var styleEl = document.createElement('style');
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    // ── MODAL HTML ──
    function createModal() {
        var overlay = document.createElement('div');
        overlay.className = 'otp-overlay';
        overlay.id = 'otp-overlay';
        overlay.innerHTML = '<div class="otp-modal">' +
            '<button class="otp-close" id="otp-close">\u2715</button>' +

            // ── STEP 1: Phone Number ──
            '<div id="otp-step-phone">' +
            '<div class="otp-header"><h2>\uD83C\uDF36\uFE0F Welcome!</h2><p>Sign in with your phone number</p></div>' +
            '<div class="otp-body">' +
            '<div class="otp-error" id="otp-error-phone"></div>' +
            '<div class="otp-input-group">' +
            '<label class="otp-label">Phone Number</label>' +
            '<div class="otp-phone-row">' +
            '<input type="text" class="otp-prefix" value="+91" readonly>' +
            '<input type="tel" id="otp-phone" class="otp-phone-input" placeholder="Enter 10-digit number" maxlength="10" inputmode="numeric">' +
            '</div></div>' +
            '<div id="recaptcha-container"></div>' +
            '<button id="otp-send-btn" class="otp-btn otp-btn-primary">Send OTP</button>' +
            '</div></div>' +

            // ── STEP 2: OTP Verification ──
            '<div id="otp-step-verify" style="display:none;">' +
            '<div class="otp-header"><h2>\uD83D\uDD12 Verify OTP</h2><p id="otp-sent-to">OTP sent to +91 XXXXXXXXXX</p></div>' +
            '<div class="otp-body">' +
            '<div class="otp-error" id="otp-error-verify"></div>' +
            '<label class="otp-label" style="text-align:center;margin-bottom:12px;">Enter 6-digit OTP</label>' +
            '<div class="otp-boxes">' +
            '<input type="tel" class="otp-box" maxlength="1" inputmode="numeric">' +
            '<input type="tel" class="otp-box" maxlength="1" inputmode="numeric">' +
            '<input type="tel" class="otp-box" maxlength="1" inputmode="numeric">' +
            '<input type="tel" class="otp-box" maxlength="1" inputmode="numeric">' +
            '<input type="tel" class="otp-box" maxlength="1" inputmode="numeric">' +
            '<input type="tel" class="otp-box" maxlength="1" inputmode="numeric">' +
            '</div>' +
            '<button id="otp-verify-btn" class="otp-btn otp-btn-primary">Verify & Login</button>' +
            '<div class="otp-resend"><span id="otp-resend-timer"></span> <button id="otp-resend-btn" class="otp-resend-link" disabled>Resend OTP</button></div>' +
            '<div class="otp-change"><button id="otp-change-btn" class="otp-change-link">Change phone number</button></div>' +
            '</div></div>' +

            // ── STEP 3: Name (first time users) ──
            '<div id="otp-step-name" style="display:none;">' +
            '<div class="otp-header"><h2>\uD83C\uDF89 Almost Done!</h2><p>Tell us your name</p></div>' +
            '<div class="otp-body">' +
            '<div class="otp-input-group">' +
            '<label class="otp-label">Your Name</label>' +
            '<input type="text" id="otp-name" class="otp-name-input" placeholder="Enter your full name">' +
            '</div>' +
            '<button id="otp-save-name-btn" class="otp-btn otp-btn-primary">Continue Shopping \uD83D\uDED2</button>' +
            '</div></div>' +

            // ── STEP 4: Success ──
            '<div id="otp-step-success" style="display:none;">' +
            '<div class="otp-header"><h2>Welcome Back!</h2><p>You\'re all set</p></div>' +
            '<div class="otp-body">' +
            '<div class="otp-success">' +
            '<div class="otp-success-icon">\u2705</div>' +
            '<h3 id="otp-welcome-name">Welcome!</h3>' +
            '<p>You\'re now logged in</p>' +
            '</div>' +
            '<button id="otp-continue-btn" class="otp-btn otp-btn-primary">Continue Shopping \uD83D\uDED2</button>' +
            '</div></div>' +

            '</div>';

        document.body.appendChild(overlay);
        return overlay;
    }

    // ── SHOW/HIDE MODAL ──
    function showModal() {
        // Remove old modal if exists (fresh start every time)
        var oldOverlay = document.getElementById('otp-overlay');
        if (oldOverlay) oldOverlay.remove();

        // Reset recaptcha verifier
        recaptchaVerifier = null;
        confirmationResult = null;

        var overlay = createModal();
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        showStep('phone');
        bindEvents();

        // Pre-fill phone from localStorage (just the number, not auto-login)
        var phoneInput = document.getElementById('otp-phone');
        var savedPhone = localStorage.getItem('seasalt_phone') || '';
        savedPhone = savedPhone.replace(/^\+91/, '').replace(/\D/g, '');
        if (savedPhone.length === 10 && phoneInput) phoneInput.value = savedPhone;

        // Init invisible reCAPTCHA after DOM is ready
        setTimeout(function() {
            initRecaptcha();
            if (phoneInput && !phoneInput.value) phoneInput.focus();
        }, 300);
    }

    function hideModal() {
        var overlay = document.getElementById('otp-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(function() { overlay.remove(); }, 300);
            document.body.style.overflow = '';
        }
        clearInterval(resendTimer);
        // Sign out Firebase session (so OTP is always required next time)
        auth.signOut().catch(function() {});
    }

    function showStep(step) {
        ['phone', 'verify', 'name', 'success'].forEach(function(s) {
            var el = document.getElementById('otp-step-' + s);
            if (el) el.style.display = s === step ? '' : 'none';
        });
    }

    function showError(stepId, msg) {
        var el = document.getElementById('otp-error-' + stepId);
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }

    function hideError(stepId) {
        var el = document.getElementById('otp-error-' + stepId);
        if (el) el.style.display = 'none';
    }

    // ── RECAPTCHA (fully invisible - zero user interaction) ──
    function initRecaptcha() {
        try {
            recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                size: 'invisible',
                callback: function() {
                    console.log('[Auth] reCAPTCHA auto-solved (invisible)');
                },
                'expired-callback': function() {
                    console.log('[Auth] reCAPTCHA expired, resetting');
                    recaptchaVerifier = null;
                }
            });
            recaptchaVerifier.render().then(function(widgetId) {
                console.log('[Auth] Invisible reCAPTCHA ready (widget:', widgetId, ')');
            });
        } catch (e) {
            console.error('[Auth] reCAPTCHA init error:', e);
        }
    }

    // ── SEND OTP ──
    function sendOTP() {
        var phoneInput = document.getElementById('otp-phone');
        var sendBtn = document.getElementById('otp-send-btn');
        var phone = phoneInput.value.replace(/\D/g, '');
        hideError('phone');

        if (phone.length !== 10) {
            showError('phone', 'Please enter a valid 10-digit phone number');
            return;
        }

        var fullPhone = '+91' + phone;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending OTP...';

        // Ensure reCAPTCHA is ready
        if (!recaptchaVerifier) {
            initRecaptcha();
            setTimeout(function() { doSendOTP(fullPhone, phone, sendBtn); }, 500);
        } else {
            doSendOTP(fullPhone, phone, sendBtn);
        }
    }

    function doSendOTP(fullPhone, phone, sendBtn) {
        auth.signInWithPhoneNumber(fullPhone, recaptchaVerifier)
            .then(function(result) {
                confirmationResult = result;
                console.log('[Auth] OTP sent to', fullPhone);

                // Show verify step
                document.getElementById('otp-sent-to').textContent = 'OTP sent to +91 ' + phone.slice(0,3) + '****' + phone.slice(7);
                showStep('verify');
                startResendTimer();

                // Focus first OTP box
                var boxes = document.querySelectorAll('.otp-box');
                if (boxes[0]) boxes[0].focus();

                sendBtn.disabled = false;
                sendBtn.textContent = 'Send OTP';
            })
            .catch(function(error) {
                console.error('[Auth] Send OTP error:', error);
                var msg = 'Failed to send OTP. Please try again.';
                if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Please wait a few minutes and try again.';
                if (error.code === 'auth/invalid-phone-number') msg = 'Invalid phone number. Please check and try again.';
                if (error.code === 'auth/captcha-check-failed') msg = 'Verification failed. Please refresh the page and try again.';
                showError('phone', msg);
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send OTP';

                // Reset reCAPTCHA for retry
                recaptchaVerifier = null;
                var container = document.getElementById('recaptcha-container');
                if (container) container.innerHTML = '';
                setTimeout(initRecaptcha, 300);
            });
    }

    // ── VERIFY OTP ──
    function verifyOTP() {
        var verifyBtn = document.getElementById('otp-verify-btn');
        var boxes = document.querySelectorAll('.otp-box');
        var otp = '';
        boxes.forEach(function(b) { otp += b.value; });
        hideError('verify');

        if (otp.length !== 6) {
            showError('verify', 'Please enter the complete 6-digit OTP');
            return;
        }

        if (!confirmationResult) {
            showError('verify', 'Session expired. Please request a new OTP.');
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';

        confirmationResult.confirm(otp)
            .then(function(result) {
                var user = result.user;
                console.log('[Auth] User verified:', user.uid, user.phoneNumber);
                handleAuthSuccess(user);
            })
            .catch(function(error) {
                console.error('[Auth] Verify error:', error);
                var msg = 'Invalid OTP. Please try again.';
                if (error.code === 'auth/code-expired') msg = 'OTP expired. Please request a new one.';
                showError('verify', msg);
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify & Login';
                boxes.forEach(function(b) { b.value = ''; });
                if (boxes[0]) boxes[0].focus();
            });
    }

    // ── AUTH SUCCESS ──
    function handleAuthSuccess(firebaseUser) {
        var phone = firebaseUser.phoneNumber || '';
        var cleanPhone = phone.replace(/^\+91/, '');

        // Check if we already have user name from localStorage
        var savedUser = {};
        try { savedUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) {}
        var existingName = savedUser.name || '';

        // Save phone to localStorage (this is what the app uses for "logged in" state)
        localStorage.setItem('seasalt_phone', phone);
        savedUser.phone = phone;
        savedUser.firebaseUid = firebaseUser.uid;
        localStorage.setItem('seasalt_user', JSON.stringify(savedUser));

        // Sync to Supabase
        syncUserToSupabase(phone, existingName, firebaseUser.uid);

        if (existingName && existingName !== 'User' && existingName.trim() !== '') {
            // Returning user — show success
            document.getElementById('otp-welcome-name').textContent = 'Welcome, ' + existingName + '!';
            showStep('success');
            setTimeout(function() {
                hideModal();
                if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('Welcome back, ' + existingName + '!', 'success');
            }, 1500);
        } else {
            // New user — ask for name
            showStep('name');
            setTimeout(function() {
                var nameInput = document.getElementById('otp-name');
                if (nameInput) nameInput.focus();
            }, 300);
        }
    }

    // ── SAVE NAME ──
    function saveName() {
        var nameInput = document.getElementById('otp-name');
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) { nameInput.style.borderColor = '#EF4444'; return; }

        var savedUser = {};
        try { savedUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) {}
        savedUser.name = name;
        localStorage.setItem('seasalt_user', JSON.stringify(savedUser));

        // Update Supabase with name
        syncUserToSupabase(savedUser.phone, name, savedUser.firebaseUid);

        document.getElementById('otp-welcome-name').textContent = 'Welcome, ' + name + '!';
        showStep('success');
        setTimeout(function() {
            hideModal();
            if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('Welcome, ' + name + '!', 'success');
        }, 1500);
    }

    // ── SUPABASE SYNC ──
    function syncUserToSupabase(phone, name, firebaseUid) {
        if (!phone) return;

        fetch(SUPABASE_URL + '/rest/v1/customers?phone=eq.' + encodeURIComponent(phone), {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        })
        .then(function(r) { return r.json(); })
        .then(function(customers) {
            if (customers && customers.length > 0) {
                var id = customers[0].id;
                var updateData = { firebase_uid: firebaseUid, last_login: new Date().toISOString() };
                if (name) updateData.name = name;
                fetch(SUPABASE_URL + '/rest/v1/customers?id=eq.' + id, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                    body: JSON.stringify(updateData)
                }).catch(function(e) { console.warn('[Auth] Supabase update error:', e); });
            } else {
                fetch(SUPABASE_URL + '/rest/v1/customers', {
                    method: 'POST',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ phone: phone, name: name || 'Customer', firebase_uid: firebaseUid, created_at: new Date().toISOString(), last_login: new Date().toISOString() })
                }).catch(function(e) { console.warn('[Auth] Supabase insert error:', e); });
            }
        })
        .catch(function(e) { console.warn('[Auth] Supabase sync error:', e); });

        console.log('[Auth] Synced to Supabase:', phone, name);
    }

    // ── RESEND TIMER ──
    function startResendTimer() {
        resendCountdown = 30;
        var timerEl = document.getElementById('otp-resend-timer');
        var resendBtn = document.getElementById('otp-resend-btn');
        resendBtn.disabled = true;

        clearInterval(resendTimer);
        resendTimer = setInterval(function() {
            resendCountdown--;
            if (timerEl) timerEl.textContent = resendCountdown > 0 ? 'Resend in ' + resendCountdown + 's' : '';
            if (resendCountdown <= 0) {
                clearInterval(resendTimer);
                resendBtn.disabled = false;
            }
        }, 1000);
        if (timerEl) timerEl.textContent = 'Resend in 30s';
    }

    // ── BIND EVENTS ──
    function bindEvents() {
        // Close
        document.getElementById('otp-close').addEventListener('click', hideModal);
        document.getElementById('otp-overlay').addEventListener('click', function(e) {
            if (e.target === this) hideModal();
        });

        // Send OTP
        document.getElementById('otp-send-btn').addEventListener('click', sendOTP);
        document.getElementById('otp-phone').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') sendOTP();
        });
        document.getElementById('otp-phone').addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });

        // Verify OTP
        document.getElementById('otp-verify-btn').addEventListener('click', verifyOTP);

        // OTP box auto-advance
        var boxes = document.querySelectorAll('.otp-box');
        boxes.forEach(function(box, i) {
            box.addEventListener('input', function(e) {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
                if (e.target.value && i < boxes.length - 1) boxes[i + 1].focus();
                var otp = '';
                boxes.forEach(function(b) { otp += b.value; });
                if (otp.length === 6) setTimeout(verifyOTP, 100);
            });
            box.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !e.target.value && i > 0) boxes[i - 1].focus();
                if (e.key === 'Enter') verifyOTP();
            });
            box.addEventListener('paste', function(e) {
                e.preventDefault();
                var pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
                for (var j = 0; j < pastedData.length && (i + j) < boxes.length; j++) {
                    boxes[i + j].value = pastedData[j];
                }
                if (pastedData.length === 6) setTimeout(verifyOTP, 100);
            });
        });

        // Resend
        document.getElementById('otp-resend-btn').addEventListener('click', function() {
            recaptchaVerifier = null;
            var container = document.getElementById('recaptcha-container');
            if (container) container.innerHTML = '';
            initRecaptcha();
            setTimeout(sendOTP, 500);
        });

        // Change number
        document.getElementById('otp-change-btn').addEventListener('click', function() {
            showStep('phone');
            recaptchaVerifier = null;
            var container = document.getElementById('recaptcha-container');
            if (container) container.innerHTML = '';
            setTimeout(function() {
                initRecaptcha();
                var phoneInput = document.getElementById('otp-phone');
                if (phoneInput) phoneInput.focus();
            }, 300);
        });

        // Save name
        document.getElementById('otp-save-name-btn').addEventListener('click', saveName);
        document.getElementById('otp-name').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') saveName();
        });

        // Continue shopping
        document.getElementById('otp-continue-btn').addEventListener('click', function() {
            hideModal();
        });
    }

    // ── LOGOUT ──
    function logout() {
        return auth.signOut().then(function() {
            console.log('[Auth] Firebase signed out');
        }).catch(function(e) { console.warn('[Auth] Signout error:', e); });
    }

    // ── PUBLIC API ──
    window.SeaSaltAuth = {
        showLogin: showModal,
        logout: logout,
        isLoggedIn: function() {
            var phone = localStorage.getItem('seasalt_phone');
            return !!phone;
        },
        getUser: function() {
            try { return JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) { return {}; }
        },
        getPhone: function() { return localStorage.getItem('seasalt_phone') || ''; }
    };

    // ── INIT ──
    console.log('[Auth] Firebase Phone Auth v2 initialized (OTP always required)');

})();
