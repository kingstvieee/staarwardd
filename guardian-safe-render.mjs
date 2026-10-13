const ACTIVE_MARKUP = /<(?:script|iframe|object|embed|link|meta|img|svg|video|audio|form|input|button|style)\b|\bon\w+\s*=|javascript\s*:|data\s*:\s*text\/html/i;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function bounded(value, max = 50000) {
  return String(value ?? '').slice(0, max).replace(CONTROL_CHARS, '');
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function inspectRenderedOutput(value) {
  const text = bounded(value);
  return {
    containsNetworkOrExecutableMarkup: ACTIVE_MARKUP.test(text),
    rawHtmlAllowed: false,
    safeDomSink: 'textContent',
    externalNavigationRequiresUserAction: true
  };
}

export function safeRenderModelText(value) {
  const text = bounded(value);
  const inspection = inspectRenderedOutput(text);
  return {
    text,
    escapedHtml: escapeHtml(text),
    inspection,
    renderingContract: {
      preferredSink: 'textContent',
      innerHTMLAllowed: false,
      scriptExecutionAllowed: false,
      remoteResourceLoadingAllowed: false,
      automaticNavigationAllowed: false
    }
  };
}

export function safeStreamAccumulator() {
  let combined = '';
  return {
    push(chunk) {
      combined = bounded(combined + bounded(chunk, 10000));
      return safeRenderModelText(combined);
    },
    value() {
      return safeRenderModelText(combined);
    }
  };
}
