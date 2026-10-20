const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'workshop-2');
const indexPath = path.join(root, 'index.html');

function readIndex() {
  return fs.readFileSync(indexPath, 'utf8');
}

test('workshop 2 exposes the map, photo count and live status', () => {
  assert.equal(fs.existsSync(indexPath), true, 'index.html should exist');
  const html = readIndex();
  assert.match(html, /id=["']map-canvas["']/i);
  assert.match(html, /id=["']photoNum["']/i);
  assert.match(html, /id=["']mapStatus["']/i);
  assert.match(html, /id=["']mapStatus["'][^>]*(?:aria-live=["']polite["']|role=["']status["'])/i);
});

test('workshop 2 loads dependencies in a safe order without a committed key', () => {
  const html = readIndex();
  const jqueryPosition = html.search(/jquery(?:-|\.)3\.6\.0(?:\.min)?\.js/i);
  const appPosition = html.search(/js\/app\.js/i);
  assert.ok(jqueryPosition >= 0, 'jQuery 3.6.0 should be loaded');
  assert.ok(appPosition > jqueryPosition, 'application code should load after jQuery');
  assert.match(html, /js\/config\.local\.js/i, 'local ignored configuration should be referenced');
  assert.doesNotMatch(html, /AIza[0-9A-Za-z_-]{20,}/, 'no Google API key should be committed');
});

test('all workshop 2 local references resolve', () => {
  const html = readIndex();
  const references = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|#)/i.test(reference))
    .filter((reference) => reference !== 'js/config.local.js');

  for (const reference of references) {
    assert.equal(
      fs.existsSync(path.resolve(root, reference.split('?')[0])),
      true,
      `${reference} should resolve`,
    );
  }
});

test('workshop 2 provides a documented local configuration shape', () => {
  const examplePath = path.join(root, 'js', 'config.example.js');
  assert.equal(fs.existsSync(examplePath), true, 'config.example.js should exist');
  const example = fs.readFileSync(examplePath, 'utf8');
  assert.match(example, /window\.CASA_CONFIG/);
  assert.match(example, /googleMapsApiKey\s*:/);
  assert.doesNotMatch(example, /AIza[0-9A-Za-z_-]{20,}/);
});

test('coordinate helpers format the CASA0017 data URL exactly', () => {
  const appPath = path.join(root, 'js', 'app.js');
  assert.equal(fs.existsSync(appPath), true, 'app.js should exist');
  const { formatCoordinates, buildDataUrl } = require(appPath);

  assert.deepEqual(formatCoordinates(51.514756, -0.104345), { lat: '51.51', lng: '-0.104' });
  assert.equal(
    buildDataUrl(51.514756, -0.104345),
    'https://casa0017.cetools.org/data/51.51/-0.104/50',
  );
  assert.throws(() => formatCoordinates(Number.NaN, 0), /finite/i);
});

test('photo helpers provide safe fallbacks and escape untrusted metadata', () => {
  const appPath = path.join(root, 'js', 'app.js');
  assert.equal(fs.existsSync(appPath), true, 'app.js should exist');
  const { normalisePhoto, buildPhotoContent } = require(appPath);

  const fallback = normalisePhoto({ pid: 7, points: { y: 51.5, x: -0.1 } });
  assert.equal(fallback.description, 'No description provided');
  assert.equal(fallback.device, 'Unknown camera');
  assert.equal(fallback.downloadUrl, '');
  assert.equal(fallback.dateLabel, 'Date unavailable');

  const unsafe = normalisePhoto({
    pid: 'photo&7',
    points: { y: 51.5, x: -0.1 },
    description: '<script>alert(1)</script>',
    device: '<img src=x onerror=alert(1)>',
    download_url: 'javascript:alert(1)',
    date_uploaded: 1_700_000_000,
  });
  const content = buildPhotoContent(unsafe);
  assert.match(content, /photo&amp;7/);
  assert.match(content, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(content, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(content, /<script|javascript:/i);
  assert.match(content, /51\.50000, -0\.10000/);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createMapHarness(responseQueue = []) {
  const elements = {
    'map-canvas': { id: 'map-canvas' },
    photoNum: { textContent: '0' },
    mapStatus: { textContent: '', dataset: {} },
  };
  const calls = [];
  const maps = [];
  const markers = [];
  const infoWindows = [];

  class LatLng {
    constructor(lat, lng) {
      this.latitude = lat;
      this.longitude = lng;
    }
    lat() { return this.latitude; }
    lng() { return this.longitude; }
  }

  class Map {
    constructor(element, options) {
      this.element = element;
      this.options = options;
      this.center = options.center;
      this.listeners = {};
      maps.push(this);
    }
    getCenter() { return this.center; }
    setCenter(center) { this.center = center; }
  }

  class Marker {
    constructor(options) {
      this.options = options;
      this.mapAssignments = [];
      this.listeners = {};
      markers.push(this);
    }
    setMap(map) {
      this.map = map;
      this.mapAssignments.push(map);
    }
  }

  class InfoWindow {
    constructor(options) {
      this.options = options;
      infoWindows.push(this);
    }
    setContent(content) { this.content = content; }
    open(map, marker) {
      this.openedWith = { map, marker };
    }
  }

  const google = {
    maps: {
      LatLng,
      Map,
      Marker,
      InfoWindow,
      event: {
        addListener(target, eventName, handler) {
          target.listeners[eventName] = handler;
        },
      },
    },
  };

  const getJSON = (url) => {
    calls.push(url);
    const response = responseQueue.shift();
    return response instanceof Promise ? response : Promise.resolve(response);
  };

  return {
    dependencies: {
      google,
      getJSON,
      document: { getElementById: (id) => elements[id] || null },
      mapStyles: [{ featureType: 'all', stylers: [{ saturation: -100 }] }],
    },
    responseQueue,
    elements,
    calls,
    maps,
    markers,
    infoWindows,
    google,
  };
}

test('map controller initializes London and refreshes custom markers after drag', async () => {
  const { createMapController } = require(path.join(root, 'js', 'app.js'));
  const queue = [[{ pid: 'first', points: { y: 51.51, x: -0.1 } }]];
  const harness = createMapHarness(queue);
  const controller = createMapController(harness.dependencies);

  await controller.initialize();
  assert.equal(harness.maps.length, 1);
  assert.equal(harness.maps[0].options.center.lat(), 51.514756);
  assert.equal(harness.maps[0].options.center.lng(), -0.104345);
  assert.equal(harness.maps[0].options.zoom, 14);
  assert.equal(harness.maps[0].options.maxZoom, 18);
  assert.deepEqual(harness.maps[0].options.styles, harness.dependencies.mapStyles);
  assert.equal(harness.calls[0], 'https://casa0017.cetools.org/data/51.51/-0.104/50');
  assert.equal(harness.elements.photoNum.textContent, '1');
  assert.equal(harness.markers[0].options.icon, './img/icon.png');
  assert.equal(harness.markers[0].map, harness.maps[0]);

  queue.push([]);
  harness.maps[0].center = new harness.google.maps.LatLng(51.6, -0.2);
  await harness.maps[0].listeners.dragend();
  assert.equal(harness.calls[1], 'https://casa0017.cetools.org/data/51.60/-0.200/50');
  assert.equal(harness.markers[0].mapAssignments.at(-1), null);
  assert.equal(harness.elements.photoNum.textContent, '0');
  assert.match(harness.elements.mapStatus.textContent, /no photos/i);
});

test('map controller ignores stale data and reports request errors', async () => {
  const { createMapController } = require(path.join(root, 'js', 'app.js'));
  const first = deferred();
  const second = deferred();
  const harness = createMapHarness([first.promise, second.promise]);
  const controller = createMapController(harness.dependencies);

  const oldRequest = controller.getData(51.5, -0.1);
  const newRequest = controller.getData(51.6, -0.2);
  second.resolve([
    { pid: 'new-1', points: { y: 51.6, x: -0.2 } },
    { pid: 'new-2', points: { y: 51.61, x: -0.21 } },
  ]);
  await newRequest;
  first.resolve([{ pid: 'stale', points: { y: 51.5, x: -0.1 } }]);
  await oldRequest;
  assert.equal(harness.elements.photoNum.textContent, '2');
  assert.equal(harness.markers.length, 2, 'stale response should not create markers');

  const errorHarness = createMapHarness([Promise.reject(new Error('offline'))]);
  const errorController = createMapController(errorHarness.dependencies);
  await errorController.getData(51.5, -0.1);
  assert.equal(errorHarness.elements.photoNum.textContent, '0');
  assert.equal(errorHarness.elements.mapStatus.dataset.state, 'error');
  assert.match(errorHarness.elements.mapStatus.textContent, /unable|offline|try again/i);
});

test('Google Maps loader requires local configuration and uses a callback URL', async () => {
  const { loadGoogleMaps } = require(path.join(root, 'js', 'app.js'));
  const appended = [];
  const status = { textContent: '', dataset: {} };
  const windowObject = {};
  const fakeDocument = {
    defaultView: windowObject,
    head: { appendChild: (element) => appended.push(element) },
    createElement: () => ({}),
    getElementById: (id) => (id === 'mapStatus' ? status : null),
  };

  assert.equal(await loadGoogleMaps({}, fakeDocument), false);
  assert.equal(appended.length, 0);
  assert.equal(status.dataset.state, 'error');
  assert.match(status.textContent, /key|config/i);

  const loading = loadGoogleMaps({ googleMapsApiKey: 'test-key' }, fakeDocument);
  assert.equal(appended.length, 1);
  assert.match(appended[0].src, /maps\.googleapis\.com\/maps\/api\/js/);
  assert.match(appended[0].src, /key=test-key/);
  assert.match(appended[0].src, /callback=__casa0017GoogleMapsReady/);
  windowObject.__casa0017GoogleMapsReady();
  assert.equal(await loading, true);
});

test('marker clicks load photo details and reuse the info window', async () => {
  const { createMapController } = require(path.join(root, 'js', 'app.js'));
  const harness = createMapHarness([
    [{ pid: 'photo 7', points: { y: 51.51, x: -0.1 } }],
    [{ description: 'Street+scene', device: 'Camera+One', download_url: 'https://example.test/photo.jpg', date_uploaded: 1_700_000_000 }],
  ]);
  const controller = createMapController(harness.dependencies);
  await controller.initialize();
  await harness.markers[0].listeners.click();

  assert.equal(harness.calls[1], 'https://casa0017.cetools.org/data/photoDescription/photo%207');
  assert.match(harness.infoWindows[0].content, /Street scene/);
  assert.match(harness.infoWindows[0].content, /Camera One/);
  assert.deepEqual(harness.infoWindows[0].openedWith, {
    map: harness.maps[0],
    marker: harness.markers[0],
  });
});

test('marker detail failures produce a readable status without throwing', async () => {
  const { createMapController } = require(path.join(root, 'js', 'app.js'));
  const harness = createMapHarness([
    [{ pid: 'photo-8', points: { y: 51.51, x: -0.1 } }],
    Promise.reject(new Error('details offline')),
  ]);
  const controller = createMapController(harness.dependencies);
  await controller.initialize();
  await harness.markers[0].listeners.click();
  assert.equal(harness.elements.mapStatus.dataset.state, 'error');
  assert.match(harness.elements.mapStatus.textContent, /details|try again/i);
});
