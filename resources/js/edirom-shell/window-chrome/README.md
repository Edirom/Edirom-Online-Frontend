# edirom-window-chrome

Title and the three window buttons. The host performs minimise, maximise and close. Escape on the chrome emits `window-close`.

## Include

```html
<script src="edirom-window-chrome.js"></script>
<edirom-window-chrome lang="de" window-title="Faksimile"></edirom-window-chrome>
```

## Attributes

| Attribute | Type | Description |
|---|---|---|
| `window-title` | string | Visible title. |
| `lang` | `de` \| `en` | Accessible names of the buttons. |
| `maximized` | boolean attribute | Switches the middle button between maximise and restore. |

## Events

| Event | detail | When |
|---|---|---|
| `window-minimize` | `{ title }` | Minimise. |
| `window-maximize` | `{ title }` | Maximise or restore. |
| `window-close` | `{ title }` | Close button or Escape. |

## Example

Open [index.html](index.html).

## Licence

MIT. See [../LICENSE](../LICENSE).
