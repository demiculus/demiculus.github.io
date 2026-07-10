(function () {
  'use strict';

  var TIER_LABELS = {
    1: 'Masterpiece',
    2: 'Awesome',
    3: 'Suggestable',
    4: 'Ok',
    5: 'Waste of Time',
  };

  var UNRATED_SECTION = 'unrated';

  var PROFILE_ORDER = ['Goku', 'Kan', 'Demi', 'Orhan'];

  var config = window.ANIME_CONFIG;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
    var root = document.querySelector('.anime-page');
    if (root) {
      root.innerHTML =
        '<p class="anime-error">Missing config. Copy <code>anime-config.example.js</code> to <code>anime-config.js</code>, then add your Supabase anon key.</p>';
    }
    return;
  }

  var supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  var state = {
    profiles: [],
    animes: [],
    ratings: [],
    activeIds: new Set(),
    session: null,
    profile: null,
    loginOpen: false,
    loading: true,
  };

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function aggregateTier(animeId) {
    var relevant = state.ratings.filter(function (r) {
      return r.anime_id === animeId && state.activeIds.has(r.user_id);
    });
    if (!relevant.length) return null;
    var sum = relevant.reduce(function (acc, r) {
      return acc + r.tier;
    }, 0);
    return Math.ceil(sum / relevant.length);
  }

  function myRating(animeId) {
    if (!state.profile) return null;
    var row = state.ratings.find(function (r) {
      return r.anime_id === animeId && r.user_id === state.profile.id;
    });
    return row ? row.tier : null;
  }

  function sortedProfiles() {
    return state.profiles.slice().sort(function (a, b) {
      return PROFILE_ORDER.indexOf(a.display_name) - PROFILE_ORDER.indexOf(b.display_name);
    });
  }

  function renderAuth() {
    var box = els.auth;
    if (state.session && state.profile) {
      state.loginOpen = false;
      box.innerHTML =
        '<p class="anime-auth-status">Signed in as <strong>' +
        escapeHtml(state.profile.display_name) +
        '</strong></p>' +
        '<button type="button" class="anime-btn" id="anime-sign-out">Sign out</button>';
      $('anime-sign-out').addEventListener('click', signOut);
      els.editor.hidden = false;
      return;
    }

    if (state.session && !state.profile) {
      box.innerHTML =
        '<p class="anime-error">Signed in, but no profile linked. Ask Demi to add your profile row in Supabase.</p>';
      els.editor.hidden = true;
      return;
    }

    box.innerHTML =
      '<button type="button" class="anime-btn" id="anime-sign-in-toggle" aria-expanded="' +
      (state.loginOpen ? 'true' : 'false') +
      '">' +
      (state.loginOpen ? 'Cancel' : 'Sign in') +
      '</button>' +
      '<div class="anime-login-panel' +
      (state.loginOpen ? ' is-open' : '') +
      '" id="anime-login-panel">' +
      '<form class="anime-login" id="anime-login-form">' +
      '<div class="anime-login-row">' +
      '<input type="email" id="anime-email" placeholder="Email" required autocomplete="email">' +
      '<input type="password" id="anime-password" placeholder="Password" required autocomplete="current-password">' +
      '<button type="submit" class="anime-btn">Sign in</button>' +
      '</div>' +
      '<p class="anime-login-hint" id="anime-login-hint"></p>' +
      '</form>' +
      '</div>';

    $('anime-sign-in-toggle').addEventListener('click', function () {
      state.loginOpen = !state.loginOpen;
      renderAuth();
    });
    $('anime-login-form').addEventListener('submit', signInWithPassword);
    els.editor.hidden = true;
  }

  function ratingCountForUser(userId) {
    return state.ratings.filter(function (r) {
      return r.user_id === userId;
    }).length;
  }

  function renderToggles() {
    var container = els.toggles;
    container.innerHTML = '';

    sortedProfiles().forEach(function (profile) {
      var count = ratingCountForUser(profile.id);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'anime-btn' + (state.activeIds.has(profile.id) ? ' is-on' : '');
      btn.dataset.id = profile.id;
      btn.setAttribute('aria-pressed', state.activeIds.has(profile.id) ? 'true' : 'false');
      btn.innerHTML =
        '<span class="anime-category-name">' +
        escapeHtml(profile.display_name) +
        '</span>' +
        '<span class="anime-category-count">' +
        count +
        '</span>';
      btn.addEventListener('click', function () {
        if (state.activeIds.has(profile.id)) {
          state.activeIds.delete(profile.id);
        } else {
          state.activeIds.add(profile.id);
        }
        renderToggles();
        renderBoard();
      });
      container.appendChild(btn);
    });

    if (!state.profiles.length) {
      container.innerHTML = '<p class="anime-muted">No profiles yet.</p>';
    }
  }

  function renderBoard() {
    var board = els.board;
    var openSections = new Set();
    board.querySelectorAll('.anime-tier[open]').forEach(function (el) {
      openSections.add(el.dataset.tier);
    });

    board.innerHTML = '';

    var buckets = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    var unrated = [];
    state.animes.forEach(function (anime) {
      var tier = aggregateTier(anime.id);
      if (tier) buckets[tier].push(anime);
      else unrated.push(anime);
    });

    Object.keys(TIER_LABELS).forEach(function (tierKey) {
      board.appendChild(
        renderBoardSection({
          key: tierKey,
          numLabel: 'Tier ' + tierKey,
          label: TIER_LABELS[tierKey],
          items: buckets[Number(tierKey)],
          openSections: openSections,
          emptyText: 'No shows in this tier yet.',
        })
      );
    });

    board.appendChild(
      renderBoardSection({
        key: UNRATED_SECTION,
        label: 'Unrated',
        items: unrated,
        openSections: openSections,
        emptyText: 'No unrated shows.',
        isUnrated: true,
      })
    );
  }

  function renderBoardSection(options) {
    var items = options.items.slice().sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });

    var section = document.createElement('details');
    section.className = 'anime-tier' + (options.isUnrated ? ' anime-tier--unrated' : '');
    section.dataset.tier = options.key;
    section.open =
      options.openSections.has(options.key) ||
      (options.openSections.size === 0 && options.key === '1');

    var summaryMain = options.numLabel
      ? '<span class="anime-tier-num">' +
        escapeHtml(options.numLabel) +
        '</span>' +
        '<span class="anime-tier-label">' +
        escapeHtml(options.label) +
        '</span>'
      : '<span class="anime-tier-label">' + escapeHtml(options.label) + '</span>';

    section.innerHTML =
      '<summary class="anime-tier-summary">' +
      '<span class="anime-tier-summary-main">' +
      summaryMain +
      '</span>' +
      '<span class="anime-tier-count">' +
      items.length +
      '</span>' +
      '</summary>' +
      '<div class="anime-tier-body"></div>';

    var body = section.querySelector('.anime-tier-body');
    if (!items.length) {
      body.innerHTML = '<p class="anime-tier-empty">' + escapeHtml(options.emptyText) + '</p>';
    } else {
      var list = document.createElement('ul');
      list.className = 'anime-rows';
      items.forEach(function (anime) {
        list.appendChild(renderRow(anime));
      });
      body.appendChild(list);
    }

    return section;
  }

  function renderRow(anime) {
    var li = document.createElement('li');
    li.className = 'anime-row';

    var titleHtml = escapeHtml(anime.title);
    if (anime.url) {
      titleHtml =
        '<a href="' +
        escapeAttr(anime.url) +
        '" target="_blank" rel="noopener noreferrer">' +
        titleHtml +
        '</a>';
    }

    var mine = myRating(anime.id);
    var editHtml = '';
    if (state.profile) {
      editHtml =
        '<label class="anime-rate">' +
        '<span class="anime-sr">Your tier</span>' +
        '<select data-anime-id="' +
        escapeAttr(anime.id) +
        '" aria-label="Your tier for ' +
        escapeAttr(anime.title) +
        '">' +
        '<option value="">Rate</option>' +
        [1, 2, 3, 4, 5]
          .map(function (t) {
            return (
              '<option value="' +
              t +
              '"' +
              (mine === t ? ' selected' : '') +
              '>T' +
              t +
              '</option>'
            );
          })
          .join('') +
        '</select>' +
        '</label>';
    }

    li.innerHTML =
      '<div class="anime-row-title">' +
      titleHtml +
      '</div>' +
      (editHtml ? '<div class="anime-row-meta">' + editHtml + '</div>' : '');

    var select = li.querySelector('select');
    if (select) {
      select.addEventListener('change', function () {
        saveRating(anime.id, select.value ? Number(select.value) : null);
      });
    }

    return li;
  }

  function renderStatus(msg, isError) {
    els.status.textContent = msg || '';
    els.status.className = 'anime-status' + (isError ? ' is-error' : msg ? ' is-ok' : '');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  async function loadData() {
    state.loading = true;
    renderStatus('Loading…');

    var results = await Promise.all([
      supabase.from('profiles').select('id, display_name').order('display_name'),
      supabase.from('animes').select('id, title, url, created_by').order('title'),
      supabase.from('ratings').select('anime_id, user_id, tier'),
    ]);

    var err = results.find(function (r) {
      return r.error;
    });
    if (err) {
      renderStatus(err.error.message, true);
      state.loading = false;
      return;
    }

    state.profiles = results[0].data || [];
    state.animes = results[1].data || [];
    state.ratings = results[2].data || [];

    if (!state.activeIds.size) {
      state.profiles.forEach(function (p) {
        state.activeIds.add(p.id);
      });
    }

    state.loading = false;
    renderStatus('');
    renderAuth();
    renderToggles();
    renderBoard();
  }

  async function refreshSession() {
    var result = await supabase.auth.getSession();
    state.session = result.data.session;
    state.profile = null;

    if (state.session) {
      var match = state.profiles.find(function (p) {
        return p.id === state.session.user.id;
      });
      if (match) state.profile = match;
      if (!match && state.profiles.length) {
        var profileResult = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('id', state.session.user.id)
          .maybeSingle();
        if (profileResult.data) {
          state.profile = profileResult.data;
          if (!state.profiles.some(function (p) { return p.id === profileResult.data.id; })) {
            state.profiles.push(profileResult.data);
          }
        }
      }
    }

    renderAuth();
    renderBoard();
  }

  async function signInWithPassword(event) {
    event.preventDefault();
    var email = $('anime-email').value.trim();
    var password = $('anime-password').value;
    var hint = $('anime-login-hint');
    hint.textContent = 'Signing in…';
    hint.className = 'anime-login-hint';

    var result = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (result.error) {
      hint.textContent = result.error.message;
      hint.className = 'anime-login-hint is-error';
      return;
    }

    hint.textContent = '';
    await refreshSession();
    renderToggles();
  }

  async function signOut() {
    await supabase.auth.signOut();
    state.session = null;
    state.profile = null;
    state.loginOpen = false;
    renderAuth();
    renderBoard();
  }

  async function saveRating(animeId, tier) {
    if (!state.profile) return;
    renderStatus('Saving…');

    if (tier === null) {
      var del = await supabase
        .from('ratings')
        .delete()
        .eq('anime_id', animeId)
        .eq('user_id', state.profile.id);
      if (del.error) {
        renderStatus(del.error.message, true);
        return;
      }
      state.ratings = state.ratings.filter(function (r) {
        return !(r.anime_id === animeId && r.user_id === state.profile.id);
      });
    } else {
      var upsert = await supabase.from('ratings').upsert(
        {
          anime_id: animeId,
          user_id: state.profile.id,
          tier: tier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'anime_id,user_id' }
      );
      if (upsert.error) {
        renderStatus(upsert.error.message, true);
        return;
      }
      var found = false;
      state.ratings = state.ratings.map(function (r) {
        if (r.anime_id === animeId && r.user_id === state.profile.id) {
          found = true;
          return { anime_id: animeId, user_id: state.profile.id, tier: tier };
        }
        return r;
      });
      if (!found) {
        state.ratings.push({ anime_id: animeId, user_id: state.profile.id, tier: tier });
      }
    }

    renderStatus('Saved.');
    renderToggles();
    renderBoard();
  }

  function imdbIdFromUrl(url) {
    var match = String(url).match(/imdb\.com\/title\/(tt\d{7,8})/i);
    return match ? match[1] : null;
  }

  function normalizeImdbUrl(imdbId) {
    return 'https://www.imdb.com/title/' + imdbId + '/';
  }

  function existingAnimeByImdbId(imdbId) {
    return state.animes.find(function (anime) {
      return anime.url && imdbIdFromUrl(anime.url) === imdbId;
    });
  }

  function hasOmdbKey() {
    return !!(config.omdbApiKey && config.omdbApiKey !== 'YOUR_OMDB_KEY_HERE');
  }

  async function maybePrefillTitle() {
    if (!hasOmdbKey()) return;
    var urlInput = $('anime-url');
    var titleInput = $('anime-title');
    if (!urlInput || !titleInput) return;

    var url = urlInput.value.trim();
    if (!url || titleInput.value.trim()) return;

    try {
      var show = await fetchImdbShow(url);
      titleInput.value = show.title;
      updateAddFormState();
    } catch (_) {
      /* leave title blank for manual entry */
    }
  }

  async function resolveShow(imdbUrl, manualTitle) {
    var imdbId = imdbIdFromUrl(imdbUrl);
    if (!imdbId) {
      throw new Error('Paste a valid IMDb URL (imdb.com/title/tt...).');
    }

    if (hasOmdbKey()) {
      try {
        return await fetchImdbShow(imdbUrl);
      } catch (err) {
        var fallbackTitle = (manualTitle || '').trim();
        if (!fallbackTitle) throw err;
        return {
          title: fallbackTitle,
          url: normalizeImdbUrl(imdbId),
          imdbId: imdbId,
        };
      }
    }

    var title = (manualTitle || '').trim();
    if (!title) {
      throw new Error('Enter the show title.');
    }

    return {
      title: title,
      url: normalizeImdbUrl(imdbId),
      imdbId: imdbId,
    };
  }

  async function fetchImdbShow(imdbUrl) {
    var imdbId = imdbIdFromUrl(imdbUrl);
    if (!imdbId) {
      throw new Error('Paste a valid IMDb URL (imdb.com/title/tt...).');
    }

    if (!hasOmdbKey()) {
      throw new Error('Enter the show title.');
    }

    var response = await fetch(
      'https://www.omdbapi.com/?i=' +
        encodeURIComponent(imdbId) +
        '&apikey=' +
        encodeURIComponent(config.omdbApiKey)
    );

    if (!response.ok) {
      throw new Error('Could not reach OMDB to look up that IMDb title.');
    }

    var payload = await response.json();
    if (!payload || payload.Response === 'False') {
      throw new Error((payload && payload.Error) || 'IMDb title not found.');
    }

    return {
      title: payload.Title,
      url: normalizeImdbUrl(imdbId),
      imdbId: imdbId,
    };
  }

  async function addAnime(event) {
    event.preventDefault();
    if (!state.profile) return;

    var imdbUrl = $('anime-url').value.trim();
    var titleInput = $('anime-title').value.trim();
    var tierValue = $('anime-tier').value;
    var tier = tierValue ? Number(tierValue) : null;

    if (!titleInput || !imdbUrl) {
      renderStatus('Title and IMDb URL are required.', true);
      return;
    }

    renderStatus(hasOmdbKey() ? 'Fetching title from IMDb…' : 'Adding…');

    var show;
    try {
      show = await resolveShow(imdbUrl, titleInput);
    } catch (err) {
      renderStatus(err.message, true);
      return;
    }

    var existing = existingAnimeByImdbId(show.imdbId);
    if (existing) {
      renderStatus('That show is already in the list. Set your tier on the card below.', true);
      return;
    }

    renderStatus('Adding ' + show.title + '…');

    var insert = await supabase
      .from('animes')
      .insert({
        title: show.title,
        url: show.url,
        created_by: state.profile.id,
      })
      .select('id, title, url, created_by')
      .single();

    if (insert.error) {
      renderStatus(insert.error.message, true);
      return;
    }

    state.animes.push(insert.data);

    if (tier) {
      var rating = await supabase.from('ratings').insert({
        anime_id: insert.data.id,
        user_id: state.profile.id,
        tier: tier,
      });

      if (rating.error) {
        renderStatus(rating.error.message, true);
        return;
      }

      state.ratings.push({
        anime_id: insert.data.id,
        user_id: state.profile.id,
        tier: tier,
      });
    }

    $('anime-add-form').reset();
    updateAddFormState();
    renderStatus('Added.');
    renderToggles();
    renderBoard();
  }

  function updateAddFormState() {
    if (!els.addBtn) return;
    var title = $('anime-title').value.trim();
    var url = $('anime-url').value.trim();
    els.addBtn.disabled = !title || !url;
  }

  function bindElements() {
    els.auth = $('anime-auth');
    els.toggles = $('anime-toggles');
    els.board = $('anime-board');
    els.status = $('anime-status');
    els.editor = $('anime-editor');
    els.addBtn = $('anime-add-btn');
    $('anime-add-form').addEventListener('submit', addAnime);
    $('anime-url').addEventListener('blur', maybePrefillTitle);
    $('anime-title').addEventListener('input', updateAddFormState);
    $('anime-url').addEventListener('input', updateAddFormState);
    updateAddFormState();
  }

  async function init() {
    bindElements();
    await loadData();
    await refreshSession();

    supabase.auth.onAuthStateChange(function () {
      refreshSession();
    });
  }

  init();
})();
