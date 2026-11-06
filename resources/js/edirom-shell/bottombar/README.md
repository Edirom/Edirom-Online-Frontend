# edirom-bottombar

Lower bar: arrange open windows, toggle bar numbers and annotations, open concordance, help and about, and list open windows.

Pressed state is an attribute (`measures-visible`, `annotations-visible`), not session storage.

## Include

```html
<script src="edirom-bottombar.js"></script>
<edirom-bottombar lang="de" windows='[{"id":"a","title":"Faksimile"}]'></edirom-bottombar>
```

## Attributes

| Attribute | Type | Description |
|---|---|---|
| `lang` | `de` \| `en` | Labels. |
| `measures-visible` | `true` \| `false` | Bar-number toggle. |
| `annotations-visible` | `true` \| `false` | Annotation toggle. |
| `windows` | JSON array | `{ "id", "title" }`. |
| `active-window` | string | Id drawn as current. |

## Events

| Event | detail | When |
|---|---|---|
| `arrange-request` | `{ mode }` | `grid`, `vertical` or `horizontal`. |
| `toggle-measures` | `{ visible }` | Bar numbers. |
| `toggle-annotations` | `{ visible }` | Annotations. |
| `open-concordance` | `{}` | Concordance. |
| `open-help` | `{}` | Help. |
| `open-about` | `{}` | About. |
| `window-selected` | `{ id }` | A window button. |

## Slots

| Slot | Description |
|---|---|
| `extra` | Further controls. |
| `concordance` | If empty, the component adds `#icon_openConcordanceNavigator` so the existing desktop can still mark that button pressed. |

## Example

Open [index.html](index.html).

## Licence

MIT. See [../LICENSE](../LICENSE).
