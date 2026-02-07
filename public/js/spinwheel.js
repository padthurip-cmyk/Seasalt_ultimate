/**
 * SeaSalt Pickles - Spin Wheel v7
 * ================================
 * FLOW: Wheel First → Spin → Claim with OTP → Wallet with 48hr expiry
 * 
 * Features:
 * - Wheel shows first (no login required to spin)
 * - After spin, enter details + OTP to claim prize
 * - Weighted odds: 20% ₹99, 50% ₹199, 20% ₹399, 10% ₹599
 * - Wallet with 48-hour expiry timer
 * - One spin per phone per month
 * - Matches original SeaSalt design
 */

const SpinWheel = (function() {
    'use strict';
    
    // ============================================
    // CONFIGURATION
    // ============================================
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    
    // ============================================
    // STATE
    // ============================================
    let modal = null;
    let confirmationResult = null;
    let userPhone = null;
    let userName = null;
    let selectedCountryCode = '+91';
    let userCountry = 'India';
    let isSpinning = false;
    let auth = null;
    let recaptchaVerifier = null;
    let wonAmount = 0;
    
    // ============================================
    // WHEEL SEGMENTS (8 segments)
    // ============================================
    const SEGMENTS = [
        { label: '₹99', value: 99, color: '#10B981' },
        { label: '₹199', value: 199, color: '#FBBF24' },
        { label: '₹399', value: 399, color: '#8B5CF6' },
        { label: '₹199', value: 199, color: '#34D399' },
        { label: '₹599', value: 599, color: '#F87171' },
        { label: '₹199', value: 199, color: '#FB923C' },
        { label: '₹99', value: 99, color: '#60A5FA' },
        { label: '₹199', value: 199, color: '#4ADE80' }
    ];
    
    // Weighted: 20% ₹99, 50% ₹199, 20% ₹399, 10% ₹599
    const PRIZES = [
        { value: 99, weight: 20, segments: [0, 6] },
        { value: 199, weight: 50, segments: [1, 3, 5, 7] },
        { value: 399, weight: 20, segments: [2] },
        { value: 599, weight: 10, segments: [4] }
    ];
    
    // ============================================
    // STYLES (matching original design)
    // ============================================
    const STYLES = `
        .sw-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.75);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        .sw-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        .sw-modal {
            background: linear-gradient(145deg, #EA580C 0%, #DC2626 100%);
            border-radius: 24px;
            width: 100%;
            max-width: 360px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            transform: scale(0.9);
            transition: transform 0.3s ease;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .sw-overlay.active .sw-modal {
            transform: scale(1);
        }
        .sw-close {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .sw-close:hover {
            background: rgba(255,255,255,0.3);
        }
        .sw-header {
            text-align: center;
            padding: 28px 20px 16px;
        }
        .sw-badge {
            display: inline-block;
            background: #F59E0B;
            color: white;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        .sw-title {
            font-size: 26px;
            font-weight: 800;
            color: white;
            margin: 0 0 6px 0;
        }
        .sw-subtitle {
            font-size: 14px;
            color: rgba(255,255,255,0.9);
            margin: 0;
        }
        .sw-content {
            padding: 0 24px 28px;
        }
        .sw-hidden { display: none !important; }
        
        /* WHEEL SECTION */
        .sw-wheel-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        .sw-wheel-wrap {
            position: relative;
            width: 280px;
            height: 280px;
        }
        .sw-wheel-img {
            width: 100%;
            height: 100%;
            transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
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
            border-top: 30px solid white;
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
            z-index: 10;
        }
        .sw-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: linear-gradient(180deg, #fff, #f0f0f0);
            border-radius: 50%;
            border: 4px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 5;
        }
        .sw-btn-spin {
            padding: 16px 40px;
            background: linear-gradient(135deg, #F97316, #EA580C);
            color: white;
            border: none;
            border-radius: 14px;
            font-size: 18px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(249,115,22,0.5);
            text-transform: uppercase;
            transition: transform 0.2s;
        }
        .sw-btn-spin:hover:not(:disabled) {
            transform: translateY(-2px);
        }
        .sw-btn-spin:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        /* CLAIM SECTION */
        .sw-claim {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .sw-won-box {
            background: linear-gradient(135deg, #10B981, #059669);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            margin-bottom: 8px;
        }
        .sw-won-label {
            font-size: 14px;
            color: rgba(255,255,255,0.9);
        }
        .sw-won-amount {
            font-size: 48px;
            font-weight: 900;
            color: white;
        }
        .sw-won-note {
            font-size: 12px;
            color: rgba(255,255,255,0.8);
            margin-top: 4px;
        }
        .sw-input-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .sw-label {
            font-size: 13px;
            font-weight: 600;
            color: rgba(255,255,255,0.9);
            margin-bottom: 2px;
        }
        .sw-select, .sw-input {
            width: 100%;
            padding: 14px 16px;
            border: none;
            border-radius: 12px;
            background: white;
            font-size: 16px;
            font-weight: 500;
            color: #333;
            outline: none;
            box-sizing: border-box;
        }
        .sw-select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath fill='%23666' d='M8 11L3 6h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
        }
        .sw-input::placeholder {
            color: #9CA3AF;
        }
        .sw-input:focus, .sw-select:focus {
            box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
        }
        .sw-phone-row {
            display: flex;
            gap: 8px;
        }
        .sw-phone-code {
            width: 85px;
            flex-shrink: 0;
            text-align: center;
            font-weight: 700;
            background: #f3f4f6;
        }
        .sw-btn {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s, opacity 0.2s;
        }
        .sw-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .sw-btn:hover:not(:disabled) {
            transform: translateY(-2px);
        }
        .sw-btn-orange {
            background: linear-gradient(135deg, #F59E0B, #D97706);
            color: white;
            box-shadow: 0 4px 15px rgba(245,158,11,0.4);
        }
        .sw-btn-green {
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            box-shadow: 0 4px 15px rgba(16,185,129,0.4);
        }
        .sw-helper {
            text-align: center;
            color: rgba(255,255,255,0.8);
            font-size: 13px;
            margin-top: 4px;
        }
        .sw-error {
            background: #FEE2E2;
            color: #DC2626;
            padding: 10px;
            border-radius: 8px;
            font-size: 13px;
            text-align: center;
        }
        
        /* OTP SECTION */
        .sw-otp {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        }
        .sw-otp-label {
            color: white;
            font-size: 14px;
            text-align: center;
        }
        .sw-otp-phone {
            color: #FCD34D;
            font-weight: 700;
        }
        .sw-otp-boxes {
            display: flex;
            gap: 8px;
            justify-content: center;
        }
        .sw-otp-input {
            width: 46px;
            height: 56px;
            border: none;
            border-radius: 10px;
            background: white;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
            color: #333;
            outline: none;
        }
        .sw-otp-input:focus {
            box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
        }
        .sw-resend {
            color: rgba(255,255,255,0.8);
            font-size: 13px;
            text-align: center;
        }
        .sw-resend-link {
            color: #FCD34D;
            cursor: pointer;
            font-weight: 600;
            background: none;
            border: none;
        }
        .sw-resend-link:disabled {
            color: rgba(255,255,255,0.5);
            cursor: not-allowed;
        }
        .sw-change-link {
            color: rgba(255,255,255,0.7);
            font-size: 13px;
            cursor: pointer;
            background: none;
            border: none;
            text-decoration: underline;
            margin-top: 8px;
        }
        
        /* RESULT SECTION */
        .sw-result {
            text-align: center;
            padding: 20px 0;
        }
        .sw-result-icon {
            font-size: 70px;
            margin-bottom: 16px;
        }
        .sw-result-title {
            font-size: 24px;
            font-weight: 800;
            color: white;
            margin: 0 0 8px 0;
        }
        .sw-result-amount {
            font-size: 44px;
            font-weight: 800;
            color: #FCD34D;
            margin: 8px 0;
        }
        .sw-result-text {
            font-size: 15px;
            color: rgba(255,255,255,0.9);
            margin-bottom: 16px;
        }
        
        /* TIMER & WALLET */
        .sw-timer-box {
            background: rgba(0,0,0,0.25);
            border-radius: 12px;
            padding: 14px;
            margin: 16px 0;
        }
        .sw-timer-label {
            font-size: 12px;
            color: rgba(255,255,255,0.8);
            margin-bottom: 4px;
        }
        .sw-timer-value {
            font-size: 28px;
            font-weight: 800;
            color: #FCD34D;
            font-family: 'Courier New', monospace;
        }
        .sw-timer-warning {
            font-size: 11px;
            color: #FCA5A5;
            margin-top: 4px;
        }
        .sw-wallet-box {
            background: rgba(255,255,255,0.15);
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 16px;
        }
        .sw-wallet-label {
            font-size: 12px;
            color: rgba(255,255,255,0.8);
        }
        .sw-wallet-amount {
            font-size: 32px;
            font-weight: 800;
            color: #4ADE80;
        }
        
        .sw-btn-continue {
            padding: 14px 36px;
            background: white;
            color: #EA580C;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
        }
        .sw-btn-continue:hover {
            transform: translateY(-2px);
        }
        
        @media (max-width: 380px) {
            .sw-modal { max-width: 340px; }
            .sw-wheel-wrap { width: 250px; height: 250px; }
            .sw-otp-input { width: 40px; height: 50px; font-size: 20px; }
        }
    `;
    
    // ============================================
    // CREATE WHEEL SVG
    // ============================================
    function createWheelSVG() {
        const size = 280;
        const cx = size / 2;
        const cy = size / 2;
        const r = size / 2 - 10;
        const n = SEGMENTS.length;
        const angle = 360 / n;
        
        let paths = '';
        let labels = '';
        
        SEGMENTS.forEach((seg, i) => {
            const startAngle = (i * angle - 90) * Math.PI / 180;
            const endAngle = ((i + 1) * angle - 90) * Math.PI / 180;
            
            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle);
            const y2 = cy + r * Math.sin(endAngle);
            
            paths += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${seg.color}" stroke="white" stroke-width="2"/>`;
            
            const midAngle = ((i + 0.5) * angle - 90) * Math.PI / 180;
            const labelR = r * 0.65;
            const lx = cx + labelR * Math.cos(midAngle);
            const ly = cy + labelR * Math.sin(midAngle);
            const rotation = (i + 0.5) * angle;
            
            labels += `
                <g transform="rotate(${rotation}, ${lx.toFixed(1)}, ${ly.toFixed(1)})">
                    <rect x="${(lx - 28).toFixed(1)}" y="${(ly - 12).toFixed(1)}" width="56" height="24" rx="12" fill="white" fill-opacity="0.95"/>
                    <text x="${lx.toFixed(1)}" y="${(ly + 1).toFixed(1)}" font-size="14" font-weight="800" fill="${seg.color}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">${seg.label}</text>
                </g>
            `;
        });
        
        return `<svg viewBox="0 0 ${size} ${size}" class="sw-wheel-img" id="sw-wheel">
            <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="white"/>
            ${paths}
            ${labels}
        </svg>`;
    }
    
    // ============================================
    // CREATE MODAL
    // ============================================
    function createModal() {
        // Inject styles
        if (!document.getElementById('sw-styles')) {
            const style = document.createElement('style');
            style.id = 'sw-styles';
            style.textContent = STYLES;
            document.head.appendChild(style);
        }
        
        const html = `
            <div class="sw-overlay" id="sw-overlay">
                <div class="sw-modal">
                    <button class="sw-close" id="sw-close">✕</button>
                    
                    <!-- STEP 1: WHEEL (shows first!) -->
                    <div id="sw-step-wheel">
                        <div class="sw-header">
                            <div class="sw-badge">🎁 Limited Time Offer</div>
                            <h2 class="sw-title">🎉 Welcome Gift!</h2>
                            <p class="sw-subtitle">Spin to win wallet cashback up to ₹599</p>
                        </div>
                        <div class="sw-content">
                            <div class="sw-wheel-section">
                                <div class="sw-wheel-wrap">
                                    <div class="sw-pointer"></div>
                                    ${createWheelSVG()}
                                    <div class="sw-center">🎰</div>
                                </div>
                                <button class="sw-btn-spin" id="sw-spin">🎲 SPIN NOW! 🎲</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- STEP 2: CLAIM (after spin) -->
                    <div id="sw-step-claim" class="sw-hidden">
                        <div class="sw-header" style="padding-bottom: 10px;">
                            <h2 class="sw-title">🎉 You Won!</h2>
                        </div>
                        <div class="sw-content">
                            <div class="sw-claim">
                                <div class="sw-won-box">
                                    <div class="sw-won-label">Your Prize</div>
                                    <div class="sw-won-amount" id="sw-claim-amount">₹199</div>
                                    <div class="sw-won-note">Verify phone to claim your reward</div>
                                </div>
                                
                                <div id="sw-claim-error" class="sw-error sw-hidden"></div>
                                
                                <div class="sw-input-group">
                                    <div class="sw-label">Your Name</div>
                                    <input type="text" class="sw-input" id="sw-name" placeholder="Enter your name">
                                </div>
                                
                                <div class="sw-input-group">
                                    <div class="sw-label">Country</div>
                                    <select class="sw-select" id="sw-country">
                                        <option value="+91" data-country="India">🇮🇳 India (+91)</option>
                                        <option value="+1" data-country="USA">🇺🇸 USA (+1)</option>
                                        <option value="+44" data-country="UK">🇬🇧 UK (+44)</option>
                                        <option value="+971" data-country="UAE">🇦🇪 UAE (+971)</option>
                                        <option value="+65" data-country="Singapore">🇸🇬 Singapore (+65)</option>
                                        <option value="+61" data-country="Australia">🇦🇺 Australia (+61)</option>
                                        <option value="+966" data-country="Saudi Arabia">🇸🇦 Saudi Arabia (+966)</option>
                                        <option value="+60" data-country="Malaysia">🇲🇾 Malaysia (+60)</option>
                                    </select>
                                </div>
                                
                                <div class="sw-input-group">
                                    <div class="sw-label">Phone Number</div>
                                    <div class="sw-phone-row">
                                        <input type="text" class="sw-input sw-phone-code" id="sw-phone-code" value="+91" readonly>
                                        <input type="tel" class="sw-input" id="sw-phone" placeholder="9876543210" maxlength="10">
                                    </div>
                                </div>
                                
                                <button class="sw-btn sw-btn-orange" id="sw-send-otp" disabled>Send OTP to Claim ✨</button>
                                <p class="sw-helper">We'll send a verification code to your phone</p>
                                <div id="sw-recaptcha"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- STEP 3: OTP -->
                    <div id="sw-step-otp" class="sw-hidden">
                        <div class="sw-header" style="padding-bottom: 10px;">
                            <h2 class="sw-title">Verify OTP</h2>
                        </div>
                        <div class="sw-content">
                            <div class="sw-won-box" style="padding: 14px; margin-bottom: 16px;">
                                <div class="sw-won-label">Claiming</div>
                                <div class="sw-won-amount" id="sw-otp-amount" style="font-size: 36px;">₹199</div>
                            </div>
                            
                            <div class="sw-otp">
                                <p class="sw-otp-label">Enter the 6-digit code sent to <span class="sw-otp-phone" id="sw-otp-phone"></span></p>
                                <div class="sw-otp-boxes">
                                    <input type="tel" class="sw-otp-input" maxlength="1" data-i="0">
                                    <input type="tel" class="sw-otp-input" maxlength="1" data-i="1">
                                    <input type="tel" class="sw-otp-input" maxlength="1" data-i="2">
                                    <input type="tel" class="sw-otp-input" maxlength="1" data-i="3">
                                    <input type="tel" class="sw-otp-input" maxlength="1" data-i="4">
                                    <input type="tel" class="sw-otp-input" maxlength="1" data-i="5">
                                </div>
                                <button class="sw-btn sw-btn-green" id="sw-verify" disabled>Verify & Claim 🎉</button>
                                <p class="sw-resend">Didn't receive? <button class="sw-resend-link" id="sw-resend" disabled>Resend (<span id="sw-resend-timer">30</span>s)</button></p>
                                <button class="sw-change-link" id="sw-change-num">← Change number</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- STEP 4: SUCCESS -->
                    <div id="sw-step-success" class="sw-hidden">
                        <div class="sw-content" style="padding-top: 30px;">
                            <div class="sw-result">
                                <div class="sw-result-icon">🎊</div>
                                <h3 class="sw-result-title">Congratulations!</h3>
                                <div class="sw-result-amount" id="sw-final-amount">₹199</div>
                                <p class="sw-result-text">Added to your wallet!</p>
                                
                                <div class="sw-timer-box">
                                    <div class="sw-timer-label">⏰ Use within</div>
                                    <div class="sw-timer-value" id="sw-timer">47:59:59</div>
                                    <div class="sw-timer-warning">Expires in 48 hours!</div>
                                </div>
                                
                                <div class="sw-wallet-box">
                                    <div class="sw-wallet-label">💰 Wallet Balance</div>
                                    <div class="sw-wallet-amount" id="sw-wallet-balance">₹199</div>
                                </div>
                                
                                <button class="sw-btn-continue" id="sw-continue">🛒 Start Shopping →</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ALREADY CLAIMED -->
                    <div id="sw-step-already" class="sw-hidden">
                        <div class="sw-content" style="padding-top: 40px;">
                            <div class="sw-result">
                                <div class="sw-result-icon">⏳</div>
                                <h3 class="sw-result-title">Already Claimed!</h3>
                                <p class="sw-result-text">This number has already spun the wheel this month.</p>
                                <div class="sw-timer-box">
                                    <div class="sw-timer-label">Next spin available in</div>
                                    <div class="sw-timer-value" id="sw-next-spin">-- days</div>
                                </div>
                                <button class="sw-btn-continue" id="sw-close-already">Continue Shopping →</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('sw-overlay');
        bindEvents();
        initFirebase();
    }
    
    // ============================================
    // INIT FIREBASE
    // ============================================
    function initFirebase() {
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded - OTP will work in demo mode');
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
        } catch (e) {
            console.error('Firebase init error:', e);
        }
    }
    
    // ============================================
    // BIND EVENTS
    // ============================================
    function bindEvents() {
        // Close
        document.getElementById('sw-close').onclick = hide;
        
        // Spin
        document.getElementById('sw-spin').onclick = handleSpin;
        
        // Name input
        document.getElementById('sw-name').oninput = validateClaimForm;
        
        // Country select
        document.getElementById('sw-country').onchange = function(e) {
            selectedCountryCode = e.target.value;
            userCountry = e.target.options[e.target.selectedIndex].dataset.country;
            document.getElementById('sw-phone-code').value = selectedCountryCode;
            validateClaimForm();
        };
        
        // Phone input
        document.getElementById('sw-phone').oninput = function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            validateClaimForm();
        };
        
        // Send OTP
        document.getElementById('sw-send-otp').onclick = handleSendOtp;
        
        // OTP inputs
        const otpInputs = document.querySelectorAll('.sw-otp-input');
        otpInputs.forEach((inp, i) => {
            inp.oninput = function(e) {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
                if (e.target.value && i < 5) otpInputs[i + 1].focus();
                checkOtp();
            };
            inp.onkeydown = function(e) {
                if (e.key === 'Backspace' && !e.target.value && i > 0) {
                    otpInputs[i - 1].focus();
                }
            };
            inp.onpaste = function(e) {
                e.preventDefault();
                const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                data.split('').forEach((c, j) => { if (otpInputs[j]) otpInputs[j].value = c; });
                checkOtp();
            };
        });
        
        // Verify
        document.getElementById('sw-verify').onclick = handleVerify;
        
        // Resend
        document.getElementById('sw-resend').onclick = handleResend;
        
        // Change number
        document.getElementById('sw-change-num').onclick = function() {
            goToStep('claim');
            clearOtpInputs();
        };
        
        // Continue
        document.getElementById('sw-continue').onclick = hide;
        document.getElementById('sw-close-already').onclick = hide;
    }
    
    function validateClaimForm() {
        const name = document.getElementById('sw-name').value.trim();
        const phone = document.getElementById('sw-phone').value;
        document.getElementById('sw-send-otp').disabled = !(name.length >= 2 && phone.length === 10);
    }
    
    function checkOtp() {
        const otp = Array.from(document.querySelectorAll('.sw-otp-input')).map(i => i.value).join('');
        document.getElementById('sw-verify').disabled = otp.length !== 6;
    }
    
    function clearOtpInputs() {
        document.querySelectorAll('.sw-otp-input').forEach(i => i.value = '');
        document.getElementById('sw-verify').disabled = true;
    }
    
    function goToStep(step) {
        ['wheel', 'claim', 'otp', 'success', 'already'].forEach(s => {
            const el = document.getElementById('sw-step-' + s);
            if (el) el.classList.toggle('sw-hidden', s !== step);
        });
    }
    
    function showError(msg) {
        const el = document.getElementById('sw-claim-error');
        el.textContent = msg;
        el.classList.remove('sw-hidden');
    }
    
    function hideError() {
        document.getElementById('sw-claim-error').classList.add('sw-hidden');
    }
    
    // ============================================
    // SPIN HANDLER
    // ============================================
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        
        const btn = document.getElementById('sw-spin');
        btn.disabled = true;
        btn.textContent = '🎲 Spinning...';
        
        // Weighted random
        const totalWeight = PRIZES.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedPrize = PRIZES[0];
        
        for (const prize of PRIZES) {
            random -= prize.weight;
            if (random <= 0) {
                selectedPrize = prize;
                break;
            }
        }
        
        const segmentIndex = selectedPrize.segments[Math.floor(Math.random() * selectedPrize.segments.length)];
        wonAmount = selectedPrize.value;
        
        // Calculate rotation
        const segAngle = 360 / SEGMENTS.length;
        const targetAngle = 360 - (segmentIndex * segAngle + segAngle / 2);
        const spins = 5 + Math.floor(Math.random() * 3);
        const totalRotation = spins * 360 + targetAngle;
        
        const wheel = document.getElementById('sw-wheel');
        wheel.style.transform = `rotate(${totalRotation}deg)`;
        
        setTimeout(() => {
            isSpinning = false;
            // Show claim form
            document.getElementById('sw-claim-amount').textContent = '₹' + wonAmount;
            document.getElementById('sw-otp-amount').textContent = '₹' + wonAmount;
            goToStep('claim');
            document.getElementById('sw-name').focus();
            toast('🎉 You won ₹' + wonAmount + '! Verify to claim.', 'success');
        }, 4200);
    }
    
    // ============================================
    // OTP HANDLERS
    // ============================================
    async function handleSendOtp() {
        userName = document.getElementById('sw-name').value.trim();
        const phone = document.getElementById('sw-phone').value;
        userPhone = selectedCountryCode + phone;
        
        hideError();
        const btn = document.getElementById('sw-send-otp');
        btn.disabled = true;
        btn.textContent = 'Checking...';
        
        // Check if already spun
        const canSpinResult = await checkCanSpin(userPhone);
        if (!canSpinResult.canSpin) {
            goToStep('already');
            document.getElementById('sw-next-spin').textContent = canSpinResult.daysLeft + ' days';
            return;
        }
        
        btn.textContent = 'Sending OTP...';
        
        try {
            if (auth) {
                if (!recaptchaVerifier) {
                    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sw-recaptcha', { size: 'invisible' });
                }
                confirmationResult = await auth.signInWithPhoneNumber(userPhone, recaptchaVerifier);
                showOtpStep();
                toast('OTP sent!', 'success');
            } else {
                // Demo mode
                showOtpStep();
                toast('Demo mode: Enter any 6 digits', 'info');
            }
        } catch (err) {
            console.error('OTP error:', err);
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                recaptchaVerifier = null;
            }
            // Fallback to demo mode
            showOtpStep();
            toast('Demo mode: Enter any 6 digits', 'info');
        }
    }
    
    function showOtpStep() {
        document.getElementById('sw-otp-phone').textContent = userPhone;
        goToStep('otp');
        document.querySelector('.sw-otp-input').focus();
        startResendTimer();
    }
    
    let resendInterval = null;
    function startResendTimer() {
        let countdown = 30;
        const btn = document.getElementById('sw-resend');
        const timerSpan = document.getElementById('sw-resend-timer');
        
        btn.disabled = true;
        timerSpan.textContent = countdown;
        
        if (resendInterval) clearInterval(resendInterval);
        
        resendInterval = setInterval(() => {
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
        if (recaptchaVerifier) {
            recaptchaVerifier.clear();
            recaptchaVerifier = null;
        }
        goToStep('claim');
        clearOtpInputs();
        document.getElementById('sw-send-otp').textContent = 'Send OTP to Claim ✨';
        validateClaimForm();
    }
    
    async function handleVerify() {
        const otp = Array.from(document.querySelectorAll('.sw-otp-input')).map(i => i.value).join('');
        if (otp.length !== 6) return;
        
        const btn = document.getElementById('sw-verify');
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        
        try {
            if (confirmationResult) {
                await confirmationResult.confirm(otp);
            }
            // Success - save to wallet
            await saveToWallet();
        } catch (err) {
            if (!confirmationResult) {
                // Demo mode - accept any OTP
                await saveToWallet();
            } else {
                toast('Invalid OTP. Try again.', 'error');
                clearOtpInputs();
                document.querySelector('.sw-otp-input').focus();
                btn.disabled = true;
                btn.textContent = 'Verify & Claim 🎉';
            }
        }
    }
    
    // ============================================
    // CHECK CAN SPIN
    // ============================================
    async function checkCanSpin(phone) {
        try {
            const res = await fetch(
                SUPABASE_URL + '/rest/v1/wallet_transactions?user_phone=eq.' + encodeURIComponent(phone) + '&type=eq.spin_reward&order=created_at.desc&limit=1',
                { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
            );
            const data = await res.json();
            
            if (data && data.length > 0) {
                const lastSpin = new Date(data[0].created_at);
                const daysSince = (new Date() - lastSpin) / (1000 * 60 * 60 * 24);
                if (daysSince < 30) {
                    return { canSpin: false, daysLeft: Math.ceil(30 - daysSince) };
                }
            }
            return { canSpin: true };
        } catch (e) {
            return { canSpin: true };
        }
    }
    
    // ============================================
    // SAVE TO WALLET
    // ============================================
    async function saveToWallet() {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        
        // Save locally
        localStorage.setItem('seasalt_user', JSON.stringify({
            name: userName,
            phone: userPhone,
            country: userCountry
        }));
        
        localStorage.setItem('seasalt_wallet', JSON.stringify({
            amount: wonAmount,
            addedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString()
        }));
        
        localStorage.setItem('seasalt_spin_done', 'true');
        
        // Save to Supabase
        try {
            const checkRes = await fetch(
                SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(userPhone),
                { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
            );
            const existing = await checkRes.json();
            
            const userData = {
                name: userName,
                selected_country: userCountry,
                wallet_balance: wonAmount,
                wallet_expires_at: expiresAt.toISOString(),
                last_seen: now.toISOString()
            };
            
            if (existing && existing.length > 0) {
                await fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(userPhone), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
                    body: JSON.stringify(userData)
                });
            } else {
                await fetch(SUPABASE_URL + '/rest/v1/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ phone: userPhone, total_visits: 1, ...userData })
                });
            }
            
            await fetch(SUPABASE_URL + '/rest/v1/wallet_transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                    user_phone: userPhone,
                    amount: wonAmount,
                    type: 'spin_reward',
                    description: 'Spin wheel reward - expires in 48hrs',
                    balance_after: wonAmount
                })
            });
        } catch (e) {
            console.warn('Supabase save error:', e);
        }
        
        // Update Store if available
        if (typeof Store !== 'undefined') {
            if (Store.setUser) Store.setUser({ name: userName, phone: userPhone });
            if (Store.markSpinCompleted) Store.markSpinCompleted();
            if (Store.addToWallet) Store.addToWallet(wonAmount, 'Spin Wheel Reward');
        }
        
        // Show success
        document.getElementById('sw-final-amount').textContent = '₹' + wonAmount;
        document.getElementById('sw-wallet-balance').textContent = '₹' + wonAmount;
        goToStep('success');
        startCountdownTimer(expiresAt);
        toast('🎊 ₹' + wonAmount + ' added to wallet!', 'success');
    }
    
    function startCountdownTimer(expiresAt) {
        const timerEl = document.getElementById('sw-timer');
        
        function update() {
            const diff = new Date(expiresAt) - new Date();
            if (diff <= 0) {
                timerEl.textContent = 'EXPIRED';
                timerEl.style.color = '#EF4444';
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            timerEl.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        }
        
        update();
        setInterval(update, 1000);
    }
    
    // ============================================
    // WALLET HELPERS
    // ============================================
    function getWalletBalance() {
        try {
            const data = JSON.parse(localStorage.getItem('seasalt_wallet') || '{}');
            if (!data.amount) return 0;
            if (new Date() > new Date(data.expiresAt)) {
                localStorage.removeItem('seasalt_wallet');
                return 0;
            }
            return data.amount;
        } catch (e) {
            return 0;
        }
    }
    
    function getWalletExpiry() {
        try {
            const data = JSON.parse(localStorage.getItem('seasalt_wallet') || '{}');
            return data.expiresAt ? new Date(data.expiresAt) : null;
        } catch (e) {
            return null;
        }
    }
    
    function useWallet(amountUsed) {
        try {
            const data = JSON.parse(localStorage.getItem('seasalt_wallet') || '{}');
            if (data.amount) {
                data.amount = Math.max(0, data.amount - amountUsed);
                data.amount === 0 ? localStorage.removeItem('seasalt_wallet') : localStorage.setItem('seasalt_wallet', JSON.stringify(data));
            }
        } catch (e) {}
    }
    
    // ============================================
    // VISIBILITY
    // ============================================
    function shouldShow() {
        if (localStorage.getItem('seasalt_spin_done')) return false;
        if (typeof CONFIG !== 'undefined' && CONFIG.SPIN_WHEEL && !CONFIG.SPIN_WHEEL.ENABLED) return false;
        if (typeof Store !== 'undefined' && Store.hasUserSpun && Store.hasUserSpun()) return false;
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
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(msg, type);
            return;
        }
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:12px;color:#fff;font-weight:600;z-index:99999;background:${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#6B7280'}`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
    
    // ============================================
    // INIT
    // ============================================
    function init() {
        if (shouldShow()) {
            setTimeout(show, 1000);
        }
    }
    
    return { init, show, hide, shouldShow, getWalletBalance, getWalletExpiry, useWallet };
})();

window.SpinWheel = SpinWheel;
