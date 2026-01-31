/**
 * SeaSalt Pickles - Spin Wheel Module
 * =====================================
 * Handles the spin wheel marketing feature with Firebase OTP.
 * Rewards are added to user's wallet.
 */

const SpinWheel = (function() {
    // ============================================
    // DOM ELEMENTS
    // ============================================
    let modal, phoneSection, otpSection, wheelSection, resultSection;
    let phoneInput, sendOtpBtn, otpInputs, verifyOtpBtn;
    let spinWheel, spinBtn, closeBtn, continueBtn;
    let winResult, loseResult, winAmount;
    
    // ============================================
    // STATE
    // ============================================
    let confirmationResult = null;
    let userPhone = null;
    let isSpinning = false;
    
    // ============================================
    // FIREBASE AUTH
    // ============================================
    let auth = null;
    let recaptchaVerifier = null;
    
    function initFirebase() {
        // Initialize Firebase if not already done
        if (!firebase.apps.length) {
            firebase.initializeApp(CONFIG.FIREBASE);
        }
        auth = firebase.auth();
        
        // Set up invisible reCAPTCHA
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('send-otp-btn', {
            size: 'invisible',
            callback: () => {
                // reCAPTCHA solved
            }
        });
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function init() {
        cacheElements();
        bindEvents();
        
        // Check if spin wheel should be shown
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
        // Phone input validation
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            sendOtpBtn.disabled = e.target.value.length !== 10;
        });
        
        // Send OTP
        sendOtpBtn.addEventListener('click', handleSendOtp);
        
        // OTP inputs auto-focus
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
            
            // Paste handler
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                pastedData.split('').forEach((char, i) => {
                    if (otpInputs[i]) {
                        otpInputs[i].value = char;
                    }
                });
                checkOtpComplete();
            });
        });
        
        // Verify OTP
        verifyOtpBtn.addEventListener('click', handleVerifyOtp);
        
        // Spin button
        spinBtn.addEventListener('click', handleSpin);
        
        // Close button
        closeBtn.addEventListener('click', hideModal);
        
        // Continue button
        continueBtn.addEventListener('click', hideModal);
    }
    
    // ============================================
    // VISIBILITY CONTROL
    // ============================================
    
    function shouldShowSpinWheel() {
        // Check master switch
        if (!CONFIG.SPIN_WHEEL.ENABLED) return false;
        
        // Check if user has already spun
        if (Store.hasUserSpun()) return false;
        
        // Check site config
        if (!Store.getState('siteConfig')?.spinWheelEnabled) return false;
        
        return true;
    }
    
    function showModal() {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        phoneInput.focus();
        
        // Initialize Firebase on first show
        try {
            initFirebase();
        } catch (error) {
            console.warn('Firebase initialization failed, using mock OTP');
        }
    }
    
    function hideModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // ============================================
    // OTP HANDLING
    // ============================================
    
    async function handleSendOtp() {
        const phone = phoneInput.value.trim();
        if (phone.length !== 10) {
            UI.showToast('Please enter a valid 10-digit number', 'error');
            return;
        }
        
        userPhone = `+91${phone}`;
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';
        
        try {
            // Try Firebase OTP
            if (auth && recaptchaVerifier) {
                confirmationResult = await auth.signInWithPhoneNumber(userPhone, recaptchaVerifier);
                showOtpSection();
                UI.showToast('OTP sent successfully!', 'success');
            } else {
                // Mock OTP for development
                mockSendOtp();
            }
        } catch (error) {
            console.error('OTP Error:', error);
            
            // Check if already verified
            if (error.code === 'auth/phone-number-already-exists') {
                mockSendOtp();
                return;
            }
            
            UI.showToast('Failed to send OTP. Please try again.', 'error');
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP';
            
            // Reset reCAPTCHA
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                recaptchaVerifier = new firebase.auth.RecaptchaVerifier('send-otp-btn', {
                    size: 'invisible'
                });
            }
        }
    }
    
    function mockSendOtp() {
        // For development: accept any 6-digit OTP
        console.log('Using mock OTP verification. Enter any 6 digits.');
        showOtpSection();
        UI.showToast('OTP sent! (Demo: enter any 6 digits)', 'info');
    }
    
    function showOtpSection() {
        phoneSection.classList.add('hidden');
        otpSection.classList.remove('hidden');
        otpInputs[0].focus();
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
        verifyOtpBtn.textContent = 'Verifying...';
        
        try {
            // Try Firebase verification
            if (confirmationResult) {
                await confirmationResult.confirm(otp);
            }
            
            // Verification successful (or mock mode)
            onOtpVerified();
            
        } catch (error) {
            console.error('Verification Error:', error);
            
            // In mock mode, accept any OTP
            if (!confirmationResult) {
                onOtpVerified();
                return;
            }
            
            UI.showToast('Invalid OTP. Please try again.', 'error');
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.textContent = 'Verify & Spin';
            
            // Clear OTP inputs
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
        }
    }
    
    function onOtpVerified() {
        // Save user phone
        Store.setUser({ phone: userPhone });
        
        // Show wheel
        otpSection.classList.add('hidden');
        wheelSection.classList.remove('hidden');
        
        UI.showToast('Verified! Spin the wheel!', 'success');
    }
    
    // ============================================
    // SPIN MECHANICS
    // ============================================
    
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.textContent = 'Spinning...';
        
        // Calculate result
        const result = calculateSpinResult();
        const { degrees, won, amount } = result;
        
        // Set CSS variable for rotation
        spinWheel.style.setProperty('--spin-degrees', `${degrees}deg`);
        spinWheel.style.transform = `rotate(${degrees}deg)`;
        
        // Wait for animation to complete
        setTimeout(() => {
            showResult(won, amount);
        }, 4000);
    }
    
    function calculateSpinResult() {
        // Check winning odds
        const random = Math.random();
        const won = random < (1 / CONFIG.SPIN_WHEEL.WINNING_ODDS);
        
        // Calculate reward amount if won
        let amount = 0;
        let segmentIndex = 0;
        
        if (won) {
            const rewardRandom = Math.random();
            let cumulative = 0;
            
            for (const [reward, probability] of Object.entries(CONFIG.SPIN_WHEEL.REWARD_PROBABILITIES)) {
                cumulative += probability;
                if (rewardRandom <= cumulative) {
                    amount = parseInt(reward);
                    break;
                }
            }
            
            // Map amount to segment
            // Segments: 0=₹99, 1=Try Again, 2=₹299, 3=Try Again, 4=₹599, 5=Try Again
            if (amount === 99) segmentIndex = 0;
            else if (amount === 299) segmentIndex = 2;
            else if (amount === 599) segmentIndex = 4;
        } else {
            // Random losing segment (1, 3, or 5)
            const loseSegments = [1, 3, 5];
            segmentIndex = loseSegments[Math.floor(Math.random() * loseSegments.length)];
        }
        
        // Calculate degrees
        // Each segment is 60 degrees
        // Add extra rotations (5 full spins = 1800 degrees)
        const baseRotation = 1800;
        const segmentDegrees = 60;
        const segmentCenter = (segmentIndex * segmentDegrees) + (segmentDegrees / 2);
        
        // Wheel spins clockwise, pointer is at top
        // To land on segment N, we need to rotate so segment N is at top
        // This means rotating (360 - segmentCenter) degrees for the final position
        const degrees = baseRotation + (360 - segmentCenter) + Math.random() * 20 - 10;
        
        return { degrees, won, amount };
    }
    
    function showResult(won, amount) {
        // Mark spin as completed
        Store.markSpinCompleted();
        
        // Record spin result (async, don't wait)
        if (userPhone) {
            API.recordSpin(userPhone.replace('+91', ''), won ? 'win' : 'lose', amount).catch(console.error);
        }
        
        wheelSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        closeBtn.classList.remove('hidden');
        
        if (won) {
            // Add to wallet
            Store.addToWallet(amount, 'Spin Wheel Reward');
            UI.updateCartUI();
            
            winAmount.textContent = CONFIG.formatPrice(amount);
            winResult.classList.remove('hidden');
            loseResult.classList.add('hidden');
            
            UI.showToast(`You won ${CONFIG.formatPrice(amount)}!`, 'success');
        } else {
            winResult.classList.add('hidden');
            loseResult.classList.remove('hidden');
        }
        
        isSpinning = false;
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    return {
        init,
        show: showModal,
        hide: hideModal,
        shouldShow: shouldShowSpinWheel
    };
})();

// Make SpinWheel globally available
window.SpinWheel = SpinWheel;
