window.vrvToolkit = new verovio.toolkit();
showMovement(movementId);

/* add event as constant */
const vrvToolkitDataInitialized = new Event("vrvToolkitDataInitialized");

/* add event listener to window */
window.addEventListener('vrvToolkitDataInitialized', (e) => {on_vrvToolkitDataInitialized()}, false);

function showMovement(movementId) {        
    
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

    var options = {
        'scale': 33,
	    'pageHeight': initHeight,
	    'pageWidth': initWidth,
	    'adjustPageHeight': 1,
	    'header': 'none',
	    'svgBoundingBoxes': true,
	    'svgHtml5': true
    };

    /* Load the file using HTTP GET */
    var url = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition    + "&movementId=" + movementId;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok: ' + response.status);
            return response.text();
        })
        .then(data => {
            var svg = vrvToolkit.renderData(data, options);
            document.getElementById('output').innerHTML = svg;
            initData();
        })
        .catch(error => {
            console.error('Error loading movement data:', error);
            document.getElementById('output').textContent = 'Error loading movement.';
        });
}

function initData() {
    page = 1;
    pageCount = vrvToolkit.getPageCount();
    
    updatePageData();
    //dispatch vrvToolkitDataInitialized event
    window.dispatchEvent(vrvToolkitDataInitialized);
}

function updatePageData() {
    document.getElementById('page').innerHTML = page;
    document.getElementById('pageCount').innerHTML = pageCount;
    
    document.querySelectorAll('.annot.editorialComment:not(.bounding-box), .annot.annotRef:not(.bounding-box)').forEach((annot) => {
        const measure = annot.closest('.measure');
        const staff1 = measure.querySelector('.staff path').getBBox();
        const annotId = annot.getAttributeNS(null, 'data-id');
        
        const annotCount = measure.querySelectorAll('.annotIcon').length;

        const xmlns = "http://www.w3.org/2000/svg";
        const annotIcon = document.createElementNS(xmlns, "rect");
        annotIcon.setAttributeNS(null, "data-id", annotId);
        annotIcon.setAttributeNS(null, "class", 'annotIcon ' + annot.getAttributeNS(null, 'class'));
        annotIcon.setAttributeNS(null, "x", staff1.x + 100 + (annotCount * 450));
        annotIcon.setAttributeNS(null, "y", staff1.y - 700);
        annotIcon.setAttributeNS(null, "width", 350);
        annotIcon.setAttributeNS(null, "height", 250);

        measure.append(annotIcon);

        // create tooltip
        const tip = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        tip.setAttributeNS(null, "class", "tip");
        tip.setAttributeNS(null, "data-refs", annotId);
        tip.style.position = 'absolute';
        tip.style.display = 'none';
        tip.style.height = 'auto';
        tip.style.maxWidth = '300px';
        tip.style.background = 'rgb(218, 218, 218)';
        tip.style.border = '1px solid black';
        tip.style.borderRadius = '5px';
        tip.style.padding = '5px';
        tip.style.zIndex = '10';
        tip.innerHTML = "Error getting annotation.";

        // do AJAX call to get annotation content with fetch
        fetch(appBasePath + 'data/xql/getAnnotation.xql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                uri: uri + '#' + annotId,
                target: 'tip',
                edition: edition
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

        document.body.appendChild(tip);
        
        annotIcon.addEventListener('click', (e) => {
            parent.loadLink(uri + '#' + annotId);
        });

        annotIcon.addEventListener('mouseover', (e) => {
            annotIcon.style.cursor = 'pointer';

            // position and show tooltip
            const bbox = annotIcon.getBoundingClientRect();
            const tip = document.querySelector('.tip[data-refs="' + annotIcon.getAttributeNS(null, "data-id") + '"]');
            tip.style.left = (bbox.x + window.scrollX - 20) + 'px';
            tip.style.top = (bbox.y + window.scrollY + 20) + 'px';
            tip.style.display = 'block';
        });

        annotIcon.addEventListener('mouseout', (e) => {
            annotIcon.style.cursor = 'default';
            // hide all tooltips
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
    page--;
    var svg = vrvToolkit.renderToSVG(page);
    document.getElementById('output').innerHTML = svg;
    updatePageData();
}

function nextPage() {
    if(page == pageCount) return;
    page++;
    var svg = vrvToolkit.renderToSVG(page);
    document.getElementById('output').innerHTML = svg;
    updatePageData();
}

/**
 * Switch to page as defined by global page variable.
 */
function showPage() {
    if(page == 0) return;
    var svg = vrvToolkit.renderToSVG(page);
    document.getElementById('output').innerHTML = svg;
    updatePageData();
}

function showLoader() {
    var output = document.getElementById('output');
    while (output.firstChild) {
        output.removeChild(output.firstChild);
    }
    document.querySelectorAll('.lds-roller').forEach(function(node){
        var clone = node.cloneNode(true);
        document.getElementById('output').appendChild(clone);
    });
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
    
    if(vrvToolkit.getPageWithElement(measureId) == 0) {
        showMovement(movementId);
    } else if(window.movementId == movementId) {
        if (page == vrvToolkit.getPageWithElement(measureId)) return;
        page = vrvToolkit.getPageWithElement(measureId);
        showPage();
    }
}

/**
 * Callback function on dispatch of vrvToolkitDataInitialized event
 */
function on_vrvToolkitDataInitialized(){
    console.log("event fired and catched");
    if (window.measureId == undefined ) return; 
    showMeasure(window.movementId, window.measureId); //? set window.measureId to undefined ?
}
