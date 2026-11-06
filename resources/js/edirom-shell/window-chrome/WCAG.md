# WCAG check: edirom-window-chrome

Manual sample against WCAG 2.2.

| Check | Result |
|---|---|
| 4.1.2 Name and role | Minimise, maximise and close are buttons. Their accessible names come from `aria-label` in German or English. The visible glyphs are not the only name. |
| 2.1.1 Keyboard | Buttons are in tab order. Escape on the chrome fires `window-close`. |
| 2.4.7 Focus visible | 3px outline. |
| 1.4.4 Resize | The title uses `overflow-wrap` and the bar can shrink. |
| 2.5.5 Target size | Each button is at least 2.75rem. |

The host still has to move the window. This component only exposes the actions.
