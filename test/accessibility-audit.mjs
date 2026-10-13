import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/guardian-runtime.css', import.meta.url), 'utf8');
const styles = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');

const failures = [];
function requireMatch(value, pattern, message) { if (!pattern.test(value)) failures.push(message); }
function forbidMatch(value, pattern, message) { if (pattern.test(value)) failures.push(message); }

requireMatch(html, /<html[^>]+lang=/i, 'Document must declare a language.');
requireMatch(html, /<meta[^>]+name=["']viewport["']/i, 'Responsive viewport metadata is required.');
requireMatch(html, /class=["'][^"']*skip-link/i, 'Keyboard skip link is required.');
requireMatch(html, /aria-live=/i, 'At least one live region is required for Guardian status updates.');
requireMatch(html, /aria-label=/i, 'Accessible labels are required on interactive Guardian regions.');
forbidMatch(html, /tabindex\s*=\s*["']?[1-9]/i, 'Positive tabindex values are prohibited.');
forbidMatch(html, /<img(?![^>]*\balt=)[^>]*>/gi, 'Every image must explicitly declare alt text, including decorative images with alt="".');

const combinedCss = `${css}\n${styles}`;
requireMatch(combinedCss, /prefers-reduced-motion/i, 'Reduced-motion support is required.');
requireMatch(combinedCss, /:focus-visible|:focus\b/i, 'Visible keyboard focus styling is required.');

if (failures.length) {
  console.error('Accessibility audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Accessibility audit passed.');
