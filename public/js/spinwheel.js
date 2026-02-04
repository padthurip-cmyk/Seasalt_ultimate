/**
 * SeaSalt Pickles - Spin Wheel v3
 * ================================
 * Complete spin wheel with vertical phone layout
 * 
 * REPLACE your spinwheel.js with this file
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
    let auth = null;
    let recaptchaVerifier = null;
    
    // ============================================
    // WHEEL SEGMENTS (8 segments, 45° each)
    // ============================================
    const SEGMENTS = [
        { label: '₹99', value: 99, color: '#10B981', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#EF4444', isWin: false },
        { label: '₹299', value: 299, color: '#FBBF24', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#34D399', isWin: false },
        { label: '₹599', value: 599, color: '#8B5CF6', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#F87171', isWin: false },
        { label: '₹99', value: 99, color: '#FB923C', isWin: true },
        { label: 'TRY AGAIN', value: 0, color: '#4ADE80', isWin: false }
    ];
    
    // ============================================
    // STYLES
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
        
        /* PHONE SECTION - VERTICAL LAYOUT */
        .sw-phone {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .sw-input-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .sw-select {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 12px;
            background: white;
            font-size: 16px;
            font-weight: 600;
            color: #333;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23666' d='M8 11L3 6h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
        }
        .sw-input {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 12px;
            background: white;
            font-size: 18px;
            font-weight: 500;
            color: #333;
            outline: none;
            box-sizing: border-box;
        }
        .sw-input::placeholder {
            color: #9CA3AF;
            font-weight: 400;
        }
        .sw-input:focus {
            box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
        }
        .sw-btn {
            width: 100%;
            padding: 18px;
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
        }
        .sw-resend-link {
            color: #FCD34D;
            cursor: pointer;
            font-weight: 600;
        }
        
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
        }
        .sw-btn-spin:disabled {
            opacity: 0.7;
            cursor: not-allowed;
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
            margin-bottom: 20px;
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
        }
        
        .sw-hidden { display: none !important; }
        
        @media (max-width: 380px) {
            .sw-modal { max-width: 340px; }
            .sw-wheel-wrap { width: 250px; height: 250px; }
            .sw-otp-input { width: 40px; height: 50px; font-size: 20px; }
        }
    `;
    
    // ============================================
    // CREATE WHEEL IMAGE (SVG)
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
            
            // Label position
            const midAngle = ((i + 0.5) * angle - 90) * Math.PI / 180;
            const labelR = r * 0.65;
            const lx = cx + labelR * Math.cos(midAngle);
            const ly = cy + labelR * Math.sin(midAngle);
            const rotation = (i + 0.5) * angle;
            
            if (seg.isWin) {
                // Prize badge
                labels += `
                    <g transform="rotate(${rotation}, ${lx.toFixed(1)}, ${ly.toFixed(1)})">
                        <rect x="${(lx - 26).toFixed(1)}" y="${(ly - 11).toFixed(1)}" width="52" height="22" rx="11" fill="white" fill-opacity="0.95"/>
                        <text x="${lx.toFixed(1)}" y="${(ly + 1).toFixed(1)}" font-size="13" font-weight="800" fill="${seg.color}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">${seg.label}</text>
                    </g>
                `;
            } else {
                // Try Again text
                labels += `
                    <g transform="rotate(${rotation}, ${lx.toFixed(1)}, ${ly.toFixed(1)})">
                        <text x="${lx.toFixed(1)}" y="${(ly - 5).toFixed(1)}" font-size="9" font-weight="800" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">TRY</text>
                        <text x="${lx.toFixed(1)}" y="${(ly + 7).toFixed(1)}" font-size="9" font-weight="800" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">AGAIN</text>
                    </g>
                `;
            }
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
                        <!-- PHONE SECTION (vertical layout) -->
                        <div class="sw-phone" id="sw-phone">
                            <div class="sw-input-group">
                                <select class="sw-select" id="sw-country">
                                    <option value="+91">🇮🇳 India (+91)</option>
                                    <option value="+1">🇺🇸 USA (+1)</option>
                                    <option value="+44">🇬🇧 UK (+44)</option>
                                    <option value="+971">🇦🇪 UAE (+971)</option>
                                    <option value="+65">🇸🇬 Singapore (+65)</option>
                                    <option value="+61">🇦🇺 Australia (+61)</option>
                                </select>
                                <input type="tel" class="sw-input" id="sw-phone-input" placeholder="Enter 10-digit mobile number" maxlength="10">
                            </div>
                            <button class="sw-btn sw-btn-orange" id="sw-send-otp" disabled>Send OTP ✨</button>
                            <p class="sw-helper">We'll send a verification code to your phone</p>
                        </div>
                        
                        <!-- OTP SECTION -->
                        <div class="sw-otp sw-hidden" id="sw-otp">
                            <p class="sw-otp-label">Enter the 6-digit code sent to your phone</p>
                            <div class="sw-otp-boxes">
                                <input type="text" class="sw-otp-input" maxlength="1" data-i="0">
                                <input type="text" class="sw-otp-input" maxlength="1" data-i="1">
                                <input type="text" class="sw-otp-input" maxlength="1" data-i="2">
                                <input type="text" class="sw-otp-input" maxlength="1" data-i="3">
                                <input type="text" class="sw-otp-input" maxlength="1" data-i="4">
                                <input type="text" class="sw-otp-input" maxlength="1" data-i="5">
                            </div>
                            <button class="sw-btn sw-btn-green" id="sw-verify" disabled>Verify & Spin 🎰</button>
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
                                <p class="sw-result-text">Added to your wallet!</p>
                            </div>
                            <div id="sw-lose" class="sw-hidden">
                                <div class="sw-result-icon">😢</div>
                                <h3 class="sw-result-title">Better Luck Next Time!</h3>
                                <p class="sw-result-text">Don't worry, try again later!</p>
                            </div>
                            <button class="sw-btn-continue" id="sw-continue">Continue Shopping →</button>
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
    // EVENTS
    // ============================================
    function bindEvents() {
        // Close
        document.getElementById('sw-close').onclick = hide;
        
        // Phone input
        const phoneInput = document.getElementById('sw-phone-input');
        const sendBtn = document.getElementById('sw-send-otp');
        
        phoneInput.oninput = (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            sendBtn.disabled = e.target.value.length !== 10;
        };
        
        // Country select
        document.getElementById('sw-country').onchange = (e) => {
            selectedCountryCode = e.target.value;
        };
        
        // Send OTP
        sendBtn.onclick = handleSendOtp;
        
        // OTP inputs
        const otpInputs = document.querySelectorAll('.sw-otp-input');
        otpInputs.forEach((inp, i) => {
            inp.oninput = (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
                if (e.target.value && i < 5) otpInputs[i + 1].focus();
                checkOtp();
            };
            inp.onkeydown = (e) => {
                if (e.key === 'Backspace' && !e.target.value && i > 0) {
                    otpInputs[i - 1].focus();
                }
            };
            inp.onpaste = (e) => {
                e.preventDefault();
                const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                data.split('').forEach((c, j) => { if (otpInputs[j]) otpInputs[j].value = c; });
                checkOtp();
            };
        });
        
        // Verify
        document.getElementById('sw-verify').onclick = handleVerify;
        
        // Resend
        document.getElementById('sw-resend').onclick = () => {
            document.getElementById('sw-otp').classList.add('sw-hidden');
            document.getElementById('sw-phone').classList.remove('sw-hidden');
            sendBtn.textContent = 'Send OTP ✨';
            sendBtn.disabled = phoneInput.value.length !== 10;
        };
        
        // Spin
        document.getElementById('sw-spin').onclick = handleSpin;
        
        // Continue
        document.getElementById('sw-continue').onclick = hide;
    }
    
    function checkOtp() {
        const otp = Array.from(document.querySelectorAll('.sw-otp-input')).map(i => i.value).join('');
        document.getElementById('sw-verify').disabled = otp.length !== 6;
    }
    
    // ============================================
    // OTP HANDLERS
    // ============================================
    async function handleSendOtp() {
        const phone = document.getElementById('sw-phone-input').value;
        if (phone.length !== 10) return;
        
        userPhone = selectedCountryCode + phone;
        const btn = document.getElementById('sw-send-otp');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                if (!auth) auth = firebase.auth();
                if (!recaptchaVerifier) {
                    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sw-send-otp', { size: 'invisible' });
                }
                confirmationResult = await auth.signInWithPhoneNumber(userPhone, recaptchaVerifier);
                showOtpSection();
                toast('OTP sent!', 'success');
            } else {
                // Demo mode
                showOtpSection();
                toast('Demo: Enter any 6 digits', 'info');
            }
        } catch (err) {
            console.error(err);
            showOtpSection();
            toast('Demo: Enter any 6 digits', 'info');
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
            if (confirmationResult) {
                await confirmationResult.confirm(otp);
            }
            onVerified();
        } catch (err) {
            if (!confirmationResult) {
                onVerified(); // Demo mode
            } else {
                toast('Invalid OTP', 'error');
                btn.disabled = false;
                btn.textContent = 'Verify & Spin 🎰';
                document.querySelectorAll('.sw-otp-input').forEach(i => i.value = '');
                document.querySelector('.sw-otp-input').focus();
            }
        }
    }
    
    function onVerified() {
        if (typeof Store !== 'undefined' && Store.setUser) {
            Store.setUser({ phone: userPhone });
        }
        document.getElementById('sw-otp').classList.add('sw-hidden');
        document.getElementById('sw-wheel-section').classList.remove('sw-hidden');
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
        
        // Calculate result
        const won = Math.random() < 0.2; // 20% win chance
        let segmentIndex, amount = 0;
        
        if (won) {
            const winSegments = SEGMENTS.map((s, i) => ({ ...s, i })).filter(s => s.isWin);
            const weights = [0.5, 0.35, 0.1, 0.05];
            let r = Math.random(), cum = 0, sel = 0;
            for (let j = 0; j < weights.length; j++) {
                cum += weights[j];
                if (r <= cum) { sel = j; break; }
            }
            const seg = winSegments[sel % winSegments.length];
            segmentIndex = seg.i;
            amount = seg.value;
        } else {
            const loseSegments = SEGMENTS.map((s, i) => ({ ...s, i })).filter(s => !s.isWin);
            segmentIndex = loseSegments[Math.floor(Math.random() * loseSegments.length)].i;
        }
        
        // Calculate rotation
        const segAngle = 360 / SEGMENTS.length;
        const targetAngle = 360 - (segmentIndex * segAngle + segAngle / 2);
        const spins = 5 + Math.floor(Math.random() * 3);
        const totalRotation = spins * 360 + targetAngle;
        
        // Animate
        const wheel = document.getElementById('sw-wheel');
        wheel.style.transform = `rotate(${totalRotation}deg)`;
        
        setTimeout(() => showResult(won, amount), 4200);
    }
    
    function showResult(won, amount) {
        if (typeof Store !== 'undefined') {
            if (Store.markSpinCompleted) Store.markSpinCompleted();
            if (won && Store.addToWallet) Store.addToWallet(amount, 'Spin Wheel Reward');
        }
        if (typeof UI !== 'undefined' && UI.updateCartUI) UI.updateCartUI();
        
        document.getElementById('sw-wheel-section').classList.add('sw-hidden');
        document.getElementById('sw-result').classList.remove('sw-hidden');
        
        if (won) {
            document.getElementById('sw-amount').textContent = '₹' + amount;
            document.getElementById('sw-win').classList.remove('sw-hidden');
            document.getElementById('sw-lose').classList.add('sw-hidden');
            toast('You won ₹' + amount + '!', 'success');
        } else {
            document.getElementById('sw-win').classList.add('sw-hidden');
            document.getElementById('sw-lose').classList.remove('sw-hidden');
        }
        
        isSpinning = false;
    }
    
    // ============================================
    // VISIBILITY
    // ============================================
    function shouldShow() {
        if (typeof CONFIG !== 'undefined' && CONFIG.SPIN_WHEEL && !CONFIG.SPIN_WHEEL.ENABLED) return false;
        if (typeof Store !== 'undefined' && Store.hasUserSpun && Store.hasUserSpun()) return false;
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
    
    return { init, show, hide, shouldShow };
})();

window.SpinWheel = SpinWheel;
