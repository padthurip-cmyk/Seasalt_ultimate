// =============================================
// SeaSalt Pickles — Spin Wheel v4
// With Name, Phone, and Country Selection
// Deploy to: Seasalt_ultimate → public/js/spinwheel.js
// =============================================

const SpinWheel = (function() {
    'use strict';

    const SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';

    // Wheel segments with rewards
    const segments = [
        { label: '₹50 OFF', value: 50, color: '#e67e22' },
        { label: '₹25 OFF', value: 25, color: '#f39c12' },
        { label: '₹100 OFF', value: 100, color: '#27ae60' },
        { label: '₹10 OFF', value: 10, color: '#3498db' },
        { label: 'FREE SHIPPING', value: 'free_ship', color: '#9b59b6' },
        { label: '₹75 OFF', value: 75, color: '#e74c3c' },
        { label: '₹15 OFF', value: 15, color: '#1abc9c' },
        { label: '₹200 OFF', value: 200, color: '#2ecc71' }
    ];

    let countries = [];
    let currentRotation = 0;
    let isSpinning = false;

    // Load countries from Supabase
    async function loadCountries() {
        try {
            const res = await fetch(SUPABASE_URL + '/rest/v1/countries?is_active=eq.true&order=sort_order', {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });
            countries = await res.json();
        } catch (e) {
            // Fallback countries
            countries = [
                { code: 'IN', name: 'India', currency_symbol: '₹' },
                { code: 'US', name: 'United States', currency_symbol: '$' },
                { code: 'GB', name: 'United Kingdom', currency_symbol: '£' },
                { code: 'AE', name: 'United Arab Emirates', currency_symbol: 'د.إ' },
                { code: 'SG', name: 'Singapore', currency_symbol: 'S$' }
            ];
        }
    }

    // Create modal HTML
    function createModal() {
        const overlay = document.createElement('div');
        overlay.id = 'spinWheelOverlay';
        overlay.innerHTML = `
            <style>
                #spinWheelOverlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.8);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                }
                .spin-modal {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 20px;
                    padding: 24px;
                    max-width: 400px;
                    width: 100%;
                    text-align: center;
                    color: #fff;
                    position: relative;
                    animation: spinModalIn 0.4s ease;
                }
                @keyframes spinModalIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .spin-close {
                    position: absolute;
                    top: 12px;
                    right: 16px;
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 1.5rem;
                    cursor: pointer;
                }
                .spin-close:hover { color: #fff; }
                .spin-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 8px;
                    background: linear-gradient(90deg, #f39c12, #e67e22);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .spin-subtitle {
                    color: #aaa;
                    font-size: 0.9rem;
                    margin-bottom: 20px;
                }
                .spin-form-group {
                    margin-bottom: 12px;
                    text-align: left;
                }
                .spin-label {
                    display: block;
                    font-size: 0.85rem;
                    color: #aaa;
                    margin-bottom: 4px;
                }
                .spin-input {
                    width: 100%;
                    padding: 12px 14px;
                    border: 2px solid #333;
                    border-radius: 10px;
                    background: #0d0d1a;
                    color: #fff;
                    font-size: 1rem;
                    transition: border-color 0.2s;
                }
                .spin-input:focus {
                    outline: none;
                    border-color: #e67e22;
                }
                .spin-input::placeholder {
                    color: #555;
                }
                .spin-phone-row {
                    display: flex;
                    gap: 8px;
                }
                .spin-country-code {
                    width: 90px;
                    flex-shrink: 0;
                }
                .spin-select {
                    width: 100%;
                    padding: 12px 14px;
                    border: 2px solid #333;
                    border-radius: 10px;
                    background: #0d0d1a;
                    color: #fff;
                    font-size: 1rem;
                    cursor: pointer;
                }
                .spin-select:focus {
                    outline: none;
                    border-color: #e67e22;
                }
                .spin-canvas-container {
                    position: relative;
                    margin: 20px auto;
                    width: 280px;
                    height: 280px;
                }
                #spinCanvas {
                    width: 100%;
                    height: 100%;
                }
                .spin-pointer {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 15px solid transparent;
                    border-right: 15px solid transparent;
                    border-top: 25px solid #e67e22;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                }
                .spin-btn {
                    background: linear-gradient(135deg, #e67e22, #d35400);
                    color: #fff;
                    border: none;
                    padding: 14px 32px;
                    border-radius: 30px;
                    font-size: 1.1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    width: 100%;
                    margin-top: 12px;
                }
                .spin-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(230, 126, 34, 0.4);
                }
                .spin-btn:disabled {
                    background: #555;
                    cursor: not-allowed;
                    transform: none;
                }
                .spin-error {
                    color: #e74c3c;
                    font-size: 0.85rem;
                    margin-top: 8px;
                }
                .spin-result {
                    display: none;
                    padding: 20px;
                }
                .spin-result-icon {
                    font-size: 4rem;
                    margin-bottom: 12px;
                }
                .spin-result-text {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #2ecc71;
                    margin-bottom: 8px;
                }
                .spin-result-desc {
                    color: #aaa;
                    font-size: 0.95rem;
                    margin-bottom: 16px;
                }
                .spin-wallet-badge {
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    padding: 12px 20px;
                    border-radius: 12px;
                    display: inline-block;
                    margin-bottom: 16px;
                }
                .spin-wallet-label {
                    font-size: 0.8rem;
                    color: rgba(255,255,255,0.8);
                }
                .spin-wallet-amount {
                    font-size: 1.5rem;
                    font-weight: 700;
                }
                .spin-step { display: none; }
                .spin-step.active { display: block; }
            </style>
            <div class="spin-modal">
                <button class="spin-close" onclick="SpinWheel.close()">&times;</button>
                
                <!-- Step 1: User Info -->
                <div class="spin-step active" id="spinStep1">
                    <div class="spin-title">🎰 Spin & Win!</div>
                    <div class="spin-subtitle">Enter your details to spin the wheel</div>
                    
                    <div class="spin-form-group">
                        <label class="spin-label">Your Name</label>
                        <input type="text" id="spinName" class="spin-input" placeholder="Enter your name">
                    </div>
                    
                    <div class="spin-form-group">
                        <label class="spin-label">Country</label>
                        <select id="spinCountry" class="spin-select">
                            <option value="">Select your country</option>
                        </select>
                    </div>
                    
                    <div class="spin-form-group">
                        <label class="spin-label">Phone Number</label>
                        <div class="spin-phone-row">
                            <input type="text" id="spinCountryCode" class="spin-input spin-country-code" value="+91" readonly>
                            <input type="tel" id="spinPhone" class="spin-input" placeholder="9876543210" maxlength="10">
                        </div>
                    </div>
                    
                    <div id="spinError" class="spin-error"></div>
                    <button class="spin-btn" id="spinContinueBtn">Continue to Spin →</button>
                </div>
                
                <!-- Step 2: Wheel -->
                <div class="spin-step" id="spinStep2">
                    <div class="spin-title">🎰 Spin to Win!</div>
                    <div class="spin-subtitle">Tap the wheel to spin</div>
                    
                    <div class="spin-canvas-container">
                        <div class="spin-pointer"></div>
                        <canvas id="spinCanvas" width="280" height="280"></canvas>
                    </div>
                    
                    <button class="spin-btn" id="spinWheelBtn">🎲 SPIN NOW!</button>
                </div>
                
                <!-- Step 3: Result -->
                <div class="spin-step" id="spinStep3">
                    <div class="spin-result-icon">🎉</div>
                    <div class="spin-result-text" id="spinResultText">You Won!</div>
                    <div class="spin-result-desc" id="spinResultDesc">Added to your wallet</div>
                    <div class="spin-wallet-badge">
                        <div class="spin-wallet-label">Your Wallet Balance</div>
                        <div class="spin-wallet-amount" id="spinWalletAmount">₹0</div>
                    </div>
                    <button class="spin-btn" onclick="SpinWheel.close()">🛒 Start Shopping!</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Populate countries dropdown
        populateCountries();
        
        // Draw wheel
        drawWheel();
        
        // Event listeners
        document.getElementById('spinCountry').addEventListener('change', updateCountryCode);
        document.getElementById('spinContinueBtn').addEventListener('click', goToStep2);
        document.getElementById('spinWheelBtn').addEventListener('click', spin);
        document.getElementById('spinPhone').addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });
    }

    function populateCountries() {
        const select = document.getElementById('spinCountry');
        countries.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = c.name;
            opt.dataset.phone = getCountryPhoneCode(c.code);
            select.appendChild(opt);
        });
        // Default to India
        select.value = 'IN';
        updateCountryCode();
    }

    function getCountryPhoneCode(code) {
        const codes = {
            'IN': '+91', 'US': '+1', 'GB': '+44', 'AE': '+971', 'SG': '+65',
            'AU': '+61', 'CA': '+1', 'DE': '+49', 'FR': '+33', 'SA': '+966',
            'QA': '+974', 'KW': '+965', 'OM': '+968', 'MY': '+60', 'NZ': '+64'
        };
        return codes[code] || '+91';
    }

    function updateCountryCode() {
        const select = document.getElementById('spinCountry');
        const selected = select.options[select.selectedIndex];
        const phoneCode = selected ? (selected.dataset.phone || '+91') : '+91';
        document.getElementById('spinCountryCode').value = phoneCode;
    }

    function goToStep2() {
        const name = document.getElementById('spinName').value.trim();
        const country = document.getElementById('spinCountry').value;
        const phone = document.getElementById('spinPhone').value.trim();
        const errorEl = document.getElementById('spinError');
        
        if (!name) {
            errorEl.textContent = 'Please enter your name';
            return;
        }
        if (!country) {
            errorEl.textContent = 'Please select your country';
            return;
        }
        if (!phone || phone.length < 10) {
            errorEl.textContent = 'Please enter a valid phone number';
            return;
        }
        
        errorEl.textContent = '';
        
        // Save user data
        const countryCode = document.getElementById('spinCountryCode').value;
        const fullPhone = countryCode + phone;
        const countryName = document.getElementById('spinCountry').options[document.getElementById('spinCountry').selectedIndex].textContent;
        
        localStorage.setItem('seasalt_user', JSON.stringify({
            name: name,
            phone: fullPhone,
            country: countryName,
            countryCode: country
        }));
        
        // Show step 2
        document.getElementById('spinStep1').classList.remove('active');
        document.getElementById('spinStep2').classList.add('active');
    }

    function drawWheel() {
        const canvas = document.getElementById('spinCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        const segmentAngle = (2 * Math.PI) / segments.length;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(currentRotation * Math.PI / 180);
        ctx.translate(-centerX, -centerY);
        
        segments.forEach((seg, i) => {
            const startAngle = i * segmentAngle - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;
            
            // Draw segment
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = seg.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(seg.label, radius - 15, 4);
            ctx.restore();
        });
        
        ctx.restore();
        
        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    function spin() {
        if (isSpinning) return;
        isSpinning = true;
        
        const btn = document.getElementById('spinWheelBtn');
        btn.disabled = true;
        btn.textContent = 'Spinning...';
        
        // Random result
        const winIndex = Math.floor(Math.random() * segments.length);
        const segmentAngle = 360 / segments.length;
        
        // Calculate rotation (5-8 full spins + landing on segment)
        const spins = 5 + Math.random() * 3;
        const targetAngle = 360 * spins + (segments.length - winIndex - 0.5) * segmentAngle;
        
        let startTime = null;
        const duration = 5000; // 5 seconds
        
        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            currentRotation = easeOut * targetAngle;
            
            drawWheel();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Spin complete
                isSpinning = false;
                showResult(segments[winIndex]);
            }
        }
        
        requestAnimationFrame(animate);
    }

    async function showResult(segment) {
        const user = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
        
        // Calculate wallet amount
        let walletAmount = 0;
        let resultText = '';
        let resultDesc = '';
        
        if (segment.value === 'free_ship') {
            resultText = '🚚 Free Shipping!';
            resultDesc = 'Your next order ships free!';
            walletAmount = 0;
            localStorage.setItem('seasalt_free_shipping', 'true');
        } else {
            walletAmount = segment.value;
            resultText = '₹' + walletAmount + ' OFF!';
            resultDesc = 'Added to your wallet!';
        }
        
        // Update wallet
        const currentWallet = parseFloat(localStorage.getItem('seasalt_wallet') || '0');
        const newWallet = currentWallet + walletAmount;
        localStorage.setItem('seasalt_wallet', newWallet.toString());
        
        // Save to Supabase
        try {
            // Update or create user
            const checkRes = await fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(user.phone), {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            });
            const existingUsers = await checkRes.json();
            
            if (existingUsers && existingUsers.length > 0) {
                // Update existing user
                await fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(user.phone), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        name: user.name,
                        selected_country: user.country,
                        wallet_balance: newWallet,
                        last_seen: new Date().toISOString()
                    })
                });
            } else {
                // Create new user
                await fetch(SUPABASE_URL + '/rest/v1/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        phone: user.phone,
                        name: user.name,
                        selected_country: user.country,
                        wallet_balance: walletAmount,
                        total_visits: 1
                    })
                });
            }
            
            // Record wallet transaction
            await fetch(SUPABASE_URL + '/rest/v1/wallet_transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    user_phone: user.phone,
                    amount: walletAmount,
                    type: 'spin_reward',
                    description: 'Spin wheel reward: ' + segment.label,
                    balance_after: newWallet
                })
            });
            
            // Track in analytics
            if (typeof Analytics !== 'undefined' && Analytics.trackSpinWheel) {
                Analytics.trackSpinWheel(segment.label);
            }
        } catch (e) {
            console.warn('Failed to save spin result:', e);
        }
        
        // Show result
        document.getElementById('spinResultText').textContent = resultText;
        document.getElementById('spinResultDesc').textContent = resultDesc;
        document.getElementById('spinWalletAmount').textContent = '₹' + newWallet;
        
        document.getElementById('spinStep2').classList.remove('active');
        document.getElementById('spinStep3').classList.add('active');
        
        // Trigger wallet update event
        window.dispatchEvent(new CustomEvent('walletUpdated', { detail: { balance: newWallet } }));
    }

    function show() {
        // Check if already spun
        if (localStorage.getItem('seasalt_spin_done')) {
            // User already spun, show welcome back message
            showWelcomeBack();
            return;
        }
        
        // Load countries then show
        loadCountries().then(() => {
            createModal();
        });
    }

    function showWelcomeBack() {
        const user = JSON.parse(localStorage.getItem('seasalt_user') || '{}');
        const wallet = localStorage.getItem('seasalt_wallet') || '0';
        
        if (!user.name) return; // No user saved
        
        // Show simple welcome toast
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:16px 24px;border-radius:12px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.3);text-align:center;animation:slideDown 0.5s ease;';
        toast.innerHTML = `
            <div style="font-size:1.2rem;margin-bottom:4px;">👋 Welcome back, ${user.name}!</div>
            <div style="font-size:0.9rem;color:#aaa;">Wallet: <strong style="color:#2ecc71;">₹${wallet}</strong></div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    function close() {
        const overlay = document.getElementById('spinWheelOverlay');
        if (overlay) {
            localStorage.setItem('seasalt_spin_done', 'true');
            overlay.remove();
        }
    }

    function showForNewVisitor() {
        // Auto-show for new visitors after 3 seconds
        if (!localStorage.getItem('seasalt_spin_done') && !localStorage.getItem('seasalt_user')) {
            setTimeout(show, 3000);
        } else if (localStorage.getItem('seasalt_user')) {
            // Show welcome back for returning users
            setTimeout(showWelcomeBack, 1000);
        }
    }

    return {
        show: show,
        close: close,
        showForNewVisitor: showForNewVisitor
    };
})();

// Auto-show for new visitors
document.addEventListener('DOMContentLoaded', function() {
    SpinWheel.showForNewVisitor();
});

// Add slide animations
(function() {
    const style = document.createElement('style');
    style.textContent = '@keyframes slideDown{from{transform:translateX(-50%) translateY(-100px);opacity:0;}to{transform:translateX(-50%) translateY(0);opacity:1;}}@keyframes slideUp{from{transform:translateX(-50%) translateY(0);opacity:1;}to{transform:translateX(-50%) translateY(-100px);opacity:0;}}';
    document.head.appendChild(style);
})();
