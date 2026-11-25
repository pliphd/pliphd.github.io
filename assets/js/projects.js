// Projects page (_includes/projects.html)
// - /projects/#completed or #ongoing opens that tab; switching tabs updates the URL.
// - /projects/#<project id> (e.g. #cac) opens the right tab, expands that project, and scrolls to it.
// - "Expand all" / "Collapse all" per tab.
document.addEventListener('DOMContentLoaded', function () {
  var tabs = document.getElementById('projectTabs');
  if (!tabs || typeof bootstrap === 'undefined') return;

  function showTab(paneId) {
    var btn = tabs.querySelector('[data-bs-target="#' + paneId + '"]');
    if (!btn) return;
    (bootstrap.Tab.getInstance(btn) || new bootstrap.Tab(btn)).show();
  }

  function collapseOf(el) {
    return bootstrap.Collapse.getInstance(el) || new bootstrap.Collapse(el, { toggle: false });
  }

  function openFromHash() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;

    if (target.classList.contains('tab-pane')) {
      showTab(id);
      return;
    }
    if (target.classList.contains('project-item')) {
      var details = target.querySelector('.project-details');
      var scroll = function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      showTab(target.closest('.tab-pane').id);
      if (details.classList.contains('show')) {
        scroll();
      } else {
        details.addEventListener('shown.bs.collapse', scroll, { once: true });
        collapseOf(details).show();
      }
    }
  }

  // keep the URL in sync with the open tab, so refresh/back and shared links land on it
  tabs.querySelectorAll('[data-bs-toggle="tab"]').forEach(function (btn) {
    btn.addEventListener('shown.bs.tab', function () {
      var pane = btn.getAttribute('data-bs-target');
      var current = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (current && document.querySelector(pane).contains(current)) return; // keep a #<project id> link as is
      if (window.location.hash !== pane) history.replaceState(null, '', pane);
    });
  });

  document.querySelectorAll('.projects-expand-all').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expand = btn.getAttribute('aria-expanded') !== 'true';
      document.querySelectorAll(btn.getAttribute('data-pane') + ' .project-details').forEach(function (el) {
        var c = collapseOf(el);
        if (expand) { c.show(); } else { c.hide(); }
      });
      btn.setAttribute('aria-expanded', expand ? 'true' : 'false');
      btn.querySelector('span').textContent = expand ? 'Collapse all' : 'Expand all';
      btn.querySelector('.bi').className = expand ? 'bi bi-arrows-collapse' : 'bi bi-arrows-expand';
    });
  });

  openFromHash();
  window.addEventListener('hashchange', openFromHash);
});
