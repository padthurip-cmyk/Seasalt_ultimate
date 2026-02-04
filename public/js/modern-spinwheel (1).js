/**
 * SeaSalt Pickles - Modern Spin Wheel
 * ====================================
 * A completely new wheel design with readable text
 * 
 * Replace your spinwheel-style-fix.js with this file
 * Add AFTER spinwheel.js in index.html
 */

(function() {
    'use strict';
    
    console.log('🎰 Modern Spin Wheel: Loading...');
    
    // ========================================
    // INJECT CSS
    // ========================================
    
    const css = `
        /* ====================================
           MODERN WHEEL CONTAINER
           ==================================== */
        
        .wheel-container {
            position: relative;
            width: 300px;
            height: 300px;
            margin: 20px auto;
        }
        
        @media (max-width: 400px) {
            .wheel-container {
                width: 270px;
                height: 270px;
            }
        }
        
        #spin-wheel {
            width: 100%;
            height: 100%;
            transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
        }
        
        /* Pointer at top */
        .wheel-pointer {
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 20;
        }
        
        .wheel-pointer svg {
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
        }
        
        /* Center piece */
        .wheel-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70px;
            height: 70px;
            background: linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%);
            border-radius: 50%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 15;
            font-size: 28px;
            border: 3px solid #E5E7EB;
        }
        
        @media (max-width: 400px) {
            .wheel-center {
                width: 60px;
                height: 60px;
                font-size: 24px;
            }
        }
        
        /* ====================================
           PHONE INPUT STYLES
           ==================================== */
        
        #phone-section {
            width: 100%;
            max-width: 340px;
            margin: 0 auto;
            padding: 0 16px;
            box-sizing: border-box;
        }
        
        #phone-section > div:first-child {
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
            border: 2px solid rgba(255,255,255,0.5) !important;
            border-radius: 12px !important;
            background: white !important;
            color: #333 !important;
        }
        
        #phone-input {
            flex: 1 !important;
            min-width: 0 !important;
            padding: 14px 16px !important;
            font-size: 16px !important;
            border: 2px solid rgba(255,255,255,0.5) !important;
            border-radius: 12px !important;
            background: white !important;
            color: #333 !important;
        }
        
        #phone-input:focus {
            outline: none !important;
            border-color: white !important;
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
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4) !important;
        }
        
        #send-otp-btn:disabled {
            opacity: 0.6 !important;
            cursor: not-allowed !important;
        }
        
        /* ====================================
           OTP INPUT STYLES
           ==================================== */
        
        #otp-section {
            width: 100%;
            max-width: 340px;
            margin: 0 auto;
            padding: 0 16px;
        }
        
        #otp-section .flex {
            display: flex !important;
            justify-content: center !important;
            gap: 10px !important;
        }
        
        .otp-input {
            width: 50px !important;
            height: 58px !important;
            text-align: center !important;
            font-size: 24px !important;
            font-weight: 700 !important;
            border: 2px solid rgba(255,255,255,0.5) !important;
            border-radius: 12px !important;
            background: white !important;
            color: #333 !important;
        }
        
        .otp-input:focus {
            outline: none !important;
            border-color: white !important;
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
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4) !important;
        }
        
        /* ====================================
           SPIN BUTTON
           ==================================== */
        
        #spin-btn {
            padding: 18px 50px !important;
            font-size: 20px !important;
            font-weight: 800 !important;
            border: none !important;
            border-radius: 16px !important;
            background: linear-gradient(135deg, #F97316, #EA580C) !important;
            color: white !important;
            cursor: pointer !important;
            box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5) !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
        }
        
        #spin-btn:hover:not(:disabled) {
            transform: scale(1.05) !important;
        }
        
        #spin-btn:disabled {
            opacity: 0.7 !important;
        }
        
        @media (max-width: 400px) {
            #country-code {
                width: 80px !important;
                min-width: 80px !important;
                padding: 12px 8px !important;
            }
            
            .otp-input {
                width: 44px !important;
                height: 52px !important;
                font-size: 20px !important;
            }
        }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'modern-wheel-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    
    // ========================================
    // NEW WHEEL DESIGN - BADGES ON SEGMENTS
    // ========================================
    
    function createModernWheel() {
        const size = 300;
        const center = size / 2;
        const radius = (size / 2) - 10;
        
        // 8 segments with colors
        const segments = [
            { value: '₹99', color: '#10B981', isWin: true },      // 0 - Emerald
            { value: 'TRY AGAIN', color: '#EF4444', isWin: false }, // 1 - Red
            { value: '₹299', color: '#F59E0B', isWin: true },     // 2 - Amber
            { value: 'TRY AGAIN', color: '#22C55E', isWin: false }, // 3 - Green
            { value: '₹599', color: '#8B5CF6', isWin: true },     // 4 - Purple
            { value: 'TRY AGAIN', color: '#EF4444', isWin: false }, // 5 - Red
            { value: '₹99', color: '#F97316', isWin: true },      // 6 - Orange
            { value: 'TRY AGAIN', color: '#22C55E', isWin: false }  // 7 - Green
        ];
        
        const numSegments = segments.length;
        const segmentAngle = 360 / numSegments; // 45 degrees
        
        let pathsHTML = '';
        let labelsHTML = '';
        
        segments.forEach((seg, i) => {
            const startAngle = (i * segmentAngle) - 90;
            const endAngle = startAngle + segmentAngle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);
            
            // Segment path
            pathsHTML += `
                <path d="M ${center} ${center} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" 
                      fill="${seg.color}"/>
            `;
            
            // Calculate label position
            const midAngle = startAngle + (segmentAngle / 2);
            const midRad = (midAngle * Math.PI) / 180;
            const labelRadius = radius * 0.65;
            const labelX = center + labelRadius * Math.cos(midRad);
            const labelY = center + labelRadius * Math.sin(midRad);
            
            // Create badge/label for each segment
            if (seg.isWin) {
                // Prize badge - pill shape with white background
                labelsHTML += `
                    <g transform="rotate(${midAngle + 90}, ${labelX.toFixed(1)}, ${labelY.toFixed(1)})">
                        <rect x="${(labelX - 28).toFixed(1)}" y="${(labelY - 12).toFixed(1)}" 
                              width="56" height="24" rx="12" 
                              fill="white" opacity="0.95"/>
                        <text x="${labelX.toFixed(1)}" y="${(labelY + 1).toFixed(1)}" 
                              font-size="14" font-weight="800" fill="${seg.color}" 
                              text-anchor="middle" dominant-baseline="middle"
                              style="font-family: Arial, sans-serif;">
                            ${seg.value}
                        </text>
                    </g>
                `;
            } else {
                // "Try Again" - just white text, two lines
                labelsHTML += `
                    <g transform="rotate(${midAngle + 90}, ${labelX.toFixed(1)}, ${labelY.toFixed(1)})">
                        <text x="${labelX.toFixed(1)}" y="${(labelY - 5).toFixed(1)}" 
                              font-size="9" font-weight="800" fill="white" 
                              text-anchor="middle" dominant-baseline="middle"
                              style="font-family: Arial, sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                            TRY
                        </text>
                        <text x="${labelX.toFixed(1)}" y="${(labelY + 7).toFixed(1)}" 
                              font-size="9" font-weight="800" fill="white" 
                              text-anchor="middle" dominant-baseline="middle"
                              style="font-family: Arial, sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                            AGAIN
                        </text>
                    </g>
                `;
            }
        });
        
        // Create pointer SVG
        const pointerSVG = `
            <svg width="40" height="35" viewBox="0 0 40 35">
                <polygon points="20,35 0,0 40,0" fill="white" stroke="#E5E7EB" stroke-width="2"/>
                <polygon points="20,28 6,5 34,5" fill="#F97316"/>
            </svg>
        `;
        
        return {
            wheel: `
                <svg id="spin-wheel" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                    <!-- Outer decorative ring -->
                    <circle cx="${center}" cy="${center}" r="${radius + 8}" fill="white" stroke="#E5E7EB" stroke-width="2"/>
                    
                    <!-- Segments -->
                    <g>
                        ${pathsHTML}
                    </g>
                    
                    <!-- Segment dividers -->
                    ${Array.from({length: numSegments}, (_, i) => {
                        const angle = (i * segmentAngle - 90) * Math.PI / 180;
                        const x = center + radius * Math.cos(angle);
                        const y = center + radius * Math.sin(angle);
                        return `<line x1="${center}" y1="${center}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="white" stroke-width="2"/>`;
                    }).join('')}
                    
                    <!-- Labels -->
                    ${labelsHTML}
                    
                    <!-- Center decoration ring -->
                    <circle cx="${center}" cy="${center}" r="38" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                </svg>
            `,
            pointer: pointerSVG
        };
    }
    
    // ========================================
    // REPLACE WHEEL
    // ========================================
    
    function replaceWheel() {
        const container = document.querySelector('.wheel-container');
        if (!container) {
            console.log('🎰 Container not found');
            return;
        }
        
        // Get current rotation
        const oldWheel = document.getElementById('spin-wheel');
        let currentRotation = 0;
        if (oldWheel) {
            const match = (oldWheel.style.transform || '').match(/rotate\(([\d.]+)deg\)/);
            if (match) currentRotation = parseFloat(match[1]);
        }
        
        // Create new wheel
        const { wheel, pointer } = createModernWheel();
        
        // Clear container
        container.innerHTML = '';
        
        // Add pointer
        const pointerDiv = document.createElement('div');
        pointerDiv.className = 'wheel-pointer';
        pointerDiv.innerHTML = pointer;
        container.appendChild(pointerDiv);
        
        // Add wheel
        container.insertAdjacentHTML('beforeend', wheel);
        
        // Add center
        const centerDiv = document.createElement('div');
        centerDiv.className = 'wheel-center';
        centerDiv.innerHTML = '🎰';
        container.appendChild(centerDiv);
        
        // Restore rotation
        const newWheel = document.getElementById('spin-wheel');
        if (newWheel && currentRotation > 0) {
            newWheel.style.transform = `rotate(${currentRotation}deg)`;
        }
        
        console.log('🎰 Modern wheel created!');
    }
    
    // ========================================
    // WATCH FOR MODAL
    // ========================================
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Check class changes
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (mutation.target.id === 'spin-modal' && !mutation.target.classList.contains('hidden')) {
                    setTimeout(replaceWheel, 50);
                }
            }
            
            // Check added nodes
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.id === 'spin-modal' || node.querySelector?.('#spin-modal') ||
                        node.classList?.contains('wheel-container') || node.querySelector?.('.wheel-container')) {
                        setTimeout(replaceWheel, 50);
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
    
    // Initial check
    setTimeout(() => {
        const modal = document.getElementById('spin-modal');
        const container = document.querySelector('.wheel-container');
        
        if ((modal && !modal.classList.contains('hidden')) || container) {
            replaceWheel();
        }
    }, 500);
    
    console.log('🎰 Modern Spin Wheel: Ready!');
    
})();
