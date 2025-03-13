// Function to update and render movement in edirom-verovio-renderer
function showMovement(movementId) {
    showLoader();
    window.movementId = movementId;

    // Construct the MEI URL
    var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition + "&movementId=" + movementId;

    // Update the edirom-verovio-renderer component
    let verovioRenderer = document.getElementById("verovioRenderer");
    verovioRenderer.setAttribute("meiurl", meiUrl);
    verovioRenderer.setAttribute("pagenumber", "1"); // Default to first page
    verovioRenderer.setAttribute("zoom", "33");

    // Dispatch event after MEI file is loaded
    verovioRenderer.addEventListener("communicate-pagenumber-update", () => {
        window.dispatchEvent(vrvToolkitDataInitialized);
    });
}

// Function to show a specific measure in the renderer
function showMeasure(movementId, measureId) {
    if (!measureId) return;
    window.measureId = measureId;

    let verovioRenderer = document.getElementById("verovioRenderer");
    
    // If movement is different, reload the movement
    if (window.movementId !== movementId) {
        showMovement(movementId);
    } else {
        let page = verovioRenderer.tk.getPageWithElement(measureId);
        if (page > 0 && page !== verovioRenderer.pageNumber) {
            verovioRenderer.setAttribute("pagenumber", page);
        }
    }
}

// Navigation functions
function prevPage() {
    let verovioRenderer = document.getElementById("verovioRenderer");
    let currentPage = parseInt(verovioRenderer.getAttribute("pagenumber"));
    if (currentPage > 1) {
        verovioRenderer.setAttribute("pagenumber", currentPage - 1);
    }
}

function nextPage() {
    let verovioRenderer = document.getElementById("verovioRenderer");
    let currentPage = parseInt(verovioRenderer.getAttribute("pagenumber"));
    let totalPages = verovioRenderer.totalPages;
    if (currentPage < totalPages) {
        verovioRenderer.setAttribute("pagenumber", currentPage + 1);
    }
}

function showPage() {
    let verovioRenderer = document.getElementById("verovioRenderer");
    let page = parseInt(verovioRenderer.getAttribute("pagenumber"));
    if (page > 0) {
        verovioRenderer.setAttribute("pagenumber", page);
    }
}

function showLoader() {
    $("#output").empty();
    $(".lds-roller").clone().appendTo("#output");
}

// Event listener for when Verovio renderer is initialized
window.addEventListener('vrvToolkitDataInitialized', () => {
    console.log("Event fired and caught");
    if (window.measureId !== undefined) {
        showMeasure(window.movementId, window.measureId);
    }
});
