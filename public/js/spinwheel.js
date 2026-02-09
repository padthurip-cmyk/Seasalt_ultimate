/**
 * SeaSalt Pickles - Spin Wheel v16
 * =================================
 * MODERN DESIGN with EXACT ODDS:
 * ₹99  - Everyone wins this (base prize)
 * ₹199 - 1 in 20  (5%)
 * ₹299 - 1 in 50  (2%)
 * ₹399 - 1 in 100 (1%)
 * ₹499 - 1 in 150 (0.67%)
 * ₹599 - 1 in 200 (0.5%)
 * 
 * Phone captured IMMEDIATELY on Send OTP click
 */

const SpinWheel = (function() {
    'use strict';
    
    // ============================================
    // SUPABASE CONFIG
    // ============================================
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    
    // ============================================
    // STATE
    // ============================================
    let modal = null;
    let confirmationResult = null;
    let userPhone = null;
    let selectedCountryCode = '+91';
    let isSpinning = false;
    let auth = null;
    let recaptchaVerifier = null;
    
    const SPIN_WALLET_KEY = 'seasalt_spin_wallet';
    
    // ============================================
    // WHEEL SEGMENTS (6 segments for prizes)
    // ============================================
    const SEGMENTS = [
        { label: '₹99', value: 99, color: '#10B981' },   // Green
        { label: '₹199', value: 199, color: '#3B82F6' }, // Blue
        { label: '₹299', value: 299, color: '#8B5CF6' }, // Purple
        { label: '₹399', value: 399, color: '#EC4899' }, // Pink
        { label: '₹499', value: 499, color: '#F59E0B' }, // Amber
        { label: '₹599', value: 599, color: '#EF4444' }  // Red
    ];
    
    // ============================================
    // PRIZE CALCULATION WITH EXACT ODDS
    // ============================================
    function calculatePrize() {
        const rand = Math.random();
        
        // ₹599 - 1 in 200 (0.5%)
        if (rand < 0.005) {
            return { value: 599, segmentIndex: 5 };
        }
        // ₹499 - 1 in 150 (0.67%)
        if (rand < 0.005 + 0.0067) {
            return { value: 499, segmentIndex: 4 };
        }
        // ₹399 - 1 in 100 (1%)
        if (rand < 0.005 + 0.0067 + 0.01) {
            return { value: 399, segmentIndex: 3 };
        }
        // ₹299 - 1 in 50 (2%)
        if (rand < 0.005 + 0.0067 + 0.01 + 0.02) {
            return { value: 299, segmentIndex: 2 };
        }
        // ₹199 - 1 in 20 (5%)
        if (rand < 0.005 + 0.0067 + 0.01 + 0.02 + 0.05) {
            return { value: 199, segmentIndex: 1 };
        }
        // ₹99 - Everyone else (base prize ~91%)
        return { value: 99, segmentIndex: 0 };
    }
    
    // ============================================
    // MODERN STYLES
    // ============================================
    const STYLES = `
        @keyframes sw-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }
            50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.8); }
        }
        @keyframes sw-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        @keyframes sw-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes sw-confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes sw-spin-glow {
            0% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
            50% { filter: drop-shadow(0 0 30px rgba(255,255,255,0.9)); }
            100% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
        }
        
        .sw-overlay {
            position: fixed;
            inset: 0;
            background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,10,60,0.95) 100%);
            backdrop-filter: blur(8px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s ease;
        }
        .sw-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        .sw-modal {
            background: linear-gradient(165deg, #1F1135 0%, #0F0A1A 100%);
            border-radius: 28px;
            width: 100%;
            max-width: 400px;
            max-height: 92vh;
            overflow-y: auto;
            position: relative;
            transform: scale(0.8) translateY(20px);
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 25px 80px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .sw-overlay.active .sw-modal {
            transform: scale(1) translateY(0);
        }
        .sw-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: rgba(255,255,255,0.7);
            font-size: 20px;
            cursor: pointer;
            z-index: 10;
            display: none;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .sw-close.visible {
            display: flex;
        }
        .sw-close:hover {
            background: rgba(255,255,255,0.2);
            color: white;
            transform: rotate(90deg);
        }
        .sw-header {
            text-align: center;
            padding: 32px 24px 20px;
            background: linear-gradient(180deg, rgba(139,92,246,0.2) 0%, transparent 100%);
        }
        .sw-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
            color: #1F1135;
            padding: 8px 18px;
            border-radius: 50px;
            font-size: 0.8rem;
            font-weight: 700;
            margin-bottom: 16px;
            animation: sw-pulse 2s ease infinite;
            box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
        }
        .sw-title {
            color: white;
            font-size: 2rem;
            font-weight: 800;
            margin: 0 0 8px;
            background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .sw-subtitle {
            color: rgba(255,255,255,0.7);
            font-size: 1rem;
            margin: 0;
            font-weight: 400;
        }
        .sw-subtitle strong {
            color: #FBBF24;
            font-weight: 700;
        }
        .sw-content {
            padding: 0 24px 32px;
        }
        .sw-input-group {
            display: flex;
            flex-direction: column;
            gap: 14px;
            margin-bottom: 18px;
        }
        .sw-select {
            width: 100%;
            padding: 16px 18px;
            border: 2px solid rgba(139,92,246,0.3);
            border-radius: 14px;
            font-size: 1rem;
            background: rgba(255,255,255,0.05);
            color: white;
            cursor: pointer;
            transition: all 0.2s;
        }
        .sw-select:focus {
            outline: none;
            border-color: #8B5CF6;
            box-shadow: 0 0 0 4px rgba(139,92,246,0.2);
        }
        .sw-select option {
            background: #1F1135;
            color: white;
        }
        .sw-input {
            width: 100%;
            padding: 16px 18px;
            border: 2px solid rgba(139,92,246,0.3);
            border-radius: 14px;
            font-size: 1.2rem;
            text-align: center;
            letter-spacing: 3px;
            font-weight: 700;
            background: rgba(255,255,255,0.05);
            color: white;
            transition: all 0.2s;
        }
        .sw-input::placeholder {
            color: rgba(255,255,255,0.4);
            letter-spacing: 0;
            font-weight: 400;
        }
        .sw-input:focus {
            outline: none;
            border-color: #8B5CF6;
            box-shadow: 0 0 0 4px rgba(139,92,246,0.2);
            background: rgba(255,255,255,0.08);
        }
        .sw-btn {
            width: 100%;
            padding: 18px;
            border: none;
            border-radius: 14px;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }
        .sw-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        .sw-btn-primary {
            background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
            color: white;
            box-shadow: 0 8px 25px rgba(139,92,246,0.4);
        }
        .sw-btn-primary:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(139,92,246,0.5);
        }
        .sw-btn-gold {
            background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
            color: #1F1135;
            box-shadow: 0 8px 25px rgba(251,191,36,0.4);
            animation: sw-glow 2s ease infinite;
        }
        .sw-btn-gold:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(251,191,36,0.5);
        }
        .sw-helper {
            text-align: center;
            color: rgba(255,255,255,0.4);
            font-size: 0.8rem;
            margin-top: 14px;
        }
        .sw-hidden {
            display: none !important;
        }
        .sw-otp-section {
            text-align: center;
        }
        .sw-otp-label {
            color: rgba(255,255,255,0.8);
            font-size: 0.95rem;
            margin-bottom: 20px;
        }
        .sw-otp-boxes {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-bottom: 20px;
        }
        .sw-otp-input {
            width: 48px;
            height: 58px;
            border: 2px solid rgba(139,92,246,0.3);
            border-radius: 12px;
            text-align: center;
            font-size: 1.6rem;
            font-weight: 700;
            background: rgba(255,255,255,0.05);
            color: white;
            transition: all 0.2s;
        }
        .sw-otp-input:focus {
            outline: none;
            border-color: #8B5CF6;
            background: rgba(139,92,246,0.1);
            box-shadow: 0 0 0 4px rgba(139,92,246,0.2);
        }
        .sw-resend {
            text-align: center;
            color: rgba(255,255,255,0.5);
            font-size: 0.85rem;
            margin-top: 16px;
        }
        .sw-resend-link {
            color: #FBBF24;
            cursor: pointer;
            font-weight: 600;
            transition: color 0.2s;
        }
        .sw-resend-link:hover {
            color: #FCD34D;
            text-decoration: underline;
        }
        .sw-wheel-section {
            text-align: center;
        }
        .sw-wheel-container {
            position: relative;
            width: 300px;
            height: 300px;
            margin: 0 auto 24px;
        }
        .sw-wheel-outer {
            position: absolute;
            inset: -10px;
            border-radius: 50%;
            background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #FBBF24 100%);
            animation: sw-spin-glow 3s ease infinite;
        }
        .sw-wheel-inner {
            position: absolute;
            inset: 6px;
            border-radius: 50%;
            background: #1F1135;
        }
        .sw-wheel-svg {
            position: absolute;
            inset: 10px;
            width: calc(100% - 20px);
            height: calc(100% - 20px);
            transition: transform 5s cubic-bezier(0.17, 0.67, 0.05, 0.99);
        }
        .sw-pointer {
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 18px solid transparent;
            border-right: 18px solid transparent;
            border-top: 35px solid #FBBF24;
            z-index: 10;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        .sw-pointer::after {
            content: '';
            position: absolute;
            top: -35px;
            left: -10px;
            width: 20px;
            height: 20px;
            background: #FCD34D;
            border-radius: 50%;
        }
        .sw-center-btn {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
            border-radius: 50%;
            border: 4px solid #FCD34D;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            cursor: pointer;
            z-index: 5;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            transition: all 0.2s;
        }
        .sw-center-btn:hover {
            transform: translate(-50%, -50%) scale(1.1);
        }
        .sw-center-btn:disabled {
            cursor: not-allowed;
            opacity: 0.8;
        }
        .sw-spin-text {
            color: rgba(255,255,255,0.6);
            font-size: 0.9rem;
            margin-top: 8px;
        }
        .sw-result {
            text-align: center;
            padding: 20px 0;
        }
        .sw-result-icon {
            font-size: 5rem;
            margin-bottom: 16px;
            animation: sw-float 1s ease infinite;
        }
        .sw-result-title {
            font-size: 1.6rem;
            font-weight: 800;
            margin: 0 0 8px;
            background: linear-gradient(135deg, #FBBF24 0%, #FCD34D 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .sw-result-amount {
            font-size: 4rem;
            font-weight: 900;
            color: white;
            margin: 20px 0;
            text-shadow: 0 0 30px rgba(251,191,36,0.5);
        }
        .sw-result-text {
            color: rgba(255,255,255,0.7);
            font-size: 1rem;
            margin: 0 0 28px;
        }
        .sw-result-text strong {
            color: #FBBF24;
        }
        .sw-confetti {
            position: fixed;
            top: -20px;
            font-size: 24px;
            animation: sw-confetti 3s linear forwards;
            z-index: 10001;
            pointer-events: none;
        }
    `;
    
    // ============================================
    // CREATE WHEEL SVG
    // ============================================
    function createWheelSVG() {
        const size = 280;
        const cx = size / 2;
        const cy = size / 2;
        const r = size / 2 - 5;
        const segCount = SEGMENTS.length;
        const segAngle = 360 / segCount;
        
        let paths = '';
        let labels = '';
        
        SEGMENTS.forEach((seg, i) => {
            const startAngle = i * segAngle - 90;
            const endAngle = startAngle + segAngle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = cx + r * Math.cos(startRad);
            const y1 = cy + r * Math.sin(startRad);
            const x2 = cx + r * Math.cos(endRad);
            const y2 = cy + r * Math.sin(endRad);
            
            paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z" fill="${seg.color}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>`;
            
            // Label
            const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
            const labelR = r * 0.65;
            const lx = cx + labelR * Math.cos(midAngle);
            const ly = cy + labelR * Math.sin(midAngle);
            const rotation = (startAngle + endAngle) / 2 + 90;
            
            labels += `
                <g transform="rotate(${rotation}, ${lx}, ${ly})">
                    <text x="${lx}" y="${ly}" fill="white" font-size="22" font-weight="800" text-anchor="middle" dominant-baseline="middle" style="text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${seg.label}</text>
                </g>
            `;
        });
        
        return `<svg viewBox="0 0 ${size} ${size}" class="sw-wheel-svg" id="sw-wheel">${paths}${labels}</svg>`;
    }
    
    // ============================================
    // CREATE MODAL
    // ============================================
    function createModal() {
        injectStyles();
        
        const html = `
            <div class="sw-overlay" id="sw-overlay">
                <div class="sw-modal">
                    <button class="sw-close" id="sw-close">✕</button>
                    
                    <div class="sw-header">
                        <div class="sw-badge">🎰 EXCLUSIVE OFFER</div>
                        <h2 class="sw-title">Spin & Win!</h2>
                        <p class="sw-subtitle">Win up to <strong>₹599</strong> wallet cashback</p>
                    </div>
                    
                    <div class="sw-content">
                        <!-- PHONE SECTION -->
                        <div class="sw-phone-section" id="sw-phone">
                            <div class="sw-input-group">
                                <select class="sw-select" id="sw-country">
                                    <option value="+91">🇮🇳 India (+91)</option>
                                    <option value="+1">🇺🇸 USA (+1)</option>
                                    <option value="+44">🇬🇧 UK (+44)</option>
                                    <option value="+971">🇦🇪 UAE (+971)</option>
                                    <option value="+65">🇸🇬 Singapore (+65)</option>
                                    <option value="+61">🇦🇺 Australia (+61)</option>
                                    <option value="+966">🇸🇦 Saudi (+966)</option>
                                    <option value="+974">🇶🇦 Qatar (+974)</option>
                                    <option value="+60">🇲🇾 Malaysia (+60)</option>
                                </select>
                                <input type="tel" class="sw-input" id="sw-phone-input" placeholder="Enter mobile number" maxlength="10" inputmode="numeric">
                            </div>
                            <button class="sw-btn sw-btn-gold" id="sw-send-otp" disabled>
                                ✨ Get OTP & Spin
                            </button>
                            <p class="sw-helper">🔒 Your number is safe with us</p>
                        </div>
                        
                        <!-- OTP SECTION -->
                        <div class="sw-otp-section sw-hidden" id="sw-otp">
                            <p class="sw-otp-label">Enter the 6-digit code sent to your phone</p>
                            <div class="sw-otp-boxes">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                            </div>
                            <button class="sw-btn sw-btn-primary" id="sw-verify" disabled>
                                🎰 Verify & Spin Now!
                            </button>
                            <p class="sw-resend">Didn't get code? <span class="sw-resend-link" id="sw-resend">Resend OTP</span></p>
                        </div>
                        
                        <!-- WHEEL SECTION -->
                        <div class="sw-wheel-section sw-hidden" id="sw-wheel-section">
                            <div class="sw-wheel-container">
                                <div class="sw-wheel-outer"></div>
                                <div class="sw-wheel-inner"></div>
                                <div class="sw-pointer"></div>
                                ${createWheelSVG()}
                                <button class="sw-center-btn" id="sw-spin">🎲</button>
                            </div>
                            <p class="sw-spin-text">Tap the center to spin!</p>
                        </div>
                        
                        <!-- RESULT SECTION -->
                        <div class="sw-result sw-hidden" id="sw-result">
                            <div class="sw-result-icon">🎉</div>
                            <h3 class="sw-result-title">Congratulations!</h3>
                            <div class="sw-result-amount" id="sw-amount">₹99</div>
                            <p class="sw-result-text">Added to your wallet!<br><strong>Valid for 48 hours</strong></p>
                            <button class="sw-btn sw-btn-gold" id="sw-continue">
                                🛒 Start Shopping
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('sw-overlay');
        bindEvents();
    }
    
    function injectStyles() {
        if (document.getElementById('sw-styles-v16')) return;
        const style = document.createElement('style');
        style.id = 'sw-styles-v16';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }
    
    // ============================================
    // EVENT BINDINGS
    // ============================================
    function bindEvents() {
        const phoneInput = document.getElementById('sw-phone-input');
        const countrySelect = document.getElementById('sw-country');
        const sendBtn = document.getElementById('sw-send-otp');
        const closeBtn = document.getElementById('sw-close');
        
        countrySelect.onchange = (e) => selectedCountryCode = e.target.value;
        
        phoneInput.oninput = (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            sendBtn.disabled = e.target.value.length < 10;
        };
        
        phoneInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !sendBtn.disabled) {
                sendBtn.click();
            }
        };
        
        sendBtn.onclick = handleSendOtp;
        
        const otpInputs = document.querySelectorAll('.sw-otp-input');
        otpInputs.forEach((input, i) => {
            input.oninput = (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
                if (e.target.value && i < otpInputs.length - 1) {
                    otpInputs[i + 1].focus();
                }
                checkOtp();
            };
            input.onkeydown = (e) => {
                if (e.key === 'Backspace' && !e.target.value && i > 0) {
                    otpInputs[i - 1].focus();
                }
            };
            input.onpaste = (e) => {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
                paste.split('').slice(0, 6).forEach((char, j) => {
                    if (otpInputs[j]) otpInputs[j].value = char;
                });
                checkOtp();
            };
        });
        
        document.getElementById('sw-verify').onclick = handleVerify;
        document.getElementById('sw-resend').onclick = () => {
            document.getElementById('sw-otp').classList.add('sw-hidden');
            document.getElementById('sw-phone').classList.remove('sw-hidden');
            sendBtn.textContent = '✨ Get OTP & Spin';
            sendBtn.disabled = phoneInput.value.length < 10;
        };
        
        document.getElementById('sw-spin').onclick = handleSpin;
        document.getElementById('sw-continue').onclick = hide;
        closeBtn.onclick = hide;
    }
    
    function checkOtp() {
        const otp = Array.from(document.querySelectorAll('.sw-otp-input')).map(i => i.value).join('');
        document.getElementById('sw-verify').disabled = otp.length !== 6;
    }
    
    // ============================================
    // CAPTURE PHONE IMMEDIATELY
    // ============================================
    async function capturePhoneImmediately(phone) {
        console.log('[SpinWheel] 📱 CAPTURING PHONE:', phone);
        
        localStorage.setItem('seasalt_phone', phone);
        localStorage.setItem('seasalt_user', JSON.stringify({ phone: phone }));
        
        if (typeof Store !== 'undefined' && Store.setUser) {
            Store.setUser({ phone: phone });
        }
        
        try {
            const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=id,phone,total_visits`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            });
            
            const existingUsers = await checkRes.json();
            
            if (existingUsers && existingUsers.length > 0) {
                await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        last_seen: new Date().toISOString(),
                        total_visits: (existingUsers[0].total_visits || 0) + 1
                    })
                });
            } else {
                await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        phone: phone,
                        country: getCountryFromCode(selectedCountryCode),
                        selected_country: getCountryFromCode(selectedCountryCode),
                        wallet_balance: 0,
                        total_visits: 1,
                        created_at: new Date().toISOString(),
                        last_seen: new Date().toISOString()
                    })
                });
            }
            console.log('[SpinWheel] ✅ User saved');
        } catch (err) {
            console.warn('[SpinWheel] Save error:', err);
        }
    }
    
    function getCountryFromCode(code) {
        const map = {
            '+91': 'India', '+1': 'United States', '+44': 'United Kingdom',
            '+971': 'United Arab Emirates', '+65': 'Singapore', '+61': 'Australia',
            '+966': 'Saudi Arabia', '+974': 'Qatar', '+60': 'Malaysia'
        };
        return map[code] || 'India';
    }
    
    // ============================================
    // OTP HANDLERS
    // ============================================
    async function handleSendOtp() {
        const phone = document.getElementById('sw-phone-input').value;
        if (phone.length < 10) return;
        
        userPhone = selectedCountryCode + phone;
        const btn = document.getElementById('sw-send-otp');
        btn.disabled = true;
        btn.textContent = '📱 Capturing...';
        
        await capturePhoneImmediately(userPhone);
        
        btn.textContent = '📤 Sending OTP...';
        
        try {
            const DEMO_MODE = true;
            
            if (!DEMO_MODE && typeof firebase !== 'undefined' && firebase.auth) {
                if (!auth) auth = firebase.auth();
                if (!recaptchaVerifier) {
                    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sw-send-otp', { size: 'invisible' });
                }
                confirmationResult = await auth.signInWithPhoneNumber(userPhone, recaptchaVerifier);
                showOtpSection();
                toast('OTP sent! 📱', 'success');
            } else {
                showOtpSection();
                toast('Demo: Use OTP 123456', 'info');
            }
        } catch (err) {
            console.error('[SpinWheel] OTP error:', err);
            showOtpSection();
            toast('Demo: Use 123456', 'info');
        }
    }
    
    function showOtpSection() {
        document.getElementById('sw-phone').classList.add('sw-hidden');
        document.getElementById('sw-otp').classList.remove('sw-hidden');
        document.querySelector('.sw-otp-input').focus();
    }
    
    async function handleVerify() {
        const otp = Array.from(document.querySelectorAll('.sw-otp-input')).map(i => i.value).join('');
        if (otp.length !== 6) return;
        
        const btn = document.getElementById('sw-verify');
        btn.disabled = true;
        btn.textContent = '🔐 Verifying...';
        
        try {
            if (otp === '123456' || !confirmationResult) {
                onVerified();
            } else if (confirmationResult) {
                await confirmationResult.confirm(otp);
                onVerified();
            }
        } catch (err) {
            toast('Invalid OTP', 'error');
            btn.disabled = false;
            btn.textContent = '🎰 Verify & Spin Now!';
            document.querySelectorAll('.sw-otp-input').forEach(i => i.value = '');
            document.querySelector('.sw-otp-input').focus();
        }
    }
    
    function onVerified() {
        document.getElementById('sw-otp').classList.add('sw-hidden');
        document.getElementById('sw-wheel-section').classList.remove('sw-hidden');
        document.getElementById('sw-close').classList.add('visible');
        toast('Verified! 🎉 Spin to win!', 'success');
    }
    
    // ============================================
    // SPIN HANDLER
    // ============================================
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        
        const btn = document.getElementById('sw-spin');
        btn.disabled = true;
        
        // Calculate prize with exact odds
        const prize = calculatePrize();
        console.log('[SpinWheel] Prize:', prize.value);
        
        // Calculate rotation
        const segAngle = 360 / SEGMENTS.length;
        const targetAngle = 360 - (prize.segmentIndex * segAngle + segAngle / 2);
        const spins = 6 + Math.floor(Math.random() * 3);
        const totalRotation = spins * 360 + targetAngle;
        
        // Animate
        const wheel = document.getElementById('sw-wheel');
        wheel.style.transform = `rotate(${totalRotation}deg)`;
        
        setTimeout(() => showResult(prize.value), 5500);
    }
    
    function showResult(amount) {
        localStorage.setItem('seasalt_spin_completed', 'true');
        saveWallet(amount);
        
        // Confetti
        for (let i = 0; i < 30; i++) {
            setTimeout(() => createConfetti(), i * 50);
        }
        
        if (typeof UI !== 'undefined' && UI.updateCartUI) UI.updateCartUI();
        
        document.getElementById('sw-wheel-section').classList.add('sw-hidden');
        document.getElementById('sw-result').classList.remove('sw-hidden');
        document.getElementById('sw-amount').textContent = '₹' + amount;
        
        toast('🎉 You won ₹' + amount + '!', 'success');
        isSpinning = false;
    }
    
    function createConfetti() {
        const emojis = ['🎉', '🎊', '✨', '💫', '⭐', '🌟'];
        const conf = document.createElement('div');
        conf.className = 'sw-confetti';
        conf.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.animationDuration = (2 + Math.random() * 2) + 's';
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }
    
    function saveWallet(amount) {
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const walletData = {
            amount: amount,
            expiresAt: expiresAt.toISOString(),
            wonAt: new Date().toISOString(),
            phone: userPhone
        };
        
        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify(walletData));
        console.log('[SpinWheel] 💰 Wallet saved:', walletData);
        
        updateUserWallet(userPhone, amount);
    }
    
    async function updateUserWallet(phone, amount) {
        try {
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            
            await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    wallet_balance: amount,
                    wallet_expires_at: expiresAt
                })
            });
            console.log('[SpinWheel] ✅ Wallet updated in DB');
        } catch (err) {
            console.warn('[SpinWheel] Wallet update error:', err);
        }
    }
    
    // ============================================
    // VISIBILITY
    // ============================================
    function shouldShow() {
        return localStorage.getItem('seasalt_spin_completed') !== 'true';
    }
    
    function show() {
        if (!modal) createModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('sw-phone-input')?.focus(), 400);
    }
    
    function hide() {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function toast(msg, type) {
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(msg, type);
            return;
        }
        const t = document.createElement('div');
        const bg = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#6366F1';
        t.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:14px 28px;border-radius:14px;color:#fff;font-weight:600;z-index:99999;background:${bg};box-shadow:0 8px 25px rgba(0,0,0,0.3);`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
    
    function init() {
        console.log('[SpinWheel] v16 Modern - Initializing');
        if (shouldShow()) {
            setTimeout(show, 1000);
        }
    }
    
    return { init, show, hide, shouldShow };
})();

window.SpinWheel = SpinWheel;
