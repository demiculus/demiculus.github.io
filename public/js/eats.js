(function () {
  'use strict';

  var config = window.EATS_CONFIG;
  var statusEl = document.getElementById('eats-status');
  var daysEl = document.getElementById('eats-days');
  var itemsEl = document.getElementById('eats-items');

  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.toggle('is-error', !!isError);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function todayKey() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
  }

  function parseDay(value) {
    var parts = String(value || '').split('-');
    if (parts.length !== 3) return null;
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(date.getTime()) ? null : date;
  }

  function formatDay(value) {
    var date = parseDay(value);
    if (!date) return value;
    if (value === todayKey()) return 'Today';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatNumber(value, digits) {
    if (value == null || value === '') return '';
    var number = Number(value);
    if (isNaN(number)) return '';
    return number.toLocaleString('en-US', {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    });
  }

  function calPerProtein(item) {
    var protein = Number(item.protein_g);
    var calories = Number(item.calories);
    if (!protein || isNaN(protein) || protein <= 0 || isNaN(calories)) return Infinity;
    return calories / protein;
  }

  function sumByDay(items) {
    var totals = {};
    items.forEach(function (item) {
      if (!totals[item.day]) {
        totals[item.day] = { calories: 0, protein_g: 0, items: [] };
      }
      var bucket = totals[item.day];
      bucket.items.push(item);
      if (item.calories != null && item.calories !== '') {
        bucket.calories += Number(item.calories) || 0;
      }
      if (item.protein_g != null && item.protein_g !== '') {
        bucket.protein_g += Number(item.protein_g) || 0;
      }
    });
    return totals;
  }

  function allDays(days, totals) {
    var seen = {};
    var keys = [];
    days.forEach(function (row) {
      if (!row.day || seen[row.day]) return;
      seen[row.day] = true;
      keys.push(row.day);
    });
    Object.keys(totals).forEach(function (day) {
      if (seen[day]) return;
      seen[day] = true;
      keys.push(day);
    });
    keys.sort();
    keys.reverse();
    return keys;
  }

  function weightByDay(days) {
    var weights = {};
    days.forEach(function (row) {
      weights[row.day] = row.weight_kg;
    });
    return weights;
  }

  function renderDays(dayKeys, weights, totals) {
    if (!daysEl) return;
    if (!dayKeys.length) {
      daysEl.innerHTML = '<p class="eats-empty">No days logged yet.</p>';
      return;
    }

    daysEl.innerHTML =
      '<table class="eats-table">' +
      '<thead><tr><th>Date</th><th>Weight</th><th>Calories</th><th>Protein</th></tr></thead>' +
      '<tbody>' +
      dayKeys
        .map(function (day) {
          var total = totals[day] || { calories: 0, protein_g: 0 };
          var todayClass = day === todayKey() ? ' class="is-today"' : '';
          return (
            '<tr' +
            todayClass +
            '>' +
            '<td>' +
            escapeHtml(formatDay(day)) +
            '</td>' +
            '<td>' +
            escapeHtml(formatNumber(weights[day], 1)) +
            (weights[day] != null && weights[day] !== '' ? ' kg' : '') +
            '</td>' +
            '<td>' +
            escapeHtml(formatNumber(total.calories, 0)) +
            '</td>' +
            '<td>' +
            escapeHtml(formatNumber(total.protein_g, 1)) +
            (total.protein_g ? ' g' : '') +
            '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '</tbody></table>';
  }

  function renderItems(dayKeys, totals) {
    if (!itemsEl) return;
    var groups = dayKeys.filter(function (day) {
      return totals[day] && totals[day].items.length;
    });
    if (!groups.length) {
      itemsEl.innerHTML = '<p class="eats-empty">No foods logged yet.</p>';
      return;
    }

    itemsEl.innerHTML = groups
      .map(function (day) {
        var rows = totals[day].items
          .slice()
          .sort(function (a, b) {
            return calPerProtein(a) - calPerProtein(b);
          })
          .map(function (item) {
            var ratio = calPerProtein(item);
            return (
              '<tr>' +
              '<td>' +
              escapeHtml(item.food) +
              '</td>' +
              '<td>' +
              escapeHtml(item.amount || '') +
              '</td>' +
              '<td>' +
              escapeHtml(formatNumber(item.calories, 0)) +
              '</td>' +
              '<td>' +
              escapeHtml(formatNumber(item.protein_g, 1)) +
              '</td>' +
              '<td>' +
              escapeHtml(ratio === Infinity ? '-' : formatNumber(ratio, 1)) +
              '</td>' +
              '</tr>'
            );
          })
          .join('');
        return (
          '<details class="eats-group' +
          (day === todayKey() ? ' is-today' : '') +
          '">' +
          '<summary class="eats-group-title">' +
          escapeHtml(formatDay(day)) +
          '</summary>' +
          '<table class="eats-table">' +
          '<thead><tr><th>Food</th><th>Amount</th><th>Calories</th><th>Protein</th><th>Calories per protein</th></tr></thead>' +
          '<tbody>' +
          rows +
          '</tbody></table>' +
          '</details>'
        );
      })
      .join('');
  }

  if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
    setStatus('Missing config. eats-config.js must define supabaseUrl and supabaseAnonKey.', true);
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    setStatus('Could not load Supabase.', true);
    return;
  }

  var client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  setStatus('Loading…');
  Promise.all([
    client.from('eats').select('day, weight_kg').order('day', { ascending: false }),
    client
      .from('eats_items')
      .select('day, food, amount, calories, protein_g')
      .order('id', { ascending: true }),
  ])
    .then(function (results) {
      var daysResult = results[0];
      var itemsResult = results[1];
      if (daysResult.error) {
        setStatus(daysResult.error.message || 'Could not load eats.', true);
        return;
      }
      if (itemsResult.error) {
        setStatus(itemsResult.error.message || 'Could not load foods.', true);
        return;
      }

      var days = daysResult.data || [];
      var items = itemsResult.data || [];
      var totals = sumByDay(items);
      var dayKeys = allDays(days, totals);
      setStatus('');
      renderDays(dayKeys, weightByDay(days), totals);
      renderItems(dayKeys, totals);
    })
    .catch(function () {
      setStatus('Could not load eats.', true);
    });
})();
