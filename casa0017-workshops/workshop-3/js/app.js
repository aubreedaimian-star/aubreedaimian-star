(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.CasaMqttApp = api;
    if (root.document) {
      const start = () => api.bootBrowserApp({ root, document: root.document });
      if (root.document.readyState === 'loading') {
        root.document.addEventListener('DOMContentLoaded', start, { once: true });
      } else {
        start();
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function decodePayload(message) {
    if (typeof message === 'string') return message;
    if (message === undefined || message === null) return '';
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(message)) {
      return message.toString('utf8');
    }
    if (ArrayBuffer.isView(message)) {
      return new TextDecoder('utf-8', { fatal: false }).decode(message);
    }
    if (message instanceof ArrayBuffer) {
      return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(message));
    }
    return String(message);
  }

  function formatTimestamp(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return 'Time unavailable';
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(value);
  }

  function createMessageRenderer(document, container, limit = 100) {
    if (!document?.createElement || !container?.prepend) {
      throw new TypeError('Message renderer requires a document and container.');
    }
    const maximum = Number.isInteger(limit) && limit > 0 ? limit : 100;

    function prepend(topic, payload, date = new Date()) {
      container.querySelector('[data-empty-state]')?.remove();

      const card = document.createElement('article');
      card.className = 'messageContainer';

      const heading = document.createElement('h3');
      heading.textContent = decodePayload(topic);

      const body = document.createElement('p');
      body.className = 'lead';
      body.textContent = decodePayload(payload);

      const timestamp = document.createElement('p');
      timestamp.className = 'subTime';
      timestamp.textContent = `Received ${formatTimestamp(date)}`;

      card.append(heading, body, timestamp);
      container.prepend(card);

      const cards = container.querySelectorAll('.messageContainer');
      for (let index = maximum; index < cards.length; index += 1) {
        cards[index].remove();
      }
      return card;
    }

    return { prepend };
  }

  function createMqttApp({
    mqtt,
    document,
    now = () => new Date(),
    brokerUrl = 'mqtt://mqtt.cetools.org:8080',
    topic = 'UCL/90TCR',
    messageLimit = 100,
  }) {
    const statusElement = document?.getElementById?.('connectionStatus');
    const indicatorElement = document?.getElementById?.('connectionIndicator');
    const container = document?.getElementById?.('messageContainer');
    if (!statusElement || !indicatorElement || !container) {
      throw new TypeError('MQTT app requires status, indicator, and message container elements.');
    }
    const renderer = createMessageRenderer(document, container, messageLimit);
    let client = null;

    function setStatus(state, message) {
      statusElement.textContent = message;
      indicatorElement.classList.remove(
        'is-disconnected',
        'is-connecting',
        'is-connected',
        'is-error',
      );
      indicatorElement.classList.add(`is-${state}`);
      indicatorElement.dataset.state = state;
      indicatorElement.setAttribute('title', message);
    }

    function start() {
      if (client) return client;
      if (!mqtt?.connect) {
        setStatus('error', 'MQTT library unavailable');
        return null;
      }

      setStatus('connecting', 'Connecting…');
      client = mqtt.connect(brokerUrl);

      client.on('connect', () => {
        setStatus('connected', 'Connected · subscribing…');
        client.subscribe(topic, (error) => {
          if (error) {
            setStatus('error', `Subscription error: ${error.message || error}`);
          } else {
            setStatus('connected', `Connected · subscribed to ${topic}`);
          }
        });
      });

      client.on('message', (messageTopic, message) => {
        renderer.prepend(messageTopic, message, now());
      });

      client.on('error', (error) => {
        setStatus('error', `Connection error: ${error?.message || 'Unknown error'}`);
      });

      client.on('close', () => {
        setStatus('disconnected', 'Disconnected');
      });

      return client;
    }

    function stop() {
      if (client) {
        const activeClient = client;
        client = null;
        activeClient.removeAllListeners?.();
        activeClient.end?.(true);
      }
      setStatus('disconnected', 'Disconnected');
    }

    return { start, stop, setStatus };
  }

  function bootBrowserApp({ root, document }) {
    const statusElement = document.getElementById('connectionStatus');
    const indicatorElement = document.getElementById('connectionIndicator');
    if (!root.mqtt?.connect) {
      if (statusElement) statusElement.textContent = 'MQTT library unavailable';
      if (indicatorElement) {
        indicatorElement.classList.remove('is-disconnected', 'is-connecting', 'is-connected');
        indicatorElement.classList.add('is-error');
      }
      return false;
    }

    const app = createMqttApp({ mqtt: root.mqtt, document });
    root.casaMqttApp = app;
    app.start();
    return app;
  }

  return {
    decodePayload,
    formatTimestamp,
    createMessageRenderer,
    createMqttApp,
    bootBrowserApp,
  };
});
