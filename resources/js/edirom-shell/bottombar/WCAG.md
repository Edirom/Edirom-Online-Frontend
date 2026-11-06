# WCAG check: edirom-bottombar

Manual sample against WCAG 2.2.

| Check | Result |
|---|---|
| 4.1.2 Name and role | Actions are buttons. Toggles expose `aria-pressed`. The current window exposes `aria-current`. |
| 1.4.1 Use of colour | Pressed state keeps the text label. |
| 2.1.1 Keyboard | Every action is a button. |
| 2.4.7 Focus visible | 3px outline, including the slotted concordance button. |
| 1.4.4 Resize | `flex-wrap` keeps the bar on several lines at 200% zoom. |
| 2.5.5 Target size | Minimum 2.75rem. |

Open `index.html` and reach Raster, Taktzahlen and a window button with Tab only.
