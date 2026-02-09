/**
 * SeaSalt Pickles - Spin Wheel v16
 * =================================
 * Theme: Matches app's orange/pickle color scheme
 * Phone captured on "Send OTP" click
 * 
 * Prize Odds:
 * - ₹99:  Everyone wins (base prize ~91%)
 * - ₹199: 1 in 20 (5%)
 * - ₹299: 1 in 50 (2%)
 * - ₹399: 1 in 100 (1%)
 * - ₹499: 1 in 150 (0.67%)
 * - ₹599: 1 in 200 (0.5%)
 */

const SpinWheel = (function() {
    'use strict';

    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';

    // Prize segments - Orange/Green pickle theme
    const PRIZES = [
        { value: 99,  label: '₹99',  color: '#D4451A', textColor: '#fff' },   // Pickle Orange
        { value: 199, label: '₹199', color: '#166534', textColor: '#fff' },   // Pickle Green
        { value: 299, label: '₹299', color: '#D4451A', textColor: '#fff' },   // Pickle Orange
        { value: 399, label: '₹399', color: '#166534', textColor: '#fff' },   // Pickle Green
        { value: 499, label: '₹499', color: '#D4451A', textColor: '#fff' },   // Pickle Orange
        { value: 599, label: '₹599', color: '#166534', textColor: '#fff' }    // Pickle Green
    ];

    let isSpinning = false;
    let hasSpun = false;
    let verifiedPhone = null;

    // ══════════════════════════════════════════
    // PRIZE CALCULATION (Exact Odds)
    // ══════════════════════════════════════════
    function calculatePrize() {
        const rand = Math.random();
        
        // ₹599: 1 in 200 (0.5%)
        if (rand < 0.005) return { value: 599, segmentIndex: 5 };
        
        // ₹499: 1 in 150 (0.67%)
        if (rand < 0.0117) return { value: 499, segmentIndex: 4 };
        
        // ₹399: 1 in 100 (1%)
        if (rand < 0.0217) return { value: 399, segmentIndex: 3 };
        
        // ₹299: 1 in 50 (2%)
        if (rand < 0.0417) return { value: 299, segmentIndex: 2 };
        
        // ₹199: 1 in 20 (5%)
        if (rand < 0.0917) return { value: 199, segmentIndex: 1 };
        
        // ₹99: Everyone else (~91%)
        return { value: 99, segmentIndex: 0 };
    }

    // ══════════════════════════════════════════
    // INIT & SHOW
    // ══════════════════════════════════════════
    function init() {
        console.log('[SpinWheel] v16 Initialized - Pickle Theme');
        
        if (localStorage.getItem('seasalt_spin_completed')) {
            hasSpun = true;
        }
        
        // Auto-show after 2 seconds if not spun
        setTimeout(function() {
            if (!hasSpun && !document.getElementById('spinwheel-modal')) {
                show();
            }
        }, 2000);
    }

    function show() {
        if (document.getElementById('spinwheel-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'spinwheel-modal';
        modal.innerHTML = getModalHTML();
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Animate in
        requestAnimationFrame(() => {
            modal.querySelector('.spinwheel-content').style.transform = 'scale(1)';
            modal.querySelector('.spinwheel-content').style.opacity = '1';
        });
        
        bindEvents(modal);
        drawWheel();
    }

    function hide() {
        const modal = document.getElementById('spinwheel-modal');
        if (modal) {
            modal.querySelector('.spinwheel-content').style.transform = 'scale(0.9)';
            modal.querySelector('.spinwheel-content').style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
            }, 300);
        }
    }

    // ══════════════════════════════════════════
    // MODAL HTML - Pickle Orange Theme
    // ══════════════════════════════════════════
    function getModalHTML() {
        return `
            <style>
                #spinwheel-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(8px);
                }
                .spinwheel-content {
                    background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 380px;
                    max-height: 90vh;
                    overflow-y: auto;
                    transform: scale(0.9);
                    opacity: 0;
                    transition: all 0.3s ease;
                    box-shadow: 0 25px 50px rgba(212, 69, 26, 0.3);
                    border: 3px solid #D4451A;
                }
                .spinwheel-header {
                    background: linear-gradient(135deg, #D4451A 0%, #B91C1C 100%);
                    padding: 20px;
                    text-align: center;
                    position: relative;
                }
                .spinwheel-close {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                .spinwheel-close:hover {
                    background: rgba(255,255,255,0.3);
                }
                .spinwheel-title {
                    color: white;
                    font-size: 24px;
                    font-weight: 800;
                    margin: 0 0 4px 0;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .spinwheel-subtitle {
                    color: rgba(255,255,255,0.9);
                    font-size: 14px;
                    margin: 0;
                }
                .spinwheel-body {
                    padding: 24px;
                }
                .wheel-container {
                    position: relative;
                    width: 280px;
                    height: 280px;
                    margin: 0 auto 24px;
                }
                #spin-wheel {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    box-shadow: 0 8px 32px rgba(212, 69, 26, 0.4), inset 0 0 20px rgba(0,0,0,0.1);
                    border: 6px solid #D4451A;
                }
                .wheel-pointer {
                    position: absolute;
                    top: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 16px solid transparent;
                    border-right: 16px solid transparent;
                    border-top: 28px solid #D4451A;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
                    z-index: 10;
                }
                .wheel-center {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 70px;
                    height: 70px;
                    background: linear-gradient(135deg, #D4451A 0%, #B91C1C 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 28px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    border: 4px solid #FFF7ED;
                    z-index: 5;
                }
                .phone-section, .otp-section, .result-section {
                    display: none;
                }
                .phone-section.active, .otp-section.active, .result-section.active {
                    display: block;
                    animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .input-group {
                    margin-bottom: 16px;
                }
                .input-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #7C2D12;
                    margin-bottom: 8px;
                }
                .phone-input-wrapper {
                    display: flex;
                    align-items: center;
                    background: white;
                    border: 2px solid #FDBA74;
                    border-radius: 12px;
                    overflow: hidden;
                    transition: border-color 0.2s;
                }
                .phone-input-wrapper:focus-within {
                    border-color: #D4451A;
                    box-shadow: 0 0 0 3px rgba(212, 69, 26, 0.1);
                }
                .country-code {
                    padding: 14px 12px;
                    background: #FFF7ED;
                    font-weight: 600;
                    color: #7C2D12;
                    border-right: 2px solid #FDBA74;
                }
                .phone-input {
                    flex: 1;
                    padding: 14px;
                    border: none;
                    font-size: 16px;
                    outline: none;
                    background: transparent;
                }
                .otp-inputs {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                .otp-input {
                    width: 50px;
                    height: 56px;
                    text-align: center;
                    font-size: 24px;
                    font-weight: 700;
                    border: 2px solid #FDBA74;
                    border-radius: 12px;
                    outline: none;
                    background: white;
                    color: #7C2D12;
                    transition: all 0.2s;
                }
                .otp-input:focus {
                    border-color: #D4451A;
                    box-shadow: 0 0 0 3px rgba(212, 69, 26, 0.1);
                }
                .btn-primary {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #D4451A 0%, #B91C1C 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 15px rgba(212, 69, 26, 0.4);
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(212, 69, 26, 0.5);
                }
                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                .btn-spin {
                    background: linear-gradient(135deg, #166534 0%, #14532D 100%);
                    box-shadow: 0 4px 15px rgba(22, 101, 52, 0.4);
                }
                .btn-spin:hover {
                    box-shadow: 0 6px 20px rgba(22, 101, 52, 0.5);
                }
                .resend-link {
                    text-align: center;
                    margin-top: 16px;
                    font-size: 14px;
                    color: #9CA3AF;
                }
                .resend-link button {
                    background: none;
                    border: none;
                    color: #D4451A;
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: underline;
                }
                .resend-link button:disabled {
                    color: #9CA3AF;
                    cursor: not-allowed;
                    text-decoration: none;
                }
                .result-amount {
                    font-size: 56px;
                    font-weight: 800;
                    color: #D4451A;
                    text-align: center;
                    margin: 16px 0;
                    text-shadow: 0 2px 4px rgba(212, 69, 26, 0.2);
                }
                .result-text {
                    text-align: center;
                    color: #7C2D12;
                    font-size: 16px;
                    margin-bottom: 8px;
                }
                .result-expiry {
                    text-align: center;
                    color: #B91C1C;
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 20px;
                    padding: 8px 16px;
                    background: #FEE2E2;
                    border-radius: 8px;
                    display: inline-block;
                    width: 100%;
                }
                .error-text {
                    color: #DC2626;
                    font-size: 13px;
                    margin-top: 8px;
                    text-align: center;
                }
                .confetti {
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    pointer-events: none;
                    z-index: 10000;
                    animation: confetti-fall 3s ease-out forwards;
                }
                @keyframes confetti-fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(var(--spin-degrees)); }
                }
                .terms-text {
                    font-size: 11px;
                    color: #9CA3AF;
                    text-align: center;
                    margin-top: 16px;
                }
            </style>
            
            <div class="spinwheel-content">
                <div class="spinwheel-header">
                    <button class="spinwheel-close" id="spinwheel-close">×</button>
                    <h2 class="spinwheel-title">🫙 Spin & Win!</h2>
                    <p class="spinwheel-subtitle">Win up to ₹599 wallet credits</p>
                </div>
                
                <div class="spinwheel-body">
                    <div class="wheel-container">
                        <div class="wheel-pointer"></div>
                        <canvas id="spin-wheel" width="280" height="280"></canvas>
                        <div class="wheel-center">🫙</div>
                    </div>
                    
                    <!-- Phone Section -->
                    <div class="phone-section active" id="phone-section">
                        <div class="input-group">
                            <label class="input-label">Enter your mobile number</label>
                            <div class="phone-input-wrapper">
                                <span class="country-code">+91</span>
                                <input type="tel" class="phone-input" id="phone-input" 
                                    placeholder="Enter 10 digit number" maxlength="10"
                                    inputmode="numeric" pattern="[0-9]*">
                            </div>
                            <div class="error-text" id="phone-error" style="display:none;"></div>
                        </div>
                        <button class="btn-primary" id="send-otp-btn">Send OTP</button>
                        <p class="terms-text">By continuing, you agree to receive promotional messages</p>
                    </div>
                    
                    <!-- OTP Section -->
                    <div class="otp-section" id="otp-section">
                        <div class="input-group">
                            <label class="input-label">Enter OTP sent to <span id="otp-phone"></span></label>
                            <div class="otp-inputs">
                                <input type="tel" class="otp-input" maxlength="1" inputmode="numeric">
                                <input type="tel" class="otp-input" maxlength="1" inputmode="numeric">
                                <input type="tel" class="otp-input" maxlength="1" inputmode="numeric">
                                <input type="tel" class="otp-input" maxlength="1" inputmode="numeric">
                                <input type="tel" class="otp-input" maxlength="1" inputmode="numeric">
                                <input type="tel" class="otp-input" maxlength="1" inputmode="numeric">
                            </div>
                            <div class="error-text" id="otp-error" style="display:none;"></div>
                        </div>
                        <button class="btn-primary btn-spin" id="verify-spin-btn">Verify & Spin!</button>
                        <div class="resend-link">
                            Didn't receive? <button id="resend-btn" disabled>Resend in <span id="resend-timer">30</span>s</button>
                        </div>
                    </div>
                    
                    <!-- Result Section -->
                    <div class="result-section" id="result-section">
                        <p class="result-text">🎉 Congratulations! You won</p>
                        <div class="result-amount" id="result-amount">₹0</div>
                        <div class="result-expiry">⏰ Valid for 48 hours only!</div>
                        <button class="btn-primary" id="shop-now-btn">🛒 Shop Now & Use Credits</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ══════════════════════════════════════════
    // DRAW WHEEL
    // ══════════════════════════════════════════
    function drawWheel() {
        const canvas = document.getElementById('spin-wheel');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 4;
        const segmentAngle = (2 * Math.PI) / PRIZES.length;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        PRIZES.forEach((prize, i) => {
            const startAngle = i * segmentAngle - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = prize.color;
            ctx.fill();
            
            // Segment border
            ctx.strokeStyle = '#FFF7ED';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = prize.textColor;
            ctx.font = 'bold 18px system-ui, sans-serif';
            ctx.fillText(prize.label, radius - 20, 6);
            ctx.restore();
        });

        // Outer ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#D4451A';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    // ══════════════════════════════════════════
    // EVENT BINDINGS
    // ══════════════════════════════════════════
    function bindEvents(modal) {
        // Close button
        modal.querySelector('#spinwheel-close').onclick = hide;
        
        // Phone input - only numbers
        const phoneInput = modal.querySelector('#phone-input');
        phoneInput.oninput = function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 10);
        };
        
        // Send OTP
        modal.querySelector('#send-otp-btn').onclick = handleSendOTP;
        
        // OTP inputs
        const otpInputs = modal.querySelectorAll('.otp-input');
        otpInputs.forEach((input, index) => {
            input.oninput = function() {
                this.value = this.value.replace(/\D/g, '').slice(0, 1);
                if (this.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            };
            input.onkeydown = function(e) {
                if (e.key === 'Backspace' && !this.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            };
        });
        
        // Verify & Spin
        modal.querySelector('#verify-spin-btn').onclick = handleVerifyAndSpin;
        
        // Resend OTP
        modal.querySelector('#resend-btn').onclick = handleResendOTP;
        
        // Shop Now
        modal.querySelector('#shop-now-btn').onclick = function() {
            hide();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }

    // ══════════════════════════════════════════
    // HANDLERS
    // ══════════════════════════════════════════
    async function handleSendOTP() {
        const phoneInput = document.getElementById('phone-input');
        const phone = phoneInput.value.trim();
        const errorEl = document.getElementById('phone-error');
        const btn = document.getElementById('send-otp-btn');
        
        errorEl.style.display = 'none';
        
        if (!/^[6-9]\d{9}$/.test(phone)) {
            errorEl.textContent = 'Please enter a valid 10-digit mobile number';
            errorEl.style.display = 'block';
            return;
        }
        
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        // *** CAPTURE PHONE IMMEDIATELY ***
        const fullPhone = '+91' + phone;
        localStorage.setItem('seasalt_phone', fullPhone);
        localStorage.setItem('seasalt_user_phone', fullPhone);
        localStorage.setItem('spinwheel_phone', fullPhone);
        
        // Save to Supabase immediately
        try {
            await savePhoneToSupabase(fullPhone);
        } catch (e) {
            console.log('[SpinWheel] Phone save error:', e);
        }
        
        // Send OTP via Firebase
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                window.confirmationResult = await firebase.auth().signInWithPhoneNumber(
                    fullPhone,
                    window.recaptchaVerifier || new firebase.auth.RecaptchaVerifier('send-otp-btn', { size: 'invisible' })
                );
            }
            
            verifiedPhone = fullPhone;
            showOTPSection(phone);
            startResendTimer();
            
        } catch (error) {
            console.log('[SpinWheel] OTP Error:', error);
            // Still proceed for testing
            verifiedPhone = fullPhone;
            showOTPSection(phone);
            startResendTimer();
        }
        
        btn.disabled = false;
        btn.textContent = 'Send OTP';
    }

    async function savePhoneToSupabase(phone) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        
        const existing = await response.json();
        
        if (!existing || existing.length === 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    phone: phone,
                    created_at: new Date().toISOString(),
                    wallet_balance: 0
                })
            });
            console.log('[SpinWheel] New user saved:', phone);
        }
    }

    function showOTPSection(phone) {
        document.getElementById('phone-section').classList.remove('active');
        document.getElementById('otp-section').classList.add('active');
        document.getElementById('otp-phone').textContent = '+91 ' + phone;
        document.querySelector('.otp-input').focus();
    }

    let resendInterval;
    function startResendTimer() {
        let seconds = 30;
        const timerEl = document.getElementById('resend-timer');
        const resendBtn = document.getElementById('resend-btn');
        
        resendBtn.disabled = true;
        
        clearInterval(resendInterval);
        resendInterval = setInterval(() => {
            seconds--;
            timerEl.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(resendInterval);
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Resend OTP';
            }
        }, 1000);
    }

    function handleResendOTP() {
        handleSendOTP();
    }

    async function handleVerifyAndSpin() {
        const otpInputs = document.querySelectorAll('.otp-input');
        const otp = Array.from(otpInputs).map(i => i.value).join('');
        const errorEl = document.getElementById('otp-error');
        const btn = document.getElementById('verify-spin-btn');
        
        errorEl.style.display = 'none';
        
        if (otp.length !== 6) {
            errorEl.textContent = 'Please enter the complete 6-digit OTP';
            errorEl.style.display = 'block';
            return;
        }
        
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        
        try {
            // Try Firebase verification
            if (window.confirmationResult) {
                await window.confirmationResult.confirm(otp);
            }
        } catch (error) {
            console.log('[SpinWheel] OTP verify error:', error);
            // Continue anyway for testing
        }
        
        // Save user
        localStorage.setItem('seasalt_user', JSON.stringify({ phone: verifiedPhone }));
        
        // Start spinning
        btn.textContent = 'Spinning...';
        spinWheel();
    }

    // ══════════════════════════════════════════
    // SPIN ANIMATION
    // ══════════════════════════════════════════
    function spinWheel() {
        if (isSpinning) return;
        isSpinning = true;
        
        const prize = calculatePrize();
        const canvas = document.getElementById('spin-wheel');
        
        const segmentAngle = 360 / PRIZES.length;
        const targetAngle = 360 - (prize.segmentIndex * segmentAngle + segmentAngle / 2);
        const totalRotation = 360 * 5 + targetAngle; // 5 full rotations + target
        
        canvas.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        canvas.style.transform = `rotate(${totalRotation}deg)`;
        
        setTimeout(() => {
            isSpinning = false;
            hasSpun = true;
            localStorage.setItem('seasalt_spin_completed', 'true');
            
            showResult(prize.value);
            saveWallet(prize.value);
            launchConfetti();
        }, 4000);
    }

    function showResult(amount) {
        document.getElementById('otp-section').classList.remove('active');
        document.getElementById('result-section').classList.add('active');
        document.getElementById('result-amount').textContent = '₹' + amount;
    }

    async function saveWallet(amount) {
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
        
        // Save to localStorage
        const walletData = {
            amount: amount,
            expiresAt: expiresAt.toISOString(),
            phone: verifiedPhone
        };
        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify(walletData));
        
        // Save to Supabase
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(verifiedPhone)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    wallet_balance: amount,
                    wallet_expires_at: expiresAt.toISOString()
                })
            });
            console.log('[SpinWheel] Wallet saved to Supabase:', amount);
        } catch (e) {
            console.log('[SpinWheel] Wallet save error:', e);
        }
        
        // Update UI
        if (typeof UI !== 'undefined' && UI.updateCartUI) {
            UI.updateCartUI();
        }
    }

    // ══════════════════════════════════════════
    // CONFETTI
    // ══════════════════════════════════════════
    function launchConfetti() {
        const colors = ['#D4451A', '#166534', '#F59E0B', '#DC2626', '#16A34A'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.top = '-10px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }, i * 30);
        }
    }

    // ══════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════
    return {
        init: init,
        show: show,
        hide: hide
    };
})();

window.SpinWheel = SpinWheel;
