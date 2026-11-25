// Full list of publications (_includes/publication.html, _layouts/bibtemplate.html)
// - Search filters every tab at once; tab counts and year counts follow the matches.
// - /pli/publications/#<type> (e.g. #inproceedings) opens that tab;
//   #<bibtex key> (e.g. #gao_timing_2025) opens the right tab, scrolls to the paper and highlights it.
// - PMID / PMCID numbers in the citation become PubMed / PMC links.
// - "Copy" in the Cite panel copies the BibTeX.
document.addEventListener('DOMContentLoaded', function () {
  var page = document.querySelector('.publist-page');
  if (!page) return;
  var hasBs = typeof bootstrap !== 'undefined';

  function showTab(paneId) {
    var btn = document.querySelector('#publistTabs [data-bs-target="#' + paneId + '"]');
    if (btn && hasBs) (bootstrap.Tab.getInstance(btn) || new bootstrap.Tab(btn)).show();
  }

  // ---- PMID / PMCID links ----
  page.querySelectorAll('.bib-venue').forEach(function (v) {
    v.innerHTML = v.innerHTML
      .replace(/PMCID: (PMC\d+)/g, 'PMCID: <a href="https://pmc.ncbi.nlm.nih.gov/articles/$1/" target="_blank" rel="noopener">$1</a>')
      .replace(/PMID: (\d+)/g, 'PMID: <a href="https://pubmed.ncbi.nlm.nih.gov/$1/" target="_blank" rel="noopener">$1</a>');
  });

  // ---- Search ----
  var items = Array.prototype.slice.call(page.querySelectorAll('ol.bibliography > li'));
  items.forEach(function (li) { li._text = li.querySelector('.bib-entry') ? (li.querySelector('.bib-title, .bib-ref') || li).textContent.toLowerCase() + ' ' + ((li.querySelector('.bib-authors') || {}).textContent || '').toLowerCase() + ' ' + ((li.querySelector('.bib-venue') || {}).textContent || '').toLowerCase() : li.textContent.toLowerCase(); });

  var search = document.getElementById('publistSearch');
  var timer;
  if (search) {
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(applyFilter, 120);
    });
  }

  function applyFilter() {
    var words = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    items.forEach(function (li) {
      li.classList.toggle('is-hidden', !words.every(function (w) { return li._text.indexOf(w) !== -1; }));
    });
    page.querySelectorAll('.tab-pane').forEach(function (pane) {
      var shownInPane = 0;
      pane.querySelectorAll('.publist-year').forEach(function (y) {
        var n = y.querySelectorAll('ol.bibliography > li:not(.is-hidden)').length;
        shownInPane += n;
        y.hidden = n === 0;
        var count = y.querySelector('.publist-year-count');
        if (count) count.textContent = words.length ? n : count.getAttribute('data-total');
        var chip = pane.querySelector('.publist-year-chip[data-year="' + y.getAttribute('data-year') + '"]');
        if (chip) chip.classList.toggle('is-hidden', n === 0);
      });
      var empty = pane.querySelector('.publist-empty');
      if (empty) empty.hidden = shownInPane !== 0;
      var tabCount = document.querySelector('#publistTabs [data-bs-target="#' + pane.id + '"] .publist-count');
      if (tabCount) {
        if (!tabCount.hasAttribute('data-total')) tabCount.setAttribute('data-total', tabCount.textContent.trim());
        tabCount.textContent = words.length ? shownInPane : tabCount.getAttribute('data-total');
        tabCount.classList.toggle('is-zero', words.length > 0 && shownInPane === 0);
      }
    });
  }

  // ---- Copy BibTeX ----
  page.addEventListener('click', function (e) {
    var btn = e.target.closest('.bib-copy');
    if (!btn) return;
    var text = btn.closest('.bib-cite').querySelector('pre').textContent;
    var done = function () {
      btn.classList.add('is-done');
      btn.querySelector('span').textContent = 'Copied';
      btn.querySelector('.bi').className = 'bi bi-check2';
      setTimeout(function () {
        btn.classList.remove('is-done');
        btn.querySelector('span').textContent = 'Copy';
        btn.querySelector('.bi').className = 'bi bi-clipboard';
      }, 1800);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      document.body.removeChild(ta);
    }
  });

  // ---- Deep links ----
  function openFromHash() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    if (target.classList.contains('tab-pane')) { showTab(id); return; }
    var pane = target.closest('.tab-pane');
    if (!pane) return;
    showTab(pane.id);
    var entry = target.classList.contains('bib-entry') ? target : target.closest('.bib-entry');
    setTimeout(function () {
      (entry || target).scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (entry) {
        page.querySelectorAll('.bib-entry.is-target').forEach(function (x) { x.classList.remove('is-target'); });
        entry.classList.add('is-target');
      }
    }, 200);
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  // Switching tabs updates the address bar (without jumping)
  document.querySelectorAll('#publistTabs [data-bs-toggle="tab"]').forEach(function (btn) {
    btn.addEventListener('shown.bs.tab', function () {
      if (history.replaceState) history.replaceState(null, '', btn.getAttribute('data-bs-target'));
    });
  });

  // ---- Highlight the year being read ----
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var pane = e.target.closest('.tab-pane');
        var y = e.target.getAttribute('data-year');
        pane.querySelectorAll('.publist-year-chip').forEach(function (c) { c.classList.toggle('is-current', c.getAttribute('data-year') === y); });
      });
    }, { rootMargin: '-100px 0px -70% 0px' });
    page.querySelectorAll('.publist-year').forEach(function (y) { io.observe(y); });
  }
});
