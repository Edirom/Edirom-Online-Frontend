# edirom-notification

Shows one message with a severity the user can tell apart without relying on colour: a word (Fehler, Warnung, Erfolg, Hinweis) and a symbol.

## Include

```html
<script src="edirom-notification.js"></script>
<edirom-notification lang="de" level="error" message="Die Quelle fehlt."></edirom-notification>
```

## Attributes

| Attribute | Type | Description |
|---|---|---|
| `message` | string | Text. Empty hides the note. |
| `level` | `error` \| `warning` \| `success` \| `info` | Severity. Default `info`. |
| `lang` | `de` \| `en` | Labels. Default `de`. |

## Methods

`show(message, level)` sets the two attributes.

## Events

| Event | detail | When |
|---|---|---|
| `notification-closed` | `{ message, level }` | Close button or Escape. |

## Slots

None. The message is an attribute so it cannot inject markup.

## Keyboard

Escape closes the note. The close control is a button with a visible focus ring.

## Example

Open [index.html](index.html).

## Licence

MIT. See [../LICENSE](../LICENSE).
