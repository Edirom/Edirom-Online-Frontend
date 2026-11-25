/**
 * KeycloakHandler Web Component
 *
 * This custom element handles authentication with Keycloak using the Keycloak JS adapter.
 *
 * Usage:
 *   <keycloak-handler id="kcHandler" url="..." realm="..." client-id="..."></keycloak-handler>
 *
 * - Loads Keycloak JS as an ES6 module from /vendor/keycloak@26.2.0/lib/keycloak.js (must be present and ESM-compatible!)
 * - Initializes Keycloak with the given or default config
 * - Handles SSO and stores the token as a cookie after successful login
 * - Triggers login if not authenticated
 *
 * Requirements:
 *   - The Keycloak JS file must be available as a real ES6 module (with export default ...)
 *   - The Keycloak server and client must be configured for CORS and correct redirect URIs
 *
 * Minimal example:
 *   <keycloak-handler id="kcHandler"></keycloak-handler>
 */
if (!customElements.get('keycloak-handler')) {
    class KeycloakLogin extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.keycloak = null;
        }

        connectedCallback() {
            this.createKeycloak();
        }

        async createKeycloak() {
            const url = this.getAttribute('url');
            const realm = this.getAttribute('realm');
            const clientId = this.getAttribute('client-id');

            if (!url || !realm || !clientId) {
                console.warn('[keycloak-handler] Missing required attribute(s):', {
                    url,
                    realm,
                    clientId
                });
            } else {
                const keycloakProps = { url, realm, clientId };

                if (!window.Keycloak) {
                    // Lokale ES6-Variante laden
                    const Keycloak = await import('./vendor/keycloak@26.2.0/lib/keycloak.js');
                    this.keycloak = new Keycloak.default(keycloakProps);
                } else {
                    this.keycloak = new Keycloak(keycloakProps);
                }
                this.initKeycloak();
            }
        }

        async initKeycloak() {
            this.keycloak.init({
                onLoad: 'check-sso',
                checkLoginIframe: false  // Disable iframe-based checks to avoid CSP issues
            }).then((authenticated) => {
                if (authenticated) {
                    document.cookie = `keycloak_token=${this.keycloak.token}; path=/; secure; SameSite=Lax`;
                } else {
                    this.login();
                }
            }).catch((error) => {
                console.error('[keycloak-handler] Keycloak initialization failed:', error);
            });
        }

        async login() {
            if (this.keycloak.authenticated) {
                console.info('[keycloak-handler] User is already authenticated, no login required.');
                return;
            }
            this.keycloak.login({
                redirectUri: window.location.href // Redirect after successful login
            }).catch((error) => {
                console.error('[keycloak-handler] Keycloak login failed:', error);
            });
        }
    }

    customElements.define('keycloak-handler', KeycloakLogin);
}