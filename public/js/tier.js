(function () {
  'use strict';

  var board = document.getElementById('tier-board');
  var tooltip = document.getElementById('tier-tooltip');
  if (!board || !tooltip) return;

  var active = null;
  var hideTimer = null;

  function addText(parent, className, text) {
    var el = document.createElement('div');
    if (className) el.className = className;
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function addRow(label, value) {
    var row = document.createElement('div');
    row.className = 'tier-tooltip-row';
    addText(row, '', label);
    addText(row, '', value);
    tooltip.appendChild(row);
  }

  function positionTooltip(anchor) {
    var anchorRect = anchor.getBoundingClientRect();
    var tooltipRect = tooltip.getBoundingClientRect();
    var left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipRect.width - 12));
    var top = anchorRect.top - tooltipRect.height - 10;
    if (top < 12) {
      top = Math.min(window.innerHeight - tooltipRect.height - 12, anchorRect.bottom + 10);
    }
    tooltip.style.left = Math.round(left) + 'px';
    tooltip.style.top = Math.round(top) + 'px';
  }

  function hideTooltip() {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
    tooltip.hidden = true;
    if (active) active.removeAttribute('aria-describedby');
    active = null;
  }

  function hideSoon() {
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideTooltip, 120);
  }

  function show(anchor, fill) {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (active && active !== anchor) active.removeAttribute('aria-describedby');
    active = anchor;
    tooltip.replaceChildren();
    fill();
    tooltip.hidden = false;
    positionTooltip(anchor);
    anchor.setAttribute('aria-describedby', 'tier-tooltip');
  }

  function showCard(card) {
    var name = card.dataset.name || '';
    var brand = card.dataset.brand || '';
    var country = card.dataset.country || '';
    var note = card.dataset.note || '';
    if (!brand && !country && !note) return;
    show(card, function () {
      addText(tooltip, 'tier-tooltip-title', name);
      if (brand) addRow('Brand', brand);
      if (country) addRow('Country', country);
      if (note) {
        addText(tooltip, 'tier-tooltip-section', 'Comments');
        addText(tooltip, 'tier-tooltip-meta', note);
      }
    });
  }

  function showTier(rail) {
    var text = rail.dataset.tierDescription;
    if (!text) return;
    show(rail, function () {
      addText(tooltip, '', text);
    });
  }

  board.querySelectorAll('.tier-card').forEach(function (card) {
    card.addEventListener('mouseenter', function () { showCard(card); });
    card.addEventListener('mouseleave', hideSoon);
    card.addEventListener('focus', function () { showCard(card); });
    card.addEventListener('blur', hideSoon);
  });

  board.querySelectorAll('[data-tier-description]').forEach(function (rail) {
    rail.addEventListener('mouseenter', function () { showTier(rail); });
    rail.addEventListener('mouseleave', hideSoon);
    rail.addEventListener('focus', function () { showTier(rail); });
    rail.addEventListener('blur', hideSoon);
  });

  window.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('resize', hideTooltip);
})();
