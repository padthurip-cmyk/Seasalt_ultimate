/**
 * SeaSalt Pickles - SpinWheel Module v18
 * =======================================
 * FLOW: Wheel FIRST → Spin → Win → Phone to claim → OTP → Wallet saved
 * Works with EXISTING #spin-modal HTML in index.html
 * Pickle/Orange themed wheel with 6 prize segments
 * Phone captured IMMEDIATELY on "Send OTP" click
 * Wallet saved to localStorage + Supabase
 */

(function() {
    'use strict';

    // ==================== CONFIG ====================
    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNTIzNTEsImV4cCI6MjA1MzYyODM1MX0.LPSwMPKBiMxMTmHOVJxWBbS8kgGDo4RaPNCR63P55Cw';
    var SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    var WALLET_EXPIRY_HOURS = 48;

    // ==================== FIREBASE CONFIG ====================
    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyAX3IStPrmEU13jolUTLX2091B90mHLRsE",
        authDomain: "seasalt-pickles.firebaseapp.com",
        projectId: "seasalt-pickles",
        storageBucket: "seasalt-pickles.firebasestorage.app",
        messagingSenderId: "293579603498",
        appId: "1:293579603498:web:f8e52381b6fe3d339af498"
    };

    // ==================== PICKLE THEME COLORS ====================
    var THEME = {
        primaryOrange: '#D4451A',
        darkOrange: '#B91C1C',
        pickleGreen: '#166534',
        lightGreen: '#16A34A',
        accentOrange: '#EA580C',
        deepRed: '#DC2626',
        gold: '#F59E0B',
        spiceGold: '#DAA520'
    };

    // 6 prize segments with pickle-themed colors
    var SEGMENTS = [
        { value: 99,  label: '\u20B999',  color: THEME.primaryOrange, textColor: '#FFFFFF' },
        { value: 199, label: '\u20B9199', color: THEME.pickleGreen,   textColor: '#FFFFFF' },
        { value: 299, label: '\u20B9299', color: THEME.deepRed,       textColor: '#FFFFFF' },
        { value: 399, label: '\u20B9399', color: THEME.lightGreen,    textColor: '#FFFFFF' },
        { value: 499, label: '\u20B9499', color: THEME.accentOrange,  textColor: '#FFFFFF' },
        { value: 599, label: '\u20B9599', color: THEME.gold,          textColor: '#FFFFFF' }
    ];

    // ==================== PRIZE ODDS ENGINE ====================
    function calculatePrize() {
        var rand = Math.random();
        if (rand < 0.005)  return { value: 599, segmentIndex: 5 }; // 0.5%
        if (rand < 0.0117) return { value: 499, segmentIndex: 4 }; // 0.67%
        if (rand < 0.0217) return { value: 399, segmentIndex: 3 }; // 1%
        if (rand < 0.0417) return { value: 299, segmentIndex: 2 }; // 2%
        if (rand < 0.0917) return { value: 199, segmentIndex: 1 }; // 5%
        return { value: 99, segmentIndex: 0 };                     // ~90.83%
    }

    // ==================== STATE ====================
    var state = {
        phone: '',
        countryCode: '+91',
        spinning: false,
        hasSpun: false,
        pendingPrize: null  // Prize won but not yet claimed (waiting for phone)
    };

    // ==================== DOM REFERENCES ====================
    var els = {};

    function cacheElements() {
        els.modal = document.getElementById('spin-modal');
        els.closeBtn = document.getElementById('spin-close-btn');
        els.phoneSection = document.getElementById('phone-section');
        els.otpSection = document.getElementById('otp-section');
        els.wheelSection = document.getElementById('wheel-section');
        els.resultSection = document.getElementById('result-section');
        els.countryCode = document.getElementById('country-code');
        els.phoneInput = document.getElementById('phone-input');
        els.sendOtpBtn = document.getElementById('send-otp-btn');
        els.otpInputs = document.querySelectorAll('.otp-input');
        els.verifyOtpBtn = document.getElementById('verify-otp-btn');
        els.spinWheel = document.getElementById('spin-wheel');
        els.spinBtn = document.getElementById('spin-btn');
        els.winResult = document.getElementById('win-result');
        els.loseResult = document.getElementById('lose-result');
        els.winAmount = document.getElementById('win-amount');
        els.continueBtn = document.getElementById('continue-btn');
    }

    // ==================== BUILD PICKLE-THEMED SVG WHEEL ====================
    function buildPickleWheel() {
        if (!els.spinWheel) return;

        var numSegs = SEGMENTS.length;
        var anglePerSeg = 360 / numSegs;
        var radius = 140;
        var cx = 150, cy = 150;
        var svgContent = '';

        for (var i = 0; i < numSegs; i++) {
            var startAngle = i * anglePerSeg - 90;
            var endAngle = startAngle + anglePerSeg;
            var startRad = (startAngle * Math.PI) / 180;
            var endRad = (endAngle * Math.PI) / 180;

            var x1 = cx + radius * Math.cos(startRad);
            var y1 = cy + radius * Math.sin(startRad);
            var x2 = cx + radius * Math.cos(endRad);
            var y2 = cy + radius * Math.sin(endRad);

            var largeArc = anglePerSeg > 180 ? 1 : 0;

            // Segment path
            svgContent += '<path d="M' + cx + ',' + cy + ' L' + x1.toFixed(2) + ',' + y1.toFixed(2) +
                ' A' + radius + ',' + radius + ' 0 ' + largeArc + ',1 ' + x2.toFixed(2) + ',' + y2.toFixed(2) +
                ' Z" fill="' + SEGMENTS[i].color + '"/>';

            // Segment border
            svgContent += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x1.toFixed(2) + '" y2="' + y1.toFixed(2) +
                '" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>';

            // Prize text
            var midAngle = startAngle + anglePerSeg / 2;
            var midRad = (midAngle * Math.PI) / 180;
            var textDist = radius * 0.62;
            var tx = cx + textDist * Math.cos(midRad);
            var ty = cy + textDist * Math.sin(midRad);
            var textRotation = midAngle + 90;

            svgContent += '<text x="' + tx.toFixed(2) + '" y="' + ty.toFixed(2) +
                '" fill="' + SEGMENTS[i].textColor + '" font-size="22" font-weight="bold" ' +
                'font-family="Outfit, -apple-system, BlinkMacSystemFont, sans-serif" ' +
                'text-anchor="middle" dominant-baseline="central" ' +
                'transform="rotate(' + textRotation.toFixed(2) + ', ' + tx.toFixed(2) + ', ' + ty.toFixed(2) + ')" ' +
                'style="filter:drop-shadow(0px 1px 2px rgba(0,0,0,0.4))">' +
                SEGMENTS[i].label + '</text>';
        }

        // Outer ring - pickle orange
        svgContent += '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="' + THEME.primaryOrange + '" stroke-width="8"/>';
        svgContent += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (radius - 5) + '" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>';

        // Decorative dots
        for (var d = 0; d < 24; d++) {
            var dotAngle = (d * 15 - 90) * Math.PI / 180;
            var dotX = cx + (radius + 0.5) * Math.cos(dotAngle);
            var dotY = cy + (radius + 0.5) * Math.sin(dotAngle);
            svgContent += '<circle cx="' + dotX.toFixed(2) + '" cy="' + dotY.toFixed(2) + '" r="2.5" fill="rgba(255,255,255,0.6)"/>';
        }

        els.spinWheel.innerHTML = svgContent;
        console.log('[SpinWheel v18] Pickle-themed SVG wheel built (6 segments)');
    }

    // ==================== SECTION NAVIGATION ====================
    function showSection(sectionId) {
        ['phoneSection', 'otpSection', 'wheelSection', 'resultSection'].forEach(function(key) {
            if (els[key]) els[key].classList.add('hidden');
        });
        if (els[sectionId]) els[sectionId].classList.remove('hidden');

        // Show close button only after spin is done
        if (els.closeBtn) {
            if (sectionId === 'resultSection' || sectionId === 'phoneSection' || sectionId === 'otpSection') {
                els.closeBtn.classList.remove('hidden');
            }
        }
    }

    // ==================== SPIN ANIMATION ====================
    function spin() {
        if (state.spinning || state.hasSpun) return;
        state.spinning = true;

        if (els.spinBtn) {
            els.spinBtn.disabled = true;
            els.spinBtn.innerHTML = '<span class="text-2xl">\uD83C\uDFB0</span><span>SPINNING...</span><span class="text-2xl">\uD83C\uDFB0</span>';
        }

        var prize = calculatePrize();
        var numSegs = SEGMENTS.length;
        var anglePerSeg = 360 / numSegs;

        // Rotation to land prize under pointer (top/12 o'clock)
        var segmentCenter = prize.segmentIndex * anglePerSeg + anglePerSeg / 2;
        var fullSpins = 5 + Math.floor(Math.random() * 4);
        var targetRotation = fullSpins * 360 + (360 - segmentCenter);
        targetRotation += (Math.random() - 0.5) * (anglePerSeg * 0.5);

        if (els.spinWheel) {
            els.spinWheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
            els.spinWheel.style.transform = 'rotate(' + targetRotation + 'deg)';
        }

        setTimeout(function() {
            state.spinning = false;
            state.hasSpun = true;
            state.pendingPrize = prize;
            onSpinComplete(prize);
        }, 4200);
    }

    function onSpinComplete(prize) {
        console.log('[SpinWheel v18] Spin landed on: \u20B9' + prize.value);

        // Show win amount briefly, then ask for phone to CLAIM
        if (els.winAmount) els.winAmount.textContent = '\u20B9' + prize.value;

        // Update the phone section heading to say "Claim your prize"
        updatePhoneSectionForClaim(prize.value);

        // Brief flash of result, then go to phone section to claim
        showSection('resultSection');
        if (els.winResult) els.winResult.classList.remove('hidden');
        if (els.loseResult) els.loseResult.classList.add('hidden');

        // Change continue button to "Claim Now" → goes to phone input
        if (els.continueBtn) {
            els.continueBtn.textContent = 'Claim \u20B9' + prize.value + ' Now! \uD83C\uDF89';
            els.continueBtn.onclick = function() {
                showSection('phoneSection');
            };
        }
    }

    // Update phone section text to reflect "claim your prize" context
    function updatePhoneSectionForClaim(prizeValue) {
        if (!els.phoneSection) return;

        // Find and update the text inside phone section
        var existingText = els.phoneSection.querySelector('p');
        if (existingText) {
            existingText.innerHTML = 'Enter your number to claim <strong>\u20B9' + prizeValue + '</strong> wallet credit';
        }

        // Update send OTP button text
        if (els.sendOtpBtn) {
            els.sendOtpBtn.innerHTML = 'Claim \u20B9' + prizeValue + ' \u2728';
        }
    }

    // ==================== PHONE CAPTURE (IMMEDIATE on Send OTP) ====================
    function capturePhone() {
        var phone = els.phoneInput ? els.phoneInput.value.replace(/\D/g, '') : '';
        var code = els.countryCode ? els.countryCode.value : '+91';
        var fullPhone = code + phone;
        state.phone = fullPhone;
        state.countryCode = code;

        // Save to ALL localStorage keys
        localStorage.setItem('seasalt_phone', fullPhone);
        localStorage.setItem('seasalt_user_phone', fullPhone);
        try {
            var existing = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            existing.phone = fullPhone;
            localStorage.setItem('seasalt_user', JSON.stringify(existing));
        } catch (e) {
            localStorage.setItem('seasalt_user', JSON.stringify({ phone: fullPhone }));
        }

        // Upsert to Supabase users table
        upsertUserToSupabase(fullPhone);
        console.log('[SpinWheel v18] Phone captured IMMEDIATELY:', fullPhone);
    }

    function upsertUserToSupabase(phone) {
        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone) + '&select=phone', {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        })
        .then(function(res) { return res.json(); })
        .then(function(users) {
            if (!users || users.length === 0) {
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
        .catch(function(err) { console.error('[SpinWheel v18] Supabase upsert error:', err); });
    }

    // ==================== OTP FLOW (Firebase) ====================
    function initFirebase() {
        if (window.firebase && !firebase.apps.length) {
            try {
                firebase.initializeApp(FIREBASE_CONFIG);
                console.log('[SpinWheel v18] Firebase initialized');
            } catch (e) {
                console.log('[SpinWheel v18] Firebase init:', e.message);
            }
        }
    }

    function sendOTP() {
        var phone = els.phoneInput ? els.phoneInput.value.replace(/\D/g, '') : '';
        if (phone.length < 7) return;

        // *** CAPTURE PHONE IMMEDIATELY ***
        capturePhone();

        var btn = els.sendOtpBtn;
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Sending...';
        }

        var fullPhone = state.phone;

        if (window.firebase && firebase.auth) {
            if (!window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('send-otp-btn', {
                        size: 'invisible',
                        callback: function() {}
                    });
                } catch (e) {
                    console.error('[SpinWheel v18] reCAPTCHA error:', e);
                    claimPrize();
                    return;
                }
            }

            firebase.auth().signInWithPhoneNumber(fullPhone, window.recaptchaVerifier)
                .then(function(confirmationResult) {
                    window.confirmationResult = confirmationResult;
                    showSection('otpSection');
                    if (els.otpInputs && els.otpInputs[0]) els.otpInputs[0].focus();
                    console.log('[SpinWheel v18] OTP sent to', fullPhone);
                })
                .catch(function(err) {
                    console.error('[SpinWheel v18] OTP send error:', err);
                    if (typeof UI !== 'undefined' && UI.showToast) {
                        UI.showToast('OTP failed, claiming directly', 'warning');
                    }
                    // Still claim the prize even if OTP fails
                    claimPrize();
                });
        } else {
            console.warn('[SpinWheel v18] Firebase not loaded, claiming directly');
            claimPrize();
        }
    }

    function verifyOTP() {
        var otp = '';
        if (els.otpInputs) {
            els.otpInputs.forEach(function(input) { otp += input.value; });
        }
        if (otp.length !== 6) return;

        var btn = els.verifyOtpBtn;
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Verifying...';
        }

        if (window.confirmationResult) {
            window.confirmationResult.confirm(otp)
                .then(function() {
                    console.log('[SpinWheel v18] OTP verified for', state.phone);
                    claimPrize();
                })
                .catch(function(err) {
                    console.error('[SpinWheel v18] OTP verify error:', err);
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = 'Verify & Spin \uD83C\uDFB0';
                    }
                    if (typeof UI !== 'undefined' && UI.showToast) {
                        UI.showToast('Invalid OTP. Try again.', 'error');
                    }
                });
        } else {
            claimPrize();
        }
    }

    // ==================== CLAIM PRIZE (after phone verified) ====================
    function claimPrize() {
        var prize = state.pendingPrize;
        if (!prize) {
            console.error('[SpinWheel v18] No pending prize to claim');
            closeModal();
            return;
        }

        console.log('[SpinWheel v18] Claiming prize: \u20B9' + prize.value);

        var expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + WALLET_EXPIRY_HOURS);

        // Save to localStorage
        var walletData = {
            amount: prize.value,
            expiresAt: expiresAt.toISOString(),
            phone: state.phone,
            wonAt: new Date().toISOString()
        };
        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify(walletData));
        localStorage.setItem('seasalt_has_spun', 'true');
        localStorage.setItem('seasalt_spin_phone', state.phone);

        // Save to Supabase
        saveWalletToSupabase(prize.value, expiresAt.toISOString());

        // Show final result
        showSection('resultSection');
        if (els.winResult) els.winResult.classList.remove('hidden');
        if (els.loseResult) els.loseResult.classList.add('hidden');
        if (els.winAmount) els.winAmount.textContent = '\u20B9' + prize.value;

        // Change continue button back to "Start Shopping"
        if (els.continueBtn) {
            els.continueBtn.textContent = 'Start Shopping \uD83D\uDED2';
            els.continueBtn.onclick = function() {
                closeModal();
            };
        }

        // Update wallet display in header
        if (typeof UI !== 'undefined') {
            var wallet = UI.getSpinWallet ? UI.getSpinWallet() : null;
            if (wallet && UI.updateWalletDisplay) {
                UI.updateWalletDisplay(wallet);
                if (UI.startWalletTimer) UI.startWalletTimer();
            }
            if (UI.updateCartUI) UI.updateCartUI();
        }

        // Clear pending
        state.pendingPrize = null;

        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast('\u20B9' + prize.value + ' added to wallet!', 'success');
        }
    }

    // ==================== SUPABASE WALLET SAVE ====================
    function saveWalletToSupabase(amount, expiresAt) {
        var phone = state.phone || localStorage.getItem('seasalt_phone') || '';
        if (!phone) return;

        // Get existing balance (admin credits + prior spin)
        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(phone) + '&select=wallet_balance', {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        })
        .then(function(res) { return res.json(); })
        .then(function(users) {
            var existing = (users && users[0] && users[0].wallet_balance) ? users[0].wallet_balance : 0;
            var newBalance = existing + amount;

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
            console.log('[SpinWheel v18] Wallet saved to Supabase');
        })
        .catch(function(err) {
            console.error('[SpinWheel v18] Supabase save error:', err);
        });

        // Log spin result
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
        }).catch(function() {});
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // Phone input - enable button when valid
        if (els.phoneInput) {
            els.phoneInput.addEventListener('input', function() {
                var phone = els.phoneInput.value.replace(/\D/g, '');
                if (els.sendOtpBtn) els.sendOtpBtn.disabled = phone.length < 7;
            });
            els.phoneInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && els.sendOtpBtn && !els.sendOtpBtn.disabled) sendOTP();
            });
        }

        // Send OTP
        if (els.sendOtpBtn) {
            els.sendOtpBtn.addEventListener('click', sendOTP);
        }

        // OTP inputs - auto-advance, paste, enable verify
        if (els.otpInputs && els.otpInputs.length > 0) {
            els.otpInputs.forEach(function(input, index) {
                input.addEventListener('input', function(e) {
                    if (e.target.value.length === 1 && index < els.otpInputs.length - 1) {
                        els.otpInputs[index + 1].focus();
                    }
                    var allFilled = true;
                    els.otpInputs.forEach(function(inp) { if (!inp.value) allFilled = false; });
                    if (els.verifyOtpBtn) els.verifyOtpBtn.disabled = !allFilled;
                });
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Backspace' && !input.value && index > 0) {
                        els.otpInputs[index - 1].focus();
                    }
                });
                input.addEventListener('paste', function(e) {
                    e.preventDefault();
                    var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
                    for (var p = 0; p < Math.min(pasted.length, els.otpInputs.length); p++) {
                        els.otpInputs[p].value = pasted[p];
                    }
                    var lastIdx = Math.min(pasted.length, els.otpInputs.length) - 1;
                    if (lastIdx >= 0) els.otpInputs[lastIdx].focus();
                    if (pasted.length >= 6 && els.verifyOtpBtn) els.verifyOtpBtn.disabled = false;
                });
            });
        }

        // Verify OTP
        if (els.verifyOtpBtn) {
            els.verifyOtpBtn.addEventListener('click', verifyOTP);
        }

        // Spin button
        if (els.spinBtn) {
            els.spinBtn.addEventListener('click', spin);
        }

        // Wheel click to spin
        if (els.spinWheel) {
            els.spinWheel.style.cursor = 'pointer';
            els.spinWheel.addEventListener('click', spin);
        }

        // Close button
        if (els.closeBtn) {
            els.closeBtn.addEventListener('click', closeModal);
        }
    }

    // ==================== MODAL CONTROL ====================
    function openModal() {
        if (els.modal) {
            // Start with wheel section visible (WHEEL FIRST flow)
            showSection('wheelSection');
            els.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            // Hide close button initially - user must spin first
            if (els.closeBtn) els.closeBtn.classList.add('hidden');
        }
    }

    function closeModal() {
        if (els.modal) {
            els.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // ==================== CHECK EXISTING SPIN ====================
    function checkExistingSpin() {
        var hasSpun = localStorage.getItem('seasalt_has_spun');
        var walletRaw = localStorage.getItem(SPIN_WALLET_KEY);

        if (hasSpun === 'true' && walletRaw) {
            try {
                var data = JSON.parse(walletRaw);
                var expiry = new Date(data.expiresAt);
                if (new Date() < expiry) {
                    state.hasSpun = true;
                    console.log('[SpinWheel v18] Already spun, wallet active: \u20B9' + data.amount);
                    return true;
                } else {
                    localStorage.removeItem('seasalt_has_spun');
                    localStorage.removeItem(SPIN_WALLET_KEY);
                    return false;
                }
            } catch (e) { return false; }
        }
        return false;
    }

    // ==================== INIT ====================
    function init() {
        cacheElements();
        initFirebase();
        buildPickleWheel();
        bindEvents();

        var alreadySpun = checkExistingSpin();

        if (!alreadySpun) {
            // Show modal with WHEEL FIRST after products load
            setTimeout(openModal, 1500);
        }

        console.log('[SpinWheel v18] Initialized - WHEEL FIRST flow, pickle theme');
    }

    // ==================== AUTO-INIT ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    // ==================== PUBLIC API ====================
    window.SpinWheel = {
        open: openModal,
        close: closeModal,
        init: init
    };

})();
