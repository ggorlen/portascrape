# portascrape

A collection of simple in-browser scraping utilities. Usable in any browser automation software, an extension, a userscript, or manually in the browser console.

Project status: pre-alpha.

## API

- `ps.waitForFunction(fn, opts)` -- wait for an arbitrary predicate.
- `ps.$(selector, opts)` -- wait for a DOM element matching a selector to exist and return it.
- `ps.$click(selector, opts)` -- wait for an element matching selector to exist, then click it.
- `ps.$text(selector, opts)` -- wait for an element matching selector to exist, then extract its `.textContent`.
- `ps.$table(selector, opts)` -- wait for an element to exist, then scrape its `<tr>`, `<th>` and `<td>` content into a 2d array.
- `ps.$tableWithHeaders(selector, opts)` -- wait for an element to exist, then scrape its `<tr>`, `<th>` and `<td>` content into an array of objects.
- `ps.sleep(timeout)` -- Sleep for n milliseconds. Discouraged in favor of any of the other operations, but possible.

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

TODO:

- Select the tightest match for text
- Break out special opts for waitForFunction because it doesn't use text matchers.
- Add tests
- Add TS checking, linting and autoformatting
- Make sure jsdocs are correct

Coming soon, maybe:

- Sync versions of the above API that don't wait
- Add ability to change default timeouts
- Pretty DOM element logging
- `waitForDOMStable()`
- Role-based selection
- `withinFrame()`
- `withinShadowRoot()`
- Visibility checks

## Usage

### Userscript/Browser Console

```js
var script = document.createElement("script");
script.onload = async () => {
  console.log(await ps.$text("h1"));
};
script.src =
  "https://cdn.jsdelivr.net/gh/ggorlen/portascrape@e4c3888/portascrape.min.js";
document.head.appendChild(script);
```

### Puppeteer

```js
import puppeteer from "puppeteer";

let browser;
(async () => {
  const portascrapeURL =
    "https://cdn.jsdelivr.net/gh/ggorlen/portascrape@e4c3888/portascrape.min.js";
  const url = "https://www.example.com";
  browser = await puppeteer.launch();
  const [page] = await browser.pages();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ url: portascrapeURL });
  const text = await page.evaluate(async () => {
    const text = await ps.$text("h1");
    return text;
  });
  console.log(text);
})()
  .catch((err) => console.error(err))
  .finally(() => browser?.close());
```

Unfortunately, you'll need to re-add the script on every nav. Let me know if you know of a way to add it on every nav while ensuring it'll be available immediately on domcontentloaded for waiting.
