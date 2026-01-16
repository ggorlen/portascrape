# portascrape

A collection of simple in-browser real-time automation utilities focused on waiting and text selection.

You can use portascrape in a userscript, an extension, a bookmarklet, manually in the browser console, or with browser automation tools.

An example usage might be in a userscript, polling until a certain message appears in a chat feed, then removing it.

Project status: pre-alpha, API unstable. Link to a specific commit to ensure stability.

## Usage

[Try it!](https://stackoverflow.com/a/79406960/6243352) (see runnable snippet at bottom of post)

### Userscript

```js
// ==UserScript==
// @name         Test Portascrape
// @namespace    http://tampermonkey.net/
// @version      2025-01-26
// @description  Test Portascrape
// @author       ggorlen
// @match        https://example.com/
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/gh/ggorlen/portascrape@9cca94d/portascrape.min.js
// @grant        none
// ==/UserScript==

const text = await ps.$text("h1");
console.log(text); // => Example Domain
```

### Browser console

```js
var script = document.createElement("script");
script.onload = async () => {
  console.log(await ps.$text("h1"));
};
script.src =
  "https://cdn.jsdelivr.net/gh/ggorlen/portascrape@9cca94d/portascrape.min.js";
document.head.appendChild(script);
```

### Script tag

```html
<script src="https://cdn.jsdelivr.net/gh/ggorlen/portascrape@9cca94d/portascrape.min.js"></script>
<p>hi</p>
<script>
  ps.$text("p").then(console.log);
</script>
```

### Puppeteer

```js
import puppeteer from "puppeteer"; // ^22.10.0

let browser;
(async () => {
  const portascrapeURL =
    "https://cdn.jsdelivr.net/gh/ggorlen/portascrape@9cca94d/portascrape.min.js";
  const url = "https://www.example.com";
  browser = await puppeteer.launch();
  const [page] = await browser.pages();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ url: portascrapeURL });
  const text = await page.evaluate(async () => {
    const text = await ps.$text("h1");
    return text;
  });
  console.log(text); // => Example Domain
})()
  .catch((err) => console.error(err))
  .finally(() => browser?.close());
```

### Playwright Python

```python
from playwright.sync_api import sync_playwright # 1.44.0


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    url = "https://www.example.com"
    page.goto(url, wait_until="domcontentloaded")
    portascrape_url = "https://cdn.jsdelivr.net/gh/ggorlen/portascrape@9cca94d/portascrape.min.js"
    page.add_script_tag(url=portascrape_url)
    print(page.evaluate('ps.$text("h1")')) # => Example Domain
    browser.close()
```

### Pyppeteer

```python
import asyncio
from pyppeteer import launch # 2.0.0


async def main():
    browser = await launch()
    page = await browser.newPage()
    url = "https://www.example.com"
    await page.goto(url, waitUntil="domcontentloaded")
    portascrape_url = (
        "https://cdn.jsdelivr.net/gh/ggorlen/portascrape@9cca94d/portascrape.min.js"
    )
    await page.addScriptTag({"url": portascrape_url})
    result = await page.evaluate('ps.$text("h1")')  # => Example Domain
    print(result)
    await browser.close()


asyncio.get_event_loop().run_until_complete(main())
```

### Re-adding portascrape after navigation

Since the script is removed after each navigation, you can use an equivalent of `addInitScript` in Playwright to re-attach the script after each navigation:

```js
import {chromium} from "playwright";

const portascrapeURL =
  "https://cdn.jsdelivr.net/gh/ggorlen/portascrape@9cca94d/portascrape.min.js";
const res = await fetch(portascrapeURL);
const scriptContent = await res.text();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript({content: scriptContent});
await page.goto("https://www.example.com", {waitUntil: "commit"});
const text = await page.evaluate(async () => {
  return await ps.$text("h1");
});
console.log(text); // => Example Domain
await browser.close();
```

or:

```js
import puppeteer from "puppeteer";

const portascrapeURL =
  "https://cdn.jsdelivr.net/gh/ggorlen/portascrape@9cca94d/portascrape.min.js";
const res = await fetch(portascrapeURL);
const scriptContent = await res.text();
const browser = await puppeteer.launch();
const [page] = await browser.pages();
await page.evaluateOnNewDocument(scriptContent);
await page.goto("https://www.example.com", {waitUntil: "domcontentloaded"});
const text = await page.evaluate(async () => {
  return await ps.$text("h1");
});
console.log(text); // => Example Domain
await browser.close();
```

or:

```py
import requests
from playwright.sync_api import sync_playwright

portascrape_url = "https://cdn.jsdelivr.net/gh/ggorlen/portascrape@9cca94d/portascrape.min.js"
script_content = requests.get(portascrape_url).text

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.add_init_script(script_content)
    page.goto("https://www.example.com", wait_until="commit")
    text = page.evaluate("async () => await ps.$text('h1')")
    print(text)  # => Example Domain
    browser.close()
```

## API

All operations are async and wait for the element to exist before taking action.

| Method                          | Description |
|----------------------------------|------------|
| `ps.wait(fn, opts)`                    | Wait for an arbitrary predicate function to return truthy. |
| `ps.$(selector, opts)`                 | Wait for a DOM element matching a selector to exist and return it. |
| `ps.$click(selector, opts)`            | Wait for an element matching selector to exist, then click it. |
| `ps.$text(selector, opts)`             | Wait for an element matching selector to exist, then extract its `.textContent`. |
| `ps.$remove(selector, opts)`           | Wait for an element matching selector to exist, then remove it. |
| `ps.$table(selector, opts)`            | Wait for an element to exist, then scrape its `<tr>`, `<th>` and `<td>` content into a 2d array. |
| `ps.$tableWithHeaders(selector, opts)` | Wait for an element to exist, then scrape its `<tr>`, `<th>` and `<td>` content into an array of objects. |
| `ps.sleep(timeout)`                    | Sleep for n milliseconds. Discouraged in favor of any of the other operations, but possible. |

In all cases, `opts` is defined as:

```js
/**
 * @typedef {Object} PsOptions
 * @property {number} [timeout=10000] - Timeout in milliseconds.
 * @property {"raf" | "mutation" | number} [polling="raf"] - Polling strategy.
 * @property {string} [exactText] - Exact text to match.
 * @property {string} [containsText] - Substring to match.
 * @property {RegExp} [matches] - Regular expression to match.
 */
```

### TODO

- should be loadable on nav with [this approach](https://stackoverflow.com/questions/79716676/python-playwright-mouse-pointer-ui-enable/79716698#79716698)
- Remove all/click all/select all (e.g. `ps.$$remove()`, `ps.$$()`, `ps.$$map()`, etc)
- Add github pages docs and demo (and maybe playground)
- Use separate opts for `wait` because it doesn't use text matchers.
- Add comprehensive unit tests (solve browser playground challenges)
- Add option to permanently listen for a predicate (basically `wait` with an infinite loop around it and the option to remove it--this could be a `repeat: n` opt)
  - Option to remove an element whenever it exists and persist the listener
- Add ability to change default timeouts globally
- Generate types and uglify, similar to HTMX
- Option to remove all elements not in a subtree like [this](https://github.com/ggorlen/userscripts/blob/aafa53035a84136b6ae2704b4f8a476d56b5d364/src/weather.user.js#L36)
- Option to blast away scripts when they're added like [this](https://github.com/ggorlen/userscripts/blob/aafa53035a84136b6ae2704b4f8a476d56b5d364/src/weather.user.js#L17)
- Option to download data to file
- Macro for easily writing mutation observers or `setTimeout`/RAF loops
- Function to easily set global CSS
- Option to wait and set input value or fire an event
- Pretty DOM element logging
- Debugging/verbose mode
- Add small Node API that integrates with Puppeteer/Playwright (and other libs) to auto-add the portascrape script after every navigation
- Role-based selection
- `$not()` -- element does not exist
- `$visible()` -- element is visible
- `$scroll()` -- wait for element then scroll into view
- `waitForDOMStable()`
- `withinFrame()`
- `withinShadowRoot()`
- Visibility checks
