# WCAG check: edirom-topbar

Manual sample against WCAG 2.2.

| Check | Result |
|---|---|
| 4.1.2 Name and role | Home is a button. The work choice is a native `select` with a visible label. |
| 2.1.1 Keyboard | Both controls are in tab order. The select opens with the keyboard. |
| 2.4.7 Focus visible | 3px outline on `:focus-visible`. |
| 1.4.4 Resize | The bar uses `flex-wrap`, so 200% zoom wraps instead of forcing a page-wide horizontal scroll. |
| 2.5.5 Target size | Minimum control height is 2.75rem. |

Setting `active-work` from script does not fire `work-selected`, so a screen reader is not told about the host's own update.
