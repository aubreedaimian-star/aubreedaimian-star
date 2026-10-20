const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'workshop-1');
const pages = ['index.html', 'about.html', 'project.html', 'group-work.html'];

function readPage(filename) {
  return fs.readFileSync(path.join(root, filename), 'utf8');
}

test('workshop 1 exposes all required pages', () => {
  for (const page of pages) {
    assert.equal(fs.existsSync(path.join(root, page)), true, `${page} should exist`);
  }
});

test('each page has semantic landmarks and one h1', () => {
  for (const page of pages) {
    const html = readPage(page);
    assert.match(html, /<header\b/i, `${page} should have a header`);
    assert.match(html, /<nav\b/i, `${page} should have navigation`);
    assert.match(html, /<main\b/i, `${page} should have a main landmark`);
    assert.match(html, /<footer\b/i, `${page} should have a footer`);
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, `${page} should have one h1`);
  }
});

test('shared navigation targets every page', () => {
  for (const page of pages) {
    const html = readPage(page);
    for (const target of pages) {
      assert.match(html, new RegExp(`href=["']${target}["']`, 'i'), `${page} should link to ${target}`);
    }
  }
});

test('all local references resolve', () => {
  const requiredAssets = ['css/style.css', 'js/site.js', 'img/profile-illustration.svg'];
  for (const asset of requiredAssets) {
    assert.equal(fs.existsSync(path.join(root, asset)), true, `${asset} should exist`);
  }

  for (const page of pages) {
    const html = readPage(page);
    const references = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)]
      .map((match) => match[1])
      .filter((reference) => !/^(?:https?:|mailto:|#)/i.test(reference));

    for (const reference of references) {
      const cleanReference = reference.split('#')[0].split('?')[0];
      assert.equal(
        fs.existsSync(path.resolve(root, cleanReference)),
        true,
        `${page} reference ${reference} should resolve`,
      );
    }
  }
});

test('metadata, active navigation and skip links are complete', () => {
  for (const page of pages) {
    const html = readPage(page);
    assert.match(html, /<meta\s+charset=["']utf-8["']/i, `${page} should declare UTF-8`);
    assert.match(html, /<meta\s+name=["']viewport["'][^>]+width=device-width/i, `${page} should set a viewport`);
    assert.match(html, /<a\s+class=["']skip-link["']\s+href=["']#main["']/i, `${page} should include a skip link`);
    assert.match(html, /<main\s+id=["']main["']/i, `${page} should expose the skip-link target`);

    const activeLinks = [...html.matchAll(/<a\s+href=["']([^"']+)["'][^>]*aria-current=["']page["'][^>]*>/gi)];
    assert.equal(activeLinks.length, 1, `${page} should identify one current navigation link`);
    assert.equal(activeLinks[0][1], page, `${page} should identify itself as current`);
  }
});

test('links are named and content contains no unfinished copy', () => {
  for (const page of pages) {
    const html = readPage(page);
    assert.doesNotMatch(html, /\b(?:lorem ipsum|todo|tbd|replace_me)\b/i, `${page} should not contain placeholder copy`);

    for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const attributes = match[1];
      const visibleText = match[2].replace(/<[^>]+>/g, '').trim();
      assert.ok(visibleText || /aria-label=["'][^"']+["']/i.test(attributes), `${page} links should have a name`);
    }
  }
});

test('shared styles preserve focus, reduced motion and responsive layouts', () => {
  const cssPath = path.join(root, 'css', 'style.css');
  assert.equal(fs.existsSync(cssPath), true, 'style.css should exist');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /:focus-visible\b/, 'keyboard focus should be visibly styled');
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'reduced motion should be respected');
  assert.match(css, /@media\s*\(min-width:\s*48rem\)/, 'desktop layout should have a breakpoint');
  assert.match(css, /overflow-x:\s*(?:hidden|clip)/, 'the page should prevent horizontal overflow');
});

test('initSite toggles the mobile menu and updates the year', () => {
  const scriptPath = path.join(root, 'js', 'site.js');
  assert.equal(fs.existsSync(scriptPath), true, 'site.js should exist');
  const { initSite } = require(scriptPath);

  const makeElement = () => {
    const attributes = new Map();
    const handlers = new Map();
    const classes = new Set();
    return {
      textContent: '',
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        toggle: (name, force) => (force ? classes.add(name) : classes.delete(name)),
        contains: (name) => classes.has(name),
      },
      setAttribute: (name, value) => attributes.set(name, String(value)),
      getAttribute: (name) => attributes.get(name),
      addEventListener: (name, handler) => handlers.set(name, handler),
      click: () => handlers.get('click')?.(),
    };
  };

  const button = makeElement();
  const nav = makeElement();
  const link = makeElement();
  const year = makeElement();
  nav.querySelectorAll = () => [link];
  button.setAttribute('aria-expanded', 'false');

  const fakeDocument = {
    querySelector: (selector) => ({ '[data-menu-toggle]': button, '[data-site-nav]': nav }[selector] || null),
    querySelectorAll: (selector) => (selector === '[data-current-year]' ? [year] : []),
  };

  initSite(fakeDocument);
  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(nav.classList.contains('is-open'), true);

  link.click();
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(nav.classList.contains('is-open'), false);
  assert.equal(year.textContent, String(new Date().getFullYear()));
});
