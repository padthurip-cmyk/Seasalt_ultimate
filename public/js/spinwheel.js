/**
 * SeaSalt Pickles - Complete Spin Wheel Replacement
 * ==================================================
 * This completely replaces the spin wheel UI with a new modern design
 * 
 * USAGE: Replace your spinwheel.js with this file
 * <script src="/js/spinwheel-new.js"></script>
 */

const SpinWheel = (function() {
    'use strict';
    
    // ============================================
    // STATE
    // ============================================
    let modal = null;
    let confirmationResult = null;
    let userPhone = null;
    let selectedCountryCode = '+91';
    let isSpinning = false;
    let currentSection = 'phone'; // phone, otp, wheel, result
    let auth = null;
    let recaptchaVerifier = null;
    
    // ============================================
    // WHEEL CONFIGURATION
    // ============================================
    const WHEEL_SEGMENTS = [
        { label: '₹99', value: 99, color: '#10B981', textColor: '#ffffff', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#EF4444', textColor: '#ffffff', isWin: false },
        { label: '₹299', value: 299, color: '#F59E0B', textColor: '#ffffff', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#34D399', textColor: '#ffffff', isWin: false },
        { label: '₹599', value: 599, color: '#8B5CF6', textColor: '#ffffff', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#F87171', textColor: '#ffffff', isWin: false },
        { label: '₹99', value: 99, color: '#FB923C', textColor: '#ffffff', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#4ADE80', textColor: '#ffffff', isWin: false }
    ];
    
    const COUNTRY_CODES = [
        { code: '+91', country: '🇮🇳 India', flag: '🇮🇳' },
        { code: '+1', country: '🇺🇸 USA', flag: '🇺🇸' },
        { code: '+44', country: '🇬🇧 UK', flag: '🇬🇧' },
        { code: '+971', country: '🇦🇪 UAE', flag: '🇦🇪' },
        { code: '+65', country: '🇸🇬 Singapore', flag: '🇸🇬' },
        { code: '+61', country: '🇦🇺 Australia', flag: '🇦🇺' },
        { code: '+49', country: '🇩🇪 Germany', flag: '🇩🇪' },
        { code: '+33', country: '🇫🇷 France', flag: '🇫🇷' },
        { code: '+81', country: '🇯🇵 Japan', flag: '🇯🇵' },
        { code: '+86', country: '🇨🇳 China', flag: '🇨🇳' }
    ];
    
    // ============================================
    // STYLES
    // ============================================
    const STYLES = `
        /* Modal Overlay */
        .spin-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .spin-modal-overlay.active {
            opacity: 1;
        }
        
        /* Modal Container */
        .spin-modal-container {
            background: linear-gradient(135deg, #EA580C 0%, #DC2626 50%, #B91C1C 100%);
            border-radius: 24px;
            width: 100%;
            max-width: 380px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            transform: scale(0.9);
            transition: transform 0.3s ease;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
        }
        
        .spin-modal-overlay.active .spin-modal-container {
            transform: scale(1);
        }
        
        /* Close Button */
        .spin-close-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
            z-index: 10;
        }
        
        .spin-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        /* Header */
        .spin-header {
            text-align: center;
            padding: 30px 20px 20px;
        }
        
        .spin-badge {
            display: inline-block;
            background: #F59E0B;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .spin-title {
            font-size: 28px;
            font-weight: 800;
            color: white;
            margin: 0 0 8px 0;
        }
        
        .spin-subtitle {
            font-size: 15px;
            color: rgba(255, 255, 255, 0.9);
            margin: 0;
        }
        
        /* Content Area */
        .spin-content {
            padding: 0 24px 30px;
        }
        
        /* Phone Section */
        .spin-phone-section {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .spin-phone-row {
            display: flex;
            gap: 10px;
        }
        
        .spin-country-select {
            width: 100px;
            min-width: 100px;
            padding: 16px 12px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 14px;
            background: white;
            font-size: 15px;
            font-weight: 600;
            color: #333;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 10px center;
        }
        
        .spin-phone-input {
            flex: 1;
            padding: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 14px;
            background: white;
            font-size: 17px;
            font-weight: 500;
            color: #333;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .spin-phone-input:focus {
            border-color: #F59E0B;
        }
        
        .spin-phone-input::placeholder {
            color: #9CA3AF;
        }
        
        .spin-btn-primary {
            width: 100%;
            padding: 18px;
            border: none;
            border-radius: 14px;
            background: linear-gradient(135deg, #F59E0B, #D97706);
            color: white;
            font-size: 17px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
        }
        
        .spin-btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
        }
        
        .spin-btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .spin-helper-text {
            text-align: center;
            color: rgba(255, 255, 255, 0.8);
            font-size: 13px;
            margin-top: 8px;
        }
        
        /* OTP Section */
        .spin-otp-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        
        .spin-otp-label {
            color: white;
            font-size: 15px;
            text-align: center;
        }
        
        .spin-otp-inputs {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .spin-otp-input {
            width: 50px;
            height: 60px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            background: white;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
            color: #333;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .spin-otp-input:focus {
            border-color: #F59E0B;
        }
        
        .spin-btn-success {
            width: 100%;
            padding: 18px;
            border: none;
            border-radius: 14px;
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            font-size: 17px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }
        
        .spin-btn-success:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .spin-resend {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
        }
        
        .spin-resend-link {
            color: #FCD34D;
            cursor: pointer;
            font-weight: 600;
        }
        
        .spin-resend-link:hover {
            text-decoration: underline;
        }
        
        /* Wheel Section */
        .spin-wheel-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
        }
        
        .spin-wheel-container {
            position: relative;
            width: 280px;
            height: 280px;
        }
        
        @media (min-width: 400px) {
            .spin-wheel-container {
                width: 300px;
                height: 300px;
            }
        }
        
        .spin-wheel-canvas {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
            transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
        }
        
        .spin-wheel-pointer {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 20px solid transparent;
            border-right: 20px solid transparent;
            border-top: 35px solid white;
            filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
            z-index: 10;
        }
        
        .spin-wheel-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 65px;
            height: 65px;
            background: linear-gradient(180deg, #FFF 0%, #F3F4F6 100%);
            border-radius: 50%;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            border: 4px solid #E5E7EB;
            z-index: 5;
        }
        
        .spin-btn-spin {
            padding: 18px 50px;
            border: none;
            border-radius: 16px;
            background: linear-gradient(135deg, #F97316, #EA580C);
            color: white;
            font-size: 20px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 6px 25px rgba(249, 115, 22, 0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: transform 0.2s;
        }
        
        .spin-btn-spin:hover:not(:disabled) {
            transform: scale(1.05);
        }
        
        .spin-btn-spin:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        /* Result Section */
        .spin-result-section {
            text-align: center;
            padding: 20px 0;
        }
        
        .spin-result-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        
        .spin-result-title {
            font-size: 28px;
            font-weight: 800;
            color: white;
            margin: 0 0 10px 0;
        }
        
        .spin-result-amount {
            font-size: 48px;
            font-weight: 800;
            color: #FCD34D;
            margin: 10px 0;
        }
        
        .spin-result-text {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 24px;
        }
        
        .spin-btn-continue {
            padding: 16px 40px;
            border: none;
            border-radius: 14px;
            background: white;
            color: #EA580C;
            font-size: 17px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .spin-btn-continue:hover {
            transform: scale(1.05);
        }
        
        /* Hidden state */
        .spin-hidden {
            display: none !important;
        }
        
        /* Animations */
        @keyframes spin-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        .spin-bounce {
            animation: spin-bounce 0.6s ease infinite;
        }
    `;
    
    // ============================================
    // INJECT STYLES
    // ============================================
    function injectStyles() {
        if (document.getElementById('spinwheel-styles')) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'spinwheel-styles';
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
    }
    
    // ============================================
    // CREATE WHEEL CANVAS
    // ============================================
    function createWheelCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        canvas.className = 'spin-wheel-canvas';
        canvas.id = 'spin-wheel';
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = (canvas.width / 2) - 5;
        
        const numSegments = WHEEL_SEGMENTS.length;
        const segmentAngle = (2 * Math.PI) / numSegments;
        
        // Draw segments
        WHEEL_SEGMENTS.forEach((segment, i) => {
            const startAngle = (i * segmentAngle) - (Math.PI / 2);
            const endAngle = startAngle + segmentAngle;
            
            // Draw segment
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = segment.color;
            ctx.fill();
            
            // Draw border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (segment.isWin) {
                // Prize - draw badge background
                const textX = radius * 0.65;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                roundRect(ctx, textX - 30, -14, 60, 28, 14);
                ctx.fill();
                
                // Prize text
                ctx.fillStyle = segment.color;
                ctx.font = 'bold 16px Arial';
                ctx.fillText(segment.label, textX, 2);
            } else {
                // Try Again - white text
                ctx.fillStyle = 'white';
                ctx.font = 'bold 11px Arial';
                ctx.fillText('TRY', radius * 0.6, -6);
                ctx.fillText('AGAIN', radius * 0.6, 8);
            }
            
            ctx.restore();
        });
        
        // Draw outer ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        return canvas;
    }
    
    // Helper function to draw rounded rectangle
    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    // ============================================
    // CREATE MODAL HTML
    // ============================================
    function createModal() {
        const modalHTML = `
            <div class="spin-modal-overlay" id="spin-modal-overlay">
                <div class="spin-modal-container">
                    <button class="spin-close-btn" id="spin-close-btn">✕</button>
                    
                    <!-- Header -->
                    <div class="spin-header">
                        <div class="spin-badge">🎁 Limited Time Offer</div>
                        <h2 class="spin-title">🎉 Welcome Gift!</h2>
                        <p class="spin-subtitle">Spin to win wallet cashback up to ₹599</p>
                    </div>
                    
                    <!-- Content -->
                    <div class="spin-content">
                        <!-- Phone Section -->
                        <div class="spin-phone-section" id="spin-phone-section">
                            <div class="spin-phone-row">
                                <select class="spin-country-select" id="spin-country-code">
                                    ${COUNTRY_CODES.map(c => `<option value="${c.code}">${c.flag} ${c.code}</option>`).join('')}
                                </select>
                                <input type="tel" 
                                       class="spin-phone-input" 
                                       id="spin-phone-input" 
                                       placeholder="Enter mobile number"
                                       maxlength="10">
                            </div>
                            <button class="spin-btn-primary" id="spin-send-otp" disabled>
                                Send OTP ✨
                            </button>
                            <p class="spin-helper-text">We'll send a verification code to your phone</p>
                        </div>
                        
                        <!-- OTP Section -->
                        <div class="spin-otp-section spin-hidden" id="spin-otp-section">
                            <p class="spin-otp-label">Enter the 6-digit code sent to your phone</p>
                            <div class="spin-otp-inputs">
                                <input type="text" class="spin-otp-input" maxlength="1" data-index="0">
                                <input type="text" class="spin-otp-input" maxlength="1" data-index="1">
                                <input type="text" class="spin-otp-input" maxlength="1" data-index="2">
                                <input type="text" class="spin-otp-input" maxlength="1" data-index="3">
                                <input type="text" class="spin-otp-input" maxlength="1" data-index="4">
                                <input type="text" class="spin-otp-input" maxlength="1" data-index="5">
                            </div>
                            <button class="spin-btn-success" id="spin-verify-otp" disabled>
                                Verify & Spin 🎰
                            </button>
                            <p class="spin-resend">
                                Didn't receive code? <span class="spin-resend-link" id="spin-resend">Resend</span>
                            </p>
                        </div>
                        
                        <!-- Wheel Section -->
                        <div class="spin-wheel-section spin-hidden" id="spin-wheel-section">
                            <div class="spin-wheel-container" id="spin-wheel-container">
                                <div class="spin-wheel-pointer"></div>
                                <div class="spin-wheel-center">🎰</div>
                            </div>
                            <button class="spin-btn-spin" id="spin-btn">
                                🎲 SPIN NOW! 🎲
                            </button>
                        </div>
                        
                        <!-- Result Section -->
                        <div class="spin-result-section spin-hidden" id="spin-result-section">
                            <div id="spin-win-result">
                                <div class="spin-result-icon">🎉</div>
                                <h3 class="spin-result-title">Congratulations!</h3>
                                <div class="spin-result-amount" id="spin-win-amount">₹99</div>
                                <p class="spin-result-text">Added to your wallet!</p>
                            </div>
                            <div id="spin-lose-result" class="spin-hidden">
                                <div class="spin-result-icon">😢</div>
                                <h3 class="spin-result-title">Better Luck Next Time!</h3>
                                <p class="spin-result-text">Don't worry, you'll get it next time!</p>
                            </div>
                            <button class="spin-btn-continue" id="spin-continue">
                                Continue Shopping →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div.firstElementChild);
        
        modal = document.getElementById('spin-modal-overlay');
        
        // Insert wheel canvas
        const wheelContainer = document.getElementById('spin-wheel-container');
        const canvas = createWheelCanvas();
        wheelContainer.insertBefore(canvas, wheelContainer.querySelector('.spin-wheel-center'));
        
        // Bind events
        bindEvents();
    }
    
    // ============================================
    // EVENT HANDLERS
    // ============================================
    function bindEvents() {
        // Close button
        document.getElementById('spin-close-btn').addEventListener('click', hide);
        
        // Phone input
        const phoneInput = document.getElementById('spin-phone-input');
        const sendOtpBtn = document.getElementById('spin-send-otp');
        
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            sendOtpBtn.disabled = e.target.value.length !== 10;
        });
        
        // Send OTP
        sendOtpBtn.addEventListener('click', handleSendOtp);
        
        // OTP inputs
        const otpInputs = document.querySelectorAll('.spin-otp-input');
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
        
        // Verify OTP
        document.getElementById('spin-verify-otp').addEventListener('click', handleVerifyOtp);
        
        // Resend OTP
        document.getElementById('spin-resend').addEventListener('click', handleResendOtp);
        
        // Spin button
        document.getElementById('spin-btn').addEventListener('click', handleSpin);
        
        // Continue button
        document.getElementById('spin-continue').addEventListener('click', hide);
        
        // Country code
        document.getElementById('spin-country-code').addEventListener('change', (e) => {
            selectedCountryCode = e.target.value;
        });
    }
    
    function checkOtpComplete() {
        const otpInputs = document.querySelectorAll('.spin-otp-input');
        const otp = Array.from(otpInputs).map(i => i.value).join('');
        document.getElementById('spin-verify-otp').disabled = otp.length !== 6;
    }
    
    // ============================================
    // OTP HANDLING
    // ============================================
    async function handleSendOtp() {
        const phone = document.getElementById('spin-phone-input').value;
        if (phone.length !== 10) {
            showToast('Please enter a valid 10-digit number', 'error');
            return;
        }
        
        userPhone = selectedCountryCode + phone;
        const btn = document.getElementById('spin-send-otp');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        try {
            // Try Firebase OTP if available
            if (typeof firebase !== 'undefined' && firebase.auth) {
                if (!auth) {
                    auth = firebase.auth();
                }
                
                if (!recaptchaVerifier) {
                    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('spin-send-otp', {
                        size: 'invisible'
                    });
                }
                
                confirmationResult = await auth.signInWithPhoneNumber(userPhone, recaptchaVerifier);
                showOtpSection();
                showToast('OTP sent successfully!', 'success');
            } else {
                // Demo mode
                mockSendOtp();
            }
        } catch (error) {
            console.error('OTP Error:', error);
            mockSendOtp();
        }
    }
    
    function mockSendOtp() {
        console.log('Demo mode: Enter any 6 digits');
        showOtpSection();
        showToast('Demo mode: Enter any 6 digits', 'info');
    }
    
    function showOtpSection() {
        document.getElementById('spin-phone-section').classList.add('spin-hidden');
        document.getElementById('spin-otp-section').classList.remove('spin-hidden');
        document.querySelector('.spin-otp-input').focus();
    }
    
    async function handleVerifyOtp() {
        const otpInputs = document.querySelectorAll('.spin-otp-input');
        const otp = Array.from(otpInputs).map(i => i.value).join('');
        
        if (otp.length !== 6) {
            showToast('Please enter complete OTP', 'error');
            return;
        }
        
        const btn = document.getElementById('spin-verify-otp');
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        
        try {
            if (confirmationResult) {
                await confirmationResult.confirm(otp);
            }
            onOtpVerified();
        } catch (error) {
            console.error('Verification Error:', error);
            if (!confirmationResult) {
                // Demo mode - accept any OTP
                onOtpVerified();
            } else {
                showToast('Invalid OTP. Please try again.', 'error');
                btn.disabled = false;
                btn.textContent = 'Verify & Spin 🎰';
                otpInputs.forEach(i => i.value = '');
                otpInputs[0].focus();
            }
        }
    }
    
    function handleResendOtp() {
        document.getElementById('spin-otp-section').classList.add('spin-hidden');
        document.getElementById('spin-phone-section').classList.remove('spin-hidden');
        document.getElementById('spin-send-otp').disabled = false;
        document.getElementById('spin-send-otp').textContent = 'Send OTP ✨';
    }
    
    function onOtpVerified() {
        // Save user
        if (typeof Store !== 'undefined' && Store.setUser) {
            Store.setUser({ phone: userPhone });
        }
        
        // Show wheel
        document.getElementById('spin-otp-section').classList.add('spin-hidden');
        document.getElementById('spin-wheel-section').classList.remove('spin-hidden');
        
        showToast('Verified! Spin the wheel!', 'success');
    }
    
    // ============================================
    // SPIN HANDLING
    // ============================================
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        
        const btn = document.getElementById('spin-btn');
        btn.disabled = true;
        btn.textContent = 'Spinning...';
        
        // Calculate result
        const result = calculateSpinResult();
        
        // Animate wheel
        const wheel = document.getElementById('spin-wheel');
        wheel.style.transform = `rotate(${result.degrees}deg)`;
        
        // Show result after animation
        setTimeout(() => {
            showResult(result.won, result.amount);
        }, 4200);
    }
    
    function calculateSpinResult() {
        // Determine if user wins (20% chance)
        const won = Math.random() < 0.2;
        let segmentIndex;
        let amount = 0;
        
        if (won) {
            // Pick a winning segment
            const winningSegments = WHEEL_SEGMENTS
                .map((seg, i) => ({ ...seg, index: i }))
                .filter(seg => seg.isWin);
            
            // Weight towards lower prizes
            const weights = [0.6, 0.3, 0.08, 0.02]; // ₹99, ₹299, ₹599, ₹99
            const random = Math.random();
            let cumulative = 0;
            let selectedIndex = 0;
            
            for (let i = 0; i < weights.length; i++) {
                cumulative += weights[i];
                if (random <= cumulative) {
                    selectedIndex = i;
                    break;
                }
            }
            
            const selectedSegment = winningSegments[selectedIndex % winningSegments.length];
            segmentIndex = selectedSegment.index;
            amount = selectedSegment.value;
        } else {
            // Pick a losing segment
            const losingSegments = WHEEL_SEGMENTS
                .map((seg, i) => ({ ...seg, index: i }))
                .filter(seg => !seg.isWin);
            
            segmentIndex = losingSegments[Math.floor(Math.random() * losingSegments.length)].index;
        }
        
        // Calculate rotation
        const segmentAngle = 360 / WHEEL_SEGMENTS.length;
        const segmentCenter = (segmentIndex * segmentAngle) + (segmentAngle / 2);
        const baseRotation = 1800 + Math.floor(Math.random() * 360); // 5+ full rotations
        const finalRotation = baseRotation + (360 - segmentCenter);
        
        return { degrees: finalRotation, won, amount };
    }
    
    function showResult(won, amount) {
        // Mark as completed
        if (typeof Store !== 'undefined' && Store.markSpinCompleted) {
            Store.markSpinCompleted();
        }
        
        // Record spin
        if (typeof API !== 'undefined' && API.recordSpin && userPhone) {
            API.recordSpin(userPhone.replace(/^\+\d+/, ''), won ? 'win' : 'lose', amount).catch(console.error);
        }
        
        // Show result section
        document.getElementById('spin-wheel-section').classList.add('spin-hidden');
        document.getElementById('spin-result-section').classList.remove('spin-hidden');
        
        if (won) {
            // Add to wallet
            if (typeof Store !== 'undefined' && Store.addToWallet) {
                Store.addToWallet(amount, 'Spin Wheel Reward');
            }
            if (typeof UI !== 'undefined' && UI.updateCartUI) {
                UI.updateCartUI();
            }
            
            document.getElementById('spin-win-amount').textContent = '₹' + amount;
            document.getElementById('spin-win-result').classList.remove('spin-hidden');
            document.getElementById('spin-lose-result').classList.add('spin-hidden');
            
            showToast(`You won ₹${amount}!`, 'success');
        } else {
            document.getElementById('spin-win-result').classList.add('spin-hidden');
            document.getElementById('spin-lose-result').classList.remove('spin-hidden');
        }
        
        isSpinning = false;
    }
    
    // ============================================
    // VISIBILITY
    // ============================================
    function shouldShow() {
        // Check if enabled
        if (typeof CONFIG !== 'undefined' && CONFIG.SPIN_WHEEL && !CONFIG.SPIN_WHEEL.ENABLED) {
            return false;
        }
        
        // Check if already spun
        if (typeof Store !== 'undefined' && Store.hasUserSpun && Store.hasUserSpun()) {
            return false;
        }
        
        return true;
    }
    
    function show() {
        if (!modal) createModal();
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            document.getElementById('spin-phone-input').focus();
        }, 300);
    }
    
    function hide() {
        if (!modal) return;
        
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // ============================================
    // TOAST HELPER
    // ============================================
    function showToast(message, type) {
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(message, type);
            return;
        }
        
        // Fallback toast
        const existing = document.querySelector('.spin-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = 'spin-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 99999;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#6B7280'};
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // ============================================
    // INIT
    // ============================================
    function init() {
        injectStyles();
        
        if (shouldShow()) {
            setTimeout(show, 1000);
        }
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    return {
        init,
        show,
        hide,
        shouldShow
    };
})();

// Make globally available
window.SpinWheel = SpinWheel;
