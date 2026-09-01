(function () {
    var params = new URLSearchParams(window.location.search);
    var ui = params.get('ui');
    var forced = (ui === 'mobile' || ui === 'desktop') ? ui : null;

    var target = forced;
    if (!target) {
        var remembered = localStorage.getItem('edirom-ui-mode');
        if (remembered === 'mobile' || remembered === 'desktop') {
            target = remembered;
        } else {
            // Fix for iPadOS 13+, which lies about being a Mac (same check
            // used in edirom-web-socket-connector.js's getDeviceType()).
            var isIPad = /Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
            var deviceType = isIPad ? 'tablet' : (window.bowser ? bowser.getParser(navigator.userAgent).getPlatformType() : 'desktop');
            target = ['mobile', 'tablet'].includes(deviceType) ? 'mobile' : 'desktop';
        }
    }

    if (target === 'mobile') {
        window.location.replace('mobile/index.html' + window.location.search);
    }
})();
