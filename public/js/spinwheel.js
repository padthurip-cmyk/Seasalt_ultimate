// spinwheel.js v17 - SeaSalt Pickles
// Pickle/Orange Theme + Visible Prizes + Phone Capture + Supabase Sync
// Date: February 8, 2026

(function() {
    'use strict';

    // ==================== CONFIG ====================
    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNTIzNTEsImV4cCI6MjA1MzYyODM1MX0.LPSwMPKBiMxMTmHOVJxWBbS8kgGDo4RaPNCR63P55Cw';
    var SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    var WALLET_EXPIRY_HOURS = 48;

    // ==================== THEME COLORS ====================
    var THEME = {
        primaryOrange: '#D4451A',
        darkOrange: '#B91C1C',
        pickleGreen: '#166534',
        lightGreen: '#16A34A',
        backgroundCream: '#FFF7ED',
        lightOrange: '#FDBA74',
        textBrown: '#7C2D12',
        accentOrange: '#EA580C',
        warmWhite: '#FFFBF5',
        deepRed: '#DC2626',
        gold: '#F59E0B',
        softShadow: 'rgba(212, 69, 26, 0.15)'
    };

    // Wheel segment colors (alternating to match app palette)
    var SEGMENT_COLORS = [
        { bg: '#DC2626', text: '#FFFFFF' },  // ₹99 - Red
        { bg: '#16A34A', text: '#FFFFFF' },  // ₹199 - Green
        { bg: '#EA580C', text: '#FFFFFF' },  // ₹299 - Orange
        { bg: '#166534', text: '#FFFFFF' },  // ₹399 - Dark Green
        { bg: '#B91C1C', text: '#FFFFFF' },  // ₹499 - Dark Red
        { bg: '#F59E0B', text: '#FFFFFF' }   // ₹599 - Gold
    ];

    var PRIZES = [
        { value: 99, label: '₹99' },
        { value: 199, label: '₹199' },
        { value: 299, label: '₹299' },
        { value: 399, label: '₹399' },
        { value: 499, label: '₹499' },
        { value: 599, label: '₹599' }
    ];

    // ==================== PRIZE ODDS ENGINE ====================
    // Deep probabilistic model with cumulative distribution
    function calculatePrize() {
        var rand = Math.random();

        // Cumulative probability thresholds
        // ₹599: 0.5% (1 in 200)
        if (rand < 0.005) return { value: 599, segmentIndex: 5 };

        // ₹499: 0.67% (1 in 150)
        if (rand < 0.0117) return { value: 499, segmentIndex: 4 };

        // ₹399: 1% (1 in 100)
        if (rand < 0.0217) return { value: 399, segmentIndex: 3 };

        // ₹299: 2% (1 in 50)
        if (rand < 0.0417) return { value: 299, segmentIndex: 2 };

        // ₹199: 5% (1 in 20)
        if (rand < 0.0917) return { value: 199, segmentIndex: 1 };

        // ₹99: ~90.83% (everyone else)
        return { value: 99, segmentIndex: 0 };
    }

    // ==================== STATE ====================
    var state = {
        phone: '',
        otpSent: false,
        otpVerified: false,
        spinning: false,
        hasSpun: false,
        currentAngle: 0
    };

    // ==================== RENDER FULL PAGE ====================
    function renderSpinWheelPage() {
        var container = document.getElementById('spin-wheel-page') || document.getElementById('app');
        if (!container) {
            container = document.body;
        }

        container.innerHTML = '';
        container.style.cssText = 'margin:0; padding:0; min-height:100vh; background:' + THEME.backgroundCream + '; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

        var wrapper = document.createElement('div');
        wrapper.id = 'spinwheel-wrapper';
        wrapper.style.cssText = 'max-width:420px; margin:0 auto; padding:0; min-height:100vh; background:' + THEME.warmWhite + '; position:relative; overflow:hidden;';

        wrapper.innerHTML = buildHeader() + buildContent();
        container.appendChild(wrapper);

        // Initialize canvas after DOM is ready
        setTimeout(function() {
            initCanvas();
            bindEvents();
            checkExistingSpin();
        }, 100);
    }

    // ==================== HEADER ====================
    function buildHeader() {
        return '<div style="' +
            'background: linear-gradient(135deg, ' + THEME.primaryOrange + ' 0%, ' + THEME.darkOrange + ' 100%);' +
            'padding: 20px 16px 24px;' +
            'text-align: center;' +
            'position: relative;' +
            'overflow: hidden;' +
            '">' +
            // Decorative pickle pattern overlay
            '<div style="position:absolute;top:0;left:0;right:0;bottom:0;opacity:0.06;' +
            'background-image:radial-gradient(circle at 20% 30%, #fff 2px, transparent 2px),' +
            'radial-gradient(circle at 60% 70%, #fff 1.5px, transparent 1.5px),' +
            'radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px);' +
            'background-size: 60px 60px;"></div>' +
            '<div style="position:relative;z-index:1;">' +
            '<div style="font-size:28px;margin-bottom:4px;">🥒</div>' +
            '<h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:0.5px;text-shadow:0 2px 4px rgba(0,0,0,0.2);">' +
            'SeaSalt Lucky Spin</h1>' +
            '<p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:500;">' +
            'Win wallet credits up to ₹599!</p>' +
            '</div></div>';
    }

    // ==================== MAIN CONTENT ====================
    function buildContent() {
        return '<div id="spinwheel-content" style="padding:20px 16px 32px;">' +
            buildPhoneStep() +
            buildOTPStep() +
            buildWheelStep() +
            buildResultStep() +
            '</div>';
    }

    // --- STEP 1: Phone Input ---
    function buildPhoneStep() {
        return '<div id="step-phone" style="display:block;">' +
            '<div style="' +
            'background: #fff;' +
            'border-radius: 16px;' +
            'padding: 24px 20px;' +
            'box-shadow: 0 2px 12px ' + THEME.softShadow + ';' +
            'border: 1px solid rgba(212,69,26,0.08);' +
            '">' +
            '<h2 style="margin:0 0 4px;color:' + THEME.textBrown + ';font-size:18px;font-weight:700;">Enter Your Number</h2>' +
            '<p style="margin:0 0 16px;color:#9a6e4a;font-size:13px;">Verify to spin & win instant credits</p>' +
            '<div style="display:flex;gap:8px;align-items:center;">' +
            '<span style="padding:12px 10px;background:' + THEME.backgroundCream + ';border-radius:10px;font-size:15px;color:' + THEME.textBrown + ';font-weight:600;border:1.5px solid rgba(212,69,26,0.12);">+91</span>' +
            '<input type="tel" id="spin-phone" maxlength="10" placeholder="Phone number" ' +
            'style="flex:1;padding:12px 14px;border-radius:10px;border:1.5px solid rgba(212,69,26,0.15);font-size:15px;outline:none;' +
            'background:' + THEME.backgroundCream + ';color:' + THEME.textBrown + ';font-weight:500;' +
            'transition:border-color 0.2s;" ' +
            'onfocus="this.style.borderColor=\'' + THEME.primaryOrange + '\'" ' +
            'onblur="this.style.borderColor=\'rgba(212,69,26,0.15)\'">' +
            '</div>' +
            '<button id="btn-send-otp" onclick="SpinWheel.sendOTP()" style="' +
            'width:100%;margin-top:14px;padding:14px;border:none;border-radius:12px;' +
            'background:linear-gradient(135deg,' + THEME.primaryOrange + ',' + THEME.darkOrange + ');' +
            'color:#fff;font-size:15px;font-weight:700;cursor:pointer;' +
            'box-shadow:0 4px 14px rgba(212,69,26,0.3);' +
            'transition:transform 0.15s,box-shadow 0.15s;' +
            'letter-spacing:0.3px;' +
            '" onmousedown="this.style.transform=\'scale(0.97)\'" onmouseup="this.style.transform=\'scale(1)\'">Send OTP</button>' +
            '<p id="phone-error" style="margin:8px 0 0;color:' + THEME.deepRed + ';font-size:12px;display:none;"></p>' +
            '</div></div>';
    }

    // --- STEP 2: OTP Verification ---
    function buildOTPStep() {
        return '<div id="step-otp" style="display:none;">' +
            '<div style="' +
            'background:#fff;border-radius:16px;padding:24px 20px;' +
            'box-shadow:0 2px 12px ' + THEME.softShadow + ';' +
            'border:1px solid rgba(212,69,26,0.08);' +
            '">' +
            '<h2 style="margin:0 0 4px;color:' + THEME.textBrown + ';font-size:18px;font-weight:700;">Verify OTP</h2>' +
            '<p id="otp-subtitle" style="margin:0 0 16px;color:#9a6e4a;font-size:13px;">Code sent to your phone</p>' +
            '<input type="tel" id="spin-otp" maxlength="6" placeholder="Enter 6-digit OTP" ' +
            'style="width:100%;padding:14px;border-radius:10px;border:1.5px solid rgba(212,69,26,0.15);' +
            'font-size:18px;text-align:center;letter-spacing:8px;outline:none;' +
            'background:' + THEME.backgroundCream + ';color:' + THEME.textBrown + ';font-weight:600;' +
            'box-sizing:border-box;transition:border-color 0.2s;" ' +
            'onfocus="this.style.borderColor=\'' + THEME.primaryOrange + '\'" ' +
            'onblur="this.style.borderColor=\'rgba(212,69,26,0.15)\'">' +
            '<button id="btn-verify-otp" onclick="SpinWheel.verifyOTP()" style="' +
            'width:100%;margin-top:14px;padding:14px;border:none;border-radius:12px;' +
            'background:linear-gradient(135deg,' + THEME.primaryOrange + ',' + THEME.darkOrange + ');' +
            'color:#fff;font-size:15px;font-weight:700;cursor:pointer;' +
            'box-shadow:0 4px 14px rgba(212,69,26,0.3);' +
            'letter-spacing:0.3px;' +
            '">Verify & Spin</button>' +
            '<p id="otp-error" style="margin:8px 0 0;color:' + THEME.deepRed + ';font-size:12px;display:none;"></p>' +
            '</div></div>';
    }

    // --- STEP 3: Wheel ---
    function buildWheelStep() {
        return '<div id="step-wheel" style="display:none;text-align:center;">' +
            '<p style="margin:0 0 16px;color:' + THEME.textBrown + ';font-size:15px;font-weight:600;">Tap the wheel to spin!</p>' +
            // Wheel container with pointer
            '<div style="position:relative;display:inline-block;margin:0 auto;">' +
            // Pointer triangle (top center)
            '<div style="' +
            'position:absolute;top:-8px;left:50%;transform:translateX(-50%);z-index:10;' +
            'width:0;height:0;' +
            'border-left:14px solid transparent;border-right:14px solid transparent;' +
            'border-top:28px solid ' + THEME.primaryOrange + ';' +
            'filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));' +
            '"></div>' +
            // Canvas
            '<canvas id="spin-canvas" width="300" height="300" style="' +
            'cursor:pointer;border-radius:50%;' +
            'box-shadow:0 0 0 6px ' + THEME.primaryOrange + ',0 0 0 10px rgba(212,69,26,0.2),0 8px 32px rgba(0,0,0,0.15);' +
            '" onclick="SpinWheel.spin()"></canvas>' +
            '</div>' +
            // Spin button below wheel
            '<button id="btn-spin" onclick="SpinWheel.spin()" style="' +
            'margin-top:20px;padding:14px 48px;border:none;border-radius:12px;' +
            'background:linear-gradient(135deg,' + THEME.primaryOrange + ',' + THEME.darkOrange + ');' +
            'color:#fff;font-size:16px;font-weight:700;cursor:pointer;' +
            'box-shadow:0 4px 14px rgba(212,69,26,0.3);' +
            'letter-spacing:0.3px;' +
            '">🎰 SPIN NOW</button>' +
            '</div>';
    }

    // --- STEP 4: Result ---
    function buildResultStep() {
        return '<div id="step-result" style="display:none;text-align:center;">' +
            '<div style="' +
            'background:#fff;border-radius:16px;padding:32px 20px;' +
            'box-shadow:0 2px 12px ' + THEME.softShadow + ';' +
            'border:1px solid rgba(212,69,26,0.08);' +
            '">' +
            '<div style="font-size:48px;margin-bottom:8px;">🎉</div>' +
            '<h2 style="margin:0 0 4px;color:' + THEME.pickleGreen + ';font-size:22px;font-weight:800;">Congratulations!</h2>' +
            '<p style="margin:0 0 16px;color:#9a6e4a;font-size:13px;">You\'ve won wallet credits</p>' +
            '<div id="prize-display" style="' +
            'font-size:42px;font-weight:900;color:' + THEME.primaryOrange + ';' +
            'padding:16px;border-radius:12px;' +
            'background:' + THEME.backgroundCream + ';' +
            'border:2px dashed ' + THEME.lightOrange + ';' +
            'margin-bottom:16px;' +
            'text-shadow:0 2px 4px rgba(212,69,26,0.15);' +
            '">₹0</div>' +
            '<p style="margin:0 0 20px;color:#9a6e4a;font-size:12px;">Credits expire in 48 hours. Use them at checkout!</p>' +
            '<button onclick="SpinWheel.goToShop()" style="' +
            'width:100%;padding:14px;border:none;border-radius:12px;' +
            'background:linear-gradient(135deg,' + THEME.pickleGreen + ',' + THEME.lightGreen + ');' +
            'color:#fff;font-size:15px;font-weight:700;cursor:pointer;' +
            'box-shadow:0 4px 14px rgba(22,101,52,0.3);' +
            'letter-spacing:0.3px;' +
            '">🛒 Start Shopping</button>' +
            '</div></div>';
    }

    // ==================== CANVAS DRAWING ====================
    function initCanvas() {
        var canvas = document.getElementById('spin-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        drawWheel(ctx, canvas, 0);
    }

    function drawWheel(ctx, canvas, rotation) {
        var cx = canvas.width / 2;
        var cy = canvas.height / 2;
        var radius = Math.min(cx, cy) - 4;
        var numSegments = PRIZES.length;
        var arc = (2 * Math.PI) / numSegments;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < numSegments; i++) {
            var startAngle = rotation + i * arc - Math.PI / 2;
            var endAngle = startAngle + arc;

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = SEGMENT_COLORS[i].bg;
            ctx.fill();

            // Segment border
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw prize text - positioned at center of each segment
            ctx.save();
            ctx.translate(cx, cy);
            var textAngle = startAngle + arc / 2;
            ctx.rotate(textAngle);

            // Prize label - bold, with shadow for visibility
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Text shadow for readability
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            ctx.fillText(PRIZES[i].label, radius * 0.62, 0);

            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            ctx.restore();
        }

        // Center circle
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = THEME.primaryOrange;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
        ctx.fillStyle = THEME.primaryOrange;
        ctx.fill();
    }

    // ==================== PHONE CAPTURE (IMMEDIATE) ====================
    function capturePhone(phone) {
        var formatted = '+91' + phone;
        state.phone = formatted;

        // Save to ALL localStorage keys immediately
        localStorage.setItem('seasalt_phone', formatted);
        localStorage.setItem('seasalt_user_phone', formatted);

        try {
            var existingUser = localStorage.getItem('seasalt_user');
            var userData = existingUser ? JSON.parse(existingUser) : {};
            userData.phone = formatted;
            localStorage.setItem('seasalt_user', JSON.stringify(userData));
        } catch (e) {
            localStorage.setItem('seasalt_user', JSON.stringify({ phone: formatted }));
        }

        // Upsert to Supabase users table immediately
        upsertUserToSupabase(formatted);

        console.log('[SpinWheel v17] Phone captured IMMEDIATELY:', formatted);
    }

    function upsertUserToSupabase(phone) {
        // Check if user exists
        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone) + '&select=phone', {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        })
        .then(function(res) { return res.json(); })
        .then(function(users) {
            if (!users || users.length === 0) {
                // Insert new user
                return fetch(SUPABASE_URL + '/rest/v1/users', {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        phone: phone,
                        wallet_balance: 0,
                        created_at: new Date().toISOString()
                    })
                });
            }
        })
        .catch(function(err) {
            console.error('[SpinWheel v17] Supabase upsert error:', err);
        });
    }

    // ==================== OTP FLOW (Firebase) ====================
    function sendOTP() {
        var phoneInput = document.getElementById('spin-phone');
        var errorEl = document.getElementById('phone-error');
        var phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';

        if (phone.length !== 10) {
            showError(errorEl, 'Please enter a valid 10-digit phone number');
            return;
        }

        // CAPTURE PHONE IMMEDIATELY (before OTP verification)
        capturePhone(phone);

        var btn = document.getElementById('btn-send-otp');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Sending...';
            btn.style.opacity = '0.7';
        }

        hideError(errorEl);

        // Firebase OTP
        if (window.firebase && firebase.auth) {
            var appVerifier = window.recaptchaVerifier;
            if (!appVerifier) {
                try {
                    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('btn-send-otp', {
                        size: 'invisible'
                    });
                    appVerifier = window.recaptchaVerifier;
                } catch (e) {
                    console.error('[SpinWheel v17] reCAPTCHA error:', e);
                    // Fallback: skip OTP, go to wheel
                    skipOTPAndSpin();
                    return;
                }
            }

            firebase.auth().signInWithPhoneNumber('+91' + phone, appVerifier)
                .then(function(confirmationResult) {
                    window.confirmationResult = confirmationResult;
                    state.otpSent = true;
                    showStep('step-otp');
                    var subtitle = document.getElementById('otp-subtitle');
                    if (subtitle) subtitle.textContent = 'Code sent to +91' + phone;
                })
                .catch(function(err) {
                    console.error('[SpinWheel v17] OTP error:', err);
                    showError(errorEl, 'Failed to send OTP. Try again.');
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = 'Send OTP';
                        btn.style.opacity = '1';
                    }
                });
        } else {
            // No Firebase - skip OTP for testing
            console.warn('[SpinWheel v17] Firebase not loaded, skipping OTP');
            skipOTPAndSpin();
        }
    }

    function skipOTPAndSpin() {
        state.otpVerified = true;
        showStep('step-wheel');
    }

    function verifyOTP() {
        var otpInput = document.getElementById('spin-otp');
        var errorEl = document.getElementById('otp-error');
        var otp = otpInput ? otpInput.value.trim() : '';

        if (otp.length !== 6) {
            showError(errorEl, 'Please enter the 6-digit OTP');
            return;
        }

        var btn = document.getElementById('btn-verify-otp');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Verifying...';
            btn.style.opacity = '0.7';
        }

        if (window.confirmationResult) {
            window.confirmationResult.confirm(otp)
                .then(function() {
                    state.otpVerified = true;
                    showStep('step-wheel');
                })
                .catch(function(err) {
                    console.error('[SpinWheel v17] OTP verify error:', err);
                    showError(errorEl, 'Invalid OTP. Please try again.');
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = 'Verify & Spin';
                        btn.style.opacity = '1';
                    }
                });
        } else {
            // Fallback
            state.otpVerified = true;
            showStep('step-wheel');
        }
    }

    // ==================== SPIN LOGIC ====================
    function spin() {
        if (state.spinning || state.hasSpun) return;
        state.spinning = true;

        var canvas = document.getElementById('spin-canvas');
        var btn = document.getElementById('btn-spin');
        if (!canvas) return;
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Spinning...';
            btn.style.opacity = '0.7';
        }

        var ctx = canvas.getContext('2d');
        var prize = calculatePrize();
        var numSegments = PRIZES.length;
        var arc = (2 * Math.PI) / numSegments;

        // Calculate target angle: align winning segment to top (pointer position)
        // Pointer is at top (12 o'clock = -π/2)
        // We need the center of the winning segment to land under the pointer
        var targetSegmentCenter = prize.segmentIndex * arc + arc / 2;
        // Total rotation: multiple full spins + offset to land on winning segment
        var fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
        var targetAngle = (fullSpins * 2 * Math.PI) + (2 * Math.PI - targetSegmentCenter);

        var startTime = null;
        var duration = 4000 + Math.random() * 1000; // 4-5 seconds
        var startAngle = state.currentAngle;

        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);

            // Easing: cubic ease-out for natural deceleration
            var eased = 1 - Math.pow(1 - progress, 3);
            var currentRotation = startAngle + targetAngle * eased;

            drawWheel(ctx, canvas, currentRotation);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Spin complete
                state.currentAngle = currentRotation % (2 * Math.PI);
                state.spinning = false;
                state.hasSpun = true;
                onSpinComplete(prize);
            }
        }

        requestAnimationFrame(animate);
    }

    function onSpinComplete(prize) {
        console.log('[SpinWheel v17] Won:', prize.value);

        // Save wallet to localStorage
        var expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + WALLET_EXPIRY_HOURS);

        var walletData = {
            amount: prize.value,
            expiresAt: expiresAt.toISOString(),
            phone: state.phone,
            wonAt: new Date().toISOString()
        };
        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify(walletData));

        // Mark as spun
        localStorage.setItem('seasalt_has_spun', 'true');
        localStorage.setItem('seasalt_spin_phone', state.phone);

        // Save to Supabase
        saveWalletToSupabase(prize.value, expiresAt.toISOString());

        // Show result after short delay
        setTimeout(function() {
            var prizeDisplay = document.getElementById('prize-display');
            if (prizeDisplay) prizeDisplay.textContent = '₹' + prize.value;
            showStep('step-result');
        }, 600);
    }

    // ==================== SUPABASE WALLET SYNC ====================
    function saveWalletToSupabase(amount, expiresAt) {
        var phone = state.phone;
        if (!phone) {
            phone = localStorage.getItem('seasalt_phone') || '';
        }
        if (!phone) {
            console.error('[SpinWheel v17] No phone to save wallet');
            return;
        }

        // First try to get existing balance (admin may have sent credits)
        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone) + '&select=wallet_balance', {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        })
        .then(function(res) { return res.json(); })
        .then(function(users) {
            var existingBalance = 0;
            if (users && users[0] && users[0].wallet_balance) {
                existingBalance = users[0].wallet_balance;
            }
            var newBalance = existingBalance + amount;

            // Update with combined balance
            return fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone), {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    wallet_balance: newBalance,
                    wallet_expires_at: expiresAt
                })
            });
        })
        .then(function() {
            console.log('[SpinWheel v17] Wallet saved to Supabase');
        })
        .catch(function(err) {
            console.error('[SpinWheel v17] Supabase save error:', err);
        });

        // Also log to spin_results if table exists
        fetch(SUPABASE_URL + '/rest/v1/spin_results', {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                phone: phone,
                prize_amount: amount,
                spun_at: new Date().toISOString()
            })
        }).catch(function() {
            // spin_results table may not exist - that's okay
        });
    }

    // ==================== HELPERS ====================
    function showStep(stepId) {
        ['step-phone', 'step-otp', 'step-wheel', 'step-result'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = id === stepId ? 'block' : 'none';
        });
    }

    function showError(el, msg) {
        if (el) {
            el.textContent = msg;
            el.style.display = 'block';
        }
    }

    function hideError(el) {
        if (el) el.style.display = 'none';
    }

    function checkExistingSpin() {
        var hasSpun = localStorage.getItem('seasalt_has_spun');
        var walletData = localStorage.getItem(SPIN_WALLET_KEY);

        if (hasSpun === 'true' && walletData) {
            try {
                var data = JSON.parse(walletData);
                var expiry = new Date(data.expiresAt);
                if (new Date() < expiry) {
                    // Already spun and wallet still valid
                    state.hasSpun = true;
                    var prizeDisplay = document.getElementById('prize-display');
                    if (prizeDisplay) prizeDisplay.textContent = '₹' + data.amount;
                    showStep('step-result');
                    return;
                } else {
                    // Wallet expired, allow re-spin
                    localStorage.removeItem('seasalt_has_spun');
                    localStorage.removeItem(SPIN_WALLET_KEY);
                }
            } catch (e) {}
        }
    }

    function bindEvents() {
        var phoneInput = document.getElementById('spin-phone');
        if (phoneInput) {
            phoneInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') sendOTP();
            });
        }
        var otpInput = document.getElementById('spin-otp');
        if (otpInput) {
            otpInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyOTP();
            });
        }
    }

    function goToShop() {
        window.location.href = '/';
    }

    // ==================== PUBLIC API ====================
    window.SpinWheel = {
        init: renderSpinWheelPage,
        sendOTP: sendOTP,
        verifyOTP: verifyOTP,
        spin: spin,
        goToShop: goToShop
    };

    // Auto-init if spin wheel page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (window.location.pathname.includes('spin') ||
                document.getElementById('spin-wheel-page')) {
                renderSpinWheelPage();
            }
        });
    } else {
        if (window.location.pathname.includes('spin') ||
            document.getElementById('spin-wheel-page')) {
            renderSpinWheelPage();
        }
    }

})();
