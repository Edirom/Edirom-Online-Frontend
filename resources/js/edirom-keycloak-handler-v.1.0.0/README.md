# Keycloak Web Component Handler

This repository provides a reusable Web Component for Keycloak authentication in vanilla JavaScript applications.

## Features

- Custom element `<keycloak-handler>` for easy Keycloak integration
- Loads Keycloak JS as an ES6 module (must be present in `/vendor/keycloak@26.2.0/lib/keycloak.js`)
- Handles SSO, login, and token storage as a cookie
- Works in any modern browser and can be embedded in other apps
- Published to npm for easy installation across projects

## Installation

### Via npm

```bash
npm install @edirom/keycloak-handler
```

Then in your JavaScript:

```javascript
import '@edirom/keycloak-handler';
```

Or directly in your HTML:

```html
<script type="module" src="node_modules/@edirom/keycloak-handler/keycloak-handler.js"></script>
```

### Via CDN (jsDelivr)

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@edirom/keycloak-handler@latest/keycloak-handler.js"></script>
```

### Via GitHub Raw Files

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Edirom/edirom-keycloak-handler@main/keycloak-handler.js"></script>
```

## Usage

1. **Add the Web Component to your HTML:**

   ```html
   <keycloak-handler
     url="https://keycloak.yourDomain.de"
     realm="your-realm"
     client-id="your-client-id">
   </keycloak-handler>
   ```

2. **Required attributes:**
   - `url`: The Keycloak server URL (e.g. `https://keycloak.yourDomain.de`)
   - `realm`: The Keycloak realm name (e.g. `your-realm`)
   - `client-id`: The Keycloak client ID (e.g. `your-client-id`)

3. **Keycloak JS dependency:**
   - You must provide the Keycloak JS adapter as an ES6 module at `/vendor/keycloak@26.2.0/lib/keycloak.js` (with `export default ...`).
   - Download from the official Keycloak release or build it as ESM if needed.

4. **Configuration:**
   - Make sure your Keycloak client is configured for CORS and has the correct redirect URIs.
   - The component will store the token as a cookie after successful login.

## Example

See `index.html` for a minimal working example.

## License

See LICENSE.txt or your organization's policy.
