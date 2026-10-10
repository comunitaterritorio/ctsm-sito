/**
 * Menu "Condividi" di CTSM: Facebook, WhatsApp, Instagram, TikTok, Copia link.
 * Usato dal sito (index.html) e dalle pagine generate (comunicati, istanze, eventi).
 * Uso: ctsmShare(url, titolo)
 *
 * Nota: Instagram e TikTok non hanno un indirizzo web per condividere un link.
 * Per questi due il link viene copiato negli appunti e si apre l'app / il sito,
 * dove la persona lo incolla nel proprio post o messaggio.
 */
(function () {
  var STYLE_ID = 'ctsm-share-style';
  var css =
    '.ctsm-share-ov{position:fixed;inset:0;z-index:100000;background:rgba(9,21,41,.6);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s}' +
    '.ctsm-share-ov.open{opacity:1}' +
    '.ctsm-share-box{background:#fff;width:100%;max-width:440px;border-radius:14px 14px 0 0;padding:22px 20px 26px;border-top:3px solid #c9a84c;transform:translateY(24px);transition:transform .2s;font-family:Jost,Arial,sans-serif;color:#0f2044}' +
    '.ctsm-share-ov.open .ctsm-share-box{transform:none}' +
    '@media(min-width:600px){.ctsm-share-ov{align-items:center}.ctsm-share-box{border-radius:10px}}' +
    '.ctsm-share-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}' +
    '.ctsm-share-head strong{font-family:"Cormorant Garamond",Georgia,serif;font-size:22px;font-weight:600}' +
    '.ctsm-share-x{background:none;border:0;font-size:26px;line-height:1;cursor:pointer;color:#5a6070;padding:0 4px}' +
    '.ctsm-share-sub{font-size:12px;color:#5a6070;margin-bottom:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.ctsm-share-opt{display:flex;align-items:center;gap:14px;width:100%;background:#faf7f0;border:1px solid rgba(201,168,76,.35);border-radius:6px;padding:12px 14px;margin-top:8px;cursor:pointer;font:500 15px Jost,Arial,sans-serif;color:#0f2044;text-align:left;text-decoration:none;box-sizing:border-box}' +
    '.ctsm-share-opt:hover{background:#f5e9c8}' +
    '.ctsm-share-ico{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex:none}' +
    '.ctsm-share-hint{font-size:12px;color:#0f2044;background:#f5e9c8;border-radius:6px;padding:10px 12px;margin-top:12px;display:none}';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID; s.textContent = css;
    document.head.appendChild(s);
  }

  function absolute(url) {
    try { return new URL(url || window.location.href, window.location.href).href; } catch (e) { return url; }
  }

  function copy(text, done) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (ok) done(true); else { prompt('Copia questo link:', text); done(false); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    } else { fallback(); }
  }

  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.ctsmShare = function (url, title) {
    ensureStyle();
    url = absolute(url);
    title = (title || document.title || 'Comunità e Territorio San Marino').toString();
    var text = title + ' ' + url;

    var old = document.getElementById('ctsm-share-ov');
    if (old) old.parentNode.removeChild(old);

    var ov = document.createElement('div');
    ov.className = 'ctsm-share-ov'; ov.id = 'ctsm-share-ov';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Condividi');
    ov.innerHTML =
      '<div class="ctsm-share-box">' +
        '<div class="ctsm-share-head"><strong>Condividi</strong><button type="button" class="ctsm-share-x" aria-label="Chiudi">&times;</button></div>' +
        '<div class="ctsm-share-sub">' + esc(title) + '</div>' +
        '<a class="ctsm-share-opt" data-k="fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '"><span class="ctsm-share-ico" style="background:#1877f2">f</span>Facebook</a>' +
        '<a class="ctsm-share-opt" data-k="wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text) + '"><span class="ctsm-share-ico" style="background:#25d366">W</span>WhatsApp</a>' +
        '<button type="button" class="ctsm-share-opt" data-k="ig"><span class="ctsm-share-ico" style="background:linear-gradient(45deg,#f09433,#dc2743,#bc1888)">IG</span>Instagram</button>' +
        '<button type="button" class="ctsm-share-opt" data-k="tt"><span class="ctsm-share-ico" style="background:#010101">TT</span>TikTok</button>' +
        '<button type="button" class="ctsm-share-opt" data-k="cp"><span class="ctsm-share-ico" style="background:#c9a84c;color:#0f2044">&#128279;</span><span class="ctsm-share-cp">Copia link</span></button>' +
        '<div class="ctsm-share-hint" role="status"></div>' +
      '</div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('open'); });

    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function close() {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (ov.parentNode) ov.parentNode.removeChild(ov);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);

    var hint = ov.querySelector('.ctsm-share-hint');
    function showHint(msg) { hint.textContent = msg; hint.style.display = 'block'; }

    ov.addEventListener('click', function (e) {
      if (e.target === ov || e.target.classList.contains('ctsm-share-x')) { close(); return; }
      var opt = e.target.closest ? e.target.closest('.ctsm-share-opt') : null;
      if (!opt) return;
      var k = opt.getAttribute('data-k');
      if (k === 'fb' || k === 'wa') { setTimeout(close, 150); return; } // il link si apre da solo
      if (k === 'cp') {
        copy(url, function (ok) {
          if (ok) { opt.querySelector('.ctsm-share-cp').textContent = '✓ Link copiato!'; setTimeout(close, 1100); }
        });
        return;
      }
      if (k === 'ig' || k === 'tt') {
        var name = k === 'ig' ? 'Instagram' : 'TikTok';
        var target = k === 'ig' ? 'https://www.instagram.com/' : 'https://www.tiktok.com/';
        copy(url, function (ok) {
          showHint(ok
            ? 'Link copiato! Ora si apre ' + name + ': incollalo nel tuo post, storia o messaggio.'
            : 'Copia il link qui sopra e incollalo su ' + name + '.');
          setTimeout(function () { window.open(target, '_blank', 'noopener'); }, 700);
        });
      }
    });
  };
})();
