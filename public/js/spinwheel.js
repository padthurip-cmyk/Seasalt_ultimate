/**
 * SeaSalt Pickles - Spin Wheel v15 (Real Firebase OTP)
 * =====================================================
 * FLOW: User taps Spin → Wheel starts spinning → Name+Phone form shows
 *       ON TOP of spinning wheel → OTP sent → Verify → Reveal prize → Wallet
 * No test/demo OTP. Real Firebase SMS to any country.
 * No visible CAPTCHA.
 */
(function() {
    'use strict';
    
    console.log('[SpinWheel] v15 loaded');
    
    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    
    var SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    
    var modal = null;
    var confirmationResult = null;
    var userPhone = null;
    var userName = null;
    var selectedCountryCode = '+91';
    var userCountry = 'India';
    var isSpinning = false;
    var auth = null;
    var recaptchaVerifier = null;
    var recaptchaWidgetId = null;
    var wonAmount = 0;
    
    var SEGMENTS = [
        { label: '\u20B999', value: 99, color: '#10B981' },
        { label: '\u20B9199', value: 199, color: '#FBBF24' },
        { label: '\u20B9399', value: 399, color: '#8B5CF6' },
        { label: '\u20B9199', value: 199, color: '#34D399' },
        { label: '\u20B9599', value: 599, color: '#F87171' },
        { label: '\u20B9199', value: 199, color: '#FB923C' },
        { label: '\u20B999', value: 99, color: '#60A5FA' },
        { label: '\u20B9199', value: 199, color: '#4ADE80' }
    ];
    
    var PRIZES = [
        { value: 99, weight: 20, segments: [0, 6] },
        { value: 199, weight: 50, segments: [1, 3, 5, 7] },
        { value: 399, weight: 20, segments: [2] },
        { value: 599, weight: 10, segments: [4] }
    ];
    
    // ── STYLES (same design as v14) ──
    var STYLES = '.sw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;visibility:hidden;transition:all 0.3s ease}.sw-overlay.active{opacity:1;visibility:visible}.sw-modal{background:linear-gradient(145deg,#EA580C 0%,#DC2626 100%);border-radius:24px;width:100%;max-width:360px;max-height:90vh;overflow-y:auto;position:relative;transform:scale(0.9);transition:transform 0.3s ease;box-shadow:0 20px 60px rgba(0,0,0,0.4)}.sw-overlay.active .sw-modal{transform:scale(1)}.sw-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;color:white;font-size:18px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center}.sw-header{text-align:center;padding:28px 20px 16px}.sw-badge{display:inline-block;background:#F59E0B;color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:10px;text-transform:uppercase}.sw-title{font-size:26px;font-weight:800;color:white;margin:0 0 6px 0}.sw-subtitle{font-size:14px;color:rgba(255,255,255,0.9);margin:0}.sw-content{padding:0 24px 28px}.sw-hidden{display:none!important}' +
        '.sw-wheel-section{display:flex;flex-direction:column;align-items:center;gap:20px}.sw-wheel-wrap{position:relative;width:280px;height:280px}.sw-wheel-img{width:100%;height:100%;transition:transform 4s cubic-bezier(0.17,0.67,0.12,0.99)}.sw-pointer{position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-top:30px solid white;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));z-index:10}.sw-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;background:linear-gradient(180deg,#fff,#f0f0f0);border-radius:50%;border:4px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 15px rgba(0,0,0,0.2);z-index:5}.sw-btn-spin{padding:16px 40px;background:linear-gradient(135deg,#F97316,#EA580C);color:white;border:none;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(249,115,22,0.5);text-transform:uppercase;transition:transform 0.2s}.sw-btn-spin:disabled{opacity:0.7;cursor:not-allowed}' +
        '.sw-claim{display:flex;flex-direction:column;gap:12px}.sw-won-box{background:linear-gradient(135deg,#10B981,#059669);border-radius:16px;padding:20px;text-align:center;margin-bottom:8px}.sw-won-label{font-size:14px;color:rgba(255,255,255,0.9)}.sw-won-amount{font-size:48px;font-weight:900;color:white}.sw-won-note{font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px}.sw-input-group{display:flex;flex-direction:column;gap:4px}.sw-label{font-size:13px;font-weight:600;color:rgba(255,255,255,0.9)}.sw-select,.sw-input{width:100%;padding:14px 16px;border:none;border-radius:12px;background:white;font-size:16px;font-weight:500;color:#333;outline:none;box-sizing:border-box}.sw-phone-row{display:flex;gap:8px}.sw-phone-code{width:85px;flex-shrink:0;text-align:center;font-weight:700;background:#f3f4f6}' +
        '.sw-btn{width:100%;padding:16px;border:none;border-radius:12px;font-size:17px;font-weight:700;cursor:pointer;transition:transform 0.2s,opacity 0.2s}.sw-btn:disabled{opacity:0.6;cursor:not-allowed}.sw-btn-orange{background:linear-gradient(135deg,#F59E0B,#D97706);color:white;box-shadow:0 4px 15px rgba(245,158,11,0.4)}.sw-btn-green{background:linear-gradient(135deg,#10B981,#059669);color:white;box-shadow:0 4px 15px rgba(16,185,129,0.4)}.sw-helper{text-align:center;color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px}' +
        '.sw-error{background:#FEE2E2;color:#DC2626;padding:10px;border-radius:8px;font-size:13px;text-align:center}' +
        '.sw-otp{display:flex;flex-direction:column;align-items:center;gap:16px}.sw-otp-label{color:white;font-size:14px;text-align:center}.sw-otp-phone{color:#FCD34D;font-weight:700}.sw-otp-boxes{display:flex;gap:8px;justify-content:center}.sw-otp-input{width:46px;height:56px;border:none;border-radius:10px;background:white;font-size:24px;font-weight:700;text-align:center;color:#333;outline:none}' +
        '.sw-resend{color:rgba(255,255,255,0.8);font-size:13px;text-align:center}.sw-resend-link{color:#FCD34D;cursor:pointer;font-weight:600;background:none;border:none}.sw-resend-link:disabled{color:rgba(255,255,255,0.5);cursor:not-allowed}.sw-change-link{color:rgba(255,255,255,0.7);font-size:13px;cursor:pointer;background:none;border:none;text-decoration:underline;margin-top:8px}' +
        '.sw-result{text-align:center;padding:20px 0}.sw-result-icon{font-size:70px;margin-bottom:16px}.sw-result-title{font-size:24px;font-weight:800;color:white;margin:0 0 8px 0}.sw-result-text{font-size:15px;color:rgba(255,255,255,0.9);margin-bottom:16px}.sw-timer-box{background:rgba(0,0,0,0.25);border-radius:12px;padding:14px;margin:16px 0}.sw-timer-label{font-size:12px;color:rgba(255,255,255,0.8);margin-bottom:4px}.sw-timer-value{font-size:28px;font-weight:800;color:#FCD34D;font-family:monospace}.sw-btn-continue{padding:14px 36px;background:white;color:#EA580C;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;width:100%}' +
        '.sw-guaranteed{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:12px;padding:14px;text-align:center;margin-bottom:8px}.sw-guaranteed-text{color:#FCD34D;font-size:15px;font-weight:700}' +
        '@media(max-width:380px){.sw-modal{max-width:340px}.sw-wheel-wrap{width:250px;height:250px}.sw-otp-input{width:40px;height:50px;font-size:20px}}';
    
    // ── WHEEL SVG (same as v14) ──
    function createWheelSVG() {
        var size = 280, cx = size/2, cy = size/2, r = size/2 - 10, n = SEGMENTS.length, angle = 360/n;
        var paths = '', labels = '';
        for (var i = 0; i < SEGMENTS.length; i++) {
            var seg = SEGMENTS[i];
            var startAngle = (i * angle - 90) * Math.PI / 180;
            var endAngle = ((i + 1) * angle - 90) * Math.PI / 180;
            var x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
            var x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
            paths += '<path d="M'+cx+','+cy+' L'+x1.toFixed(1)+','+y1.toFixed(1)+' A'+r+','+r+' 0 0,1 '+x2.toFixed(1)+','+y2.toFixed(1)+' Z" fill="'+seg.color+'" stroke="white" stroke-width="2"/>';
            var midAngle = ((i + 0.5) * angle - 90) * Math.PI / 180;
            var labelR = r * 0.65, lx = cx + labelR * Math.cos(midAngle), ly = cy + labelR * Math.sin(midAngle);
            var rotation = (i + 0.5) * angle;
            labels += '<g transform="rotate('+rotation+', '+lx.toFixed(1)+', '+ly.toFixed(1)+')"><rect x="'+(lx-28).toFixed(1)+'" y="'+(ly-12).toFixed(1)+'" width="56" height="24" rx="12" fill="white" fill-opacity="0.95"/><text x="'+lx.toFixed(1)+'" y="'+(ly+1).toFixed(1)+'" font-size="14" font-weight="800" fill="'+seg.color+'" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">'+seg.label+'</text></g>';
        }
        return '<svg viewBox="0 0 '+size+' '+size+'" class="sw-wheel-img" id="sw-wheel"><circle cx="'+cx+'" cy="'+cy+'" r="'+(r+6)+'" fill="white"/>'+paths+labels+'</svg>';
    }
    
    // ── CREATE MODAL ──
    function createModal() {
        if (!document.getElementById('sw-styles')) {
            var style = document.createElement('style');
            style.id = 'sw-styles';
            style.textContent = STYLES;
            document.head.appendChild(style);
        }
        
        var html = '<div class="sw-overlay" id="sw-overlay"><div class="sw-modal">' +
            '<button class="sw-close" id="sw-close">\u2715</button>' +
            
            // ── STEP 1: WHEEL ──
            '<div id="sw-step-wheel">' +
                '<div class="sw-header"><div class="sw-badge">\uD83C\uDF81 Limited Time Offer</div><h2 class="sw-title">\uD83C\uDF89 Welcome Gift!</h2><p class="sw-subtitle">Spin to win wallet cashback up to \u20B9599</p></div>' +
                '<div class="sw-content"><div class="sw-wheel-section"><div class="sw-wheel-wrap"><div class="sw-pointer"></div>'+createWheelSVG()+'<div class="sw-center">\uD83C\uDFB0</div></div>' +
                '<button class="sw-btn-spin" id="sw-spin">\uD83C\uDFB2 SPIN NOW! \uD83C\uDFB2</button></div></div>' +
            '</div>' +
            
            // ── STEP 2: CLAIM (Name + Phone) — shown while wheel spins ──
            '<div id="sw-step-claim" class="sw-hidden">' +
                '<div class="sw-header" style="padding-bottom:10px;"><h2 class="sw-title">\uD83C\uDF81 Claim Your Prize</h2></div>' +
                '<div class="sw-content"><div class="sw-claim">' +
                    '<div class="sw-guaranteed"><div class="sw-guaranteed-text">\uD83C\uDF1F Prize is guaranteed! Verify to reveal \uD83C\uDF1F</div></div>' +
                    '<div id="sw-claim-error" class="sw-error sw-hidden"></div>' +
                    '<div class="sw-input-group"><div class="sw-label">Your Name</div><input type="text" class="sw-input" id="sw-name" placeholder="Enter your name"></div>' +
                    '<div class="sw-input-group"><div class="sw-label">Country</div><select class="sw-select" id="sw-country">' +
                        '<option value="+91" data-country="India">\uD83C\uDDEE\uD83C\uDDF3 India (+91)</option>' +
                        '<option value="+1" data-country="USA">\uD83C\uDDFA\uD83C\uDDF8 USA (+1)</option>' +
                        '<option value="+44" data-country="UK">\uD83C\uDDEC\uD83C\uDDE7 UK (+44)</option>' +
                        '<option value="+971" data-country="UAE">\uD83C\uDDE6\uD83C\uDDEA UAE (+971)</option>' +
                        '<option value="+65" data-country="Singapore">\uD83C\uDDF8\uD83C\uDDEC Singapore (+65)</option>' +
                        '<option value="+61" data-country="Australia">\uD83C\uDDE6\uD83C\uDDFA Australia (+61)</option>' +
                    '</select></div>' +
                    '<div class="sw-input-group"><div class="sw-label">Phone Number</div><div class="sw-phone-row"><input type="text" class="sw-input sw-phone-code" id="sw-phone-code" value="+91" readonly><input type="tel" class="sw-input" id="sw-phone" placeholder="9876543210" maxlength="10"></div></div>' +
                    '<button class="sw-btn sw-btn-orange" id="sw-send-otp" disabled>Send OTP to Claim \u2728</button>' +
                    '<p class="sw-helper">We\'ll send a verification code via SMS</p>' +
                    '<div id="sw-recaptcha"></div>' +
                '</div></div>' +
            '</div>' +
            
            // ── STEP 3: OTP VERIFY ──
            '<div id="sw-step-otp" class="sw-hidden">' +
                '<div class="sw-header" style="padding-bottom:10px;"><h2 class="sw-title">\uD83D\uDD12 Verify OTP</h2></div>' +
                '<div class="sw-content">' +
                    '<div class="sw-guaranteed" style="padding:14px;margin-bottom:16px;"><div class="sw-guaranteed-text">\uD83C\uDF81 Your prize is waiting!</div></div>' +
                    '<div class="sw-otp">' +
                        '<p class="sw-otp-label">Enter 6-digit code sent to <span class="sw-otp-phone" id="sw-otp-phone"></span></p>' +
                        '<div class="sw-otp-boxes">' +
                            '<input type="tel" class="sw-otp-input" maxlength="1" data-i="0">' +
                            '<input type="tel" class="sw-otp-input" maxlength="1" data-i="1">' +
                            '<input type="tel" class="sw-otp-input" maxlength="1" data-i="2">' +
                            '<input type="tel" class="sw-otp-input" maxlength="1" data-i="3">' +
                            '<input type="tel" class="sw-otp-input" maxlength="1" data-i="4">' +
                            '<input type="tel" class="sw-otp-input" maxlength="1" data-i="5">' +
                        '</div>' +
                        '<button class="sw-btn sw-btn-green" id="sw-verify" disabled>Verify & Reveal Prize \uD83C\uDF89</button>' +
                        '<p class="sw-resend">Didn\'t receive? <button class="sw-resend-link" id="sw-resend" disabled>Resend (<span id="sw-resend-timer">30</span>s)</button></p>' +
                        '<button class="sw-change-link" id="sw-change-num">\u2190 Change number</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            // ── STEP 4: RESULT (revealed AFTER OTP) ──
            '<div id="sw-step-result" class="sw-hidden">' +
                '<div class="sw-content" style="padding-top:30px;">' +
                    '<div class="sw-result">' +
                        '<div class="sw-result-icon">\uD83C\uDF8A</div>' +
                        '<h3 class="sw-result-title">Congratulations!</h3>' +
                        '<p class="sw-result-text">You won</p>' +
                        '<div class="sw-won-box"><div class="sw-won-amount" id="sw-result-amount">\u20B9199</div><div class="sw-won-note">\uD83D\uDCB0 Added to your wallet! Use within 48 hours.</div></div>' +
                        '<button class="sw-btn-continue" id="sw-start-shopping">Start Shopping \uD83D\uDED2</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            // ── STEP 5: ALREADY CLAIMED ──
            '<div id="sw-step-already" class="sw-hidden">' +
                '<div class="sw-content" style="padding-top:40px;"><div class="sw-result">' +
                    '<div class="sw-result-icon">\u231B</div>' +
                    '<h3 class="sw-result-title">Already Claimed!</h3>' +
                    '<p class="sw-result-text">This number has already spun the wheel this month.</p>' +
                    '<div class="sw-timer-box"><div class="sw-timer-label">Next spin available in</div><div class="sw-timer-value" id="sw-next-spin">-- days</div></div>' +
                    '<button class="sw-btn-continue" id="sw-close-already">Continue Shopping \u2192</button>' +
                '</div></div>' +
            '</div>' +
            
        '</div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('sw-overlay');
        bindEvents();
        initFirebase();
    }
    
    // ── FIREBASE INIT (correct API key) ──
    function initFirebase() {
        if (typeof firebase === 'undefined') {
            console.error('[SpinWheel] Firebase SDK not loaded!');
            return;
        }
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: "AIzaSyBxFGj5F3JQw9RMYvRUqV18LGoZ62ereEE",
                    authDomain: "seasaltpickles-c058e.firebaseapp.com",
                    projectId: "seasaltpickles-c058e",
                    storageBucket: "seasaltpickles-c058e.firebasestorage.app",
                    messagingSenderId: "110925953869",
                    appId: "1:110925953869:web:b47246f06a91ce1bf35504"
                });
            }
            auth = firebase.auth();
            auth.languageCode = 'en';
            // Sign out so OTP always required
            auth.signOut().catch(function() {});
            console.log('[SpinWheel] Firebase auth ready');
        } catch (e) {
            console.error('[SpinWheel] Firebase init error:', e);
        }
    }
    
    // ── BIND EVENTS ──
    function bindEvents() {
        document.getElementById('sw-close').onclick = hide;
        document.getElementById('sw-spin').onclick = handleSpin;
        document.getElementById('sw-name').oninput = validateClaimForm;
        
        document.getElementById('sw-country').onchange = function(e) {
            selectedCountryCode = e.target.value;
            userCountry = e.target.options[e.target.selectedIndex].dataset.country;
            document.getElementById('sw-phone-code').value = selectedCountryCode;
            validateClaimForm();
        };
        
        document.getElementById('sw-phone').oninput = function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 15);
            validateClaimForm();
        };
        
        document.getElementById('sw-send-otp').onclick = handleSendOtp;
        
        // OTP box navigation
        var otpInputs = document.querySelectorAll('.sw-otp-input');
        for (var i = 0; i < otpInputs.length; i++) {
            (function(idx) {
                otpInputs[idx].oninput = function(e) {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
                    if (e.target.value && idx < 5) otpInputs[idx + 1].focus();
                    checkOtp();
                };
                otpInputs[idx].onkeydown = function(e) {
                    if (e.key === 'Backspace' && !e.target.value && idx > 0) otpInputs[idx - 1].focus();
                };
                otpInputs[idx].addEventListener('paste', function(e) {
                    e.preventDefault();
                    var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
                    for (var j = 0; j < pasted.length && (idx + j) < otpInputs.length; j++) {
                        otpInputs[idx + j].value = pasted[j];
                    }
                    checkOtp();
                    if (pasted.length === 6) setTimeout(handleVerify, 100);
                });
            })(i);
        }
        
        document.getElementById('sw-verify').onclick = handleVerify;
        document.getElementById('sw-resend').onclick = handleResend;
        document.getElementById('sw-change-num').onclick = function() { goToStep('claim'); clearOtpInputs(); };
        document.getElementById('sw-close-already').onclick = hide;
        document.getElementById('sw-start-shopping').onclick = hide;
    }
    
    function validateClaimForm() {
        var name = document.getElementById('sw-name').value.trim();
        var phone = document.getElementById('sw-phone').value;
        document.getElementById('sw-send-otp').disabled = !(name.length >= 2 && phone.length >= 7);
    }
    
    function checkOtp() {
        var otp = '';
        var inputs = document.querySelectorAll('.sw-otp-input');
        for (var i = 0; i < inputs.length; i++) otp += inputs[i].value;
        document.getElementById('sw-verify').disabled = otp.length !== 6;
    }
    
    function clearOtpInputs() {
        var inputs = document.querySelectorAll('.sw-otp-input');
        for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
        document.getElementById('sw-verify').disabled = true;
    }
    
    function goToStep(step) {
        var steps = ['wheel', 'claim', 'otp', 'result', 'already'];
        for (var i = 0; i < steps.length; i++) {
            var el = document.getElementById('sw-step-' + steps[i]);
            if (el) el.classList.toggle('sw-hidden', steps[i] !== step);
        }
    }
    
    // ── HANDLE SPIN ──
    // Wheel starts spinning AND immediately shows claim form
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        
        var btn = document.getElementById('sw-spin');
        btn.disabled = true;
        btn.textContent = '\uD83C\uDFB2 Spinning...';
        
        // Calculate prize (but DON'T reveal it)
        var totalWeight = 0;
        for (var i = 0; i < PRIZES.length; i++) totalWeight += PRIZES[i].weight;
        var random = Math.random() * totalWeight;
        var selectedPrize = PRIZES[0];
        for (var i = 0; i < PRIZES.length; i++) {
            random -= PRIZES[i].weight;
            if (random <= 0) { selectedPrize = PRIZES[i]; break; }
        }
        var segmentIndex = selectedPrize.segments[Math.floor(Math.random() * selectedPrize.segments.length)];
        wonAmount = selectedPrize.value;
        
        // Start wheel animation
        var segAngle = 360 / SEGMENTS.length;
        var targetAngle = 360 - (segmentIndex * segAngle + segAngle / 2);
        var spins = 5 + Math.floor(Math.random() * 3);
        var totalRotation = spins * 360 + targetAngle;
        document.getElementById('sw-wheel').style.transform = 'rotate(' + totalRotation + 'deg)';
        
        // After 1.5 seconds (while wheel is STILL spinning), show the claim form
        setTimeout(function() {
            goToStep('claim');
            document.getElementById('sw-name').focus();
            isSpinning = false;
        }, 1500);
    }
    
    // ── SEND OTP (real Firebase) ──
    function handleSendOtp() {
        userName = document.getElementById('sw-name').value.trim();
        var phone = document.getElementById('sw-phone').value;
        userPhone = selectedCountryCode + phone;
        
        console.log('[SpinWheel] Phone captured:', userPhone);
        
        var btn = document.getElementById('sw-send-otp');
        btn.disabled = true;
        btn.textContent = 'Checking...';
        
        // First check if this phone already spun
        checkCanSpin(userPhone).then(function(result) {
            if (!result.canSpin) {
                goToStep('already');
                document.getElementById('sw-next-spin').textContent = result.daysLeft + ' days';
                return;
            }
            
            btn.textContent = 'Sending OTP...';
            
            if (!auth) {
                toast('Authentication not ready. Please refresh page.', 'error');
                btn.disabled = false;
                btn.textContent = 'Send OTP to Claim \u2728';
                return;
            }
            
            // Setup reCAPTCHA (invisible, no user interaction)
            setupRecaptcha().then(function() {
                // Send real SMS OTP
                auth.signInWithPhoneNumber(userPhone, recaptchaVerifier).then(function(result) {
                    confirmationResult = result;
                    console.log('[SpinWheel] OTP sent to', userPhone);
                    showOtpStep();
                    toast('OTP sent to ' + userPhone, 'success');
                }).catch(function(err) {
                    console.error('[SpinWheel] OTP send error:', err);
                    var msg = 'Failed to send OTP. Please try again.';
                    if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Wait a few minutes.';
                    if (err.code === 'auth/invalid-phone-number') msg = 'Invalid phone number. Check country code.';
                    toast(msg, 'error');
                    btn.disabled = false;
                    btn.textContent = 'Send OTP to Claim \u2728';
                    // Clear reCAPTCHA for retry
                    resetRecaptcha();
                });
            }).catch(function(err) {
                console.error('[SpinWheel] reCAPTCHA error:', err);
                toast('Verification setup failed. Refresh page.', 'error');
                btn.disabled = false;
                btn.textContent = 'Send OTP to Claim \u2728';
            });
        });
    }
    
    // ── RECAPTCHA MANAGEMENT (invisible, no visible badge) ──
    function setupRecaptcha() {
        return new Promise(function(resolve, reject) {
            try {
                // Always clear and recreate to avoid "already rendered" error
                resetRecaptcha();
                
                recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sw-recaptcha', {
                    size: 'invisible',
                    callback: function() {
                        console.log('[SpinWheel] reCAPTCHA solved');
                    },
                    'expired-callback': function() {
                        console.log('[SpinWheel] reCAPTCHA expired');
                        resetRecaptcha();
                    }
                });
                
                recaptchaVerifier.render().then(function(widgetId) {
                    recaptchaWidgetId = widgetId;
                    console.log('[SpinWheel] reCAPTCHA rendered, widget:', widgetId);
                    resolve();
                }).catch(function(err) {
                    reject(err);
                });
            } catch (e) {
                reject(e);
            }
        });
    }
    
    function resetRecaptcha() {
        // Clear the reCAPTCHA container completely
        var container = document.getElementById('sw-recaptcha');
        if (container) container.innerHTML = '';
        
        // Reset the verifier
        if (recaptchaVerifier) {
            try { recaptchaVerifier.clear(); } catch(e) {}
        }
        recaptchaVerifier = null;
        recaptchaWidgetId = null;
        
        // Also hide the reCAPTCHA badge that Google adds to page
        var badges = document.querySelectorAll('.grecaptcha-badge');
        for (var i = 0; i < badges.length; i++) {
            badges[i].style.visibility = 'hidden';
        }
    }
    
    function showOtpStep() {
        document.getElementById('sw-otp-phone').textContent = userPhone;
        goToStep('otp');
        document.querySelector('.sw-otp-input').focus();
        startResendTimer();
        
        var btn = document.getElementById('sw-send-otp');
        btn.disabled = false;
        btn.textContent = 'Send OTP to Claim \u2728';
    }
    
    var resendInterval = null;
    function startResendTimer() {
        var countdown = 30;
        var btn = document.getElementById('sw-resend');
        var timerSpan = document.getElementById('sw-resend-timer');
        btn.disabled = true;
        timerSpan.textContent = countdown;
        if (resendInterval) clearInterval(resendInterval);
        resendInterval = setInterval(function() {
            countdown--;
            timerSpan.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(resendInterval);
                btn.disabled = false;
                btn.innerHTML = 'Resend OTP';
            }
        }, 1000);
    }
    
    function handleResend() {
        resetRecaptcha();
        goToStep('claim');
        clearOtpInputs();
        document.getElementById('sw-send-otp').textContent = 'Send OTP to Claim \u2728';
        validateClaimForm();
    }
    
    // ── VERIFY OTP (real Firebase) ──
    function handleVerify() {
        var otp = '';
        var inputs = document.querySelectorAll('.sw-otp-input');
        for (var i = 0; i < inputs.length; i++) otp += inputs[i].value;
        if (otp.length !== 6) return;
        
        var btn = document.getElementById('sw-verify');
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        
        if (!confirmationResult) {
            toast('Session expired. Please request a new OTP.', 'error');
            goToStep('claim');
            return;
        }
        
        confirmationResult.confirm(otp).then(function(result) {
            console.log('[SpinWheel] OTP verified!');
            
            // Save Firebase user data
            var firebaseUser = result.user;
            var savedUser = {};
            try { savedUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) {}
            savedUser.firebaseUid = firebaseUser.uid;
            savedUser.phone = userPhone;
            savedUser.name = userName;
            localStorage.setItem('seasalt_user', JSON.stringify(savedUser));
            localStorage.setItem('seasalt_phone', userPhone);
            
            // Sign out Firebase so OTP always required
            if (auth) auth.signOut().catch(function() {});
            
            // NOW reveal the prize!
            document.getElementById('sw-result-amount').textContent = '\u20B9' + wonAmount;
            goToStep('result');
            toast('\uD83C\uDF89 You won \u20B9' + wonAmount + '!', 'success');
            
            // Save to wallet
            saveToWallet();
        }).catch(function(err) {
            console.error('[SpinWheel] OTP verify error:', err);
            var msg = 'Invalid OTP. Please try again.';
            if (err.code === 'auth/code-expired') msg = 'OTP expired. Request a new one.';
            toast(msg, 'error');
            clearOtpInputs();
            document.querySelector('.sw-otp-input').focus();
            btn.disabled = false;
            btn.textContent = 'Verify & Reveal Prize \uD83C\uDF89';
        });
    }
    
    // ── CHECK CAN SPIN ──
    function checkCanSpin(phone) {
        return fetch(SUPABASE_URL + '/rest/v1/wallet_transactions?user_phone=eq.' + encodeURIComponent(phone) + '&type=eq.spin_reward&order=created_at.desc&limit=1', {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).then(function(res) { return res.json(); }).then(function(data) {
            if (data && data.length > 0) {
                var lastSpin = new Date(data[0].created_at);
                var daysSince = (new Date() - lastSpin) / (1000 * 60 * 60 * 24);
                if (daysSince < 30) return { canSpin: false, daysLeft: Math.ceil(30 - daysSince) };
            }
            return { canSpin: true };
        }).catch(function() { return { canSpin: true }; });
    }
    
    // ── SAVE TO WALLET ──
    function saveToWallet() {
        console.log('[SpinWheel] Saving wallet with amount:', wonAmount);
        
        var now = new Date();
        var expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        
        var userData = { name: userName, phone: userPhone, country: userCountry };
        localStorage.setItem('seasalt_user', JSON.stringify(userData));
        
        var walletData = { amount: wonAmount, addedAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify(walletData));
        localStorage.setItem('seasalt_spin_done', 'true');
        
        console.log('[SpinWheel] Wallet saved:', walletData);
        
        // Save to Supabase
        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(userPhone), {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).then(function(res) { return res.json(); }).then(function(existing) {
            var dbData = { name: userName, selected_country: userCountry, wallet_balance: wonAmount, wallet_expires_at: expiresAt.toISOString(), last_seen: now.toISOString() };
            if (existing && existing.length > 0) {
                return fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(userPhone), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
                    body: JSON.stringify(dbData)
                });
            } else {
                return fetch(SUPABASE_URL + '/rest/v1/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ phone: userPhone, total_visits: 1, name: userName, selected_country: userCountry, wallet_balance: wonAmount, wallet_expires_at: expiresAt.toISOString(), last_seen: now.toISOString() })
                });
            }
        }).then(function() {
            return fetch(SUPABASE_URL + '/rest/v1/wallet_transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ user_phone: userPhone, amount: wonAmount, type: 'spin_reward', description: 'Spin wheel reward', balance_after: wonAmount })
            });
        }).catch(function(e) { console.warn('[SpinWheel] Supabase error:', e); });
        
        // Update UI
        if (typeof UI !== 'undefined') {
            UI.updateCartUI();
            if (typeof UI.startWalletTimer === 'function') UI.startWalletTimer();
        }
        
        window.dispatchEvent(new CustomEvent('walletUpdated', { detail: { amount: wonAmount, expiresAt: expiresAt.toISOString() } }));
    }
    
    // ── SHOW / HIDE ──
    function shouldShow() {
        if (localStorage.getItem('seasalt_spin_done')) return false;
        return true;
    }
    
    function show() {
        if (!modal) createModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function hide() {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
        if (resendInterval) clearInterval(resendInterval);
    }
    
    function toast(msg, type) {
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:12px;color:#fff;font-weight:600;z-index:99999;max-width:90%;text-align:center;background:' + (type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#F59E0B');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function() { t.remove(); }, 4000);
    }
    
    // ── INIT ──
    function init() {
        console.log('[SpinWheel] v15 Initializing...');
        
        var existingWallet = localStorage.getItem(SPIN_WALLET_KEY);
        if (existingWallet) {
            try {
                var data = JSON.parse(existingWallet);
                if (data.amount > 0 && new Date(data.expiresAt) > new Date()) {
                    if (typeof UI !== 'undefined') {
                        UI.updateCartUI();
                        if (typeof UI.startWalletTimer === 'function') UI.startWalletTimer();
                    }
                }
            } catch (e) {}
        }
        
        if (shouldShow()) {
            setTimeout(show, 1000);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.SpinWheel = { init: init, show: show, hide: hide };
    
})();
