(function () {
  'use strict';

  if (window.PMDFloorMapV1) return;

  function clean(value) {
    return String(
      value == null ? '' : value
    ).replace(/\s+/g, ' ').trim();
  }

  function number(value, fallback) {
    var parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : (fallback || 0);
  }

  function yes(value) {
    return (
      value === true ||
      value === 1 ||
      value === '1' ||
      value === 'true'
    );
  }

  function escapeHtml(value) {
    return String(
      value == null ? '' : value
    ).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char];
    });
  }

  function fetchJson(url, options) {
    return fetch(
      url,
      Object.assign(
        {
          credentials: 'same-origin',
          cache: 'no-store',

          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With':
              'XMLHttpRequest'
          }
        },
        options || {}
      )
    ).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (payload) {
          if (
            !response.ok ||
            payload.ok === false
          ) {
            throw new Error(
              payload.message ||
              'HTTP ' + response.status
            );
          }

          return payload;
        });
    });
  }

  function createFloor(root) {
    var canvas =
      root.querySelector(
        '[data-floor-canvas]'
      );

    var scroll =
      root.querySelector(
        '[data-floor-scroll]'
      );

    var loading =
      root.querySelector(
        '[data-floor-loading]'
      );

    var empty =
      root.querySelector(
        '[data-floor-empty]'
      );

    var drawer =
      root.querySelector(
        '[data-floor-drawer]'
      );

    var toastNode =
      root.querySelector(
        '[data-floor-toast]'
      );

    var dataUrl =
      root.getAttribute(
        'data-data-url'
      );

    var layoutUrl =
      root.getAttribute(
        'data-layout-url'
      );

    var stateUrl =
      root.getAttribute(
        'data-state-url'
      );

    var orderTemplate =
      root.getAttribute(
        'data-order-url'
      ) ||
      '/admin/waiter-pos/{table}';

    var FLOOR_WIDTH = 1000;
    var FLOOR_HEIGHT = 560;

    var TABLE_WIDTH = 108;
    var TABLE_HEIGHT = 88;

    var MERGED_WIDTH = 178;
    var MERGED_HEIGHT = 146;

    /*
     * One-row Merge geometry:
     * wide horizontally, compact vertically.
     */
    var STRIP_MERGED_WIDTH = 270;
    var STRIP_MERGED_HEIGHT = 104;

    var MINIMUM_GAP = 14;
    var SNAP_DISTANCE = 20;
    var EDGE_PADDING = 10;

    var state = {
      payload: {},
      tables: [],
      displayTables: [],

      operational: {
        tables: {},
        merges: {}
      },

      filter: 'all',
      query: '',
      zoom: 1,

      editing: false,
      mergeMode: false,
      mergeSelection: [],

      /*
       * Short, horizontally scrollable one-row view.
       * This is display-only and never overwrites the saved
       * normal Floor coordinates.
       */
      stripMode: false,

      /*
       * Mother Floor context.
       *
       * Context controls which page-specific actions and
       * counters are visible without changing the Floor engine.
       */
      context: 'operations',

      /*
       * Area selector replaces the old status filters.
       */
      selectedArea: 'all',

      capabilities: {
        available: true,
        cleaning: true,
        reserved: true,
        waiterCall: true,
        note: true,
        openTable: true,
        unmerge: true
      },

      counters: [],

      selectedDisplayId: null,

      /*
       * Used only for structural transitions such as:
       * - merge
       * - unmerge
       * - normal Floor / One-row switch
       */
      transitionReason: null,

      active: null,
      drag: null,

      toastTimer: null
    };

    function toast(message, error) {
      if (!toastNode) return;

      toastNode.textContent =
        clean(message);

      toastNode.style.background =
        error ? '#a82435' : '#10243a';

      toastNode.classList.add(
        'is-visible'
      );

      clearTimeout(
        state.toastTimer
      );

      state.toastTimer =
        setTimeout(function () {
          toastNode.classList.remove(
            'is-visible'
          );
        }, 2600);
    }

    function clamp(
      value,
      minimum,
      maximum
    ) {
      return Math.min(
        maximum,
        Math.max(minimum, value)
      );
    }

    function tableId(raw) {
      return clean(
        raw.id ||
        raw.table_id ||
        raw.location_table_id ||
        raw.number ||
        raw.table_number
      );
    }

    function tableNumber(raw) {
      return clean(
        raw.number ||
        raw.table_number ||
        raw.table_no ||
        raw.id ||
        raw.table_id
      );
    }

    function area(raw) {
      return clean(
        raw.section ||
        raw.table_section ||
        raw.table_zone ||
        raw.zone ||
        raw.floor_name ||
        'Main'
      );
    }

    function linkedOrders(
      raw,
      orders
    ) {
      var keys = [
        raw.id,
        raw.table_id,
        raw.number,
        raw.table_number,
        raw.table_no,
        raw.name,
        raw.label
      ]
        .map(clean)
        .filter(Boolean);

      return orders.filter(
        function (order) {
          return [
            order.table_id,
            order.location_table_id,
            order.table_number,
            order.table_no,
            order.table_ref,
            order.table,
            order.table_label
          ]
            .map(clean)
            .some(function (value) {
              return (
                keys.indexOf(value) !== -1
              );
            });
        }
      );
    }

    function normalize(payload) {
      var rawTables =
        Array.isArray(payload.tables)
          ? payload.tables
          : (
            (
              (
                payload.sections || {}
              ).floor_plan || {}
            ).tables || []
          );

      var orders =
        Array.isArray(payload.orders)
          ? payload.orders
          : (
            Array.isArray(
              payload.current_orders
            )
              ? payload.current_orders
              : []
          );

      return rawTables
        .map(function (raw, index) {
          var id = tableId(raw);

          var linked =
            linkedOrders(
              raw,
              orders
            );

          var custom =
            state.operational.tables[id] ||
            {};

          var rawStatus =
            clean(
              custom.status ||
              raw.status ||
              raw.latest_order_status ||
              ''
            ).toLowerCase();

          var waiterCall =
            rawStatus === 'waiter-call' ||
            yes(raw.waiter_call) ||
            yes(raw.needs_waiter) ||
            yes(raw.call_waiter);

          var cleaning =
            rawStatus === 'cleaning' ||
            yes(raw.cleaning_required) ||
            yes(raw.needs_cleaning);

          var reserved =
            rawStatus === 'reserved' ||
            yes(raw.reserved) ||
            yes(raw.is_reserved);

          var occupied =
            rawStatus === 'occupied' ||
            linked.length > 0 ||
            number(
              raw.open_orders,
              0
            ) > 0;

          var note =
            clean(
              custom.note ||
              raw.note ||
              raw.comment ||
              ''
            ) ||
            linked.some(
              function (order) {
                return clean(
                  order.note ||
                  order.comment ||
                  ''
                ) !== '';
              }
            );

          var status =
            (
              waiterCall ||
              !!note
            )
              ? 'attention'
              : cleaning
                ? 'cleaning'
                : reserved
                  ? 'reserved'
                  : occupied
                    ? 'occupied'
                    : 'available';

          var floor =
            raw.floor || {};

          var x =
            number(
              raw.floor_x,
              number(
                floor.x,
                80 +
                (index % 6) * 150
              )
            );

          var y =
            number(
              raw.floor_y,
              number(
                floor.y,
                60 +
                Math.floor(index / 6) *
                  110
              )
            );

          return {
            raw: raw,
            id: id,

            number:
              tableNumber(raw),

            name:
              clean(
                raw.name ||
                raw.label ||
                (
                  'Table ' +
                  tableNumber(raw)
                )
              ),

            area: area(raw),

            capacity:
              number(
                raw.capacity ||
                raw.table_capacity,
                0
              ),

            status: status,

            waiterCall:
              waiterCall,

            cleaning:
              cleaning,

            note:
              clean(
                custom.note ||
                (
                  typeof note === 'string'
                    ? note
                    : ''
                )
              ),

            openOrders:
              Math.max(
                linked.length,
                number(
                  raw.open_orders,
                  0
                )
              ),

            x: clamp(
              x,
              TABLE_WIDTH / 2 +
                EDGE_PADDING,
              FLOOR_WIDTH -
                TABLE_WIDTH / 2 -
                EDGE_PADDING
            ),

            y: clamp(
              y,
              TABLE_HEIGHT / 2 +
                EDGE_PADDING,
              FLOOR_HEIGHT -
                TABLE_HEIGHT / 2 -
                EDGE_PADDING
            ),

            w: TABLE_WIDTH,
            h: TABLE_HEIGHT
          };
        })
        .filter(function (table) {
          return (
            table.id &&
            table.number
          );
        });
    }

    function mergeFor(
      tableIdValue
    ) {
      var found = null;

      Object.keys(
        state.operational.merges || {}
      ).some(function (id) {
        var merge =
          state.operational.merges[id];

        if (
          (merge.table_ids || [])
            .map(String)
            .indexOf(
              String(tableIdValue)
            ) !== -1
        ) {
          found = {
            id: id,
            table_ids:
              merge.table_ids
          };

          return true;
        }

        return false;
      });

      return found;
    }

    function statusPriority(status) {
      return {
        'waiter-call': 5,
        attention: 5,
        cleaning: 4,
        reserved: 3,
        occupied: 2,
        available: 1
      }[status] || 0;
    }

    function mergedStatus(
      members
    ) {
      return members
        .slice()
        .sort(function (a, b) {
          return (
            statusPriority(b.status) -
            statusPriority(a.status)
          );
        })[0].status;
    }

    function buildDisplayTables() {
      var rendered = [];
      var handled = {};

      state.tables.forEach(
        function (table) {
          if (handled[table.id]) {
            return;
          }

          var merge =
            mergeFor(table.id);

          if (!merge) {
            rendered.push(table);
            handled[table.id] = true;
            return;
          }

          var memberIds =
            (merge.table_ids || [])
              .map(String);

          var members =
            state.tables.filter(
              function (candidate) {
                return (
                  memberIds.indexOf(
                    String(candidate.id)
                  ) !== -1
                );
              }
            );

          if (!members.length) {
            rendered.push(table);
            handled[table.id] = true;
            return;
          }

          members.forEach(
            function (member) {
              handled[member.id] = true;
            }
          );

          var centerX =
            members.reduce(
              function (total, member) {
                return (
                  total +
                  Number(member.x)
                );
              },
              0
            ) / members.length;

          var centerY =
            members.reduce(
              function (total, member) {
                return (
                  total +
                  Number(member.y)
                );
              },
              0
            ) / members.length;

          var numbers =
            members.map(
              function (member) {
                return member.number;
              }
            );

          rendered.push({
            id: members[0].id,

            number:
              numbers.join(' + '),

            name:
              'Merged tables ' +
              numbers.join(', '),

            area:
              members[0].area,

            capacity:
              members.reduce(
                function (total, member) {
                  return (
                    total +
                    number(
                      member.capacity,
                      0
                    )
                  );
                },
                0
              ),

            status:
              mergedStatus(members),

            waiterCall:
              members.some(
                function (member) {
                  return (
                    member.waiterCall
                  );
                }
              ),

            cleaning:
              members.some(
                function (member) {
                  return member.cleaning;
                }
              ),

            note:
              members
                .map(function (member) {
                  return member.note;
                })
                .filter(Boolean)
                .join(' · '),

            openOrders:
              members.reduce(
                function (total, member) {
                  return (
                    total +
                    number(
                      member.openOrders,
                      0
                    )
                  );
                },
                0
              ),

            x: centerX,
            y: centerY,

            w: MERGED_WIDTH,
            h: MERGED_HEIGHT,

            isMergedView: true,

            mergeId:
              merge.id,

            memberIds:
              members.map(
                function (member) {
                  return member.id;
                }
              ),

            members:
              members
          });
        }
      );

      if (state.stripMode) {
        rendered = rendered
          .map(function (table) {
            return Object.assign(
              {},
              table,

              {
                memberIds:
                  table.memberIds
                    ? table.memberIds.slice()
                    : undefined,

                members:
                  table.members
                    ? table.members.slice()
                    : undefined
              }
            );
          })
          .sort(function (first, second) {
            function smallestNumber(table) {
              var values =
                table.isMergedView
                  ? table.members.map(
                    function (member) {
                      return Number(
                        member.number
                      );
                    }
                  )
                  : [
                    Number(table.number)
                  ];

              values = values.filter(
                Number.isFinite
              );

              return values.length
                ? Math.min.apply(
                  Math,
                  values
                )
                : 999999;
            }

            return (
              smallestNumber(first) -
              smallestNumber(second)
            );
          });

        var cursorX =
          EDGE_PADDING;

        var stripHeight = 132;

        rendered.forEach(
          function (table) {
            var size =
              dimensions(table);

            table.w = size.width;
            table.h = size.height;

            table.x =
              cursorX +
              size.width / 2;

            table.y =
              stripHeight / 2;

            cursorX +=
              size.width +
              MINIMUM_GAP;
          }
        );

        canvas.style.width =
          Math.max(
            FLOOR_WIDTH,
            cursorX +
              EDGE_PADDING -
              MINIMUM_GAP
          ) + 'px';

        canvas.style.height =
          stripHeight + 'px';
      } else {
        canvas.style.width =
          FLOOR_WIDTH + 'px';

        canvas.style.height =
          FLOOR_HEIGHT + 'px';
      }

      state.displayTables = rendered;

      return rendered;
    }

    function badges(table) {
      var list = [];

      /*
       * Merged state uses the same compact top-right badge
       * system as Note, Cleaning and Waiter Call.
       */
      if (table.isMergedView) {
        list.push(
          '<span class="' +
          'pmd-floor-v1__badge ' +
          'is-merge" ' +
          'title="' +
          escapeHtml(
            table.memberIds.length +
            ' merged tables'
          ) +
          '">' +
          '↔</span>'
        );
      }

      if (table.waiterCall) {
        list.push(
          '<span class="' +
          'pmd-floor-v1__badge ' +
          'is-call" ' +
          'title="Waiter call">' +
          '♟</span>'
        );
      }

      if (table.note) {
        list.push(
          '<span class="' +
          'pmd-floor-v1__badge ' +
          'is-note" ' +
          'title="Note">' +
          '✎</span>'
        );
      }

      if (table.cleaning) {
        list.push(
          '<span class="' +
          'pmd-floor-v1__badge ' +
          'is-clean" ' +
          'title="Needs cleaning">' +
          '✦</span>'
        );
      }

      return list.length
        ? (
          '<span class="' +
          'pmd-floor-v1__badges">' +
          list.join('') +
          '</span>'
        )
        : '';
    }

    function visible(table) {
      if (
        state.filter !== 'all'
      ) {
        if (
          state.filter ===
          'attention'
        ) {
          if (
            !(
              table.waiterCall ||
              table.note
            )
          ) {
            return false;
          }
        } else if (
          table.status !==
          state.filter
        ) {
          return false;
        }
      }

      if (state.query) {
        var text = [
          table.number,
          table.name,
          table.area,
          table.status
        ]
          .join(' ')
          .toLowerCase();

        if (
          text.indexOf(
            state.query
          ) === -1
        ) {
          return false;
        }
      }

      return true;
    }

    function transitionSnapshot() {
      if (
        !canvas ||
        !state.transitionReason
      ) {
        return null;
      }

      var cards = [];

      canvas
        .querySelectorAll(
          '[data-floor-table]'
        )
        .forEach(function (node) {
          var rect =
            node.getBoundingClientRect();

          var members =
            clean(
              node.getAttribute(
                'data-floor-members'
              ) || ''
            )
              .split(',')
              .map(clean)
              .filter(Boolean);

          cards.push({
            id:
              clean(
                node.getAttribute(
                  'data-floor-table'
                )
              ),

            members: members,

            rect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,

              centerX:
                rect.left +
                rect.width / 2,

              centerY:
                rect.top +
                rect.height / 2
            },

            clone:
              node.cloneNode(true)
          });
        });

      return {
        reason:
          state.transitionReason,

        cards: cards
      };
    }

    function sourceForNewCard(
      node,
      snapshot
    ) {
      var id =
        clean(
          node.getAttribute(
            'data-floor-table'
          )
        );

      var members =
        clean(
          node.getAttribute(
            'data-floor-members'
          ) || ''
        )
          .split(',')
          .map(clean)
          .filter(Boolean);

      var direct =
        snapshot.cards.find(
          function (card) {
            return card.id === id;
          }
        );

      if (direct) {
        return direct.rect;
      }

      /*
       * Unmerge:
       * an individual card starts from the previous merged card.
       */
      var previousMerged =
        snapshot.cards.find(
          function (card) {
            return (
              card.members.indexOf(id) !==
              -1
            );
          }
        );

      if (previousMerged) {
        return previousMerged.rect;
      }

      /*
       * Merge:
       * the new merged card starts from the average location
       * of its former individual member cards.
       */
      if (members.length) {
        var memberCards =
          snapshot.cards.filter(
            function (card) {
              return (
                members.indexOf(
                  card.id
                ) !== -1
              );
            }
          );

        if (memberCards.length) {
          return {
            centerX:
              memberCards.reduce(
                function (total, card) {
                  return (
                    total +
                    card.rect.centerX
                  );
                },
                0
              ) /
              memberCards.length,

            centerY:
              memberCards.reduce(
                function (total, card) {
                  return (
                    total +
                    card.rect.centerY
                  );
                },
                0
              ) /
              memberCards.length,

            width:
              memberCards[0]
                .rect.width,

            height:
              memberCards[0]
                .rect.height
          };
        }
      }

      return null;
    }

    function animateStructuralRender(
      snapshot
    ) {
      if (
        !snapshot ||
        !canvas
      ) {
        state.transitionReason = null;
        return;
      }

      var duration =
        snapshot.reason === 'layout'
          ? 360
          : 280;

      root.classList.add(
        'is-floor-transitioning'
      );

      canvas
        .querySelectorAll(
          '[data-floor-table]'
        )
        .forEach(function (node) {
          var target =
            node.getBoundingClientRect();

          var source =
            sourceForNewCard(
              node,
              snapshot
            );

          if (!source) {
            node.animate(
              [
                {
                  opacity: 0,
                  transform:
                    'scale(.92)'
                },

                {
                  opacity: 1,
                  transform:
                    'scale(1)'
                }
              ],
              {
                duration: duration,
                easing:
                  'cubic-bezier(.2,.8,.2,1)',
                fill: 'both'
              }
            );

            return;
          }

          var translateX =
            source.centerX -
            (
              target.left +
              target.width / 2
            );

          var translateY =
            source.centerY -
            (
              target.top +
              target.height / 2
            );

          var scaleX =
            source.width /
            Math.max(
              target.width,
              1
            );

          var scaleY =
            source.height /
            Math.max(
              target.height,
              1
            );

          node.animate(
            [
              {
                opacity: .72,

                transform:
                  'translate(' +
                  translateX +
                  'px,' +
                  translateY +
                  'px) scale(' +
                  scaleX +
                  ',' +
                  scaleY +
                  ')'
              },

              {
                opacity: 1,

                transform:
                  'translate(0,0) ' +
                  'scale(1,1)'
              }
            ],
            {
              duration: duration,
              easing:
                'cubic-bezier(.2,.8,.2,1)',
              fill: 'both'
            }
          );
        });

      window.setTimeout(
        function () {
          root.classList.remove(
            'is-floor-transitioning'
          );
        },
        duration + 40
      );

      state.transitionReason = null;
    }

    function render() {
      if (!canvas) return;

      var structuralSnapshot =
        transitionSnapshot();

      var displayTables =
        buildDisplayTables();

      canvas.innerHTML =
        displayTables
          .map(function (table) {
            var mergeSelected =
              state.mergeSelection
                .some(function (id) {
                  if (
                    table.isMergedView
                  ) {
                    return (
                      table.memberIds
                        .indexOf(id) !== -1
                    );
                  }

                  return (
                    id === table.id
                  );
                });

            var operationalSelected =
              String(
                state.selectedDisplayId || ''
              ) === String(table.id);

            var selected =
              mergeSelected ||
              operationalSelected;

            var meta =
              (
                table.status ===
                  'available' ||
                table.status ===
                  'occupied'
              )
                ? ''
                : table.status
                    .replace('-', ' ');

            return (
              '<button ' +
              'type="button" ' +

              'class="' +
              'pmd-floor-v1__table' +
              (
                table.isMergedView
                  ? ' is-merged-card'
                  : ''
              ) +
              (
                selected
                  ? ' is-selected'
                  : ''
              ) +
              (
                !visible(table)
                  ? ' is-filtered'
                  : ''
              ) +
              '" ' +

              'data-floor-table="' +
              escapeHtml(table.id) +
              '" ' +

              (
                table.isMergedView
                  ? (
                    'data-floor-merge-id="' +
                    escapeHtml(
                      table.mergeId
                    ) +
                    '" ' +

                    'data-floor-members="' +
                    escapeHtml(
                      table.memberIds.join(',')
                    ) +
                    '" '
                  )
                  : ''
              ) +

              'data-status="' +
              escapeHtml(
                table.status
              ) +
              '" ' +

              'style="' +
              'left:' +
              table.x +
              'px;' +
              'top:' +
              table.y +
              'px;' +
              'width:' +
              table.w +
              'px;' +
              'height:' +
              table.h +
              'px" ' +

              'aria-label="' +
              escapeHtml(table.name) +
              '">' +

              badges(table) +

              '<strong class="' +
              'pmd-floor-v1__table-number">' +
              escapeHtml(
                table.number
              ) +
              '</strong>' +

              (
                meta
                  ? (
                    '<span class="' +
                    'pmd-floor-v1__table-meta">' +
                    escapeHtml(meta) +
                    '</span>'
                  )
                  : ''
              ) +

              '' +

              '</button>'
            );
          })
          .join('');

      var shown =
        displayTables
          .filter(visible)
          .length;

      if (empty) {
        empty.hidden =
          shown > 0;
      }

      updateCounts();
      applyZoom();

      root.setAttribute(
        'aria-busy',
        'false'
      );

      if (loading) {
        loading.hidden = true;
      }

      animateStructuralRender(
        structuralSnapshot
      );

      updateMotherToolbar();

      organizeFloorControls();
      refreshFloorIcons();

      refreshAreaAndStripLayout();
    }

    function updateCounts() {
      [
        'all',
        'available',
        'occupied',
        'reserved',
        'cleaning',
        'attention'
      ].forEach(function (key) {
        var count =
          key === 'all'
            ? state.tables.length
            : state.tables.filter(
              function (table) {
                return (
                  key === 'attention'
                    ? (
                      table.waiterCall ||
                      !!table.note
                    )
                    : (
                      table.status === key
                    )
                );
              }
            ).length;

        var node =
          root.querySelector(
            '[data-floor-count="' +
            key +
            '"]'
          );

        if (node) {
          node.textContent =
            String(count);
        }
      });
    }

    function applyZoom() {
      if (!canvas) return;

      canvas.style.transform =
        'scale(' +
        state.zoom +
        ')';

      canvas.parentElement
        .style.setProperty(
          '--floor-zoom',
          state.zoom
        );
    }

    function fit() {
      if (!scroll || !canvas) {
        return;
      }

      if (state.stripMode) {
        /*
         * Keep the page width unchanged.
         * Wide one-row contents use horizontal scrolling.
         */
        state.zoom = 1;

        applyZoom();

        scroll.scrollLeft = 0;
        scroll.scrollTop = 0;

        return;
      }

      state.zoom =
        Math.max(
          .45,
          Math.min(
            1.4,
            Math.min(
              scroll.clientWidth /
                FLOOR_WIDTH,

              scroll.clientHeight /
                FLOOR_HEIGHT
            )
          )
        );

      applyZoom();

      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
    }

    function saveOperational(
      action,
      body
    ) {
      /*
       * Preserve layout before an operational refresh.
       *
       * Status APIs must never change table coordinates.
       */
      var coordinateSnapshot =
        captureCurrentFloorCoordinates();

      return fetchJson(
        stateUrl,
        {
          method: 'POST',

          body:
            JSON.stringify(
              Object.assign(
                {
                  action: action
                },
                body || {}
              )
            )
        }
      ).then(function (payload) {
        state.operational =
          payload.state ||
          state.operational;

        /*
         * normalize() reconstructs table objects from the original
         * data payload, which can contain stale floor_x/floor_y.
         */
        state.tables =
          normalize(state.payload);

        /*
         * Restore the exact positions that existed immediately
         * before waiter call / note / cleaning / reservation.
         */
        restoreFloorCoordinates(
          coordinateSnapshot
        );

        render();

        window.dispatchEvent(
          new CustomEvent(
            'pmd:floor:updated',
            {
              detail: {
                action: action,
                state:
                  state.operational,

                coordinatesPreserved:
                  true
              }
            }
          )
        );

        return payload;
      });
    }

    
