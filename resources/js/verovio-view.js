// Component-based approach - store reference to component
window.verovioRenderer = null;

// Helper functions for showing/hiding loader
function showLoader() {
    var output = document.getElementById('output');
    var spinner = output.querySelector('.lds-roller');
    if (spinner) {
        // Remove any inline display style to let CSS rule take over
        spinner.style.removeProperty('display');
    }
    var renderer = document.getElementById('verovio-renderer');
    if (renderer) {
        renderer.style.display = 'none';
    }
}

function hideLoader() {
    var output = document.getElementById('output');
    var spinner = output.querySelector('.lds-roller');
    if (spinner) {
        spinner.style.display = 'none';
    }
    var renderer = document.getElementById('verovio-renderer');
    if (renderer) {
        // Remove the !important flag first, then set to block
        renderer.style.removeProperty('display');
        renderer.style.display = 'block';
    }
}

// Initialize component on page load
function initializeComponent() {
    
    var initHeight = Math.floor($(document).height() * 100.0 / 33.0) - 35;
    var initWidth = Math.floor($(document).width() * 100.0 / 33.0);
    
    // Build initial MEI URL (without movementId)
    var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition;
    
    // Create the component element
    var renderer = document.createElement('edirom-verovio-renderer');
    renderer.setAttribute('id', 'verovio-renderer');
    renderer.setAttribute('meiurl', meiUrl);
    renderer.setAttribute('pagenumber', '1');
    renderer.setAttribute('zoom', '33');
    renderer.setAttribute('pagewidth', initWidth);
    renderer.setAttribute('pageheight', initHeight);
    renderer.setAttribute('verovio-url', 'https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js');
    renderer.setAttribute('enable-measure-shadow', 'true'); // Enable measure shadow on annotation hover
    renderer.style.display = 'none'; // Hidden until ready
    
    
    // Add it to the output div
    var output = document.getElementById('output');
    if (output) {
        output.appendChild(renderer);
    } else {
        return;
    }
    
    // Store reference
    window.verovioRenderer = renderer;
    
    // Track if this is the initial load
    var isInitialLoad = true;
    
    // Listen for page info updates from the component
    renderer.addEventListener('page-info-update', function(e) {
        page = e.detail.pageNumber || e.detail.currentPage;
        pageCount = e.detail.totalPages;
        $("#page").html(page);
        $("#pageCount").html(pageCount);
        
        if (isInitialLoad) {
            // First load: wait 3 seconds before showing everything
            isInitialLoad = false;
            setTimeout(function() {
                hideLoader();
                updatePageData();
            }, 1000);
        } else {
            // Page navigation: update annotations immediately (renderer already visible)
            updatePageData();
        }
    });
    
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComponent);
} else {
    // DOM is already loaded
    initializeComponent();
}

/* add event as constant */
const vrvToolkitDataInitialized = new Event("vrvToolkitDataInitialized");

/* add event listener to window */
window.addEventListener('vrvToolkitDataInitialized', (e) => {on_vrvToolkitDataInitialized()}, false);

