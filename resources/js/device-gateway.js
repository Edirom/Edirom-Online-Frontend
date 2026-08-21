(function () {
    var params = new URLSearchParams(window.location.search);
    var forced = params.has('mobile') ? 'mobile' : (params.has('desktop') ? 'desktop' : null);

    var target = forced;
    if (!target) {
        // Fix for iPadOS 13+, which lies about being a Mac (same check
        // used in edirom-web-socket-connector.js's getDeviceType()).
        var isIPad = /Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
        var deviceType = isIPad ? 'tablet' : (window.bowser ? bowser.getParser(navigator.userAgent).getPlatformType() : 'desktop');
        console.log('Device type: ' + deviceType);
        target = ['mobile', 'tablet'].includes(deviceType) ? 'mobile' : 'desktop';
    }

    if (target === 'mobile') {
        window.location.replace('mobile/index.html' + window.location.search);
    }
})();
