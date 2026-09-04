(function () {
    'use strict';

    var root = document.querySelector('[data-pmd-ai-root]');
    if (!root) return;

    var form = root.querySelector('[data-pmd-ai-form]');
    var question = root.querySelector('#pmd-ai-question');
    var state = root.querySelector('[data-pmd-ai-state]');
    var messages = root.querySelector('[data-pmd-ai-messages]');
    var empty = root.querySelector('[data-pmd-ai-empty]');
    var saveState = root.querySelector('[data-pmd-ai-save-state]');
    var clearButton = root.querySelector('[data-pmd-ai-clear]');
    var tail = root.querySelector('[data-pmd-ai-tail]');
    var endpoint = root.getAttribute('data-endpoint') || form.getAttribute('action');
    var historyEndpoint = root.getAttribute('data-history-endpoint') || '';
    var clearEndpoint = root.getAttribute('data-clear-endpoint') || '';
    var submit = form.querySelector('button[type="submit"]');
    var busy = false;

    var evidenceLabels = {
        restaurant_identity: 'Restaurant profile',
        owner_kpis: 'Live restaurant KPIs',
        report_snapshot: 'Current PMD report',
        report_range: 'Date-range PMD report',
        order_integrity_range: 'Order data check',
        workforce_schedule_range: 'Shift schedule',
        kitchen_workforce: 'Kitchen workforce'
    };

    function hasMessages() {
        return !!messages.querySelector('.pmd-ai-message');
    }

    function syncEmptyState() {
        if (empty) empty.hidden = hasMessages();
        if (clearButton) clearButton.disabled = busy || !hasMessages();
    }

    function scrollToTail(behavior) {
        if (!tail || typeof tail.scrollIntoView !== 'function') return;
        tail.scrollIntoView({ block: 'end', behavior: behavior || 'smooth' });
    }

    function setSaveState(text, warning) {
        if (!saveState) return;
        saveState.textContent = text || '';
        saveState.classList.toggle('is-warning', !!warning);
    }

    function setBusy(nextBusy) {
        busy = !!nextBusy;
        submit.disabled = busy;
        submit.setAttribute('aria-busy', busy ? 'true' : 'false');
        question.disabled = busy;
        if (clearButton) clearButton.disabled = busy || !hasMessages();
        if (busy) state.textContent = 'Checking restaurant data…';
    }

    function appendInline(parent, text) {
        var source = String(text || '');
        var matcher = /\*\*([^*]+)\*\*|`([^`]+)`/g;
        var cursor = 0;
        var match;

        while ((match = matcher.exec(source)) !== null) {
            if (match.index > cursor) {
                parent.appendChild(document.createTextNode(source.slice(cursor, match.index)));
            }

            if (match[1] !== undefined) {
                var strong = document.createElement('strong');
                strong.textContent = match[1];
                parent.appendChild(strong);
            } else {
                var code = document.createElement('code');
                code.textContent = match[2];
                parent.appendChild(code);
            }
            cursor = matcher.lastIndex;
        }

        if (cursor < source.length) {
            parent.appendChild(document.createTextNode(source.slice(cursor)));
        }
    }

    function numberValue(raw) {
        var value = String(raw || '').replace(/[^0-9,.-]/g, '').replace(/,/g, '');
        var parsed = parseFloat(value);
        return isFinite(parsed) ? parsed : 0;
    }

    function parseBarLine(line) {
        var match = String(line || '').match(
            /^📊\s*(.+?)\s+[—-]\s+([^·|]+?)(?:\s*[·|]\s*(\d+)\s+orders?)?\s*$/i
        );
        if (!match) return null;
        return {
            label: match[1].trim(),
            display: match[2].trim(),
            orders: match[3] ? parseInt(match[3], 10) : null,
            value: numberValue(match[2])
        };
    }

    function renderBar(parent, data, maxValue) {
        var row = document.createElement('div');
        row.className = 'pmd-ai-bar-row';

        var label = document.createElement('span');
        label.className = 'pmd-ai-bar-label';
        label.textContent = data.label;

        var track = document.createElement('span');
        track.className = 'pmd-ai-bar-track';

        var fill = document.createElement('span');
        fill.className = 'pmd-ai-bar-fill';
        fill.style.width = (maxValue > 0
            ? Math.max(4, Math.round((data.value / maxValue) * 100))
            : 4) + '%';
        track.appendChild(fill);

        var value = document.createElement('span');
        value.className = 'pmd-ai-bar-value';
        value.textContent = data.display + (data.orders !== null
            ? ' · ' + data.orders + (data.orders === 1 ? ' order' : ' orders')
            : '');

        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(value);
        parent.appendChild(row);
    }

    function renderRichAnswer(parent, text) {
        var lines = String(text || '').replace(/\r/g, '').split('\n');
        var barValues = lines.map(parseBarLine).filter(Boolean).map(function (item) {
            return item.value;
        });
        var maxBar = barValues.length ? Math.max.apply(Math, barValues) : 0;
        var activeList = null;
        var activeListType = '';
        var chart = null;

        function closeList() {
            activeList = null;
            activeListType = '';
        }

        lines.forEach(function (rawLine) {
            var line = rawLine.trim();
            if (!line) {
                closeList();
                chart = null;
                return;
            }

            if (/^-{3,}$/.test(line)) {
                closeList();
                chart = null;
                var divider = document.createElement('hr');
                divider.className = 'pmd-ai-divider';
                parent.appendChild(divider);
                return;
            }

            var heading = line.match(/^#{1,4}\s+(.+)$/);
            if (heading) {
                closeList();
                chart = null;
                var title = document.createElement(heading[0].indexOf('####') === 0 ? 'h4' : 'h3');
                title.className = 'pmd-ai-answer-heading';
                appendInline(title, heading[1]);
                parent.appendChild(title);
                return;
            }

            var bar = parseBarLine(line);
            if (bar) {
                closeList();
                if (!chart) {
                    chart = document.createElement('div');
                    chart.className = 'pmd-ai-mini-chart';
                    parent.appendChild(chart);
                }
                renderBar(chart, bar, maxBar);
                return;
            }

            chart = null;
            var bullet = line.match(/^[-*]\s+(.+)$/);
            if (bullet) {
                if (!activeList || activeListType !== 'ul') {
                    activeList = document.createElement('ul');
                    activeList.className = 'pmd-ai-answer-list';
                    activeListType = 'ul';
                    parent.appendChild(activeList);
                }
                var li = document.createElement('li');
                appendInline(li, bullet[1]);
                activeList.appendChild(li);
                return;
            }

            var numbered = line.match(/^\d+[.)]\s+(.+)$/);
            if (numbered) {
                if (!activeList || activeListType !== 'ol') {
                    activeList = document.createElement('ol');
                    activeList.className = 'pmd-ai-answer-list';
                    activeListType = 'ol';
                    parent.appendChild(activeList);
                }
                var numberedLi = document.createElement('li');
                appendInline(numberedLi, numbered[1]);
                activeList.appendChild(numberedLi);
                return;
            }

            closeList();
            var paragraph = document.createElement('p');
            paragraph.className = /^[✨💰🧾⚠️✅📌🔎📈🍽️👥]/.test(line)
                ? 'pmd-ai-answer-highlight'
                : 'pmd-ai-answer-copy';
            appendInline(paragraph, line);
            parent.appendChild(paragraph);
        });

        if (!parent.children.length) {
            parent.textContent = String(text || 'No answer was returned.');
        }
    }

    function renderEvidence(parent, trace) {
        if (!Array.isArray(trace) || !trace.length) return;
        var list = document.createElement('div');
        list.className = 'pmd-ai-evidence-list';
        list.setAttribute('aria-label', 'PMD data checked');

        trace.forEach(function (item) {
            if (!item || !item.tool) return;
            var tag = document.createElement('span');
            tag.textContent = (evidenceLabels[item.tool] || 'PMD data source')
                + (item.ok === false ? ' unavailable' : ' ✓');
            list.appendChild(tag);
        });

        if (list.children.length) parent.appendChild(list);
    }

    function renderActions(parent, actions) {
        if (!Array.isArray(actions) || !actions.length) return;
        var row = document.createElement('div');
        row.className = 'pmd-ai-message-actions';
        row.setAttribute('aria-label', 'Suggested next steps');

        actions.slice(0, 3).forEach(function (action) {
            if (!action || typeof action.href !== 'string' || typeof action.label !== 'string') return;
            if (!action.href || action.href.indexOf('/admin/') === -1) return;

            var link = document.createElement('a');
            link.className = 'pmd-ai-action-link';
            link.href = action.href;
            link.textContent = action.label;
            if (action.description) link.title = String(action.description);
            row.appendChild(link);
        });

        if (row.children.length) parent.appendChild(row);
    }

    function appendMessage(role, content, options) {
        var opts = options || {};
        var wrapper = document.createElement('article');
        wrapper.className = 'pmd-ai-message ' + (role === 'user' ? 'is-user' : 'is-assistant');
        if (opts.thinking) wrapper.classList.add('is-thinking');
        if (opts.error) wrapper.classList.add('is-error');
        if (opts.id) wrapper.setAttribute('data-message-id', String(opts.id));

        var bubble = document.createElement('div');
        bubble.className = 'pmd-ai-bubble';
        if (role === 'assistant' && !opts.thinking && !opts.error) {
            renderRichAnswer(bubble, content);
        } else {
            bubble.textContent = String(content || '');
        }
        wrapper.appendChild(bubble);

        if (role === 'assistant' && !opts.thinking) {
            var metaBits = [];
            if (opts.runId) metaBits.push('Run ' + String(opts.runId).slice(0, 8));
            if (opts.latencyMs) metaBits.push((Number(opts.latencyMs) / 1000).toFixed(1) + 's');
            if (metaBits.length) {
                var meta = document.createElement('div');
                meta.className = 'pmd-ai-message-meta';
                meta.textContent = metaBits.join(' · ');
                wrapper.appendChild(meta);
            }
            renderEvidence(wrapper, opts.toolTrace);
            renderActions(wrapper, opts.actions);
        }

        messages.appendChild(wrapper);
        syncEmptyState();
        scrollToTail(opts.instant ? 'auto' : 'smooth');
        return wrapper;
    }

    function removeThinking() {
        messages.querySelectorAll('.pmd-ai-message.is-thinking').forEach(function (node) {
            node.remove();
        });
    }

    function resetThread() {
        messages.textContent = '';
        syncEmptyState();
        setSaveState('Saved chat is empty', false);
        state.textContent = 'Checks your restaurant data only.';
    }

    function normalizeHistoryMessage(row) {
        if (!row || typeof row !== 'object') return null;
        var role = row.role === 'assistant' ? 'assistant' : row.role === 'user' ? 'user' : null;
        var content = String(row.content || '').trim();
        if (!role || !content) return null;
        return {
            role: role,
            content: content,
            id: row.id || '',
            runId: row.run_id || '',
            actions: Array.isArray(row.actions) ? row.actions : []
        };
    }

    function loadHistory() {
        if (!historyEndpoint) {
            setSaveState('Saved chat unavailable', true);
            return Promise.resolve();
        }

        setSaveState('Loading saved chat…', false);
        return fetch(historyEndpoint, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        })
            .then(function (response) {
                return response.json().catch(function () { return {}; }).then(function (payload) {
                    payload.__status = response.status;
                    return payload;
                });
            })
            .then(function (payload) {
                if (!payload.ok || !Array.isArray(payload.messages)) {
                    setSaveState('Saved chat temporarily unavailable', true);
                    return;
                }

                messages.textContent = '';
                payload.messages.forEach(function (row) {
                    var message = normalizeHistoryMessage(row);
                    if (!message) return;
                    appendMessage(message.role, message.content, {
                        id: message.id,
                        runId: message.runId,
                        actions: message.actions,
                        instant: true
                    });
                });

                syncEmptyState();
                setSaveState(
                    payload.storage_ready === false
                        ? 'Chat storage temporarily unavailable'
                        : (hasMessages() ? 'Saved for this user and location' : 'Saved chat is empty'),
                    payload.storage_ready === false
                );
                scrollToTail('auto');
            })
            .catch(function () {
                setSaveState('Saved chat temporarily unavailable', true);
            });
    }

    function ask(value) {
        value = String(value || '').trim();
        if (!value || busy) return;

        appendMessage('user', value);
        question.value = '';
        setBusy(true);
        setSaveState('Saving after PMD answers…', false);
        var thinking = appendMessage('assistant', 'Checking the restaurant…', { thinking: true });

        var body = new FormData(form);
        body.set('question', value);

        fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: body
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return { ok: false, message: 'PMD Intelligence received an invalid server response.' };
                }).then(function (payload) {
                    payload.__status = response.status;
                    return payload;
                });
            })
            .then(function (result) {
                if (!result.ok) throw result;
                if (thinking && thinking.parentNode) thinking.remove();

                appendMessage('assistant', result.answer || 'No answer was returned.', {
                    runId: result.run_id || '',
                    latencyMs: result.latency_ms || 0,
                    toolTrace: Array.isArray(result.tool_trace) ? result.tool_trace : [],
                    actions: Array.isArray(result.actions) ? result.actions : []
                });

                state.textContent = result.latency_ms
                    ? 'Ready · ' + (result.latency_ms / 1000).toFixed(1) + 's · read-only'
                    : 'Ready · read-only';

                if (result.persisted === true && result.storage_ready !== false) {
                    setSaveState('Saved for this user and location', false);
                } else if (result.storage_ready === false) {
                    setSaveState('Answer ready · chat storage unavailable', true);
                } else {
                    setSaveState('Answer ready · save will retry next message', true);
                }
            })
            .catch(function (error) {
                if (thinking && thinking.parentNode) thinking.remove();
                appendMessage('assistant', error && error.message
                    ? error.message
                    : 'PMD Intelligence could not complete the request.', {
                    error: true,
                    runId: error && error.run_id ? error.run_id : ''
                });
                state.textContent = 'Could not finish · no restaurant data changed.';
                setSaveState('Previous saved chat is unchanged', true);
            })
            .finally(function () {
                setBusy(false);
                question.focus();
            });
    }

    root.querySelectorAll('[data-pmd-ai-prompt]').forEach(function (button) {
        button.addEventListener('click', function () {
            ask(button.getAttribute('data-pmd-ai-prompt') || button.textContent || '');
        });
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        ask(question.value);
    });

    question.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            ask(question.value);
        }
    });

    if (clearButton) {
        clearButton.addEventListener('click', function () {
            if (busy || !hasMessages() || !clearEndpoint) return;
            if (!window.confirm('Clear your saved PMD Intelligence chat for this location?')) return;

            clearButton.disabled = true;
            var body = new FormData(form);
            body.delete('question');

            fetch(clearEndpoint, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: body
            })
                .then(function (response) {
                    return response.json().catch(function () { return {}; });
                })
                .then(function (payload) {
                    if (!payload.ok || payload.cleared !== true) {
                        throw new Error(payload.message || 'Chat could not be cleared.');
                    }
                    resetThread();
                })
                .catch(function (error) {
                    setSaveState(error && error.message ? error.message : 'Chat could not be cleared.', true);
                    syncEmptyState();
                });
        });
    }

    syncEmptyState();
    void loadHistory();
})();
