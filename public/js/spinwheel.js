/**
 * SeaSalt Pickles - Spin Wheel v17
 * 6-segment premium wheel: ₹99, Try Again, ₹199, Try Again, ₹299, Try Again
 * Odds: ₹99(8%), ₹199(4%), ₹299(2%), Try Again(86%)
 */
(function() {
    'use strict';
    console.log('[SpinWheel] v17 loaded');
    var SU='https://yosjbsncvghpscsrvxds.supabase.co';
    var SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
    var DOTP='123456',WK='seasalt_spin_wallet';
    var modal=null,confResult=null,userPhone=null,userName=null,cc='+91',uCountry='India';
    var spinning=false,demo=true,auth=null,rcv=null,wonAmt=0,wonType='lose';
    var SEG=[
        {label:'\u20b999',val:99,color:'#D4451A',icon:'\uD83D\uDCB0',type:'wallet'},
        {label:'Try Again',val:0,color:'#166534',icon:'\uD83D\uDD04',type:'lose'},
        {label:'\u20b9199',val:199,color:'#9333EA',icon:'\uD83D\uDC8E',type:'wallet'},
        {label:'Try Again',val:0,color:'#0369A1',icon:'\uD83D\uDD04',type:'lose'},
        {label:'\u20b9299',val:299,color:'#B91C1C',icon:'\uD83C\uDFC6',type:'wallet'},
        {label:'Try Again',val:0,color:'#065F46',icon:'\uD83D\uDD04',type:'lose'}
    ];
    var PRZ=[
        {val:99,w:800,segs:[0],type:'wallet'},
        {val:199,w:400,segs:[2],type:'wallet'},
        {val:299,w:200,segs:[4],type:'wallet'},
        {val:0,w:8600,segs:[1,3,5],type:'lose'}
    ];
    var CSS='.sw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;visibility:hidden;transition:all .3s}.sw-overlay.active{opacity:1;visibility:visible}.sw-modal{background:linear-gradient(160deg,#1a1a2e,#16213e 50%,#0f3460);border-radius:28px;width:100%;max-width:380px;max-height:92vh;overflow-y:auto;position:relative;transform:scale(.9);transition:transform .3s;box-shadow:0 25px 80px rgba(0,0,0,.6),0 0 40px rgba(212,69,26,.15);border:1px solid rgba(255,255,255,.08)}.sw-overlay.active .sw-modal{transform:scale(1)}.sw-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);font-size:16px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center}.sw-header{text-align:center;padding:28px 20px 14px}.sw-badge{display:inline-block;background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;padding:6px 16px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px}.sw-title{font-size:26px;font-weight:800;color:#fff;margin:0 0 6px}.sw-subtitle{font-size:14px;color:rgba(255,255,255,.7);margin:0}.sw-content{padding:0 22px 26px}.sw-hidden{display:none!important}.sw-wheel-section{display:flex;flex-direction:column;align-items:center;gap:22px}.sw-wheel-wrap{position:relative;width:280px;height:280px}.sw-wheel-glow{position:absolute;inset:-14px;border-radius:50%;background:conic-gradient(from 0deg,rgba(212,69,26,.25),rgba(147,51,234,.25),rgba(185,28,28,.25),rgba(212,69,26,.25));filter:blur(18px);animation:swGlow 8s linear infinite}@keyframes swGlow{to{transform:rotate(360deg)}}.sw-wheel-img{width:100%;height:100%;transition:transform 4.5s cubic-bezier(.17,.67,.08,.98);filter:drop-shadow(0 4px 18px rgba(0,0,0,.4))}.sw-pointer{position:absolute;top:-8px;left:50%;transform:translateX(-50%);z-index:15;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4))}.sw-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;background:linear-gradient(145deg,#fff,#f0f0f0);border-radius:50%;border:3px solid rgba(212,69,26,.3);display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 18px rgba(0,0,0,.3),inset 0 2px 4px rgba(255,255,255,.8);z-index:10}.sw-btn-spin{padding:16px 44px;background:linear-gradient(135deg,#D4451A,#EA580C);color:#fff;border:none;border-radius:16px;font-size:17px;font-weight:800;cursor:pointer;box-shadow:0 8px 28px rgba(212,69,26,.4);text-transform:uppercase;letter-spacing:1px;transition:all .2s}.sw-btn-spin:hover{transform:translateY(-2px)}.sw-btn-spin:disabled{opacity:.7;cursor:not-allowed;transform:none}.sw-claim{display:flex;flex-direction:column;gap:12px}.sw-won-box{background:linear-gradient(135deg,#10B981,#059669);border-radius:18px;padding:22px;text-align:center;margin-bottom:6px}.sw-won-label{font-size:13px;color:rgba(255,255,255,.9)}.sw-won-amount{font-size:48px;font-weight:900;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.2)}.sw-won-note{font-size:12px;color:rgba(255,255,255,.8);margin-top:4px}.sw-input-group{display:flex;flex-direction:column;gap:4px}.sw-label{font-size:13px;font-weight:600;color:rgba(255,255,255,.8)}.sw-select,.sw-input{width:100%;padding:13px 15px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.08);font-size:15px;font-weight:500;color:#fff;outline:none;box-sizing:border-box}.sw-select option{background:#1a1a2e;color:#fff}.sw-input::placeholder{color:rgba(255,255,255,.35)}.sw-phone-row{display:flex;gap:8px}.sw-phone-code{width:82px;flex-shrink:0;text-align:center;font-weight:700}.sw-btn{width:100%;padding:15px;border:none;border-radius:13px;font-size:16px;font-weight:700;cursor:pointer;transition:all .2s}.sw-btn:disabled{opacity:.5;cursor:not-allowed}.sw-btn-orange{background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;box-shadow:0 4px 18px rgba(245,158,11,.3)}.sw-btn-green{background:linear-gradient(135deg,#10B981,#059669);color:#fff;box-shadow:0 4px 18px rgba(16,185,129,.3)}.sw-helper{text-align:center;color:rgba(255,255,255,.5);font-size:12px;margin-top:2px}.sw-demo-note{background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.3);border-radius:10px;padding:9px;text-align:center;color:#FCD34D;font-size:13px;font-weight:600}.sw-error{background:rgba(239,68,68,.15);color:#FCA5A5;padding:9px;border-radius:10px;font-size:13px;text-align:center}.sw-otp{display:flex;flex-direction:column;align-items:center;gap:14px}.sw-otp-label{color:rgba(255,255,255,.8);font-size:14px;text-align:center}.sw-otp-phone{color:#FCD34D;font-weight:700}.sw-otp-boxes{display:flex;gap:7px;justify-content:center}.sw-otp-input{width:44px;height:54px;border:1px solid rgba(255,255,255,.15);border-radius:11px;background:rgba(255,255,255,.08);font-size:22px;font-weight:700;text-align:center;color:#fff;outline:none}.sw-otp-input:focus{border-color:#D4451A;background:rgba(212,69,26,.1)}.sw-resend{color:rgba(255,255,255,.6);font-size:13px;text-align:center}.sw-resend-link{color:#FCD34D;cursor:pointer;font-weight:600;background:none;border:none}.sw-resend-link:disabled{color:rgba(255,255,255,.3);cursor:not-allowed}.sw-change-link{color:rgba(255,255,255,.5);font-size:13px;cursor:pointer;background:none;border:none;text-decoration:underline}.sw-result{text-align:center;padding:20px 0}.sw-result-icon{font-size:64px;margin-bottom:14px}.sw-result-title{font-size:24px;font-weight:800;color:#fff;margin:0 0 8px}.sw-result-text{font-size:14px;color:rgba(255,255,255,.7);margin-bottom:14px}.sw-timer-box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px;margin:14px 0}.sw-timer-label{font-size:12px;color:rgba(255,255,255,.6);margin-bottom:4px}.sw-timer-value{font-size:26px;font-weight:800;color:#FCD34D;font-family:monospace}.sw-btn-continue{padding:15px;background:linear-gradient(135deg,#D4451A,#EA580C);color:#fff;border:none;border-radius:13px;font-size:16px;font-weight:700;cursor:pointer;width:100%}@media(max-width:380px){.sw-modal{max-width:340px}.sw-wheel-wrap{width:250px;height:250px}.sw-otp-input{width:38px;height:48px;font-size:18px}}';

    function mkWheel(){
        var s=280,cx=s/2,cy=s/2,r=s/2-8,n=SEG.length,sa=360/n;
        var v='<svg viewBox="0 0 '+s+' '+s+'" class="sw-wheel-img" id="sw-wheel">';
        v+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+5)+'" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="3"/>';
        for(var i=0;i<n;i++){
            var g=SEG[i],sd=i*sa-90,ed=(i+1)*sa-90;
            var sr=sd*Math.PI/180,er=ed*Math.PI/180;
            var x1=cx+r*Math.cos(sr),y1=cy+r*Math.sin(sr),x2=cx+r*Math.cos(er),y2=cy+r*Math.sin(er);
            v+='<path d="M'+cx+','+cy+' L'+x1.toFixed(1)+','+y1.toFixed(1)+' A'+r+','+r+' 0 0,1 '+x2.toFixed(1)+','+y2.toFixed(1)+' Z" fill="'+g.color+'"/>';
            v+='<line x1="'+cx+'" y1="'+cy+'" x2="'+x1.toFixed(1)+'" y2="'+y1.toFixed(1)+'" stroke="rgba(255,255,255,.3)" stroke-width="1.5"/>';
            var ma=(i+.5)*sa-90,mr=ma*Math.PI/180,tr=r*.6;
            var tx=cx+tr*Math.cos(mr),ty=cy+tr*Math.sin(mr),rot=(i+.5)*sa;
            var ir=r*.82,ix=cx+ir*Math.cos(mr),iy=cy+ir*Math.sin(mr);
            v+='<text x="'+ix.toFixed(1)+'" y="'+iy.toFixed(1)+'" font-size="15" text-anchor="middle" dominant-baseline="middle" transform="rotate('+rot+','+ix.toFixed(1)+','+iy.toFixed(1)+')">'+g.icon+'</text>';
            if(g.val>0){
                v+='<g transform="rotate('+rot+','+tx.toFixed(1)+','+ty.toFixed(1)+')">';
                v+='<rect x="'+(tx-27).toFixed(1)+'" y="'+(ty-13).toFixed(1)+'" width="54" height="26" rx="13" fill="rgba(255,255,255,.95)"/>';
                v+='<text x="'+tx.toFixed(1)+'" y="'+(ty+1).toFixed(1)+'" font-size="14" font-weight="900" fill="'+g.color+'" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">'+g.label+'</text></g>';
            }else{
                v+='<g transform="rotate('+rot+','+tx.toFixed(1)+','+ty.toFixed(1)+')">';
                v+='<text x="'+tx.toFixed(1)+'" y="'+(ty+1).toFixed(1)+'" font-size="10" font-weight="700" fill="rgba(255,255,255,.85)" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" letter-spacing="1">TRY AGAIN</text></g>';
            }
        }
        v+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>';
        for(var d=0;d<24;d++){var da=(d*15-90)*Math.PI/180;v+='<circle cx="'+(cx+(r-6)*Math.cos(da)).toFixed(1)+'" cy="'+(cy+(r-6)*Math.sin(da)).toFixed(1)+'" r="1.8" fill="rgba(255,255,255,'+(d%2?'.12':'.35')+')"/>';}
        v+='</svg>';return v;
    }
    function mkPtr(){return '<svg width="38" height="46" viewBox="0 0 40 48" class="sw-pointer"><defs><filter id="ps" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".3"/></filter></defs><path d="M20 44 L6 8 Q6 0 20 0 Q34 0 34 8 Z" fill="#fff" filter="url(#ps)"/><path d="M20 38 L10 10 Q10 4 20 4 Q30 4 30 10 Z" fill="#D4451A"/><circle cx="20" cy="12" r="3.5" fill="#fff" opacity=".6"/></svg>';}

    function createModal(){
        if(!document.getElementById('sw-styles')){var st=document.createElement('style');st.id='sw-styles';st.textContent=CSS;document.head.appendChild(st);}
        var h='<div class="sw-overlay" id="sw-overlay"><div class="sw-modal"><button class="sw-close" id="sw-close">\u2715</button>';
        h+='<div id="sw-step-wheel"><div class="sw-header"><div class="sw-badge">\uD83C\uDF81 Limited Time</div><h2 class="sw-title">\uD83C\uDF89 Welcome Gift!</h2><p class="sw-subtitle">Spin to win up to \u20b9299 wallet cash</p></div><div class="sw-content"><div class="sw-wheel-section"><div class="sw-wheel-wrap"><div class="sw-wheel-glow"></div>'+mkPtr()+mkWheel()+'<div class="sw-center">\uD83C\uDFB0</div></div><button class="sw-btn-spin" id="sw-spin">\uD83C\uDFB2 SPIN NOW! \uD83C\uDFB2</button></div></div></div>';
        h+='<div id="sw-step-claim" class="sw-hidden"><div class="sw-header" style="padding-bottom:8px"><h2 class="sw-title">\uD83C\uDF89 You Won!</h2></div><div class="sw-content"><div class="sw-claim"><div class="sw-won-box"><div class="sw-won-label">Your Prize</div><div class="sw-won-amount" id="sw-claim-amount">\u20b999</div><div class="sw-won-note">Verify phone to claim</div></div><div id="sw-claim-error" class="sw-error sw-hidden"></div><div class="sw-input-group"><div class="sw-label">Your Name</div><input type="text" class="sw-input" id="sw-name" placeholder="Enter your name"></div><div class="sw-input-group"><div class="sw-label">Country</div><select class="sw-select" id="sw-country"><option value="+91" data-country="India">\uD83C\uDDEE\uD83C\uDDF3 India (+91)</option><option value="+1" data-country="USA">\uD83C\uDDFA\uD83C\uDDF8 USA (+1)</option><option value="+44" data-country="UK">\uD83C\uDDEC\uD83C\uDDE7 UK (+44)</option><option value="+971" data-country="UAE">\uD83C\uDDE6\uD83C\uDDEA UAE (+971)</option><option value="+65" data-country="Singapore">\uD83C\uDDF8\uD83C\uDDEC Singapore (+65)</option><option value="+61" data-country="Australia">\uD83C\uDDE6\uD83C\uDDFA Australia (+61)</option><option value="+966" data-country="Saudi Arabia">\uD83C\uDDF8\uD83C\uDDE6 Saudi Arabia (+966)</option><option value="+60" data-country="Malaysia">\uD83C\uDDF2\uD83C\uDDFE Malaysia (+60)</option></select></div><div class="sw-input-group"><div class="sw-label">Phone</div><div class="sw-phone-row"><input type="text" class="sw-input sw-phone-code" id="sw-phone-code" value="+91" readonly><input type="tel" class="sw-input" id="sw-phone" placeholder="9876543210" maxlength="10"></div></div><button class="sw-btn sw-btn-orange" id="sw-send-otp" disabled>Send OTP \u2728</button><p class="sw-helper">We\'ll send a verification code</p><div id="sw-recaptcha"></div></div></div></div>';
        h+='<div id="sw-step-otp" class="sw-hidden"><div class="sw-header" style="padding-bottom:8px"><h2 class="sw-title">Verify OTP</h2></div><div class="sw-content"><div class="sw-won-box" style="padding:12px;margin-bottom:14px"><div class="sw-won-label">Claiming</div><div class="sw-won-amount" id="sw-otp-amount" style="font-size:34px">\u20b999</div></div><div class="sw-otp"><p class="sw-otp-label">Enter code sent to <span class="sw-otp-phone" id="sw-otp-phone"></span></p><div id="sw-demo-hint" class="sw-demo-note">\uD83D\uDD11 Test OTP: <strong>123456</strong></div><div class="sw-otp-boxes"><input type="tel" class="sw-otp-input" maxlength="1" data-i="0"><input type="tel" class="sw-otp-input" maxlength="1" data-i="1"><input type="tel" class="sw-otp-input" maxlength="1" data-i="2"><input type="tel" class="sw-otp-input" maxlength="1" data-i="3"><input type="tel" class="sw-otp-input" maxlength="1" data-i="4"><input type="tel" class="sw-otp-input" maxlength="1" data-i="5"></div><button class="sw-btn sw-btn-green" id="sw-verify" disabled>Verify & Claim \uD83C\uDF89</button><p class="sw-resend">Didn\'t get it? <button class="sw-resend-link" id="sw-resend" disabled>Resend (<span id="sw-resend-timer">30</span>s)</button></p><button class="sw-change-link" id="sw-change-num">\u2190 Change number</button></div></div></div>';
        h+='<div id="sw-step-already" class="sw-hidden"><div class="sw-content" style="padding-top:36px"><div class="sw-result"><div class="sw-result-icon">\u23F3</div><h3 class="sw-result-title">Already Claimed!</h3><p class="sw-result-text">This number has already spun the wheel this month.</p><div class="sw-timer-box"><div class="sw-timer-label">Next spin in</div><div class="sw-timer-value" id="sw-next-spin">-- days</div></div><button class="sw-btn-continue" id="sw-close-already">Continue Shopping \u2192</button></div></div></div>';
        h+='</div></div>';
        document.body.insertAdjacentHTML('beforeend',h);
        modal=document.getElementById('sw-overlay');
        bindEvents();initFB();
    }
    function initFB(){if(typeof firebase==='undefined'){demo=true;return;}try{if(!firebase.apps.length)firebase.initializeApp({apiKey:"AIzaSyBxOXkOWqH_l4Moyp9CK5GKWeCDi9N3pWo",authDomain:"seasaltpickles-c058e.firebaseapp.com",projectId:"seasaltpickles-c058e"});auth=firebase.auth();auth.languageCode='en';demo=false;}catch(e){demo=true;}}
    function bindEvents(){
        document.getElementById('sw-close').onclick=hide;
        document.getElementById('sw-spin').onclick=handleSpin;
        document.getElementById('sw-name').oninput=valForm;
        document.getElementById('sw-country').onchange=function(e){cc=e.target.value;uCountry=e.target.options[e.target.selectedIndex].dataset.country;document.getElementById('sw-phone-code').value=cc;valForm();};
        document.getElementById('sw-phone').oninput=function(e){e.target.value=e.target.value.replace(/\D/g,'').slice(0,10);valForm();};
        document.getElementById('sw-send-otp').onclick=sendOtp;
        var oi=document.querySelectorAll('.sw-otp-input');
        for(var i=0;i<oi.length;i++)(function(x){oi[x].oninput=function(e){e.target.value=e.target.value.replace(/\D/g,'').slice(0,1);if(e.target.value&&x<5)oi[x+1].focus();chkOtp();};oi[x].onkeydown=function(e){if(e.key==='Backspace'&&!e.target.value&&x>0)oi[x-1].focus();};})(i);
        document.getElementById('sw-verify').onclick=verify;
        document.getElementById('sw-resend').onclick=resend;
        document.getElementById('sw-change-num').onclick=function(){goStep('claim');clrOtp();};
        document.getElementById('sw-close-already').onclick=hide;
    }
    function valForm(){var n=document.getElementById('sw-name').value.trim(),p=document.getElementById('sw-phone').value;document.getElementById('sw-send-otp').disabled=!(n.length>=2&&p.length===10);}
    function chkOtp(){var o='',inp=document.querySelectorAll('.sw-otp-input');for(var i=0;i<inp.length;i++)o+=inp[i].value;document.getElementById('sw-verify').disabled=o.length!==6;}
    function clrOtp(){var inp=document.querySelectorAll('.sw-otp-input');for(var i=0;i<inp.length;i++)inp[i].value='';document.getElementById('sw-verify').disabled=true;}
    function goStep(s){['wheel','claim','otp','already'].forEach(function(k){var el=document.getElementById('sw-step-'+k);if(el)el.classList.toggle('sw-hidden',k!==s);});}
    function handleSpin(){
        if(spinning)return;spinning=true;
        var btn=document.getElementById('sw-spin');btn.disabled=true;btn.textContent='\uD83C\uDFB2 Spinning...';
        var tw=0;for(var i=0;i<PRZ.length;i++)tw+=PRZ[i].w;
        var rn=Math.random()*tw,sp=PRZ[PRZ.length-1];
        for(var i=0;i<PRZ.length;i++){rn-=PRZ[i].w;if(rn<=0){sp=PRZ[i];break;}}
        var si=sp.segs[Math.floor(Math.random()*sp.segs.length)];
        wonAmt=sp.val;wonType=sp.type||'lose';
        var sa=360/SEG.length,ta=360-(si*sa+sa/2),spins=5+Math.floor(Math.random()*3);
        document.getElementById('sw-wheel').style.transform='rotate('+(spins*360+ta)+'deg)';
        setTimeout(function(){
            spinning=false;
            if(wonType==='lose'){
                localStorage.setItem('seasalt_spin_done','true');
                var ca=document.getElementById('sw-claim-amount'),wb=ca?ca.closest('.sw-won-box'):null;
                if(wb){wb.style.background='linear-gradient(135deg,#374151,#1F2937)';
                    var wl=wb.querySelector('.sw-won-label');if(wl)wl.textContent='\uD83D\uDE14 Better Luck Next Time!';
                    if(ca){ca.textContent='No Prize';ca.style.fontSize='26px';}
                    var wn=wb.querySelector('.sw-won-note');if(wn)wn.textContent='Check out our amazing products!';}
                goStep('claim');
                var cf=document.querySelector('#sw-step-claim .sw-claim');
                if(cf){cf.querySelectorAll('.sw-input-group,.sw-btn-orange,.sw-helper,#sw-recaptcha,#sw-claim-error').forEach(function(e){e.style.display='none';});
                    if(!cf.querySelector('.sw-btn-lose')){var sb=document.createElement('button');sb.className='sw-btn-continue sw-btn-lose';sb.textContent='Continue Shopping \uD83D\uDED2';sb.style.marginTop='14px';sb.onclick=hide;cf.appendChild(sb);}
                    else cf.querySelector('.sw-btn-lose').style.display='';}
                toast('Better luck next time!','info');
            }else{
                var ca=document.getElementById('sw-claim-amount'),wb=ca?ca.closest('.sw-won-box'):null;
                ca.textContent='\u20b9'+wonAmt;ca.style.fontSize='48px';
                document.getElementById('sw-otp-amount').textContent='\u20b9'+wonAmt;
                if(wb){wb.style.background='linear-gradient(135deg,#10B981,#059669)';
                    var wl=wb.querySelector('.sw-won-label');if(wl)wl.textContent='\uD83C\uDF89 Your Prize';
                    var wn=wb.querySelector('.sw-won-note');if(wn)wn.textContent='Verify phone to claim \u20b9'+wonAmt;}
                var cf=document.querySelector('#sw-step-claim .sw-claim');
                if(cf){cf.querySelectorAll('.sw-input-group,.sw-btn-orange,.sw-helper').forEach(function(e){e.style.display='';});
                    var lb=cf.querySelector('.sw-btn-lose');if(lb)lb.style.display='none';}
                goStep('claim');document.getElementById('sw-name').focus();
                toast('\uD83C\uDF89 You won \u20b9'+wonAmt+'!','success');
            }
        },4700);
    }
    function sendOtp(){
        userName=document.getElementById('sw-name').value.trim();
        var ph=document.getElementById('sw-phone').value;userPhone=cc+ph;
        localStorage.setItem('seasalt_phone',userPhone);localStorage.setItem('seasalt_user_phone',userPhone);
        try{var eu=JSON.parse(localStorage.getItem('seasalt_user')||'{}');eu.phone=userPhone;eu.name=userName;eu.country=uCountry;localStorage.setItem('seasalt_user',JSON.stringify(eu));}catch(e){localStorage.setItem('seasalt_user',JSON.stringify({phone:userPhone,name:userName,country:uCountry}));}
        console.log('[SpinWheel] Phone captured:',userPhone);
        var btn=document.getElementById('sw-send-otp');btn.disabled=true;btn.textContent='Checking...';
        checkSpin(userPhone).then(function(r){
            if(!r.can){goStep('already');document.getElementById('sw-next-spin').textContent=r.days+' days';return;}
            btn.textContent='Sending OTP...';document.getElementById('sw-demo-hint').classList.toggle('sw-hidden',!demo);
            if(demo){showOtp();toast('Test mode: Use OTP 123456','info');}
            else{if(!rcv)rcv=new firebase.auth.RecaptchaVerifier('sw-recaptcha',{size:'invisible'});
                auth.signInWithPhoneNumber(userPhone,rcv).then(function(r){confResult=r;showOtp();toast('OTP sent!','success');}).catch(function(){demo=true;document.getElementById('sw-demo-hint').classList.remove('sw-hidden');showOtp();toast('Using test OTP: 123456','info');});}
        });
    }
    function showOtp(){document.getElementById('sw-otp-phone').textContent=userPhone;goStep('otp');document.querySelector('.sw-otp-input').focus();startResend();}
    var resInt=null;
    function startResend(){var c=30,btn=document.getElementById('sw-resend'),ts=document.getElementById('sw-resend-timer');btn.disabled=true;ts.textContent=c;if(resInt)clearInterval(resInt);resInt=setInterval(function(){c--;ts.textContent=c;if(c<=0){clearInterval(resInt);btn.disabled=false;btn.innerHTML='Resend OTP';}},1000);}
    function resend(){goStep('claim');clrOtp();document.getElementById('sw-send-otp').textContent='Send OTP \u2728';valForm();}
    function verify(){
        var otp='',inp=document.querySelectorAll('.sw-otp-input');for(var i=0;i<inp.length;i++)otp+=inp[i].value;if(otp.length!==6)return;
        var btn=document.getElementById('sw-verify');btn.disabled=true;btn.textContent='Verifying...';
        if(demo){if(otp===DOTP)saveWallet();else{toast('Invalid OTP. Use 123456','error');clrOtp();document.querySelector('.sw-otp-input').focus();btn.textContent='Verify & Claim \uD83C\uDF89';}}
        else{confResult.confirm(otp).then(function(){saveWallet();}).catch(function(){toast('Invalid OTP','error');clrOtp();document.querySelector('.sw-otp-input').focus();btn.textContent='Verify & Claim \uD83C\uDF89';});}
    }
    function checkSpin(ph){
        return fetch(SU+'/rest/v1/wallet_transactions?user_phone=eq.'+encodeURIComponent(ph)+'&type=eq.spin_reward&order=created_at.desc&limit=1',{
            headers:{'apikey':SK,'Authorization':'Bearer '+SK}
        }).then(function(r){return r.json();}).then(function(d){
            if(d&&d.length>0){var ds=(new Date()-new Date(d[0].created_at))/(864e5);if(ds<30)return{can:false,days:Math.ceil(30-ds)};}return{can:true};
        }).catch(function(){return{can:true};});
    }
    function saveWallet(){
        console.log('[SpinWheel] Saving:',wonType,wonAmt);
        var now=new Date(),exp=new Date(now.getTime()+48*36e5);
        localStorage.setItem('seasalt_user',JSON.stringify({name:userName,phone:userPhone,country:uCountry}));
        localStorage.setItem('seasalt_phone',userPhone);localStorage.setItem('seasalt_user_phone',userPhone);
        localStorage.setItem('seasalt_spin_phone',userPhone);localStorage.setItem('seasalt_spin_done','true');
        localStorage.setItem(WK,JSON.stringify({amount:wonAmt,addedAt:now.toISOString(),expiresAt:exp.toISOString()}));
        // Supabase save
        fetch(SU+'/rest/v1/users?phone=eq.'+encodeURIComponent(userPhone),{headers:{'apikey':SK,'Authorization':'Bearer '+SK}})
        .then(function(r){return r.json();}).then(function(ex){
            var d={name:userName,selected_country:uCountry,wallet_balance:wonAmt,wallet_expires_at:exp.toISOString(),last_seen:now.toISOString(),spin_prize:'\u20b9'+wonAmt};
            if(ex&&ex.length>0)return fetch(SU+'/rest/v1/users?phone=eq.'+encodeURIComponent(userPhone),{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK,'Prefer':'return=minimal'},body:JSON.stringify(d)});
            else return fetch(SU+'/rest/v1/users',{method:'POST',headers:{'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK,'Prefer':'return=minimal'},body:JSON.stringify({phone:userPhone,total_visits:1,name:userName,selected_country:uCountry,wallet_balance:wonAmt,wallet_expires_at:exp.toISOString(),last_seen:now.toISOString(),spin_prize:'\u20b9'+wonAmt})});
        }).then(function(){
            return fetch(SU+'/rest/v1/wallet_transactions',{method:'POST',headers:{'Content-Type':'application/json','apikey':SK,'Authorization':'Bearer '+SK,'Prefer':'return=minimal'},body:JSON.stringify({user_phone:userPhone,amount:wonAmt,type:'spin_reward',description:'Spin reward \u20b9'+wonAmt,balance_after:wonAmt})});
        }).catch(function(e){console.warn('[SpinWheel] DB error:',e);});
        // UI update
        if(typeof UI!=='undefined'){try{var w=UI.getSpinWallet?UI.getSpinWallet():null;if(w)UI.updateWalletDisplay(w);UI.updateCartUI();if(UI.startWalletTimer)UI.startWalletTimer();}catch(e){}}
        try{var wb=document.getElementById('wallet-btn'),wbl=document.getElementById('wallet-balance');
            if(wb&&wbl){wb.classList.add('has-timer');var tl=exp-new Date(),h=Math.floor(tl/36e5),m=Math.floor((tl%36e5)/6e4),s=Math.floor((tl%6e4)/1e3);
            wbl.innerHTML='<span class="wallet-amount">\u20b9'+wonAmt+'</span><span class="wallet-timer">\u23F1 '+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s+'</span>';}}catch(e){}
        window.dispatchEvent(new CustomEvent('walletUpdated',{detail:{amount:wonAmt,expiresAt:exp.toISOString()}}));
        hide();toast('\uD83C\uDF8A \u20b9'+wonAmt+' added to wallet! Use within 48 hours.','success');
        setTimeout(function(){if(typeof UI!=='undefined'){try{var w=UI.getSpinWallet?UI.getSpinWallet():null;if(w){UI.updateWalletDisplay(w);UI.updateCartUI();if(UI.startWalletTimer)UI.startWalletTimer();}}catch(e){}}startBkTimer(exp);},600);
    }
    var bkInt=null;
    function startBkTimer(exp){if(bkInt)clearInterval(bkInt);bkInt=setInterval(function(){var wbl=document.getElementById('wallet-balance');if(!wbl)return;var tl=new Date(exp)-new Date();if(tl<=0){clearInterval(bkInt);localStorage.removeItem(WK);var wb=document.getElementById('wallet-btn');if(wb)wb.classList.remove('has-timer');wbl.textContent='\u20b90';return;}var te=wbl.querySelector('.wallet-timer');if(te){var h=Math.floor(tl/36e5),m=Math.floor((tl%36e5)/6e4),s=Math.floor((tl%6e4)/1e3);te.textContent='\u23F1 '+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;}},1000);}
    function shouldShow(){return !localStorage.getItem('seasalt_spin_done');}
    function show(){if(!modal)createModal();modal.classList.add('active');document.body.style.overflow='hidden';}
    function hide(){if(!modal)return;modal.classList.remove('active');document.body.style.overflow='';}
    function toast(msg,t){var e=document.createElement('div');e.style.cssText='position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:13px 26px;border-radius:14px;color:#fff;font-weight:600;z-index:99999;max-width:90%;text-align:center;font-size:14px;box-shadow:0 8px 28px rgba(0,0,0,.3);background:'+(t==='success'?'linear-gradient(135deg,#10B981,#059669)':t==='error'?'linear-gradient(135deg,#EF4444,#DC2626)':'linear-gradient(135deg,#F59E0B,#D97706)');e.textContent=msg;document.body.appendChild(e);setTimeout(function(){if(e.parentNode)e.remove();},4000);}
    function init(){
        console.log('[SpinWheel] v17 init');
        if(!document.getElementById('wallet-timer-css')){var st=document.createElement('style');st.id='wallet-timer-css';st.textContent='#wallet-btn.has-timer{background:linear-gradient(135deg,#f97316,#ea580c)!important;color:#fff!important;padding:6px 12px!important;animation:walletGlow 2s ease-in-out infinite}#wallet-btn.has-timer svg{stroke:#fff!important}#wallet-btn.has-timer #wallet-balance{display:flex!important;flex-direction:column!important;align-items:center!important;line-height:1.1!important;gap:1px!important}.wallet-amount{font-size:14px!important;font-weight:700!important;color:#fff!important}.wallet-timer{font-size:9px!important;font-weight:600!important;color:rgba(255,255,255,.9)!important;font-family:monospace!important;background:rgba(0,0,0,.2)!important;padding:1px 6px!important;border-radius:4px!important}@keyframes walletGlow{0%,100%{box-shadow:0 2px 10px rgba(249,115,22,.4)}50%{box-shadow:0 2px 20px rgba(249,115,22,.6)}}';document.head.appendChild(st);}
        var ew=localStorage.getItem(WK);
        if(ew){try{var d=JSON.parse(ew);if(d.amount>0&&new Date(d.expiresAt)>new Date()){
            if(typeof UI!=='undefined'){UI.updateCartUI();if(UI.startWalletTimer)UI.startWalletTimer();}
            try{var wb=document.getElementById('wallet-btn'),wbl=document.getElementById('wallet-balance');if(wb&&wbl){wb.classList.add('has-timer');var tl=new Date(d.expiresAt)-new Date(),h=Math.floor(tl/36e5),m=Math.floor((tl%36e5)/6e4),s=Math.floor((tl%6e4)/1e3);wbl.innerHTML='<span class="wallet-amount">\u20b9'+d.amount+'</span><span class="wallet-timer">\u23F1 '+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s+'</span>';}}catch(e){}
            startBkTimer(new Date(d.expiresAt));
        }}catch(e){}}
        if(shouldShow())setTimeout(show,1000);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
    window.SpinWheel={init:init,show:show,hide:hide};
})();
