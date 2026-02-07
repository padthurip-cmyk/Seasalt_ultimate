/**
 * SeaSalt Pickles - Spin Wheel v6
 * ================================
 * FLOW: Spin First → Then Authenticate to Claim
 * 
 * 1. Show wheel immediately
 * 2. User spins and sees what they won
 * 3. To CLAIM the prize, enter Name + Phone + OTP
 * 4. After OTP verified, prize added to wallet (48hr expiry)
 * 5. One spin per phone per month
 * 
 * Weighted odds: 20% ₹99, 50% ₹199, 20% ₹399, 10% ₹599
 */

const SpinWheel = (function() {
    'use strict';
    
    // ============================================
    // CONFIGURATION
    // ============================================
    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyBxOXkOWqH_l4Moyp9CK5GKWeCDi9N3pWo",
        authDomain: "seasaltpickles-c058e.firebaseapp.com",
        projectId: "seasaltpickles-c058e",
        storageBucket: "seasaltpickles-c058e.appspot.com",
        messagingSenderId: "1098199921365",
        appId: "1:1098199921365:web:a1b2c3d4e5f6g7h8"
    };
    
    // ============================================
    // STATE
    // ============================================
    let modal = null;
    let userPhone = null;
    let userName = null;
    let userCountry = 'India';
    let selectedCountryCode = '+91';
    let isSpinning = false;
    let currentRotation = 0;
    let wonAmount = 0; // Store the won amount until claimed
    
    // Firebase
    let auth = null;
    let recaptchaVerifier = null;
    let confirmationResult = null;
    let resendTimer = null;
    let resendCountdown = 0;
    
    // ============================================
    // WHEEL SEGMENTS
    // ============================================
    const SEGMENTS = [
        { label: '₹99', value: 99, color: '#10B981' },
        { label: '₹199', value: 199, color: '#F59E0B' },
        { label: '₹399', value: 399, color: '#8B5CF6' },
        { label: '₹199', value: 199, color: '#3B82F6' },
        { label: '₹599', value: 599, color: '#EC4899' },
        { label: '₹199', value: 199, color: '#14B8A6' },
        { label: '₹99', value: 99, color: '#EF4444' },
        { label: '₹199', value: 199, color: '#F97316' }
    ];
    
    // Weighted: 20% ₹99, 50% ₹199, 20% ₹399, 10% ₹599
    const PRIZES = [
        { value: 99, weight: 20, segments: [0, 6] },
        { value: 199, weight: 50, segments: [1, 3, 5, 7] },
        { value: 399, weight: 20, segments: [2] },
        { value: 599, weight: 10, segments: [4] }
    ];
    
    const COUNTRIES = [
        { code: 'IN', name: 'India', phone: '+91' },
        { code: 'US', name: 'United States', phone: '+1' },
        { code: 'GB', name: 'United Kingdom', phone: '+44' },
        { code: 'AE', name: 'UAE', phone: '+971' },
        { code: 'SG', name: 'Singapore', phone: '+65' },
        { code: 'AU', name: 'Australia', phone: '+61' },
        { code: 'CA', name: 'Canada', phone: '+1' },
        { code: 'SA', name: 'Saudi Arabia', phone: '+966' },
        { code: 'MY', name: 'Malaysia', phone: '+60' },
        { code: 'DE', name: 'Germany', phone: '+49' }
    ];
    
    // ============================================
    // STYLES
    // ============================================
    const STYLES = `
        .sw-overlay {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.9);
            z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            padding: 16px;
            opacity: 0; visibility: hidden;
            transition: all 0.3s ease;
        }
        .sw-overlay.active { opacity: 1; visibility: visible; }
        .sw-modal {
            background: linear-gradient(145deg, #EA580C 0%, #DC2626 100%);
            border-radius: 24px;
            width: 100%; max-width: 400px; max-height: 95vh;
            overflow-y: auto;
            position: relative;
            transform: scale(0.9);
            transition: transform 0.3s ease;
            box-shadow: 0 25px 80px rgba(0,0,0,0.6);
        }
        .sw-overlay.active .sw-modal { transform: scale(1); }
        .sw-close {
            position: absolute; top: 12px; right: 12px;
            width: 36px; height: 36px; border-radius: 50%;
            background: rgba(255,255,255,0.2);
            border: none; color: white;
            font-size: 20px; cursor: pointer; z-index: 10;
            display: flex; align-items: center; justify-content: center;
        }
        .sw-close:hover { background: rgba(255,255,255,0.3); }
        .sw-header { text-align: center; padding: 28px 20px 16px; }
        .sw-badge {
            display: inline-block;
            background: linear-gradient(135deg, #FBBF24, #F59E0B);
            color: #7C2D12; padding: 8px 18px; border-radius: 25px;
            font-size: 12px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 1px;
            box-shadow: 0 4px 15px rgba(251,191,36,0.4);
        }
        .sw-title {
            font-size: 32px; font-weight: 900; color: white;
            margin: 12px 0 6px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .sw-subtitle { font-size: 15px; color: rgba(255,255,255,0.9); margin: 0; }
        .sw-content { padding: 0 24px 28px; }
        .sw-hidden { display: none !important; }
        
        /* Wheel */
        .sw-wheel-container {
            position: relative;
            width: 280px; height: 280px;
            margin: 20px auto;
        }
        .sw-wheel-pointer {
            position: absolute; top: -10px; left: 50%;
            transform: translateX(-50%);
            width: 0; height: 0;
            border-left: 16px solid transparent;
            border-right: 16px solid transparent;
            border-top: 30px solid #FBBF24;
            z-index: 10;
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));
        }
        .sw-wheel {
            width: 100%; height: 100%;
            border-radius: 50%;
            transition: transform 5s cubic-bezier(0.17, 0.67, 0.05, 0.99);
            box-shadow: 
                0 0 0 10px rgba(255,255,255,0.3),
                0 0 0 12px rgba(0,0,0,0.1),
                0 0 40px rgba(0,0,0,0.4);
        }
        .sw-wheel canvas { width: 100%; height: 100%; }
        .sw-wheel-center {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 60px; height: 60px;
            background: linear-gradient(145deg, #fff, #f0f0f0);
            border-radius: 50%;
            border: 4px solid #EA580C;
            display: flex; align-items: center; justify-content: center;
            font-size: 24px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .sw-spin-btn {
            width: 100%; padding: 18px;
            border: none; border-radius: 16px;
            font-size: 20px; font-weight: 800;
            cursor: pointer;
            background: linear-gradient(135deg, #FBBF24, #F59E0B);
            color: #7C2D12;
            box-shadow: 0 6px 25px rgba(251,191,36,0.5);
            transition: transform 0.2s, box-shadow 0.2s;
            margin-top: 16px;
        }
        .sw-spin-btn:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(251,191,36,0.6);
        }
        .sw-spin-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        
        /* Won Banner */
        .sw-won-banner {
            background: linear-gradient(135deg, #10B981, #059669);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(16,185,129,0.4);
        }
        .sw-won-label { font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 4px; }
        .sw-won-amount { font-size: 48px; font-weight: 900; color: white; }
        .sw-won-note { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 8px; }
        
        /* Form */
        .sw-form { display: flex; flex-direction: column; gap: 14px; }
        .sw-label { color: rgba(255,255,255,0.95); font-size: 13px; font-weight: 600; margin-bottom: 4px; }
        .sw-input, .sw-select {
            width: 100%; padding: 14px 16px;
            border: 2px solid transparent; border-radius: 12px;
            background: white;
            font-size: 16px; font-weight: 500; color: #333;
            outline: none; box-sizing: border-box;
            transition: border-color 0.2s;
        }
        .sw-input:focus, .sw-select:focus { border-color: #FBBF24; }
        .sw-input::placeholder { color: #9CA3AF; }
        .sw-select {
            cursor: pointer; appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath fill='%23666' d='M8 11L3 6h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
        }
        .sw-phone-row { display: flex; gap: 10px; }
        .sw-phone-code {
            width: 90px; flex-shrink: 0;
            text-align: center; background: #F3F4F6;
            font-weight: 700; color: #374151;
        }
        .sw-btn {
            width: 100%; padding: 16px;
            border: none; border-radius: 12px;
            font-size: 17px; font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s, opacity 0.2s;
        }
        .sw-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .sw-btn:hover:not(:disabled) { transform: translateY(-2px); }
        .sw-btn-green { background: linear-gradient(135deg, #10B981, #059669); color: white; }
        .sw-btn-orange { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; }
        .sw-error {
            background: #FEE2E2; color: #DC2626;
            padding: 12px; border-radius: 10px;
            font-size: 14px; text-align: center;
        }
        
        /* OTP */
        .sw-otp-info { text-align: center; color: rgba(255,255,255,0.95); font-size: 15px; margin-bottom: 20px; }
        .sw-otp-phone { color: #FBBF24; font-weight: 700; }
        .sw-otp-boxes { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
        .sw-otp-input {
            width: 48px; height: 58px;
            border: 2px solid transparent; border-radius: 12px;
            background: white;
            font-size: 26px; font-weight: 700;
            text-align: center; color: #333;
            outline: none;
            transition: border-color 0.2s;
        }
        .sw-otp-input:focus { border-color: #FBBF24; }
        .sw-resend { text-align: center; color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 16px; }
        .sw-resend-link {
            color: #FBBF24; background: none; border: none;
            cursor: pointer; font-weight: 600; text-decoration: underline;
        }
        .sw-resend-link:disabled { color: rgba(255,255,255,0.5); cursor: not-allowed; text-decoration: none; }
        .sw-change-num {
            display: block; margin: 12px auto 0;
            color: rgba(255,255,255,0.8); background: none; border: none;
            cursor: pointer; font-size: 14px; text-decoration: underline;
        }
        
        /* Result */
        .sw-result { text-align: center; padding: 10px 0; }
        .sw-result-icon { font-size: 72px; margin-bottom: 16px; }
        .sw-result-title { font-size: 32px; font-weight: 900; color: white; }
        .sw-result-amount {
            font-size: 56px; font-weight: 900;
            color: #FBBF24; margin: 10px 0;
            text-shadow: 0 3px 15px rgba(0,0,0,0.3);
        }
        .sw-result-desc { color: rgba(255,255,255,0.9); font-size: 15px; }
        
        .sw-timer-box {
            background: rgba(0,0,0,0.35);
            border-radius: 14px;
            padding: 18px; margin: 20px 0;
            text-align: center;
        }
        .sw-timer-label { font-size: 13px; color: rgba(255,255,255,0.85); margin-bottom: 6px; }
        .sw-timer-value { font-size: 28px; font-weight: 800; color: #FBBF24; font-family: 'Courier New', monospace; }
        .sw-timer-warning { font-size: 12px; color: #FCA5A5; margin-top: 6px; }
        
        .sw-wallet-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 14px 28px; border-radius: 14px;
            margin: 10px 0;
        }
        .sw-wallet-label { font-size: 12px; color: rgba(255,255,255,0.85); }
        .sw-wallet-amount { font-size: 32px; font-weight: 800; color: #4ADE80; }
        
        .sw-shop-btn {
            width: 100%; padding: 18px;
            border: none; border-radius: 14px;
            font-size: 18px; font-weight: 800;
            cursor: pointer;
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            box-shadow: 0 6px 25px rgba(16,185,129,0.4);
            margin-top: 10px;
        }
        .sw-shop-btn:hover { transform: translateY(-2px); }
    `;
    
    // ============================================
    // INITIALIZE FIREBASE
    // ============================================
    function initFirebase() {
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded');
            return false;
        }
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            auth = firebase.auth();
            auth.languageCode = 'en';
            return true;
        } catch (e) {
            console.error('Firebase init error:', e);
            return false;
        }
    }
    
    // ============================================
    // CREATE MODAL
    // ============================================
    function createModal() {
        const styleEl = document.createElement('style');
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
        
        let countryOptions = COUNTRIES.map(c => 
            `<option value="${c.code}" data-phone="${c.phone}">${c.name}</option>`
        ).join('');
        
        modal = document.createElement('div');
        modal.className = 'sw-overlay';
        modal.innerHTML = `
            <div class="sw-modal">
                <button class="sw-close" id="sw-close">&times;</button>
                
                <!-- STEP 1: WHEEL (shown first!) -->
                <div id="sw-step-wheel">
                    <div class="sw-header">
                        <div class="sw-badge">🎁 Lucky Draw</div>
                        <h2 class="sw-title">Spin & Win!</h2>
                        <p class="sw-subtitle">Win up to ₹599 - Use at checkout!</p>
                    </div>
                    <div class="sw-content">
                        <div class="sw-wheel-container">
                            <div class="sw-wheel-pointer"></div>
                            <div class="sw-wheel" id="sw-wheel">
                                <canvas id="sw-canvas" width="280" height="280"></canvas>
                                <div class="sw-wheel-center">🎰</div>
                            </div>
                        </div>
                        <button class="sw-spin-btn" id="sw-spin">
                            🎲 TAP TO SPIN!
                        </button>
                    </div>
                </div>
                
                <!-- STEP 2: CLAIM - Enter Details -->
                <div id="sw-step-claim" class="sw-hidden">
                    <div class="sw-header" style="padding-bottom:8px;">
                        <h2 class="sw-title">🎉 You Won!</h2>
                    </div>
                    <div class="sw-content">
                        <div class="sw-won-banner">
                            <div class="sw-won-label">Your Prize</div>
                            <div class="sw-won-amount" id="sw-claim-amount">₹199</div>
                            <div class="sw-won-note">Enter details to claim your reward</div>
                        </div>
                        
                        <div class="sw-form">
                            <div id="sw-error" class="sw-error sw-hidden"></div>
                            <div>
                                <div class="sw-label">Your Name</div>
                                <input type="text" id="sw-name" class="sw-input" placeholder="Enter your name">
                            </div>
                            <div>
                                <div class="sw-label">Country</div>
                                <select id="sw-country" class="sw-select">${countryOptions}</select>
                            </div>
                            <div>
                                <div class="sw-label">Phone Number</div>
                                <div class="sw-phone-row">
                                    <input type="text" id="sw-phone-code" class="sw-input sw-phone-code" value="+91" readonly>
                                    <input type="tel" id="sw-phone" class="sw-input" placeholder="9876543210" maxlength="10">
                                </div>
                            </div>
                            <button class="sw-btn sw-btn-green" id="sw-send-otp" disabled>
                                Send OTP to Claim →
                            </button>
                            <div id="sw-recaptcha"></div>
                        </div>
                    </div>
                </div>
                
                <!-- STEP 3: OTP Verification -->
                <div id="sw-step-otp" class="sw-hidden">
                    <div class="sw-header" style="padding-bottom:8px;">
                        <h2 class="sw-title">Verify OTP</h2>
                    </div>
                    <div class="sw-content">
                        <div class="sw-won-banner" style="padding:14px;">
                            <div class="sw-won-label">Claiming</div>
                            <div class="sw-won-amount" id="sw-otp-amount" style="font-size:36px;">₹199</div>
                        </div>
                        
                        <div class="sw-otp-info">
                            Enter OTP sent to <span class="sw-otp-phone" id="sw-otp-phone-display"></span>
                        </div>
                        <div class="sw-otp-boxes">
                            <input type="tel" class="sw-otp-input" maxlength="1" data-idx="0">
                            <input type="tel" class="sw-otp-input" maxlength="1" data-idx="1">
                            <input type="tel" class="sw-otp-input" maxlength="1" data-idx="2">
                            <input type="tel" class="sw-otp-input" maxlength="1" data-idx="3">
                            <input type="tel" class="sw-otp-input" maxlength="1" data-idx="4">
                            <input type="tel" class="sw-otp-input" maxlength="1" data-idx="5">
                        </div>
                        <button class="sw-btn sw-btn-green" id="sw-verify-otp" disabled>
                            Verify & Claim Prize →
                        </button>
                        <div class="sw-resend">
                            Didn't receive? 
                            <button class="sw-resend-link" id="sw-resend" disabled>
                                Resend (<span id="sw-resend-timer">30</span>s)
                            </button>
                        </div>
                        <button class="sw-change-num" id="sw-change-number">← Change number</button>
                    </div>
                </div>
                
                <!-- STEP 4: SUCCESS -->
                <div id="sw-step-success" class="sw-hidden">
                    <div class="sw-content" style="padding-top:30px;">
                        <div class="sw-result">
                            <div class="sw-result-icon">🎊</div>
                            <div class="sw-result-title">Congratulations!</div>
                            <div class="sw-result-amount" id="sw-final-amount">₹199</div>
                            <div class="sw-result-desc">Added to your wallet!</div>
                            
                            <div class="sw-timer-box">
                                <div class="sw-timer-label">⏰ Use before it expires</div>
                                <div class="sw-timer-value" id="sw-timer">47:59:59</div>
                                <div class="sw-timer-warning">Valid for 48 hours only!</div>
                            </div>
                            
                            <div class="sw-wallet-badge">
                                <div class="sw-wallet-label">Wallet Balance</div>
                                <div class="sw-wallet-amount" id="sw-wallet-total">₹199</div>
                            </div>
                            
                            <button class="sw-shop-btn" id="sw-shop-now">
                                🛒 Shop Now & Use Discount!
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- ALREADY SPUN -->
                <div id="sw-step-already" class="sw-hidden">
                    <div class="sw-content" style="padding-top:40px;">
                        <div class="sw-result">
                            <div class="sw-result-icon">⏳</div>
                            <div class="sw-result-title">Already Claimed!</div>
                            <div class="sw-result-desc" style="margin-top:10px;">This phone number has already spun the wheel this month.</div>
                            <div class="sw-timer-box">
                                <div class="sw-timer-label">Next spin available in</div>
                                <div class="sw-timer-value" id="sw-next-spin">-- days</div>
                            </div>
                            <button class="sw-btn sw-btn-orange" id="sw-close-already" style="margin-top:10px;">
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        drawWheel();
        setupEvents();
        initFirebase();
    }
    
    // ============================================
    // DRAW WHEEL
    // ============================================
    function drawWheel() {
        const canvas = document.getElementById('sw-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 5;
        const segmentAngle = (2 * Math.PI) / SEGMENTS.length;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        SEGMENTS.forEach((seg, i) => {
            const startAngle = (i * segmentAngle) - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;
            
            // Segment
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = seg.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Arial';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(seg.label, radius - 18, 7);
            ctx.restore();
        });
    }
    
    // ============================================
    // SETUP EVENTS
    // ============================================
    function setupEvents() {
        // Close
        document.getElementById('sw-close').onclick = hide;
        
        // SPIN
        document.getElementById('sw-spin').onclick = handleSpin;
        
        // Name
        document.getElementById('sw-name').oninput = validateClaimForm;
        
        // Country
        document.getElementById('sw-country').onchange = function() {
            const selected = this.options[this.selectedIndex];
            document.getElementById('sw-phone-code').value = selected.dataset.phone;
            selectedCountryCode = selected.dataset.phone;
            userCountry = selected.textContent;
            validateClaimForm();
        };
        
        // Phone
        document.getElementById('sw-phone').oninput = function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            validateClaimForm();
        };
        
        // Send OTP
        document.getElementById('sw-send-otp').onclick = handleSendOTP;
        
        // OTP inputs
        const otpInputs = document.querySelectorAll('.sw-otp-input');
        otpInputs.forEach((inp, i) => {
            inp.oninput = function(e) {
                this.value = this.value.replace(/\D/g, '').slice(0, 1);
                if (this.value && i < 5) otpInputs[i + 1].focus();
                validateOTP();
            };
            inp.onkeydown = function(e) {
                if (e.key === 'Backspace' && !this.value && i > 0) {
                    otpInputs[i - 1].focus();
                }
            };
            inp.onpaste = function(e) {
                e.preventDefault();
                const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                data.split('').forEach((c, j) => {
                    if (otpInputs[j]) otpInputs[j].value = c;
                });
                validateOTP();
            };
        });
        
        // Verify OTP
        document.getElementById('sw-verify-otp').onclick = handleVerifyOTP;
        
        // Resend
        document.getElementById('sw-resend').onclick = handleResendOTP;
        
        // Change number
        document.getElementById('sw-change-number').onclick = function() {
            goToStep('claim');
            clearOTPInputs();
        };
        
        // Shop now
        document.getElementById('sw-shop-now').onclick = hide;
        document.getElementById('sw-close-already').onclick = hide;
    }
    
    function validateClaimForm() {
        const name = document.getElementById('sw-name').value.trim();
        const phone = document.getElementById('sw-phone').value;
        document.getElementById('sw-send-otp').disabled = !(name.length >= 2 && phone.length === 10);
    }
    
    function validateOTP() {
        const otp = getOTPValue();
        document.getElementById('sw-verify-otp').disabled = otp.length !== 6;
    }
    
    function getOTPValue() {
        return Array.from(document.querySelectorAll('.sw-otp-input')).map(i => i.value).join('');
    }
    
    function clearOTPInputs() {
        document.querySelectorAll('.sw-otp-input').forEach(i => i.value = '');
        document.getElementById('sw-verify-otp').disabled = true;
    }
    
    function showError(msg) {
        const el = document.getElementById('sw-error');
        el.textContent = msg;
        el.classList.remove('sw-hidden');
    }
    
    function hideError() {
        document.getElementById('sw-error').classList.add('sw-hidden');
    }
    
    function goToStep(step) {
        ['wheel', 'claim', 'otp', 'success', 'already'].forEach(s => {
            const el = document.getElementById('sw-step-' + s);
            if (el) el.classList.toggle('sw-hidden', s !== step);
        });
    }
    
    // ============================================
    // SPIN HANDLER (Step 1)
    // ============================================
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        
        const btn = document.getElementById('sw-spin');
        btn.disabled = true;
        btn.textContent = '🎲 Spinning...';
        
        // Weighted random selection
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
        
        // Pick segment
        const segmentIndex = selectedPrize.segments[Math.floor(Math.random() * selectedPrize.segments.length)];
        wonAmount = selectedPrize.value;
        
        // Calculate rotation
        const segmentAngle = 360 / SEGMENTS.length;
        const targetRotation = (SEGMENTS.length - segmentIndex) * segmentAngle - segmentAngle / 2;
        const spins = 6 + Math.floor(Math.random() * 3);
        const totalRotation = currentRotation + (spins * 360) + targetRotation - (currentRotation % 360);
        
        currentRotation = totalRotation;
        
        document.getElementById('sw-wheel').style.transform = `rotate(${totalRotation}deg)`;
        
        // After spin, show claim form
        setTimeout(() => {
            isSpinning = false;
            document.getElementById('sw-claim-amount').textContent = '₹' + wonAmount;
            document.getElementById('sw-otp-amount').textContent = '₹' + wonAmount;
            goToStep('claim');
            document.getElementById('sw-name').focus();
            toast('🎉 You won ₹' + wonAmount + '! Verify to claim.', 'success');
        }, 5200);
    }
    
    // ============================================
    // OTP HANDLERS (Step 2 & 3)
    // ============================================
    async function handleSendOTP() {
        userName = document.getElementById('sw-name').value.trim();
        const phone = document.getElementById('sw-phone').value;
        userPhone = selectedCountryCode + phone;
        
        hideError();
        const btn = document.getElementById('sw-send-otp');
        btn.disabled = true;
        btn.textContent = 'Checking...';
        
        // Check if already spun this month
        const canSpinResult = await checkCanSpin(userPhone);
        if (!canSpinResult.canSpin) {
            goToStep('already');
            document.getElementById('sw-next-spin').textContent = canSpinResult.daysLeft + ' days';
            return;
        }
        
        btn.textContent = 'Sending OTP...';
        
        try {
            if (!recaptchaVerifier) {
                recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sw-recaptcha', {
                    size: 'invisible',
                    callback: () => {}
                });
            }
            
            confirmationResult = await auth.signInWithPhoneNumber(userPhone, recaptchaVerifier);
            
            document.getElementById('sw-otp-phone-display').textContent = userPhone;
            goToStep('otp');
            document.querySelector('.sw-otp-input').focus();
            startResendTimer();
            
            toast('OTP sent to ' + userPhone, 'success');
            
        } catch (err) {
            console.error('OTP error:', err);
            
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                recaptchaVerifier = null;
            }
            
            if (err.code === 'auth/too-many-requests') {
                showError('Too many attempts. Try again later.');
            } else if (err.code === 'auth/invalid-phone-number') {
                showError('Invalid phone number.');
            } else {
                showError('Failed to send OTP. Try again.');
            }
            
            btn.disabled = false;
            btn.textContent = 'Send OTP to Claim →';
        }
    }
    
    async function handleVerifyOTP() {
        const otp = getOTPValue();
        if (otp.length !== 6) return;
        
        const btn = document.getElementById('sw-verify-otp');
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        
        try {
            await confirmationResult.confirm(otp);
            
            // OTP verified! Now save the prize
            await savePrizeToWallet();
            
        } catch (err) {
            console.error('Verify error:', err);
            toast('Invalid OTP. Try again.', 'error');
            clearOTPInputs();
            document.querySelector('.sw-otp-input').focus();
            btn.disabled = true;
            btn.textContent = 'Verify & Claim Prize →';
        }
    }
    
    function handleResendOTP() {
        if (recaptchaVerifier) {
            recaptchaVerifier.clear();
            recaptchaVerifier = null;
        }
        goToStep('claim');
        document.getElementById('sw-send-otp').textContent = 'Send OTP to Claim →';
        validateClaimForm();
    }
    
    function startResendTimer() {
        resendCountdown = 30;
        const btn = document.getElementById('sw-resend');
        const timerSpan = document.getElementById('sw-resend-timer');
        
        btn.disabled = true;
        timerSpan.textContent = resendCountdown;
        
        if (resendTimer) clearInterval(resendTimer);
        
        resendTimer = setInterval(() => {
            resendCountdown--;
            timerSpan.textContent = resendCountdown;
            
            if (resendCountdown <= 0) {
                clearInterval(resendTimer);
                btn.disabled = false;
                btn.innerHTML = 'Resend OTP';
            }
        }, 1000);
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
    // SAVE PRIZE TO WALLET
    // ============================================
    async function savePrizeToWallet() {
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
            const existingUsers = await checkRes.json();
            
            const userData = {
                name: userName,
                selected_country: userCountry,
                wallet_balance: wonAmount,
                wallet_expires_at: expiresAt.toISOString(),
                last_seen: now.toISOString()
            };
            
            if (existingUsers && existingUsers.length > 0) {
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
            console.warn('Supabase error:', e);
        }
        
        // Show success
        document.getElementById('sw-final-amount').textContent = '₹' + wonAmount;
        document.getElementById('sw-wallet-total').textContent = '₹' + wonAmount;
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
        return !localStorage.getItem('seasalt_spin_done');
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
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:16px 32px;border-radius:14px;color:#fff;font-weight:700;z-index:99999;font-size:16px;box-shadow:0 6px 30px rgba(0,0,0,0.4);background:${type==='success'?'linear-gradient(135deg,#10B981,#059669)':'linear-gradient(135deg,#EF4444,#DC2626)'}`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }
    
    function init() {
        if (shouldShow()) {
            setTimeout(show, 1500);
        }
    }
    
    return { init, show, hide, shouldShow, getWalletBalance, useWallet };
})();

window.SpinWheel = SpinWheel;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SpinWheel.init());
} else {
    SpinWheel.init();
}