/* PMD_FLOOR_PERSISTENCE_JUMP_V292_START */

/*
 * Keep the original API payload synchronized with the
 * current Floor coordinates.
 *
 * Operational actions rebuild state.tables from state.payload.
 * Without this synchronization, waiter calls, notes, cleaning
 * and reservation actions can restore stale table positions.
 */
function syncPayloadCoordinatesFromTables() {
  if (
    !state ||
    !Array.isArray(state.tables) ||
    !state.payload
  ) {
    return;
  }

  var coordinates = {};

  state.tables.forEach(
    function (table) {
      coordinates[
        String(table.id)
      ] = {
        x: Number(table.x),
        y: Number(table.y)
      };
    }
  );

  function synchronizeList(list) {
    if (!Array.isArray(list)) {
      return;
    }

    list.forEach(
      function (raw) {
        if (!raw) {
          return;
        }

        var id =
          raw.id != null
            ? raw.id
            : (
              raw.table_id != null
                ? raw.table_id
                : raw.tableId
            );

        var coordinate =
          coordinates[
            String(id)
          ];

        if (!coordinate) {
          return;
        }

        raw.floor_x =
          coordinate.x;

        raw.floor_y =
          coordinate.y;

        if (
          raw.floor &&
          typeof raw.floor === 'object'
        ) {
          raw.floor.x =
            coordinate.x;

          raw.floor.y =
            coordinate.y;
        }
      }
    );
  }

  synchronizeList(
    state.payload.tables
  );

  synchronizeList(
    state.payload.data
  );

  synchronizeList(
    state.payload.items
  );

  if (
    state.payload.floor &&
    typeof state.payload.floor ===
      'object'
  ) {
    synchronizeList(
      state.payload.floor.tables
    );
  }
}

