// Injected into every test page before its own scripts run. Reports
// Content Security Policy violations to the test through an exposed function.
document.addEventListener(
  'securitypolicyviolation',
  (event) => {
    const report = window.__reportCspViolation;
    if (typeof report === 'function') {
      report(`${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} (${event.sourceFile}:${event.lineNumber})`);
    }
  },
  true,
);
