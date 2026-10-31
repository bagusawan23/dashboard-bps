(function () {
  var root = document.documentElement, PC = window.PaletteCustom;
  var raf = 0;
  function fire() { document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: root.getAttribute('data-theme'), palette: root.getAttribute('data-palette') } })); }
  function fireSoon() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; fire(); }); }

  var btn = document.getElementById('themeToggle');
  if (btn) btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    if (PC) PC.apply();
    fire();
  });

  var pb = document.getElementById('paletteBtn'), pop = document.getElementById('palettePop');
  if (!pb || !pop) return;
  var box = document.getElementById('palCustom'), c1 = document.getElementById('palC1'), c2 = document.getElementById('palC2');

  function hex(v, fb) { return /^#[0-9a-f]{6}$/i.test(v) ? v : fb; }
  function mark() {
    var cur = root.getAttribute('data-palette') || 'laut';
    pop.querySelectorAll('.pal-item').forEach(function (b) {
      var on = b.getAttribute('data-palette') === cur;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    box.hidden = cur !== 'kustom';
    if (cur === 'kustom' && PC && PC.get()) { c1.value = PC.get().c1; c2.value = PC.get().c2; }
  }
  function toggle(open) { pop.hidden = !open; pb.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  function choose(id) {
    if (id === 'kustom' && PC && !PC.get()) {   // pertama kali: mulai dari warna palet yang sedang aktif
      var cs = getComputedStyle(root);
      PC.set({ c1: hex(cs.getPropertyValue('--accent').trim(), '#4fd1c5'), c2: hex(cs.getPropertyValue('--accent2').trim(), '#f6b73c') });
    }
    root.setAttribute('data-palette', id);
    try { localStorage.setItem('palette', id); } catch (er) {}
    if (PC) PC.apply();
    mark(); fire();
  }

  pb.addEventListener('click', function (e) { e.stopPropagation(); toggle(pop.hidden); });
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('.pal-item'); if (b) { var id = b.getAttribute('data-palette'); choose(id); if (id !== 'kustom') toggle(false); return; }
    if (e.target.id === 'palReset') { var cs; try { localStorage.removeItem('palette-custom'); } catch (er) {} root.setAttribute('data-palette', 'laut'); try { localStorage.setItem('palette', 'laut'); } catch (er) {} if (PC) PC.apply(); mark(); fire(); }
  });
  function onPick() { if (PC) { PC.set({ c1: c1.value, c2: c2.value }); PC.apply(); } fireSoon(); }
  c1.addEventListener('input', onPick); c2.addEventListener('input', onPick);
  document.addEventListener('click', function (e) { if (!pop.hidden && !e.target.closest('#palette')) toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { toggle(false); pb.focus(); } });
  mark();
})();
