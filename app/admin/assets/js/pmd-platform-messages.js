(function () {
    'use strict';

    if (window.PMDPlatformMessages) {
        return;
    }

    var messages = window.PMD_PLATFORM_MESSAGES || {};
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    var englishMessages = window.PMD_PLATFORM_MESSAGES_ENGLISH || {};
    var sourceIndexes = Object.create(null);
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


    function sourceIndex(prefix) {
        prefix = String(prefix || '');
        if (sourceIndexes[prefix]) return sourceIndexes[prefix];
        var index = Object.create(null);
        Object.keys(englishMessages).forEach(function (key) {
            if (prefix && key.indexOf(prefix) !== 0) return;
            var source = englishMessages[key];
            if (typeof source !== 'string' || !source || Object.prototype.hasOwnProperty.call(index, source)) return;
            index[source] = key;
        });
        sourceIndexes[prefix] = index;
        return index;
    }

    function fromEnglish(value, prefix, fallback) {
        value = String(value == null ? '' : value);
        var key = sourceIndex(prefix || '')[value];
        if (!key) return fallback == null ? value : String(fallback);
        return t(key, {}, fallback == null ? value : fallback);
    }

    window.PMDPlatformMessages = Object.freeze({
        locale: function () {
            return locale;
        },
        has: function (key) {
            return Object.prototype.hasOwnProperty.call(messages, key);
        },
        t: t,
        fromEnglish: fromEnglish,
        inspect: function () {
            return {
                locale: locale,
                keys: Object.keys(messages).length
            };
        }
    });
})();