/*
 * Capture positions before an operational API response.
 */
function captureCurrentFloorCoordinates() {
  var snapshot = {};

  state.tables.forEach(
    function (table) {
      snapshot[
        String(table.id)
      ] = {
        x: Number(table.x),
        y: Number(table.y)
      };
    }
  );

  return snapshot;
}

/*
 * Restore the exact coordinates after normalize().
 */
function restoreFloorCoordinates(snapshot) {
  if (!snapshot) {
    return;
  }

  state.tables.forEach(
    function (table) {
      var saved =
        snapshot[
          String(table.id)
        ];

      if (!saved) {
        return;
      }

      if (
        Number.isFinite(saved.x)
      ) {
        table.x = saved.x;
      }

      if (
        Number.isFinite(saved.y)
      ) {
        table.y = saved.y;
      }
    }
  );

  syncPayloadCoordinatesFromTables();
}

/* PMD_FLOOR_PERSISTENCE_JUMP_V292_END */


function saveLayout() {
      var tables =
        state.tables.map(
          function (table) {
            return {
              id: table.id,
              table_id: table.id,

              floor_x:
                Math.round(table.x),

              floor_y:
                Math.round(table.y),

              floor_width:
                TABLE_WIDTH,

              floor_height:
                TABLE_HEIGHT
            };
          }
        );

      return fetchJson(
        layoutUrl,
        {
          method: 'POST',

          body:
            JSON.stringify({
              tables: tables
            })
        }
      )
        .then(function (payload) {
          /*
           * The POST endpoint is the authoritative Save result.
           *
           * Do not verify against GET /layout here because that
           * endpoint can return only a visible/context subset of
           * tables, causing false "missing table" errors.
           */
          if (
            !payload ||
            payload.ok === false
          ) {
            throw new Error(
              payload && payload.message
                ? payload.message
                : 'Floor layout could not be saved'
            );
          }

          if (
            payload.updated != null &&
            Number(payload.updated) < 1 &&
            tables.length
          ) {
            throw new Error(
              'Layout endpoint updated 0 tables'
            );
          }

          /*
           * Keep the original data payload synchronized so later
           * operational actions cannot restore old coordinates.
           */
          syncPayloadCoordinatesFromTables();

          toast(
            'Floor layout saved'
          );

          setEditing(false);

          window.dispatchEvent(
            new CustomEvent(
              'pmd:floor:updated',
              {
                detail: {
                  action:
                    'layout',

                  saved:
                    true,

                  updated:
                    payload.updated
                }
              }
            )
          );

          return payload;
        })
        .catch(function (error) {
          toast(
            error.message,
            true
          );

          console.error(
            '[PMD Floor] Layout save failed',
            error
          );
        });
    }

    function load() {
      root.setAttribute(
        'aria-busy',
        'true'
      );

      if (loading) {
        loading.hidden = false;
      }

      return Promise.all([
        fetchJson(dataUrl),

        fetchJson(stateUrl)
          .catch(function () {
            return {
              state: {
                tables: {},
                merges: {}
              }
            };
          })
      ])
        .then(function (results) {
          state.payload =
            results[0] || {};

          state.operational =
            results[1].state || {
              tables: {},
              merges: {}
            };

          state.tables =
            normalize(state.payload);

          render();

          /*
           * Repair previously saved merged groups that overlap
           * another table or merged group.
           */
          repairAllMergedGroups()
            .catch(function (error) {
              console.warn(
                '[PMD Floor] Existing merged-group repair failed',
                error
              );
            });

          setTimeout(
            fit,
            0
          );
        })
        .catch(function (error) {
          if (loading) {
            loading.textContent =
              'Floor could not load: ' +
              error.message;
          }

          toast(
            error.message,
            true
          );
        });
    }

    function ensureStripButton() {
      var existing =
        root.querySelector(
          '[data-floor-strip]'
        );

      if (existing) {
        return existing;
      }

      var anchor =
        root.querySelector(
          '[data-floor-fullscreen]'
        ) ||
        root.querySelector(
          '[data-floor-fit]'
        );

      var toolbar =
        anchor
          ? anchor.parentElement
          : root.querySelector(
            '.pmd-floor-v1__toolbar'
          );

      if (!toolbar) {
        return null;
      }

      var button =
        document.createElement(
          'button'
        );

      button.type = 'button';

      button.className =
        'pmd-floor-v1__tool';

      button.setAttribute(
        'data-floor-strip',
        ''
      );

      button.setAttribute(
        'aria-pressed',
        'false'
      );

      button.setAttribute(
        'title',
        'Show tables in one short row'
      );

      button.innerHTML =
        '⇥ One row';

      if (anchor) {
        toolbar.insertBefore(
          button,
          anchor
        );
      } else {
        toolbar.appendChild(
          button
        );
      }

      return button;
    }

    function updateStripButton() {
      var button =
        ensureStripButton();

      if (!button) {
        return;
      }

      button.setAttribute(
        'aria-pressed',
        state.stripMode
          ? 'true'
          : 'false'
      );

      button.innerHTML =
        state.stripMode
          ? '↩ Floor'
          : '⇥ One row';

      button.setAttribute(
        'title',
        state.stripMode
          ? 'Return to saved Floor layout'
          : 'Show tables in one short row'
      );

      refreshFloorIcons();

      window.requestAnimationFrame(
        function () {
          applyAreaFilter();
          calibrateOneRow();
        }
      );
    }

    function setStripMode(value) {
      /*
       * Mark the next render as a structural layout transition.
       */
      state.transitionReason =
        'layout';

      state.stripMode = !!value;

      if (state.stripMode) {
        /*
         * Strip mode is operational, not a layout editor.
         */
        setEditing(false);
      }

      root.classList.toggle(
        'is-strip-mode',
        state.stripMode
      );

      updateStripButton();
      render();

      window.setTimeout(
        fit,
        0
      );

      toast(
        state.stripMode
          ? 'One-row Floor view enabled'
          : 'Saved Floor layout restored'
      );
    }

    function setEditing(value) {
      state.editing = !!value;

      root.classList.toggle(
        'is-editing',
        state.editing
      );

      var edit =
        root.querySelector(
          '[data-floor-edit]'
        );

      var save =
        root.querySelector(
          '[data-floor-save]'
        );

      if (edit) {
        edit.setAttribute(
          'aria-pressed',
          state.editing
            ? 'true'
            : 'false'
        );
      }

      if (save) {
        save.hidden =
          !state.editing;
      }

      if (edit) {
        edit.hidden =
          state.editing;
      }
    }

    function updateMergeButton() {
      var button =
        root.querySelector(
          '[data-floor-merge]'
        );

      if (!button) {
        return;
      }

      button.setAttribute(
        'aria-pressed',
        state.mergeMode
          ? 'true'
          : 'false'
      );

      if (!state.mergeMode) {
        button.innerHTML =
          '↔ Merge';

        button.removeAttribute(
          'data-selection-count'
        );

        return;
      }

      var count =
        state.mergeSelection.length;

      button.setAttribute(
        'data-selection-count',
        String(count)
      );

      if (count >= 2) {
        button.innerHTML =
          'Merge ' +
          count +
          ' tables';
      } else {
        button.innerHTML =
          'Cancel merge';
      }

      refreshFloorIcons();
    }

    function setMergeMode(value) {
      state.mergeMode = !!value;

      /*
       * Edit and Merge are separate interaction modes.
       */
      if (
        state.mergeMode &&
        state.editing
      ) {
        setEditing(false);
      }

      if (!state.mergeMode) {
        state.mergeSelection = [];
      }

      updateMergeButton();
      render();

      if (state.mergeMode) {
        toast(
          'Select two or more tables, then click Merge again'
        );
      }
    }

    function cancelMergeMode() {
      if (!state.mergeMode) {
        return;
      }

      state.mergeSelection = [];
      setMergeMode(false);

      toast(
        'Merge cancelled'
      );
    }

    function commitMerge() {
      if (
        !state.mergeMode ||
        state.mergeSelection.length < 2
      ) {
        toast(
          'Select at least two tables',
          true
        );

        return;
      }

      var ids =
        state.mergeSelection.slice();

      state.transitionReason = null;

      /*
       * Merge renders directly at the final position.
       * This removes the brief structural jump/flicker.
       */

      saveOperational(
        'merge',
        {
          table_ids: ids
        }
      )
        .then(function () {
          /*
           * The backend merge now exists.
           * Move the complete merged group away from collisions
           * before rendering its single larger icon.
           */
          var repositioned =
            placeMergedGroupSafely(
              ids
            );

          if (repositioned) {
            return persistLayoutSilently();
          }

          return Promise.resolve();
        })
        .then(function () {
          state.mergeSelection = [];
          setMergeMode(false);

          render();

          toast(
            ids.length +
            ' tables merged and positioned safely'
          );
        })
        .catch(function (error) {
          toast(
            error.message,
            true
          );
        });
    }

    function displayTableById(id) {
      return state.displayTables
        .find(function (table) {
          return (
            String(table.id) ===
            String(id)
          );
        });
    }

    function openDrawer(table) {
      state.active = table;

      if (!drawer) return;

      drawer.classList.add(
        'is-open'
      );

      drawer.setAttribute(
        'aria-hidden',
        'false'
      );

      document.body.style.overflow =
        'hidden';

      var title =
        drawer.querySelector(
          '[data-floor-drawer-title]'
        );

      var summary =
        drawer.querySelector(
          '[data-floor-summary]'
        );

      var note =
        drawer.querySelector(
          '[data-floor-note]'
        );

      var mergeInfo =
        drawer.querySelector(
          '[data-floor-merge-info]'
        );

      if (title) {
        title.textContent =
          table.name;
      }

      if (summary) {
        summary.innerHTML =
          '<b>Status:</b> ' +
          escapeHtml(
            table.status.replace(
              '-',
              ' '
            )
          ) +

          '<br><b>Area:</b> ' +
          escapeHtml(table.area) +

          '<br><b>Capacity:</b> ' +
          (
            table.capacity || '—'
          ) +

          '<br><b>Open orders:</b> ' +
          table.openOrders;
      }

      if (note) {
        note.hidden =
          !table.note;

        note.textContent =
          table.note
            ? (
              'Note: ' +
              table.note
            )
            : '';
      }

      var merge =
        table.isMergedView
          ? {
            id: table.mergeId,
            table_ids:
              table.memberIds
          }
          : mergeFor(table.id);

      if (mergeInfo) {
        mergeInfo.hidden =
          !merge;

        mergeInfo.innerHTML =
          merge
            ? (
              'Merged group: ' +
              merge.table_ids
                .map(escapeHtml)
                .join(', ') +

              '<br><button ' +
              'type="button" ' +
              'class="pmd-floor-v1__unmerge-button" ' +
              'data-floor-unmerge="' +
              escapeHtml(merge.id) +
              '">' +
              '↪ Unmerge tables</button>'
            )
            : '';
      }
    }

    function closeDrawer() {
      if (!drawer) return;

      drawer.classList.remove(
        'is-open'
      );

      drawer.setAttribute(
        'aria-hidden',
        'true'
      );

      document.body.style.overflow =
        '';

      state.active = null;
    }

    function selectForMerge(table) {
      if (
        !table ||
        !state.mergeMode
      ) {
        return;
      }

      /*
       * Expand an existing merged card into its real member IDs.
       *
       * Example:
       *   selected card: 4 + 5 + 16
       *   selected table: 17
       *
       * mergeSelection becomes:
       *   [4, 5, 16, 17]
       *
       * This prevents nested parent groups and keeps the backend
       * payload as one flat list of real table IDs.
       */
      var ids =
        table.isMergedView
          ? (
              Array.isArray(
                table.memberIds
              )
                ? table.memberIds
                : []
            )
          : [table.id];

      ids = ids
        .map(String)
        .filter(Boolean);

      if (!ids.length) {
        toast(
          'This merged group has no table members',
          true
        );
        return;
      }

      var allSelected =
        ids.every(function (id) {
          return (
            state.mergeSelection
              .map(String)
              .indexOf(id) !== -1
          );
        });

      if (allSelected) {
        state.mergeSelection =
          state.mergeSelection.filter(
            function (selectedId) {
              return (
                ids.indexOf(
                  String(selectedId)
                ) === -1
              );
            }
          );
      } else {
        ids.forEach(function (id) {
          var exists =
            state.mergeSelection
              .map(String)
              .indexOf(id) !== -1;

          if (!exists) {
            state.mergeSelection.push(id);
          }
        });
      }

      updateMergeButton();
      render();

      var count =
        state.mergeSelection.length;

      if (!count) {
        toast(
          'No tables selected for merge'
        );
        return;
      }

      if (table.isMergedView) {
        toast(
          allSelected
            ? 'Merged group removed from selection'
            : (
                ids.length +
                ' merged tables selected — choose more tables'
              )
        );

        return;
      }

      toast(
        count +
        (
          count === 1
            ? ' table selected — choose another table'
            : ' tables selected — click Merge to confirm'
        )
      );
    }

    function dimensions(table) {
      if (table.isMergedView) {
        return {
          width:
            state.stripMode
              ? STRIP_MERGED_WIDTH
              : MERGED_WIDTH,

          height:
            state.stripMode
              ? STRIP_MERGED_HEIGHT
              : MERGED_HEIGHT
        };
      }

      return {
        width: TABLE_WIDTH,
        height: TABLE_HEIGHT
      };
    }

    function rectFor(table) {
      var size =
        dimensions(table);

      return {
        table: table,

        x: Number(table.x),
        y: Number(table.y),

        width: size.width,
        height: size.height,

        left:
          Number(table.x) -
          size.width / 2,

        right:
          Number(table.x) +
          size.width / 2,

        top:
          Number(table.y) -
          size.height / 2,

        bottom:
          Number(table.y) +
          size.height / 2
      };
    }

    function obstacleRects(
      movingTable
    ) {
      var excluded = {};

      if (
        movingTable.isMergedView
      ) {
        movingTable.memberIds
          .forEach(function (id) {
            excluded[id] = true;
          });
      } else {
        excluded[movingTable.id] =
          true;
      }

      return state.displayTables
        .filter(function (table) {
          if (
            table.isMergedView
          ) {
            return !table.memberIds
              .some(function (id) {
                return !!excluded[id];
              });
          }

          return !excluded[table.id];
        })
        .map(rectFor);
    }

    function overlaps(
      first,
      second,
      gap
    ) {
      var halfGap =
        number(gap, 0) / 2;

      return !(
        first.right + halfGap <=
          second.left - halfGap ||

        first.left - halfGap >=
          second.right + halfGap ||

        first.bottom + halfGap <=
          second.top - halfGap ||

        first.top - halfGap >=
          second.bottom + halfGap
      );
    }

    function candidateRect(
      candidate
    ) {
      return {
        left:
          candidate.x -
          candidate.width / 2,

        right:
          candidate.x +
          candidate.width / 2,

        top:
          candidate.y -
          candidate.height / 2,

        bottom:
          candidate.y +
          candidate.height / 2
      };
    }

    function legalPosition(
      candidate,
      obstacles
    ) {
      var bounds =
        candidateRect(candidate);

      var inside =
        bounds.left >=
          EDGE_PADDING &&

        bounds.top >=
          EDGE_PADDING &&

        bounds.right <=
          FLOOR_WIDTH -
          EDGE_PADDING &&

        bounds.bottom <=
          FLOOR_HEIGHT -
          EDGE_PADDING;

      if (!inside) {
        return false;
      }

      return !obstacles.some(
        function (obstacle) {
          return overlaps(
            bounds,
            obstacle,
            MINIMUM_GAP
          );
        }
      );
    }

    function nearestSnap(
      original,
      candidates
    ) {
      var result = {
        value: original,
        snapped: false,
        distance: Infinity
      };

      candidates.forEach(
        function (candidate) {
          var distance =
            Math.abs(
              candidate - original
            );

          if (
            distance <=
              SNAP_DISTANCE &&
            distance <
              result.distance
          ) {
            result = {
              value: candidate,
              snapped: true,
              distance: distance
            };
          }
        }
      );

      return result;
    }

    function magneticPosition(
      raw,
      size,
      obstacles
    ) {
      var result = {
        x: raw.x,
        y: raw.y,

        width: size.width,
        height: size.height,

        snappedX: false,
        snappedY: false
      };

      if (!obstacles.length) {
        return result;
      }

      /*
       * Only the closest table influences magnetic snapping.
       */
      var closest = null;
      var closestDistance = Infinity;

      obstacles.forEach(
        function (obstacle) {
          var deltaX =
            raw.x - obstacle.x;

          var deltaY =
            raw.y - obstacle.y;

          var distance =
            deltaX * deltaX +
            deltaY * deltaY;

          if (
            distance <
            closestDistance
          ) {
            closest = obstacle;
            closestDistance = distance;
          }
        }
      );

      if (!closest) {
        return result;
      }

      /*
       * Centre alignment only:
       *
       * Same X centre creates a clean vertical column.
       * Same Y centre creates a clean horizontal row.
       */
      if (
        Math.abs(
          raw.x - closest.x
        ) <= SNAP_DISTANCE
      ) {
        result.x = closest.x;
        result.snappedX = true;
      }

      if (
        Math.abs(
          raw.y - closest.y
        ) <= SNAP_DISTANCE
      ) {
        result.y = closest.y;
        result.snappedY = true;
      }

      return result;
    }

    function distanceSquared(
      first,
      second
    ) {
      var x =
        first.x - second.x;

      var y =
        first.y - second.y;

      return x * x + y * y;
    }

    function nearestLegalPosition(
      desired,
      size,
      obstacles
    ) {
      var candidates = [];

      obstacles.forEach(
        function (obstacle) {
          var leftX =
            obstacle.left -
            MINIMUM_GAP -
            size.width / 2;

          var rightX =
            obstacle.right +
            MINIMUM_GAP +
            size.width / 2;

          var aboveY =
            obstacle.top -
            MINIMUM_GAP -
            size.height / 2;

          var belowY =
            obstacle.bottom +
            MINIMUM_GAP +
            size.height / 2;

          candidates.push(
            {
              x: leftX,
              y: obstacle.y
            },

            {
              x: rightX,
              y: obstacle.y
            },

            {
              x: obstacle.x,
              y: aboveY
            },

            {
              x: obstacle.x,
              y: belowY
            },

            {
              x: leftX,
              y: desired.y
            },

            {
              x: rightX,
              y: desired.y
            },

            {
              x: desired.x,
              y: aboveY
            },

            {
              x: desired.x,
              y: belowY
            }
          );
        }
      );

      return candidates
        .map(function (candidate) {
          return {
            x: candidate.x,
            y: candidate.y,

            width: size.width,
            height: size.height
          };
        })
        .filter(function (candidate) {
          return legalPosition(
            candidate,
            obstacles
          );
        })
        .sort(function (
          first,
          second
        ) {
          return (
            distanceSquared(
              first,
              desired
            ) -
            distanceSquared(
              second,
              desired
            )
          );
        })[0] || null;
    }

    function updateMemberPositions(
      drag,
      centerX,
      centerY
    ) {
      var deltaX =
        centerX -
        drag.startCenter.x;

      var deltaY =
        centerY -
        drag.startCenter.y;

      drag.memberStarts
        .forEach(function (item) {
          item.table.x =
            item.x + deltaX;

          item.table.y =
            item.y + deltaY;
        });

      drag.table.x = centerX;
      drag.table.y = centerY;
    }

    function pointerDown(
      event,
      table
    ) {
      if (
        !state.editing ||
        state.stripMode
      ) {
        return;
      }

      event.preventDefault();

      var rect =
        canvas.getBoundingClientRect();

      var memberTables =
        table.isMergedView
          ? table.members
          : [
            state.tables.find(
              function (candidate) {
                return (
                  candidate.id ===
                  table.id
                );
              }
            )
          ].filter(Boolean);

      state.drag = {
        table: table,

        pointerId:
          event.pointerId,

        offsetX:
          (
            event.clientX -
            rect.left
          ) /
            state.zoom -
          table.x,

        offsetY:
          (
            event.clientY -
            rect.top
          ) /
            state.zoom -
          table.y,

        startCenter: {
          x: table.x,
          y: table.y
        },

        memberStarts:
          memberTables.map(
            function (member) {
              return {
                table: member,
                x: member.x,
                y: member.y
              };
            }
          ),

        lastRaw: {
          x: table.x,
          y: table.y
        }
      };

      event.currentTarget
        .setPointerCapture(
          event.pointerId
        );

      event.currentTarget
        .classList.add(
          'is-dragging'
        );
    }

    function pointerMove(event) {
      if (!state.drag) {
        return;
      }

      var rect =
        canvas.getBoundingClientRect();

      var table =
        state.drag.table;

      var size =
        dimensions(table);

      var raw = {
        x: clamp(
          (
            event.clientX -
            rect.left
          ) /
            state.zoom -
          state.drag.offsetX,

          size.width / 2 +
            EDGE_PADDING,

          FLOOR_WIDTH -
            size.width / 2 -
            EDGE_PADDING
        ),

        y: clamp(
          (
            event.clientY -
            rect.top
          ) /
            state.zoom -
          state.drag.offsetY,

          size.height / 2 +
            EDGE_PADDING,

          FLOOR_HEIGHT -
            size.height / 2 -
            EDGE_PADDING
        )
      };

      var obstacles =
        obstacleRects(table);

      /*
       * Magnetic alignment still works while dragging.
       * Overlap is intentionally allowed during movement.
       */
      var candidate =
        magneticPosition(
          raw,
          size,
          obstacles
        );

      state.drag.lastRaw = {
        x: candidate.x,
        y: candidate.y
      };

      updateMemberPositions(
        state.drag,
        candidate.x,
        candidate.y
      );

      var node =
        canvas.querySelector(
          '[data-floor-table="' +
          CSS.escape(table.id) +
          '"]'
        );

      if (node) {
        node.style.left =
          candidate.x + 'px';

        node.style.top =
          candidate.y + 'px';
      }

    }

    function pointerUp(event) {
      if (!state.drag) {
        return;
      }

      var drag =
        state.drag;

      var table =
        drag.table;

      var size =
        dimensions(table);

      var obstacles =
        obstacleRects(table);

      var desired = {
        x: drag.lastRaw.x,
        y: drag.lastRaw.y,

        width: size.width,
        height: size.height
      };

      var resolved =
        legalPosition(
          desired,
          obstacles
        )
          ? desired
          : nearestLegalPosition(
            desired,
            size,
            obstacles
          );

      if (!resolved) {
        resolved = {
          x: drag.startCenter.x,
          y: drag.startCenter.y,

          width: size.width,
          height: size.height
        };
      }

      updateMemberPositions(
        drag,
        resolved.x,
        resolved.y
      );

      var node =
        canvas.querySelector(
          '[data-floor-table="' +
          CSS.escape(table.id) +
          '"]'
        );

      if (node) {
        node.classList.remove(
          'is-dragging'
        );

        node.classList.add(
          'is-settling'
        );

        node.style.left =
          resolved.x + 'px';

        node.style.top =
          resolved.y + 'px';

        setTimeout(function () {
          if (node.isConnected) {
            node.classList.remove(
              'is-settling'
            );
          }
        }, 230);
      }

      state.drag = null;
    }

    function mergedGroupDescriptor(
      memberIds
    ) {
      var wanted = {};

      (memberIds || []).forEach(
        function (id) {
          wanted[String(id)] = true;
        }
      );

      var members =
        state.tables.filter(
          function (table) {
            return (
              wanted[
                String(table.id)
              ] === true
            );
          }
        );

      if (!members.length) {
        return null;
      }

      var centerX =
        members.reduce(
          function (total, table) {
            return total + Number(table.x);
          },
          0
        ) / members.length;

      var centerY =
        members.reduce(
          function (total, table) {
            return total + Number(table.y);
          },
          0
        ) / members.length;

      return {
        members: members,

        memberIds:
          members.map(
            function (table) {
              return table.id;
            }
          ),

        x: centerX,
        y: centerY,

        width: MERGED_WIDTH,
        height: MERGED_HEIGHT
      };
    }

    function mergedGroupObstacles(
      memberIds
    ) {
      var excluded = {};

      (memberIds || []).forEach(
        function (id) {
          excluded[String(id)] = true;
        }
      );

      buildDisplayTables();

      return state.displayTables
        .filter(function (table) {
          if (table.isMergedView) {
            return !table.memberIds.some(
              function (id) {
                return (
                  excluded[String(id)] ===
                  true
                );
              }
            );
          }

          return (
            excluded[
              String(table.id)
            ] !== true
          );
        })
        .map(rectFor);
    }

    function rowScanLegalPosition(
      size,
      obstacles,
      preferred
    ) {
      var candidates = [];

      for (
        var y =
          size.height / 2 +
          EDGE_PADDING;

        y <=
          FLOOR_HEIGHT -
          size.height / 2 -
          EDGE_PADDING;

        y +=
          TABLE_HEIGHT +
          MINIMUM_GAP
      ) {
        for (
          var x =
            size.width / 2 +
            EDGE_PADDING;

          x <=
            FLOOR_WIDTH -
            size.width / 2 -
            EDGE_PADDING;

          x +=
            TABLE_WIDTH +
            MINIMUM_GAP
        ) {
          var candidate = {
            x: x,
            y: y,

            width: size.width,
            height: size.height
          };

          if (
            legalPosition(
              candidate,
              obstacles
            )
          ) {
            candidates.push(
              candidate
            );
          }
        }
      }

      candidates.sort(
        function (first, second) {
          return (
            distanceSquared(
              first,
              preferred
            ) -
            distanceSquared(
              second,
              preferred
            )
          );
        }
      );

      return candidates[0] || null;
    }

    function placeMergedGroupSafely(
      memberIds
    ) {
      var group =
        mergedGroupDescriptor(
          memberIds
        );

      if (!group) {
        return false;
      }

      var obstacles =
        mergedGroupObstacles(
          group.memberIds
        );

      var desired = {
        x: group.x,
        y: group.y,

        width: MERGED_WIDTH,
        height: MERGED_HEIGHT
      };

      var resolved = desired;

      if (
        !legalPosition(
          desired,
          obstacles
        )
      ) {
        resolved =
          nearestLegalPosition(
            desired,
            {
              width: MERGED_WIDTH,
              height: MERGED_HEIGHT
            },
            obstacles
          ) ||
          rowScanLegalPosition(
            {
              width: MERGED_WIDTH,
              height: MERGED_HEIGHT
            },
            obstacles,
            desired
          );
      }

      if (!resolved) {
        return false;
      }

      var deltaX =
        resolved.x - group.x;

      var deltaY =
        resolved.y - group.y;

      if (
        Math.abs(deltaX) < .5 &&
        Math.abs(deltaY) < .5
      ) {
        return false;
      }

      group.members.forEach(
        function (table) {
          table.x += deltaX;
          table.y += deltaY;
        }
      );

      return true;
    }

    function repairAllMergedGroups() {
      var merges =
        state.operational.merges || {};

      var changed = false;

      Object.keys(merges).forEach(
        function (mergeId) {
          var merge =
            merges[mergeId] || {};

          var memberIds =
            Array.isArray(
              merge.table_ids
            )
              ? merge.table_ids
              : [];

          if (
            memberIds.length >= 2 &&
            placeMergedGroupSafely(
              memberIds
            )
          ) {
            changed = true;
          }
        }
      );

      if (changed) {
        render();

        return persistLayoutSilently();
      }

      return Promise.resolve();
    }

    function layoutPayload() {
      return state.tables.map(
        function (table) {
          return {
            id: table.id,
            table_id: table.id,

            floor_x:
              Math.round(table.x),

            floor_y:
              Math.round(table.y),

            floor_width:
              TABLE_WIDTH,

            floor_height:
              TABLE_HEIGHT
          };
        }
      );
    }

    function persistLayoutSilently() {
      var tables =
        layoutPayload();

      return fetchJson(
        layoutUrl,
        {
          method: 'POST',

          body:
            JSON.stringify({
              tables: tables
            })
        }
      ).then(function (payload) {
        if (
          payload &&
          payload.updated != null &&
          Number(payload.updated) < 1 &&
          tables.length
        ) {
          throw new Error(
            'Silent layout persistence updated 0 tables'
          );
        }

        /*
         * This is especially important after automatic
         * merged-group collision repair.
         */
        syncPayloadCoordinatesFromTables();

        return payload;
      });
    }

    function repairUnmergedMembers(
      memberIds
    ) {
      var wanted = {};

      (memberIds || [])
        .forEach(function (id) {
          wanted[String(id)] = true;
        });

      var targets =
        state.tables
          .filter(function (table) {
            return (
              wanted[
                String(table.id)
              ] === true
            );
          })
          .sort(function (
            first,
            second
          ) {
            return (
              Number(first.number) -
              Number(second.number)
            );
          });

      if (!targets.length) {
        return false;
      }

      /*
       * Collision repair must use normal saved Floor geometry,
       * even when the user is currently viewing Strip mode.
       */
      var stripWasActive =
        state.stripMode;

      state.stripMode = false;
      buildDisplayTables();

      var changed = false;

      targets.forEach(
        function (table) {
          /*
           * Rebuild current visible obstacles after each move.
           * Existing merged groups remain one obstacle card.
           */
          buildDisplayTables();

          var obstacles =
            state.displayTables
              .filter(function (display) {
                if (
                  display.isMergedView
                ) {
                  return (
                    display.memberIds
                      .indexOf(
                        table.id
                      ) === -1
                  );
                }

                return (
                  display.id !==
                  table.id
                );
              })
              .map(rectFor);

          var size = {
            width: TABLE_WIDTH,
            height: TABLE_HEIGHT
          };

          var desired = {
            x: table.x,
            y: table.y,

            width: size.width,
            height: size.height
          };

          if (
            !legalPosition(
              desired,
              obstacles
            )
          ) {
            var resolved =
              nearestLegalPosition(
                desired,
                size,
                obstacles
              );

            if (!resolved) {
              /*
               * Deterministic row scan fallback.
               */
              var found = null;

              for (
                var y =
                  TABLE_HEIGHT / 2 +
                  EDGE_PADDING;

                y <=
                  FLOOR_HEIGHT -
                  TABLE_HEIGHT / 2 -
                  EDGE_PADDING &&
                !found;

                y +=
                  TABLE_HEIGHT +
                  MINIMUM_GAP
              ) {
                for (
                  var x =
                    TABLE_WIDTH / 2 +
                    EDGE_PADDING;

                  x <=
                    FLOOR_WIDTH -
                    TABLE_WIDTH / 2 -
                    EDGE_PADDING;

                  x +=
                    TABLE_WIDTH +
                    MINIMUM_GAP
                ) {
                  var candidate = {
                    x: x,
                    y: y,

                    width:
                      TABLE_WIDTH,

                    height:
                      TABLE_HEIGHT
                  };

                  if (
                    legalPosition(
                      candidate,
                      obstacles
                    )
                  ) {
                    found = candidate;
                    break;
                  }
                }
              }

              resolved = found;
            }

            if (resolved) {
              table.x = resolved.x;
              table.y = resolved.y;

              changed = true;
            }
          }
        }
      );

      state.stripMode =
        stripWasActive;

      render();

      return changed;
    }

    function ensureOfficialTablerKit() {
      var id =
        'pmd-official-tabler-icons';

      if (
        document.getElementById(id)
      ) {
        return;
      }

      var link =
        document.createElement('link');

      link.id = id;
      link.rel = 'stylesheet';

      link.href =
        '/app/admin/assets/vendor/' +
        'tabler-icons/' +
        'tabler-icons.min.css' +
        '?v=3.44.0';

      document.head.appendChild(link);
    }

    /* PMD_FLUENT_BADGE_ICONS_V284_START */
    var fluentBadgeIcons = {
      "wash": "<svg class=\"pmd-tabler-icon pmd-fluent-badge-icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M18.2 2.18a.5.5 0 0 1 .7.7L13.6 8.22a4.5 4.5 0 0 1-.34 6l-.66.66-2.1 3.48a.5.5 0 0 1-.77.1l-5.1-5.1c.04-.07.08-.14.1-.22l.02-.02.24-.76.02-.04 4.97 4.98 1.6-2.66-4.7-4.7-.06-.1-.05-.08-.06-.08a1.3 1.3 0 0 0-.57-.4l-.05-.01h-.02l-.7-.24.86-.52.67-.66a4.5 4.5 0 0 1 5.99-.34l5.32-5.32Zm-5.66 6.37a3.5 3.5 0 0 0-4.94 0l-.36.35 4.95 4.95.35-.35a3.5 3.5 0 0 0 0-4.95ZM3.48 8a.3.3 0 0 1 .29.2l.25.77a1.58 1.58 0 0 0 1 1l.18.05.28.1.3.1h.02a.3.3 0 0 1 .2.28.3.3 0 0 1-.2.29l-.77.25a1.58 1.58 0 0 0-1 1l-.24.76a.3.3 0 0 1-.58 0l-.24-.77a1.58 1.58 0 0 0-1-1l-.77-.25a.3.3 0 0 1-.2-.28.3.3 0 0 1 .2-.29l.77-.25a1.58 1.58 0 0 0 .98-1l.25-.76a.3.3 0 0 1 .28-.2Zm2-8a.42.42 0 0 1 .4.28l.35 1.07a2.2 2.2 0 0 0 1.4 1.4l1.07.35h.02a.42.42 0 0 1 0 .8l-1.07.35a2.2 2.2 0 0 0-1.4 1.4L5.9 6.72a.42.42 0 0 1-.64.2l-.02-.01a.43.43 0 0 1-.14-.2l-.35-1.06a2.2 2.2 0 0 0-1.4-1.4L2.28 3.9a.42.42 0 0 1 0-.8l1.07-.35a2.21 2.21 0 0 0 1.38-1.4L5.08.28a.42.42 0 0 1 .4-.28Z\"/></svg>",
      "bell-ringing": "<svg class=\"pmd-tabler-icon pmd-fluent-badge-icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1.8 2.1a.5.5 0 1 0-.6.8l2 1.5a.5.5 0 1 0 .6-.8l-2-1.5ZM1 7a.5.5 0 0 0 0 1h1.5a.5.5 0 0 0 0-1H1Zm9-5a5.92 5.92 0 0 1 5.98 5.35l.02.23V11.4l.92 2.22a1 1 0 0 1 .06.17l.01.08.01.13a1 1 0 0 1-.75.97l-.11.02L16 15h-3.5v.16a2.5 2.5 0 0 1-5 0V15H4a1 1 0 0 1-.26-.03l-.13-.04a1 1 0 0 1-.6-1.05l.02-.13.05-.13L4 11.4V7.57A5.9 5.9 0 0 1 10 2Zm1.5 13h-3v.14a1.5 1.5 0 0 0 1.36 1.35l.14.01c.78 0 1.42-.6 1.5-1.36V15ZM10 3a4.9 4.9 0 0 0-4.98 4.38L5 7.6V11.5l-.04.2L4 14h12l-.96-2.3-.04-.2V7.61A4.9 4.9 0 0 0 10 3Zm8.9-.8a.5.5 0 0 0-.7-.1l-2 1.5a.5.5 0 0 0 .6.8l2-1.5a.5.5 0 0 0 .1-.7Zm.6 5.3A.5.5 0 0 0 19 7h-1.5a.5.5 0 0 0 0 1H19a.5.5 0 0 0 .5-.5Z\"/></svg>",
      "message-2": "<svg class=\"pmd-tabler-icon pmd-fluent-badge-icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M14.5 3A2.5 2.5 0 0 1 17 5.5V10h-1V7H4v7.5c0 .83.67 1.5 1.5 1.5H9v1H5.5A2.5 2.5 0 0 1 3 14.5v-9A2.5 2.5 0 0 1 5.5 3h9Zm0 1h-9C4.67 4 4 4.67 4 5.5V6h12v-.5c0-.83-.67-1.5-1.5-1.5ZM10 12.5c0-.83.67-1.5 1.5-1.5h6c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5v-5Zm7 4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0 0 1h4a.5.5 0 0 0 .5-.5ZM12.5 13a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4Z\"/></svg>",
      "arrows-join-2": "<svg class=\"pmd-tabler-icon pmd-fluent-badge-icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M3 5.5c0-.28.22-.5.5-.5h1.65c1 0 1.95.43 2.62 1.17l2.2 2.5a2.5 2.5 0 0 0 1.88.83h4.44l-3.64-3.65a.5.5 0 0 1 .7-.7l4.5 4.5c.2.2.2.5 0 .7l-4.5 4.5a.5.5 0 0 1-.7-.7l3.64-3.65h-4.44c-.72 0-1.4.3-1.87.84l-2.21 2.49A3.5 3.5 0 0 1 5.15 15H3.5a.5.5 0 0 1 0-1h1.65c.72 0 1.4-.3 1.87-.84l2.21-2.49c.24-.26.51-.49.81-.67a3.5 3.5 0 0 1-.8-.67l-2.22-2.5A2.5 2.5 0 0 0 5.15 6H3.5a.5.5 0 0 1-.5-.5Z\"/></svg>"
    };
    /* PMD_FLUENT_BADGE_ICONS_V284_END */
    function tablerIcon(
      name,
      size
    ) {
      ensureOfficialTablerKit();

      var aliases = {
        info:
          'info-circle',

        edit:
          'edit',

        check:
          'circle-check',

        cleaning:
          'wash',

        reserved:
          'calendar-clock',

        bell:
          'bell-ringing',

        note:
          'message-2',

        plus:
          'plus',

        merge:
          'arrows-join-2',

        unmerge:
          'arrows-split',

        zoomOut:
          'zoom-out',

        zoomIn:
          'zoom-in',

        fit:
          'focus-centered',

        rows:
          'layout-rows',

        layout:
          'layout-grid',

        fullscreen:
          'maximize',

        refresh:
          'refresh',

        external:
          'door-enter'
      };

      var iconName =
        aliases[name] || name;

      /*
       * Only these four table Badge icons use Microsoft
       * Fluent SVGs. All other Floor icons remain Tabler.
       */
      if (
        fluentBadgeIcons[iconName]
      ) {
        return (
          fluentBadgeIcons[
            iconName
          ]
        );
      }

      return (
        '<i ' +
        'class="' +
        'ti ti-' +
        escapeHtml(iconName) +
        ' pmd-tabler-icon" ' +

        'style="' +
        '--pmd-icon-size:' +
        Number(size || 18) +
        'px" ' +

        'aria-hidden="true">' +
        '</i>'
      );
    }

    function buttonContent(
      icon,
      label
    ) {
      return (
        tablerIcon(icon, 17) +
        (
          label
            ? (
              '<span class="' +
              'pmd-floor-button-label">' +
              escapeHtml(label) +
              '</span>'
            )
            : ''
        )
      );
    }

    function refreshFloorIcons() {
      var motherIcons = {
        available: ['check', 'Available'],
        cleaning: ['cleaning', 'Cleaning'],
        reserved: ['reserved', 'Reserved'],
        'waiter-call': ['bell', 'Waiter call'],
        note: ['note', 'Note'],
        order: ['external', 'Open table'],
        unmerge: ['unmerge', 'Unmerge']
      };

      root
        .querySelectorAll(
          '[data-floor-mother-action]'
        )
        .forEach(function (button) {
          var action =
            button.getAttribute(
              'data-floor-mother-action'
            );

          var config =
            motherIcons[action];

          if (config) {
            button.innerHTML =
              buttonContent(
                config[0],
                config[1]
              );
          }
        });

      var simpleControls = [
        ['[data-floor-edit]', 'edit', 'Edit'],
        ['[data-floor-save]', 'check', 'Save'],
        ['[data-floor-zoom-out]', 'zoomOut', ''],
        ['[data-floor-fit]', 'fit', ''],
        ['[data-floor-zoom-in]', 'zoomIn', ''],
        ['[data-floor-fullscreen]', 'fullscreen', ''],
        ['[data-floor-refresh]', 'refresh', ''],
        ['[data-floor-guide]', 'info', '']
      ];

      simpleControls.forEach(
        function (config) {
          var button =
            root.querySelector(
              config[0]
            );

          if (button) {
            button.innerHTML =
              buttonContent(
                config[1],
                config[2]
              );
          }
        }
      );

      var stripButton =
        root.querySelector(
          '[data-floor-strip]'
        );

      if (stripButton) {
        stripButton.innerHTML =
          buttonContent(
            state.stripMode
              ? 'layout'
              : 'rows',

            state.stripMode
              ? 'Floor'
              : 'One row'
          );
      }

      var mergeButton =
        root.querySelector(
          '[data-floor-merge]'
        );

      if (mergeButton) {
        var count =
          state.mergeSelection.length;

        var label =
          state.mergeMode
            ? (
              count >= 2
                ? (
                  'Merge ' +
                  count +
                  ' tables'
                )
                : 'Cancel merge'
            )
            : 'Merge';

        mergeButton.innerHTML =
          buttonContent(
            state.mergeMode
              ? 'check'
              : 'merge',

            label
          );
      }

      canvas
        .querySelectorAll(
          '.pmd-floor-v1__badge'
        )
        .forEach(function (badge) {
          if (
            badge.classList.contains(
              'is-merge'
            )
          ) {
            badge.innerHTML =
              tablerIcon('merge', 13);
          } else if (
            badge.classList.contains(
              'is-call'
            )
          ) {
            badge.innerHTML =
              tablerIcon('bell', 13);
          } else if (
            badge.classList.contains(
              'is-note'
            )
          ) {
            badge.innerHTML =
              tablerIcon('note', 13);
          } else if (
            badge.classList.contains(
              'is-clean'
            )
          ) {
            badge.innerHTML =
              tablerIcon(
                'cleaning',
                13
              );
          }
        });
    }

    function selectedDisplayTable() {
      if (!state.selectedDisplayId) {
        return null;
      }

      return state.displayTables.find(
        function (table) {
          return (
            String(table.id) ===
            String(
              state.selectedDisplayId
            )
          );
        }
      ) || null;
    }

    function selectedTargetIds() {
      var table =
        selectedDisplayTable();

      if (!table) {
        return [];
      }

      return table.isMergedView
        ? table.memberIds.slice()
        : [table.id];
    }

    function selectedIsMerged() {
      var table =
        selectedDisplayTable();

      return Boolean(
        table &&
        table.isMergedView
      );
    }

    function normalizeAreaName(value) {
      var result =
        clean(value || '');

      return result || 'Main Floor';
    }

    function tableAreaName(table) {
      if (!table) {
        return 'Main Floor';
      }

      var candidates = [
        table.areaName,
        table.area_name,
        table.area,
        table.sectionName,
        table.section_name,
        table.section,
        table.locationName,
        table.location_name,
        table.zoneName,
        table.zone_name,
        table.floorName,
        table.floor_name
      ];

      for (
        var index = 0;
        index < candidates.length;
        index += 1
      ) {
        var candidate =
          candidates[index];

        if (
          candidate &&
          typeof candidate === 'object'
        ) {
          candidate =
            candidate.name ||
            candidate.title ||
            candidate.label;
        }

        candidate =
          clean(candidate || '');

        if (candidate) {
          return candidate;
        }
      }

      return 'Main Floor';
    }

    function tableById(id) {
      return state.tables.find(
        function (table) {
          return (
            String(table.id) ===
            String(id)
          );
        }
      ) || null;
    }

    function availableAreas() {
      var counters = {};

      state.tables.forEach(
        function (table) {
          var area =
            tableAreaName(table);

          counters[area] =
            (counters[area] || 0) + 1;
        }
      );

      return Object.keys(counters)
        .sort(function (first, second) {
          return first.localeCompare(
            second,
            undefined,
            {
              numeric: true,
              sensitivity: 'base'
            }
          );
        })
        .map(function (name) {
          return {
            name: name,
            count: counters[name]
          };
        });
    }

    function selectedAreaStillExists(
      areas
    ) {
      if (
        state.selectedArea === 'all'
      ) {
        return true;
      }

      return areas.some(
        function (area) {
          return (
            area.name ===
            state.selectedArea
          );
        }
      );
    }

    function renderAreaTabs() {
      var group =
        root.querySelector(
          '.pmd-floor-v1__filters'
        );

      if (!group) {
        return;
      }

      var areas =
        availableAreas();

      if (
        !selectedAreaStillExists(
          areas
        )
      ) {
        state.selectedArea = 'all';
      }

      group.setAttribute(
        'aria-label',
        'Select restaurant area'
      );

      group.classList.add(
        'is-area-selector'
      );

      var html = '';

      if (areas.length > 1) {
        html +=
          '<button type="button" ' +
          'data-floor-area="all" ' +
          (
            state.selectedArea === 'all'
              ? 'class="is-active" '
              : ''
          ) +
          '>' +
          tablerIcon('layout', 16) +
          '<span>All areas</span>' +
          '<b>' +
          state.tables.length +
          '</b>' +
          '</button>';
      }

      areas.forEach(
        function (area) {
          html +=
            '<button type="button" ' +
            'data-floor-area="' +
            escapeHtml(area.name) +
            '" ' +
            (
              (
                state.selectedArea ===
                  area.name
              ) ||
              (
                areas.length === 1 &&
                state.selectedArea ===
                  'all'
              )
                ? 'class="is-active" '
                : ''
            ) +
            '>' +
            tablerIcon(
              area.name
                .toLowerCase()
                .indexOf('outdoor') !== -1
                ? 'sun'
                : (
                  area.name
                    .toLowerCase()
                    .indexOf('indoor') !== -1
                    ? 'building'
                    : 'layout'
                ),
              16
            ) +
            '<span>' +
            escapeHtml(area.name) +
            '</span>' +
            '<b>' +
            area.count +
            '</b>' +
            '</button>';
        }
      );

      group.innerHTML = html;
    }

    function cardMemberIds(node) {
      var members =
        clean(
          node.getAttribute(
            'data-floor-members'
          ) || ''
        )
          .split(',')
          .map(clean)
          .filter(Boolean);

      if (members.length) {
        return members;
      }

      var id =
        clean(
          node.getAttribute(
            'data-floor-table'
          )
        );

      return id
        ? [id]
        : [];
    }

    function cardMatchesArea(node) {
      if (
        state.selectedArea === 'all'
      ) {
        return true;
      }

      return cardMemberIds(node)
        .some(function (id) {
          return (
            tableAreaName(
              tableById(id)
            ) ===
            state.selectedArea
          );
        });
    }

    function applyAreaFilter() {
      if (!canvas) {
        return;
      }

      canvas
        .querySelectorAll(
          '[data-floor-table]'
        )
        .forEach(function (node) {
          var visible =
            cardMatchesArea(node);

          node.classList.toggle(
            'is-area-hidden',
            !visible
          );

          node.setAttribute(
            'aria-hidden',
            visible
              ? 'false'
              : 'true'
          );
        });
    }

    function numericTableValue(node) {
      var text =
        clean(
          node.querySelector(
            '.pmd-floor-v1__table-number'
          )?.textContent || ''
        );

      var match =
        text.match(/\d+/);

      return match
        ? Number(match[0])
        : Number.MAX_SAFE_INTEGER;
    }

    function visibleFloorCards() {
      return Array.from(
        canvas.querySelectorAll(
          '[data-floor-table]'
        )
      ).filter(function (node) {
        return (
          !node.classList.contains(
            'is-area-hidden'
          ) &&
          getComputedStyle(node)
            .display !== 'none'
        );
      });
    }

    function calibrateOneRow() {
      if (
        !canvas ||
        !state.stripMode
      ) {
        root.classList.remove(
          'is-strip-calibrated'
        );

        return;
      }

      var scroll =
        root.querySelector(
          '[data-floor-scroll]'
        );

      var cards =
        visibleFloorCards()
          .sort(function (first, second) {
            return (
              numericTableValue(first) -
              numericTableValue(second)
            );
          });

      var left = 24;
      var top = 22;
      var gap = 18;
      var maximumHeight = 0;

      cards.forEach(
        function (node) {
          var rect =
            node.getBoundingClientRect();

          var width =
            Math.round(
              rect.width ||
              (
                node.classList.contains(
                  'is-merged-card'
                )
                  ? 132
                  : 108
              )
            );

          var height =
            Math.round(
              rect.height ||
              (
                node.classList.contains(
                  'is-merged-card'
                )
                  ? 104
                  : 88
              )
            );

          node.style.left =
            left + 'px';

          node.style.top =
            top + 'px';

          node.style.margin = '0';

          left += width + gap;

          maximumHeight =
            Math.max(
              maximumHeight,
              height
            );
        }
      );

      var viewportWidth =
        scroll
          ? scroll.clientWidth
          : 0;

      var requiredWidth =
        Math.max(
          viewportWidth,
          left + 24
        );

      var requiredHeight =
        Math.max(
          146,
          top +
          maximumHeight +
          22
        );

      canvas.style.width =
        requiredWidth + 'px';

      canvas.style.minWidth =
        requiredWidth + 'px';

      canvas.style.height =
        requiredHeight + 'px';

      canvas.style.minHeight =
        requiredHeight + 'px';

      if (scroll) {
        scroll.style.height =
          requiredHeight + 'px';

        scroll.style.minHeight =
          requiredHeight + 'px';

        scroll.style.maxHeight =
          requiredHeight + 'px';

        scroll.style.overflowX =
          'auto';

        scroll.style.overflowY =
          'hidden';
      }

      root.classList.add(
        'is-strip-calibrated'
      );
    }

    function refreshAreaAndStripLayout() {
      renderAreaTabs();
      applyAreaFilter();

      window.requestAnimationFrame(
        function () {
          calibrateOneRow();
        }
      );
    }

    function ensureSecondaryToolbar() {
      var existing =
        root.querySelector(
          '[data-floor-secondary-toolbar]'
        );

      if (existing) {
        return existing;
      }

      var search =
        root.querySelector(
          '.pmd-floor-v1__search'
        ) ||
        root.querySelector(
          '[data-floor-search]'
        );

      var searchWrapper =
        search &&
        search.matches(
          '.pmd-floor-v1__search'
        )
          ? search
          : (
            search
              ? search.closest('label')
              : null
          );

      var targetParent =
        searchWrapper
          ? searchWrapper.parentElement
          : root.querySelector(
            '.pmd-floor-v1__filters'
          );

      if (!targetParent) {
        return null;
      }

      var secondary =
        document.createElement('div');

      secondary.className =
        'pmd-floor-v1__secondary-toolbar';

      secondary.setAttribute(
        'data-floor-secondary-toolbar',
        ''
      );

      if (searchWrapper) {
        searchWrapper.replaceWith(
          secondary
        );
      } else {
        targetParent.appendChild(
          secondary
        );
      }

      return secondary;
    }

    function organizeFloorControls() {
      var secondary =
        ensureSecondaryToolbar();

      if (!secondary) {
        return;
      }

      var selectors = [
        '[data-floor-mother-action="available"]',
        '[data-floor-mother-action="cleaning"]',
        '[data-floor-edit]',
        '[data-floor-save]',
        '[data-floor-zoom-out]',
        '[data-floor-fit]',
        '[data-floor-zoom-in]',
        '[data-floor-strip]'
      ];

      selectors.forEach(
        function (selector) {
          var button =
            root.querySelector(
              selector
            );

          if (
            button &&
            button.parentElement !==
              secondary
          ) {
            secondary.appendChild(
              button
            );
          }
        }
      );

      var guide =
        root.querySelector(
          '[data-floor-guide]'
        );

      var scroll =
        root.querySelector(
          '[data-floor-scroll]'
        );

      if (
        guide &&
        scroll &&
        guide.parentElement !== scroll
      ) {
        scroll.appendChild(guide);
      }

      refreshFloorIcons();
    }

    function ensureMotherToolbar() {
      var existing =
        root.querySelector(
          '[data-floor-mother-toolbar]'
        );

      if (existing) {
        return existing;
      }

      var toolbar =
        root.querySelector(
          '.pmd-floor-v1__toolbar'
        );

      if (!toolbar) {
        return null;
      }

      var actions =
        document.createElement('div');

      actions.className =
        'pmd-floor-v1__mother-actions';

      actions.setAttribute(
        'data-floor-mother-toolbar',
        ''
      );

      actions.innerHTML =
        '<button type="button" ' +
        'data-floor-mother-action="available" ' +
        'title="Mark selected table available">' +
        '✓ Available</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="cleaning" ' +
        'title="Mark selected table for cleaning">' +
        '✦ Cleaning</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="reserved" ' +
        'title="Mark selected table reserved">' +
        '◷ Reserved</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="waiter-call" ' +
        'title="Add waiter call">' +
        '♟ Waiter call</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="note" ' +
        'title="Add a note">' +
        '✎ Note</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="order" ' +
        'title="Open selected table">' +
        '＋ Open table</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="unmerge" ' +
        'class="is-danger" ' +
        'title="Unmerge selected group">' +
        '↪ Unmerge</button>';

      var mergeButton =
        toolbar.querySelector(
          '[data-floor-merge]'
        );

      if (mergeButton) {
        toolbar.insertBefore(
          actions,
          mergeButton
        );
      } else {
        toolbar.appendChild(actions);
      }

      return actions;
    }

    function ensureContextCounters() {
      var existing =
        root.querySelector(
          '[data-floor-context-counters]'
        );

      if (existing) {
        return existing;
      }

      var header =
        root.querySelector(
          '.pmd-floor-v1__header'
        );

      if (!header) {
        return null;
      }

      var counters =
        document.createElement('div');

      counters.className =
        'pmd-floor-v1__context-counters';

      counters.setAttribute(
        'data-floor-context-counters',
        ''
      );

      header.appendChild(counters);

      return counters;
    }

    function renderContextCounters() {
      var container =
        ensureContextCounters();

      if (!container) {
        return;
      }

      var counters =
        Array.isArray(state.counters)
          ? state.counters
          : [];

      container.innerHTML =
        counters.map(
          function (counter) {
            return (
              '<div class="' +
              'pmd-floor-v1__context-counter">' +

              '<span>' +
              escapeHtml(
                counter.label || ''
              ) +
              '</span>' +

              '<strong>' +
              escapeHtml(
                counter.value == null
                  ? '0'
                  : counter.value
              ) +
              '</strong>' +

              '</div>'
            );
          }
        ).join('');

      container.hidden =
        counters.length === 0;
    }

    function updateMotherToolbar() {
      var toolbar =
        ensureMotherToolbar();

      if (!toolbar) {
        return;
      }

      var selected =
        selectedDisplayTable();

      var capabilityMap = {
        available:
          'available',

        cleaning:
          'cleaning',

        reserved:
          'reserved',

        'waiter-call':
          'waiterCall',

        note:
          'note',

        order:
          'openTable',

        unmerge:
          'unmerge'
      };

      toolbar
        .querySelectorAll(
          '[data-floor-mother-action]'
        )
        .forEach(function (button) {
          var action =
            button.getAttribute(
              'data-floor-mother-action'
            );

          var capability =
            capabilityMap[action];

          var permitted =
            state.capabilities[
              capability
            ] !== false;

          if (
            action === 'unmerge'
          ) {
            permitted =
              permitted &&
              selectedIsMerged();
          }

          button.hidden =
            !permitted;

          button.disabled =
            !selected;
        });

      root.classList.toggle(
        'has-floor-selection',
        Boolean(selected)
      );

      root.setAttribute(
        'data-floor-context',
        state.context
      );
    }

    function clearFloorSelection() {
      state.selectedDisplayId = null;

      render();
      updateMotherToolbar();
    }

    function selectOperationalTable(
      table
    ) {
      var current =
        String(
          state.selectedDisplayId || ''
        );

      var next =
        String(table.id);

      state.selectedDisplayId =
        current === next
          ? null
          : table.id;

      render();
      updateMotherToolbar();
    }

    function optimisticTableUpdate(
      targets,
      action,
      noteValue
    ) {
      var wanted = {};

      (targets || []).forEach(
        function (id) {
          wanted[String(id)] = true;
        }
      );

      if (
        !state.operational.tables ||
        typeof state.operational.tables !==
          'object'
      ) {
        state.operational.tables = {};
      }

      state.tables.forEach(
        function (table) {
          if (
            wanted[
              String(table.id)
            ] !== true
          ) {
            return;
          }

          var stored =
            state.operational.tables[
              table.id
            ] || {};

          if (action === 'available') {
            table.status = 'available';
            table.waiterCall = false;
            table.cleaning = false;

            stored.status =
              'available';
          }

          if (action === 'cleaning') {
            table.status = 'cleaning';
            table.cleaning = true;
            table.waiterCall = false;

            stored.status =
              'cleaning';
          }

          if (action === 'reserved') {
            table.status = 'reserved';
            table.cleaning = false;
            table.waiterCall = false;

            stored.status =
              'reserved';
          }

          if (
            action === 'waiter-call'
          ) {
            table.status = 'attention';
            table.waiterCall = true;

            stored.status =
              'waiter-call';
          }

          if (action === 'note') {
            table.note =
              clean(noteValue);

            stored.note =
              clean(noteValue);

            if (table.note) {
              table.status =
                'attention';
            }
          }

          state.operational.tables[
            table.id
          ] = stored;
        }
      );

      render();
    }

    function applyActionToTargets(
      action,
      targets,
      noteValue
    ) {
      if (!targets.length) {
        toast(
          'Select a table first',
          true
        );

        return Promise.resolve();
      }

      /*
       * Update the Floor immediately. The API request then
       * confirms and persists the same state.
       */
      optimisticTableUpdate(
        targets,
        action,
        noteValue
      );

      return Promise.all(
        targets.map(
          function (id) {
            return saveOperational(
              action === 'note'
                ? 'note'
                : 'table-state',

              action === 'note'
                ? {
                  table_id: id,
                  note: noteValue
                }
                : {
                  table_id: id,
                  status: action,
                  note: ''
                }
            );
          }
        )
      );
    }

    function runMotherAction(action) {
      var table =
        selectedDisplayTable();

      if (!table) {
        toast(
          'Select a table first',
          true
        );

        return;
      }

      var targets =
        selectedTargetIds();

      if (action === 'order') {
        var primary =
          targets[0];

        location.href =
          orderTemplate.replace(
            '{table}',
            encodeURIComponent(primary)
          );

        return;
      }

      if (action === 'note') {
        var noteValue =
          window.prompt(
            'Add a note for ' +
            table.name,

            table.note || ''
          );

        if (noteValue === null) {
          return;
        }

        applyActionToTargets(
          'note',
          targets,
          noteValue
        ).then(function () {
          toast('Note saved');
          clearFloorSelection();
        });

        return;
      }

      if (action === 'unmerge') {
        if (!table.isMergedView) {
          toast(
            'Selected table is not merged',
            true
          );

          return;
        }

        var memberIds =
          table.memberIds.slice();

        state.transitionReason =
          'unmerge';

        saveOperational(
          'unmerge',
          {
            merge_id:
              table.mergeId
          }
        )
          .then(function () {
            var repaired =
              repairUnmergedMembers(
                memberIds
              );

            return repaired
              ? persistLayoutSilently()
              : Promise.resolve();
          })
          .then(function () {
            state.selectedDisplayId =
              null;

            render();
            updateMotherToolbar();

            toast(
              'Tables unmerged safely'
            );
          })
          .catch(function (error) {
            toast(
              error.message,
              true
            );
          });

        return;
      }

      applyActionToTargets(
        action,
        targets
      )
        .then(function () {
          toast(
            'Table status updated'
          );

          state.selectedDisplayId =
            null;

          render();
          updateMotherToolbar();
        })
        .catch(function (error) {
          toast(
            error.message,
            true
          );
        });
    }

    function setContext(
      context,
      options
    ) {
      var config =
        options || {};

      state.context =
        context || 'operations';

      if (
        config.capabilities &&
        typeof config.capabilities ===
          'object'
      ) {
        state.capabilities =
          Object.assign(
            {},
            state.capabilities,
            config.capabilities
          );
      }

      if (
        Array.isArray(
          config.counters
        )
      ) {
        state.counters =
          config.counters.slice();
      }

      renderContextCounters();
      updateMotherToolbar();

      window.dispatchEvent(
        new CustomEvent(
          'pmd:floor:context',
          {
            detail: {
              context:
                state.context,

              capabilities:
                Object.assign(
                  {},
                  state.capabilities
                ),

              counters:
                state.counters.slice()
            }
          }
        )
      );
    }

    root.addEventListener(
      'click',
      function (event) {
        var tableNode =
          event.target.closest(
            '[data-floor-table]'
          );

        if (
          tableNode &&
          (
            !state.editing ||
            state.mergeMode
          )
        ) {
          var table =
            displayTableById(
              tableNode.getAttribute(
                'data-floor-table'
              )
            );

          if (!table) return;

          if (state.mergeMode) {
            selectForMerge(table);
          } else {
            /*
             * Mother Floor behavior:
             * clicking a table selects it. Actions live in
             * the top toolbar; no action drawer is opened.
             */
            selectOperationalTable(
              table
            );
          }

          return;
        }

        var motherAction =
          event.target.closest(
            '[data-floor-mother-action]'
          );

        if (motherAction) {
          runMotherAction(
            motherAction.getAttribute(
              'data-floor-mother-action'
            )
          );

          return;
        }

        var areaButton =
          event.target.closest(
            '[data-floor-area]'
          );

        if (areaButton) {
          state.selectedArea =
            areaButton.getAttribute(
              'data-floor-area'
            ) || 'all';

          renderAreaTabs();
          applyAreaFilter();

          window.requestAnimationFrame(
            function () {
              calibrateOneRow();
            }
          );

          return;
        }

        var filter =
          event.target.closest(
            '[data-floor-filter]'
          );

        if (filter) {
          state.filter =
            filter.getAttribute(
              'data-floor-filter'
            );

          root
            .querySelectorAll(
              '[data-floor-filter]'
            )
            .forEach(
              function (button) {
                button.classList.toggle(
                  'is-active',
                  button === filter
                );
              }
            );

          render();
          return;
        }

        if (
          event.target.closest(
            '[data-floor-refresh]'
          )
        ) {
          load();
        }

        if (
          event.target.closest(
            '[data-floor-edit]'
          )
        ) {
          setEditing(true);
        }

        if (
          event.target.closest(
            '[data-floor-save]'
          )
        ) {
          saveLayout();
        }

        if (
          event.target.closest(
            '[data-floor-merge]'
          )
        ) {
          if (!state.mergeMode) {
            setMergeMode(true);
          } else if (
            state.mergeSelection.length >= 2
          ) {
            commitMerge();
          } else {
            cancelMergeMode();
          }

          return;
        }

        if (
          event.target.closest(
            '[data-floor-strip]'
          )
        ) {
          setStripMode(
            !state.stripMode
          );

          return;
        }

        if (
          event.target.closest(
            '[data-floor-zoom-in]'
          )
        ) {
          state.zoom =
            Math.min(
              1.6,
              state.zoom + .1
            );

          applyZoom();
        }

        if (
          event.target.closest(
            '[data-floor-zoom-out]'
          )
        ) {
          state.zoom =
            Math.max(
              .4,
              state.zoom - .1
            );

          applyZoom();
        }

        if (
          event.target.closest(
            '[data-floor-fit]'
          )
        ) {
          fit();
        }

        if (
          event.target.closest(
            '[data-floor-fullscreen]'
          )
        ) {
          if (
            document.fullscreenElement
          ) {
            document.exitFullscreen();
          } else {
            root.requestFullscreen();
          }
        }

        if (
          event.target.closest(
            '[data-floor-guide]'
          )
        ) {
          root.querySelector(
            '[data-floor-guide-card]'
          ).hidden = false;
        }

        if (
          event.target.closest(
            '[data-floor-guide-close]'
          )
        ) {
          root.querySelector(
            '[data-floor-guide-card]'
          ).hidden = true;
        }

        if (
          event.target.closest(
            '[data-floor-close]'
          )
        ) {
          closeDrawer();
        }

        var unmerge =
          event.target.closest(
            '[data-floor-unmerge]'
          );

        if (unmerge) {
          var memberIds =
            state.active &&
            state.active.isMergedView
              ? state.active
                  .memberIds.slice()
              : [];

          var mergeId =
            unmerge.getAttribute(
              'data-floor-unmerge'
            );

          unmerge.disabled = true;

          saveOperational(
            'unmerge',
            {
              merge_id: mergeId
            }
          )
            .then(function () {
              var repaired =
                repairUnmergedMembers(
                  memberIds
                );

              return repaired
                ? persistLayoutSilently()
                : Promise.resolve();
            })
            .then(function () {
              closeDrawer();

              render();

              toast(
                'Tables unmerged and positioned safely'
              );
            })
            .catch(function (error) {
              unmerge.disabled = false;

              toast(
                error.message,
                true
              );
            });

          return;
        }

        var action =
          event.target.closest(
            '[data-floor-action]'
          );

        if (
          action &&
          state.active
        ) {
          var type =
            action.getAttribute(
              'data-floor-action'
            );

          var actionTableId =
            state.active
              .isMergedView
              ? state.active
                  .memberIds[0]
              : state.active.id;

          if (type === 'order') {
            location.href =
              orderTemplate.replace(
                '{table}',
                encodeURIComponent(
                  actionTableId
                )
              );
          } else if (
            type === 'note'
          ) {
            var noteValue =
              window.prompt(
                'Add a note for ' +
                state.active.name,

                state.active.note ||
                ''
              );

            if (
              noteValue !== null
            ) {
              saveOperational(
                'note',
                {
                  table_id:
                    actionTableId,

                  note:
                    noteValue
                }
              ).then(function () {
                closeDrawer();

                toast(
                  'Note saved'
                );
              });
            }
          } else {
            var targets =
              state.active
                .isMergedView
                ? state.active
                    .memberIds
                : [
                  state.active.id
                ];

            Promise.all(
              targets.map(
                function (id) {
                  return saveOperational(
                    'table-state',
                    {
                      table_id: id,
                      status: type,

                      note:
                        state.active.note ||
                        ''
                    }
                  );
                }
              )
            ).then(function () {
              closeDrawer();

              toast(
                'Table updated'
              );
            });
          }
        }
      }
    );

    root.addEventListener(
      'pointerdown',
      function (event) {
        var node =
          event.target.closest(
            '[data-floor-table]'
          );

        if (!node) return;

        var table =
          displayTableById(
            node.getAttribute(
              'data-floor-table'
            )
          );

        if (table) {
          pointerDown(
            event,
            table
          );
        }
      }
    );

    root.addEventListener(
      'pointermove',
      pointerMove
    );

    root.addEventListener(
      'pointerup',
      pointerUp
    );

    root.addEventListener(
      'pointercancel',
      pointerUp
    );

    var search =
      root.querySelector(
        '[data-floor-search]'
      );

    if (search) {
      search.addEventListener(
        'input',
        function () {
          state.query =
            clean(search.value)
              .toLowerCase();

          render();
        }
      );
    }

    document.addEventListener(
      'keydown',
      function (event) {
        if (
          event.key === 'Escape' &&
          state.mergeMode
        ) {
          event.preventDefault();
          cancelMergeMode();
        }
      }
    );

    window.addEventListener(
      'resize',
      function () {
        if (!state.editing) {
          fit();
        }
      }
    );

    ensureStripButton();
    updateStripButton();

    ensureOfficialTablerKit();

    ensureMotherToolbar();
    ensureContextCounters();
    ensureSecondaryToolbar();

    renderAreaTabs();

    updateMotherToolbar();
    renderContextCounters();

    organizeFloorControls();
    refreshFloorIcons();

    load();

    return {
      root: root,
      refresh: load,
      fit: fit,

      setSize: function (size) {
        root.setAttribute(
          'data-size',
          size
        );

        fit();
      },

      getState: function () {
        return state;
      },

      setContext: setContext,

      setCounters: function (
        counters
      ) {
        state.counters =
          Array.isArray(counters)
            ? counters.slice()
            : [];

        renderContextCounters();
      },

      setCapabilities: function (
        capabilities
      ) {
        state.capabilities =
          Object.assign(
            {},
            state.capabilities,
            capabilities || {}
          );

        updateMotherToolbar();
      },

      clearSelection:
        clearFloorSelection
    };
  }

  var instances = [];

  function mount(scope) {
    var roots =
      Array.prototype.slice.call(
        (scope || document)
          .querySelectorAll(
            '[data-pmd-floor]'
          )
      );

    roots.forEach(
      function (root) {
        if (
          root.__pmdFloorV1
        ) {
          return;
        }

        root.__pmdFloorV1 =
          createFloor(root);

        if (
          root.__pmdFloorV1
        ) {
          instances.push(
            root.__pmdFloorV1
          );
        }
      }
    );

    return instances;
  }

  window.PMDFloorMapV1 = {
    version: '2.8.0',
    mount: mount,
    instances: instances,

    sizes: [
      'compact',
      'standard',
      'large',
      'fill'
    ],

    smartLayout: {
      tableWidth: 108,
      tableHeight: 88,

      mergedWidth: 132,
      mergedHeight: 104,

      minimumGap: 14,
      snapDistance: 20,

      overlapDuringDrag: true,
      overlapOnDrop: false,

      centerSnapOnly: true,
      closestTableOnly: true,
      alignmentGuides: false,

      mergeExitsEditMode: true,
      mergedGroupSingleCard: true,

      multiTableMerge: true,
      explicitMergeConfirmation: true,
      mergeCancelWithEscape: true,
      mergeTransitionJumpRemoved: true,
      unmergeFromDrawer: true,
      nestedMergesBlocked: true,

      safeUnmergePlacement: true,
      safeUnmergePersistence: true,

      oneRowMode: true,
      oneRowSortedAscending: true,
      oneRowHorizontalScroll: true,
      oneRowHidesEditing: true,
      oneRowPreservesSavedLayout: true,

      mergedCollisionCheck: true,
      mergedNearestLegalPlacement: true,
      mergedRowScanFallback: true,
      mergedPlacementAutoSave: true,
      existingMergedRepairOnLoad: true,

      motherFloorKit: true,
      capabilityDrivenToolbar: true,
      contextCounters: true,

      tableClickSelectsOnly: true,
      drawerActionsDisabled: true,

      toolbarAvailableAction: true,
      toolbarCleaningAction: true,
      toolbarReservedAction: true,
      toolbarWaiterCallAction: true,
      toolbarNoteAction: true,
      toolbarOpenTableAction: true,
      toolbarUnmergeAction: true,

      mergedProfessionalVisual: true,

      smoothFloorStripTransition: true,
      smoothMergeTransition: true,
      smoothUnmergeTransition: true,
      structuralFlipAnimation: true,

      availableOptimisticColor: true,
      waiterCallOrange: true,
      noteOrange: true,

      hideAvailableStatusText: true,
      hideOccupiedStatusText: true,

      mergedBadgeTopRight: true,
      mergedLargePillRemoved: true,

      tablerIconSystem: true,
      emojiIconsRemoved: true,
      externalIconCdnRequired: false,

      searchFieldRemoved: true,
      secondaryControlToolbar: true,

      guideFloatingBottomRight: true,
      guideIconOnly: true,

      officialTablerWebfont: true,
      officialTablerVersion: '3.44.0',
      handmadeSvgIconsRemoved: true,

      statusFiltersRemoved: true,
      areaSelectorEnabled: true,
      dynamicBackendAreas: true,
      defaultMainFloorArea: true,

      calibratedOneRow: true,
      oneRowNumericOrdering: true,
      oneRowFixedGap: 18,
      oneRowMergedWidthAware: true
    }
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        mount(document);
      },
      {
        once: true
      }
    );
  } else {
    mount(document);
  }
})();


