/**
 *  Edirom Online
 *  Copyright (C) 2026 The Edirom Project
 *  http://www.edirom.de
 *
 *  Edirom Online is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Edirom Online is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Edirom Online.  If not, see <http://www.gnu.org/licenses/>.
 *
 *  ID: $Id$
 */
(function (window) {
    "use strict";

    var doNotOverride = [
        "data/xql/getEditionURI.xql",
        "data/xql/getPreferences.xql",
        "data/xql/getWorkID.xql"
    ];

    /**
     * Converts parameters to a URL-encoded query string.
     * Arrays are encoded as repeated keys.
     */
    function encodeParams(params) {
        return Object.keys(params).reduce(function (parts, key) {
            var values = Array.isArray(params[key])
                ? params[key]
                : [params[key]];

            values.forEach(function (value) {
                if (value instanceof Date) {
                    value = value.toISOString();
                }

                if (value == null) {
                    value = "";
                }

                parts.push(
                    encodeURIComponent(key) + "=" +
                    encodeURIComponent(String(value))
                );
            });

            return parts;
        }, []).join("&");
    }

    function appendQuery(url, query) {
        if (!query) {
            return url;
        }

        // Insert query parameters before any fragment.
        var hashIndex = url.indexOf("#");
        var fragment = hashIndex === -1 ? "" : url.slice(hashIndex);
        var base = hashIndex === -1 ? url : url.slice(0, hashIndex);

        return base +
            (base.indexOf("?") === -1 ? "?" : "&") +
            query +
            fragment;
    }

    /**
     * Create the response interface.
     */
    function createResponse(xhr, status) {
        return {
            status: status,
            statusText: xhr.statusText,
            responseText: xhr.responseText,
            responseXML: xhr.responseXML,

            getResponseHeader: function (name) {
                return xhr.getResponseHeader(name);
            },

            getAllResponseHeaders: function () {
                return xhr.getAllResponseHeaders();
            }
        };
    }

    function init() {
        window.doAJAXRequest = this.doAJAXRequest.bind(this);
    }

    /**
     * Performs an AJAX request.
     *
     * @param {String}   url
     * @param {String}   method
     * @param {Object}   params
     * @param {Function} successFn
     * @param {Number}   retryNo   Default: 2.
     * @param {Boolean}  async     Default: true.
     */
    function doAJAXRequest(url, method, params, successFn, retryNo, async) {
        var me = this;

        params = params || {};

        if (typeof params.edition === "undefined") {
            params.edition = this.application.activeEdition;
        }

        var lang = window.getLanguage();

        if (typeof params.lang === "undefined") {
            params.lang = lang;
        }

        var override = null;

        if (doNotOverride.indexOf(url) === -1) {
            override = window.getPreference(url, true);
        }

        if (override != null) {
            url = override;
        }

        if (typeof retryNo === "undefined") {
            retryNo = 2;
        }

        if (typeof async === "undefined") {
            async = true;
        }

        if (!/^https?:\/\//.test(url)) {
            url = this.application.backendURL + url;
        }

        var encodedParams = encodeParams(params);
        var requestMethod = (
            method || (encodedParams ? "POST" : "GET")
        ).toUpperCase();

        var requestURL = url;
        var body = null;

        if (requestMethod === "GET" || requestMethod === "HEAD") {
            requestURL = appendQuery(requestURL, encodedParams);
        } else {
            body = encodedParams;
        }

        // preventing GET caching.
        if (requestMethod === "GET") {
            requestURL = appendQuery(requestURL, "_dc=" + Date.now());
        }

        var xhr = new XMLHttpRequest();
        var completed = false;

        function handleResponse() {
            if (completed || xhr.readyState !== 4) {
                return;
            }

            completed = true;

            // Normalize an old IE status-code quirk
            var status = xhr.status === 1223 ? 204 : xhr.status;

            if (!((status >= 200 && status < 300) || status === 304)) {
                // The original controller had no failure callback.
                return;
            }

            var response = createResponse(xhr, status);

            try {
                successFn(response);
            } catch (error) {
                console.log(error);

                if (retryNo > 0) {
                    window.setTimeout(function () {
                        me.doAJAXRequest(
                            url,
                            method,
                            params,
                            successFn,
                            retryNo - 1,
                            async
                        );
                    }, 500);
                }
            }
        }

        xhr.open(requestMethod, requestURL, async);

        // Match the usual Ext Ajax default headers.
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        if (body !== null) {
            xhr.setRequestHeader(
                "Content-Type",
                "application/x-www-form-urlencoded; charset=UTF-8"
            );
        }

        // Default timeout. Synchronous XHR on the
        // main thread does not allow a nonzero timeout.
        if (async) {
            xhr.timeout = 30000;
        }

        xhr.onreadystatechange = handleResponse;
        xhr.send(body);

        // Ensure synchronous requests also invoke their callback.
        if (!async) {
            handleResponse();
        }
    }

    
    window.initializeAJAX = function (application) {
        var context = {
            application: application,
            doAJAXRequest: doAJAXRequest
        };

        window.doAJAXRequest = doAJAXRequest.bind(context);
    };

})(window);