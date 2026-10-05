'use strict';
/* آزمون دود وب‌اپ: راه‌اندازی صفحه در jsdom و بررسی ساختار و تعامل پایه.
   اجرا: npm test */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const SOURCE = fs.readFileSync(HTML, 'utf8');

const IGNORED_ERRORS = [
  /Not implemented: HTMLCanvasElement/, // jsdom بدون بستهٔ canvas، WebGL ندارد
  /Not implemented: window\.scrollTo/,
  /Could not load img/,
  /css style decl/
];

let dom;
let errors = [];

function tick(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

before(async () => {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (!IGNORED_ERRORS.some((re) => re.test(e.message))) errors.push('jsdomError: ' + e.message);
  });
  virtualConsole.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  dom = await JSDOM.fromFile(HTML, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole
  });
  dom.window.addEventListener('error', (e) => errors.push('window error: ' + e.message));
  // منتظر می‌مانیم تا زنجیرهٔ بارگذاری کتابخانه‌ها و boot کامل شود
  await dom.window.BJ_READY;
  for (let i = 0; i < 40; i++) {
    if (dom.window.document.querySelectorAll('#rail .wk').length === 40) break;
    await tick(50);
  }
});

after(() => {
  if (dom) dom.window.close();
});

test('هیچ خطای اجرای غیرمنتظره‌ای رخ نمی‌دهد', () => {
  assert.deepStrictEqual(errors, []);
});

test('تایم‌لاین هر ۴۰ هفته را می‌سازد', () => {
  const weeks = dom.window.document.querySelectorAll('#rail .wk');
  assert.strictEqual(weeks.length, 40);
  assert.strictEqual(weeks[0].getAttribute('data-w'), '1');
  assert.strictEqual(weeks[39].getAttribute('data-w'), '40');
});

test('وضعیت اولیهٔ رابط کاربری درست است', () => {
  const doc = dom.window.document;
  assert.strictEqual(doc.getElementById('hudNum').textContent, '۱');
  assert.strictEqual(doc.getElementById('pweek').textContent, '۱');
  assert.ok(doc.getElementById('pane').textContent.trim().length > 0);
  assert.ok(doc.querySelectorAll('#specs .sch2').length >= 4);
});

test('انتخاب هفتهٔ دیگر، رابط را به‌روز می‌کند', () => {
  const doc = dom.window.document;
  const btn = doc.querySelector('.wk[data-w="20"]');
  btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.strictEqual(doc.getElementById('hudNum').textContent, '۲۰');
  assert.strictEqual(doc.getElementById('pweek').textContent, '۲۰');
  assert.strictEqual(doc.getElementById('pbar').getAttribute('aria-valuenow'), '20');
  assert.ok(btn.classList.contains('on'));
  assert.strictEqual(btn.getAttribute('aria-current'), 'step');
  assert.ok(/هفتهٔ ۲۰/.test(doc.getElementById('a11yStatus').textContent));
});

test('تب‌ها با الگوی ARIA کار می‌کنند', () => {
  const doc = dom.window.document;
  const tabs = doc.querySelectorAll('#tabs [role="tab"]');
  assert.strictEqual(tabs.length, 4);
  assert.strictEqual(tabs[0].getAttribute('aria-selected'), 'true');
  tabs[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.strictEqual(tabs[1].getAttribute('aria-selected'), 'true');
  assert.strictEqual(tabs[0].getAttribute('aria-selected'), 'false');
  assert.strictEqual(doc.getElementById('pane').getAttribute('aria-labelledby'), 'tab-1');
  assert.ok(/ریزمغذی/.test(doc.getElementById('pane').textContent));
});

test('دکمه‌های قبلی/بعدی محدوده‌ها را رعایت می‌کنند', () => {
  const doc = dom.window.document;
  doc.getElementById('prevB').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.strictEqual(doc.getElementById('hudNum').textContent, '۱۹');
  assert.strictEqual(doc.getElementById('prevB').disabled, false);
});

test('ورودی نامعتبر به goTo باعث خرابی نمی‌شود', () => {
  const doc = dom.window.document;
  const hash = '#w99';
  dom.window.location.hash = hash; // بزرگ‌تر از ۴۰ → باید روی ۴۰ مهار شود
  return tick(60).then(() => {
    const n = Number(doc.getElementById('hudNum').textContent.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    assert.ok(n >= 1 && n <= 40, 'week clamped, got ' + n);
  });
});

test('document.write در منبع استفاده نشده است', () => {
  const code = SOURCE.replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(!/document\.write/.test(code), 'document.write باید حذف شود');
});

test('منابع CDN دارای SRI هستند', () => {
  const cdn = SOURCE.match(/https:\/\/(cdn\.jsdelivr\.net|unpkg\.com)[^'\"]+/g) || [];
  assert.ok(cdn.length >= 4);
  const sri = SOURCE.match(/sha384-[A-Za-z0-9+/=]+/g) || [];
  assert.ok(sri.length >= 4, 'برای هر منبع CDN یک هش integrity لازم است');
});

test('همهٔ منابع محلی ارجاع‌شده در صفحه وجود دارند', () => {
  const refs = new Set();
  for (const m of SOURCE.matchAll(/(?:src|href)="((?!https?:|#|mailto:)[^"]+)"/g)) refs.add(m[1]);
  for (const m of SOURCE.matchAll(/url\('([^')]+)'\)/g)) refs.add(m[1]);
  for (const m of SOURCE.matchAll(/\[\['([^']+)',/g)) refs.add(m[1]);
  for (const ref of refs) {
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    assert.ok(fs.existsSync(path.join(ROOT, clean)), 'فایل موجود نیست: ' + ref);
  }
});

test('ساختار دسترس‌پذیری پایه برقرار است', () => {
  const doc = dom.window.document;
  assert.ok(doc.querySelector('a.skip[href="#main"]'));
  assert.strictEqual(doc.getElementById('main').tagName, 'MAIN');
  assert.strictEqual(doc.getElementById('pane').getAttribute('role'), 'tabpanel');
  assert.strictEqual(doc.getElementById('rail').getAttribute('role') || doc.getElementById('rail').tagName, 'NAV');
  assert.strictEqual(doc.getElementById('toast').getAttribute('role'), 'status');
  assert.strictEqual(doc.getElementById('stageInner').getAttribute('aria-hidden'), 'true');
  for (const id of ['prevB', 'nextB', 'lblBtn', 'rvBtn']) {
    assert.ok(doc.getElementById(id).getAttribute('aria-label'), id + ' باید aria-label داشته باشد');
  }
});
