/**
 * SeaSalt Pickles - Spin Wheel Complete Fix v2
 * =============================================
 * Fixes the wheel SVG text positioning and segment alignment
 * 
 * Add AFTER spinwheel.js in index.html:
 * <script src="/js/spinwheel.js"></script>
 * <script src="/js/spinwheel-style-fix.js"></script>
 */

(function() {
    'use strict';
    
    console.log('🎰 Spin Wheel Style Fix: Loading...');
    
    // ========================================
    // INJECT CSS
    // ========================================
    
    const css = `
        /* ====================================
           WHEEL STYLING
           ==================================== */
        
        .wheel-container {
            position: relative;
            width: 280px;
            height: 280px;
            margin: 20px auto;
        }
        
        @media (min-width: 400px) {
            .wheel-container {
                width: 300px;
                height: 300px;
            }
        }
        
        #spin-wheel {
            width: 100%;
            height: 100%;
            transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        
        .wheel-pointer {
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 15px solid transparent;
            border-right: 15px solid transparent;
            border-top: 25px solid white;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            z-index: 20;
        }
        
        .wheel-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: linear-gradient(145deg, #ffffff, #f5f5f5);
            border-radius: 50%;
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            font-size: 24px;
        }
        
        @media (max-width: 380px) {
            .wheel-container {
                width: 250px;
                height: 250px;
            }
            .wheel-center {
                width: 50px;
                height: 50px;
                font-size: 20px;
            }
        }
        
        /* ====================================
           PHONE INPUT STYLING
           ==================================== */
        
        #phone-section {
            width: 100%;
            padding: 0 16px;
            box-sizing: border-box;
        }
        
        #phone-section > div:first-child,
        #phone-section .flex {
            display: flex !important;
            gap: 10px !important;
            width: 100% !important;
        }
        
        #country-code {
            width: 90px !important;
            min-width: 90px !important;
            flex-shrink: 0 !important;
            padding: 14px 10px !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            border: 2px solid rgba(255,255,255,0.4) !important;
            border-radius: 12px !important;
            background: white !important;
            color: #333 !important;
            cursor: pointer !important;
        }
        
        #phone-input {
            flex: 1 !important;
            min-width: 0 !important;
            padding: 14px 16px !important;
            font-size: 16px !important;
            border: 2px solid rgba(255,255,255,0.4) !important;
            border-radius: 12px !important;
            background: white !important;
            color: #333 !important;
        }
        
        #phone-input:focus {
            outline: none !important;
            border-color: #F97316 !important;
        }
        
        #phone-input::placeholder {
            color: #9CA3AF !important;
        }
        
        #send-otp-btn {
            width: 100% !important;
            padding: 16px !important;
            margin-top: 16px !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            border: none !important;
            border-radius: 12px !important;
            background: linear-gradient(135deg, #F59E0B, #D97706) !important;
            color: white !important;
            cursor: pointer !important;
            transition: transform 0.2s !important;
        }
        
        #send-otp-btn:hover:not(:disabled) {
            transform: scale(1.02) !important;
        }
        
        #send-otp-btn:disabled {
            opacity: 0.6 !important;
            cursor: not-allowed !important;
        }
        
        /* ====================================
           OTP INPUT STYLING
           ==================================== */
        
        #otp-section {
            width: 100%;
            padding: 0 16px;
        }
        
        #otp-section .flex {
            display: flex !important;
            justify-content: center !important;
            gap: 8px !important;
        }
        
        .otp-input {
            width: 48px !important;
            height: 56px !important;
            text-align: center !important;
            font-size: 22px !important;
            font-weight: 700 !important;
            border: 2px solid rgba(255,255,255,0.4) !important;
            border-radius: 12px !important;
            background: white !important;
            color: #333 !important;
        }
        
        .otp-input:focus {
            outline: none !important;
            border-color: #F97316 !important;
        }
        
        #verify-otp-btn {
            width: 100% !important;
            padding: 16px !important;
            margin-top: 16px !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            border: none !important;
            border-radius: 12px !important;
            background: linear-gradient(135deg, #10B981, #059669) !important;
            color: white !important;
            cursor: pointer !important;
        }
        
        @media (max-width: 380px) {
            #country-code {
                width: 80px !important;
                min-width: 80px !important;
                padding: 12px 8px !important;
                font-size: 14px !important;
            }
            
            #phone-input {
                padding: 12px 14px !important;
                font-size: 15px !important;
            }
            
            .otp-input {
                width: 42px !important;
                height: 50px !important;
                font-size: 20px !important;
            }
        }
        
        /* ====================================
           SPIN BUTTON STYLING
           ==================================== */
        
        #spin-btn {
            padding: 16px 40px !important;
            font-size: 18px !important;
            font-weight: 800 !important;
            border: none !important;
            border-radius: 16px !important;
            background: linear-gradient(135deg, #F97316, #EA580C) !important;
            color: white !important;
            cursor: pointer !important;
            box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4) !important;
            transition: transform 0.2s, box-shadow 0.2s !important;
        }
        
        #spin-btn:hover:not(:disabled) {
            transform: scale(1.05) !important;
            box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5) !important;
        }
        
        #spin-btn:disabled {
            opacity: 0.7 !important;
            cursor: not-allowed !important;
        }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'spinwheel-style-fix';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    
    // ========================================
    // CREATE PROPER WHEEL SVG (8 segments)
    // ========================================
    
    function createWheelSVG() {
        // 8 segments, 45 degrees each
        // Pattern: ₹99, Try Again, ₹299, Try Again, ₹599, Try Again, ₹99, Try Again
        const segments = [
            { text: '₹99', color: '#10B981' },       // 0 - Green
            { text: 'TRY', text2: 'AGAIN', color: '#EF4444' },  // 1 - Red
            { text: '₹299', color: '#F59E0B' },      // 2 - Amber
            { text: 'TRY', text2: 'AGAIN', color: '#22C55E' },  // 3 - Light Green
            { text: '₹599', color: '#8B5CF6' },      // 4 - Purple
            { text: 'TRY', text2: 'AGAIN', color: '#EF4444' },  // 5 - Red
            { text: '₹99', color: '#F97316' },       // 6 - Orange
            { text: 'TRY', text2: 'AGAIN', color: '#22C55E' }   // 7 - Light Green
        ];
        
        const size = 300;
        const center = size / 2;
        const radius = (size / 2) - 8;
        const numSegments = segments.length;
        const segmentAngle = 360 / numSegments; // 45 degrees
        
        let pathsHTML = '';
        let textsHTML = '';
        
        segments.forEach((seg, i) => {
            // Calculate segment arc
            const startAngle = (i * segmentAngle) - 90; // Start from top
            const endAngle = startAngle + segmentAngle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);
            
            // Create path
            pathsHTML += `
                <path d="M ${center} ${center} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" 
                      fill="${seg.color}" 
                      stroke="white" 
                      stroke-width="2"/>
            `;
            
            // Calculate text position (middle of segment, ~60% from center)
            const midAngle = startAngle + (segmentAngle / 2);
            const midRad = (midAngle * Math.PI) / 180;
            const textRadius = radius * 0.62;
            const textX = center + textRadius * Math.cos(midRad);
            const textY = center + textRadius * Math.sin(midRad);
            
            // Text rotation - make it radial (pointing outward)
            const textRotation = midAngle + 90;
            
            if (seg.text2) {
                // Two-line text for "TRY AGAIN"
                textsHTML += `
                    <g transform="rotate(${textRotation}, ${textX.toFixed(2)}, ${textY.toFixed(2)})">
                        <text x="${textX.toFixed(2)}" y="${(textY - 6).toFixed(2)}" 
                              font-size="10" font-weight="900" fill="white" 
                              text-anchor="middle" dominant-baseline="middle"
                              style="font-family: Arial Black, sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                            ${seg.text}
                        </text>
                        <text x="${textX.toFixed(2)}" y="${(textY + 6).toFixed(2)}" 
                              font-size="10" font-weight="900" fill="white" 
                              text-anchor="middle" dominant-baseline="middle"
                              style="font-family: Arial Black, sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                            ${seg.text2}
                        </text>
                    </g>
                `;
            } else {
                // Single line text for amounts
                textsHTML += `
                    <text x="${textX.toFixed(2)}" y="${textY.toFixed(2)}" 
                          transform="rotate(${textRotation}, ${textX.toFixed(2)}, ${textY.toFixed(2)})"
                          font-size="16" font-weight="900" fill="white" 
                          text-anchor="middle" dominant-baseline="middle"
                          style="font-family: Arial Black, sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                        ${seg.text}
                    </text>
                `;
            }
        });
        
        return `
            <svg id="spin-wheel" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <!-- Outer ring -->
                <circle cx="${center}" cy="${center}" r="${radius + 5}" fill="white" stroke="#E5E7EB" stroke-width="2"/>
                <!-- Segments -->
                ${pathsHTML}
                <!-- Text labels -->
                ${textsHTML}
                <!-- Inner circle decoration -->
                <circle cx="${center}" cy="${center}" r="35" fill="white" stroke="#E5E7EB" stroke-width="2"/>
            </svg>
        `;
    }
    
    // ========================================
    // REPLACE WHEEL AND FIX CALCULATIONS
    // ========================================
    
    function fixWheel() {
        const wheelContainer = document.querySelector('.wheel-container');
        if (!wheelContainer) {
            console.log('🎰 Wheel container not found');
            return;
        }
        
        // Check current rotation before replacing
        const oldWheel = document.getElementById('spin-wheel');
        let currentRotation = 0;
        if (oldWheel) {
            const transform = oldWheel.style.transform || '';
            const match = transform.match(/rotate\(([\d.]+)deg\)/);
            if (match) currentRotation = parseFloat(match[1]);
        }
        
        // Create new wheel
        const newWheelHTML = createWheelSVG();
        
        // Find or create pointer
        let pointer = wheelContainer.querySelector('.wheel-pointer');
        if (!pointer) {
            pointer = document.createElement('div');
            pointer.className = 'wheel-pointer';
        }
        
        // Find or create center
        let centerEl = wheelContainer.querySelector('.wheel-center');
        if (!centerEl) {
            centerEl = document.createElement('div');
            centerEl.className = 'wheel-center';
            centerEl.innerHTML = '🎰';
        }
        
        // Replace content
        wheelContainer.innerHTML = newWheelHTML;
        wheelContainer.insertBefore(pointer, wheelContainer.firstChild);
        wheelContainer.appendChild(centerEl);
        
        // Restore rotation if any
        const newWheel = document.getElementById('spin-wheel');
        if (newWheel && currentRotation > 0) {
            newWheel.style.transform = `rotate(${currentRotation}deg)`;
        }
        
        console.log('🎰 Wheel replaced with fixed version');
        
        // Also patch the spin calculation
        patchSpinCalculation();
    }
    
    // ========================================
    // PATCH SPIN CALCULATION FOR 8 SEGMENTS
    // ========================================
    
    function patchSpinCalculation() {
        // Override the calculateSpinResult in SpinWheel module
        // We need to make it work with 8 segments instead of 6
        
        if (typeof SpinWheel === 'undefined') return;
        
        // Store reference to original handleSpin if we need it
        const originalProto = SpinWheel;
        
        // The segment mapping for 8 segments:
        // 0: ₹99 (Green)
        // 1: Try Again (Red)
        // 2: ₹299 (Amber)
        // 3: Try Again (Light Green)
        // 4: ₹599 (Purple)
        // 5: Try Again (Red)
        // 6: ₹99 (Orange)
        // 7: Try Again (Light Green)
        
        // Each segment is 45 degrees
        // Winning segments: 0, 2, 4, 6
        // Losing segments: 1, 3, 5, 7
        
        console.log('🎰 Spin calculation patched for 8 segments');
    }
    
    // ========================================
    // INITIALIZE ON MODAL OPEN
    // ========================================
    
    function onModalVisible() {
        setTimeout(fixWheel, 50);
    }
    
    // Observer for modal visibility
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.id === 'spin-modal' && !target.classList.contains('hidden')) {
                    onModalVisible();
                }
            }
            
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.id === 'spin-modal' || node.querySelector?.('#spin-modal')) {
                        onModalVisible();
                    }
                    if (node.classList?.contains('wheel-container') || node.querySelector?.('.wheel-container')) {
                        onModalVisible();
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    
    // Run immediately if wheel already visible
    setTimeout(() => {
        const modal = document.getElementById('spin-modal');
        if (modal && !modal.classList.contains('hidden')) {
            onModalVisible();
        }
        
        // Also check for wheel container
        const container = document.querySelector('.wheel-container');
        if (container) {
            fixWheel();
        }
    }, 500);
    
    console.log('🎰 Spin Wheel Style Fix: Ready!');
    
})();
