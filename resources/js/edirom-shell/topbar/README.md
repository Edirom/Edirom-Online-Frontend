# edirom-topbar

Home and work switch for the upper bar. Extra actions go in the `actions` slot.

## Include

```html
<script src="edirom-topbar.js"></script>
<edirom-topbar lang="de" active-work="w1" works='[{"id":"w1","title":"Werk"}]'>
    <button slot="actions" type="button">Suche</button>
</edirom-topbar>
```

## Attributes

| Attribute | Type | Description |
|---|---|---|
| `works` | JSON array | `{ "id", "title" }`. |
| `active-work` | string | Selected work id. Setting it does not emit `work-selected`. |
| `lang` | `de` \| `en` | Button and label language. |

## Events

| Event | detail | When |
|---|---|---|
| `home` | `{}` | Home is activated. |
| `work-selected` | `{ id, title }` | The user changes the work. |

## Slots

| Slot | Description |
|---|---|
| `actions` | Extra controls, for example search. |

## Example

Open [index.html](index.html).

## Licence

MIT. See [../LICENSE](../LICENSE).
