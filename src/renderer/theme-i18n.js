(function(){
  'use strict';

  var LS_KEY = 'app.theme';
  var DEFAULT = 'dark';
  var BOUND = false;

  function getSaved(key, fallback){
    try{ var v = localStorage.getItem(key); return v ? v : fallback; }catch(_){ return fallback; }
  }
  function save(key, value){
    try{ localStorage.setItem(key, value); }catch(_){}
  }

  function setTheme(theme){
    var t = (String(theme||'').toLowerCase() === 'light') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    save(LS_KEY, t);
    syncThemeSelectors(t);
    globalThis.dispatchEvent(new CustomEvent('theme:changed', { detail:{ theme:t } }));
  }

  function syncThemeSelectors(theme){
    var ids = ['am-theme','stTheme','setTheme'];
    ids.forEach(function(id){
      var sel = document.getElementById(id);
      if (!sel) return;
      stripNeutral(sel);
      var found = false;
      for (var i=0;i<sel.options.length;i++){
        var opt = sel.options[i];
        var v = (opt.value || opt.text).toLowerCase();
        if (v === theme){ sel.value = opt.value || opt.text; found = true; break; }
      }
      if (!found) sel.value = '';
    });
  }

  function stripNeutral(sel){
    for (var i = sel.options.length - 1; i >= 0; i--){
      var txt = (sel.options[i].text || '').toLowerCase();
      var val = (sel.options[i].value || '').toLowerCase();
      if (txt.includes('neutral') || val === 'neutral') sel.remove(i);
    }
  }

  function bindThemeControls(){
    var ids = ['am-theme','stTheme','setTheme'];
    var boundAny = false;
    ids.forEach(function(id){
      var sel = document.getElementById(id);
      if (!sel) return;
      stripNeutral(sel);
      var handler = function(ev){
        var raw = String(ev.target.value || ev.target.options[ev.target.selectedIndex]?.text || '').toLowerCase();
        if (raw.indexOf('light') >= 0) setTheme('light');
        else setTheme('dark');
      };
      sel.addEventListener('change', handler);
      sel.addEventListener('input', handler);
      boundAny = true;
    });
    BOUND = boundAny;
    return boundAny;
  }

  function ensureBinding(){
    if (bindThemeControls()) return;
    var attempts = 0;
    var max = 20;
    var t = setInterval(function(){
      attempts++;
      if (bindThemeControls() || attempts >= max) clearInterval(t);
    }, 100);
  }

  function injectConsoleToolbarFixCSS(){
    var ID = 'console-toolbar-fix';
    if (document.getElementById(ID)) return;
    var css = [
      '.console{position:relative;padding-top:40px;}',
      '.console .toolbar{position:absolute !important;top:8px;right:8px;left:auto;margin:0;background:transparent !important;display:inline-flex;gap:8px;z-index:2;}',
      '.console .toolbar .btn{padding:6px 10px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.25);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}',
      'html[data-theme="light"] .console .toolbar .btn.ghost{background:rgba(255,255,255,0.15);border-color:rgba(0,0,0,0.18);color:#0f172a;}',
      '.console .toolbar .btn.ghost{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.22);color:#e5e7eb;}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function init(){
    injectConsoleToolbarFixCSS();
    var t = getSaved(LS_KEY, DEFAULT);
    setTheme(t);
    ensureBinding();
    var mo = new MutationObserver(function(){
      if (!BOUND) ensureBinding();
    });
    mo.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

  globalThis.AppTheme = { get theme(){ return getSaved(LS_KEY, DEFAULT); }, setTheme:setTheme };
})();
