# Workshop 4 — Chrome DevTools walkthrough

Workshop 4 is a hands-on browser exercise rather than a new application. This journal records all ten tasks from the CASA0017 codelab and connects them to the workshop projects in this repository.

Source: [CASA0017 Workshop 4](https://workshops.cetools.org/codelabs/CASA0017-Web-Architecture-Workshop-4/)

## Completion checklist

- [x] **Docking:** opened DevTools and compared dock-to-right, dock-to-bottom and undocked layouts.
- [x] **Appearance:** selected the dark DevTools theme and reloaded DevTools.
- [x] **Element picker:** selected a visible page logo and located the corresponding DOM node.
- [x] **Device toolbar:** checked responsive layouts and located the screenshot command. For the local work, use widths of 320, 768, 1024 and 1440 pixels.
- [x] **CSS editing:** added temporary declarations in `element.style`, observed the box model, disabled declarations and confirmed that a reload discards the edits.
- [x] **DOM editing:** temporarily changed text and an element in the Elements panel, then reloaded to restore the server version. DevTools edits are local and must not be represented as genuine third-party content.
- [x] **Console:** exercised `console.log`, `console.warn`, `console.error`, `console.dir` and `console.table`; inspected a public GitHub profile response without copying credentials or private data.
- [x] **Application storage:** stored `class_code=CASA0017` in `localStorage`, verified persistence after reload and removed only that key.
- [x] **Security:** compared an HTTPS certificate view with an HTTP origin and checked for mixed-content resources.
- [x] **Lighthouse:** reviewed performance, accessibility, best-practice and SEO findings; treated the report as guidance rather than a requirement to reach an artificial score of 100.

## Reproducible commands

Run the console examples on a page you control or on the page specified by the codelab:

```js
const profile = await fetch('https://api.github.com/users/aubreedaimian-star')
  .then((response) => {
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    return response.json();
  });

console.log('Login:', profile.login);
console.warn('Public profile data only');
console.dir(profile);
console.table([profile]);
```

Store and remove the class code:

```js
localStorage.setItem('class_code', 'CASA0017');
localStorage.getItem('class_code');
localStorage.removeItem('class_code');
```

The codelab shows `localStorage.clear("class_code")`. The argument is ignored: `clear()` removes **all** keys for that origin. Use `removeItem('class_code')` when deleting only this exercise's value.

## Applying the tools to Workshops 1–3

### Elements and responsive layout

- Inspect `workshop-1/index.html` and confirm the `header`, `nav`, `main` and `footer` landmarks.
- Toggle the device toolbar through the four target widths and check that navigation remains keyboard accessible without horizontal overflow.
- Select the mobile-menu button and inspect its `aria-expanded` state while opening and closing the menu.

### Sources and Console

- Put a breakpoint in `workshop-1/js/site.js` inside the menu click handler.
- Inspect the event, local variables and call stack, then resume execution.
- Open Workshops 2 and 3 and confirm that missing external services produce readable status messages rather than uncaught application errors.

### Network

- In Workshop 2, filter by Fetch/XHR and inspect the request to `https://casa0017.cetools.org/data/...` after moving the map.
- Confirm that local JavaScript and CSS return successful status codes and that no real API key appears in a committed resource.
- In Workshop 3, check the Console and Network panels if the MQTT WebSocket connection is blocked by the current network.

### Security and quality

- Confirm that deployed resources use HTTPS and investigate any mixed-content warning before publication.
- Run Lighthouse in a private browsing profile or after clearing unrelated extensions, because extensions can distort results.
- Use the automated suite alongside DevTools: it checks semantic structure, focus states, safe rendering, error handling and bounded message history, but it does not invent or freeze Lighthouse scores.

## Result

The exercise establishes a repeatable debugging workflow: reproduce the issue, inspect the DOM and runtime state, identify the responsible source or request, test a temporary change, apply the fix in source control, and verify again after reload.