function showMovement(movementId) {
    // Show loading spinner first
    showLoader();
    
    window.movementId = movementId;

    var body = document.body;
    var html = document.documentElement;

    var height = Math.max( body.scrollHeight, body.offsetHeight, 
                    html.clientHeight, html.scrollHeight, html.offsetHeight );
    var width = Math.max( body.scrollWidth, body.offsetWidth, 
                    html.clientWidth, html.scrollWidth, html.offsetWidth );
    
    var initHeight = Math.floor(height * 100.0 / 33.0) - 35;
    var initWidth = Math.floor(width * 100.0 / 33.0);

    // Build MEI URL with movementId
    var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition + "&movementId=" + movementId;
    
    // Get or create the component
    var renderer = document.getElementById('verovio-renderer');
    var isNewComponent = false;
    
    if (!renderer) {
        isNewComponent = true;
        
        // Create the component element
        renderer = document.createElement('edirom-verovio-renderer');
        renderer.setAttribute('id', 'verovio-renderer');
        renderer.setAttribute('pagenumber', '1');
        renderer.setAttribute('zoom', '33');
        renderer.setAttribute('verovio-url', 'https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js');
        renderer.setAttribute('enable-measure-shadow', 'true'); // Enable measure shadow on annotation hover
        
        // Add it to the output div
        var output = document.getElementById('output');
        if (output) {
            output.appendChild(renderer);
        } else {
            return;
        }
    }
        
    if (renderer) {
        
        // Hide renderer until updated
        renderer.style.setProperty('display', 'none', 'important');
        
        // Reset to page 1 for new movement
        renderer.setAttribute('pagenumber', '1');
        
        // Update component attributes to load new movement
        renderer.setAttribute('meiurl', meiUrl);
        renderer.setAttribute('pagewidth', initWidth);
        renderer.setAttribute('pageheight', initHeight);
        
        // Store reference
        // TODO: replace " window.verovioRenderer = renderer;" global reference once iframe based windows are removed; the consumers should get the renderer via dependency injection or events instead.
        window.verovioRenderer = renderer;
        
        // Track if this is the initial movement load
        var isInitialMovementLoad = true;
        
        // Add one-time listener for page info updates
        var oneTimeListener = function(e) {
            page = e.detail.pageNumber || e.detail.currentPage;
            pageCount = e.detail.totalPages;
            $("#page").html(page);
            $("#pageCount").html(pageCount);
            
            if (isInitialMovementLoad) {
                // First page of new movement: wait 3 seconds
                isInitialMovementLoad = false;
                setTimeout(function() {
                    hideLoader();
                    updatePageData();
                }, 3000);
            } else {
                // Subsequent page navigation: immediate
                updatePageData();
            }
            
            // Remove this listener after firing once
            renderer.removeEventListener('page-info-update', oneTimeListener);
        };
        renderer.addEventListener('page-info-update', oneTimeListener);
        
        // Dispatch initialization event
        setTimeout(function() {
            window.dispatchEvent(vrvToolkitDataInitialized);
        }, 500);
    } else {
    }
}

function initData() {
    // Page info will be updated via the 'page-info-update' event from the component
    // This function is kept for compatibility but may not be needed
    page = 1;
    pageCount = 1;
    
    updatePageData();
    //dispatch vrvToolkitDataInitialized event
    window.dispatchEvent(vrvToolkitDataInitialized);
}

