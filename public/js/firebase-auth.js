/**
 * SeaSalt Pickles - Firebase Phone OTP Authentication v1
 * =======================================================
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
        '.otp-success p{margin:0;color:#6B7280;font-size:14px}' +
        '.otp-logged-in{display:flex;align-items:center;gap:8px;cursor:pointer}' +
        '.otp-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#D4451A,#B91C1C);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}' +
        '#recaptcha-container{margin-bottom:12px}' +
        '#recaptcha-container > div{margin:0 auto}';

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
        var overlay = document.getElementById('otp-overlay') || createModal();
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        showStep('phone');
        initRecaptcha();
        bindEvents();

        var phoneInput = document.getElementById('otp-phone');
        // Pre-fill phone from localStorage
        var savedPhone = localStorage.getItem('seasalt_phone') || '';
        savedPhone = savedPhone.replace(/^\+91/, '').replace(/\D/g, '');
        if (savedPhone.length === 10 && phoneInput) phoneInput.value = savedPhone;

        setTimeout(function() { if (phoneInput && !phoneInput.value) phoneInput.focus(); }, 300);
    }

    function hideModal() {
        var overlay = document.getElementById('otp-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        clearInterval(resendTimer);
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

    // ── RECAPTCHA ──
    function initRecaptcha() {
        if (recaptchaVerifier) return;
        try {
            recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                size: 'invisible',
                callback: function() { console.log('[Auth] reCAPTCHA solved'); }
            });
            recaptchaVerifier.render().then(function() {
                console.log('[Auth] reCAPTCHA rendered');
            });
        } catch (e) {
            console.error('[Auth] reCAPTCHA error:', e);
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

        if (!recaptchaVerifier) initRecaptcha();

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
                if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Please wait a few minutes.';
                if (error.code === 'auth/invalid-phone-number') msg = 'Invalid phone number. Please check and try again.';
                if (error.code === 'auth/captcha-check-failed') msg = 'reCAPTCHA failed. Please refresh the page.';
                showError('phone', msg);
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send OTP';

                // Reset reCAPTCHA
                try { recaptchaVerifier = null; initRecaptcha(); } catch(e) {}
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
                // Clear boxes
                boxes.forEach(function(b) { b.value = ''; });
                if (boxes[0]) boxes[0].focus();
            });
    }

    // ── AUTH SUCCESS ──
    function handleAuthSuccess(firebaseUser) {
        var phone = firebaseUser.phoneNumber || '';
        var cleanPhone = phone.replace(/^\+91/, '');

        // Check if we already have user name
        var savedUser = {};
        try { savedUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) {}
        var existingName = savedUser.name || '';

        // Save phone to localStorage
        localStorage.setItem('seasalt_phone', phone);
        savedUser.phone = phone;
        savedUser.firebaseUid = firebaseUser.uid;
        localStorage.setItem('seasalt_user', JSON.stringify(savedUser));

        // Sync to Supabase
        syncUserToSupabase(phone, existingName, firebaseUser.uid);

        if (existingName) {
            // Returning user — show success
            document.getElementById('otp-welcome-name').textContent = 'Welcome, ' + existingName + '!';
            showStep('success');
            updateUILoggedIn(existingName, cleanPhone);
            setTimeout(hideModal, 1500);
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

        var cleanPhone = (savedUser.phone || '').replace(/^\+91/, '');

        // Update Supabase with name
        syncUserToSupabase(savedUser.phone, name, savedUser.firebaseUid);

        document.getElementById('otp-welcome-name').textContent = 'Welcome, ' + name + '!';
        showStep('success');
        updateUILoggedIn(name, cleanPhone);
        setTimeout(hideModal, 1500);
    }

    // ── SUPABASE SYNC ──
    function syncUserToSupabase(phone, name, firebaseUid) {
        if (!phone) return;
        var cleanPhone = phone.replace(/^\+91/, '');
        var phoneVariants = [phone, cleanPhone, '91' + cleanPhone];

        // Check if user exists in customers table
        fetch(SUPABASE_URL + '/rest/v1/customers?or=(phone.eq.' + encodeURIComponent(phone) + ',phone.eq.' + encodeURIComponent(cleanPhone) + ')', {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        })
        .then(function(r) { return r.json(); })
        .then(function(customers) {
            if (customers && customers.length > 0) {
                // Update existing
                var id = customers[0].id;
                var updateData = { firebase_uid: firebaseUid, last_login: new Date().toISOString() };
                if (name) updateData.name = name;
                fetch(SUPABASE_URL + '/rest/v1/customers?id=eq.' + id, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                    body: JSON.stringify(updateData)
                }).catch(function(e) { console.warn('[Auth] Supabase update error:', e); });
            } else {
                // Insert new customer
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

    // ── UPDATE UI ──
    function updateUILoggedIn(name, phone) {
        // Update profile section if exists
        var profileName = document.getElementById('profile-name') || document.querySelector('.profile-name');
        if (profileName) profileName.textContent = name;

        var profilePhone = document.getElementById('profile-phone') || document.querySelector('.profile-phone');
        if (profilePhone) profilePhone.textContent = '+91 ' + phone;

        // Update login button to show user avatar
        var loginBtns = document.querySelectorAll('#login-btn, .login-btn, [data-action="login"]');
        loginBtns.forEach(function(btn) {
            var initial = name ? name.charAt(0).toUpperCase() : 'U';
            btn.innerHTML = '<div class="otp-logged-in"><div class="otp-avatar">' + initial + '</div></div>';
            btn.title = name + ' (' + phone + ')';
        });

        // Update Store if available
        if (typeof Store !== 'undefined' && Store.setState) {
            try { Store.setState({ user: { name: name, phone: '+91' + phone } }); } catch(e) {}
        }

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { name: name, phone: phone } }));
        console.log('[Auth] UI updated for:', name);
    }

    // ── BIND EVENTS ──
    var eventsBound = false;
    function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;

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
        // Phone input filter
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
                // Auto-verify when all 6 digits entered
                var otp = '';
                boxes.forEach(function(b) { otp += b.value; });
                if (otp.length === 6) verifyOTP();
            });
            box.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !e.target.value && i > 0) boxes[i - 1].focus();
                if (e.key === 'Enter') verifyOTP();
            });
            // Handle paste
            box.addEventListener('paste', function(e) {
                e.preventDefault();
                var pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
                for (var j = 0; j < pastedData.length && (i + j) < boxes.length; j++) {
                    boxes[i + j].value = pastedData[j];
                }
                if (pastedData.length === 6) verifyOTP();
            });
        });

        // Resend
        document.getElementById('otp-resend-btn').addEventListener('click', function() {
            showStep('phone');
            recaptchaVerifier = null;
            initRecaptcha();
        });

        // Change number
        document.getElementById('otp-change-btn').addEventListener('click', function() {
            showStep('phone');
            recaptchaVerifier = null;
            initRecaptcha();
        });

        // Save name
        document.getElementById('otp-save-name-btn').addEventListener('click', saveName);
        document.getElementById('otp-name').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') saveName();
        });

        // Continue shopping
        document.getElementById('otp-continue-btn').addEventListener('click', hideModal);
    }

    // ── CHECK EXISTING AUTH STATE ──
    function checkAuthState() {
        auth.onAuthStateChanged(function(user) {
            if (user && user.phoneNumber) {
                console.log('[Auth] User already logged in:', user.phoneNumber);
                var savedUser = {};
                try { savedUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) {}
                var name = savedUser.name || '';
                var phone = user.phoneNumber.replace(/^\+91/, '');

                if (name) {
                    updateUILoggedIn(name, phone);
                }

                // Save/update localStorage
                savedUser.phone = user.phoneNumber;
                savedUser.firebaseUid = user.uid;
                localStorage.setItem('seasalt_user', JSON.stringify(savedUser));
                localStorage.setItem('seasalt_phone', user.phoneNumber);
            }
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
        isLoggedIn: function() { return !!auth.currentUser; },
        getUser: function() {
            try { return JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) { return {}; }
        },
        getPhone: function() { return localStorage.getItem('seasalt_phone') || ''; }
    };

    // ── INIT ──
    function init() {
        // Check auth state on load
        checkAuthState();
        console.log('[Auth] Firebase Phone Auth initialized');
    }

    // Wait for DOM
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 100);
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

})();
