# WCAG check: edirom-notification

Manual sample against WCAG 2.2. No automated browser report is attached because this environment has no axe run against a served page. Re-check in Chrome, Firefox, Safari and Edge before the pull request is merged.

| Check | Result |
|---|---|
| 1.3.1 / 4.1.2 Name and role | The note is `role="alert"` for errors and `role="status"` otherwise. The severity word is text, not only colour. |
| 1.4.1 Use of colour | Each level has a word and a different symbol. |
| 2.1.1 Keyboard | Close is a button. Escape closes the note. |
| 2.4.7 Focus visible | Close and the note use a 3px focus outline. |
| 1.4.4 Resize | The note wraps (`overflow-wrap: anywhere`) and does not set a fixed pixel width. |
| 2.5.5 Target size | Close control is at least 2.75rem. |

Open `index.html`, tab to Close, press Enter, then open an error and press Escape.