function updatePageData() {
    // Page numbers already updated before this is called
    
    // Access the shadow DOM through the component
    if (!window.verovioRenderer || !window.verovioRenderer.shadowRoot) {
        console.warn('Verovio renderer or shadowRoot not available for annotation rendering');
        return;
    }
    
    const shadowRoot = window.verovioRenderer.shadowRoot;
    
    // Remove existing annotation icons to prevent duplicates
    shadowRoot.querySelectorAll('.annotIcon').forEach(icon => icon.remove());
    
    // Remove existing tooltips from Light DOM
    document.querySelectorAll('.tip').forEach(tip => tip.remove());
    
    // Inject entire verovio-view.css into shadow DOM (only once)
    if (!shadowRoot.querySelector('#verovio-styles')) {
        // Fetch the entire CSS file
        fetch('resources/css/verovio-view.css')
            .then(response => response.text())
            .then(cssText => {
                const style = document.createElement('style');
                style.id = 'verovio-styles';
                style.textContent = cssText;
                shadowRoot.appendChild(style);
            })
            .catch(error => {
                console.error('Failed to load verovio styles:', error);
            });
    }
    
    shadowRoot.querySelectorAll('.annot.editorialComment:not(.bounding-box), .annot.annotRef:not(.bounding-box)').forEach((annot) => {
        const measure = annot.closest('.measure');
        const staff1 = measure.querySelector('.staff path').getBBox();
        
        // Get the annotation ID from the SVG element
        // Verovio renders MEI xml:id as SVG id attribute
        const annotId = annot.id || annot.getAttribute('id');
        
        // Skip if no annotation ID found
        if (!annotId) {
            console.warn('No annotation ID found, skipping annotation');
            return;
        }
        
        const annotCount = measure.querySelectorAll('.annotIcon').length;

        const xmlns = "http://www.w3.org/2000/svg";
        const annotIcon = document.createElementNS(xmlns, "rect");
        annotIcon.setAttributeNS(null, "data-id", annotId);
        annotIcon.setAttributeNS(null, "class", 'annotIcon ' + annot.getAttribute('class'));
        annotIcon.setAttributeNS(null, "x", staff1.x + 100 + (annotCount * 450));
        annotIcon.setAttributeNS(null, "y", staff1.y - 700);
        annotIcon.setAttributeNS(null, "width", 350);
        annotIcon.setAttributeNS(null, "height", 250);

        measure.append(annotIcon);
        
        // Create tooltip element in Light DOM (outside Shadow DOM so it's visible)
        const tip = document.createElement('div');
        tip.className = 'tip';
        tip.setAttribute('data-refs', annotId);
        tip.style.position = 'absolute';
        tip.style.display = 'none';
        tip.style.height = 'auto';
        tip.style.maxWidth = '300px';
        tip.style.background = 'rgb(218, 218, 218)';
        tip.style.border = '1px solid black';
        tip.style.borderRadius = '5px';
        tip.style.padding = '5px';
        tip.style.zIndex = '10';
        tip.innerHTML = "Loading annotation...";

        // Fetch annotation content
        fetch(appBasePath + 'data/xql/getAnnotation.xql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                uri: uri + '#' + annotId,
                target: 'tip',
                edition: edition,
                lang: 'en'
            })
        })
        .then(response => response.text())
        .then(data => {
            tip.innerHTML = data;
        })
        .catch(error => {
            tip.innerHTML = "Error fetching annotation.";
            console.error('Error fetching annotation:', error);
        });

        // Add tooltip to Light DOM (body)
        document.body.appendChild(tip);
        
        // Click handler to load annotation link
        annotIcon.addEventListener('click', (e) => {
            parent.loadLink(uri + '#' + annotId);
        });

        // Mouseover handler to show tooltip
        annotIcon.addEventListener('mouseover', (e) => {
            annotIcon.style.cursor = 'pointer';

            // Position and show tooltip
            const bbox = annotIcon.getBoundingClientRect();
            const tip = document.querySelector('.tip[data-refs="' + annotIcon.getAttributeNS(null, "data-id") + '"]');
            if (tip) {
                tip.style.left = (bbox.x + window.scrollX - 20) + 'px';
                tip.style.top = (bbox.y + window.scrollY + 20) + 'px';
                tip.style.display = 'block';
            }
        });

        // Mouseout handler to hide tooltip
        annotIcon.addEventListener('mouseout', (e) => {
            annotIcon.style.cursor = 'default';
            // Hide all tooltips
            document.querySelectorAll('.tip').forEach((tip) => {
                tip.style.display = 'none';
            });
        });
    });
}

function getMeasureIds() {
    var measureIds = "";
    document.querySelectorAll('#output svg .measure').forEach(function(measure) {
        measureIds += measure.id + ",";
    });
    return measureIds;
}

function prevPage() {
    if(page == 1) return;
    if (window.verovioRenderer) {
        window.verovioRenderer.setAttribute('pagenumber', page - 1);
    }
}

function nextPage() {
    if(page == pageCount) return;
    if (window.verovioRenderer) {
        window.verovioRenderer.setAttribute('pagenumber', page + 1);
    }
}

/**
 * Switch to page as defined by global page variable.
 */
function showPage() {
    if(page == 0) return;
    if (window.verovioRenderer) {
        window.verovioRenderer.setAttribute('pagenumber', page);
    }
}

/**
 * Show a measure in verovio if the goto measure function is called from the GUI.
 * Calls showMovement() if call to measure doesn't match current movement.
 * @param {string} movementId - The XML-ID of the selected movement.
 * @param {string} measureId - The XML-ID of the selected measure.
 */
function showMeasure(movementId, measureId) {
    
    if (measureId == undefined) return;
    window.measureId = measureId;
    
    // If using the component, set the elementid attribute to navigate to the measure
    if (window.verovioRenderer) {
        if(window.movementId != movementId) {
            showMovement(movementId);
        } else {
            window.verovioRenderer.setAttribute('elementid', measureId);
        }
    }
}

/**
 * Callback function on dispatch of vrvToolkitDataInitialized event
 */
function on_vrvToolkitDataInitialized(){
    if (window.measureId == undefined ) return; 
    showMeasure(window.movementId, window.measureId); //? set window.measureId to undefined ?
}
