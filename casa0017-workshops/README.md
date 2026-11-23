# CASA0017 Workshops 1–5

Five completed learning exercises from the CASA0017 Web Architecture workshop guides.

## Projects

- `workshop-1/` — a responsive four-page personal website built with HTML, CSS, and vanilla JavaScript.
- `workshop-2/` — a Google Maps Flickr discovery tool using the CASA0017 data API.
- `workshop-3/` — a Bootstrap MQTT viewer for the `UCL/90TCR` topic.
- `workshop-4/` — a reproducible completion journal for the ten Chrome DevTools exercises.
- `workshop-5/` — the introductory Node.js program using the pinned `colors` package.

## Run locally

Serve the repository root with any static HTTP server. On Windows, the Python launcher command is:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000/workshop-1/`, `/workshop-2/`, or `/workshop-3/`.

If `py` is unavailable, use VS Code's Live Server extension or another static server. Do not open the HTML pages directly with `file://`; the API exercises are designed to run over HTTP.

### Workshop 2 local key

Workshop 2 needs a browser-restricted Google Maps key. Create the ignored file `workshop-2/js/config.local.js` with this shape:

```js
window.CASA_CONFIG = {
  googleMapsApiKey: 'paste-your-browser-restricted-key-here',
};
```

Never commit the real key. Before publishing, restrict it in Google Cloud to the exact GitHub Pages hostname and only the Maps JavaScript API.

## Workshop 5

Install the locked dependency without lifecycle scripts, then run the Node.js exercise:

```powershell
npm ci --ignore-scripts
npm run start:workshop-5
```

The course-server SSH route is optional when Node.js is available locally. See `workshop-5/README.md` for both approaches; never save UCL credentials in the project.

## Test

```powershell
npm test
```

Individual suites are available as `npm run test:workshop-1`, `npm run test:workshop-2`, `npm run test:workshop-3`, and `npm run test:workshop-5`. Workshop 4 is a manual DevTools exercise and its evidence is recorded in `workshop-4/README.md`.

The test suite is credential-free: Google Maps, API responses, and MQTT clients are replaced at the external boundary with deterministic fakes while the application logic and DOM construction remain real.

## External-service notes

- Workshop 1 has no runtime service dependency.
- Workshop 2 needs internet access to the jQuery, Google Fonts, and Google Maps CDNs, a valid Maps key, and an available `https://casa0017.cetools.org` API.
- Workshop 3 needs internet access to the Bootstrap, jQuery, and MQTT.js CDNs and WebSocket access to `mqtt://mqtt.cetools.org:8080`. A campus, corporate, or privacy-focused network may block that port.
- Workshop 4 uses Chrome DevTools and internet access for the third-party pages named by the guide.
- Workshop 5 needs Node.js, npm and the locked `colors@1.4.0` package; SSH is optional for the introductory script.
- Both interactive workshops show readable error states when a dependency or service is unavailable.

## Optional GitHub Pages publication

1. Create or choose the destination GitHub repository.
2. Push this repository without `workshop-2/js/config.local.js`.
3. Enable Pages for the intended branch and root directory.
4. Add a browser-restricted Maps key only through an intentional deployment approach; remember that any key used by client-side JavaScript is visible to site visitors and must be domain-restricted.
5. Open all three browser-based routes and repeat the manual checks below. Workshops 4 and 5 are documentation and command-line exercises rather than GitHub Pages routes.

## Review before use

Before using the work, make sure you can explain and demonstrate:

- **Workshop 1:** semantic landmarks, relative navigation, responsive CSS, the mobile menu, focus styles, and why the pages still work without JavaScript.
- **Workshop 2:** coordinate rounding, the CASA data URL, initial and drag-triggered requests, stale-response protection, marker cleanup, the ignored key file, and escaped photo metadata.
- **Workshop 3:** MQTT publish/subscribe, the broker and topic, connection-state events, safe `textContent` rendering, reconnection behavior, and the 100-message limit.
- **Workshop 4:** element inspection, temporary DOM/CSS edits, console logging, source breakpoints, network filtering, storage, certificate checks and Lighthouse interpretation.
- **Workshop 5:** Node.js module loading, npm's lockfile, terminal execution, the `colors/safe` import and why credentials stay outside source control.
- **Manual browser pass:** 320, 768, 1024, and 1440 pixel widths; keyboard navigation; no horizontal overflow; readable loading/empty/error states; and no unexpected console errors.

External course services may be unavailable outside the UCL teaching environment, so distinguish a service outage from an application error when reviewing the console and network panel.

## Generative AI acknowledgement

Generative AI assisted with code structure, automated tests, accessibility checks, and documentation. The student reviewed the workshop requirements and remains responsible for understanding and validating the submitted work.
