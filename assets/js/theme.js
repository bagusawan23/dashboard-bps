(function () {
  var root = document.documentElement;
  function fire() { document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: root.getAttribute('data-theme'), palette: root.getAttribute('data-palette') } })); }

  var btn = document.getElementById('themeToggle');
  if (btn) btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    fire();
  });

  var pb = document.getElementById('paletteBtn'), pop = document.getElementById('palettePop');
  if (!pb || !pop) return;
  function mark() {
    var cur = root.getAttribute('data-palette') || 'laut';
    pop.querySelectorAll('.pal-item').forEach(function (b) {
      var on = b.getAttribute('data-palette') === cur;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  function toggle(open) { pop.hidden = !open; pb.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  pb.addEventListener('click', function (e) { e.stopPropagation(); toggle(pop.hidden); });
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('.pal-item'); if (!b) return;
    var id = b.getAttribute('data-palette');
    root.setAttribute('data-palette', id);
    try { localStorage.setItem('palette', id); } catch (er) {}
    mark(); fire(); toggle(false);
  });
  document.addEventListener('click', function (e) { if (!pop.hidden && !e.target.closest('#palette')) toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { toggle(false); pb.focus(); } });
  mark();
})();