/* PMD_MERGE_INLINE_NEUTRAL_V287_START */
(function () {
  'use strict';

  var applying = false;

  function setImportant(
    element,
    property,
    value
  ) {
    if (!element) {
      return;
    }

    var currentValue =
      element.style.getPropertyValue(
        property
      );

    var currentPriority =
      element.style.getPropertyPriority(
        property
      );

    if (
      currentValue === value &&
      currentPriority === 'important'
    ) {
      return;
    }

    element.style.setProperty(
      property,
      value,
      'important'
    );
  }

  function neutralizeMergeBadge(
    badge
  ) {
    if (
      !badge ||
      !badge.matches(
        '.pmd-floor-v1__badge.is-merge'
      )
    ) {
      return;
    }

    setImportant(
      badge,
      'background',
      'rgba(255, 255, 255, 0.96)'
    );

    setImportant(
      badge,
      'background-color',
      'rgba(255, 255, 255, 0.96)'
    );

    setImportant(
      badge,
      'color',
      'rgb(23, 55, 82)'
    );

    setImportant(
      badge,
      'border',
      '1px solid rgba(23, 55, 82, 0.28)'
    );

    setImportant(
      badge,
      'box-shadow',
      '0 3px 8px rgba(17, 38, 56, 0.14)'
    );

    var svg =
      badge.querySelector('svg');

    if (svg) {
      setImportant(
        svg,
        'color',
        'rgb(23, 55, 82)'
      );

      setImportant(
        svg,
        'fill',
        'rgb(23, 55, 82)'
      );
    }

    badge
      .querySelectorAll(
        'svg path, svg g, svg use'
      )
      .forEach(function (part) {
        setImportant(
          part,
          'fill',
          'rgb(23, 55, 82)'
        );

        setImportant(
          part,
          'color',
          'rgb(23, 55, 82)'
        );
      });
  }

  function applyMergeBadgeFix() {
    if (applying) {
      return;
    }

    applying = true;

    try {
      document
        .querySelectorAll(
          '.pmd-floor-v1__badge.is-merge'
        )
        .forEach(
          neutralizeMergeBadge
        );
    } finally {
      applying = false;
    }
  }

  function scheduleApply() {
    window.requestAnimationFrame(
      applyMergeBadgeFix
    );
  }

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      scheduleApply,
      {
        once: true
      }
    );
  } else {
    scheduleApply();
  }

  /*
   * Floor cards can be redrawn after loading.
   * Reapply only when DOM or badge styles change.
   */
  var observer =
    new MutationObserver(
      function (mutations) {
        var shouldApply = false;

        mutations.forEach(
          function (mutation) {
            if (
              mutation.type ===
              'childList'
            ) {
              shouldApply = true;
            }

            if (
              mutation.type ===
              'attributes' &&
              mutation.target instanceof
                Element &&
              (
                mutation.target.matches(
                  '.pmd-floor-v1__badge.is-merge'
                ) ||
                mutation.target.closest(
                  '.pmd-floor-v1__badge.is-merge'
                )
              )
            ) {
              shouldApply = true;
            }
          }
        );

        if (shouldApply) {
          scheduleApply();
        }
      }
    );

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'style',
        'class'
      ]
    }
  );

  /*
   * Extra delayed checks for asynchronous
   * floor rendering.
   */
  [
    100,
    300,
    700,
    1500
  ].forEach(
    function (delay) {
      window.setTimeout(
        applyMergeBadgeFix,
        delay
      );
    }
  );

  window.PMDMergeBadgeNeutralV287 = {
    apply:
      applyMergeBadgeFix,

    version:
      '2.8.7-runtime'
  };

  console.info(
    '[PMD Merge Badge Neutral V2.8.7] Ready'
  );
})();
/* PMD_MERGE_INLINE_NEUTRAL_V287_END */


