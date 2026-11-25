Ext.define('EdiromOnline.controller.ConfigController', {
    extend: 'Ext.app.Controller',

    config: null,

    init: function () {
    },

    /**
     * Load config from config.json
     * @param {Function} callback Callback function after successful loading
     * @param {Object} scope Scope for the callback
     */
    loadConfig: function (callback, scope) {
        var me = this;

        Ext.Ajax.request({
            url: 'config.json',
            method: 'GET',
            success: function (response) {
                try {
                    me.config = JSON.parse(response.responseText);
                    console.info('config.json loaded.');

                    if (callback) {
                        Ext.callback(callback, scope || me, [me.config]);
                    }
                } catch (e) {
                    console.warn('Invalid config.json; using the build-time backend URL.');
                    me.loadDefaultConfig(callback, scope);
                }
            },
            failure: function () {
                console.info('No config.json found; using the build-time backend URL.');
                me.loadDefaultConfig(callback, scope);
            }
        });
    },

    /**
     * Loads the backend URL injected by the Ant build.
     * @param {Function} callback Callback function
     * @param {Object} scope Scope for the callback
     */
    loadDefaultConfig: function (callback, scope) {
        var me = this;

        me.config = {
            backendURL: '@backend.url@'
        };

        if (callback) {
            Ext.callback(callback, scope || me, [me.config]);
        }
    },

    /**
     * Returns a configuration value
     * @param {String} key The configuration key
     * @param {*} defaultValue Default value if key doesn't exist
     * @return {*} The configuration value
     */
    getConfig: function (key, defaultValue) {
        if (!this.config) {
            console.warn('Configuration not loaded yet');
            return defaultValue;
        }

        return this.config[key] !== undefined ? this.config[key] : defaultValue;
    },

    /**
     * Returns the complete configuration
     * @return {Object} The configuration object
     */
    getFullConfig: function () {
        return this.config || {};
    },

    /**
     * Sets a configuration value
     * @param {String|Object} key The configuration key or an object with key-value pairs
     * @param {*} value The value to set (ignored if key is an object)
     * @return {Boolean} True if the operation was successful
     */
    setConfig: function (key, value) {
        var me = this;

        // Initialize config if not already loaded
        if (!me.config) {
            me.config = {};
        }

        try {
            if (Ext.isObject(key)) {
                // If key is an object, merge it with existing config
                me.config = Ext.apply(me.config, key);
                console.log('Configuration updated with object:', key);
            } else if (Ext.isString(key)) {
                // Set single key-value pair
                me.config[key] = value;
                console.log('Configuration updated:', key, '=', value);
            } else {
                console.warn('Invalid key type for setConfig. Expected string or object.');
                return false;
            }

            return true;
        } catch (e) {
            console.error('Error setting configuration:', e);
            return false;
        }
    },

    /**
     * Checks if a configuration key exists
     * @param {String} key The configuration key to check
     * @return {Boolean} True if the key exists
     */
    hasConfig: function (key) {
        return this.config && this.config.hasOwnProperty(key);
    }
});