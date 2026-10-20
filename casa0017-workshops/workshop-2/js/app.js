(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.CasaPhotoApp = api;
    if (root.document) {
      const start = () => api.bootBrowserApp({ root, document: root.document });
      if (root.document.readyState === 'loading') {
        root.document.addEventListener('DOMContentLoaded', start, { once: true });
      } else {
        start();
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (browserRoot) {
  'use strict';

  const API_ROOT = 'https://casa0017.cetools.org';

  function formatCoordinates(lat, lng) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new TypeError('Latitude and longitude must be finite numbers.');
    }
    return {
      lat: latitude.toFixed(2),
      lng: longitude.toFixed(3),
    };
  }

  function buildDataUrl(lat, lng) {
    const coordinates = formatCoordinates(lat, lng);
    return `${API_ROOT}/data/${coordinates.lat}/${coordinates.lng}/50`;
  }

  function decodePlus(value, fallback) {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    return String(value).replace(/\+/g, ' ');
  }

  function safeImageUrl(value) {
    if (typeof value !== 'string') return '';
    return /^https?:\/\//i.test(value.trim()) ? value.trim() : '';
  }

  function normalisePhoto(row = {}) {
    const points = row.points || {};
    const lat = Number(row.lat ?? points.y);
    const lng = Number(row.lng ?? points.x);
    const uploaded = Number(row.date_uploaded ?? row.dateUploaded);
    const dateLabel = Number.isFinite(uploaded) && uploaded > 0
      ? new Date(uploaded * 1000).toLocaleString('en-GB', {
          dateStyle: 'medium',
          timeStyle: 'medium',
        })
      : 'Date unavailable';

    return {
      pid: decodePlus(row.pid, 'Unknown photo'),
      lat,
      lng,
      description: decodePlus(row.description, 'No description provided'),
      device: decodePlus(row.device, 'Unknown camera'),
      downloadUrl: safeImageUrl(row.download_url ?? row.downloadUrl),
      dateLabel,
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function buildPhotoContent(photo) {
    const location = Number.isFinite(photo.lat) && Number.isFinite(photo.lng)
      ? `${photo.lat.toFixed(5)}, ${photo.lng.toFixed(5)}`
      : 'Location unavailable';
    const image = photo.downloadUrl
      ? `<img src="${escapeHtml(photo.downloadUrl)}" alt="Photo ${escapeHtml(photo.pid)}">`
      : '<p>Image unavailable</p>';

    return `<article class="photo-info">
      <h2>Photo ${escapeHtml(photo.pid)}</h2>
      <p>${escapeHtml(photo.description)}</p>
      <dl>
        <dt>Date</dt><dd>${escapeHtml(photo.dateLabel)}</dd>
        <dt>Camera</dt><dd>${escapeHtml(photo.device)}</dd>
        <dt>Location</dt><dd>${escapeHtml(location)}</dd>
      </dl>
      ${image}
    </article>`;
  }

  function createMapController({ google, getJSON, document, mapStyles = [] }) {
    if (!google?.maps || typeof getJSON !== 'function' || !document) {
      throw new TypeError('Map controller requires google.maps, getJSON, and document.');
    }

    const mapElement = document.getElementById('map-canvas');
    const countElement = document.getElementById('photoNum');
    const statusElement = document.getElementById('mapStatus');
    let map = null;
    let markers = [];
    let latestRequestId = 0;
    const infoWindow = new google.maps.InfoWindow({ maxWidth: 300 });

    function setStatus(message, state) {
      if (!statusElement) return;
      statusElement.textContent = message;
      if (statusElement.dataset) statusElement.dataset.state = state;
    }

    function setCount(value) {
      if (countElement) countElement.textContent = String(value);
    }

    function setAllMap(targetMap) {
      for (const marker of markers) marker.setMap(targetMap);
    }

    function clearMarkers() {
      setAllMap(null);
      markers = [];
    }

    async function getData(lat, lng) {
      const requestId = ++latestRequestId;
      setStatus('Loading nearby photos…', 'loading');
      clearMarkers();
      setCount(0);

      try {
        const response = await getJSON(buildDataUrl(lat, lng));
        if (requestId !== latestRequestId) return false;
        const rows = Array.isArray(response) ? response : [];

        markers = rows.flatMap((row) => {
          const photo = normalisePhoto(row);
          if (!Number.isFinite(photo.lat) || !Number.isFinite(photo.lng)) return [];
          const marker = new google.maps.Marker({
            position: new google.maps.LatLng(photo.lat, photo.lng),
            icon: './img/icon.png',
            customInfo: photo.pid,
          });
          marker.photo = photo;
          google.maps.event.addListener(marker, 'click', async () => {
            setStatus('Loading photo details…', 'loading');
            try {
              const result = await getJSON(`${API_ROOT}/data/photoDescription/${encodeURIComponent(photo.pid)}`);
              const detail = Array.isArray(result) ? (result[0] || {}) : (result || {});
              const detailedPhoto = normalisePhoto({
                ...row,
                ...detail,
                pid: photo.pid,
                points: { y: photo.lat, x: photo.lng },
              });
              infoWindow.setContent(buildPhotoContent(detailedPhoto));
              map?.setCenter(new google.maps.LatLng(photo.lat, photo.lng));
              infoWindow.open(map, marker);
              setStatus('Photo details loaded.', 'success');
            } catch (error) {
              setStatus('Unable to load photo details. Please try again.', 'error');
            }
          });
          return [marker];
        });

        setAllMap(map);
        setCount(markers.length);
        if (markers.length === 0) {
          setStatus('No photos found around this map centre.', 'success');
        } else {
          setStatus(`${markers.length} nearby photo${markers.length === 1 ? '' : 's'} loaded.`, 'success');
        }
        return true;
      } catch (error) {
        if (requestId !== latestRequestId) return false;
        clearMarkers();
        setCount(0);
        setStatus('Unable to load photos. Check the connection and try again.', 'error');
        return false;
      }
    }

    async function initialize() {
      map = new google.maps.Map(mapElement, {
        center: new google.maps.LatLng(51.514756, -0.104345),
        zoom: 14,
        maxZoom: 18,
        styles: mapStyles,
      });

      google.maps.event.addListener(map, 'dragend', () => {
        const center = map.getCenter();
        return getData(center.lat(), center.lng());
      });

      return getData(51.514756, -0.104345);
    }

    return {
      initialize,
      getData,
      clearMarkers,
      setAllMap,
      getMap: () => map,
      getInfoWindow: () => infoWindow,
    };
  }

  function loadGoogleMaps(config = {}, document) {
    const statusElement = document?.getElementById?.('mapStatus');
    const setStatus = (message, state) => {
      if (!statusElement) return;
      statusElement.textContent = message;
      if (statusElement.dataset) statusElement.dataset.state = state;
    };
    const key = typeof config.googleMapsApiKey === 'string' ? config.googleMapsApiKey.trim() : '';
    if (!key) {
      setStatus('Add a Google Maps key in js/config.local.js to start the map.', 'error');
      return Promise.resolve(false);
    }

    const targetWindow = document.defaultView || browserRoot;
    if (targetWindow.google?.maps) return Promise.resolve(true);

    return new Promise((resolve) => {
      const callbackName = '__casa0017GoogleMapsReady';
      targetWindow[callbackName] = () => {
        delete targetWindow[callbackName];
        resolve(true);
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=visualization&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete targetWindow[callbackName];
        setStatus('Google Maps could not be loaded. Check the key and connection.', 'error');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  async function bootBrowserApp({ root, document }) {
    const loaded = await loadGoogleMaps(root.CASA_CONFIG || {}, document);
    if (!loaded) return false;

    const statusElement = document.getElementById('mapStatus');
    if (!root.jQuery?.getJSON) {
      if (statusElement) {
        statusElement.textContent = 'jQuery could not be loaded. Check the connection and refresh.';
        statusElement.dataset.state = 'error';
      }
      return false;
    }

    const getJSON = (url) => new Promise((resolve, reject) => {
      root.jQuery.getJSON(url)
        .done(resolve)
        .fail((_request, status, error) => reject(new Error(error || status || 'Request failed')));
    });
    const controller = createMapController({
      google: root.google,
      getJSON,
      document,
      mapStyles: root.darkMap || [],
    });
    root.casaPhotoController = controller;
    await controller.initialize();
    return controller;
  }

  return {
    API_ROOT,
    formatCoordinates,
    buildDataUrl,
    normalisePhoto,
    buildPhotoContent,
    createMapController,
    loadGoogleMaps,
    bootBrowserApp,
  };
});
