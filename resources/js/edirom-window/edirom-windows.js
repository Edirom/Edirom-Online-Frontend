class EdiromWindows extends HTMLElement {
    constructor() {
        super();

        // Define the default properties
        this.windows = [];
        this.windowsDefaults = {
            border: "0.3em",
            background: "#ccc",
            index: 100000
        }
        this.winboxLoaded = false;
        this.pendingWindows = [];

        // Create shadow DOM
        this.attachShadow({ mode: 'open' });

        this._ensureWinboxAssets();
    }

    // Register the attributes to be observed
    static get observedAttributes() {
        return ['set', 'add', 'remove', 'update', 'arrange'];
    }

    // Attribute change
    attributeChangedCallback(property, oldValue, newValue) {
        // Custom event for the attribute change
        const event = new CustomEvent('communicate-windows-' + property, {
            detail: { [property]: newValue },
            bubbles: true
        });
        this.dispatchEvent(event);

        // Check the property
        switch (property) {
            case "set":
                // Remove all managed winbox windows from DOM
                this.windows.forEach(function(w) {
                    var el = document.getElementById(w.id);
                    if (el) el.remove();
                });
                this.windows = [];

                // Add the new windows
                if (newValue != "") {
                    this.add(JSON.parse(newValue));
                }
                break;
            case "add":
                if (newValue != "") {
                    this.add(JSON.parse(newValue));
                }
                break;
            case "remove":
                if (newValue != "") {
                    this.remove(newValue);
                }
                break;
            case "update":
                if (newValue != "") {
                    this.update(JSON.parse(newValue));
                }
                break;
            case "arrange":
                if (newValue != "") {
                    this.arrange(newValue);
                }
                break;
            default:
                break;
        }
    }

    // Add a window
    add(windows) {
        // Loop through the windows array
        for (var i = 0; i < windows.length; i++) {
            // Add the default properties
            for (var key in this.windowsDefaults) {
                if (!windows[i].hasOwnProperty(key)) {
                    windows[i][key] = this.windowsDefaults[key];
                }
            }

            // Add the window to the global windows property
            this.windows.push(windows[i]);

            // If WinBox isn't available yet, queue it for creation later
            if (!this.winboxLoaded || typeof WinBox === 'undefined') {
                this.pendingWindows.push(windows[i]);
                continue;
            }

            // Append window to document.body so it is not clipped by the component
            windows[i].root = document.body;
            new WinBox(windows[i]);
        }
    }

    _createPendingWindows() {
        if (!this.winboxLoaded || typeof WinBox === 'undefined') {
            return;
        }

        while (this.pendingWindows.length > 0) {
            const winConfig = this.pendingWindows.shift();
            winConfig.root = document.body;
            new WinBox(winConfig);
        }
    }

    _ensureWinboxAssets() {
        const scriptSrc = "https://rawcdn.githack.com/daniel-jettka/winbox/0.2.82/dist/js/winbox.min.js";
        const cssHref = "https://rawcdn.githack.com/daniel-jettka/winbox/0.2.82/dist/css/winbox.min.css";
        const ediromStyleId = "edirom-winbox-overrides";

        if (!document.querySelector(`script[src='${scriptSrc}']`)) {
            const winboxScript = document.createElement('script');
            winboxScript.src = scriptSrc;
            winboxScript.onload = () => {
                this.winboxLoaded = true;
                this._createPendingWindows();
            };
            winboxScript.onerror = () => {
                console.error('Failed to load WinBox script:', scriptSrc);
            };
            document.head.appendChild(winboxScript);
        } else {
            const existingScript = document.querySelector(`script[src='${scriptSrc}']`);
            if (typeof WinBox !== 'undefined') {
                this.winboxLoaded = true;
                this._createPendingWindows();
            } else if (existingScript) {
                existingScript.addEventListener('load', () => {
                    this.winboxLoaded = true;
                    this._createPendingWindows();
                });
            }
        }

        if (!document.querySelector(`link[href='${cssHref}']`)) {
            const winboxCss = document.createElement('link');
            winboxCss.rel = 'stylesheet';
            winboxCss.href = cssHref;
            document.head.appendChild(winboxCss);
        }

        // Inject Edirom-matching overrides for WinBox appearance
        if (!document.getElementById(ediromStyleId)) {
            const style = document.createElement('style');
            style.id = ediromStyleId;
            style.textContent = `
                .winbox { box-shadow: 0 3px 10px #000; font-family: "PT Sans", Arial, sans-serif; }
                .winbox .wb-title { color: #333; font-size: 13px; font-weight: bold; text-shadow: none; }
                .winbox .wb-body { background: #fff; overflow: auto; }
                .winbox .textViewContent { color: #333; }
                .winbox .textViewContent h1 { font-weight: bold; font-size: 1.3em; }
                .winbox .textViewContent h2 { font-weight: bold; font-size: 1.1em; margin-top: 1em; }
                .winbox .textViewContent p { margin: 0.5em 0; line-height: 1.5; }
                .winbox .textViewContent a { color: #336699; }
            `;
            document.head.appendChild(style);
        }
    }

    // Remove a window
    remove(id) {
        // Remove the window from the global windows property
        this.windows = this.windows.filter(function (obj) {
            return obj.id !== id;
        });

        // Remove the window from the DOM (appended to body)
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    // Update windows
    update(windows) {

        // Case 1: update all the windows with the same values eg. arranging the windows,
        // windows =  [{"height": "95%"}]


        // Case 2: Update each window with different values

        // Loop through the json string sent to update function
        for (var i = 0; i < windows.length; i++) {
            // Check if there is an id
            if (!windows[i].hasOwnProperty("id")) {
                console.error("Property 'id' missing in update statement: "+JSON.stringify(windows[i]));
                return;
            }
            // Loop through all the existing edirom windows
            for (var j = 0; j < this.windows.length; j++) {
                
                // Check if the id of the input json string is the same as this.windows
                if (windows[i]["id"] == this.windows[j]["id"]) {
                    for (var key in windows[i]) {
                        this.windows[j][key] = windows[i][key];
                    }

                    // TODO: update the window with the new values
                    
                    // remove the window from the DOM
                    //this.remove(windows[i]["id"]);

                    // add the window to the DOM
                    //this.add([this.windows[j]]);
                }
            }
        }
            
    }

    arrange(type){
            // Get all managed winbox windows from the body
            var topLevelDivs = this.windows.map(function(w) { return document.getElementById(w.id); }).filter(Boolean);
            var screenWidth = screen.width;
            var screenHeight = screen.height;


            var contentWidth = screenWidth * 0.8
            var contentHeight = screenHeight * 0.85
            var gridWidth = contentWidth / topLevelDivs.length
            var gridHeight = contentHeight / topLevelDivs.length

            topLevelDivs.forEach((div, index) => {
                if(type == "vertical") {
                    div.style.width = gridWidth+"px" ;
                    div.style.left = index * gridWidth + "px"
                    div.style.top = 0
                    div.style.height = "95%"
                } if(type == "horizontal") {
                    div.style.height = gridHeight+"px"
                    div.style.top = index * gridHeight + "px"
                    div.style.left = 0
                    div.style.width = "80%" ;
                }

            });   
    }


    // Listen for communicate-update-update event and handle updates
    connectedCallback() {

    }
}

// Define the custom element
customElements.define('edirom-windows', EdiromWindows);

