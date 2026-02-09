/**
 * SeaSalt Pickles - Spin Wheel v15
 * =================================
 * Based on v14 (working) - ONLY changes:
 *   1. Pickle theme colors on wheel segments
 *   2. Updated prize odds (₹99 ~91%, ₹199 5%, ₹299 2%, ₹399 1%, ₹499 0.67%, ₹599 0.5%)
 *   3. Phone captured IMMEDIATELY on Send OTP click
 *   4. Supabase wallet sync for admin credits
 *   5. 48-hour wallet expiry (unchanged)
 * 
 * TEST OTP: 123456
 */

(function() {
    'use strict';
    
    console.log('[SpinWheel] v15 loaded');
    
    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    var DEMO_OTP = '123456';
    
    // KEY: Use different localStorage key to avoid store.js conflict
    var SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    
    var modal = null;
    var confirmationResult = null;
    var userPhone = null;
    var userName = null;
    var selectedCountryCode = '+91';
    var userCountry = 'India';
    var isSpinning = false;
    var isDemoMode = true;
    var auth = null;
    var recaptchaVerifier = null;
    var wonAmount = 0;
    
    var SEGMENTS = [
        { label: '₹99', value: 99, color: '#D4451A' },
        { label: '₹199', value: 199, color: '#166534' },
        { label: '₹299', value: 299, color: '#DC2626' },
        { label: '₹399', value: 399, color: '#16A34A' },
        { label: '₹499', value: 499, color: '#EA580C' },
        { label: '₹599', value: 599, color: '#F59E0B' }
    ];
    
    var PRIZES = [
        { value: 99, weight: 9083, segments: [0] },
        { value: 199, weight: 500, segments: [1] },
        { value: 299, weight: 200, segments: [2] },
        { value: 399, weight: 100, segments: [3] },
        { value: 499, weight: 67, segments: [4] },
        { value: 599, weight: 50, segments: [5] }
    ];
    
    var STYLES = '.sw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;visibility:hidden;transition:all 0.3s ease}.sw-overlay.active{opacity:1;visibility:visible}.sw-modal{background:linear-gradient(145deg,#EA580C 0%,#DC2626 100%);border-radius:24px;width:100%;max-width:360px;max-height:90vh;overflow-y:auto;position:relative;transform:scale(0.9);transition:transform 0.3s ease;box-shadow:0 20px 60px rgba(0,0,0,0.4)}.sw-overlay.active .sw-modal{transform:scale(1)}.sw-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;color:white;font-size:18px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center}.sw-header{text-align:center;padding:28px 20px 16px}.sw-badge{display:inline-block;background:#F59E0B;color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:10px;text-transform:uppercase}.sw-title{font-size:26px;font-weight:800;color:white;margin:0 0 6px 0}.sw-subtitle{font-size:14px;color:rgba(255,255,255,0.9);margin:0}.sw-content{padding:0 24px 28px}.sw-hidden{display:none!important}.sw-wheel-section{display:flex;flex-direction:column;align-items:center;gap:20px}.sw-wheel-wrap{position:relative;width:280px;height:280px}.sw-wheel-img{width:100%;height:100%;transition:transform 4s cubic-bezier(0.17,0.67,0.12,0.99)}.sw-pointer{position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-top:30px solid white;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));z-index:10}.sw-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;background:linear-gradient(180deg,#fff,#f0f0f0);border-radius:50%;border:4px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 15px rgba(0,0,0,0.2);z-index:5}.sw-btn-spin{padding:16px 40px;background:linear-gradient(135deg,#F97316,#EA580C);color:white;border:none;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(249,115,22,0.5);text-transform:uppercase;transition:transform 0.2s}.sw-btn-spin:disabled{opacity:0.7;cursor:not-allowed}.sw-claim{display:flex;flex-direction:column;gap:12px}.sw-won-box{background:linear-gradient(135deg,#10B981,#059669);border-radius:16px;padding:20px;text-align:center;margin-bottom:8px}.sw-won-label{font-size:14px;color:rgba(255,255,255,0.9)}.sw-won-amount{font-size:48px;font-weight:900;color:white}.sw-won-note{font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px}.sw-input-group{display:flex;flex-direction:column;gap:4px}.sw-label{font-size:13px;font-weight:600;color:rgba(255,255,255,0.9)}.sw-select,.sw-input{width:100%;padding:14px 16px;border:none;border-radius:12px;background:white;font-size:16px;font-weight:500;color:#333;outline:none;box-sizing:border-box}.sw-phone-row{display:flex;gap:8px}.sw-phone-code{width:85px;flex-shrink:0;text-align:center;font-weight:700;background:#f3f4f6}.sw-btn{width:100%;padding:16px;border:none;border-radius:12px;font-size:17px;font-weight:700;cursor:pointer;transition:transform 0.2s,opacity 0.2s}.sw-btn:disabled{opacity:0.6;cursor:not-allowed}.sw-btn-orange{background:linear-gradient(135deg,#F59E0B,#D97706);color:white;box-shadow:0 4px 15px rgba(245,158,11,0.4)}.sw-btn-green{background:linear-gradient(135deg,#10B981,#059669);color:white;box-shadow:0 4px 15px rgba(16,185,129,0.4)}.sw-helper{text-align:center;color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px}.sw-demo-note{background:rgba(251,191,36,0.2);border:1px solid rgba(251,191,36,0.5);border-radius:8px;padding:10px;text-align:center;color:#FCD34D;font-size:13px;font-weight:600}.sw-error{background:#FEE2E2;color:#DC2626;padding:10px;border-radius:8px;font-size:13px;text-align:center}.sw-otp{display:flex;flex-direction:column;align-items:center;gap:16px}.sw-otp-label{color:white;font-size:14px;text-align:center}.sw-otp-phone{color:#FCD34D;font-weight:700}.sw-otp-boxes{display:flex;gap:8px;justify-content:center}.sw-otp-input{width:46px;height:56px;border:none;border-radius:10px;background:white;font-size:24px;font-weight:700;text-align:center;color:#333;outline:none}.sw-resend{color:rgba(255,255,255,0.8);font-size:13px;text-align:center}.sw-resend-link{color:#FCD34D;cursor:pointer;font-weight:600;background:none;border:none}.sw-resend-link:disabled{color:rgba(255,255,255,0.5);cursor:not-allowed}.sw-change-link{color:rgba(255,255,255,0.7);font-size:13px;cursor:pointer;background:none;border:none;text-decoration:underline;margin-top:8px}.sw-result{text-align:center;padding:20px 0}.sw-result-icon{font-size:70px;margin-bottom:16px}.sw-result-title{font-size:24px;font-weight:800;color:white;margin:0 0 8px 0}.sw-result-text{font-size:15px;color:rgba(255,255,255,0.9);margin-bottom:16px}.sw-timer-box{background:rgba(0,0,0,0.25);border-radius:12px;padding:14px;margin:16px 0}.sw-timer-label{font-size:12px;color:rgba(255,255,255,0.8);margin-bottom:4px}.sw-timer-value{font-size:28px;font-weight:800;color:#FCD34D;font-family:monospace}.sw-btn-continue{padding:14px 36px;background:white;color:#EA580C;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;width:100%}@media(max-width:380px){.sw-modal{max-width:340px}.sw-wheel-wrap{width:250px;height:250px}.sw-otp-input{width:40px;height:50px;font-size:20px}}';
    
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
    
    function createModal() {
        if (!document.getElementById('sw-styles')) {
            var style = document.createElement('style');
            style.id = 'sw-styles';
            style.textContent = STYLES;
            document.head.appendChild(style);
        }
        
        var html = '<div class="sw-overlay" id="sw-overlay"><div class="sw-modal"><button class="sw-close" id="sw-close">✕</button><div id="sw-step-wheel"><div class="sw-header"><div class="sw-badge">🎁 Limited Time Offer</div><h2 class="sw-title">🎉 Welcome Gift!</h2><p class="sw-subtitle">Spin to win wallet cashback up to ₹599</p></div><div class="sw-content"><div class="sw-wheel-section"><div class="sw-wheel-wrap"><div class="sw-pointer"></div>'+createWheelSVG()+'<div class="sw-center">🎰</div></div><button class="sw-btn-spin" id="sw-spin">🎲 SPIN NOW! 🎲</button></div></div></div><div id="sw-step-claim" class="sw-hidden"><div class="sw-header" style="padding-bottom:10px;"><h2 class="sw-title">🎉 You Won!</h2></div><div class="sw-content"><div class="sw-claim"><div class="sw-won-box"><div class="sw-won-label">Your Prize</div><div class="sw-won-amount" id="sw-claim-amount">₹199</div><div class="sw-won-note">Verify phone to claim your reward</div></div><div id="sw-claim-error" class="sw-error sw-hidden"></div><div class="sw-input-group"><div class="sw-label">Your Name</div><input type="text" class="sw-input" id="sw-name" placeholder="Enter your name"></div><div class="sw-input-group"><div class="sw-label">Country</div><select class="sw-select" id="sw-country"><option value="+91" data-country="India">🇮🇳 India (+91)</option><option value="+1" data-country="USA">🇺🇸 USA (+1)</option><option value="+44" data-country="UK">🇬🇧 UK (+44)</option><option value="+971" data-country="UAE">🇦🇪 UAE (+971)</option><option value="+65" data-country="Singapore">🇸🇬 Singapore (+65)</option><option value="+61" data-country="Australia">🇦🇺 Australia (+61)</option></select></div><div class="sw-input-group"><div class="sw-label">Phone Number</div><div class="sw-phone-row"><input type="text" class="sw-input sw-phone-code" id="sw-phone-code" value="+91" readonly><input type="tel" class="sw-input" id="sw-phone" placeholder="9876543210" maxlength="10"></div></div><button class="sw-btn sw-btn-orange" id="sw-send-otp" disabled>Send OTP to Claim ✨</button><p class="sw-helper">We\'ll send a verification code</p><div id="sw-recaptcha"></div></div></div></div><div id="sw-step-otp" class="sw-hidden"><div class="sw-header" style="padding-bottom:10px;"><h2 class="sw-title">Verify OTP</h2></div><div class="sw-content"><div class="sw-won-box" style="padding:14px;margin-bottom:16px;"><div class="sw-won-label">Claiming</div><div class="sw-won-amount" id="sw-otp-amount" style="font-size:36px;">₹199</div></div><div class="sw-otp"><p class="sw-otp-label">Enter 6-digit code sent to <span class="sw-otp-phone" id="sw-otp-phone"></span></p><div id="sw-demo-hint" class="sw-demo-note">🔑 Test OTP: <strong>123456</strong></div><div class="sw-otp-boxes"><input type="tel" class="sw-otp-input" maxlength="1" data-i="0"><input type="tel" class="sw-otp-input" maxlength="1" data-i="1"><input type="tel" class="sw-otp-input" maxlength="1" data-i="2"><input type="tel" class="sw-otp-input" maxlength="1" data-i="3"><input type="tel" class="sw-otp-input" maxlength="1" data-i="4"><input type="tel" class="sw-otp-input" maxlength="1" data-i="5"></div><button class="sw-btn sw-btn-green" id="sw-verify" disabled>Verify & Claim 🎉</button><p class="sw-resend">Didn\'t receive? <button class="sw-resend-link" id="sw-resend" disabled>Resend (<span id="sw-resend-timer">30</span>s)</button></p><button class="sw-change-link" id="sw-change-num">← Change number</button></div></div></div><div id="sw-step-already" class="sw-hidden"><div class="sw-content" style="padding-top:40px;"><div class="sw-result"><div class="sw-result-icon">⏳</div><h3 class="sw-result-title">Already Claimed!</h3><p class="sw-result-text">This number has already spun the wheel this month.</p><div class="sw-timer-box"><div class="sw-timer-label">Next spin available in</div><div class="sw-timer-value" id="sw-next-spin">-- days</div></div><button class="sw-btn-continue" id="sw-close-already">Continue Shopping →</button></div></div></div></div></div>';
        
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('sw-overlay');
        bindEvents();
        initFirebase();
    }
    
    function initFirebase() {
        if (typeof firebase === 'undefined') {
            isDemoMode = true;
            return;
        }
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: "AIzaSyBxOXkOWqH_l4Moyp9CK5GKWeCDi9N3pWo",
                    authDomain: "seasaltpickles-c058e.firebaseapp.com",
                    projectId: "seasaltpickles-c058e"
                });
            }
            auth = firebase.auth();
            auth.languageCode = 'en';
            isDemoMode = false;
        } catch (e) {
            isDemoMode = true;
        }
    }
    
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
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            validateClaimForm();
        };
        
        document.getElementById('sw-send-otp').onclick = handleSendOtp;
        
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
            })(i);
        }
        
        document.getElementById('sw-verify').onclick = handleVerify;
        document.getElementById('sw-resend').onclick = handleResend;
        document.getElementById('sw-change-num').onclick = function() { goToStep('claim'); clearOtpInputs(); };
        document.getElementById('sw-close-already').onclick = hide;
    }
    
    function validateClaimForm() {
        var name = document.getElementById('sw-name').value.trim();
        var phone = document.getElementById('sw-phone').value;
        document.getElementById('sw-send-otp').disabled = !(name.length >= 2 && phone.length === 10);
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
        var steps = ['wheel', 'claim', 'otp', 'already'];
        for (var i = 0; i < steps.length; i++) {
            var el = document.getElementById('sw-step-' + steps[i]);
            if (el) el.classList.toggle('sw-hidden', steps[i] !== step);
        }
    }
    
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        
        var btn = document.getElementById('sw-spin');
        btn.disabled = true;
        btn.textContent = '🎲 Spinning...';
        
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
        
        var segAngle = 360 / SEGMENTS.length;
        var targetAngle = 360 - (segmentIndex * segAngle + segAngle / 2);
        var spins = 5 + Math.floor(Math.random() * 3);
        var totalRotation = spins * 360 + targetAngle;
        
        document.getElementById('sw-wheel').style.transform = 'rotate(' + totalRotation + 'deg)';
        
        setTimeout(function() {
            isSpinning = false;
            document.getElementById('sw-claim-amount').textContent = '₹' + wonAmount;
            document.getElementById('sw-otp-amount').textContent = '₹' + wonAmount;
            goToStep('claim');
            document.getElementById('sw-name').focus();
            toast('🎉 You won ₹' + wonAmount + '!', 'success');
        }, 4200);
    }
    
    function handleSendOtp() {
        userName = document.getElementById('sw-name').value.trim();
        var phone = document.getElementById('sw-phone').value;
        userPhone = selectedCountryCode + phone;
        
        // *** CAPTURE PHONE IMMEDIATELY (before OTP verification) ***
        localStorage.setItem('seasalt_phone', userPhone);
        localStorage.setItem('seasalt_user_phone', userPhone);
        try {
            var existingUser = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
            existingUser.phone = userPhone;
            existingUser.name = userName;
            existingUser.country = userCountry;
            localStorage.setItem('seasalt_user', JSON.stringify(existingUser));
        } catch (e) {
            localStorage.setItem('seasalt_user', JSON.stringify({ phone: userPhone, name: userName, country: userCountry }));
        }
        console.log('[SpinWheel] Phone captured IMMEDIATELY:', userPhone);
        
        var btn = document.getElementById('sw-send-otp');
        btn.disabled = true;
        btn.textContent = 'Checking...';
        
        checkCanSpin(userPhone).then(function(result) {
            if (!result.canSpin) {
                goToStep('already');
                document.getElementById('sw-next-spin').textContent = result.daysLeft + ' days';
                return;
            }
            
            btn.textContent = 'Sending OTP...';
            document.getElementById('sw-demo-hint').classList.toggle('sw-hidden', !isDemoMode);
            
            if (isDemoMode) {
                showOtpStep();
                toast('Test mode: Use OTP 123456', 'info');
            } else {
                if (!recaptchaVerifier) {
                    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sw-recaptcha', { size: 'invisible' });
                }
                auth.signInWithPhoneNumber(userPhone, recaptchaVerifier).then(function(result) {
                    confirmationResult = result;
                    showOtpStep();
                    toast('OTP sent!', 'success');
                }).catch(function(err) {
                    isDemoMode = true;
                    document.getElementById('sw-demo-hint').classList.remove('sw-hidden');
                    showOtpStep();
                    toast('Using test OTP: 123456', 'info');
                });
            }
        });
    }
    
    function showOtpStep() {
        document.getElementById('sw-otp-phone').textContent = userPhone;
        goToStep('otp');
        document.querySelector('.sw-otp-input').focus();
        startResendTimer();
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
        goToStep('claim');
        clearOtpInputs();
        document.getElementById('sw-send-otp').textContent = 'Send OTP to Claim ✨';
        validateClaimForm();
    }
    
    function handleVerify() {
        var otp = '';
        var inputs = document.querySelectorAll('.sw-otp-input');
        for (var i = 0; i < inputs.length; i++) otp += inputs[i].value;
        if (otp.length !== 6) return;
        
        var btn = document.getElementById('sw-verify');
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        
        if (isDemoMode) {
            if (otp === DEMO_OTP) {
                saveToWallet();
            } else {
                toast('Invalid OTP. Use 123456', 'error');
                clearOtpInputs();
                document.querySelector('.sw-otp-input').focus();
                btn.textContent = 'Verify & Claim 🎉';
            }
        } else {
            confirmationResult.confirm(otp).then(function() {
                saveToWallet();
            }).catch(function() {
                toast('Invalid OTP', 'error');
                clearOtpInputs();
                document.querySelector('.sw-otp-input').focus();
                btn.textContent = 'Verify & Claim 🎉';
            });
        }
    }
    
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
    
    function saveToWallet() {
        console.log('[SpinWheel] Saving wallet with amount:', wonAmount);
        
        var now = new Date();
        var expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
        
        // Save user data to ALL keys (for analytics + wallet sync)
        var userData = { name: userName, phone: userPhone, country: userCountry };
        localStorage.setItem('seasalt_user', JSON.stringify(userData));
        localStorage.setItem('seasalt_phone', userPhone);
        localStorage.setItem('seasalt_user_phone', userPhone);
        localStorage.setItem('seasalt_spin_phone', userPhone);
        
        // ═══════════════════════════════════════════════════════════════
        // KEY FIX: Save to 'seasalt_spin_wallet' (NOT 'seasalt_wallet')
        // This avoids conflict with store.js
        // ═══════════════════════════════════════════════════════════════
        var walletData = { 
            amount: wonAmount, 
            addedAt: now.toISOString(), 
            expiresAt: expiresAt.toISOString() 
        };
        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify(walletData));
        localStorage.setItem('seasalt_spin_done', 'true');
        
        console.log('[SpinWheel] Saved to localStorage key:', SPIN_WALLET_KEY);
        console.log('[SpinWheel] Wallet data:', walletData);
        
        // Save to Supabase
        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(userPhone), {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).then(function(res) { return res.json(); }).then(function(existing) {
            var dbData = {
                name: userName,
                selected_country: userCountry,
                wallet_balance: wonAmount,
                wallet_expires_at: expiresAt.toISOString(),
                last_seen: now.toISOString()
            };
            
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
        }).catch(function(e) { console.warn('Supabase error:', e); });
        
        // Update UI
        if (typeof UI !== 'undefined') {
            console.log('[SpinWheel] Updating UI wallet display...');
            try {
                var wallet = UI.getSpinWallet ? UI.getSpinWallet() : null;
                if (wallet) {
                    UI.updateWalletDisplay(wallet);
                }
                UI.updateCartUI();
                if (typeof UI.startWalletTimer === 'function') {
                    UI.startWalletTimer();
                }
            } catch (e) {
                console.warn('[SpinWheel] UI update error:', e);
            }
        }
        
        // Direct DOM fallback - ensure wallet shows even if UI module has issues
        try {
            var walletBtn = document.getElementById('wallet-btn');
            var walletBalance = document.getElementById('wallet-balance');
            if (walletBtn && walletBalance) {
                walletBtn.classList.add('has-timer');
                var timeLeft = expiresAt - new Date();
                var h = Math.floor(timeLeft / 3600000);
                var m = Math.floor((timeLeft % 3600000) / 60000);
                var s = Math.floor((timeLeft % 60000) / 1000);
                var timeStr = h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
                walletBalance.innerHTML = '<span class="wallet-amount">₹' + wonAmount + '</span><span class="wallet-timer">⏱ ' + timeStr + '</span>';
                console.log('[SpinWheel] Direct DOM wallet update done: ₹' + wonAmount);
            }
        } catch (e) {}
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('walletUpdated', {
            detail: { amount: wonAmount, expiresAt: expiresAt.toISOString() }
        }));
        
        // Close modal and show toast
        hide();
        toast('🎊 ₹' + wonAmount + ' added to wallet! Use within 48 hours.', 'success');
        
        // Retry UI update after modal closes (elements may be more accessible)
        setTimeout(function() {
            if (typeof UI !== 'undefined') {
                try {
                    var wallet = UI.getSpinWallet ? UI.getSpinWallet() : null;
                    if (wallet) {
                        UI.updateWalletDisplay(wallet);
                        UI.updateCartUI();
                        if (typeof UI.startWalletTimer === 'function') UI.startWalletTimer();
                    }
                } catch (e) {}
            }
            
            // Backup: start own countdown timer if UI timer isn't running
            startBackupWalletTimer(expiresAt);
        }, 600);
    }
    
    // Backup wallet timer - updates DOM directly every second
    var backupTimerInterval = null;
    function startBackupWalletTimer(expiresAt) {
        if (backupTimerInterval) clearInterval(backupTimerInterval);
        
        backupTimerInterval = setInterval(function() {
            var walletBalance = document.getElementById('wallet-balance');
            if (!walletBalance) return;
            
            var timeLeft = new Date(expiresAt) - new Date();
            if (timeLeft <= 0) {
                clearInterval(backupTimerInterval);
                localStorage.removeItem(SPIN_WALLET_KEY);
                var walletBtn = document.getElementById('wallet-btn');
                if (walletBtn) walletBtn.classList.remove('has-timer');
                walletBalance.textContent = '₹0';
                return;
            }
            
            // Only update if UI.startWalletTimer hasn't taken over
            var timerEl = walletBalance.querySelector('.wallet-timer');
            if (timerEl) {
                var h = Math.floor(timeLeft / 3600000);
                var m = Math.floor((timeLeft % 3600000) / 60000);
                var s = Math.floor((timeLeft % 60000) / 1000);
                timerEl.textContent = '⏱ ' + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
            }
        }, 1000);
    }
    
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
    }
    
    function toast(msg, type) {
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:12px;color:#fff;font-weight:600;z-index:99999;max-width:90%;text-align:center;background:' + (type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#F59E0B');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function() { t.remove(); }, 4000);
    }
    
    function init() {
        console.log('[SpinWheel] v15 Initializing...');
        
        // Inject wallet timer CSS if not already present (backup for UI module)
        if (!document.getElementById('wallet-timer-css')) {
            var style = document.createElement('style');
            style.id = 'wallet-timer-css';
            style.textContent = '#wallet-btn.has-timer{background:linear-gradient(135deg,#f97316 0%,#ea580c 100%)!important;color:white!important;padding:6px 12px!important;animation:walletGlow 2s ease-in-out infinite}#wallet-btn.has-timer svg{stroke:white!important}#wallet-btn.has-timer #wallet-balance{display:flex!important;flex-direction:column!important;align-items:center!important;line-height:1.1!important;gap:1px!important}.wallet-amount{font-size:14px!important;font-weight:700!important;color:white!important}.wallet-timer{font-size:9px!important;font-weight:600!important;color:rgba(255,255,255,0.9)!important;font-family:monospace!important;background:rgba(0,0,0,0.2)!important;padding:1px 6px!important;border-radius:4px!important}@keyframes walletGlow{0%,100%{box-shadow:0 2px 10px rgba(249,115,22,0.4)}50%{box-shadow:0 2px 20px rgba(249,115,22,0.6)}}';
            document.head.appendChild(style);
        }
        
        // Check if user already has spin wallet
        var existingWallet = localStorage.getItem(SPIN_WALLET_KEY);
        console.log('[SpinWheel] Existing spin wallet:', existingWallet);
        
        if (existingWallet) {
            try {
                var data = JSON.parse(existingWallet);
                if (data.amount > 0 && new Date(data.expiresAt) > new Date()) {
                    console.log('[SpinWheel] Valid wallet found: ₹' + data.amount + ', updating UI');
                    if (typeof UI !== 'undefined') {
                        UI.updateCartUI();
                        if (typeof UI.startWalletTimer === 'function') {
                            UI.startWalletTimer();
                        }
                    }
                    // Direct DOM fallback
                    try {
                        var walletBtn = document.getElementById('wallet-btn');
                        var walletBalance = document.getElementById('wallet-balance');
                        if (walletBtn && walletBalance) {
                            walletBtn.classList.add('has-timer');
                            var timeLeft = new Date(data.expiresAt) - new Date();
                            var h = Math.floor(timeLeft / 3600000);
                            var m = Math.floor((timeLeft % 3600000) / 60000);
                            var s = Math.floor((timeLeft % 60000) / 1000);
                            walletBalance.innerHTML = '<span class="wallet-amount">₹' + data.amount + '</span><span class="wallet-timer">⏱ ' + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '</span>';
                        }
                    } catch (e2) {}
                    // Start backup timer
                    startBackupWalletTimer(new Date(data.expiresAt));
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
