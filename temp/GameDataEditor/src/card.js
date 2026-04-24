/**
 * Card rendering + grid interactions (selection, marquee, drag-sort).
 * Exposed:
 *   Card.render(entity, id, structDef) -> HTMLElement (absolute-positioned layout via card_style)
 *   Card.attachGrid(container, getTable, onReorder) - wires selection/marquee/drag
 */
(function () {
  'use strict';

  function resolveCardStyle(fieldDef) {
    var rfd = State.resolveFieldDef(fieldDef);
    if (!rfd) return null;
    // struct_def override takes priority (already merged in resolveFieldDef)
    return rfd.card_style || null;
  }

  function computeFrame(cs, cardW, cardH) {
    var f = (cs && cs.frame) || {};
    var unit = f.unit || 'px';
    var toPx = function (v, base) {
      if (v == null) return null;
      if (unit === 'percent') return v * base;
      return v;
    };
    var w = toPx(f.w, cardW); var h = toPx(f.h, cardH);
    var x = toPx(f.x, cardW) || 0; var y = toPx(f.y, cardH) || 0;
    var anchor = f.anchor || 'tl';
    var style = {};
    // Convert anchor+x+y -> left/top/right/bottom
    if (anchor === 'tl') { style.left = x + 'px'; style.top = y + 'px'; }
    else if (anchor === 'tr') { style.right = x + 'px'; style.top = y + 'px'; }
    else if (anchor === 'bl') { style.left = x + 'px'; style.bottom = y + 'px'; }
    else if (anchor === 'br') { style.right = x + 'px'; style.bottom = y + 'px'; }
    else if (anchor === 'c') {
      style.left = '50%'; style.top = '50%';
      style.transform = 'translate(-50%,-50%)';
    }
    if (w != null) style.width = w + 'px';
    if (h != null) style.height = h + 'px';
    return style;
  }

  function renderCardEl(fieldDef, value, cs, cardW, cardH) {
    var rfd = State.resolveFieldDef(fieldDef);
    var tr = (cs && cs.type_render) || (rfd && rfd.type_render) || 'input';
    var div = document.createElement('div');
    div.className = 'gde-card-el ' + tr;
    var frame = computeFrame(cs, cardW, cardH);
    Object.keys(frame).forEach(function (k) { div.style[k] = frame[k]; });
    if (cs && cs.align) {
      if (cs.align.h === 'center') div.style.justifyContent = 'center';
      if (cs.align.h === 'right') div.style.justifyContent = 'flex-end';
    }
    if (cs && cs.text && cs.text.variant) {
      div.classList.add(cs.text.variant);
    }
    if (tr === 'img') {
      if (value && typeof value === 'string') {
        var img = document.createElement('img');
        img.src = value;
        img.onerror = function () {
          img.remove();
          var fb = document.createElement('div');
          fb.className = 'gde-img-fallback';
          fb.textContent = t('render.img_placeholder');
          div.appendChild(fb);
        };
        if (cs && cs.image) {
          if (cs.image.fit) img.style.objectFit = cs.image.fit;
          if (cs.image.radius != null) img.style.borderRadius = cs.image.radius + 'px';
        }
        div.appendChild(img);
      } else {
        var fb2 = document.createElement('div');
        fb2.className = 'gde-img-fallback';
        fb2.textContent = t('render.img_placeholder');
        div.appendChild(fb2);
      }
    } else if (tr === 'enum') {
      var opts = Renderers.normOptions(rfd && rfd.type_agv && rfd.type_agv.options);
      var match = opts.find(function (o) { return String(o.value) === String(value); });
      div.textContent = match ? match.label : String(value);
      if (match && match.color) div.style.background = match.color;
      else div.style.background = 'var(--ef-accent, #4a90e2)';
    } else if (tr === 'color') {
      if (typeof value === 'number') div.style.background = Renderers.toHex6(value);
      else if (typeof value === 'string') div.style.background = value;
    } else {
      // text-like
      div.textContent = value == null ? '' : String(value);
      if (cs && cs.text && cs.text.clamp) {
        div.style.display = '-webkit-box';
        div.style.webkitLineClamp = String(cs.text.clamp);
        div.style.webkitBoxOrient = 'vertical';
        div.style.whiteSpace = 'normal';
      }
    }
    return div;
  }

  function render(entity, id, structDef, cardW, cardH) {
    var card = document.createElement('div');
    card.className = 'gde-card';
    card.dataset.id = id;

    var inner = document.createElement('div');
    inner.className = 'gde-card-inner';

    // Gather fields with card_style, sort by layer
    var sdKeys = Object.keys(structDef || {});
    var withCs = [];
    sdKeys.forEach(function (f) {
      var fd = structDef[f];
      var cs = resolveCardStyle(fd);
      if (cs && cs.visible !== false) {
        withCs.push({ field: f, cs: cs, fd: fd, layer: cs.layer || 0 });
      }
    });
    withCs.sort(function (a, b) { return a.layer - b.layer; });

    // No default id/field-count placard. The card's content is whatever
    // the struct's fields declare via their `card_style`; an empty card
    // here means "no field opted to paint on the card", which is a
    // modeling decision the UI shouldn't paper over.
    withCs.forEach(function (item) {
      var v = entity ? entity[item.field] : undefined;
      var ce = renderCardEl(item.fd, v, item.cs, cardW, cardH);
      inner.appendChild(ce);
    });

    card.appendChild(inner);
    return card;
  }

  // -----------------------------
  // Grid interaction
  // -----------------------------
  function attachGrid(container, opts) {
    // opts: { getPathKey, onReorder, onSelect }
    var state = {
      selected: new Set(),
      lastClicked: null,
      isMouseDown: false,
      downPos: null,
      downTarget: null,
      downTargetId: null,
      marquee: null,
      marqueeStart: null,
      marqueeBaseSel: null,
      isDragging: false,
      ghost: null,
      dropIndicator: null,
      dropIndex: -1,
    };

    function cardAt(ev) {
      var el = ev.target;
      while (el && el !== container) {
        if (el.classList && el.classList.contains('gde-card')) return el;
        el = el.parentElement;
      }
      return null;
    }
    function cardsList() {
      return Array.from(container.querySelectorAll('.gde-card'));
    }
    function commitSelection() {
      cardsList().forEach(function (c) {
        c.classList.toggle('is-selected', state.selected.has(c.dataset.id));
      });
      if (opts.onSelect) opts.onSelect(Array.from(state.selected), state.lastClicked);
    }
    function setSingle(id) {
      state.selected.clear();
      if (id) state.selected.add(id);
      commitSelection();
    }

    // Pointer events on the container + setPointerCapture — so pointermove
    // and pointerup keep firing on `container` even when the cursor leaves
    // it. Attaching to the container (not document) means these listeners
    // go away automatically when the container is GC'd on re-render. No
    // document-level leak across repeated renderBody calls.
    container.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      try { container.setPointerCapture(ev.pointerId); } catch (_) {}
      state.pointerId = ev.pointerId;
      var card = cardAt(ev);
      state.isMouseDown = true;
      state.downPos = { x: ev.clientX, y: ev.clientY };
      state.downTarget = card;
      state.downTargetId = card ? card.dataset.id : null;
      state.isDragging = false;

      if (!card) {
        // Start marquee
        if (!(ev.ctrlKey || ev.metaKey || ev.shiftKey)) {
          state.selected.clear();
          state.lastClicked = null;
          commitSelection();
        }
        state.marqueeBaseSel = new Set(state.selected);
        var rect = container.getBoundingClientRect();
        state.marqueeStart = {
          x: ev.clientX - rect.left + container.scrollLeft,
          y: ev.clientY - rect.top + container.scrollTop,
        };
      } else {
        // Delay single-click resolution until pointerup
      }
    });

    container.addEventListener('pointermove', function (ev) {
      if (!state.isMouseDown) return;
      var dx = ev.clientX - state.downPos.x;
      var dy = ev.clientY - state.downPos.y;
      var dist = Math.hypot(dx, dy);

      if (state.marqueeStart) {
        // Marquee selection
        if (!state.marquee) {
          state.marquee = document.createElement('div');
          state.marquee.className = 'gde-marquee';
          container.appendChild(state.marquee);
        }
        var rect = container.getBoundingClientRect();
        var cx = ev.clientX - rect.left + container.scrollLeft;
        var cy = ev.clientY - rect.top + container.scrollTop;
        var x1 = Math.min(state.marqueeStart.x, cx);
        var y1 = Math.min(state.marqueeStart.y, cy);
        var x2 = Math.max(state.marqueeStart.x, cx);
        var y2 = Math.max(state.marqueeStart.y, cy);
        state.marquee.style.left = x1 + 'px';
        state.marquee.style.top = y1 + 'px';
        state.marquee.style.width = (x2 - x1) + 'px';
        state.marquee.style.height = (y2 - y1) + 'px';
        // Update selection based on card center
        var next = new Set(state.marqueeBaseSel);
        cardsList().forEach(function (c) {
          var cr = c.getBoundingClientRect();
          var ccx = cr.left - rect.left + container.scrollLeft + cr.width / 2;
          var ccy = cr.top - rect.top + container.scrollTop + cr.height / 2;
          if (ccx >= x1 && ccx <= x2 && ccy >= y1 && ccy <= y2) {
            next.add(c.dataset.id);
          } else if (!(ev.ctrlKey || ev.metaKey)) {
            next.delete(c.dataset.id);
          }
        });
        state.selected = next;
        commitSelection();
        return;
      }

      // Card drag
      if (state.downTarget && !state.isDragging && dist > 5) {
        state.isDragging = true;
        // If dragged card not selected, make it single selection
        if (!state.selected.has(state.downTargetId)) {
          setSingle(state.downTargetId);
          state.lastClicked = state.downTargetId;
        }
        // Mark dragged cards
        cardsList().forEach(function (c) {
          if (state.selected.has(c.dataset.id)) c.classList.add('is-dragging');
        });
        // Create ghost
        var g = document.createElement('div');
        g.className = 'gde-drag-ghost';
        g.textContent = state.selected.size > 1
          ? state.selected.size + ' items'
          : state.downTargetId;
        document.body.appendChild(g);
        state.ghost = g;
        // Drop indicator
        var ind = document.createElement('div');
        ind.className = 'gde-drop-indicator';
        container.appendChild(ind);
        state.dropIndicator = ind;
      }
      if (state.isDragging) {
        state.ghost.style.left = ev.clientX + 'px';
        state.ghost.style.top = ev.clientY + 'px';
        // Compute drop index: find nearest card edge
        var cards = cardsList().filter(function (c) {
          return !state.selected.has(c.dataset.id);
        });
        var rect = container.getBoundingClientRect();
        var relX = ev.clientX;
        var relY = ev.clientY;
        var bestIdx = cards.length;
        var bestDist = Infinity;
        var bestRect = null;
        var bestSide = 'before';
        cards.forEach(function (c, i) {
          var r = c.getBoundingClientRect();
          var cx = r.left + r.width / 2;
          var cy = r.top + r.height / 2;
          var d = Math.hypot(relX - cx, relY - cy);
          if (d < bestDist) {
            bestDist = d; bestIdx = i; bestRect = r;
            bestSide = (relX < cx) ? 'before' : 'after';
          }
        });
        // Position indicator
        if (bestRect) {
          var pRect = container.getBoundingClientRect();
          var ix = bestSide === 'before' ? bestRect.left : bestRect.right;
          state.dropIndicator.style.display = 'block';
          state.dropIndicator.style.left = (ix - pRect.left + container.scrollLeft - 1) + 'px';
          state.dropIndicator.style.top = (bestRect.top - pRect.top + container.scrollTop) + 'px';
          state.dropIndicator.style.width = '2px';
          state.dropIndicator.style.height = bestRect.height + 'px';
          state.dropIndex = bestSide === 'before' ? bestIdx : bestIdx + 1;
          state.dropTargetId = cards[bestIdx] ? cards[bestIdx].dataset.id : null;
          state.dropSide = bestSide;
        } else {
          state.dropIndicator.style.display = 'none';
          state.dropIndex = -1;
        }
      }
    });

    function endPointer(ev) {
      if (!state.isMouseDown) return;
      state.isMouseDown = false;
      try { container.releasePointerCapture(state.pointerId); } catch (_) {}
      state.pointerId = null;

      // End marquee
      if (state.marquee) {
        state.marquee.remove();
        state.marquee = null;
        state.marqueeStart = null;
        state.marqueeBaseSel = null;
        return;
      }

      // End drag
      if (state.isDragging) {
        var draggedIds = Array.from(state.selected);
        cardsList().forEach(function (c) { c.classList.remove('is-dragging'); });
        if (state.ghost) { state.ghost.remove(); state.ghost = null; }
        if (state.dropIndicator) { state.dropIndicator.remove(); state.dropIndicator = null; }
        state.isDragging = false;
        if (opts.onReorder && state.dropTargetId !== undefined) {
          opts.onReorder(draggedIds, state.dropTargetId, state.dropSide);
        }
        state.dropTargetId = null;
        state.dropSide = null;
        return;
      }

      // Click resolve on card
      if (state.downTarget) {
        var id = state.downTargetId;
        if (ev.ctrlKey || ev.metaKey) {
          if (state.selected.has(id)) state.selected.delete(id);
          else state.selected.add(id);
          state.lastClicked = id;
        } else if (ev.shiftKey && state.lastClicked) {
          var cards = cardsList();
          var lastIdx = cards.findIndex(function (c) { return c.dataset.id === state.lastClicked; });
          var curIdx = cards.findIndex(function (c) { return c.dataset.id === id; });
          if (lastIdx >= 0 && curIdx >= 0) {
            state.selected.clear();
            var from = Math.min(lastIdx, curIdx), to = Math.max(lastIdx, curIdx);
            for (var i = from; i <= to; i++) state.selected.add(cards[i].dataset.id);
          }
        } else {
          setSingle(id);
          state.lastClicked = id;
          commitSelection();
          return;
        }
        commitSelection();
      }
    }
    container.addEventListener('pointerup',     endPointer);
    container.addEventListener('pointercancel', endPointer);

    // Public API: imperative selection reset
    return {
      clearSelection: function () {
        state.selected.clear();
        state.lastClicked = null;
        commitSelection();
      },
      selectOnly: function (id) {
        setSingle(id);
        state.lastClicked = id;
      },
      getSelection: function () { return Array.from(state.selected); },
    };
  }

  window.Card = { render: render, attachGrid: attachGrid };
})();
