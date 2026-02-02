/**
 * SeaSalt Pickles - Spin Wheel Module
 * =====================================
 * DEMO MODE: Skips real OTP, goes directly to spin wheel
 * Set DEMO_MODE = false when Firebase Blaze plan is enabled
 */

const SpinWheel = (function() {
    // ========================================
    // DEMO MODE - Set to false for production
    // ========================================
    const DEMO_MODE = true; // Change to false when Firebase Blaze is enabled
    
    // DOM Elements
    let modal, phoneSection, otpSection, wheelSection, resultSection;
    let phoneInput, countryCodeSelect, sendOtpBtn, otpInputs, verifyOtpBtn;
    let spinWheel, spinBtn, closeBtn, continueBtn;
    let winResult, loseResult, winAmount;
    
    // State
    let confirmationResult = null;
    let userPhone = null;
    let isSpinning = false;
    let currentRotation = 0;
    
    // 8 Segments (45 degrees each)
    const SEGMENTS = [
        { value: 99, type: 'win' },
        { value: 0, type: 'lose' },
        { value: 299, type: 'win' },
        { value: 0, type: 'lose' },
        { value: 599, type: 'win' },
        { value: 0, type: 'lose' },
        { value: 99, type: 'win' },
        { value: 0, type: 'lose' }
    ];
    
    // Firebase Auth
    let auth = null;
    let recaptchaVerifier = null;
    
    function initFirebase() {
        if (DEMO_MODE) return; // Skip Firebase in demo mode
        
        if (!firebase.apps.length) {
            firebase.initializeApp(CONFIG.FIREBASE);
        }
        auth = firebase.auth();
        
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('send-otp-btn', {
            size: 'invisible',
            callback: () => {}
        });
    }
    
    // Initialize
    function init() {
        cacheElements();
        bindEvents();
        
        if (shouldShowSpinWheel()) {
            showModal();
        }
    }
    
    function cacheElements() {
        modal = document.getElementById('spin-modal');
        phoneSection = document.getElementById('phone-section');
        otpSection = document.getElementById('otp-section');
        wheelSection = document.getElementById('wheel-section');
        resultSection = document.getElementById('result-section');
        
        phoneInput = document.getElementById('phone-input');
        countryCodeSelect = document.getElementById('country-code');
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
        // Phone input
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
            const maxLength = getMaxPhoneLength();
            e.target.value = e.target.value.slice(0, maxLength);
            validatePhoneInput();
        });
        
        // Country code change
        if (countryCodeSelect) {
            countryCodeSelect.addEventListener('change', () => {
                updatePhonePlaceholder();
                validatePhoneInput();
            });
        }
        
        // Send OTP
        sendOtpBtn.addEventListener('click', handleSendOtp);
        
        // OTP inputs
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
                if (e.target.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                checkOtpComplete();
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
            
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                pastedData.split('').forEach((char, i) => {
                    if (otpInputs[i]) otpInputs[i].value = char;
                });
                checkOtpComplete();
            });
        });
        
        verifyOtpBtn.addEventListener('click', handleVerifyOtp);
        spinBtn.addEventListener('click', handleSpin);
        closeBtn.addEventListener('click', hideModal);
        continueBtn.addEventListener('click', hideModal);
    }
    
    // Phone Helpers
    function getMaxPhoneLength() {
        const code = countryCodeSelect ? countryCodeSelect.value : '+91';
        const lengths = {
            '+91': 10, '+1': 10, '+44': 10, '+61': 9, '+971': 9,
            '+65': 8, '+60': 10, '+966': 9, '+974': 8, '+968': 8,
            '+973': 8, '+965': 8, '+64': 9, '+27': 9, '+49': 11,
            '+33': 9, '+39': 10, '+81': 10, '+82': 10, '+86': 11,
            '+852': 8, '+63': 10, '+66': 9, '+62': 11, '+84': 9,
            '+92': 10, '+880': 10, '+94': 9, '+977': 10
        };
        return lengths[code] || 10;
    }
    
    function getMinPhoneLength() {
        const code = countryCodeSelect ? countryCodeSelect.value : '+91';
        const mins = { '+65': 8, '+974': 8, '+968': 8, '+973': 8, '+965': 8, '+852': 8 };
        return mins[code] || 8;
    }
    
    function updatePhonePlaceholder() {
        const max = getMaxPhoneLength();
        phoneInput.placeholder = `Enter ${max}-digit number`;
        phoneInput.maxLength = max;
    }
    
    function validatePhoneInput() {
        const min = getMinPhoneLength();
        sendOtpBtn.disabled = phoneInput.value.length < min;
    }
    
    // Visibility
    function shouldShowSpinWheel() {
        if (!CONFIG.SPIN_WHEEL.ENABLED) return false;
        if (Store.hasUserSpun()) return false;
        if (!Store.getState('siteConfig')?.spinWheelEnabled) return false;
        return true;
    }
    
    function showModal() {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        phoneInput.focus();
        try { initFirebase(); } catch (e) { console.warn('Firebase init failed'); }
    }
    
    function hideModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // OTP Handling
    async function handleSendOtp() {
        const phone = phoneInput.value.trim();
        const countryCode = countryCodeSelect ? countryCodeSelect.value : '+91';
        
        if (phone.length < getMinPhoneLength()) {
            UI.showToast('Please enter a valid phone number', 'error');
            return;
        }
        
        userPhone = `${countryCode}${phone}`;
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = '<span class="animate-pulse">Sending...</span>';
        
        // ========================================
        // DEMO MODE: Skip OTP, go directly to wheel
        // ========================================
        if (DEMO_MODE) {
            setTimeout(() => {
                Store.setUser({ phone: userPhone });
                phoneSection.classList.add('hidden');
                wheelSection.classList.remove('hidden');
                sendOtpBtn.innerHTML = 'Send OTP ✨';
                sendOtpBtn.disabled = false;
                UI.showToast('Welcome! Spin the wheel to win!', 'success');
            }, 800);
            return;
        }
        
        // Real Firebase OTP (requires Blaze plan)
        try {
            if (auth && recaptchaVerifier) {
                confirmationResult = await auth.signInWithPhoneNumber(userPhone, recaptchaVerifier);
                showOtpSection();
                UI.showToast('OTP sent successfully!', 'success');
            } else {
                mockSendOtp();
            }
        } catch (error) {
            console.error('OTP Error:', error);
            UI.showToast('Failed to send OTP. Please try again.', 'error');
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = 'Send OTP ✨';
            
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                recaptchaVerifier = new firebase.auth.RecaptchaVerifier('send-otp-btn', { size: 'invisible' });
            }
        }
    }
    
    function mockSendOtp() {
        console.log('Mock OTP mode - enter any 6 digits');
        showOtpSection();
        UI.showToast('OTP sent! (Demo: enter any 6 digits)', 'info');
    }
    
    function showOtpSection() {
        phoneSection.classList.add('hidden');
        otpSection.classList.remove('hidden');
        otpInputs[0].focus();
        sendOtpBtn.innerHTML = 'Send OTP ✨';
    }
    
    function checkOtpComplete() {
        const otp = Array.from(otpInputs).map(i => i.value).join('');
        verifyOtpBtn.disabled = otp.length !== 6;
    }
    
    async function handleVerifyOtp() {
        const otp = Array.from(otpInputs).map(i => i.value).join('');
        if (otp.length !== 6) {
            UI.showToast('Please enter complete OTP', 'error');
            return;
        }
        
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.innerHTML = '<span class="animate-pulse">Verifying...</span>';
        
        try {
            if (confirmationResult) {
                await confirmationResult.confirm(otp);
            }
            onOtpVerified();
        } catch (error) {
            console.error('Verification Error:', error);
            if (!confirmationResult) { onOtpVerified(); return; }
            
            UI.showToast('Invalid OTP. Please try again.', 'error');
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerHTML = 'Verify & Spin 🎰';
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
        }
    }
    
    function onOtpVerified() {
        Store.setUser({ phone: userPhone });
        otpSection.classList.add('hidden');
        wheelSection.classList.remove('hidden');
        verifyOtpBtn.innerHTML = 'Verify & Spin 🎰';
        UI.showToast('Verified! Spin the wheel!', 'success');
    }
    
    // Spin Mechanics
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.innerHTML = '<span class="text-2xl animate-spin inline-block">🎰</span> Spinning...';
        
        const result = calculateSpinResult();
        
        // 8 segments = 45 degrees each
        const segmentAngle = 360 / SEGMENTS.length;
        const segmentCenter = result.segmentIndex * segmentAngle + (segmentAngle / 2);
        
        // 5 full rotations + landing position
        const targetRotation = currentRotation + (5 * 360) + (360 - segmentCenter);
        
        spinWheel.style.transform = `rotate(${targetRotation}deg)`;
        currentRotation = targetRotation;
        
        setTimeout(() => {
            showResult(result.won, result.amount);
        }, 4000);
    }
    
    function calculateSpinResult() {
        const won = Math.random() < (1 / CONFIG.SPIN_WHEEL.WINNING_ODDS);
        
        let amount = 0;
        let segmentIndex = 0;
        
        if (won) {
            const r = Math.random();
            let cumulative = 0;
            
            for (const [reward, prob] of Object.entries(CONFIG.SPIN_WHEEL.REWARD_PROBABILITIES)) {
                cumulative += prob;
                if (r <= cumulative) {
                    amount = parseInt(reward);
                    break;
                }
            }
            
            // Map to segment: 0=₹99, 2=₹299, 4=₹599, 6=₹99
            if (amount === 99) {
                segmentIndex = Math.random() < 0.5 ? 0 : 6;
            } else if (amount === 299) {
                segmentIndex = 2;
            } else if (amount === 599) {
                segmentIndex = 4;
            }
        } else {
            // Lose segments: 1, 3, 5, 7
            const loseSegments = [1, 3, 5, 7];
            segmentIndex = loseSegments[Math.floor(Math.random() * loseSegments.length)];
        }
        
        return { won, amount, segmentIndex };
    }
    
    function showResult(won, amount) {
        Store.markSpinCompleted();
        
        if (userPhone) {
            const phoneNumber = userPhone.replace(/^\+\d+/, '');
            API.recordSpin(phoneNumber, won ? 'win' : 'lose', amount).catch(console.error);
        }
        
        wheelSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        closeBtn.classList.remove('hidden');
        
        if (won) {
            Store.addToWallet(amount, 'Spin Wheel Reward');
            UI.updateCartUI();
            winAmount.textContent = CONFIG.formatPrice(amount);
            winResult.classList.remove('hidden');
            loseResult.classList.add('hidden');
            UI.showToast(`🎉 You won ${CONFIG.formatPrice(amount)}!`, 'success');
        } else {
            winResult.classList.add('hidden');
            loseResult.classList.remove('hidden');
        }
        
        isSpinning = false;
        spinBtn.innerHTML = '<span class="text-2xl">🎰</span><span>SPIN NOW!</span><span class="text-2xl">🎰</span>';
    }
    
    return { init, show: showModal, hide: hideModal, shouldShow: shouldShowSpinWheel };
})();

window.SpinWheel = SpinWheel;
