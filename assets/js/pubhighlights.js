// Research > Publications page (_includes/pubhighlights.html)
// - Long summaries are clamped to a few lines with a "Read more" / "Show less" toggle.
//   Without JS the full summary shows.
// - Figures open in the Fancybox viewer (loaded in _layouts/default.html).
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.pub-summary-wrap').forEach(function (wrap) {
    var text = wrap.querySelector('.pub-summary');
    var btn = wrap.querySelector('.pub-more');
    if (!text || !btn) return;

    text.classList.add('is-clamped');
    // Only offer the toggle when the clamp actually hides text.
    if (text.scrollHeight - text.clientHeight < 4) {
      text.classList.remove('is-clamped');
      return;
    }
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var open = text.classList.toggle('is-clamped') === false;
      btn.textContent = open ? 'Show less' : 'Read more';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  if (typeof Fancybox !== 'undefined') {
    Fancybox.bind('[data-fancybox="pubhighlights"]', {});
  }
});
