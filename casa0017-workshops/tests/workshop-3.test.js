const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'workshop-3');
const indexPath = path.join(root, 'index.html');

function readIndex() {
  return fs.readFileSync(indexPath, 'utf8');
}

test('workshop 3 loads the tutorial library versions and fixed navigation', () => {
  assert.equal(fs.existsSync(indexPath), true, 'index.html should exist');
  const html = readIndex();
  assert.match(html, /bootstrap@5\.1\.3/i);
  assert.match(html, /jquery-3\.6\.0(?:\.min)?\.js/i);
  assert.match(html, /mqtt@4\.2\.1\/dist\/mqtt\.min\.js/i);
  assert.match(html, /<nav\b[^>]*class=["'][^"']*fixed-top[^"']*["']/i);
});

test('workshop 3 exposes connection and message regions accessibly', () => {
  const html = readIndex();
  assert.match(html, /id=["']connectionStatus["']/i);
  assert.match(html, /id=["']connectionIndicator["']/i);
  assert.match(html, /id=["']messageContainer["']/i);
  assert.match(html, /id=["']connectionStatus["'][^>]*aria-live=["']polite["']/i);
  assert.match(html, /id=["']messageContainer["'][^>]*(?:aria-live=["']polite["']|role=["']feed["'])/i);
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'the page should have one h1');
});

test('workshop 3 keeps custom application code and styles external', () => {
  const html = readIndex();
  assert.match(html, /href=["']css\/style\.css["']/i);
  assert.match(html, /src=["']js\/app\.js["']/i);

  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    assert.match(script[1], /\bsrc=["'][^"']+["']/i, 'application scripts should be external');
    assert.equal(script[2].trim(), '', 'script elements should not contain inline application code');
  }
});

test('all workshop 3 local references resolve', () => {
  const html = readIndex();
  const references = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|#)/i.test(reference));

  for (const reference of references) {
    assert.equal(fs.existsSync(path.resolve(root, reference)), true, `${reference} should resolve`);
  }
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.textContent = '';
    this.dataset = {};
    this.attributes = new Map();
    this.classList = {
      add: (...names) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => classes.add(name));
        this.className = [...classes].join(' ');
      },
      remove: (...names) => {
        const removed = new Set(names);
        this.className = this.className.split(/\s+/).filter((name) => name && !removed.has(name)).join(' ');
      },
      contains: (name) => this.className.split(/\s+/).includes(name),
    };
  }

  append(...children) {
    for (const child of children) this.appendChild(child);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  prepend(child) {
    child.parentNode = this;
    this.children.unshift(child);
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  matches(selector) {
    if (selector === '[data-empty-state]') return Object.hasOwn(this.dataset, 'emptyState');
    if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
    return this.tagName === selector.toUpperCase();
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    for (const child of this.children) {
      if (child.matches(selector)) matches.push(child);
      matches.push(...child.querySelectorAll(selector));
    }
    return matches;
  }
}

function createFakeDocument() {
  return { createElement: (tagName) => new FakeElement(tagName) };
}

test('message renderer decodes payloads and inserts safe timestamped cards', () => {
  const appPath = path.join(root, 'js', 'app.js');
  assert.equal(fs.existsSync(appPath), true, 'app.js should exist');
  const { decodePayload, formatTimestamp, createMessageRenderer } = require(appPath);
  const document = createFakeDocument();
  const container = new FakeElement('div');
  const empty = new FakeElement('div');
  empty.dataset.emptyState = '';
  container.appendChild(empty);

  assert.equal(decodePayload(Buffer.from('hello')), 'hello');
  assert.match(formatTimestamp(new Date('2026-10-13T10:30:00Z')), /2026/);

  const renderer = createMessageRenderer(document, container, 100);
  const card = renderer.prepend('UCL/90TCR', Buffer.from('<script>alert(1)</script>'), new Date('2026-10-13T10:30:00Z'));
  assert.equal(container.querySelector('[data-empty-state]'), null);
  assert.equal(card.className, 'messageContainer');
  assert.equal(card.querySelector('h3').textContent, 'UCL/90TCR');
  assert.equal(card.querySelector('.lead').textContent, '<script>alert(1)</script>');
  assert.match(card.querySelector('.subTime').textContent, /2026/);
  assert.equal(card.children.length, 3, 'payload text should not create HTML nodes');
});

test('message renderer prepends newest messages and retains at most 100', () => {
  const { createMessageRenderer } = require(path.join(root, 'js', 'app.js'));
  const container = new FakeElement('div');
  const renderer = createMessageRenderer(createFakeDocument(), container, 100);

  for (let index = 0; index < 101; index += 1) {
    renderer.prepend(`topic/${index}`, `message ${index}`, new Date('2026-10-13T10:30:00Z'));
  }

  const cards = container.querySelectorAll('.messageContainer');
  assert.equal(cards.length, 100);
  assert.equal(cards[0].querySelector('h3').textContent, 'topic/100');
  assert.equal(cards.at(-1).querySelector('h3').textContent, 'topic/1');
});

class FakeMqttClient {
  constructor() {
    this.handlers = new Map();
    this.subscriptions = [];
    this.endCalls = [];
  }

  on(eventName, handler) {
    const handlers = this.handlers.get(eventName) || [];
    handlers.push(handler);
    this.handlers.set(eventName, handlers);
    return this;
  }

  emit(eventName, ...args) {
    return Promise.all((this.handlers.get(eventName) || []).map((handler) => handler(...args)));
  }

  subscribe(topic, callback) {
    this.subscriptions.push(topic);
    callback?.(null);
  }

  end(force) {
    this.endCalls.push(force);
  }

  removeAllListeners() {
    this.handlers.clear();
  }
}

function createMqttHarness() {
  const status = new FakeElement('span');
  const indicator = new FakeElement('span');
  indicator.className = 'connection-indicator is-disconnected';
  const container = new FakeElement('div');
  const empty = new FakeElement('div');
  empty.dataset.emptyState = '';
  container.appendChild(empty);
  const client = new FakeMqttClient();
  const connectCalls = [];
  const mqtt = {
    connect(url) {
      connectCalls.push(url);
      return client;
    },
  };
  const elements = {
    connectionStatus: status,
    connectionIndicator: indicator,
    messageContainer: container,
  };
  const document = {
    ...createFakeDocument(),
    getElementById: (id) => elements[id] || null,
  };
  return { mqtt, document, client, connectCalls, status, indicator, container };
}

test('MQTT app connects once, subscribes and renders one card per message', async () => {
  const { createMqttApp } = require(path.join(root, 'js', 'app.js'));
  const harness = createMqttHarness();
  const app = createMqttApp({
    mqtt: harness.mqtt,
    document: harness.document,
    now: () => new Date('2026-10-13T10:30:00Z'),
  });

  const firstClient = app.start();
  const secondClient = app.start();
  assert.equal(firstClient, secondClient);
  assert.deepEqual(harness.connectCalls, ['mqtt://mqtt.cetools.org:8080']);
  assert.equal(harness.client.handlers.get('message').length, 1);
  assert.equal(harness.indicator.classList.contains('is-connecting'), true);

  await harness.client.emit('connect');
  assert.deepEqual(harness.client.subscriptions, ['UCL/90TCR']);
  assert.match(harness.status.textContent, /connected|subscribed/i);
  assert.equal(harness.indicator.classList.contains('is-connected'), true);

  await harness.client.emit('message', 'UCL/90TCR', Buffer.from('<script>alert(1)</script>'));
  const cards = harness.container.querySelectorAll('.messageContainer');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].querySelector('.lead').textContent, '<script>alert(1)</script>');
});

test('MQTT app exposes error and disconnected states and stops safely', async () => {
  const { createMqttApp } = require(path.join(root, 'js', 'app.js'));
  const harness = createMqttHarness();
  const app = createMqttApp({ mqtt: harness.mqtt, document: harness.document });
  app.start();

  await harness.client.emit('error', new Error('broker unavailable'));
  assert.equal(harness.indicator.classList.contains('is-error'), true);
  assert.match(harness.status.textContent, /broker unavailable|error/i);

  await harness.client.emit('close');
  assert.equal(harness.indicator.classList.contains('is-disconnected'), true);
  assert.match(harness.status.textContent, /disconnected/i);

  app.stop();
  app.stop();
  assert.deepEqual(harness.client.endCalls, [true]);
  assert.equal(harness.status.textContent, 'Disconnected');
});
