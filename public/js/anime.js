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

  var PROFILE_ORDER = ['Kan', 'Demi', 'Goku', 'Orhan'];

  var config = window.ANIME_CONFIG;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
    var root = document.querySelector('.anime-page');
    if (root) {
      root.innerHTML =
        '<p class="anime-error">Missing config. <code>anime-config.js</code> must define <code>supabaseUrl</code> and <code>supabaseAnonKey</code>.</p>';
    }
    return;
  }

  var supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  var state = {
    profiles: [],
    animes: [],
    ratings: [],
    tags: [],
    activeIds: new Set(),
    session: null,
    profile: null,
    loginOpen: false,
    loading: true,
    tagEditAnimeId: null,
    searchQuery: '',
  };

  var els = {};
  var pendingTier = null;
  var adding = false;

  function $(id) {
    return document.getElementById(id);
  }

  function profileInitial(displayName) {
    return String(displayName).charAt(0).toUpperCase();
  }

  function tagsForAnime(animeId) {
    return state.tags
      .filter(function (t) {
        return t.anime_id === animeId;
      })
      .map(function (t) {
        var profile = state.profiles.find(function (p) {
          return p.id === t.user_id;
        });
        return {
          anime_id: t.anime_id,
          user_id: t.user_id,
          tag: t.tag,
          initial: profile ? profileInitial(profile.display_name) : '?',
          display_name: profile ? profile.display_name : '',
        };
      })
      .sort(function (a, b) {
        return PROFILE_ORDER.indexOf(a.display_name) - PROFILE_ORDER.indexOf(b.display_name);
      });
  }

  function myTag(animeId) {
    if (!state.profile) return null;
    return state.tags.find(function (t) {
      return t.anime_id === animeId && t.user_id === state.profile.id;
    });
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
    var editingTagAnimeId = state.tagEditAnimeId;
    board.querySelectorAll('.anime-tier[open]').forEach(function (el) {
      openSections.add(el.dataset.tier);
    });

    board.innerHTML = '';
    state.tagEditAnimeId = editingTagAnimeId;

    var buckets = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    var unrated = [];
    state.animes.forEach(function (anime) {
      if (!animeMatchesSearch(anime)) return;
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

  function renderTagEditor(anime, container) {
    var mine = myTag(anime.id);
    var form = document.createElement('form');
    form.className = 'anime-tag-form';
    form.innerHTML =
      '<input type="text" class="anime-tag-input" maxlength="32" placeholder="Short tag" value="' +
      escapeAttr(mine ? mine.tag : '') +
      '" aria-label="Tag for ' +
      escapeAttr(anime.title) +
      '">' +
      '<button type="submit" class="anime-btn anime-tag-save">Save</button>' +
      (mine
        ? '<button type="button" class="anime-btn anime-tag-remove">Remove</button>'
        : '') +
      '<button type="button" class="anime-btn anime-tag-cancel">Cancel</button>';

    var input = form.querySelector('.anime-tag-input');
    form.querySelector('.anime-tag-cancel').addEventListener('click', function () {
      state.tagEditAnimeId = null;
      renderBoard();
    });
    var removeBtn = form.querySelector('.anime-tag-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        deleteTag(anime.id);
      });
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      saveTag(anime.id, input.value);
    });
    container.appendChild(form);
    input.focus();
    input.select();
  }

  function renderRowTags(anime, container) {
    var tags = tagsForAnime(anime.id);
    var editing = state.profile && state.tagEditAnimeId === anime.id;
    var mine = myTag(anime.id);

    tags.forEach(function (tag) {
      if (editing && state.profile && tag.user_id === state.profile.id) return;

      var chip = document.createElement('span');
      chip.className = 'anime-tag';
      if (state.profile && tag.user_id === state.profile.id) {
        chip.className += ' is-mine';
        chip.title = 'Edit your tag';
        chip.addEventListener('click', function () {
          state.tagEditAnimeId = anime.id;
          renderBoard();
        });
      }
      chip.textContent = tag.initial + ': ' + tag.tag;
      container.appendChild(chip);
    });

    if (editing) {
      renderTagEditor(anime, container);
      return;
    }

    if (state.profile && !mine) {
      var addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'anime-tag-add';
      addBtn.setAttribute('aria-label', 'Add tag for ' + anime.title);
      addBtn.textContent = '+';
      addBtn.addEventListener('click', function () {
        state.tagEditAnimeId = anime.id;
        renderBoard();
      });
      container.appendChild(addBtn);
    }

    if (!container.children.length) {
      container.hidden = true;
    }
  }

  function renderRow(anime) {
    var li = document.createElement('li');
    li.className = 'anime-row' + (anime.url ? ' anime-row--linked' : '');

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

    var posterHtml =
      '<div class="anime-row-poster' +
      (anime.poster_url ? '' : ' is-placeholder') +
      '">' +
      (anime.poster_url
        ? '<img src="' +
          escapeAttr(anime.poster_url) +
          '" alt="" loading="lazy" decoding="async">'
        : '') +
      '</div>';

    li.innerHTML =
      (anime.url
        ? '<a class="anime-row-link" href="' +
          escapeAttr(anime.url) +
          '" target="_blank" rel="noopener noreferrer" aria-label="' +
          escapeAttr(anime.title + ' on IMDb') +
          '"></a>'
        : '') +
      posterHtml +
      '<div class="anime-row-main">' +
      '<div class="anime-row-title">' +
      escapeHtml(anime.title) +
      '</div>' +
      '<div class="anime-row-tags"></div>' +
      '</div>' +
      (editHtml ? '<div class="anime-row-meta">' + editHtml + '</div>' : '');

    renderRowTags(anime, li.querySelector('.anime-row-tags'));

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
      supabase.from('animes').select('id, title, url, poster_url, created_by').order('title'),
      supabase.from('ratings').select('anime_id, user_id, tier'),
      supabase.from('anime_tags').select('anime_id, user_id, tag'),
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
    state.tags = results[3].data || [];

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

  async function saveTag(animeId, rawTag) {
    if (!state.profile) return;

    var tag = rawTag.trim();
    if (!tag) {
      await deleteTag(animeId);
      return;
    }

    if (tag.length > 32) {
      renderStatus('Tag must be 32 characters or fewer.', true);
      return;
    }

    renderStatus('Saving tag…');

    var upsert = await supabase.from('anime_tags').upsert(
      {
        anime_id: animeId,
        user_id: state.profile.id,
        tag: tag,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'anime_id,user_id' }
    );

    if (upsert.error) {
      renderStatus(upsert.error.message, true);
      return;
    }

    var found = false;
    state.tags = state.tags.map(function (t) {
      if (t.anime_id === animeId && t.user_id === state.profile.id) {
        found = true;
        return { anime_id: animeId, user_id: state.profile.id, tag: tag };
      }
      return t;
    });
    if (!found) {
      state.tags.push({ anime_id: animeId, user_id: state.profile.id, tag: tag });
    }

    state.tagEditAnimeId = null;
    renderStatus('Tag saved.');
    renderBoard();
  }

  async function deleteTag(animeId) {
    if (!state.profile) return;

    renderStatus('Removing tag…');

    var del = await supabase
      .from('anime_tags')
      .delete()
      .eq('anime_id', animeId)
      .eq('user_id', state.profile.id);

    if (del.error) {
      renderStatus(del.error.message, true);
      return;
    }

    state.tags = state.tags.filter(function (t) {
      return !(t.anime_id === animeId && t.user_id === state.profile.id);
    });

    state.tagEditAnimeId = null;
    renderStatus('Tag removed.');
    renderBoard();
  }

  function imdbIdFromUrl(url) {
    var match = String(url).match(/imdb\.com\/title\/(tt\d{7,8})/i);
    return match ? match[1] : null;
  }

  function normalizeImdbUrl(imdbId) {
    return 'https://www.imdb.com/title/' + imdbId + '/';
  }

  function normalizeTitle(title) {
    return String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function existingAnimeByImdbId(imdbId) {
    return state.animes.find(function (anime) {
      return anime.url && imdbIdFromUrl(anime.url) === imdbId;
    });
  }

  function existingAnimeByTitle(title) {
    var normalized = normalizeTitle(title);
    if (!normalized) return null;
    return state.animes.find(function (anime) {
      return normalizeTitle(anime.title) === normalized;
    });
  }

  function existingAnimeConflict(show) {
    return existingAnimeByImdbId(show.imdbId) || existingAnimeByTitle(show.title);
  }

  function animeMatchesSearch(anime) {
    if (!state.searchQuery) return true;
    return normalizeTitle(anime.title).indexOf(normalizeTitle(state.searchQuery)) !== -1;
  }

  function hasOmdbKey() {
    return !!(config.omdbApiKey && config.omdbApiKey !== 'YOUR_OMDB_KEY_HERE');
  }

  function showFromOmdbPayload(payload) {
    return {
      title: payload.Title,
      year: payload.Year,
      url: normalizeImdbUrl(payload.imdbID),
      imdbId: payload.imdbID,
      type: payload.Type,
    };
  }

  function showFromOmdbSearchItem(item) {
    return {
      title: item.Title,
      year: item.Year,
      url: normalizeImdbUrl(item.imdbID),
      imdbId: item.imdbID,
      type: item.Type,
      posterUrl: item.Poster && item.Poster !== 'N/A' ? item.Poster : '',
    };
  }

  async function omdbRequest(params) {
    var query = Object.keys(params)
      .map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
      })
      .join('&');

    var response = await fetch(
      'https://www.omdbapi.com/?' + query + '&apikey=' + encodeURIComponent(config.omdbApiKey)
    );

    if (!response.ok) {
      throw new Error('Could not reach OMDB to look up that title.');
    }

    return response.json();
  }

  function uniqueShows(shows) {
    var seen = new Set();
    return shows.filter(function (show) {
      if (seen.has(show.imdbId)) return false;
      seen.add(show.imdbId);
      return true;
    });
  }

  function imdbJsonpCallbackName(query) {
    var words = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return 'imdb$';
    if (words.length <= 2) {
      return 'imdb$' + words.join('_');
    }
    return 'imdb$' + words.slice(0, 2).join('_') + '%20' + words.slice(2).join('%20');
  }

  function imdbPosterUrl(item) {
    if (!item.i) return '';
    if (typeof item.i === 'object' && item.i.imageUrl) return item.i.imageUrl;
    if (Array.isArray(item.i) && item.i[0]) return item.i[0];
    return '';
  }

  function showFromImdbItem(item) {
    var type = item.qid === 'movie' ? 'movie' : 'series';
    return {
      title: item.l,
      year: item.y ? String(item.y) : item.yr || '',
      url: normalizeImdbUrl(item.id),
      imdbId: item.id,
      type: type,
      posterUrl: imdbPosterUrl(item),
    };
  }

  function parseImdbSuggestResults(data) {
    if (!data || !data.d) return [];

    return uniqueShows(
      data.d
        .filter(function (item) {
          return item.id && /^tt\d+$/.test(item.id);
        })
        .filter(function (item) {
          return item.qid === 'tvSeries' || item.qid === 'tvMiniSeries' || item.qid === 'movie';
        })
        .map(showFromImdbItem)
        .slice(0, 8)
    );
  }

  function imdbSuggestJsonp(title) {
    return new Promise(function (resolve, reject) {
      var cbName = imdbJsonpCallbackName(title);
      var script = document.createElement('script');
      var timeout = setTimeout(function () {
        cleanup();
        reject(new Error('IMDb search timed out.'));
      }, 12000);

      function cleanup() {
        clearTimeout(timeout);
        try {
          delete window[cbName];
        } catch (_) {
          window[cbName] = undefined;
        }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) {
        cleanup();
        resolve(data);
      };

      script.src =
        'https://sg.media-imdb.com/suggests/a/' +
        encodeURIComponent(title.trim().toLowerCase()) +
        '.json';
      script.onerror = function () {
        cleanup();
        reject(new Error('Could not reach IMDb search.'));
      };
      document.head.appendChild(script);
    });
  }

  async function fetchImdbSuggest(title) {
    var query = title.trim();
    var url = 'https://v3.sg.media-imdb.com/suggestion/a/' + encodeURIComponent(query) + '.json';

    try {
      var response = await fetch(url);
      if (!response.ok) {
        throw new Error('IMDb search failed.');
      }
      return response.json();
    } catch (_) {
      return imdbSuggestJsonp(query);
    }
  }

  async function searchOmdbByTitle(title) {
    var exact = await omdbRequest({ t: title, type: 'series' });
    if (exact && exact.Response === 'True' && exact.imdbID) {
      return [showFromOmdbPayload(exact)];
    }

    var search = await omdbRequest({ s: title, type: 'series' });
    var items = search && search.Search ? search.Search : [];

    if (!items.length) {
      var broad = await omdbRequest({ s: title });
      items = broad && broad.Search ? broad.Search : [];
    }

    return uniqueShows(
      items
        .filter(function (item) {
          return item.Type === 'series' || item.Type === 'movie';
        })
        .map(showFromOmdbSearchItem)
        .slice(0, 8)
    );
  }

  async function searchShowsByTitle(title) {
    var shows = [];

    try {
      var imdbData = await fetchImdbSuggest(title);
      shows = parseImdbSuggestResults(imdbData);
    } catch (err) {
      if (!hasOmdbKey()) {
        throw err;
      }
    }

    if (!shows.length && hasOmdbKey()) {
      shows = await searchOmdbByTitle(title);
    }

    return shows;
  }

  function resetAddForm() {
    $('anime-add-form').reset();
    hidePickList();
    updateAddFormState();
  }

  function hidePickList() {
    if (!els.pick) return;
    els.pick.hidden = true;
    $('anime-pick-list').innerHTML = '';
    pendingTier = null;
  }

  function showPickList(shows, tier) {
    pendingTier = tier;
    els.pick.hidden = false;
    renderStatus('');

    var list = $('anime-pick-list');
    list.innerHTML = '';

    shows.forEach(function (show) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'anime-pick-item';
      btn.setAttribute('role', 'option');

      var poster = document.createElement('img');
      poster.className = 'anime-pick-item-poster';
      poster.alt = '';
      poster.loading = 'lazy';
      if (show.posterUrl) {
        poster.src = show.posterUrl;
      } else {
        poster.classList.add('is-placeholder');
      }

      var body = document.createElement('span');
      body.className = 'anime-pick-item-body';

      var label = document.createElement('span');
      label.className = 'anime-pick-item-title';
      label.textContent = show.title;

      var meta = document.createElement('span');
      meta.className = 'anime-pick-item-meta';
      meta.textContent = [show.year, show.type].filter(Boolean).join(' · ');

      body.appendChild(label);
      body.appendChild(meta);
      btn.appendChild(poster);
      btn.appendChild(body);
      btn.addEventListener('click', function () {
        finalizeAdd(show, tier);
      });
      list.appendChild(btn);
    });
  }

  async function finalizeAdd(show, tier) {
    if (!state.profile) return;

    var existing = existingAnimeConflict(show);
    if (existing) {
      hidePickList();
      renderStatus(
        '“' + existing.title + '” is already in the list. Set your tier on the card below.',
        true
      );
      return;
    }

    hidePickList();

    var insert = await supabase
      .from('animes')
      .insert({
        title: show.title,
        url: show.url,
        poster_url: show.posterUrl || null,
        created_by: state.profile.id,
      })
      .select('id, title, url, poster_url, created_by')
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

    resetAddForm();
    renderStatus('Anime added.');
    renderToggles();
    renderBoard();
  }

  async function addAnime(event) {
    event.preventDefault();
    if (!state.profile || adding) return;

    var titleInput = $('anime-title').value.trim();
    var tierValue = $('anime-tier').value;
    var tier = tierValue ? Number(tierValue) : null;

    if (!titleInput) {
      renderStatus('Enter a show title.', true);
      return;
    }

    var titleConflict = existingAnimeByTitle(titleInput);
    if (titleConflict) {
      renderStatus(
        '“' + titleConflict.title + '” is already in the list. Set your tier on the card below.',
        true
      );
      return;
    }

    hidePickList();
    adding = true;
    updateAddFormState();
    renderStatus('Searching IMDb…');

    var shows;
    try {
      shows = await searchShowsByTitle(titleInput);
    } catch (err) {
      adding = false;
      hidePickList();
      updateAddFormState();
      renderStatus(err.message, true);
      return;
    }

    adding = false;
    updateAddFormState();

    if (!shows.length) {
      renderStatus('No IMDb match for that title. Try a different spelling or the English title.', true);
      return;
    }

    if (shows.length === 1) {
      await finalizeAdd(shows[0], tier);
      return;
    }

    showPickList(shows, tier);
  }

  function updateAddFormState() {
    if (!els.addBtn) return;
    var title = $('anime-title').value.trim();
    els.addBtn.disabled = !title || adding;
  }

  function bindElements() {
    els.auth = $('anime-auth');
    els.toggles = $('anime-toggles');
    els.board = $('anime-board');
    els.status = $('anime-status');
    els.editor = $('anime-editor');
    els.pick = $('anime-pick');
    els.addBtn = $('anime-add-btn');
    els.search = $('anime-search');
    $('anime-add-form').addEventListener('submit', addAnime);
    $('anime-title').addEventListener('input', function () {
      hidePickList();
      updateAddFormState();
    });
    els.search.addEventListener('input', function () {
      state.searchQuery = els.search.value.trim();
      renderBoard();
    });
    $('anime-pick-cancel').addEventListener('click', function () {
      hidePickList();
      renderStatus('');
      $('anime-title').focus();
    });
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
