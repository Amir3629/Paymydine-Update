(function () {
    'use strict';

    if (window.PMDAdminMessages) {
        return;
    }

    var messages = window.PMD_ADMIN_MESSAGES || {};
    var locale = String(window.PMD_ADMIN_MESSAGES_LOCALE || window.PMD_ADMIN_LOCALE || 'en').toLowerCase();

    function interpolate(value, replacements) {
        var output = String(value == null ? '' : value);
        var map = replacements && typeof replacements === 'object' ? replacements : {};

        Object.keys(map).forEach(function (name) {
            var replacement = String(map[name] == null ? '' : map[name]);
            output = output
                .split(':' + name).join(replacement)
                .split('{' + name + '}').join(replacement);
        });

        return output;
    }

    function t(key, replacements, fallback) {
        var value = Object.prototype.hasOwnProperty.call(messages, key)
            ? messages[key]
            : (fallback == null ? key : fallback);

        return interpolate(value, replacements);
    }

    window.PMDAdminMessages = Object.freeze({
        version: '1.0.0',
        locale: function () { return locale; },
        has: function (key) {
            return Object.prototype.hasOwnProperty.call(messages, key);
        },
        t: t,
        inspect: function () {
            return {
                version: '1.0.0',
                locale: locale,
                keys: Object.keys(messages).length
            };
        }
    });
})();
