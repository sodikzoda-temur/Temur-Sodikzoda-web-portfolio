// Runs before first paint: marks JavaScript as available and applies a saved
// theme choice. Loaded as an external file because the Content Security
// Policy blocks inline scripts. The storage key matches src/scripts/theme.ts.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var theme = localStorage.getItem('portfolio-theme');
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  } catch (e) {
    // Storage unavailable: follow the system setting.
  }
})();
