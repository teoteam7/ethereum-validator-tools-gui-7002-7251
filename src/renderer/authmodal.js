(function () {
  'use strict';

  var api = (window.api) ? window.api : {};
  var TIMEOUT_MS = 2000;
  var RESOLVE_DEBOUNCE_MS = 600;

  function applyThemeToModal(theme){
    var root = document.getElementById('authmodal-root');
    if (root) root.setAttribute('data-theme', theme);
  }
  function setThemeImmediate(theme){
    var t = (String(theme||'').toLowerCase()==='light') ? 'light' : 'dark';
    if (globalThis.AppTheme && typeof globalThis.AppTheme.setTheme==='function'){
      globalThis.AppTheme.setTheme(t);
    } else {
      document.documentElement.setAttribute('data-theme', t);
      try{ localStorage.setItem('app.theme', t); }catch(_){}
      var ev = new CustomEvent('theme:changed', { detail:{ theme:t } });
      globalThis.dispatchEvent(ev);
    }
    applyThemeToModal(t);
    var ids = ['am-theme','stTheme','setTheme'];
    ids.forEach(function(id){
      var sel = document.getElementById(id);
      if (!sel) return;
      for (var i=0;i<sel.options.length;i++){
        var v = (sel.options[i].value||sel.options[i].text).toLowerCase();
        if (v===t){ sel.value = sel.options[i].value||sel.options[i].text; break; }
      }
    });
  }
  function getSavedTheme(){
    try{ var v=localStorage.getItem('app.theme'); return v? v : 'dark'; }catch(_){ return 'dark'; }
  }
  globalThis.addEventListener('theme:changed', function(e){
    var t = (e && e.detail && e.detail.theme) ? e.detail.theme : getSavedTheme();
    applyThemeToModal(t);
  });

  var ETH_ANIM_DATA = {"nm":"Ethereum","ddd":0,"h":600,"w":600,"meta":{"g":"@lottiefiles/toolkit-js 0.65.0"},"layers":[{"ty":0,"nm":"Pre-comp 1","sr":1,"st":-9,"op":61,"ip":-9,"ln":"50","hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[300,300]},"s":{"a":1,"k":[{"s":[100,100,100],"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":43},{"s":[117,117,98.319],"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":49},{"s":[100,100,85.47],"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":52}]},"p":{"a":0,"k":[300,300]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"w":600,"h":600,"refId":"1","ind":1}],"v":"5.7.0","fr":30,"op":61,"ip":0,"assets":[{"nm":"Pre-comp 1","id":"1","layers":[{"ty":4,"nm":"Layer 5 Outlines","sr":1,"st":9,"op":54984,"ip":9,"ln":"39","hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[56.266,92.344,0]},"s":{"a":0,"k":[100,100]},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[243.984,-164.605,0],"t":9},{"s":[243.984,211.395,0],"t":38}]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"shapes":[{"ty":"gr","nm":"Group 1","it":[{"ty":"sh","nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0]],"v":[[56.017,-92.094],[-56.017,92.094],[56.017,41.17]]}}},{"ty":"fl","nm":"Fill 1","c":{"a":0,"k":[0.5294,0.5686,0.6941]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"p":{"a":0,"k":[56.266,92.344]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":1},{"ty":4,"nm":"Layer 4 Outlines","sr":1,"st":9,"op":54984,"ip":9,"ln":"38","hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[56.267,92.344,0]},"s":{"a":0,"k":[100,100]},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[356.016,-164.605,0],"t":9},{"s":[356.016,211.395,0],"t":38}]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"shapes":[{"ty":"gr","nm":"Group 1","it":[{"ty":"sh","nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0]],"v":[[-56.016,-92.094],[56.016,92.094],[-56.016,41.17]]}}},{"ty":"fl","nm":"Fill 1","c":{"a":0,"k":[0.3961,0.4118,0.5686]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"p":{"a":0,"k":[56.266,92.344]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":2},{"ty":4,"nm":"Layer 3 Outlines","sr":1,"st":9,"op":54984,"ip":9,"ln":"37","hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[56.267,58.238,0]},"s":{"a":0,"k":[100,100]},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[243.983,-65.446,0],"t":9},{"s":[243.983,310.554,0],"t":38}]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"shapes":[{"ty":"gr","nm":"Group 1","it":[{"ty":"sh","nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0]],"v":[[-56.016,25.462],[56.016,-25.462],[56.016,25.462]]}}},{"ty":"fl","nm":"Fill 1","c":{"a":0,"k":[0.3961,0.4118,0.5686]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"p":{"a":0,"k":[56.266,25.712]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","nm":"Group 2","it":[{"ty":"sh","nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0]],"v":[[-56.016,-32.526],[56.016,32.526],[56.016,-32.526]]}}},{"ty":"fl","nm":"Fill 1","c":{"a":0,"k":[0.3961,0.4118,0.5686]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"p":{"a":0,"k":[56.266,83.7]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":3},{"ty":4,"nm":"Layer 2 Outlines","sr":1,"st":9,"op":54984,"ip":9,"ln":"36","hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[56.267,58.238,0]},"s":{"a":0,"k":[100,100]},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[356.017,-65.446,0],"t":9},{"s":[356.017,310.554,0],"t":38}]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"shapes":[{"ty":"gr","nm":"Group 1","it":[{"ty":"sh","nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0]],"v":[[56.017,-32.526],[-56.017,32.526],[-56.017,-32.526]]}}},{"ty":"fl","nm":"Fill 1","c":{"a":0,"k":[0.2745,0.2941,0.4627]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"p":{"a":0,"k":[56.266,83.7]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","nm":"Group 2","it":[{"ty":"sh","nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0]],"v":[[56.017,25.462],[-56.017,-25.462],[-56.017,25.462]]}}},{"ty":"fl","nm":"Fill 1","c":{"a":0,"k":[0.2745,0.2941,0.4627]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"p":{"a":0,"k":[56.266,25.712]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":4},{"ty":4,"nm":"Layer 6 Outlines","sr":1,"st":0,"op":54975,"ip":0,"ln":"35","hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[56.267,78.465,0]},"s":{"a":0,"k":[100,100]},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[356.017,712.485,0],"t":9},{"s":[356.017,402.485,0],"t":38}]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"shapes":[{"ty":"gr","nm":"Group 1","it":[{"ty":"sh","nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0]],"v":[[56.017,-78.215],[-56.017,78.215],[-56.017,-13.163]]}}},{"ty":"fl","nm":"Fill 1","c":{"a":0,"k":[0.3961,0.4118,0.5686]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"p":{"a":0,"k":[56.266,78.464]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":5},{"ty":4,"nm":"Layer 1 Outlines","sr":1,"st":0,"op":54975,"ip":0,"ln":"34","hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[56.267,78.465,0]},"s":{"a":0,"k":[100,100]},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[243.983,712.485,0],"t":9},{"s":[243.983,402.485,0],"t":38}]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"shapes":[{"ty":"gr","nm":"Group 1","it":[{"ty":"sh","nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0]],"v":[[-56.016,-78.215],[56.016,78.215],[56.016,-13.163]]}}},{"ty":"fl","nm":"Fill 1","c":{"a":0,"k":[0.5294,0.5686,0.6941]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"p":{"a":0,"k":[56.266,78.464]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":6}]}]};

  function injectStyles() {
    if (document.getElementById('am-styles')) return;
    var css = [
      '.am-portal{position:fixed;left:0;top:0;right:0;bottom:0;z-index:999999;display:none;}',
      '.am-portal.show{display:block;}',
      '.am-backdrop{position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.90);}',
      '.am-box{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(900px,62vw);height:min(700px,68vh);background:#0f1218;color:#eef0f4;border:1px solid rgba(255,255,255,.15);display:flex;flex-direction:column;box-shadow:0 30px 90px rgba(0,0,0,.65);overflow:hidden;}',
      '@media (max-width:900px){.am-box{width:90vw;height:78vh;}}',
      '.am-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,0));}',
      '.am-title{font-weight:900;letter-spacing:.3px;font-size:15px;}',
      '.am-head-right{display:flex;gap:8px;align-items:center;}',
      '.am-badge{padding:5px 9px;font-size:12px;background:#111823;border:1px solid rgba(255,255,255,.12);}',
      '.am-body{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:10px 12px;overflow:auto;flex:1 1 auto;text-align:center;}',
      '.am-foot{display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 16px;border-top:1px solid rgba(255,255,255,.12);background:linear-gradient(0deg,rgba(255,255,255,.03),rgba(255,255,255,0));box-sizing:border-box;flex:0 0 auto;}',
      '.am-slot-left{display:flex;align-items:center;gap:8px;height:100%;}',
      '.am-slot-center{flex:1;display:flex;align-items:center;justify-content:center;height:100%;}',
      '.am-slot-right{display:flex;align-items:center;gap:8px;height:100%;}',
      '.am-intro-wrap{width:100%;display:flex;align-items:flex-start;justify-content:center;margin-top:0;}',
      '.am-intro-stack{display:flex;flex-direction:column;align-items:center;gap:2px;}',
      '.am-anim-wrap{position:relative;width:260px;height:260px;}',
      '.am-anim-holder{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:260px;height:260px;z-index:1;}',
      '.am-sphere{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:160px;height:160px;border-radius:999px;opacity:0;z-index:0;background:radial-gradient(circle at 50% 50%, rgba(34,211,238,.10) 0%, rgba(34,211,238,.06) 35%, rgba(0,0,0,0) 60%),repeating-radial-gradient(circle at 50% 50%, rgba(110,231,240,.10) 0px, rgba(110,231,240,.10) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 8px),repeating-conic-gradient(from 0deg, rgba(110,231,240,.08) 0deg, rgba(110,231,240,0) 8deg, rgba(110,231,240,0) 18deg, rgba(110,231,240,.08) 20deg);filter:blur(.3px);transition:opacity .6s ease;}',
      '.am-sphere.show{opacity:.22;}',
      '.am-svg{width:100%;height:100%;display:block;z-index:1;}',
      '.am-divider{height:2px;background:linear-gradient(90deg,#6ee7f0,#22d3ee);width:0;transition:width .7s ease;margin:0;}',
      '.am-kicker{margin-top:2px;margin-bottom:2px;font-size:12px;letter-spacing:.35em;text-transform:uppercase;font-weight:900;color:#a7f3f7;opacity:.92;}',
      '.am-intro-text{margin:8px auto 0 auto;max-width:760px;min-height:64px;color:#cbd5e1;font-size:14px;line-height:1.5;text-align:center;white-space:pre-wrap;padding:0 6px;}',
      '.am-go{display:flex;justify-content:center;align-items:center;visibility:hidden;opacity:0;transition:opacity .3s ease;}',
      '.am-go.show{visibility:visible;opacity:1;}',
      '.am-cta-left,.am-cta-right{display:flex;align-items:center;gap:8px;margin:0;}',
      '.am-outline{position:relative;}',
      '.am-outline select{appearance:none;-webkit-appearance:none;-moz-appearance:none;height:28px;line-height:28px;padding:0 22px 0 10px;border:1px solid rgba(255,255,255,.9);background:transparent;color:#eef0f4;border-radius:0;text-align:center;text-align-last:center;cursor:pointer;font-size:12px;}',
      '.am-outline:after{content:"";position:absolute;right:9px;top:50%;margin-top:-3px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #eef0f4;pointer-events:none;}',
      '.am-stepper{display:flex;align-items:center;gap:8px;}',
      '.am-step{display:flex;align-items:center;gap:6px;color:#9aa3b2;}',
      '.am-step-bullet{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.25);border-radius:50%;font-weight:900;font-size:9px;color:#9aa3b2;text-align:center;line-height:12px;box-sizing:border-box;padding-bottom:1px;}',
      '.am-step-label{font-size:10.5px;font-weight:800;letter-spacing:.2px;}',
      '.am-step.is-active .am-step-bullet{border-color:#22d3ee;color:#001419;background:#22d3ee;box-shadow:0 0 0 2px rgba(34,211,238,.2);}',
      '.am-step.is-active .am-step-label{color:#eef0f4;}',
      '.am-step-line{width:24px;height:2px;background:rgba(255,255,255,.12);}',
      '.am-step-line.is-active{background:linear-gradient(90deg,#6ee7f0,#22d3ee);}',
      '.am-hero{position:relative;width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:10px;}',
      '.am-hero .am-sphere-hero{position:absolute;left:50%;top:65px;transform:translate(-50%,-50%);width:130px;height:130px;border-radius:999px;opacity:0;z-index:0;background:radial-gradient(circle at 50% 50%, rgba(34,211,238,.08) 0%, rgba(34,211,238,.05) 35%, rgba(0,0,0,0) 60%),repeating-radial-gradient(circle at 50% 50%, rgba(110,231,240,.08) 0px, rgba(110,231,240,.08) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 8px),repeating-conic-gradient(from 0deg, rgba(110,231,240,.06) 0deg, rgba(110,231,240,0) 8deg, rgba(110,231,240,0) 18deg, rgba(110,231,240,.06) 20deg);filter:blur(.4px);transition:opacity .6s ease;}',
      '.am-hero .am-sphere-hero.show{opacity:.18;}',
      '.am-hero .am-anim-holder{position:static;transform:none;width:110px;height:110px;max-width:22vw;max-height:22vh;z-index:1;}',
      '.am-hero .am-divider{width:110px;}',
      '.am-section{margin-top:10px;width:min(760px,90%);margin-left:auto;margin-right:auto;}',
      '.am-h{font-weight:900;letter-spacing:.2px;font-size:15px;margin-bottom:6px;text-align:center;}',
      '.am-note{color:#98a2b3;font-size:13px;text-align:center;}',
      '.am-row{display:grid;grid-template-columns:1fr;gap:8px;justify-items:center;width:min(760px,90%);margin:0 auto;}',
      '.am-row2lr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;width:min(520px,94%);margin:0 auto;}',
      '.am-ctrl{display:flex;align-items:center;gap:6px;justify-content:flex-end;}',
      '.am-select{position:relative;width:min(520px,94%);}',
      '.am-select select{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding-right:26px;text-align:center;text-align-last:center;}',
      '.am-field{position:relative;width:min(520px,94%);}',
      '.am-field input,.am-field select{width:100%;height:38px;padding:8px 10px;background:#0c1016;color:#eef0f4;border:1px solid rgba(255,255,255,.16);transition:border-color .15s,box-shadow .15s;padding-right:12px;text-align:center;line-height:1;}',
      '.am-field input::placeholder{color:#98a2b3;text-align:center;}',
      '.am-field input:focus,.am-field select:focus{border-color:#22d3ee;box-shadow:0 0 0 2px rgba(34,211,238,.22);}',
      '.am-field.is-loading input{padding-right:44px;border-color:#22d3ee;box-shadow:0 0 0 2px rgba(34,211,238,.20);}',
      '.am-inline-load{position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;gap:3px;}',
      '.am-inline-load i{width:6px;height:6px;border-radius:999px;background:#22d3ee;opacity:.32;animation:amDots 1s infinite ease-in-out;}',
      '.am-inline-load i:nth-child(2){animation-delay:.14s;}',
      '.am-inline-load i:nth-child(3){animation-delay:.28s;}',
      '@keyframes amDots{0%,80%,100%{transform:translateY(0);opacity:.32;}40%{transform:translateY(-4px);opacity:1;}}',
      '.am-chip{display:inline-flex;gap:6px;align-items:center;font-size:11px;padding:4px 8px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:#dbeafe;}',
      '.am-chip.ok{background:#0f1a13;border-color:#1f3f2b;color:#7ae6b8;}',
      '.am-chip.bad{background:#1a0f0f;border-color:#3f1f1f;color:#ffbdbd;}',
      '.am-btn{height:30px;line-height:30px;padding:0 12px;border:1px solid rgba(255,255,255,.16);background:#0c1013;color:#eef0f4;font-weight:800;font-size:12.5px;cursor:pointer;transition:border-color .15s,box-shadow .15s,filter .15s;border-radius:0;}',
      '.am-btn:hover{border-color:#22d3ee;box-shadow:0 0 0 2px rgba(34,211,238,.25);}',
      '.am-btn.primary{background:#22d3ee;color:#001419;border-color:#22d3ee;}',
      '.am-btn.primary:hover{filter:brightness(1.06);}',
      '.am-btn.ghost{background:transparent;}',
      '.am-warn{margin-top:8px;color:#ffbdbd;background:#170b0b;border:1px solid rgba(239,68,68,.35);padding:8px;display:none;text-align:center;}',
      '.am-ok{margin-top:8px;color:#c7f9d4;background:#0f1a13;border:1px solid rgba(34,197,94,.35);padding:8px;display:none;text-align:center;}',
      '.am-locked-img{width:56px;height:56px;object-fit:contain;display:block;margin:4px auto 4px auto;opacity:.92;filter:drop-shadow(0 2px 8px rgba(0,0,0,.35));}',
      '.am-cfm-back{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);z-index:1000000;}',
      '.am-cfm-back.show{display:flex;}',
      '.am-cfm{width:min(520px,92vw);background:#0f1218;color:#eef0f4;border:1px solid rgba(255,255,255,.15);box-shadow:0 30px 90px rgba(0,0,0,.65);}',
      '.am-cfm-head{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.12);font-weight:900;}',
      '.am-cfm-body{padding:12px 14px;display:grid;gap:8px;}',
      '.am-cfm-row input{width:100%;height:38px;background:#0c1016;color:#eef0f4;border:1px solid rgba(255,255,255,.16);padding:0 10px;}',
      '.am-cfm-warn{color:#ffbdbd;}',
      '.am-cfm-actions{display:flex;justify-content:flex-end;gap:8px;padding:10px 14px;border-top:1px solid rgba(255,255,255,.12);}',
      '.am-cfm-btn{height:34px;padding:0 12px;border:1px solid rgba(255,255,255,.16);background:#0c1013;color:#eef0f4;cursor:pointer;}',
      '.am-cfm-btn.danger{background:#ef4444;border-color:#ef4444;color:#001419;}',
      '.am-cfm-btn.ghost{background:transparent;}',
      'html[data-theme="light"] .am-box, #authmodal-root[data-theme="light"] .am-box{background:#ffffff;color:#0f172a;border-color:rgba(0,0,0,.12)}',
      'html[data-theme="light"] .am-head, #authmodal-root[data-theme="light"] .am-head{border-color:rgba(0,0,0,.12);background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,0))}',
      'html[data-theme="light"] .am-foot, #authmodal-root[data-theme="light"] .am-foot{border-color:rgba(0,0,0,.12);background:linear-gradient(0deg,rgba(0,0,0,.03),rgba(0,0,0,0))}',
      'html[data-theme="light"] .am-outline select, #authmodal-root[data-theme="light"] .am-outline select{border-color:rgba(0,0,0,.18);color:#0f172a}',
      'html[data-theme="light"] .am-field input, html[data-theme="light"] .am-field select, #authmodal-root[data-theme="light"] .am-field input, #authmodal-root[data-theme="light"] .am-field select{background:#ffffff;color:#0f172a;border:1px solid rgba(0,0,0,.18)}',
      'html[data-theme="light"] .am-field input::placeholder, #authmodal-root[data-theme="light"] .am-field input::placeholder{color:#6b7280}',
      'html[data-theme="light"] .am-btn, #authmodal-root[data-theme="light"] .am-btn{background:#f3f4f6;color:#0f172a;border-color:rgba(0,0,0,.18)}',
      'html[data-theme="light"] .am-btn.primary, #authmodal-root[data-theme="light"] .am-btn.primary{background:#22d3ee;color:#001419;border-color:#22d3ee}',
      'html[data-theme="light"] .am-chip, #authmodal-root[data-theme="light"] .am-chip{background:#f3f4f6;color:#0f172a;border-color:rgba(0,0,0,.18)}',
      'html[data-theme="light"] .am-warn, #authmodal-root[data-theme="light"] .am-warn{background:#fff1f2;color:#991b1b;border-color:#fecaca}',
      'html[data-theme="light"] .am-ok, #authmodal-root[data-theme="light"] .am-ok{background:#ecfdf5;color:#065f46;border-color:#a7f3d0}',
      'html[data-theme="light"] .am-intro-text, #authmodal-root[data-theme="light"] .am-intro-text{color:#0f172a}',
      'html[data-theme="light"] .am-note, #authmodal-root[data-theme="light"] .am-note{color:#334155}',
      'html[data-theme="light"] .am-step, #authmodal-root[data-theme="light"] .am-step{color:#334155}',
      'html[data-theme="light"] .am-step-bullet, #authmodal-root[data-theme="light"] .am-step-bullet{border-color:rgba(0,0,0,.35);color:#334155}',
      'html[data-theme="light"] .am-step-line, #authmodal-root[data-theme="light"] .am-step-line{background:rgba(0,0,0,.14)}',
      'html[data-theme="light"] .am-step.is-active .am-step-label, #authmodal-root[data-theme="light"] .am-step.is-active .am-step-label{color:#0f172a}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'am-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function byId(id){ return document.getElementById(id); }
  function val(id){ var el=byId(id); return el? String(el.value||'').trim() : ''; }
  function setVal(id,v){ var el=byId(id); if(el) el.value=v; }
  function show(el,mode){ if(el) el.style.display = mode || 'block'; }
  function hide(el){ if(el) el.style.display='none'; }
  function setText(id,t){ var el=byId(id); if(el) el.textContent=t; }
  function isHex48(s){ return /^0x[0-9a-fA-F]{96}$/.test(s||''); }
  function isDigits(s){ return /^\d+$/.test(s||''); }

  function setFieldLoading(targetInputId,on){
    var input=byId(targetInputId); if(!input) return;
    var wrap=input.parentNode; if(!wrap||!wrap.classList) return;
    var node=wrap.querySelector?wrap.querySelector('.am-inline-load'):null;
    if(on){
      if(!node){
        node=document.createElement('div'); node.className='am-inline-load';
        var a=document.createElement('i'); var b=document.createElement('i'); var c=document.createElement('i');
        node.appendChild(a); node.appendChild(b); node.appendChild(c);
        wrap.appendChild(node);
      }
      wrap.classList.add('is-loading');
      input.setAttribute('aria-busy','true');
    }else{
      if(node&&node.parentNode) node.parentNode.removeChild(node);
      wrap.classList.remove('is-loading');
      input.removeAttribute('aria-busy');
    }
  }

  function colorArrToHex(arr){ var r=Math.round((arr[0]||0)*255),g=Math.round((arr[1]||0)*255),b=Math.round((arr[2]||0)*255); function hx(n){var s=n.toString(16);return s.length<2?('0'+s):s;} return '#'+hx(r)+hx(g)+hx(b); }
  function makeSvg(w,h){ var s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('viewBox','0 0 '+w+' '+h); s.setAttribute('class','am-svg'); s.setAttribute('width','100%'); s.setAttribute('height','100%'); s.setAttribute('shape-rendering','geometricPrecision'); return s; }
  function makeGroup(){ return document.createElementNS('http://www.w3.org/2000/svg','g'); }
  function makePolygon(points,fill){ var p=document.createElementNS('http://www.w3.org/2000/svg','polygon'); p.setAttribute('points',points); p.setAttribute('fill',fill); return p; }
  function setTransform(el, tx, ty, scale){ var s=(scale!=null)?scale:1; el.setAttribute('transform','translate('+tx+','+ty+') scale('+s+')'); }
  function setTransform3(el, tx, ty, sx, ox, oy){ el.setAttribute('transform','translate('+tx+','+ty+') translate('+ox+','+oy+') scale('+sx+') translate('+(-ox)+','+(-oy)+')'); }
  function pointsFromV(vArr,offset){ var i,pts=[],x,y; for(i=0;i<vArr.length;i++){ x=vArr[i][0]+(offset?offset[0]:0); y=vArr[i][1]+(offset?offset[1]:0); pts.push(x+','+y); } return pts.join(' '); }
  function interpKF(fr, kfArr){ if(!kfArr||!kfArr.length) return 1; if(fr<=kfArr[0].t) return kfArr[0].s[0]; for(var i=0;i<kfArr.length-1;i++){ var a=kfArr[i],b=kfArr[i+1]; if(fr>=a.t&&fr<=b.t){ var p=(fr-a.t)/(b.t-a.t); return a.s[0]+(b.s[0]-a.s[0])*p; } } return kfArr[kfArr.length-1].s[0]; }

  function buildLayer(svg,layer){
    var gLayer=makeGroup(); svg.appendChild(gLayer);
    var la=(layer.ks&&layer.ks.a&&layer.ks.a.k)?layer.ks.a.k:[0,0,0];
    var anchorX=la[0]||0, anchorY=la[1]||0;
    var shapes=layer.shapes||[],i,j;
    for(i=0;i<shapes.length;i++){
      var gr=shapes[i]; if(gr.ty!=='gr') continue;
      var sh=null,fl=null,trp=[0,0]; var items=gr.it||[];
      for(j=0;j<items.length;j++){
        var it=items[j];
        if(it.ty==='sh'&&it.ks&&it.ks.k&&it.ks.k.v){sh=it;}
        if(it.ty==='fl'&&it.c&&it.c.k){fl=it;}
        if(it.ty==='tr'&&it.p&&it.p.k){trp=[(it.p.k[0]||0),(it.p.k[1]||0)];}
      }
      if(sh&&fl){
        var pts=pointsFromV(sh.ks.k.v,trp);
        var col=colorArrToHex(fl.c.k);
        var poly=makePolygon(pts,col);
        gLayer.appendChild(poly);
      }
    }
    var posKF=null;
    if(layer.ks&&layer.ks.p){
      if(layer.ks.p.a===1&&layer.ks.p.k&&layer.ks.p.k.length>=2){
        var k0=layer.ks.p.k[0].s,k1=layer.ks.p.k[1].s,t0=layer.ks.p.k[0].t,t1=layer.ks.p.k[1].t;
        posKF={x0:k0[0],y0:k0[1],x1:k1[0],y1:k1[1],t0:t0,t1:t1};
      }else if(layer.ks.p.k&&layer.ks.p.k.length){
        posKF={x0:layer.ks.p.k[0],y0:layer.ks.p.k[1],x1:layer.ks.p.k[0],y1:layer.ks.p.k[1],t0:0,t1:1};
      }
    }
    function update(frame){
      if(!posKF){ setTransform(gLayer, -anchorX, -anchorY, 1); return frame>=9999; }
      var t=frame,f0=posKF.t0,f1=posKF.t1,p;
      if(t<=f0)p=0; else if(t>=f1)p=1; else p=(t-f0)/(f1-f0);
      var cx=posKF.x0+(posKF.x1-posKF.x0)*p, cy=posKF.y0+(posKF.y1-posKF.y0)*p;
      setTransform(gLayer, Math.round(cx - anchorX), Math.round(cy - anchorY), 1);
      return (t>=f1);
    }
    return update;
  }

  function playEthereumInto(container,onDone){
    var data=ETH_ANIM_DATA,w=data.w||600,h=data.h||600,svg=makeSvg(w,h);
    container.innerHTML=''; container.appendChild(svg);
    var gComp=makeGroup(); svg.appendChild(gComp);
    var precomp=(data.layers&&data.layers[0])?data.layers[0]:null;
    var compScaleKF=(precomp&&precomp.ks&&precomp.ks.s&&precomp.ks.s.a===1)?precomp.ks.s.k:null;
    var assets=(data.assets&&data.assets[0]&&data.assets[0].layers)?data.assets[0].layers:[];
    var updaters=[],i;
    for(i=0;i<assets.length;i++){
      if(assets[i].ty===4){
        var wrap=makeGroup(); gComp.appendChild(wrap);
        updaters.push((function(layer,wr){ var inner=buildLayer(wr,layer); return function(frame){ return inner(frame); }; })(assets[i],wrap));
      }
    }
    var fr=data.fr||30,endFrame=38,startFrame=9,startTs=0,finished=false;
    function applyCompScale(frame){
      var s=100; if(compScaleKF){ s=interpKF(frame,compScaleKF); }
      var scale=(s||100)/100;
      setTransform3(gComp,0,0,scale,300,300);
    }
    function tick(ts){
      if(!startTs) startTs=ts;
      var elapsed=ts-startTs,frame=Math.floor(startFrame+(elapsed/1000)*fr),allDone=true,j;
      applyCompScale(frame);
      for(j=0;j<updaters.length;j++){ if(!updaters[j](frame)) allDone=false; }
      if(frame<endFrame&&!allDone){ requestAnimationFrame(tick); }
      else{
        applyCompScale(endFrame);
        for(j=0;j<updaters.length;j++){ updaters[j](endFrame); }
        if(!finished){ finished=true; if(onDone) onDone(svg); }
      }
    }
    requestAnimationFrame(tick);
  }

  function ensureRoot(){ var root=byId('authmodal-root'); if(!root){ root=document.createElement('div'); root.id='authmodal-root'; document.body.appendChild(root); } return root; }
  function mountShell(mode){
    injectStyles();
    var root=ensureRoot();
    root.setAttribute('data-theme', getSavedTheme());
    root.innerHTML=
      '<div class="am-portal show" id="am-portal">'
      + '<div class="am-backdrop"></div>'
      + '<div class="am-box" role="dialog" aria-modal="true" aria-labelledby="am-title">'
      +   '<div class="am-head" id="am-head">'
      +     '<div class="am-title" id="am-title">'+(mode==='unlock'?'Unlock':'')+'</div>'
      +     '<div class="am-head-right"><div class="am-badge">VT Auth</div></div>'
      +   '</div>'
      +   '<div class="am-body" id="am-body"></div>'
      +   '<div class="am-foot" id="am-foot"></div>'
      + '</div>'
      + '<div class="am-cfm-back" id="am-cfm-back">'
      +   '<div class="am-cfm" role="dialog" aria-modal="true" aria-labelledby="am-cfm-title">'
      +     '<div class="am-cfm-head" id="am-cfm-title">Confirm reset</div>'
      +     '<div class="am-cfm-body">'
      +       '<div>This will remove local password and profile (vt.lock.json and vt.profile.json) and restart the auth flow.</div>'
      +       '<div class="am-cfm-row">Type RESET to confirm:</div>'
      +       '<div class="am-cfm-row"><input id="am-cfm-input" placeholder="RESET"></div>'
      +       '<div class="am-cfm-warn" id="am-cfm-warn"></div>'
      +     '</div>'
      +     '<div class="am-cfm-actions">'
      +       '<button class="am-cfm-btn ghost" id="am-cfm-cancel">Cancel</button>'
      +       '<button class="am-cfm-btn danger" id="am-cfm-confirm">Confirm reset</button>'
      +     '</div>'
      +   '</div>'
      + '</div>'
      +'</div>';
  }
  function closePortal(){ var p=byId('am-portal'); if(p) p.classList.remove('show'); var r=byId('authmodal-root'); if(r) r.innerHTML=''; }

  function openConfirm(){
    var back=byId('am-cfm-back'); var warn=byId('am-cfm-warn'); if(warn) hide(warn); if(back) back.classList.add('show');
    var cancelBtn=byId('am-cfm-cancel'); var confirmBtn=byId('am-cfm-confirm'); var input=byId('am-cfm-input');
    if(cancelBtn) cancelBtn.onclick=function(){ if(back) back.classList.remove('show'); };
    if(confirmBtn) confirmBtn.onclick=function(){
      var t=input? String(input.value||'').trim() : '';
      if(t!=='RESET'){ if(warn){ warn.textContent='Please type RESET exactly.'; show(warn); } return; }
      if(warn) hide(warn);
      try{
        if(api.resetAll){
          api.resetAll({wipeProfile:true}).then(function(){ try{localStorage.clear();}catch(e){} location.reload(); })
          .catch(function(e){ if(warn){ warn.textContent=(e&&e.message)?e.message:'Reset failed'; show(warn); } });
        }else{ try{localStorage.clear();}catch(e2){} location.reload(); }
      }catch(e3){ if(warn){ warn.textContent=(e3&&e3.message)?e3.message:'Reset error'; show(warn); } }
    };
    if(input){ input.value=''; input.onkeydown=function(e){ if(e.key==='Enter'&&confirmBtn) confirmBtn.click(); }; input.focus(); }
  }

  function renderUnlock(){
    mountShell('unlock');
    var boxUnlock = document.querySelector('.am-box');
    if (boxUnlock) { boxUnlock.classList.add('no-head'); boxUnlock.classList.add('is-unlock'); boxUnlock.classList.remove('is-intro'); }
    var body=byId('am-body'); var foot=byId('am-foot');
    var head=byId('am-head'); if(head) head.style.display='none';
    body.innerHTML =
      '<div class="am-intro-wrap">'
      +  '<div class="am-intro-stack">'
      +    '<div class="am-anim-wrap">'
      +      '<div class="am-anim-holder" id="am-anim-unlock"></div>'
      +      '<div class="am-sphere" id="am-sphere-unlock"></div>'
      +    '</div>'
      +    '<div class="am-kicker">VALIDATOR TOOLS</div>'
      +    '<div class="am-divider" id="am-divider-unlock" style="width:0;"></div>'
      +  '</div>'
      + '</div>'
      + '<div class="am-unlock-form" style="margin-top:8px;">'
      +   '<div class="am-note">Enter your password to unlock the application.</div>'
      +   '<div class="am-field" style="margin-top:6px;"><input id="am-unlock-pwd" type="password" placeholder="Password" autocomplete="current-password"></div>'
      +   '<div id="am-unlock-warn" class="am-warn"></div>'
      + '</div>';
    foot.innerHTML =
      '<div class="am-slot-left"></div>'
      + '<div class="am-slot-center"></div>'
      + '<div class="am-slot-right">'
      +   '<button class="am-btn ghost" id="am-reset">Reset</button>'
      +   '<button class="am-btn primary" id="am-go">Unlock</button>'
      + '</div>';
    var holder = byId('am-anim-unlock');
    if(holder){
      playEthereumInto(holder, function(svgNode){
        var sph = byId('am-sphere-unlock'); if(sph) sph.classList.add('show');
        var div = byId('am-divider-unlock');
        if(div){
          try{
            var rect = svgNode.getBoundingClientRect();
            var w = Math.round(rect.width);
            div.style.width = '0px';
            setTimeout(function(){ div.style.width = String(w) + 'px'; }, 20);
          }catch(_){}
        }
      });
    }
    var warn=byId('am-unlock-warn'); var go=byId('am-go'); var reset=byId('am-reset');
    if(go) go.onclick=function(){
      hide(warn);
      try{
        if(!api.lockVerify) throw new Error('preload api not available');
        var pwd=val('am-unlock-pwd');
        api.lockVerify({password:pwd}).then(function(r){
          if(!r||!r.ok){ setText('am-unlock-warn','Invalid password'); show(warn,'block'); return; }
          closePortal();
        }).catch(function(e){ setText('am-unlock-warn',(e&&e.message)?e.message:'Error'); show(warn,'block'); });
      }catch(e){ setText('am-unlock-warn',(e&&e.message)?e.message:'Error'); show(warn,'block'); }
    };
    if(reset) reset.onclick=function(){ openConfirm(); };
    var inp=byId('am-unlock-pwd'); if(inp){ inp.addEventListener('keydown',function(e){ if(e.key==='Enter'&&go) go.click(); }); inp.focus(); }
  }

  var introHolder=null;

  function renderIntro(){
    mountShell('intro');
    var box = document.querySelector('.am-box');
    if (box) { box.classList.add('is-intro'); box.classList.remove('no-head'); box.classList.remove('is-unlock'); }
    var head=byId('am-head'); if(head) head.style.display='none';
    var body=byId('am-body'); var foot=byId('am-foot');
    body.innerHTML =
      '<div class="am-intro-wrap">'
      + '<div class="am-intro-stack">'
      +   '<div class="am-anim-wrap">'
      +     '<div class="am-anim-holder" id="am-anim"></div>'
      +     '<div class="am-sphere" id="am-sphere"></div>'
      +   '</div>'
      +   '<div class="am-kicker">VALIDATOR TOOLS</div>'
      +   '<div class="am-divider" id="am-divider" style="width:0;"></div>'
      + '</div>'
      +'</div>'
      +'<div class="am-intro-text" id="am-intro-text"></div>';
    foot.innerHTML =
      '<div class="am-slot-left"><div class="am-cta-left"><div class="am-outline"><select id="am-theme"><option value="dark">Dark</option><option value="light">Light</option></select></div></div></div>'
      + '<div class="am-slot-center"></div>'
      + '<div class="am-slot-right"><div class="am-go" id="am-cta"><button class="am-btn primary" id="am-go-btn">Get Started</button></div></div>';
    introHolder=byId('am-anim');
    playEthereumInto(introHolder, function(svgNode){
      var sph = byId('am-sphere'); if(sph){ sph.classList.add('show'); }
      var div = byId('am-divider');
      if(div){
        try{
          var rect = svgNode.getBoundingClientRect();
          var w = Math.round(rect.width);
          div.style.width = '0px';
          setTimeout(function(){
            div.style.width = String(w) + 'px';
            setTimeout(startTypewriter, 700);
          }, 20);
        }catch(_){
          startTypewriter();
        }
      }else{
        startTypewriter();
      }
    });
    var themeSel = byId('am-theme');
    if (themeSel){
      var cur = getSavedTheme();
      themeSel.value = (cur==='light'?'light':'dark');
      var handler = function(ev){ setThemeImmediate(ev.target.value); };
      themeSel.addEventListener('change', handler);
      themeSel.addEventListener('input', handler);
    }
  }


function typeHtml(el, html, stepMs){
  var tokens=[], i=0;
  while(i<html.length){
    if(html[i]==='<'){
      var j=html.indexOf('>', i);
      if(j<0){ tokens.push({t:'text', v:html.slice(i)}); break; }
      tokens.push({t:'tag', v:html.slice(i, j+1)});
      i=j+1;
    }else{
      var j=html.indexOf('<', i); if(j<0) j=html.length;
      tokens.push({t:'text', v:html.slice(i, j)});
      i=j;
    }
  }
  var out='', ti=0, ci=0;
  (function tick(){
    if(ti>=tokens.length){ el.innerHTML = out; return; }
    var tk=tokens[ti];
    if(tk.t==='tag'){
      out += tk.v; ti++; ci=0; el.innerHTML=out; setTimeout(tick, stepMs);
    }else{
      out += tk.v.charAt(ci++); el.innerHTML=out;
      if(ci>=tk.v.length){ ti++; ci=0; }
      setTimeout(tick, stepMs);
    }
  })();
}

function typeHtml(el, html, stepMs, chunk = 1, onDone){
  const tokens = [];
  for (let i=0; i<html.length; ){
    if (html[i] === '<'){
      const j = html.indexOf('>', i);
      if (j < 0) { tokens.push({t:'text', v: html.slice(i)}); break; }
      tokens.push({t:'tag', v: html.slice(i, j+1)});
      i = j + 1;
    } else {
      let j = html.indexOf('<', i); if (j < 0) j = html.length;
      tokens.push({t:'text', v: html.slice(i, j)});
      i = j;
    }
  }

  let out = '', ti = 0, ci = 0;
  (function tick(){
    if (ti >= tokens.length){ el.innerHTML = out; if(onDone) onDone(); return; }

    let added = 0;
    while (added < chunk && ti < tokens.length){
      const tk = tokens[ti];
      if (tk.t === 'tag'){
        out += tk.v; ti++; ci = 0;             
      } else {
        const remain = tk.v.length - ci;
        const take = Math.min(remain, chunk - added);
        out += tk.v.substr(ci, take);
        ci += take; added += take;
        if (ci >= tk.v.length){ ti++; ci = 0; }
      }
    }

    el.innerHTML = out;
    setTimeout(tick, stepMs);
  })();
}

function startTypewriter(){
  var el = byId('am-intro-text');
  if(!el) return;
  var html =
    'Operator-grade tools for Ethereum validators — <span style="color:#f5d087"><b>manage, monitor &amp; audit</b></span> in one pane. ' +
    'Connect Beacon &amp; Execution RPCs; enter a validator index or BLS pubkey to get live status, balances, metrics, and an action log. ' +
    'Withdrawals &amp; partial payouts with checks and fee estimates; payout rules by shares; timing &amp; credits; history search &amp; export. ' +
    'Automation &amp; batch with triggers/limits. <span style="color:#f5d087"><b>Secrets stay local.</b></span> Supports <b>Mainnet</b> &amp; <b>Holesky</b>. ' +
    'For examples and step-by-step instructions — open the <b>Help</b> section: it contains all scenarios, checklists, and guidance.';

  var btn = byId('am-go-btn');
  if (btn) btn.onclick = function(){ openSetupPrefilledWithHero(); };

  typeHtml(el, html, 1, 4, function(){
    const cta = byId('am-cta');
    if (cta) cta.classList.add('show');
  });

  setTimeout(function(){
    const cta = byId('am-cta');
    if (cta) cta.classList.add('show');
  }, 3000);
}


  var resolvingIdx=false, resolvingPub=false;
  var debouncePubTimer=0, debounceIdxTimer=0;
  var lastPubLook='', lastIdxLook='';

  function pickBeaconUrl(def){ var b=val('am-beacon'); return b? b : (def||'https://lodestar-mainnet.chainsafe.io'); }
  function safeGetValidator(base,id,onOk,onErr){
    if(!api.getValidator){ if(onErr) onErr(new Error('preload api not available')); return; }
    api.getValidator(base,id).then(function(res){
      try{ var d=res&&res.data?res.data:res; if(!d) throw new Error('empty response'); onOk(d); }
      catch(e){ if(onErr) onErr(e); }
    }).catch(function(e){ if(onErr) onErr(e); });
  }
  function resolveIndexFromPub(pub,base){
    if(!isHex48(pub)) return; if(lastPubLook===pub) return; if(resolvingIdx) return;
    lastPubLook=pub; resolvingIdx=true; setFieldLoading('am-idx',true);
    safeGetValidator(base,pub,function(d){
      try{ var idx=(d.index!=null)?String(d.index):(d.validator&&d.validator.index!=null?String(d.validator.index):''); if(idx) setVal('am-idx',idx); }catch(e){}
      resolvingIdx=false; setFieldLoading('am-idx',false);
    },function(err){ resolvingIdx=false; setFieldLoading('am-idx',false); });
  }
  function resolvePubFromIndex(idx,base){
    if(!isDigits(idx)) return; if(lastIdxLook===idx) return; if(resolvingPub) return;
    lastIdxLook=idx; resolvingPub=true; setFieldLoading('am-pub',true);
    safeGetValidator(base,idx,function(d){
      try{ var pk=(d.validator&&d.validator.pubkey)?String(d.validator.pubkey):(d.pubkey?String(d.pubkey):''); if(pk) setVal('am-pub',pk); }catch(e){}
      resolvingPub=false; setFieldLoading('am-pub',false);
    },function(err){ resolvingPub=false; setFieldLoading('am-pub',false); });
  }
  function decorateStepper(step){
    var s1=byId('am-step-1'), s2=byId('am-step-2'), s3=byId('am-step-3');
    var l1=byId('am-step-line-1'), l2=byId('am-step-line-2');
    if(s1) s1.classList.toggle('is-active',step>=1);
    if(s2) s2.classList.toggle('is-active',step>=2);
    if(s3) s3.classList.toggle('is-active',step>=3);
    if(l1) l1.classList.toggle('is-active',step>=2);
    if(l2) l2.classList.toggle('is-active',step>=3);
  }

  function renderSetup(prefill){
    mountShell('intro');
    var box = document.querySelector('.am-box');
    if (box) { box.classList.add('no-head'); box.classList.remove('is-intro'); box.classList.remove('is-unlock'); }
    var body=byId('am-body'); var head=byId('am-head'); var foot=byId('am-foot');
    if(head) head.style.display='none';
    var title=byId('am-title'); if(title) title.textContent='';
    var mainHtml =
      '<div class="am-hero" id="am-hero">'
      +   '<div class="am-sphere-hero" id="am-sphere-hero"></div>'
      +   '<div class="am-anim-holder" id="am-anim-hero"></div>'
      +   '<div class="am-divider" id="am-hero-divider"></div>'
      + '</div>'
      + '<div class="am-section" id="am-s1">'
      +   '<div class="am-h">Validator ID</div>'
      +   '<div class="am-note">Provide BLS pubkey (0x + 96 hex) or validator index.</div>'
      +   '<div class="am-row" style="margin-top:8px;">'
      +     '<div class="am-field"><input id="am-pub" placeholder="BLS pubkey (0x..96 hex)"></div>'
      +     '<div class="am-field"><input id="am-idx" placeholder="Validator index (number)"></div>'
      +   '</div>'
      +   '<div id="am-warn1" class="am-warn"></div>'
      + '</div>'
      + '<div class="am-section" id="am-s2">'
      +   '<div class="am-h">Nodes and network</div>'
      +   '<div class="am-row" style="margin-top:6px;">'
      +     '<div class="am-field am-select"><select id="am-net"><option value="mainnet">Ethereum Mainnet</option><option value="holesky">Holesky Testnet</option></select></div>'
      +   '</div>'
      +   '<div class="am-row2lr" style="margin-top:6px;">'
      +     '<div class="am-field"><input id="am-beacon" placeholder="Beacon API base URL (https://...)"></div>'
      +     '<div class="am-ctrl"><button class="am-btn" id="am-check-beacon">Check Beacon</button><span id="am-chip-beacon" class="am-chip" style="display:none;"></span></div>'
      +   '</div>'
      +   '<div class="am-row2lr" style="margin-top:6px;">'
      +     '<div class="am-field"><input id="am-rpc" placeholder="Execution RPC (https://...)"></div>'
      +     '<div class="am-ctrl"><button class="am-btn" id="am-check-rpc">Check RPC</button><span id="am-chip-rpc" class="am-chip" style="display:none;"></span></div>'
      +   '</div>'
      +   '<div id="am-ok2" class="am-ok"></div>'
      +   '<div id="am-err2" class="am-warn"></div>'
      + '</div>'
      + '<div class="am-section" id="am-s3">'
      +   '<div class="am-h">Set local password</div>'
      +   '<div class="am-row" style="margin-top:6px;">'
      +     '<div class="am-field"><input id="am-pwd1" type="password" placeholder="Password min 6"></div>'
      +     '<div class="am-field"><input id="am-pwd2" type="password" placeholder="Repeat password"></div>'
      +   '</div>'
      +   '<div class="am-note" style="margin-top:8px;">Password is required and stored locally (hash).</div>'
      +   '<div id="am-warn3" class="am-warn"></div>'
      + '</div>';
    body.innerHTML = mainHtml;
    var footHtml =
      '<div class="am-slot-left"><button class="am-btn ghost" id="am-back">Back</button></div>'
      + '<div class="am-slot-center">'
      +   '<div class="am-stepper" id="am-stepper">'
      +     '<div class="am-step is-active" id="am-step-1"><span class="am-step-bullet">1</span><span class="am-step-label">Validator</span></div>'
      +     '<div class="am-step-line" id="am-step-line-1"></div>'
      +     '<div class="am-step" id="am-step-2"><span class="am-step-bullet">2</span><span class="am-step-label">Nodes</span></div>'
      +     '<div class="am-step-line" id="am-step-line-2"></div>'
      +     '<div class="am-step" id="am-step-3"><span class="am-step-bullet">3</span><span class="am-step-label">Lock</span></div>'
      +   '</div>'
      + '</div>'
      + '<div class="am-slot-right">'
      +   '<button class="am-btn primary" id="am-next">Next</button>'
      +   '<button class="am-btn primary" id="am-finish" style="display:none;">Finish</button>'
      + '</div>';
    if (foot) foot.innerHTML = footHtml;
    var heroAnim=byId('am-anim-hero'); var heroDiv=byId('am-hero-divider');
    if(heroAnim){
      playEthereumInto(heroAnim, function(svgNode){
        try{
          var rect=svgNode.getBoundingClientRect();
          var w=Math.round(rect.width);
          if(heroDiv){ heroDiv.style.width=String(w)+'px'; }
        }catch(_){}
        var sphH=byId('am-sphere-hero'); if(sphH){ sphH.classList.add('show'); }
      });
    }
    var prof={
      network:(prefill&&prefill.network==='holesky')?'holesky':'mainnet',
      pubkey:(prefill&&prefill.pubkey)||'',
      index:(prefill&&prefill.index!=null)?String(prefill.index):'',
      beaconUrl:(prefill&&prefill.beaconUrl)||'https://lodestar-mainnet.chainsafe.io',
      rpcUrl:(prefill&&prefill.rpcUrl)||'https://eth.llamarpc.com'
    };
    setVal('am-pub', prof.pubkey);
    setVal('am-idx', prof.index);
    setVal('am-beacon', prof.beaconUrl);
    setVal('am-rpc', prof.rpcUrl);
    var netSel=byId('am-net'); if(netSel) netSel.value=prof.network;
    var step=1; var s1=byId('am-s1'), s2=byId('am-s2'), s3=byId('am-s3');
    var backBtn=byId('am-back'), nextBtn=byId('am-next'), finishBtn=byId('am-finish');
    function setStep(n){
      step=n;
      if(s1) s1.style.display=(n===1?'':'none');
      if(s2) s2.style.display=(n===2?'':'none');
      if(s3) s3.style.display=(n===3?'':'none');
      decorateStepper(n);
      if(backBtn) backBtn.disabled=false;
      if(nextBtn) nextBtn.style.display=(n<3?'':'none');
      if(finishBtn) finishBtn.style.display=(n===3?'':'none');
      var ok2=byId('am-ok2'), err2=byId('am-err2'); if(ok2) hide(ok2); if(err2) hide(err2);
      var w1=byId('am-warn1'); if(w1) hide(w1);
      var w3=byId('am-warn3'); if(w3) hide(w3);
    }
    if(backBtn) backBtn.onclick=function(){
      if(step===1){ renderIntro(); }
      else{ setStep(step-1); }
    };
    if(nextBtn) nextBtn.onclick=function(){
      if(step===1){
        var pub=val('am-pub'), idx=val('am-idx'), warn=byId('am-warn1');
        if(!pub && !idx){ setText('am-warn1','Provide BLS pubkey or validator index'); show(warn,'block'); return; }
        if(pub && !isHex48(pub)){ setText('am-warn1','BLS pubkey must be 48 bytes (0x + 96 hex)'); show(warn,'block'); return; }
        if(idx && !isDigits(idx)){ setText('am-warn1','Index must be digits'); show(warn,'block'); return; }
        hide(warn);
        setStep(2);
      }else if(step===2){ setStep(3); }
    };
    if(finishBtn) finishBtn.onclick=function(){
      var warn3=byId('am-warn3'); if(warn3) hide(warn3);
      try{
        if(!api.profileSet || !api.lockSet) throw new Error('preload api not available');
        var pub=val('am-pub'), idx=val('am-idx'); var net=(byId('am-net')&&byId('am-net').value==='holesky') ? 'holesky' : 'mainnet';
        var bc=val('am-beacon'), rpc=val('am-rpc');
        if(!bc||!rpc){ setText('am-warn3','Provide Beacon and RPC'); show(warn3,'block'); return; }
        if(!pub && !idx){ setText('am-warn3','Provide BLS pubkey or validator index'); show(warn3,'block'); return; }
        if(pub && !isHex48(pub)){ setText('am-warn3','BLS pubkey must be 48 bytes (0x + 96 hex)'); show(warn3,'block'); return; }
        if(idx && !isDigits(idx)){ setText('am-warn3','Index must be digits'); show(warn3,'block'); return; }
        var p1=val('am-pwd1'), p2=val('am-pwd2');
        if(p1.length<6){ setText('am-warn3','Password length must be >= 6'); show(warn3,'block'); return; }
        if(p1!==p2){ setText('am-warn3','Passwords do not match'); show(warn3,'block'); return; }
        api.profileSet({pubkey:pub||undefined,index:idx?Number(idx):undefined,network:net,beaconUrl:bc,rpcUrl:rpc})
        .then(function(){ return api.lockSet({enabled:true,password:p1}); })
        .then(function(){
          try{
            var prof2 = {
              pubkey: (val('am-pub')||'') || undefined,
              index:  (val('am-idx')? Number(val('am-idx')) : undefined),
              network: (byId('am-net')&&byId('am-net').value==='holesky') ? 'holesky' : 'mainnet',
              beaconUrl: val('am-beacon'),
              rpcUrl: val('am-rpc')
            };
            window.__VT_PROFILE = prof2;
            document.dispatchEvent(new CustomEvent('vt:profile', { detail: prof2 }));
          }catch(_){}
          closePortal();
        }).catch(function(e){ setText('am-warn3',(e&&e.message)?e.message:'Error'); show(warn3,'block'); });
      }catch(e){ var w=byId('am-warn3'); setText('am-warn3',(e&&e.message)?e.message:'Error'); show(w,'block'); }
    };
    var pubEl=byId('am-pub');
    if(pubEl) pubEl.addEventListener('input',function(){
      var pub=val('am-pub'); if(!isHex48(pub)) return;
      if(debouncePubTimer) clearTimeout(debouncePubTimer);
      debouncePubTimer=setTimeout(function(){ resolveIndexFromPub(pub, pickBeaconUrl(prof.beaconUrl)); }, RESOLVE_DEBOUNCE_MS);
    });
    var idxEl=byId('am-idx');
    if(idxEl) idxEl.addEventListener('input',function(){
      var idx=val('am-idx'); if(!isDigits(idx)) return;
      if(debounceIdxTimer) clearTimeout(debounceIdxTimer);
      debounceIdxTimer=setTimeout(function(){ resolvePubFromIndex(idx, pickBeaconUrl(prof.beaconUrl)); }, RESOLVE_DEBOUNCE_MS);
    });
    var cb=byId('am-check-beacon');
   if(cb) cb.onclick = function(){
  var chip = byId('am-chip-beacon');
  if (chip) hide(chip);
  try {
    if (!api.getHeader) throw new Error('preload api not available');
    var bc = val('am-beacon');
    if (!bc) {
      if (chip) {
        chip.className = 'am-chip bad';
        chip.textContent = 'ERROR';
        show(chip, 'inline-flex');
      }
      return;
    }
    api.getHeader(bc, 'head').then(function(head){
      var slot = (head && head.data && head.data.header && head.data.header.message && head.data.header.message.slot)
              || (head && head.data && head.data.slot)
              || (head && head.slot);
      if (slot == null) {
        chip.className = 'am-chip bad';
        chip.textContent = 'ERROR';
        show(chip, 'inline-flex');
        return;
      }
      chip.className = 'am-chip ok';
      chip.textContent = 'OK';
      show(chip, 'inline-flex');
    }).catch(function(e){
      chip.className = 'am-chip bad';
      chip.textContent = 'ERROR';
      show(chip, 'inline-flex');
    });
  } catch (e) {
    if (chip) {
      chip.className = 'am-chip bad';
      chip.textContent = 'ERROR';
      show(chip, 'inline-flex');
    }
  }
};
    var cr=byId('am-check-rpc');
  if(cr) cr.onclick = function(){
  var chip = byId('am-chip-rpc');
  if (chip) hide(chip);
  try {
    if (!api.rpcGetInfo) throw new Error('preload api not available');
    var r = val('am-rpc');
    if (!r) {
      chip.className = 'am-chip bad';
      chip.textContent = 'ERROR';
      show(chip, 'inline-flex');
      return;
    }
    api.rpcGetInfo(r).then(function(info){
      if (info && info.ok) {
        chip.className = 'am-chip ok';
        chip.textContent = 'OK';
        show(chip, 'inline-flex');
      } else {
        chip.className = 'am-chip bad';
        chip.textContent = 'ERROR';
        show(chip, 'inline-flex');
      }
    }).catch(function(e){
      chip.className = 'am-chip bad';
      chip.textContent = 'ERROR';
      show(chip, 'inline-flex');
    });
  } catch (e) {
    if (chip) {
      chip.className = 'am-chip bad';
      chip.textContent = 'ERROR';
      show(chip, 'inline-flex');
    }
  }
};
    document.addEventListener('keydown',function onKey(e){
      if(e.key!=='Enter') return;
      if(step===1 && nextBtn){ nextBtn.click(); return; }
      if(step===2 && nextBtn){ nextBtn.click(); return; }
      if(step===3 && finishBtn){ finishBtn.click(); return; }
    }, { once:false });
    setStep(1);
  }

  function withTimeout(promise,ms,label){
    return new Promise(function(resolve,reject){
      var t=setTimeout(function(){ reject(new Error(label+' timeout')); },ms);
      Promise.resolve(promise).then(function(v){ clearTimeout(t); resolve(v); }, function(e){ clearTimeout(t); reject(e); });
    });
  }
  function openSetupPrefilled(){
    if(api.profileGet){
      withTimeout(api.profileGet(),TIMEOUT_MS,'profileGet').then(function(p){ renderSetup(p||{network:'mainnet'}); })
      .catch(function(){ renderSetup({network:'mainnet'}); });
    }else{ renderSetup({network:'mainnet'}); }
  }
  function openSetupPrefilledWithHero(){ openSetupPrefilled(); }

  function init(){
    var saved = getSavedTheme();
    setThemeImmediate(saved);
    if(api.lockStatus){
      withTimeout(api.lockStatus(),TIMEOUT_MS,'lockStatus').then(function(st){
        if(st&&st.enabled&&st.needUnlock){ renderUnlock(); return; }
        renderIntro();
      }).catch(function(){ renderIntro(); });
    }else{ renderIntro(); }
  }

  window.__VT_AUTH_OPEN = function(){ openSetupPrefilledWithHero(); };
  window.__VT_AUTH_UNLOCK = function(){ renderUnlock(); };
  window.__VT_AUTH_INTRO = function(){ renderIntro(); };

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init,{once:true}); }
  else{ init(); }
})();
