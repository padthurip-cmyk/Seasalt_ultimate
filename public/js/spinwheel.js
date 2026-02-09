/**
 * SeaSalt Pickles - Spin Wheel v15
 * =================================
 * CAPTURES PHONE IMMEDIATELY when user clicks Send OTP
 * Phone is saved to localStorage and Supabase right away
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
    // WHEEL SEGMENTS (8 segments, 45° each)
    // ============================================
    const SEGMENTS = [
        { label: '₹99', value: 99, color: '#DAA520', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#2E7D32', isWin: false },
        { label: '₹299', value: 299, color: '#E53935', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#388E3C', isWin: false },
        { label: '₹599', value: 599, color: '#7B1FA2', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#43A047', isWin: false },
        { label: '₹99', value: 99, color: '#FFA000', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#2E7D32', isWin: false }
    ];
    
    // ============================================
    // STYLES
    // ============================================
    const STYLES = `
        .sw-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(4px);
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
            background: linear-gradient(145deg, #9A3412 0%, #7C2D12 100%);
            border-radius: 24px;
            width: 100%;
            max-width: 380px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            transform: scale(0.9);
            transition: transform 0.3s ease;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
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
            display: none;
        }
        .sw-close.visible {
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
            background: rgba(218,165,32,0.2);
            color: #DAA520;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 12px;
        }
        .sw-title {
            color: white;
            font-size: 1.75rem;
            font-weight: 700;
            margin: 0 0 8px;
        }
        .sw-subtitle {
            color: rgba(255,255,255,0.8);
            font-size: 0.95rem;
            margin: 0;
        }
        .sw-content {
            padding: 0 24px 28px;
        }
        .sw-input-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 16px;
        }
        .sw-select {
            width: 100%;
            padding: 14px 16px;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            background: white;
            cursor: pointer;
        }
        .sw-input {
            width: 100%;
            padding: 14px 16px;
            border: none;
            border-radius: 12px;
            font-size: 1.1rem;
            text-align: center;
            letter-spacing: 2px;
            font-weight: 600;
        }
        .sw-input:focus {
            outline: 3px solid #DAA520;
        }
        .sw-btn {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }
        .sw-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .sw-btn-gold {
            background: linear-gradient(135deg, #DAA520, #F4C430);
            color: white;
            box-shadow: 0 4px 15px rgba(218,165,32,0.4);
        }
        .sw-btn-gold:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(218,165,32,0.5);
        }
        .sw-helper {
            text-align: center;
            color: rgba(255,255,255,0.5);
            font-size: 0.8rem;
            margin-top: 12px;
        }
        .sw-hidden {
            display: none !important;
        }
        .sw-otp-label {
            text-align: center;
            color: rgba(255,255,255,0.8);
            font-size: 0.9rem;
            margin-bottom: 16px;
        }
        .sw-otp-boxes {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-bottom: 16px;
        }
        .sw-otp-input {
            width: 45px;
            height: 55px;
            border: none;
            border-radius: 10px;
            text-align: center;
            font-size: 1.5rem;
            font-weight: 700;
        }
        .sw-otp-input:focus {
            outline: 3px solid #DAA520;
        }
        .sw-resend {
            text-align: center;
            color: rgba(255,255,255,0.6);
            font-size: 0.85rem;
            margin-top: 12px;
        }
        .sw-resend-link {
            color: #DAA520;
            cursor: pointer;
            font-weight: 600;
        }
        .sw-wheel-wrap {
            position: relative;
            width: 280px;
            height: 280px;
            margin: 0 auto 20px;
        }
        .sw-wheel-img {
            width: 100%;
            height: 100%;
            transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
        }
        .sw-pointer {
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 15px solid transparent;
            border-right: 15px solid transparent;
            border-top: 28px solid white;
            z-index: 10;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .sw-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #fff, #f0f0f0);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 5;
        }
        .sw-btn-spin {
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, #fff, #f8f8f8);
            border: none;
            border-radius: 14px;
            font-size: 1.2rem;
            font-weight: 800;
            color: #9A3412;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.2s;
        }
        .sw-btn-spin:hover:not(:disabled) {
            transform: translateY(-2px);
        }
        .sw-btn-spin:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        .sw-result {
            text-align: center;
            padding: 20px 0;
        }
        .sw-result-icon {
            font-size: 4rem;
            margin-bottom: 16px;
            animation: bounce 0.6s ease infinite;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .sw-result-title {
            color: #DAA520;
            font-size: 1.8rem;
            font-weight: 700;
            margin: 0 0 8px;
        }
        .sw-result-amount {
            color: white;
            font-size: 3.5rem;
            font-weight: 800;
            margin: 16px 0;
        }
        .sw-result-text {
            color: rgba(255,255,255,0.8);
            font-size: 1rem;
            margin: 0 0 24px;
        }
        .sw-btn-continue {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #DAA520, #F4C430);
            border: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 700;
            color: white;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(218,165,32,0.4);
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
        const segAngle = 360 / SEGMENTS.length;
        
        let paths = '';
        let labels = '';
        
        SEGMENTS.forEach((seg, i) => {
            const startAngle = i * segAngle - 90;
            const endAngle = startAngle + segAngle;
            
            const start = {
                x: cx + r * Math.cos(startAngle * Math.PI / 180),
                y: cy + r * Math.sin(startAngle * Math.PI / 180)
            };
            const end = {
                x: cx + r * Math.cos(endAngle * Math.PI / 180),
                y: cy + r * Math.sin(endAngle * Math.PI / 180)
            };
            
            const largeArc = segAngle > 180 ? 1 : 0;
            
            paths += `<path d="M${cx},${cy} L${start.x},${start.y} A${r},${r} 0 ${largeArc},1 ${end.x},${end.y} Z" fill="${seg.color}"/>`;
            
            // Label
            const midAngle = (startAngle + segAngle / 2) * Math.PI / 180;
            const labelR = r * 0.65;
            const lx = cx + labelR * Math.cos(midAngle);
            const ly = cy + labelR * Math.sin(midAngle);
            const rotation = startAngle + segAngle / 2 + 90;
            
            const fontSize = seg.isWin ? 16 : 9;
            labels += `
                <g transform="rotate(${rotation}, ${lx}, ${ly})">
                    <text x="${lx}" y="${ly}" fill="white" font-size="${fontSize}" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${seg.label}</text>
                </g>
            `;
        });
        
        return `<svg viewBox="0 0 ${size} ${size}" class="sw-wheel-img" id="sw-wheel">
            <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="white" opacity="0.2"/>
            ${paths}
            ${labels}
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="white" stroke-width="6"/>
        </svg>`;
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
                        <div class="sw-badge">🎁 Limited Time Offer</div>
                        <h2 class="sw-title">🎉 Welcome Gift!</h2>
                        <p class="sw-subtitle">Spin to win wallet cashback up to ₹599</p>
                    </div>
                    
                    <div class="sw-content">
                        <!-- PHONE SECTION -->
                        <div class="sw-phone" id="sw-phone">
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
                                <input type="tel" class="sw-input" id="sw-phone-input" placeholder="Enter mobile number" maxlength="10">
                            </div>
                            <button class="sw-btn sw-btn-gold" id="sw-send-otp" disabled>Send OTP ✨</button>
                            <p class="sw-helper">We'll send a verification code to your phone</p>
                        </div>
                        
                        <!-- OTP SECTION -->
                        <div class="sw-otp sw-hidden" id="sw-otp">
                            <p class="sw-otp-label">Enter the 6-digit code sent to your phone</p>
                            <div class="sw-otp-boxes">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                                <input type="text" class="sw-otp-input" maxlength="1" inputmode="numeric">
                            </div>
                            <button class="sw-btn sw-btn-gold" id="sw-verify" disabled>Verify & Spin 🎰</button>
                            <p class="sw-resend">Didn't receive? <span class="sw-resend-link" id="sw-resend">Resend</span></p>
                        </div>
                        
                        <!-- WHEEL SECTION -->
                        <div class="sw-wheel-section sw-hidden" id="sw-wheel-section">
                            <div class="sw-wheel-wrap">
                                <div class="sw-pointer"></div>
                                ${createWheelSVG()}
                                <div class="sw-center">🎰</div>
                            </div>
                            <button class="sw-btn-spin" id="sw-spin">🎲 SPIN NOW! 🎲</button>
                        </div>
                        
                        <!-- RESULT SECTION -->
                        <div class="sw-result sw-hidden" id="sw-result">
                            <div id="sw-win">
                                <div class="sw-result-icon">🎉</div>
                                <h3 class="sw-result-title">Congratulations!</h3>
                                <div class="sw-result-amount" id="sw-amount">₹99</div>
                                <p class="sw-result-text">Added to your wallet! Valid for 48 hours.</p>
                            </div>
                            <div id="sw-lose" class="sw-hidden">
                                <div class="sw-result-icon">😢</div>
                                <h3 class="sw-result-title" style="color:white;">Better Luck Next Time!</h3>
                                <p class="sw-result-text">Don't worry, check out our amazing products!</p>
                            </div>
                            <button class="sw-btn-continue" id="sw-continue">Start Shopping 🛒</button>
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
        if (document.getElementById('sw-styles')) return;
        const style = document.createElement('style');
        style.id = 'sw-styles';
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
        
        // Country change
        countrySelect.onchange = (e) => {
            selectedCountryCode = e.target.value;
        };
        
        // Phone input validation
        phoneInput.oninput = (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            sendBtn.disabled = e.target.value.length < 10;
        };
        
        // Send OTP
        sendBtn.onclick = handleSendOtp;
        
        // OTP inputs
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
        });
        
        // Verify
        document.getElementById('sw-verify').onclick = handleVerify;
        
        // Resend
        document.getElementById('sw-resend').onclick = () => {
            document.getElementById('sw-otp').classList.add('sw-hidden');
            document.getElementById('sw-phone').classList.remove('sw-hidden');
            sendBtn.textContent = 'Send OTP ✨';
            sendBtn.disabled = phoneInput.value.length < 10;
        };
        
        // Spin
        document.getElementById('sw-spin').onclick = handleSpin;
        
        // Continue
        document.getElementById('sw-continue').onclick = hide;
        
        // Close
        closeBtn.onclick = hide;
    }
    
    function checkOtp() {
        const otp = Array.from(document.querySelectorAll('.sw-otp-input')).map(i => i.value).join('');
        document.getElementById('sw-verify').disabled = otp.length !== 6;
    }
    
    // ============================================
    // ⭐ CAPTURE PHONE IMMEDIATELY ON SEND OTP
    // ============================================
    async function capturePhoneImmediately(phone) {
        console.log('[SpinWheel] 📱 CAPTURING PHONE IMMEDIATELY:', phone);
        
        // 1. Save to localStorage (multiple keys for compatibility)
        localStorage.setItem('seasalt_phone', phone);
        localStorage.setItem('seasalt_user', JSON.stringify({ phone: phone }));
        
        // 2. Update Store if available
        if (typeof Store !== 'undefined' && Store.setUser) {
            Store.setUser({ phone: phone });
        }
        
        // 3. Track in Analytics immediately
        if (typeof Analytics !== 'undefined') {
            if (Analytics.trackEvent) {
                Analytics.trackEvent('phone_captured', { extra: { phone: phone, stage: 'send_otp_clicked' } });
            }
        }
        
        // 4. Save to Supabase users table IMMEDIATELY
        try {
            // Check if user exists
            const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=id,phone,total_visits`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });
            
            const existingUsers = await checkRes.json();
            
            if (existingUsers && existingUsers.length > 0) {
                // Update existing user - increment visits
                console.log('[SpinWheel] User exists, updating...');
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
                // Create new user IMMEDIATELY
                console.log('[SpinWheel] Creating new user...');
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
                        name: null,
                        country: getCountryFromCode(selectedCountryCode),
                        selected_country: getCountryFromCode(selectedCountryCode),
                        wallet_balance: 0,
                        total_visits: 1,
                        total_purchases: 0,
                        created_at: new Date().toISOString(),
                        last_seen: new Date().toISOString()
                    })
                });
            }
            
            console.log('[SpinWheel] ✅ User saved to Supabase IMMEDIATELY');
        } catch (err) {
            console.warn('[SpinWheel] Could not save to Supabase:', err);
        }
    }
    
    function getCountryFromCode(code) {
        const map = {
            '+91': 'India',
            '+1': 'United States',
            '+44': 'United Kingdom',
            '+971': 'United Arab Emirates',
            '+65': 'Singapore',
            '+61': 'Australia',
            '+966': 'Saudi Arabia',
            '+974': 'Qatar',
            '+60': 'Malaysia'
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
        btn.textContent = 'Capturing...';
        
        // ⭐⭐⭐ CAPTURE PHONE IMMEDIATELY - BEFORE EVEN SENDING OTP ⭐⭐⭐
        await capturePhoneImmediately(userPhone);
        
        btn.textContent = 'Sending OTP...';
        
        try {
            // Check for demo OTP mode (123456)
            const DEMO_MODE = true; // Set to false for production Firebase OTP
            
            if (!DEMO_MODE && typeof firebase !== 'undefined' && firebase.auth) {
                if (!auth) auth = firebase.auth();
                if (!recaptchaVerifier) {
                    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sw-send-otp', { size: 'invisible' });
                }
                confirmationResult = await auth.signInWithPhoneNumber(userPhone, recaptchaVerifier);
                showOtpSection();
                toast('OTP sent to ' + userPhone, 'success');
            } else {
                // Demo mode - any 6 digit OTP works (or use 123456)
                showOtpSection();
                toast('Demo: Use OTP 123456', 'info');
            }
        } catch (err) {
            console.error('[SpinWheel] OTP error:', err);
            showOtpSection();
            toast('Demo: Use OTP 123456', 'info');
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
        btn.textContent = 'Verifying...';
        
        try {
            // Demo mode: accept 123456 or any 6 digits
            if (otp === '123456' || !confirmationResult) {
                onVerified();
            } else if (confirmationResult) {
                await confirmationResult.confirm(otp);
                onVerified();
            }
        } catch (err) {
            console.error('[SpinWheel] Verify error:', err);
            toast('Invalid OTP. Try 123456', 'error');
            btn.disabled = false;
            btn.textContent = 'Verify & Spin 🎰';
            document.querySelectorAll('.sw-otp-input').forEach(i => i.value = '');
            document.querySelector('.sw-otp-input').focus();
        }
    }
    
    function onVerified() {
        console.log('[SpinWheel] ✅ User verified:', userPhone);
        
        // Track verification
        if (typeof Analytics !== 'undefined' && Analytics.trackEvent) {
            Analytics.trackEvent('user_verified', { extra: { phone: userPhone } });
        }
        
        // Show wheel
        document.getElementById('sw-otp').classList.add('sw-hidden');
        document.getElementById('sw-wheel-section').classList.remove('sw-hidden');
        document.getElementById('sw-close').classList.add('visible');
        toast('Verified! Spin the wheel!', 'success');
    }
    
    // ============================================
    // SPIN HANDLER
    // ============================================
    function handleSpin() {
        if (isSpinning) return;
        isSpinning = true;
        
        const btn = document.getElementById('sw-spin');
        btn.disabled = true;
        btn.textContent = 'Spinning...';
        
        // Track spin
        if (typeof Analytics !== 'undefined' && Analytics.trackEvent) {
            Analytics.trackEvent('spin_started', { extra: { phone: userPhone } });
        }
        
        // Calculate result (weighted - more likely to win small amounts)
        const rand = Math.random();
        let segmentIndex, amount = 0, won = false;
        
        if (rand < 0.35) {
            // 35% chance - win ₹99
            const idx99 = SEGMENTS.findIndex(s => s.value === 99);
            segmentIndex = idx99 >= 0 ? idx99 : 0;
            amount = 99;
            won = true;
        } else if (rand < 0.45) {
            // 10% chance - win ₹299
            const idx299 = SEGMENTS.findIndex(s => s.value === 299);
            segmentIndex = idx299 >= 0 ? idx299 : 2;
            amount = 299;
            won = true;
        } else if (rand < 0.48) {
            // 3% chance - win ₹599
            const idx599 = SEGMENTS.findIndex(s => s.value === 599);
            segmentIndex = idx599 >= 0 ? idx599 : 4;
            amount = 599;
            won = true;
        } else {
            // 52% chance - lose (try again)
            const loseSegments = SEGMENTS.map((s, i) => ({ s, i })).filter(x => !x.s.isWin);
            const pick = loseSegments[Math.floor(Math.random() * loseSegments.length)];
            segmentIndex = pick.i;
            won = false;
        }
        
        // Calculate rotation
        const segAngle = 360 / SEGMENTS.length;
        const targetAngle = 360 - (segmentIndex * segAngle + segAngle / 2);
        const spins = 5 + Math.floor(Math.random() * 3);
        const totalRotation = spins * 360 + targetAngle;
        
        // Animate wheel
        const wheel = document.getElementById('sw-wheel');
        wheel.style.transform = `rotate(${totalRotation}deg)`;
        
        // Show result after animation
        setTimeout(() => showResult(won, amount), 4200);
    }
    
    function showResult(won, amount) {
        console.log('[SpinWheel] Result:', won ? 'Won ₹' + amount : 'Lost');
        
        // Mark spin completed
        localStorage.setItem('seasalt_spin_completed', 'true');
        
        // Save wallet if won
        if (won && amount > 0) {
            saveWallet(amount);
        }
        
        // Track result
        if (typeof Analytics !== 'undefined' && Analytics.trackEvent) {
            Analytics.trackEvent('spin_completed', { 
                extra: { 
                    phone: userPhone, 
                    won: won, 
                    amount: amount 
                } 
            });
        }
        
        // Update UI
        if (typeof UI !== 'undefined' && UI.updateCartUI) {
            UI.updateCartUI();
        }
        
        // Show result section
        document.getElementById('sw-wheel-section').classList.add('sw-hidden');
        document.getElementById('sw-result').classList.remove('sw-hidden');
        
        if (won) {
            document.getElementById('sw-amount').textContent = '₹' + amount;
            document.getElementById('sw-win').classList.remove('sw-hidden');
            document.getElementById('sw-lose').classList.add('sw-hidden');
            toast('🎉 You won ₹' + amount + '!', 'success');
        } else {
            document.getElementById('sw-win').classList.add('sw-hidden');
            document.getElementById('sw-lose').classList.remove('sw-hidden');
            toast('Better luck next time!', 'info');
        }
        
        isSpinning = false;
    }
    
    function saveWallet(amount) {
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
        const walletData = {
            amount: amount,
            expiresAt: expiresAt.toISOString(),
            wonAt: new Date().toISOString(),
            phone: userPhone
        };
        
        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify(walletData));
        console.log('[SpinWheel] 💰 Wallet saved:', walletData);
        
        // Also update Supabase user wallet
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
            
            console.log('[SpinWheel] ✅ Wallet updated in Supabase');
        } catch (err) {
            console.warn('[SpinWheel] Could not update wallet in Supabase:', err);
        }
    }
    
    // ============================================
    // VISIBILITY
    // ============================================
    function shouldShow() {
        // Don't show if already completed spin
        if (localStorage.getItem('seasalt_spin_completed') === 'true') {
            return false;
        }
        return true;
    }
    
    function show() {
        if (!modal) createModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('sw-phone-input')?.focus(), 300);
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
        const bg = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#6B7280';
        t.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:14px 28px;border-radius:12px;color:#fff;font-weight:600;z-index:99999;background:${bg};box-shadow:0 4px 15px rgba(0,0,0,0.2);`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
    
    // ============================================
    // INIT
    // ============================================
    function init() {
        console.log('[SpinWheel] v15 Initializing...');
        
        if (shouldShow()) {
            setTimeout(show, 1500);
        } else {
            console.log('[SpinWheel] Already completed, not showing');
        }
    }
    
    return { init, show, hide, shouldShow };
})();

window.SpinWheel = SpinWheel;
