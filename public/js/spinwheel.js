/**
 * SeaSalt Pickles - Spin Wheel Module (Fixed)
 * ============================================
 */

var SpinWheel = (function() {
    var modal, phoneSection, otpSection, wheelSection, resultSection;
    var phoneInput, sendOtpBtn, otpInputs, verifyOtpBtn;
    var spinWheel, spinBtn, closeBtn, continueBtn;
    var winResult, loseResult, winAmount;
    
    var confirmationResult = null;
    var userPhone = null;
    var isSpinning = false;
    var auth = null;
    var recaptchaVerifier = null;
    
    function init() {
        cacheElements();
        if (!modal) {
            console.log('[SpinWheel] Modal not found, skipping init');
            return;
        }
        bindEvents();
        
        // Check if spin wheel should be shown (with delay to let data load)
        setTimeout(function() {
            if (shouldShowSpinWheel()) {
                showModal();
            }
        }, 2000);
    }
    
    function cacheElements() {
        modal = document.getElementById('spin-modal');
        if (!modal) return;
        
        phoneSection = document.getElementById('phone-section');
        otpSection = document.getElementById('otp-section');
        wheelSection = document.getElementById('wheel-section');
        resultSection = document.getElementById('result-section');
        
        phoneInput = document.getElementById('phone-input');
        sendOtpBtn = document.getElementById('send-otp-btn');
        otpInputs = document.querySelectorAll('.otp-input');
        verifyOtpBtn = document.getElementById('verify-otp-btn');
        
        spinWheel = document.getElementById('spin-wheel');
        spinBtn = document.getElementById('spin-btn');
        closeBtn = document.getElementById('spin-close-btn');
        continueBtn = document.getElementById('continue-btn');
        
        winResult = document.getElementById('win-result');
        loseResult = document.getElementById('lose-result');
        winAmount = document.getElementById('win-amount');
    }
    
    function bindEvents() {
        if (!phoneInput || !sendOtpBtn) return;
        
        phoneInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            sendOtpBtn.disabled = e.target.value.length !== 10;
        });
        
        sendOtpBtn.addEventListener('click', handleSendOtp);
        
        if (otpInputs && otpInputs.length > 0) {
            otpInputs.forEach(function(input, index) {
                input.addEventListener('input', function(e) {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
                    if (e.target.value && index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    }
                    checkOtpComplete();
                });
                
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Backspace' && !e.target.value && index > 0) {
                        otpInputs[index - 1].focus();
                    }
                });
            });
        }
        
        if (verifyOtpBtn) verifyOtpBtn.addEventListener('click', handleVerifyOtp);
        if (spinBtn) spinBtn.addEventListener('click', handleSpin);
        if (closeBtn) closeBtn.addEventListener('click', hideModal);
        if (continueBtn) continueBtn.addEventListener('click', hideModal);
    }
    
    function shouldShowSpinWheel() {
        // Check CONFIG
        if (typeof CONFIG === 'undefined' || !CONFIG.SPIN_WHEEL || !CONFIG.SPIN_WHEEL.ENABLED) {
            return false;
        }
        
        // Check if user has already spun
        if (typeof Store !== 'undefined' && Store.hasUserSpun && Store.hasUserSpun()) {
            return false;
        }
        
        // Check site config - FIXED: getState() returns the full state object
        if (typeof Store !== 'undefined' && Store.getState) {
            var state = Store.getState();
            if (state && state.siteConfig && state.siteConfig.spinWheelEnabled === false) {
                return false;
            }
        }
        
        return true;
    }
    
    function showModal() {
        if (!modal) return;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (phoneInput) phoneInput.focus();
        
        // Try to initialize Firebase
        try {
            if (typeof firebase !== 'undefined' && !firebase.apps.length && typeof CONFIG !== 'undefined' && CONFIG.FIREBASE) {
                firebase.initializeApp(CONFIG.FIREBASE);
                auth = firebase.auth();
                recaptchaVerifier = new firebase.auth.RecaptchaVerifier('send-otp-btn', { size: 'invisible' });
            }
        } catch (e) {
            console.warn('[SpinWheel] Firebase init failed, using mock OTP');
        }
    }
    
    function hideModal() {
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    function handleSendOtp() {
        var phone = phoneInput ? phoneInput.value.trim() : '';
        if (phone.length !== 10) {
            if (typeof UI !== 'undefined') UI.showToast('Please enter a valid 10-digit number', 'error');
            return;
        }
        
        userPhone = '+91' + phone;
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';
        
        // Use mock OTP for now (Firebase requires setup)
        mockSendOtp();
    }
    
    function mockSendOtp() {
        showOtpSection();
        if (typeof UI !== 'undefined') UI.showToast('OTP sent! (Demo: enter any 6 digits)', 'info');
    }
    
    function showOtpSection() {
        if (phoneSection) phoneSection.classList.add('hidden');
        if (otpSection) otpSection.classList.remove('hidden');
        if (otpInputs && otpInputs[0]) otpInputs[0].focus();
    }
    
    function checkOtpComplete() {
        var otp = Array.from(otpInputs).map(function(i) { return i.value; }).join('');
        if (verifyOtpBtn) verifyOtpBtn.disabled = otp.length !== 6;
    }
    
    function handleVerifyOtp() {
        var otp = Array.from(otpInputs).map(function(i) { return i.value; }).join('');
        
        if (otp.length !== 6) {
            if (typeof UI !== 'undefined') UI.showToast('Please enter complete OTP', 'error');
            return;
        }
        
        if (verifyOtpBtn) {
            verifyOtpBtn.disabled = true;
            verifyOtpBtn.textContent = 'Verifying...';
        }
        
        // In mock mode, accept any OTP
        onOtpVerified();
    }
    
    function onOtpVerified() {
        if (typeof Store !== 'undefined' && Store.setUser) {
            Store.setUser({ phone: userPhone });
        }
        
        if (otpSection) otpSection.classList.add('hidden');
        if (wheelSection) wheelSection.classList.remove('hidden');
        
        if (typeof UI !== 'undefined') UI.showToast('Verified! Spin the wheel!', 'success');
    }
    
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.textContent = 'Spinning...';
        }
        
        var result = calculateSpinResult();
        var degrees = result.degrees;
        var won = result.won;
        var amount = result.amount;
        
        if (spinWheel) {
            spinWheel.style.setProperty('--spin-degrees', degrees + 'deg');
            spinWheel.style.transform = 'rotate(' + degrees + 'deg)';
        }
        
        setTimeout(function() {
            showResult(won, amount);
        }, 4000);
    }
    
    function calculateSpinResult() {
        var winningOdds = (typeof CONFIG !== 'undefined' && CONFIG.SPIN_WHEEL) ? CONFIG.SPIN_WHEEL.WINNING_ODDS : 3;
        var random = Math.random();
        var won = random < (1 / winningOdds);
        
        var amount = 0;
        var segmentIndex = 0;
        
        if (won) {
            var rewards = (typeof CONFIG !== 'undefined' && CONFIG.SPIN_WHEEL && CONFIG.SPIN_WHEEL.REWARD_PROBABILITIES)
                ? CONFIG.SPIN_WHEEL.REWARD_PROBABILITIES
                : { '99': 0.6, '299': 0.3, '599': 0.1 };
            
            var rewardRandom = Math.random();
            var cumulative = 0;
            
            for (var reward in rewards) {
                cumulative += rewards[reward];
                if (rewardRandom <= cumulative) {
                    amount = parseInt(reward);
                    break;
                }
            }
            
            if (amount === 99) segmentIndex = 0;
            else if (amount === 299) segmentIndex = 2;
            else if (amount === 599) segmentIndex = 4;
        } else {
            var loseSegments = [1, 3, 5];
            segmentIndex = loseSegments[Math.floor(Math.random() * loseSegments.length)];
        }
        
        var baseRotation = 1800;
        var segmentDegrees = 60;
        var segmentCenter = (segmentIndex * segmentDegrees) + (segmentDegrees / 2);
        var degrees = baseRotation + (360 - segmentCenter) + Math.random() * 20 - 10;
        
        return { degrees: degrees, won: won, amount: amount };
    }
    
    function showResult(won, amount) {
        if (typeof Store !== 'undefined' && Store.markSpinCompleted) {
            Store.markSpinCompleted();
        }
        
        if (wheelSection) wheelSection.classList.add('hidden');
        if (resultSection) resultSection.classList.remove('hidden');
        if (closeBtn) closeBtn.classList.remove('hidden');
        
        if (won) {
            if (typeof Store !== 'undefined' && Store.addToWallet) {
                Store.addToWallet(amount, 'Spin Wheel Reward');
            }
            if (typeof UI !== 'undefined' && UI.updateCartUI) {
                UI.updateCartUI();
            }
            
            var priceText = (typeof CONFIG !== 'undefined' && CONFIG.formatPrice) 
                ? CONFIG.formatPrice(amount) 
                : '₹' + amount;
            
            if (winAmount) winAmount.textContent = priceText;
            if (winResult) winResult.classList.remove('hidden');
            if (loseResult) loseResult.classList.add('hidden');
            
            if (typeof UI !== 'undefined') UI.showToast('You won ' + priceText + '!', 'success');
        } else {
            if (winResult) winResult.classList.add('hidden');
            if (loseResult) loseResult.classList.remove('hidden');
        }
        
        isSpinning = false;
    }
    
    return {
        init: init,
        show: showModal,
        hide: hideModal,
        shouldShow: shouldShowSpinWheel
    };
})();

window.SpinWheel = SpinWheel;
