(function () {
    'use strict';

    if (window.PMDPlatformMessages) {
        return;
    }

    var messages = window.PMD_PLATFORM_MESSAGES || {};
    var locale = String(window.PMD_PLATFORM_MESSAGES_LOCALE || 'en').toLowerCase();

    function interpolate(value, replacements) {
        var output = String(value == null ? '' : value);
        var map = replacements && typeof replacements === 'object'
            ? replacements
            : {};

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

    window.PMDPlatformMessages = Object.freeze({
        locale: function () {
            return locale;
        },
        has: function (key) {
            return Object.prototype.hasOwnProperty.call(messages, key);
        },
        t: t,
        inspect: function () {
            return {
                locale: locale,
                keys: Object.keys(messages).length
            };
        }
    });
})();
