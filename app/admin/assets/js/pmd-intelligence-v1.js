(function () {
    'use strict';

    var root = document.querySelector('[data-pmd-ai-root]');
    if (!root) return;

    var form = root.querySelector('[data-pmd-ai-form]');
    var question = root.querySelector('#pmd-ai-question');
    var answer = root.querySelector('[data-pmd-ai-answer]');
    var state = root.querySelector('[data-pmd-ai-state]');
    var run = root.querySelector('[data-pmd-ai-run]');
    var evidence = root.querySelector('[data-pmd-ai-evidence]');
    var endpoint = root.getAttribute('data-endpoint') || form.getAttribute('action');

    var evidenceLabels = {
        owner_kpis: 'Live restaurant KPIs',
        report_snapshot: 'Current PMD report',
        report_range: 'Historical PMD report',
        kitchen_workforce: 'Kitchen workforce'
    };

    root.querySelectorAll('[data-pmd-ai-prompt]').forEach(function (button) {
        button.addEventListener('click', function () {
            question.value = button.getAttribute('data-pmd-ai-prompt') || '';
            question.focus();
        });
    });

    function setBusy(busy) {
        var submit = form.querySelector('button[type="submit"]');
        submit.disabled = busy;
        submit.setAttribute('aria-busy', busy ? 'true' : 'false');
        question.disabled = busy;

        if (busy) {
            state.textContent = 'Checking restaurant data…';
        }
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
        var value = String(raw || '')
            .replace(/[^0-9,.-]/g, '')
            .replace(/,/g, '');
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

    function renderAnswer(text) {
        var lines = String(text || '').replace(/\r/g, '').split('\n');
        var barValues = lines.map(parseBarLine).filter(Boolean).map(function (item) {
            return item.value;
        });
        var maxBar = barValues.length ? Math.max.apply(Math, barValues) : 0;
        var activeList = null;
        var activeListType = '';
        var chart = null;

        answer.textContent = '';
        answer.classList.remove('is-empty', 'is-error');

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
                answer.appendChild(divider);
                return;
            }

            var heading = line.match(/^#{1,4}\s+(.+)$/);
            if (heading) {
                closeList();
                chart = null;
                var title = document.createElement(heading[0].indexOf('####') === 0 ? 'h4' : 'h3');
                title.className = 'pmd-ai-answer-heading';
                appendInline(title, heading[1]);
                answer.appendChild(title);
                return;
            }

            var bar = parseBarLine(line);
            if (bar) {
                closeList();
                if (!chart) {
                    chart = document.createElement('div');
                    chart.className = 'pmd-ai-mini-chart';
                    answer.appendChild(chart);
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
                    answer.appendChild(activeList);
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
                    answer.appendChild(activeList);
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
            answer.appendChild(paragraph);
        });

        if (!answer.children.length) {
            answer.textContent = 'No answer was returned.';
        }
    }

    function renderEvidence(result) {
        var trace = Array.isArray(result.tool_trace) ? result.tool_trace : [];
        if (!trace.length) {
            evidence.hidden = true;
            evidence.textContent = '';
            return;
        }

        evidence.hidden = false;
        evidence.innerHTML = '<strong>Checked in PMD</strong><div class="pmd-ai-tool-list"></div>';
        var list = evidence.querySelector('.pmd-ai-tool-list');

        trace.forEach(function (item) {
            var tag = document.createElement('span');
            var label = evidenceLabels[item.tool] || 'PMD data source';
            tag.textContent = label + (item.ok ? ' ✓' : ' unavailable');
            list.appendChild(tag);
        });
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var value = String(question.value || '').trim();
        if (!value) {
            question.focus();
            return;
        }

        setBusy(true);
        answer.classList.remove('is-empty', 'is-error');
        answer.textContent = 'Checking the restaurant…';
        run.textContent = '';
        evidence.hidden = true;
        evidence.textContent = '';

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
                    return {
                        ok: false,
                        message: 'PMD Intelligence received an invalid server response.'
                    };
                }).then(function (payload) {
                    payload.__status = response.status;
                    return payload;
                });
            })
            .then(function (result) {
                if (!result.ok) {
                    throw result;
                }

                renderAnswer(result.answer || 'No answer was returned.');
                run.textContent = result.run_id
                    ? 'Run ' + String(result.run_id).slice(0, 8)
                    : '';
                state.textContent = result.latency_ms
                    ? 'Ready · ' + (result.latency_ms / 1000).toFixed(1) + 's · read-only'
                    : 'Ready · read-only';
                renderEvidence(result);
            })
            .catch(function (error) {
                answer.classList.add('is-error');
                answer.textContent = error && error.message
                    ? error.message
                    : 'PMD Intelligence could not complete the request.';
                run.textContent = error && error.run_id
                    ? 'Run ' + String(error.run_id).slice(0, 8)
                    : '';
                state.textContent = 'Could not finish · no restaurant data changed.';
            })
            .finally(function () {
                setBusy(false);
            });
    });
})();
