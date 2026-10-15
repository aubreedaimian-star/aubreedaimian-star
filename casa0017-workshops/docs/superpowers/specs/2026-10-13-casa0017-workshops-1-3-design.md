# CASA0017 Workshops 1–3 Design

## Purpose

Build three self-contained learning artifacts that satisfy the published CASA0017 Workshop 1–3 instructions. The result is a local Git repository that can be opened and tested without a build step. Publishing to GitHub Pages is deliberately separate because no destination repository has been supplied.

The work is course assistance under CASA0017's Category 3 GenAI policy. The repository README will include a short acknowledgement that generative AI assisted with code structure, testing, and documentation.

## Repository Structure

```text
casa0017-workshops/
├── README.md
├── .gitignore
├── package.json
├── tests/
│   ├── workshop-1.test.js
│   ├── workshop-2.test.js
│   └── workshop-3.test.js
├── workshop-1/
│   ├── index.html
│   ├── about.html
│   ├── project.html
│   ├── group-work.html
│   ├── css/style.css
│   ├── img/profile-illustration.svg
│   └── js/site.js
├── workshop-2/
│   ├── index.html
│   ├── css/style.css
│   ├── img/icon.png
│   ├── js/app.js
│   ├── js/mapStyle.js
│   ├── js/xdate.js
│   └── js/config.example.js
└── workshop-3/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

The repository uses plain HTML, CSS, and JavaScript. Node's built-in test runner validates static structure and pure JavaScript helpers; no production framework or bundler is introduced.

## Workshop 1: Personal Website

Workshop 1 is a responsive four-page personal site for Aubree Dai. Every page shares the same header, keyboard-accessible navigation, visual system, and footer.

- `index.html`: concise introduction, current CASA study focus, and links to the other pages.
- `about.html`: an editable personal introduction and learning interests. The optional YouTube and map exercises are omitted rather than populated with invented preferences or precise personal location data.
- `project.html`: a CASA0017 project overview and a clear description of the skills being developed.
- `group-work.html`: collaboration principles and the student's current Group 2 context without naming other students.
- `profile-illustration.svg`: an original abstract illustration, avoiding third-party image licensing and personal-photo assumptions.
- `site.js`: mobile navigation state and the current year only; the site remains usable if JavaScript is unavailable.

Accessibility requirements include semantic landmarks, one `h1` per page, visible keyboard focus, descriptive link and image text, sufficient contrast, reduced-motion support, and responsive layouts at 320, 768, 1024, and 1440 pixels.

## Workshop 2: Flickr Discovery Map

Workshop 2 starts from the official `photoViewer-2026.zip` structure but moves the inline application code into `js/app.js`.

The page loads jQuery, XDate, the supplied map styles, the application module, and Google Maps. `initialize()` creates a London-centred map at `51.514756, -0.104345`, zoom `14`, maximum zoom `18`, and the supplied dark map style. It requests data on initial load and after a drag finishes.

`getData(lat, lng)` rounds latitude to two decimal places and longitude to three, then requests:

```text
https://casa0017.cetools.org/data/{lat}/{lng}/50
```

Each returned item creates a marker using the supplied custom icon. The photo counter is updated, existing markers are cleared before replacement, and a marker click fetches `/data/photoDescription/{pid}` before displaying description, upload date, camera, coordinates, and image in an information window.

The Google Maps browser key is not committed. `js/config.example.js` documents `window.CASA_CONFIG.googleMapsApiKey`; `.gitignore` excludes `js/config.local.js`. The page gives a visible setup message when the local key is absent. This avoids publishing the Moodle-provided course credential. Automated tests use Google Maps and network stubs and therefore do not need a real key.

Network failures, empty datasets, incomplete photo metadata, and rapid successive map requests produce readable status text rather than uncaught errors. Stale responses do not replace a newer result.

## Workshop 3: MQTT Message Viewer

Workshop 3 is a Bootstrap 5.1.3 page with a fixed navigation bar and separate CSS and JavaScript files. It loads jQuery 3.6.0 and MQTT.js browser 4.2.1 as required by the tutorial.

The MQTT client connects to `mqtt://mqtt.cetools.org:8080` and subscribes to `UCL/90TCR`. The navigation bar presents both text and a colored status indicator: disconnected, connecting, connected, or error. Incoming messages are prepended to the main container as accessible message cards containing the topic, decoded payload, and a local timestamp. The list retains at most 100 messages so a long-running page does not grow without limit.

Connection and subscription errors update the visible status and do not prevent the static page from rendering. Message content is inserted using text nodes, never HTML, so an MQTT payload cannot inject markup or scripts.

## Shared Testing Strategy

Tests are written before their corresponding implementation and use Node's built-in `node:test` and `assert` modules.

- Workshop 1 tests verify all four pages, shared navigation targets, landmark and heading structure, local asset references, and the absence of broken relative links.
- Workshop 2 tests verify coordinate formatting, API URL construction, initial loading behavior, marker replacement, counter updates, empty/error states, and safe handling of incomplete metadata using injected stubs.
- Workshop 3 tests verify MQTT connection options, topic subscription, safe message-card construction, timestamp output, status transitions, and the 100-message limit using a fake client and DOM fixture.
- A local static HTTP server and the isolated in-app browser verify each page visually, at desktop and mobile widths, with a clean console. External-service behavior is checked with deterministic stubs; live service availability is reported separately and is not allowed to make the core test suite flaky.

## Delivery and Publishing Boundary

The completed repository is delivered locally under the current workspace and includes setup, run, test, and optional GitHub Pages instructions. No GitHub repository is created, no code is pushed, and no Moodle completion state is changed without a later explicit destination and confirmation. Before any future publication, the diff is scanned for API keys and personal data.

## Acceptance Criteria

1. All three workshop directories open through a local static server and match the tutorial's required behavior.
2. All automated tests pass without external credentials.
3. The browser console has no application errors under the deterministic test configuration.
4. Workshop 1 works across the four target viewport widths and by keyboard.
5. Workshop 2 never commits the Google Maps key and explains local configuration clearly.
6. Workshop 3 renders MQTT payloads safely and exposes connection state visibly.
7. The README acknowledges GenAI assistance and explains what the student should review and understand before using the work.
