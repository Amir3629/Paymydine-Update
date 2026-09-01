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
    var endpoint = root.getAttribute('data-endpoint');

    root.querySelectorAll('[data-pmd-ai-prompt]').forEach(function (button) {
        button.addEventListener('click', function () {
            question.value = button.getAttribute('data-pmd-ai-prompt') || '';
            question.focus();
        });
    });

    function csrfToken() {
        var tokenInput = form.querySelector('input[name="_token"]');
        if (tokenInput && tokenInput.value) return tokenInput.value;
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function setBusy(busy) {
        var submit = form.querySelector('button[type="submit"]');
        submit.disabled = busy;
        question.disabled = busy;
        state.textContent = busy ? 'Reading PMD sources and reasoning…' : 'Uses PMD canonical sources only.';
    }

    function renderEvidence(result) {
        var trace = Array.isArray(result.tool_trace) ? result.tool_trace : [];
        if (!trace.length) {
            evidence.hidden = true;
            evidence.textContent = '';
            return;
        }

        evidence.hidden = false;
        evidence.innerHTML = '<strong>Evidence used</strong><div class="pmd-ai-tool-list"></div>';
        var list = evidence.querySelector('.pmd-ai-tool-list');
        trace.forEach(function (item) {
            var tag = document.createElement('span');
            tag.textContent = item.tool + (item.ok ? ' ✓' : ' unavailable');
            list.appendChild(tag);
        });
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var value = String(question.value || '').trim();
        if (!value) return;

        setBusy(true);
        answer.classList.remove('is-empty', 'is-error');
        answer.textContent = 'Analyzing current restaurant operations…';
        run.textContent = '';
        evidence.hidden = true;

        var body = new FormData();
        body.append('question', value);
        var token = csrfToken();
        if (token) body.append('_token', token);

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
                    return { ok: false, message: 'Invalid server response.' };
                }).then(function (payload) {
                    payload.__status = response.status;
                    return payload;
                });
            })
            .then(function (result) {
                if (!result.ok) {
                    throw result;
                }

                answer.textContent = result.answer || 'No answer was returned.';
                run.textContent = result.run_id ? 'Run ' + String(result.run_id).slice(0, 8) : '';
                state.textContent = result.latency_ms ? 'Completed in ' + result.latency_ms + ' ms · read-only' : 'Completed · read-only';
                renderEvidence(result);
            })
            .catch(function (error) {
                answer.classList.add('is-error');
                answer.textContent = error && error.message
                    ? error.message
                    : 'PMD Intelligence could not complete the request safely.';
                run.textContent = error && error.run_id ? 'Run ' + String(error.run_id).slice(0, 8) : '';
                state.textContent = 'No PMD data was changed.';
            })
            .finally(function () {
                setBusy(false);
            });
    });
})();
