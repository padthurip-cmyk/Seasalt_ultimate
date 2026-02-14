/**
 * SeaSalt Pickles - Spin Wheel v16 (Real Firebase OTP)
 * =====================================================
 * FLOW:
 *  1. User sees wheel → taps SPIN NOW
 *  2. Wheel starts spinning (CSS infinite rotation)
 *  3. Popup appears ON TOP: Name + Phone → Send OTP → Enter OTP
 *     Message: "Prize is guaranteed! Verify to continue"
 *  4. After OTP verified → wheel does final spin to prize → stops → reveals amount
 *  5. Amount added to wallet
 *
 * No CAPTCHA UI. No test OTP. Real Firebase SMS globally.
 */
(function() {
    'use strict';

    console.log('[SpinWheel] v16 loaded');

    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    var SPIN_WALLET_KEY = 'seasalt_spin_wallet';

    var modal = null;
    var confirmationResult = null;
    var userPhone = null;
    var userName = null;
    var selectedCountryCode = '+91';
    var userCountry = 'India';
    var auth = null;
    var recaptchaVerifier = null;
    var recaptchaRendered = false;
    var wonAmount = 0;
    var wonSegmentIndex = 0;
    var resendInterval = null;

    var SEGMENTS = [
        { label: '\u20B999',  value: 99,  color: '#10B981' },
        { label: '\u20B9199', value: 199, color: '#FBBF24' },
        { label: '\u20B9399', value: 399, color: '#8B5CF6' },
        { label: '\u20B9199', value: 199, color: '#34D399' },
        { label: '\u20B9599', value: 599, color: '#F87171' },
        { label: '\u20B9199', value: 199, color: '#FB923C' },
        { label: '\u20B999',  value: 99,  color: '#60A5FA' },
        { label: '\u20B9199', value: 199, color: '#4ADE80' }
    ];

    var PRIZES = [
        { value: 99,  weight: 20, segments: [0, 6] },
        { value: 199, weight: 50, segments: [1, 3, 5, 7] },
        { value: 399, weight: 20, segments: [2] },
        { value: 599, weight: 10, segments: [4] }
    ];

    /* ═══════════ STYLES ═══════════ */
    var STYLES =
        '.sw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;visibility:hidden;transition:all .3s}.sw-overlay.active{opacity:1;visibility:visible}' +
        '.sw-modal{background:linear-gradient(145deg,#EA580C,#DC2626);border-radius:24px;width:100%;max-width:360px;max-height:90vh;overflow-y:auto;position:relative;transform:scale(.9);transition:transform .3s;box-shadow:0 20px 60px rgba(0,0,0,.4)}.sw-overlay.active .sw-modal{transform:scale(1)}' +
        '.sw-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);border:none;color:#fff;font-size:18px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center}' +
        '.sw-header{text-align:center;padding:28px 20px 16px}.sw-badge{display:inline-block;background:#F59E0B;color:#fff;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:10px;text-transform:uppercase}.sw-title{font-size:26px;font-weight:800;color:#fff;margin:0 0 6px}.sw-subtitle{font-size:14px;color:rgba(255,255,255,.9);margin:0}' +
        '.sw-content{padding:0 24px 28px}.sw-hidden{display:none!important}' +
        /* wheel */
        '.sw-wheel-section{display:flex;flex-direction:column;align-items:center;gap:20px}.sw-wheel-wrap{position:relative;width:280px;height:280px}.sw-wheel-img{width:100%;height:100%}.sw-pointer{position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-top:30px solid #fff;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3));z-index:10}.sw-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;background:linear-gradient(180deg,#fff,#f0f0f0);border-radius:50%;border:4px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 15px rgba(0,0,0,.2);z-index:5}' +
        '.sw-btn-spin{padding:16px 40px;background:linear-gradient(135deg,#F97316,#EA580C);color:#fff;border:none;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(249,115,22,.5);text-transform:uppercase;transition:transform .2s}.sw-btn-spin:disabled{opacity:.7;cursor:not-allowed}' +
        /* spinning animation */
        '@keyframes sw-spin-infinite{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
        '.sw-spinning{animation:sw-spin-infinite 1s linear infinite}' +
        '.sw-final-spin{transition:transform 4s cubic-bezier(.17,.67,.12,.99)}' +
        /* form */
        '.sw-claim{display:flex;flex-direction:column;gap:12px}' +
        '.sw-guaranteed{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:12px;padding:14px;text-align:center;margin-bottom:8px}.sw-guaranteed-text{color:#FCD34D;font-size:15px;font-weight:700}' +
        '.sw-input-group{display:flex;flex-direction:column;gap:4px}.sw-label{font-size:13px;font-weight:600;color:rgba(255,255,255,.9)}.sw-select,.sw-input{width:100%;padding:14px 16px;border:none;border-radius:12px;background:#fff;font-size:16px;font-weight:500;color:#333;outline:none;box-sizing:border-box}.sw-phone-row{display:flex;gap:8px}.sw-phone-code{width:85px;flex-shrink:0;text-align:center;font-weight:700;background:#f3f4f6}' +
        '.sw-btn{width:100%;padding:16px;border:none;border-radius:12px;font-size:17px;font-weight:700;cursor:pointer;transition:transform .2s,opacity .2s}.sw-btn:disabled{opacity:.6;cursor:not-allowed}.sw-btn-orange{background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;box-shadow:0 4px 15px rgba(245,158,11,.4)}.sw-btn-green{background:linear-gradient(135deg,#10B981,#059669);color:#fff;box-shadow:0 4px 15px rgba(16,185,129,.4)}.sw-helper{text-align:center;color:rgba(255,255,255,.8);font-size:13px;margin-top:4px}' +
        '.sw-error{background:#FEE2E2;color:#DC2626;padding:10px;border-radius:8px;font-size:13px;text-align:center}' +
        /* otp */
        '.sw-otp{display:flex;flex-direction:column;align-items:center;gap:16px}.sw-otp-label{color:#fff;font-size:14px;text-align:center}.sw-otp-phone{color:#FCD34D;font-weight:700}.sw-otp-boxes{display:flex;gap:8px;justify-content:center}.sw-otp-input{width:46px;height:56px;border:none;border-radius:10px;background:#fff;font-size:24px;font-weight:700;text-align:center;color:#333;outline:none}' +
        '.sw-resend{color:rgba(255,255,255,.8);font-size:13px;text-align:center}.sw-resend-link{color:#FCD34D;cursor:pointer;font-weight:600;background:none;border:none}.sw-resend-link:disabled{color:rgba(255,255,255,.5);cursor:not-allowed}.sw-change-link{color:rgba(255,255,255,.7);font-size:13px;cursor:pointer;background:none;border:none;text-decoration:underline;margin-top:8px}' +
        /* result */
        '.sw-result{text-align:center;padding:20px 0}.sw-result-icon{font-size:70px;margin-bottom:16px}.sw-result-title{font-size:24px;font-weight:800;color:#fff;margin:0 0 8px}.sw-result-text{font-size:15px;color:rgba(255,255,255,.9);margin-bottom:16px}.sw-won-box{background:linear-gradient(135deg,#10B981,#059669);border-radius:16px;padding:20px;text-align:center;margin-bottom:8px}.sw-won-label{font-size:14px;color:rgba(255,255,255,.9)}.sw-won-amount{font-size:48px;font-weight:900;color:#fff}.sw-won-note{font-size:12px;color:rgba(255,255,255,.8);margin-top:4px}' +
        '.sw-timer-box{background:rgba(0,0,0,.25);border-radius:12px;padding:14px;margin:16px 0}.sw-timer-label{font-size:12px;color:rgba(255,255,255,.8);margin-bottom:4px}.sw-timer-value{font-size:28px;font-weight:800;color:#FCD34D;font-family:monospace}.sw-btn-continue{padding:14px 36px;background:#fff;color:#EA580C;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;width:100%}' +
        /* hide google recaptcha badge globally */
        '.grecaptcha-badge{visibility:hidden!important;position:fixed!important;bottom:-100px!important}' +
        '@media(max-width:380px){.sw-modal{max-width:340px}.sw-wheel-wrap{width:250px;height:250px}.sw-otp-input{width:40px;height:50px;font-size:20px}}';

    /* ═══════════ WHEEL SVG ═══════════ */
    function createWheelSVG() {
        var s = 280, cx = s/2, cy = s/2, r = s/2-10, n = SEGMENTS.length, a = 360/n;
        var paths = '', labels = '';
        for (var i = 0; i < n; i++) {
            var seg = SEGMENTS[i];
            var sa = (i*a-90)*Math.PI/180, ea = ((i+1)*a-90)*Math.PI/180;
            var x1 = cx+r*Math.cos(sa), y1 = cy+r*Math.sin(sa);
            var x2 = cx+r*Math.cos(ea), y2 = cy+r*Math.sin(ea);
            paths += '<path d="M'+cx+','+cy+' L'+x1.toFixed(1)+','+y1.toFixed(1)+' A'+r+','+r+' 0 0,1 '+x2.toFixed(1)+','+y2.toFixed(1)+' Z" fill="'+seg.color+'" stroke="#fff" stroke-width="2"/>';
            var ma = ((i+.5)*a-90)*Math.PI/180, lr = r*.65, lx = cx+lr*Math.cos(ma), ly = cy+lr*Math.sin(ma);
            labels += '<g transform="rotate('+((i+.5)*a)+','+lx.toFixed(1)+','+ly.toFixed(1)+')"><rect x="'+(lx-28).toFixed(1)+'" y="'+(ly-12).toFixed(1)+'" width="56" height="24" rx="12" fill="#fff" fill-opacity=".95"/><text x="'+lx.toFixed(1)+'" y="'+(ly+1).toFixed(1)+'" font-size="14" font-weight="800" fill="'+seg.color+'" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">'+seg.label+'</text></g>';
        }
        return '<svg viewBox="0 0 '+s+' '+s+'" id="sw-wheel"><circle cx="'+cx+'" cy="'+cy+'" r="'+(r+6)+'" fill="#fff"/>'+paths+labels+'</svg>';
    }

    /* ═══════════ HTML ═══════════ */
    function createModal() {
        if (!document.getElementById('sw-styles')) {
            var st = document.createElement('style'); st.id = 'sw-styles'; st.textContent = STYLES;
            document.head.appendChild(st);
        }

        var H = '<div class="sw-overlay" id="sw-overlay"><div class="sw-modal">' +
            '<button class="sw-close" id="sw-close">\u2715</button>' +

            /* STEP 1 — WHEEL */
            '<div id="sw-step-wheel">' +
              '<div class="sw-header"><div class="sw-badge">\uD83C\uDF81 Limited Time</div>' +
              '<h2 class="sw-title">\uD83C\uDF89 Welcome Gift!</h2>' +
              '<p class="sw-subtitle">Spin to win wallet cashback up to \u20B9599</p></div>' +
              '<div class="sw-content"><div class="sw-wheel-section">' +
              '<div class="sw-wheel-wrap"><div class="sw-pointer"></div>'+createWheelSVG()+'<div class="sw-center">\uD83C\uDFB0</div></div>' +
              '<button class="sw-btn-spin" id="sw-spin">\uD83C\uDFB2 SPIN NOW! \uD83C\uDFB2</button>' +
              '</div></div></div>' +

            /* STEP 2 — CLAIM (name + phone) */
            '<div id="sw-step-claim" class="sw-hidden">' +
              '<div class="sw-header" style="padding-bottom:10px"><h2 class="sw-title">\uD83C\uDF81 Claim Your Prize</h2></div>' +
              '<div class="sw-content"><div class="sw-claim">' +
              '<div class="sw-guaranteed"><div class="sw-guaranteed-text">\u2B50 Prize is GUARANTEED! Verify to continue \u2B50</div></div>' +
              '<div class="sw-input-group"><div class="sw-label">Your Name</div><input type="text" class="sw-input" id="sw-name" placeholder="Enter your name"></div>' +
              '<div class="sw-input-group"><div class="sw-label">Country</div><select class="sw-select" id="sw-country">' +
                '<option value="+91" data-country="India">\uD83C\uDDEE\uD83C\uDDF3 India (+91)</option>' +
                '<option value="+1" data-country="USA">\uD83C\uDDFA\uD83C\uDDF8 USA (+1)</option>' +
                '<option value="+44" data-country="UK">\uD83C\uDDEC\uD83C\uDDE7 UK (+44)</option>' +
                '<option value="+971" data-country="UAE">\uD83C\uDDE6\uD83C\uDDEA UAE (+971)</option>' +
                '<option value="+65" data-country="Singapore">\uD83C\uDDF8\uD83C\uDDEC Singapore (+65)</option>' +
                '<option value="+61" data-country="Australia">\uD83C\uDDE6\uD83C\uDDFA Australia (+61)</option>' +
              '</select></div>' +
              '<div class="sw-input-group"><div class="sw-label">Phone Number</div><div class="sw-phone-row"><input type="text" class="sw-input sw-phone-code" id="sw-phone-code" value="+91" readonly><input type="tel" class="sw-input" id="sw-phone" placeholder="9876543210" maxlength="15"></div></div>' +
              '<button class="sw-btn sw-btn-orange" id="sw-send-otp" disabled>Send OTP to Continue \u2728</button>' +
              '<p class="sw-helper">We\'ll send a verification code via SMS</p>' +
              '</div></div></div>' +

            /* STEP 3 — OTP */
            '<div id="sw-step-otp" class="sw-hidden">' +
              '<div class="sw-header" style="padding-bottom:10px"><h2 class="sw-title">\uD83D\uDD12 Verify OTP</h2></div>' +
              '<div class="sw-content">' +
              '<div class="sw-guaranteed" style="padding:14px;margin-bottom:16px"><div class="sw-guaranteed-text">\uD83C\uDF81 Your prize is waiting! Verify to reveal</div></div>' +
              '<div class="sw-otp">' +
              '<p class="sw-otp-label">Enter 6-digit code sent to <span class="sw-otp-phone" id="sw-otp-phone"></span></p>' +
              '<div class="sw-otp-boxes"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"></div>' +
              '<button class="sw-btn sw-btn-green" id="sw-verify" disabled>Verify & Reveal Prize \uD83C\uDF89</button>' +
              '<p class="sw-resend">Didn\'t receive? <button class="sw-resend-link" id="sw-resend" disabled>Resend (<span id="sw-resend-timer">30</span>s)</button></p>' +
              '<button class="sw-change-link" id="sw-change-num">\u2190 Change number</button>' +
              '</div></div></div>' +

            /* STEP 4 — RESULT (after OTP + final spin) */
            '<div id="sw-step-result" class="sw-hidden"><div class="sw-content" style="padding-top:30px"><div class="sw-result">' +
              '<div class="sw-result-icon">\uD83C\uDF8A</div><h3 class="sw-result-title">Congratulations!</h3><p class="sw-result-text">You won</p>' +
              '<div class="sw-won-box"><div class="sw-won-amount" id="sw-result-amount">\u20B9199</div><div class="sw-won-note">\uD83D\uDCB0 Added to your wallet! Use within 48 hours.</div></div>' +
              '<button class="sw-btn-continue" id="sw-start-shopping">Start Shopping \uD83D\uDED2</button>' +
            '</div></div></div>' +

            /* STEP 5 — ALREADY */
            '<div id="sw-step-already" class="sw-hidden"><div class="sw-content" style="padding-top:40px"><div class="sw-result">' +
              '<div class="sw-result-icon">\u231B</div><h3 class="sw-result-title">Already Claimed!</h3>' +
              '<p class="sw-result-text">This number has already spun the wheel this month.</p>' +
              '<div class="sw-timer-box"><div class="sw-timer-label">Next spin available in</div><div class="sw-timer-value" id="sw-next-spin">-- days</div></div>' +
              '<button class="sw-btn-continue" id="sw-close-already">Continue Shopping \u2192</button>' +
            '</div></div></div>' +

        '</div></div>' +
        /* reCAPTCHA container — OUTSIDE modal so it doesn\'t get destroyed */
        '<div id="sw-recaptcha-box" style="position:fixed;bottom:-200px;left:-200px;z-index:-1;opacity:0;pointer-events:none"></div>';

        document.body.insertAdjacentHTML('beforeend', H);
        modal = document.getElementById('sw-overlay');
        bindEvents();
        initFirebase();
    }

    /* ═══════════ FIREBASE ═══════════ */
    function initFirebase() {
        if (typeof firebase === 'undefined') { console.error('[SpinWheel] Firebase SDK missing!'); return; }
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
            auth.signOut().catch(function(){});
            console.log('[SpinWheel] Firebase ready');
        } catch(e) { console.error('[SpinWheel] Firebase error:', e); }
    }

    /* ═══════════ RECAPTCHA — single instance, reuse ═══════════ */
    function getRecaptcha() {
        return new Promise(function(resolve, reject) {
            // If already created and rendered, just resolve
            if (recaptchaVerifier && recaptchaRendered) {
                // Reset existing widget instead of recreating
                try {
                    if (typeof grecaptcha !== 'undefined' && recaptchaVerifier.widgetId !== undefined) {
                        grecaptcha.reset(recaptchaVerifier.widgetId);
                    }
                } catch(e) {}
                resolve(recaptchaVerifier);
                return;
            }

            // First time — create fresh
            var container = document.getElementById('sw-recaptcha-box');
            if (!container) {
                document.body.insertAdjacentHTML('beforeend', '<div id="sw-recaptcha-box" style="position:fixed;bottom:-200px;left:-200px;z-index:-1;opacity:0;pointer-events:none"></div>');
                container = document.getElementById('sw-recaptcha-box');
            }
            container.innerHTML = '<div id="sw-rc-widget"></div>';

            try {
                recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sw-rc-widget', {
                    size: 'invisible',
                    callback: function() { console.log('[SpinWheel] reCAPTCHA OK'); }
                });
                recaptchaVerifier.render().then(function(widgetId) {
                    recaptchaVerifier.widgetId = widgetId;
                    recaptchaRendered = true;
                    console.log('[SpinWheel] reCAPTCHA rendered:', widgetId);
                    resolve(recaptchaVerifier);
                }).catch(reject);
            } catch(e) { reject(e); }
        });
    }

    /* ═══════════ EVENTS ═══════════ */
    function bindEvents() {
        document.getElementById('sw-close').onclick = hide;
        document.getElementById('sw-spin').onclick = handleSpin;
        document.getElementById('sw-name').oninput = validateForm;
        document.getElementById('sw-country').onchange = function(e) {
            selectedCountryCode = e.target.value;
            userCountry = e.target.options[e.target.selectedIndex].dataset.country;
            document.getElementById('sw-phone-code').value = selectedCountryCode;
            validateForm();
        };
        document.getElementById('sw-phone').oninput = function(e) {
            e.target.value = e.target.value.replace(/\D/g,'').slice(0,15);
            validateForm();
        };
        document.getElementById('sw-send-otp').onclick = handleSendOtp;

        var boxes = document.querySelectorAll('.sw-otp-input');
        for (var i = 0; i < boxes.length; i++) {
            (function(idx) {
                boxes[idx].oninput = function(e) {
                    e.target.value = e.target.value.replace(/\D/g,'').slice(0,1);
                    if (e.target.value && idx < 5) boxes[idx+1].focus();
                    checkOtpFull();
                };
                boxes[idx].onkeydown = function(e) {
                    if (e.key === 'Backspace' && !e.target.value && idx > 0) boxes[idx-1].focus();
                };
                boxes[idx].addEventListener('paste', function(e) {
                    e.preventDefault();
                    var p = (e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
                    for (var j = 0; j < p.length && idx+j < boxes.length; j++) boxes[idx+j].value = p[j];
                    checkOtpFull();
                    if (p.length === 6) setTimeout(handleVerify, 100);
                });
            })(i);
        }

        document.getElementById('sw-verify').onclick = handleVerify;
        document.getElementById('sw-resend').onclick = handleResend;
        document.getElementById('sw-change-num').onclick = function() { step('claim'); clearOtpBoxes(); };
        document.getElementById('sw-close-already').onclick = hide;
        document.getElementById('sw-start-shopping').onclick = hide;
    }

    function validateForm() {
        var n = document.getElementById('sw-name').value.trim();
        var p = document.getElementById('sw-phone').value;
        document.getElementById('sw-send-otp').disabled = !(n.length >= 2 && p.length >= 7);
    }

    function checkOtpFull() {
        var otp = '';
        document.querySelectorAll('.sw-otp-input').forEach(function(b) { otp += b.value; });
        document.getElementById('sw-verify').disabled = otp.length !== 6;
    }

    function clearOtpBoxes() {
        document.querySelectorAll('.sw-otp-input').forEach(function(b) { b.value = ''; });
        document.getElementById('sw-verify').disabled = true;
    }

    function step(name) {
        ['wheel','claim','otp','result','already'].forEach(function(s) {
            var el = document.getElementById('sw-step-'+s);
            if (el) el.classList.toggle('sw-hidden', s !== name);
        });
    }

    /* ═══════════ SPIN ═══════════ */
    function handleSpin() {
        var btn = document.getElementById('sw-spin');
        btn.disabled = true;
        btn.textContent = '\uD83C\uDFB2 Spinning...';

        // Pick prize secretly
        var tw = 0;
        for (var i = 0; i < PRIZES.length; i++) tw += PRIZES[i].weight;
        var rnd = Math.random() * tw, pick = PRIZES[0];
        for (var i = 0; i < PRIZES.length; i++) { rnd -= PRIZES[i].weight; if (rnd <= 0) { pick = PRIZES[i]; break; } }
        wonSegmentIndex = pick.segments[Math.floor(Math.random() * pick.segments.length)];
        wonAmount = pick.value;

        // Start infinite spin animation
        var wheel = document.getElementById('sw-wheel');
        wheel.classList.remove('sw-final-spin');
        wheel.style.transition = 'none';
        wheel.style.transform = '';
        wheel.classList.add('sw-spinning');

        // Show claim form after 1 second (wheel keeps spinning behind)
        setTimeout(function() {
            step('claim');
            document.getElementById('sw-name').focus();
        }, 1000);
    }

    /* ═══════════ SEND OTP ═══════════ */
    function handleSendOtp() {
        userName = document.getElementById('sw-name').value.trim();
        userPhone = selectedCountryCode + document.getElementById('sw-phone').value;

        var btn = document.getElementById('sw-send-otp');
        btn.disabled = true;
        btn.textContent = 'Checking...';

        checkCanSpin(userPhone).then(function(res) {
            if (!res.canSpin) {
                // Stop wheel
                var wheel = document.getElementById('sw-wheel');
                wheel.classList.remove('sw-spinning');
                step('already');
                document.getElementById('sw-next-spin').textContent = res.daysLeft + ' days';
                return;
            }

            btn.textContent = 'Sending OTP...';

            if (!auth) {
                toast('Auth not ready. Refresh page.', 'error');
                btn.disabled = false; btn.textContent = 'Send OTP to Continue \u2728';
                return;
            }

            getRecaptcha().then(function(verifier) {
                auth.signInWithPhoneNumber(userPhone, verifier).then(function(result) {
                    confirmationResult = result;
                    console.log('[SpinWheel] OTP sent to', userPhone);
                    document.getElementById('sw-otp-phone').textContent = userPhone;
                    step('otp');
                    document.querySelector('.sw-otp-input').focus();
                    startResend();
                    toast('OTP sent to ' + userPhone, 'success');
                    btn.disabled = false; btn.textContent = 'Send OTP to Continue \u2728';
                }).catch(function(err) {
                    console.error('[SpinWheel] OTP error:', err);
                    var msg = 'Failed to send OTP.';
                    if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Wait a few minutes.';
                    if (err.code === 'auth/invalid-phone-number') msg = 'Invalid phone number.';
                    toast(msg, 'error');
                    btn.disabled = false; btn.textContent = 'Send OTP to Continue \u2728';
                });
            }).catch(function(err) {
                console.error('[SpinWheel] reCAPTCHA error:', err);
                toast('Setup failed. Refresh page.', 'error');
                btn.disabled = false; btn.textContent = 'Send OTP to Continue \u2728';
            });
        });
    }

    /* ═══════════ VERIFY ═══════════ */
    function handleVerify() {
        var otp = '';
        document.querySelectorAll('.sw-otp-input').forEach(function(b) { otp += b.value; });
        if (otp.length !== 6) return;

        var btn = document.getElementById('sw-verify');
        btn.disabled = true; btn.textContent = 'Verifying...';

        if (!confirmationResult) { toast('Session expired. Try again.', 'error'); step('claim'); return; }

        confirmationResult.confirm(otp).then(function(result) {
            console.log('[SpinWheel] OTP verified!');

            // Save user
            var u = result.user;
            var saved = {}; try { saved = JSON.parse(localStorage.getItem('seasalt_user')||'{}'); } catch(e){}
            saved.firebaseUid = u.uid; saved.phone = userPhone; saved.name = userName;
            localStorage.setItem('seasalt_user', JSON.stringify(saved));
            localStorage.setItem('seasalt_phone', userPhone);
            if (auth) auth.signOut().catch(function(){});

            // Mark as done IMMEDIATELY — even before final spin animation
            // This prevents re-show if user refreshes during the 4s spin animation
            localStorage.setItem('seasalt_spin_done', 'true');

            // Now do the FINAL spin to the prize segment
            doFinalSpin();
        }).catch(function(err) {
            console.error('[SpinWheel] Verify error:', err);
            var msg = 'Invalid OTP.';
            if (err.code === 'auth/code-expired') msg = 'OTP expired. Request new one.';
            toast(msg, 'error');
            clearOtpBoxes();
            document.querySelector('.sw-otp-input').focus();
            btn.disabled = false; btn.textContent = 'Verify & Reveal Prize \uD83C\uDF89';
        });
    }

    /* ═══════════ FINAL SPIN (after OTP) ═══════════ */
    function doFinalSpin() {
        // Show wheel again
        step('wheel');
        // Remove button, show "Revealing..." text
        var btn = document.getElementById('sw-spin');
        btn.textContent = '\uD83C\uDF1F Revealing your prize...';
        btn.disabled = true;

        var wheel = document.getElementById('sw-wheel');
        // Stop infinite spin, do targeted final spin
        wheel.classList.remove('sw-spinning');

        // Calculate final angle
        var segAngle = 360 / SEGMENTS.length;
        var targetAngle = 360 - (wonSegmentIndex * segAngle + segAngle / 2);
        var spins = 5 + Math.floor(Math.random() * 3);
        var totalRotation = spins * 360 + targetAngle;

        // Small delay then final spin
        setTimeout(function() {
            wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
            wheel.style.transform = 'rotate(' + totalRotation + 'deg)';
        }, 100);

        // After spin lands, show result
        setTimeout(function() {
            document.getElementById('sw-result-amount').textContent = '\u20B9' + wonAmount;
            step('result');
            toast('\uD83C\uDF89 You won \u20B9' + wonAmount + '!', 'success');
            saveToWallet();
        }, 4300);
    }

    /* ═══════════ RESEND ═══════════ */
    function startResend() {
        var c = 30, btn = document.getElementById('sw-resend'), t = document.getElementById('sw-resend-timer');
        if (!btn || !t) return;
        btn.disabled = true; t.textContent = c;
        if (resendInterval) clearInterval(resendInterval);
        resendInterval = setInterval(function() {
            c--; if (t) t.textContent = c;
            if (c <= 0) { clearInterval(resendInterval); if (btn) { btn.disabled = false; btn.innerHTML = 'Resend OTP'; } }
        }, 1000);
    }

    function handleResend() {
        step('claim');
        clearOtpBoxes();
        document.getElementById('sw-send-otp').textContent = 'Send OTP to Continue \u2728';
        validateForm();
    }

    /* ═══════════ DB ═══════════ */
    function checkCanSpin(phone) {
        return fetch(SUPABASE_URL+'/rest/v1/wallet_transactions?user_phone=eq.'+encodeURIComponent(phone)+'&type=eq.spin_reward&order=created_at.desc&limit=1',{
            headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}
        }).then(function(r){return r.json()}).then(function(d){
            if(d&&d.length>0){var ls=new Date(d[0].created_at),ds=(new Date()-ls)/(864e5);if(ds<30)return{canSpin:false,daysLeft:Math.ceil(30-ds)}}
            return{canSpin:true};
        }).catch(function(){return{canSpin:true}});
    }

    function saveToWallet() {
        var now = new Date(), exp = new Date(now.getTime()+48*36e5);
        localStorage.setItem('seasalt_user', JSON.stringify({name:userName,phone:userPhone,country:userCountry}));
        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify({amount:wonAmount,addedAt:now.toISOString(),expiresAt:exp.toISOString()}));
        localStorage.setItem('seasalt_spin_done','true');

        fetch(SUPABASE_URL+'/rest/v1/users?phone=eq.'+encodeURIComponent(userPhone),{
            headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}
        }).then(function(r){return r.json()}).then(function(ex){
            var d={name:userName,selected_country:userCountry,wallet_balance:wonAmount,wallet_expires_at:exp.toISOString(),last_seen:now.toISOString()};
            if(ex&&ex.length>0)return fetch(SUPABASE_URL+'/rest/v1/users?phone=eq.'+encodeURIComponent(userPhone),{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Prefer':'return=minimal'},body:JSON.stringify(d)});
            else return fetch(SUPABASE_URL+'/rest/v1/users',{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Prefer':'return=minimal'},body:JSON.stringify({phone:userPhone,total_visits:1,name:userName,selected_country:userCountry,wallet_balance:wonAmount,wallet_expires_at:exp.toISOString(),last_seen:now.toISOString()})});
        }).then(function(){
            return fetch(SUPABASE_URL+'/rest/v1/wallet_transactions',{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Prefer':'return=minimal'},body:JSON.stringify({user_phone:userPhone,amount:wonAmount,type:'spin_reward',description:'Spin wheel reward',balance_after:wonAmount})});
        }).catch(function(e){console.warn('[SpinWheel] DB error:',e)});

        if(typeof UI!=='undefined'){UI.updateCartUI();if(typeof UI.startWalletTimer==='function')UI.startWalletTimer();}
        window.dispatchEvent(new CustomEvent('walletUpdated',{detail:{amount:wonAmount,expiresAt:exp.toISOString()}}));
    }

    /* ═══════════ SHOW / HIDE ═══════════ */
    function shouldShow(){
        // Don't show if user already completed a spin
        if(localStorage.getItem('seasalt_spin_done')==='true') return false;
        // Don't show if wallet exists (spin was completed)
        if(localStorage.getItem(SPIN_WALLET_KEY)) return false;
        // Don't show if user already has a phone saved (completed OTP flow)
        if(localStorage.getItem('seasalt_phone')) return false;
        // Don't show if user dismissed the wheel this session (respect their choice)
        if(sessionStorage.getItem('seasalt_spin_dismissed')) return false;
        // Don't show if user dismissed 3+ times total (stop annoying them permanently)
        var dc = parseInt(localStorage.getItem('seasalt_spin_dismiss_count') || '0', 10);
        if(dc >= 3){ localStorage.setItem('seasalt_spin_done', 'true'); return false; }
        return true;
    }
    function show(){if(!modal)createModal();modal.classList.add('active');document.body.style.overflow='hidden';}
    function hide(){
        if(!modal)return;
        modal.classList.remove('active');
        document.body.style.overflow='';
        if(resendInterval)clearInterval(resendInterval);
        // Track dismissal so wheel doesn't re-pop on refresh
        if(!localStorage.getItem('seasalt_spin_done')){
            sessionStorage.setItem('seasalt_spin_dismissed', 'true');
            var dc = parseInt(localStorage.getItem('seasalt_spin_dismiss_count') || '0', 10);
            localStorage.setItem('seasalt_spin_dismiss_count', String(dc + 1));
        }
    }
    function toast(m,t){var e=document.createElement('div');e.style.cssText='position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:12px;color:#fff;font-weight:600;z-index:99999;max-width:90%;text-align:center;background:'+(t==='success'?'#10B981':t==='error'?'#EF4444':'#F59E0B');e.textContent=m;document.body.appendChild(e);setTimeout(function(){e.remove()},4e3);}

    /* ═══════════ INIT ═══════════ */
    function init() {
        console.log('[SpinWheel] v16 init');
        var w = localStorage.getItem(SPIN_WALLET_KEY);
        if(w){try{var d=JSON.parse(w);if(d.amount>0&&new Date(d.expiresAt)>new Date()&&typeof UI!=='undefined'){UI.updateCartUI();if(typeof UI.startWalletTimer==='function')UI.startWalletTimer();}}catch(e){}}
        if(shouldShow())setTimeout(show,1000);
    }

    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
    window.SpinWheel={init:init,show:show,hide:hide};
})();
