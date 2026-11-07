(function () {
  'use strict';

  var board = document.getElementById('tier-board');
  var tooltip = document.getElementById('tier-tooltip');
  var countryFilter = document.getElementById('country-filter');
  var brandFilter = document.getElementById('brand-filter');
  if (!board || !tooltip) return;

  var noun = board.dataset.noun || 'title';
  var plural = board.dataset.plural || noun + 's';
  var active = null;
  var hideTimer = null;

  function countLabel(n) {
    return n + ' ' + (n === 1 ? noun : plural);
  }

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

  function applyFilters() {
    hideTooltip();
    var country = countryFilter ? countryFilter.value : '';
    var brand = brandFilter ? brandFilter.value : '';
    var filtering = Boolean(country || brand);
    board.querySelectorAll('.tier-board-row').forEach(function (row) {
      var visible = 0;
      row.querySelectorAll('.tier-card').forEach(function (card) {
        var matchesCountry = !country || card.dataset.country === country;
        var matchesBrand = !brand || card.dataset.brand === brand;
        var match = matchesCountry && matchesBrand;
        card.hidden = !match;
        if (match) visible += 1;
      });
      var empty = row.querySelector('.tier-board-empty');
      if (empty) {
        empty.hidden = visible > 0;
        empty.textContent = filtering ? 'No matches in this tier.' : (empty.dataset.empty || '');
      }
      var count = row.querySelector('.tier-board-count');
      if (count) count.textContent = countLabel(visible);
    });
  }

  if (countryFilter) countryFilter.addEventListener('change', applyFilters);
  if (brandFilter) brandFilter.addEventListener('change', applyFilters);
  window.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('resize', hideTooltip);
})();
