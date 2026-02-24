/**
 * SeaSalt Pickles - Spin Wheel v18 (Enhanced UX + Brand Theme)
 * =============================================================
 * CHANGES FROM v17.2:
 * - Brand-matched colors (Outfit font, pickle palette)
 * - Different colors per prize amount on wheel
 * - Longer, more exciting initial spin (3s fast → slowdown → ask details)
 * - Confetti + balloons celebration on result reveal
 * - Smooth step transitions
 * - show() fully resets modal for re-login
 * All business logic (OTP, test numbers, wallet, Supabase) unchanged.
 */
(function() {
    'use strict';

    console.log('[SpinWheel] v18 loaded');

    var SUPABASE_URL = 'https://yosjbsncvghpscsrvxds.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    var SPIN_WALLET_KEY = 'seasalt_spin_wallet';

    var modal = null;
    var confirmationResult = null;
    var userPhone = null;
    var userName = null;
    var selectedCountryCode = '+91';
    var userCountry = 'India';
    var auth = null;
    var recaptchaVerifier = null;
    var recaptchaRendered = false;
    var wonAmount = 0;
    var wonSegmentIndex = 0;
    var resendInterval = null;

    /* ═══════════ DYNAMIC CONFIG ═══════════ */
    var ADMIN_CONFIG = {
        wallet_expiry_hours: 48,
        cooldown_days: 30,
        popup_delay_seconds: 1,
        is_active: true
    };

    /* ═══════════ BRAND COLORS PER AMOUNT ═══════════ */
    var AMOUNT_COLORS = {
        99:  { bg: '#2E7D32', text: '#fff', glow: '#4CAF50' },   // Leaf green
        199: { bg: '#D4451A', text: '#fff', glow: '#F97316' },   // Pickle orange (brand)
        399: { bg: '#7B2D8E', text: '#fff', glow: '#A855F7' },   // Royal purple
        599: { bg: '#DAA520', text: '#fff', glow: '#F4C430' }    // Spice gold
    };
    function getAmountColor(val) {
        return AMOUNT_COLORS[val] || { bg: '#D4451A', text: '#fff', glow: '#F97316' };
    }

    /* Default segments */
    var SEGMENTS = [
        { label: '\u20B999',  value: 99,  color: '#2E7D32' },
        { label: '\u20B9199', value: 199, color: '#D4451A' },
        { label: '\u20B9399', value: 399, color: '#7B2D8E' },
        { label: '\u20B9199', value: 199, color: '#C2410C' },
        { label: '\u20B9599', value: 599, color: '#DAA520' },
        { label: '\u20B9199', value: 199, color: '#E53935' },
        { label: '\u20B999',  value: 99,  color: '#1B5E20' },
        { label: '\u20B9199', value: 199, color: '#9A3412' }
    ];

    var PRIZES = [
        { value: 99,  weight: 20, segments: [0, 6] },
        { value: 199, weight: 50, segments: [1, 3, 5, 7] },
        { value: 399, weight: 20, segments: [2] },
        { value: 599, weight: 10, segments: [4] }
    ];

    /* ═══════════ FETCH CONFIG FROM SUPABASE ═══════════ */
    function fetchAdminConfig() {
        return fetch(SUPABASE_URL + '/rest/v1/spinwheel_config?id=eq.1&select=*', {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).then(function(r) { return r.json(); }).then(function(rows) {
            if (!rows || !rows.length || !rows[0]) {
                console.log('[SpinWheel] v18 — No admin config found, using defaults');
                return;
            }
            var cfg = rows[0];
            if (cfg.wallet_expiry_hours) ADMIN_CONFIG.wallet_expiry_hours = cfg.wallet_expiry_hours;
            if (cfg.cooldown_days) ADMIN_CONFIG.cooldown_days = cfg.cooldown_days;
            if (cfg.popup_delay_seconds !== undefined) ADMIN_CONFIG.popup_delay_seconds = cfg.popup_delay_seconds;
            if (cfg.is_active !== undefined) ADMIN_CONFIG.is_active = cfg.is_active;
            if (cfg.prizes && Array.isArray(cfg.prizes) && cfg.prizes.length > 0) {
                rebuildSegmentsFromAdmin(cfg.prizes);
            }
            console.log('[SpinWheel] v18 — Admin config loaded:', ADMIN_CONFIG.wallet_expiry_hours + 'h expiry,',
                ADMIN_CONFIG.cooldown_days + 'd cooldown,', PRIZES.length, 'prize tiers,', SEGMENTS.length, 'segments');
        }).catch(function(e) {
            console.log('[SpinWheel] v18 — Config fetch failed, using defaults:', e.message || e);
        });
    }

    function rebuildSegmentsFromAdmin(adminPrizes) {
        var TOTAL_SEGMENTS = 8;
        var totalProb = 0;
        for (var i = 0; i < adminPrizes.length; i++) totalProb += (adminPrizes[i].probability || 0);
        if (totalProb === 0) return;
        var segCounts = [], assigned = 0;
        for (var i = 0; i < adminPrizes.length; i++) {
            var count = Math.max(1, Math.round((adminPrizes[i].probability / totalProb) * TOTAL_SEGMENTS));
            segCounts.push(count); assigned += count;
        }
        while (assigned > TOTAL_SEGMENTS) {
            var maxIdx = 0;
            for (var i = 1; i < segCounts.length; i++) { if (segCounts[i] > segCounts[maxIdx]) maxIdx = i; }
            if (segCounts[maxIdx] > 1) { segCounts[maxIdx]--; assigned--; } else break;
        }
        while (assigned < TOTAL_SEGMENTS) {
            var maxIdx = 0;
            for (var i = 1; i < adminPrizes.length; i++) { if (adminPrizes[i].probability > adminPrizes[maxIdx].probability) maxIdx = i; }
            segCounts[maxIdx]++; assigned++;
        }
        // Use brand-matched colors per amount
        var colorVariants = {
            99: ['#2E7D32','#1B5E20'], 199: ['#D4451A','#C2410C','#E53935','#9A3412'],
            399: ['#7B2D8E','#6D28D9'], 599: ['#DAA520','#B8860B']
        };
        var newSegments = [], newPrizes = [], segIdx = 0;
        for (var i = 0; i < adminPrizes.length; i++) {
            var p = adminPrizes[i], segs = [];
            var cv = colorVariants[p.amount] || ['#D4451A','#C2410C'];
            for (var j = 0; j < segCounts[i]; j++) {
                newSegments.push({
                    label: p.label || ('\u20B9' + p.amount),
                    value: p.amount,
                    color: p.color || cv[j % cv.length]
                });
                segs.push(segIdx); segIdx++;
            }
            newPrizes.push({ value: p.amount, weight: p.probability, segments: segs });
        }
        SEGMENTS = newSegments; PRIZES = newPrizes;
    }

    /* ═══════════ STYLES (Brand-matched) ═══════════ */
    var STYLES =
        /* Overlay & Modal */
        '.sw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;visibility:hidden;transition:all .35s ease}' +
        '.sw-overlay.active{opacity:1;visibility:visible}' +
        '.sw-modal{background:linear-gradient(160deg,#D4451A 0%,#9A3412 50%,#7C2D12 100%);border-radius:28px;width:100%;max-width:370px;max-height:92vh;overflow-y:auto;position:relative;transform:scale(.85) translateY(30px);transition:transform .4s cubic-bezier(.34,1.56,.64,1);box-shadow:0 25px 80px rgba(212,69,26,.4),0 0 0 1px rgba(255,255,255,.1) inset;font-family:Outfit,sans-serif}' +
        '.sw-overlay.active .sw-modal{transform:scale(1) translateY(0)}' +
        /* Close button */
        '.sw-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:16px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;transition:all .2s}.sw-close:hover{background:rgba(255,255,255,.3);transform:scale(1.1)}' +
        /* Header */
        '.sw-header{text-align:center;padding:30px 20px 16px}' +
        '.sw-badge{display:inline-block;background:linear-gradient(135deg,#F4C430,#DAA520);color:#7C2D12;padding:6px 16px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;box-shadow:0 2px 8px rgba(218,165,32,.4)}' +
        '.sw-title{font-family:"Playfair Display",serif;font-size:28px;font-weight:700;color:#fff;margin:0 0 6px;text-shadow:0 2px 8px rgba(0,0,0,.2)}' +
        '.sw-subtitle{font-size:14px;color:rgba(255,255,255,.85);margin:0;font-weight:400}' +
        '.sw-content{padding:0 24px 28px}.sw-hidden{display:none!important}' +
        /* Step transitions */
        '.sw-step-animate{animation:sw-step-in .4s ease-out}' +
        '@keyframes sw-step-in{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}' +
        /* Wheel */
        '.sw-wheel-section{display:flex;flex-direction:column;align-items:center;gap:20px}' +
        '.sw-wheel-wrap{position:relative;width:280px;height:280px}' +
        '.sw-pointer{position:absolute;top:-8px;left:50%;transform:translateX(-50%);z-index:10;filter:drop-shadow(0 4px 8px rgba(0,0,0,.3))}' +
        '.sw-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;background:linear-gradient(180deg,#fff,#f0f0f0);border-radius:50%;border:3px solid #DAA520;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 20px rgba(0,0,0,.25),0 0 0 3px rgba(218,165,32,.3);z-index:5}' +
        '.sw-btn-spin{padding:16px 44px;background:linear-gradient(135deg,#F4C430,#DAA520);color:#7C2D12;border:none;border-radius:16px;font-size:18px;font-weight:800;cursor:pointer;box-shadow:0 6px 24px rgba(218,165,32,.5);text-transform:uppercase;transition:all .2s;font-family:Outfit,sans-serif;letter-spacing:.5px}.sw-btn-spin:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(218,165,32,.6)}.sw-btn-spin:disabled{opacity:.7;cursor:not-allowed;transform:none}' +
        /* Spin animations */
        '.sw-spinning{animation:sw-spin-fast .4s linear infinite}' +
        '@keyframes sw-spin-fast{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
        '.sw-spin-slow{animation:sw-spin-slow 1.5s linear infinite}' +
        '@keyframes sw-spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
        '.sw-final-spin{transition:transform 4.5s cubic-bezier(.15,.7,.08,1)}' +
        /* Claim form */
        '.sw-claim{display:flex;flex-direction:column;gap:12px}' +
        '.sw-guaranteed{background:rgba(244,196,48,.12);border:1px solid rgba(244,196,48,.35);border-radius:14px;padding:14px;text-align:center;margin-bottom:8px}.sw-guaranteed-text{color:#F4C430;font-size:15px;font-weight:700}' +
        '.sw-input-group{display:flex;flex-direction:column;gap:4px}.sw-label{font-size:13px;font-weight:600;color:rgba(255,255,255,.85)}' +
        '.sw-select,.sw-input{width:100%;padding:14px 16px;border:none;border-radius:14px;background:rgba(255,255,255,.95);font-size:16px;font-weight:500;color:#333;outline:none;box-sizing:border-box;font-family:Outfit,sans-serif;transition:box-shadow .2s}.sw-select:focus,.sw-input:focus{box-shadow:0 0 0 3px rgba(244,196,48,.4)}' +
        '.sw-phone-row{display:flex;gap:8px}.sw-phone-code{width:85px;flex-shrink:0;text-align:center;font-weight:700;background:#f3f4f6}' +
        '.sw-btn{width:100%;padding:16px;border:none;border-radius:14px;font-size:17px;font-weight:700;cursor:pointer;transition:all .2s;font-family:Outfit,sans-serif}.sw-btn:disabled{opacity:.6;cursor:not-allowed}' +
        '.sw-btn-orange{background:linear-gradient(135deg,#F4C430,#DAA520);color:#7C2D12;box-shadow:0 4px 16px rgba(218,165,32,.4)}.sw-btn-orange:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(218,165,32,.5)}' +
        '.sw-btn-green{background:linear-gradient(135deg,#2E7D32,#1B5E20);color:#fff;box-shadow:0 4px 16px rgba(46,125,50,.4)}.sw-btn-green:hover:not(:disabled){transform:translateY(-1px)}' +
        '.sw-helper{text-align:center;color:rgba(255,255,255,.7);font-size:13px;margin-top:4px}' +
        '.sw-error{background:#FEE2E2;color:#DC2626;padding:10px;border-radius:10px;font-size:13px;text-align:center}' +
        /* OTP */
        '.sw-otp{display:flex;flex-direction:column;align-items:center;gap:16px}.sw-otp-label{color:#fff;font-size:14px;text-align:center}.sw-otp-phone{color:#F4C430;font-weight:700}' +
        '.sw-otp-boxes{display:flex;gap:8px;justify-content:center}.sw-otp-input{width:46px;height:56px;border:none;border-radius:12px;background:rgba(255,255,255,.95);font-size:24px;font-weight:700;text-align:center;color:#333;outline:none;font-family:Outfit,sans-serif;transition:box-shadow .2s}.sw-otp-input:focus{box-shadow:0 0 0 3px rgba(244,196,48,.4)}' +
        '.sw-resend{color:rgba(255,255,255,.7);font-size:13px;text-align:center}.sw-resend-link{color:#F4C430;cursor:pointer;font-weight:600;background:none;border:none;font-family:Outfit,sans-serif}.sw-resend-link:disabled{color:rgba(255,255,255,.4);cursor:not-allowed}' +
        '.sw-change-link{color:rgba(255,255,255,.6);font-size:13px;cursor:pointer;background:none;border:none;text-decoration:underline;margin-top:8px;font-family:Outfit,sans-serif}' +
        /* Result */
        '.sw-result{text-align:center;padding:20px 0;position:relative;overflow:hidden}' +
        '.sw-result-title{font-family:"Playfair Display",serif;font-size:28px;font-weight:700;color:#fff;margin:0 0 6px;text-shadow:0 2px 8px rgba(0,0,0,.2)}' +
        '.sw-result-text{font-size:15px;color:rgba(255,255,255,.85);margin-bottom:16px}' +
        '.sw-won-box{border-radius:20px;padding:24px;text-align:center;margin-bottom:12px;position:relative;overflow:hidden;animation:sw-won-pop .5s cubic-bezier(.34,1.56,.64,1)}' +
        '@keyframes sw-won-pop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}' +
        '.sw-won-amount{font-family:"Playfair Display",serif;font-size:56px;font-weight:700;color:#fff;text-shadow:0 3px 12px rgba(0,0,0,.2);line-height:1.1}' +
        '.sw-won-note{font-size:13px;color:rgba(255,255,255,.85);margin-top:8px}' +
        '.sw-btn-continue{padding:16px 36px;background:#fff;color:#D4451A;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;width:100%;font-family:Outfit,sans-serif;transition:all .2s;box-shadow:0 4px 16px rgba(0,0,0,.15)}.sw-btn-continue:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,.2)}' +
        /* Timer box */
        '.sw-timer-box{background:rgba(0,0,0,.2);border-radius:14px;padding:14px;margin:16px 0;backdrop-filter:blur(4px)}.sw-timer-label{font-size:12px;color:rgba(255,255,255,.7);margin-bottom:4px}.sw-timer-value{font-size:28px;font-weight:800;color:#F4C430;font-family:Outfit,monospace}' +
        /* Confetti container */
        '.sw-confetti-container{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1}' +
        '.sw-confetti{position:absolute;width:10px;height:10px;opacity:0}' +
        '.sw-balloon{position:absolute;bottom:-60px;font-size:36px;animation:sw-float-up 3s ease-out forwards;opacity:0}' +
        '@keyframes sw-float-up{0%{opacity:0;transform:translateY(0) scale(.5)}15%{opacity:1;transform:translateY(-40px) scale(1)}100%{opacity:0;transform:translateY(-350px) scale(.8) rotate(10deg)}}' +
        '@keyframes sw-confetti-fall{0%{opacity:1;transform:translateY(-20px) rotate(0deg)}100%{opacity:0;transform:translateY(300px) rotate(720deg)}}' +
        '@keyframes sw-confetti-burst{0%{opacity:1;transform:translate(0,0) scale(1) rotate(0deg)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.3) rotate(540deg)}}' +
        /* Sparkle on wheel */
        '.sw-sparkle{position:absolute;pointer-events:none;animation:sw-sparkle-anim 1.5s ease-in-out infinite}' +
        '@keyframes sw-sparkle-anim{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}' +
        /* reCAPTCHA hide */
        '.grecaptcha-badge{visibility:hidden!important;position:fixed!important;bottom:-100px!important}' +
        /* Responsive */
        '@media(max-width:380px){.sw-modal{max-width:340px;border-radius:22px}.sw-wheel-wrap{width:250px;height:250px}.sw-otp-input{width:40px;height:50px;font-size:20px}.sw-won-amount{font-size:44px}.sw-title{font-size:24px}}';

    /* ═══════════ WHEEL SVG (enhanced with outer ring + ticker marks) ═══════════ */
    function createWheelSVG() {
        var s = 280, cx = s/2, cy = s/2, r = s/2 - 12, n = SEGMENTS.length, a = 360/n;
        var svg = '<svg viewBox="0 0 '+s+' '+s+'" id="sw-wheel">';
        // Outer decorative ring
        svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+9)+'" fill="none" stroke="#DAA520" stroke-width="3" opacity=".6"/>';
        svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+6)+'" fill="#fff"/>';
        // Ticker marks
        for (var t = 0; t < n; t++) {
            var ta = (t * a - 90) * Math.PI / 180;
            var tx1 = cx + (r+6) * Math.cos(ta), ty1 = cy + (r+6) * Math.sin(ta);
            var tx2 = cx + (r-2) * Math.cos(ta), ty2 = cy + (r-2) * Math.sin(ta);
            svg += '<line x1="'+tx1.toFixed(1)+'" y1="'+ty1.toFixed(1)+'" x2="'+tx2.toFixed(1)+'" y2="'+ty2.toFixed(1)+'" stroke="#DAA520" stroke-width="3" stroke-linecap="round"/>';
        }
        // Segments
        for (var i = 0; i < n; i++) {
            var seg = SEGMENTS[i];
            var sa = (i * a - 90) * Math.PI / 180, ea = ((i + 1) * a - 90) * Math.PI / 180;
            var x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
            var x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
            svg += '<path d="M'+cx+','+cy+' L'+x1.toFixed(1)+','+y1.toFixed(1)+' A'+r+','+r+' 0 0,1 '+x2.toFixed(1)+','+y2.toFixed(1)+' Z" fill="'+seg.color+'" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>';
            // Label with pill background
            var ma = ((i + .5) * a - 90) * Math.PI / 180, lr = r * .62;
            var lx = cx + lr * Math.cos(ma), ly = cy + lr * Math.sin(ma);
            var rotDeg = (i + .5) * a;
            svg += '<g transform="rotate('+rotDeg+','+lx.toFixed(1)+','+ly.toFixed(1)+')">';
            svg += '<rect x="'+(lx-30).toFixed(1)+'" y="'+(ly-13).toFixed(1)+'" width="60" height="26" rx="13" fill="rgba(255,255,255,.92)" filter="url(#sw-shadow)"/>';
            svg += '<text x="'+lx.toFixed(1)+'" y="'+(ly+1).toFixed(1)+'" font-size="14" font-weight="800" fill="'+seg.color+'" text-anchor="middle" dominant-baseline="middle" font-family="Outfit,sans-serif">'+seg.label+'</text>';
            svg += '</g>';
        }
        // Shadow filter
        svg += '<defs><filter id="sw-shadow"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity=".15"/></filter></defs>';
        svg += '</svg>';
        return svg;
    }

    /* ═══════════ POINTER SVG ═══════════ */
    function createPointerSVG() {
        return '<svg width="40" height="40" viewBox="0 0 40 40">' +
            '<polygon points="20,2 34,38 6,38" fill="#DAA520" stroke="#fff" stroke-width="2"/>' +
            '<circle cx="20" cy="26" r="4" fill="#fff"/>' +
            '</svg>';
    }

    /* ═══════════ CONFETTI + BALLOONS ═══════════ */
    function launchCelebration(container) {
        if (!container) return;
        // Clear previous
        var old = container.querySelector('.sw-confetti-container');
        if (old) old.remove();

        var box = document.createElement('div');
        box.className = 'sw-confetti-container';
        container.appendChild(box);

        // Confetti burst
        var confettiColors = ['#D4451A','#F4C430','#DAA520','#2E7D32','#E53935','#7B2D8E','#fff','#FB923C','#60A5FA'];
        var shapes = ['circle','square','strip'];
        for (var i = 0; i < 60; i++) {
            var c = document.createElement('div');
            c.className = 'sw-confetti';
            var color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            var shape = shapes[Math.floor(Math.random() * shapes.length)];
            var size = 6 + Math.random() * 8;
            var dx = (Math.random() - .5) * 250;
            var dy = 80 + Math.random() * 200;
            c.style.cssText = 'left:50%;top:40%;width:'+size+'px;height:'+(shape==='strip'?size*3:size)+'px;background:'+color+
                ';border-radius:'+(shape==='circle'?'50%':'2px')+
                ';--dx:'+dx+'px;--dy:'+dy+'px;animation:sw-confetti-burst '+(1+Math.random()*1.5)+'s ease-out '+(Math.random()*.3)+'s forwards';
            box.appendChild(c);
        }

        // Falling confetti from top
        for (var j = 0; j < 30; j++) {
            var f = document.createElement('div');
            f.className = 'sw-confetti';
            var color2 = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            var size2 = 5 + Math.random() * 7;
            f.style.cssText = 'left:'+(Math.random()*100)+'%;top:-10px;width:'+size2+'px;height:'+size2+'px;background:'+color2+
                ';border-radius:'+(Math.random()>.5?'50%':'2px')+
                ';animation:sw-confetti-fall '+(2+Math.random()*2)+'s linear '+(Math.random()*.8)+'s forwards';
            box.appendChild(f);
        }

        // Balloons
        var balloonEmojis = ['\uD83C\uDF88','\uD83C\uDF89','\uD83C\uDF8A','\u2728','\uD83C\uDF1F','\uD83C\uDF86'];
        for (var b = 0; b < 8; b++) {
            var bl = document.createElement('div');
            bl.className = 'sw-balloon';
            bl.textContent = balloonEmojis[Math.floor(Math.random() * balloonEmojis.length)];
            bl.style.cssText = 'left:'+(5+Math.random()*85)+'%;animation-delay:'+(Math.random()*1.5)+'s;font-size:'+(28+Math.random()*16)+'px';
            box.appendChild(bl);
        }

        // Cleanup after animation
        setTimeout(function() { if (box.parentNode) box.remove(); }, 5000);
    }

    /* ═══════════ HTML ═══════════ */
    function createModal() {
        if (!document.getElementById('sw-styles')) {
            var st = document.createElement('style'); st.id = 'sw-styles'; st.textContent = STYLES;
            document.head.appendChild(st);
        }
        var maxPrize = 0;
        for (var i = 0; i < PRIZES.length; i++) { if (PRIZES[i].value > maxPrize) maxPrize = PRIZES[i].value; }

        var H = '<div class="sw-overlay" id="sw-overlay"><div class="sw-modal">' +
            '<button class="sw-close" id="sw-close">\u2715</button>' +

            /* STEP: WHEEL */
            '<div id="sw-step-wheel">' +
              '<div class="sw-header"><div class="sw-badge">\uD83C\uDF81 Welcome Offer</div>' +
              '<h2 class="sw-title">Spin & Win!</h2>' +
              '<p class="sw-subtitle">Win wallet cashback up to <strong>\u20B9' + maxPrize + '</strong></p></div>' +
              '<div class="sw-content"><div class="sw-wheel-section">' +
              '<div class="sw-wheel-wrap"><div class="sw-pointer" id="sw-pointer">'+createPointerSVG()+'</div>'+createWheelSVG()+'<div class="sw-center">\uD83C\uDF36\uFE0F</div></div>' +
              '<button class="sw-btn-spin" id="sw-spin">\uD83C\uDFB2 SPIN TO WIN!</button>' +
              '</div></div></div>' +

            /* STEP: CLAIM (enter details) */
            '<div id="sw-step-claim" class="sw-hidden">' +
              '<div class="sw-header" style="padding-bottom:10px"><h2 class="sw-title">\uD83C\uDF81 Almost There!</h2>' +
              '<p class="sw-subtitle">Enter details to reveal your prize</p></div>' +
              '<div class="sw-content"><div class="sw-claim">' +
              '<div class="sw-guaranteed"><div class="sw-guaranteed-text">\u2B50 Your prize is LOCKED IN! Verify to claim \u2B50</div></div>' +
              '<div class="sw-input-group"><div class="sw-label">Your Name</div><input type="text" class="sw-input" id="sw-name" placeholder="Enter your name"></div>' +
              '<div class="sw-input-group"><div class="sw-label">Country</div><select class="sw-select" id="sw-country">' +
                '<option value="+91" data-country="India">\uD83C\uDDEE\uD83C\uDDF3 India (+91)</option>' +
                '<option value="+1" data-country="USA">\uD83C\uDDFA\uD83C\uDDF8 USA (+1)</option>' +
                '<option value="+44" data-country="UK">\uD83C\uDDEC\uD83C\uDDE7 UK (+44)</option>' +
                '<option value="+971" data-country="UAE">\uD83C\uDDE6\uD83C\uDDEA UAE (+971)</option>' +
                '<option value="+65" data-country="Singapore">\uD83C\uDDF8\uD83C\uDDEC Singapore (+65)</option>' +
                '<option value="+61" data-country="Australia">\uD83C\uDDE6\uD83C\uDDFA Australia (+61)</option>' +
              '</select></div>' +
              '<div class="sw-input-group"><div class="sw-label">Phone Number</div><div class="sw-phone-row"><input type="text" class="sw-input sw-phone-code" id="sw-phone-code" value="+91" readonly><input type="tel" class="sw-input" id="sw-phone" placeholder="9876543210" maxlength="15"></div></div>' +
              '<button class="sw-btn sw-btn-orange" id="sw-send-otp" disabled>Verify & Continue \u2728</button>' +
              '<p class="sw-helper">We\u2019ll send a verification code via SMS</p>' +
              '</div></div></div>' +

            /* STEP: OTP */
            '<div id="sw-step-otp" class="sw-hidden">' +
              '<div class="sw-header" style="padding-bottom:10px"><h2 class="sw-title">\uD83D\uDD12 Enter OTP</h2></div>' +
              '<div class="sw-content">' +
              '<div class="sw-guaranteed" style="padding:14px;margin-bottom:16px"><div class="sw-guaranteed-text">\uD83C\uDF81 Your prize is ready! Verify to reveal</div></div>' +
              '<div class="sw-otp">' +
              '<p class="sw-otp-label">Enter 6-digit code sent to <span class="sw-otp-phone" id="sw-otp-phone"></span></p>' +
              '<div class="sw-otp-boxes"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"><input type="tel" class="sw-otp-input" maxlength="1"></div>' +
              '<button class="sw-btn sw-btn-green" id="sw-verify" disabled>Verify & Reveal Prize \uD83C\uDF89</button>' +
              '<p class="sw-resend">Didn\'t receive? <button class="sw-resend-link" id="sw-resend" disabled>Resend (<span id="sw-resend-timer">30</span>s)</button></p>' +
              '<button class="sw-change-link" id="sw-change-num">\u2190 Change number</button>' +
              '</div></div></div>' +

            /* STEP: RESULT */
            '<div id="sw-step-result" class="sw-hidden"><div class="sw-content" style="padding-top:30px"><div class="sw-result" id="sw-result-box">' +
              '<div class="sw-result-title" id="sw-congrats-title">Congratulations!</div>' +
              '<p class="sw-result-text">You won</p>' +
              '<div class="sw-won-box" id="sw-won-box"><div class="sw-won-amount" id="sw-result-amount">\u20B9199</div><div class="sw-won-note">\uD83D\uDCB0 Added to your wallet! Use within ' + ADMIN_CONFIG.wallet_expiry_hours + ' hours.</div></div>' +
              '<button class="sw-btn-continue" id="sw-start-shopping">Start Shopping \uD83D\uDED2</button>' +
            '</div></div></div>' +

            /* STEP: ALREADY */
            '<div id="sw-step-already" class="sw-hidden"><div class="sw-content" style="padding-top:40px"><div class="sw-result">' +
              '<div style="font-size:60px;margin-bottom:16px">\u231B</div><h3 class="sw-result-title">Already Claimed!</h3>' +
              '<p class="sw-result-text">This number has already spun the wheel this month.</p>' +
              '<div class="sw-timer-box"><div class="sw-timer-label">Next spin available in</div><div class="sw-timer-value" id="sw-next-spin">-- days</div></div>' +
              '<button class="sw-btn-continue" id="sw-close-already">Continue Shopping \u2192</button>' +
            '</div></div></div>' +

        '</div></div>' +
        '<div id="sw-recaptcha-box" style="position:fixed;bottom:-200px;left:-200px;z-index:-1;opacity:0;pointer-events:none"></div>';

        document.body.insertAdjacentHTML('beforeend', H);
        modal = document.getElementById('sw-overlay');
        bindEvents();
        initFirebase();
    }

    /* ═══════════ FIREBASE ═══════════ */
    function initFirebase() {
        if (typeof firebase === 'undefined') { console.error('[SpinWheel] Firebase SDK missing!'); return; }
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: "AIzaSyBxFGj5F3JQw9RMYvRUqV18LGoZ62ereEE",
                    authDomain: "seasaltpickles-c058e.firebaseapp.com",
                    projectId: "seasaltpickles-c058e",
                    storageBucket: "seasaltpickles-c058e.firebasestorage.app",
                    messagingSenderId: "110925953869",
                    appId: "1:110925953869:web:b47246f06a91ce1bf35504"
                });
            }
            auth = firebase.auth();
            auth.languageCode = 'en';
            auth.signOut().catch(function(){});
            console.log('[SpinWheel] Firebase ready');
        } catch(e) { console.error('[SpinWheel] Firebase error:', e); }
    }

    /* ═══════════ RECAPTCHA ═══════════ */
    function getRecaptcha() {
        return new Promise(function(resolve, reject) {
            if (recaptchaVerifier && recaptchaRendered) {
                try { if (typeof grecaptcha !== 'undefined' && recaptchaVerifier.widgetId !== undefined) grecaptcha.reset(recaptchaVerifier.widgetId); } catch(e) {}
                resolve(recaptchaVerifier); return;
            }
            var container = document.getElementById('sw-recaptcha-box');
            if (!container) {
                document.body.insertAdjacentHTML('beforeend', '<div id="sw-recaptcha-box" style="position:fixed;bottom:-200px;left:-200px;z-index:-1;opacity:0;pointer-events:none"></div>');
                container = document.getElementById('sw-recaptcha-box');
            }
            container.innerHTML = '<div id="sw-rc-widget"></div>';
            try {
                recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sw-rc-widget', {
                    size: 'invisible',
                    callback: function() { console.log('[SpinWheel] reCAPTCHA OK'); }
                });
                recaptchaVerifier.render().then(function(widgetId) {
                    recaptchaVerifier.widgetId = widgetId;
                    recaptchaRendered = true;
                    resolve(recaptchaVerifier);
                }).catch(reject);
            } catch(e) { reject(e); }
        });
    }

    /* ═══════════ EVENTS ═══════════ */
    function bindEvents() {
        document.getElementById('sw-close').onclick = hide;
        document.getElementById('sw-spin').onclick = handleSpin;
        document.getElementById('sw-name').oninput = validateForm;
        document.getElementById('sw-country').onchange = function(e) {
            selectedCountryCode = e.target.value;
            userCountry = e.target.options[e.target.selectedIndex].dataset.country;
            document.getElementById('sw-phone-code').value = selectedCountryCode;
            validateForm();
        };
        document.getElementById('sw-phone').oninput = function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 15);
            validateForm();
        };
        document.getElementById('sw-send-otp').onclick = handleSendOtp;

        var boxes = document.querySelectorAll('.sw-otp-input');
        for (var i = 0; i < boxes.length; i++) {
            (function(idx) {
                boxes[idx].oninput = function(e) {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
                    if (e.target.value && idx < 5) boxes[idx + 1].focus();
                    checkOtpFull();
                };
                boxes[idx].onkeydown = function(e) {
                    if (e.key === 'Backspace' && !e.target.value && idx > 0) boxes[idx - 1].focus();
                };
                boxes[idx].addEventListener('paste', function(e) {
                    e.preventDefault();
                    var p = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
                    for (var j = 0; j < p.length && idx + j < boxes.length; j++) boxes[idx + j].value = p[j];
                    checkOtpFull();
                    if (p.length === 6) setTimeout(handleVerify, 100);
                });
            })(i);
        }

        document.getElementById('sw-verify').onclick = handleVerify;
        document.getElementById('sw-resend').onclick = handleResend;
        document.getElementById('sw-change-num').onclick = function() { step('claim'); clearOtpBoxes(); };
        document.getElementById('sw-close-already').onclick = hide;
        document.getElementById('sw-start-shopping').onclick = hide;
    }

    function validateForm() {
        var n = document.getElementById('sw-name').value.trim();
        var p = document.getElementById('sw-phone').value;
        document.getElementById('sw-send-otp').disabled = !(n.length >= 2 && p.length >= 7);
    }

    function checkOtpFull() {
        var otp = '';
        document.querySelectorAll('.sw-otp-input').forEach(function(b) { otp += b.value; });
        document.getElementById('sw-verify').disabled = otp.length !== 6;
    }

    function clearOtpBoxes() {
        document.querySelectorAll('.sw-otp-input').forEach(function(b) { b.value = ''; });
        document.getElementById('sw-verify').disabled = true;
    }

    function step(name) {
        ['wheel', 'claim', 'otp', 'result', 'already'].forEach(function(s) {
            var el = document.getElementById('sw-step-' + s);
            if (el) {
                var shouldShow = (s === name);
                el.classList.toggle('sw-hidden', !shouldShow);
                if (shouldShow) {
                    // Add entrance animation
                    el.classList.remove('sw-step-animate');
                    void el.offsetWidth; // force reflow
                    el.classList.add('sw-step-animate');
                }
            }
        });
    }

    /* ═══════════ SPIN (enhanced: longer, faster, more exciting) ═══════════ */
    function handleSpin() {
        var btn = document.getElementById('sw-spin');
        btn.disabled = true;
        btn.textContent = '\uD83C\uDF1F Spinning...';

        // Pick winner NOW (but don't reveal yet)
        var tw = 0;
        for (var i = 0; i < PRIZES.length; i++) tw += PRIZES[i].weight;
        var rnd = Math.random() * tw, pick = PRIZES[0];
        for (var i = 0; i < PRIZES.length; i++) { rnd -= PRIZES[i].weight; if (rnd <= 0) { pick = PRIZES[i]; break; } }
        wonSegmentIndex = pick.segments[Math.floor(Math.random() * pick.segments.length)];
        wonAmount = pick.value;

        var wheel = document.getElementById('sw-wheel');
        wheel.classList.remove('sw-final-spin', 'sw-spin-slow');
        wheel.style.transition = 'none';
        wheel.style.transform = '';

        // Phase 1: Fast spin (2.5s)
        wheel.classList.add('sw-spinning');

        // Phase 2: Slow down (1.5s) — switch to slower animation
        setTimeout(function() {
            wheel.classList.remove('sw-spinning');
            wheel.classList.add('sw-spin-slow');
            btn.textContent = '\uD83C\uDF1F Slowing down...';
        }, 2500);

        // Phase 3: Stop and ask for details (at 4s)
        setTimeout(function() {
            wheel.classList.remove('sw-spin-slow');
            // Freeze at a random rotation (tease)
            wheel.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
            step('claim');
            document.getElementById('sw-name').focus();
        }, 4000);
    }

    /* ═══════════ SEND OTP ═══════════ */
    function handleSendOtp() {
        userName = document.getElementById('sw-name').value.trim();
        userPhone = selectedCountryCode + document.getElementById('sw-phone').value;

        console.log('[SpinWheel] handleSendOtp v18 — phone:', userPhone, 'isTest:', isTestNumber(userPhone));

        var btn = document.getElementById('sw-send-otp');
        btn.disabled = true;
        btn.textContent = 'Checking...';

        checkCanSpin(userPhone).then(function(res) {
            if (!res.canSpin) {
                var wheel = document.getElementById('sw-wheel');
                wheel.classList.remove('sw-spinning', 'sw-spin-slow');
                step('already');
                document.getElementById('sw-next-spin').textContent = res.daysLeft + ' days';
                return;
            }

            /* TEST NUMBERS: Skip OTP — go straight to final reveal */
            if (isTestNumber(userPhone)) {
                console.log('[SpinWheel] Test number — skipping OTP, going to reveal');
                var saved = {}; try { saved = JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) {}
                saved.phone = userPhone; saved.name = userName;
                localStorage.setItem('seasalt_user', JSON.stringify(saved));
                localStorage.setItem('seasalt_phone', userPhone);
                btn.disabled = false; btn.textContent = 'Verify & Continue \u2728';
                doFinalSpin();
                return;
            }

            btn.textContent = 'Sending OTP...';

            if (!auth) {
                toast('Auth not ready. Refresh page.', 'error');
                btn.disabled = false; btn.textContent = 'Verify & Continue \u2728';
                return;
            }

            getRecaptcha().then(function(verifier) {
                auth.signInWithPhoneNumber(userPhone, verifier).then(function(result) {
                    confirmationResult = result;
                    console.log('[SpinWheel] OTP sent to', userPhone);
                    document.getElementById('sw-otp-phone').textContent = userPhone;
                    step('otp');
                    document.querySelector('.sw-otp-input').focus();
                    startResend();
                    toast('OTP sent to ' + userPhone, 'success');
                    btn.disabled = false; btn.textContent = 'Verify & Continue \u2728';
                }).catch(function(err) {
                    console.error('[SpinWheel] OTP error:', err);
                    var msg = 'Failed to send OTP.';
                    if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Wait a few minutes.';
                    if (err.code === 'auth/invalid-phone-number') msg = 'Invalid phone number.';
                    toast(msg, 'error');
                    btn.disabled = false; btn.textContent = 'Verify & Continue \u2728';
                });
            }).catch(function(err) {
                console.error('[SpinWheel] reCAPTCHA error:', err);
                toast('Setup failed. Refresh page.', 'error');
                btn.disabled = false; btn.textContent = 'Verify & Continue \u2728';
            });
        });
    }

    /* ═══════════ VERIFY OTP ═══════════ */
    function handleVerify() {
        var otp = '';
        document.querySelectorAll('.sw-otp-input').forEach(function(b) { otp += b.value; });
        if (otp.length !== 6) return;

        var btn = document.getElementById('sw-verify');
        btn.disabled = true; btn.textContent = 'Verifying...';

        if (!confirmationResult) { toast('Session expired. Try again.', 'error'); step('claim'); return; }

        confirmationResult.confirm(otp).then(function(result) {
            console.log('[SpinWheel] OTP verified!');
            var u = result.user;
            var saved = {}; try { saved = JSON.parse(localStorage.getItem('seasalt_user') || '{}'); } catch(e) {}
            saved.firebaseUid = u.uid; saved.phone = userPhone; saved.name = userName;
            localStorage.setItem('seasalt_user', JSON.stringify(saved));
            localStorage.setItem('seasalt_phone', userPhone);
            if (auth) auth.signOut().catch(function() {});
            localStorage.setItem('seasalt_spin_done', 'true');
            doFinalSpin();
        }).catch(function(err) {
            console.error('[SpinWheel] Verify error:', err);
            var msg = 'Invalid OTP.';
            if (err.code === 'auth/code-expired') msg = 'OTP expired. Request new one.';
            toast(msg, 'error');
            clearOtpBoxes();
            document.querySelector('.sw-otp-input').focus();
            btn.disabled = false; btn.textContent = 'Verify & Reveal Prize \uD83C\uDF89';
        });
    }

    /* ═══════════ FINAL SPIN (the big reveal with celebration) ═══════════ */
    function doFinalSpin() {
        step('wheel');
        var btn = document.getElementById('sw-spin');
        btn.textContent = '\u2728 Revealing your prize...';
        btn.disabled = true;

        var wheel = document.getElementById('sw-wheel');
        wheel.classList.remove('sw-spinning', 'sw-spin-slow');
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';

        var segAngle = 360 / SEGMENTS.length;
        var targetAngle = 360 - (wonSegmentIndex * segAngle + segAngle / 2);
        var spins = 6 + Math.floor(Math.random() * 3);
        var totalRotation = spins * 360 + targetAngle;

        // Small delay then dramatic final spin
        setTimeout(function() {
            wheel.style.transition = 'transform 4.5s cubic-bezier(0.15, 0.7, 0.08, 1)';
            wheel.style.transform = 'rotate(' + totalRotation + 'deg)';
        }, 150);

        // Reveal result with celebration
        setTimeout(function() {
            // Set amount-specific color on won box
            var ac = getAmountColor(wonAmount);
            var wonBox = document.getElementById('sw-won-box');
            if (wonBox) {
                wonBox.style.background = 'linear-gradient(135deg, ' + ac.bg + ', ' + ac.glow + ')';
                wonBox.style.boxShadow = '0 8px 32px ' + ac.bg + '66';
            }
            document.getElementById('sw-result-amount').textContent = '\u20B9' + wonAmount;
            step('result');

            // Launch celebration!
            var resultBox = document.getElementById('sw-result-box');
            launchCelebration(resultBox);

            toast('\uD83C\uDF89 You won \u20B9' + wonAmount + '!', 'success');
            saveToWallet();
        }, 4800);
    }

    /* ═══════════ RESEND ═══════════ */
    function startResend() {
        var c = 30, btn = document.getElementById('sw-resend'), t = document.getElementById('sw-resend-timer');
        if (!btn || !t) return;
        btn.disabled = true; t.textContent = c;
        if (resendInterval) clearInterval(resendInterval);
        resendInterval = setInterval(function() {
            c--; if (t) t.textContent = c;
            if (c <= 0) { clearInterval(resendInterval); if (btn) { btn.disabled = false; btn.innerHTML = 'Resend OTP'; } }
        }, 1000);
    }

    function handleResend() {
        step('claim');
        clearOtpBoxes();
        document.getElementById('sw-send-otp').textContent = 'Verify & Continue \u2728';
        validateForm();
    }

    /* ═══════════ TEST NUMBERS ═══════════ */
    var TEST_NUMBERS = ['+14377998989', '+918096203122'];
    function isTestNumber(phone) {
        if (!phone) return false;
        var normalized = phone.replace(/[\s\-()]/g, '');
        for (var i = 0; i < TEST_NUMBERS.length; i++) {
            if (normalized === TEST_NUMBERS[i] || normalized.endsWith(TEST_NUMBERS[i].replace('+', ''))) return true;
        }
        return false;
    }

    /* ═══════════ DB ═══════════ */
    function checkCanSpin(phone) {
        if (isTestNumber(phone)) {
            console.log('[SpinWheel] Test number detected — spin allowed');
            return Promise.resolve({ canSpin: true });
        }
        var cooldownDays = ADMIN_CONFIG.cooldown_days;
        return fetch(SUPABASE_URL + '/rest/v1/wallet_transactions?user_phone=eq.' + encodeURIComponent(phone) + '&type=eq.spin_reward&order=created_at.desc&limit=1', {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).then(function(r) { return r.json(); }).then(function(d) {
            if (d && d.length > 0) { var ls = new Date(d[0].created_at), ds = (new Date() - ls) / (864e5); if (ds < cooldownDays) return { canSpin: false, daysLeft: Math.ceil(cooldownDays - ds) }; }
            return { canSpin: true };
        }).catch(function() { return { canSpin: true }; });
    }

    function saveToWallet() {
        var expiryMs = ADMIN_CONFIG.wallet_expiry_hours * 36e5;
        var now = new Date(), exp = new Date(now.getTime() + expiryMs);
        localStorage.setItem('seasalt_user', JSON.stringify({ name: userName, phone: userPhone, country: userCountry }));
        localStorage.setItem(SPIN_WALLET_KEY, JSON.stringify({ amount: wonAmount, addedAt: now.toISOString(), expiresAt: exp.toISOString() }));
        localStorage.setItem('seasalt_spin_reward', JSON.stringify({ amount: wonAmount, addedAt: now.toISOString(), expiresAt: exp.toISOString(), source: 'spin' }));
        localStorage.setItem('seasalt_spin_done', 'true');

        fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(userPhone), {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).then(function(r) { return r.json(); }).then(function(ex) {
            var d = { name: userName, selected_country: userCountry, wallet_balance: wonAmount, wallet_expires_at: exp.toISOString(), last_seen: now.toISOString() };
            if (ex && ex.length > 0) return fetch(SUPABASE_URL + '/rest/v1/users?phone=eq.' + encodeURIComponent(userPhone), { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' }, body: JSON.stringify(d) });
            else return fetch(SUPABASE_URL + '/rest/v1/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' }, body: JSON.stringify({ phone: userPhone, total_visits: 1, name: userName, selected_country: userCountry, wallet_balance: wonAmount, wallet_expires_at: exp.toISOString(), last_seen: now.toISOString() }) });
        }).then(function() {
            return fetch(SUPABASE_URL + '/rest/v1/wallet_transactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' }, body: JSON.stringify({ user_phone: userPhone, amount: wonAmount, type: 'spin_reward', description: 'Spin wheel reward', balance_after: wonAmount }) });
        }).catch(function(e) { console.warn('[SpinWheel] DB error:', e); });

        if (typeof UI !== 'undefined') { UI.updateCartUI(); if (typeof UI.startWalletTimer === 'function') UI.startWalletTimer(); }
        window.dispatchEvent(new CustomEvent('walletUpdated', { detail: { amount: wonAmount, expiresAt: exp.toISOString() } }));

        /* Test numbers: clear spin_done so they can spin again */
        if (isTestNumber(userPhone)) {
            setTimeout(function() {
                localStorage.removeItem('seasalt_spin_done');
                localStorage.removeItem('seasalt_spin_dismiss_count');
                console.log('[SpinWheel] Test number — spin_done cleared for next visit');
            }, 2000);
        }
    }

    /* ═══════════ SHOW / HIDE ═══════════ */
    function shouldShow() {
        if (!ADMIN_CONFIG.is_active) return false;
        var currentPhone = localStorage.getItem('seasalt_phone') || '';
        if (isTestNumber(currentPhone)) {
            localStorage.removeItem('seasalt_spin_done');
            localStorage.removeItem('seasalt_spin_dismiss_count');
            sessionStorage.removeItem('seasalt_spin_dismissed');
            console.log('[SpinWheel] Test number — spin blocks cleared');
            return true;
        }
        if (localStorage.getItem('seasalt_spin_done') === 'true') return false;
        if (localStorage.getItem(SPIN_WALLET_KEY)) return false;
        if (localStorage.getItem('seasalt_phone')) return false;
        if (sessionStorage.getItem('seasalt_spin_dismissed')) return false;
        var dc = parseInt(localStorage.getItem('seasalt_spin_dismiss_count') || '0', 10);
        if (dc >= 3) { localStorage.setItem('seasalt_spin_done', 'true'); return false; }
        return true;
    }

    function show() {
        if (!modal) createModal();
        // Full reset for fresh experience
        step('wheel');
        var spinBtn = document.getElementById('sw-spin');
        if (spinBtn) { spinBtn.disabled = false; spinBtn.textContent = '\uD83C\uDFB2 SPIN TO WIN!'; }
        var nameEl = document.getElementById('sw-name');
        var phoneEl = document.getElementById('sw-phone');
        if (nameEl) nameEl.value = '';
        if (phoneEl) phoneEl.value = '';
        var sendBtn = document.getElementById('sw-send-otp');
        if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Verify & Continue \u2728'; }
        document.querySelectorAll('.sw-otp-input').forEach(function(b) { b.value = ''; });
        // Reset wheel rotation
        var wheel = document.getElementById('sw-wheel');
        if (wheel) {
            wheel.classList.remove('sw-spinning', 'sw-spin-slow', 'sw-final-spin');
            wheel.style.transition = 'none';
            wheel.style.transform = '';
        }
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hide() {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Stop any spinning
        var wheel = document.getElementById('sw-wheel');
        if (wheel) { wheel.classList.remove('sw-spinning', 'sw-spin-slow'); }
        if (resendInterval) clearInterval(resendInterval);
        if (!localStorage.getItem('seasalt_spin_done')) {
            sessionStorage.setItem('seasalt_spin_dismissed', 'true');
            var dc = parseInt(localStorage.getItem('seasalt_spin_dismiss_count') || '0', 10);
            localStorage.setItem('seasalt_spin_dismiss_count', String(dc + 1));
        }
    }

    function toast(m, t) {
        var e = document.createElement('div');
        e.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:14px 28px;border-radius:14px;color:#fff;font-weight:600;z-index:99999;max-width:90%;text-align:center;font-family:Outfit,sans-serif;font-size:15px;box-shadow:0 8px 32px rgba(0,0,0,.25);backdrop-filter:blur(8px);background:' + (t === 'success' ? 'rgba(46,125,50,.92)' : t === 'error' ? 'rgba(220,38,38,.92)' : 'rgba(218,165,32,.92)');
        e.textContent = m;
        document.body.appendChild(e);
        setTimeout(function() { e.style.opacity = '0'; e.style.transition = 'opacity .3s'; setTimeout(function() { e.remove(); }, 300); }, 3500);
    }

    /* ═══════════ INIT ═══════════ */
    function init() {
        console.log('[SpinWheel] v18 init — fetching admin config...');
        fetchAdminConfig().then(function() {
            var w = localStorage.getItem(SPIN_WALLET_KEY);
            if (w) { try { var d = JSON.parse(w); if (d.amount > 0 && new Date(d.expiresAt) > new Date() && typeof UI !== 'undefined') { UI.updateCartUI(); if (typeof UI.startWalletTimer === 'function') UI.startWalletTimer(); } } catch(e) {} }
            if (shouldShow()) setTimeout(show, ADMIN_CONFIG.popup_delay_seconds * 1000);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    window.SpinWheel = { init: init, show: show, hide: hide };
})();
