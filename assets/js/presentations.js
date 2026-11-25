// Presentations page (_includes/presentation.html)
// - Search box filters presentations by title, meeting, place, or year; empty years are hidden.
// - "Expand all" / "Collapse all".
// - /pli/presentations/#<id> (e.g. #aaic2024) opens that presentation and scrolls to it.
// - Year chips highlight the year you are reading.
// - Photos open in the Fancybox viewer (loaded in _layouts/default.html).
document.addEventListener('DOMContentLoaded', function () {
  var page = document.querySelector('.talks-page');
  if (!page) return;

  var talks = Array.prototype.slice.call(page.querySelectorAll('.talk'));
  var years = Array.prototype.slice.call(page.querySelectorAll('.talks-year'));
  var chips = Array.prototype.slice.call(page.querySelectorAll('.talks-year-chip'));
  var empty = page.querySelector('.talks-empty');
  var hasBs = typeof bootstrap !== 'undefined';

  function collapseOf(el) {
    return bootstrap.Collapse.getInstance(el) || new bootstrap.Collapse(el, { toggle: false });
  }

  // ---- Search ----
  var search = document.getElementById('talksSearch');
  if (search) {
    var timer;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(applyFilter, 120);
    });
  }

  function applyFilter() {
    var words = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var shown = 0;
    talks.forEach(function (t) {
      var text = t.getAttribute('data-search') || '';
      var match = words.every(function (w) { return text.indexOf(w) !== -1; });
      t.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });
    years.forEach(function (y) {
      var visible = y.querySelectorAll('.talk:not(.is-hidden)').length;
      y.hidden = visible === 0;
      var count = y.querySelector('.talks-year-count');
      if (count) count.textContent = visible + (visible === 1 ? ' talk' : ' talks');
      var chip = page.querySelector('.talks-year-chip[data-year="' + y.getAttribute('data-year') + '"]');
      if (chip) chip.classList.toggle('is-hidden', visible === 0);
    });
    if (empty) empty.hidden = shown !== 0;
  }

  // ---- Expand / collapse all ----
  var allBtn = page.querySelector('.talks-expand-all');
  if (allBtn && hasBs) {
    allBtn.addEventListener('click', function () {
      var open = allBtn.getAttribute('aria-expanded') !== 'true';
      page.querySelectorAll('.talk:not(.is-hidden) .talk-details').forEach(function (d) {
        open ? collapseOf(d).show() : collapseOf(d).hide();
      });
      allBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      allBtn.querySelector('span').textContent = open ? 'Collapse all' : 'Expand all';
      allBtn.querySelector('.bi').className = open ? 'bi bi-arrows-collapse' : 'bi bi-arrows-expand';
    });
  }

  // ---- Deep link to one presentation ----
  function openFromHash() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !hasBs) return;
    var target = document.getElementById(id);
    if (!target || !target.classList.contains('talk')) return;
    var details = target.querySelector('.talk-details');
    var scroll = function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    if (details.classList.contains('show')) {
      scroll();
    } else {
      details.addEventListener('shown.bs.collapse', scroll, { once: true });
      collapseOf(details).show();
    }
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  // ---- Highlight the year being read ----
  if ('IntersectionObserver' in window && chips.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var y = e.target.getAttribute('data-year');
        chips.forEach(function (c) { c.classList.toggle('is-current', c.getAttribute('data-year') === y); });
      });
    }, { rootMargin: '-100px 0px -70% 0px' });
    years.forEach(function (y) { io.observe(y); });
  }

  if (typeof Fancybox !== 'undefined') {
    Fancybox.bind('[data-fancybox="talks"]', {});
  }
});
