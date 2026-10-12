import { resolveTokenConfig } from './token-config.mjs';

(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const views = ['world', 'studio', 'wardrobe', 'reels', 'token'];
  const scenes = {
    paper: { name: 'Paper studio', image: null, id: 'SCENE_001' },
    rooftop: { name: 'Rooftop sunset', image: 'assets/studio/scene-rooftop.webp', id: 'SCENE_002' },
    dolomites: { name: 'The Dolomites', image: 'assets/studio/scene-dolomites.webp', id: 'SCENE_003' }
  };
  const looks = {
    signature: { name: 'Signature', image: 'assets/studio/erika-signature.webp' },
    afterhours: { name: 'After hours', image: 'assets/studio/erika-afterhours.webp' },
    pinkline: { name: 'Pinkline', image: 'assets/studio/erika-pinkline.webp' }
  };
  const films = [
    { id: 'mercer-genetics', name: 'Mercer genetics', category: ['action'], label: 'Action', time: '00:07', poster: 'assets/parkour.jpg', src: 'media/mercer-genetics.mp4', description: 'A rooftop gap. A little confidence. An impossible landing.' },
    { id: 'runs-in-the-family', name: 'Runs in the family', category: ['dance'], label: 'Two Mercers', time: '00:12', poster: 'assets/family.jpg', src: 'media/runs-in-the-family.mp4', description: 'Two Mercers, one room and a shared sense of attitude.' },
    { id: 'move-mountains', name: 'Move mountains', category: ['dance', 'outside'], label: 'Dolomites', time: '00:05', poster: 'assets/mountains.jpg', src: 'media/move-mountains.mp4', description: 'A change of scenery. The same unmistakable character.' },
    { id: 'scaredy-cat', name: 'Scaredy cat?', category: ['outside'], label: 'Everyday chaos', time: '00:12', poster: 'assets/posters/scaredy-cat.jpg', src: 'media/scaredy-cat.mp4', description: 'Sunset, a cat and a moment of unexpected confidence.' },
    { id: 'sparring', name: 'F around and find out', category: ['action'], label: 'Sparring', time: '00:12', poster: 'assets/posters/sparring.jpg', src: 'media/sparring.mp4', description: 'The sparring side of Erika. Keep an eye on the next move.' },
    { id: 'shaolin', name: 'A different kind of lesson', category: ['action', 'outside'], label: 'Shaolin scene', time: '00:19', poster: 'assets/posters/shaolin.jpg', src: 'media/shaolin.mp4', description: 'A quiet courtyard. A very different kind of challenge.' }
  ];
  const heroScenes = {
    portrait: { src: 'media/portrait-loop.mp4', poster: 'assets/posters/portrait-loop.jpg', caption: '01 / THE FACE' },
    rooftop: { src: 'media/mercer-genetics.mp4', poster: 'assets/parkour.jpg', caption: '02 / ROOFTOP GAP' },
    dolomites: { src: 'media/move-mountains.mp4', poster: 'assets/mountains.jpg', caption: '03 / NEW WORLD' }
  };
  const store = {
    read(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } },
    write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser storage is optional. */ } }
  };
  const state = store.read('erika-club-studio-v1', { scene: 'paper', cast: 'erika', look: 'signature' });
  function normalizeState() {
    if (!scenes[state.scene]) state.scene = 'paper';
    if (!['erika', 'derek'].includes(state.cast)) state.cast = 'erika';
    if (!looks[state.look] || state.cast === 'derek') state.look = 'signature';
  }
  normalizeState();
  let activeView = 'world';
  let favorites = new Set(store.read('erika-club-favorites-v1', []).filter(v => looks[v]));
  let wardrobeFilter = 'all';
  let currentFilm = null;
  let toastTimer;
  let imageChange = 0;
  const heroVideo = $('#hero-video');
  const cinemaVideo = $('#cinema-video');
  const cinema = $('#cinema-dialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = store.read('erika-club-motion-paused', reducedMotion.matches);

  function toast(message) {
    const target = $('#toast');
    target.textContent = message;
    target.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => target.classList.remove('show'), 3400);
  }
  function startHero() {
    if (activeView === 'world' && !motionPaused && !cinema.open) heroVideo.play().catch(() => {});
    else heroVideo.pause();
  }
  function setMotion(value) {
    motionPaused = value;
    document.body.classList.toggle('motion-paused', value);
    $('#motion-toggle').setAttribute('aria-pressed', String(value));
    $('#motion-toggle').setAttribute('aria-label', value ? 'Resume decorative animations' : 'Pause decorative animations');
    store.write('erika-club-motion-paused', value);
    if (value) $$('.reel-preview-video').forEach(v => v.pause());
    startHero();
  }
  $('#motion-toggle').addEventListener('click', () => setMotion(!motionPaused));
  setMotion(motionPaused);

  function setView(name, { scroll = true } = {}) {
    if (!views.includes(name)) return;
    if (activeView !== name) {
      if (cinema.open) closeCinema();
      if ($('#studio-stage').classList.contains('expanded')) toggleStage(false);
    }
    activeView = name;
    document.body.dataset.view = name;
    $$('.view').forEach(panel => { panel.hidden = panel.id !== `view-${name}`; panel.classList.toggle('active', !panel.hidden); });
    $$('.main-nav [role="tab"]').forEach(tab => {
      const selected = tab.dataset.view === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    $$('.reel-preview-video').forEach(v => v.pause());
    startHero();
    if (name === 'studio') updateStudio(false);
    if (name === 'token') refreshToken();
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = name === 'world' ? 'Erika Mercer · The other Mercer' : `${({studio:'Studio',wardrobe:'Wardrobe',reels:'Film room',token:'Erika Club token'})[name]} · Erika Mercer`;
  }
  function route() {
    const fragment = window.location.hash.slice(1) || 'world';
    const [name, query = ''] = fragment.split('?');
    if (views.includes(name)) {
      if (name === 'studio' && query) {
        const params = new URLSearchParams(query);
        ['scene', 'cast', 'look'].forEach(k => { if (params.has(k)) state[k] = params.get(k); });
        normalizeState();
      }
      setView(name);
    } else {
      const target = document.getElementById(name);
      const panel = target?.closest('.view');
      if (panel) {
        setView(panel.id.replace('view-', ''), { scroll: false });
        requestAnimationFrame(() => target.scrollIntoView({ behavior: motionPaused ? 'instant' : 'smooth', block: 'start' }));
      }
    }
  }
  window.addEventListener('hashchange', route);
  $$('.main-nav [data-view]').forEach(tab => tab.addEventListener('click', () => {
    const name = tab.dataset.view;
    if (window.location.hash === `#${name}`) setView(name);
    else window.location.hash = name;
  }));
  $('.main-nav').addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = views.indexOf(activeView);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
    window.location.hash = views[next];
    $(`#tab-${views[next]}`).focus();
  });

  $$('[data-hero-scene]').forEach(button => button.addEventListener('click', () => {
    const config = heroScenes[button.dataset.heroScene];
    $$('[data-hero-scene]').forEach(b => b.classList.toggle('selected', b === button));
    heroVideo.poster = config.poster;
    heroVideo.src = config.src;
    heroVideo.load();
    $('#hero-caption').textContent = config.caption;
    startHero();
  }));
  $('#sound-toggle').addEventListener('click', () => {
    heroVideo.muted = !heroVideo.muted;
    const on = !heroVideo.muted;
    $('#sound-toggle').setAttribute('aria-pressed', String(on));
    $('#sound-toggle').setAttribute('aria-label', on ? 'Turn off video sound' : 'Turn on video sound');
    $('#sound-toggle span').textContent = on ? 'SOUND ON' : 'SOUND OFF';
    if (on) heroVideo.play().catch(() => toast('Press the video to start playback.'));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { heroVideo.pause(); $$('.reel-preview-video').forEach(v => v.pause()); }
    else startHero();
  });

  function figureSource() { return state.cast === 'derek' ? 'assets/studio/derek-signature.webp' : looks[state.look].image; }
  function studioQuery() { return new URLSearchParams({ scene: state.scene, cast: state.cast, look: state.look }).toString(); }
  function updateStudio(syncHash = true) {
    normalizeState();
    const stage = $('#studio-stage');
    stage.dataset.scene = state.scene;
    $('#scene-background').style.backgroundImage = scenes[state.scene].image ? `url('${scenes[state.scene].image}')` : '';
    $('#stage-caption').textContent = `${state.cast === 'erika' ? 'Erika' : 'Derek'} / ${looks[state.look].name}`;
    $('#stage-world').textContent = scenes[state.scene].name;
    $('#scene-id').textContent = scenes[state.scene].id;
    $('#scene-count').textContent = `${Object.keys(scenes).indexOf(state.scene) + 1} OF 3`;
    $('#look-count').textContent = state.cast === 'derek' ? 'SIGNATURE LOOK' : '3 LOOKS';
    $('#cast-hint').textContent = state.cast === 'derek' ? 'Derek keeps his signature green M. Switch to Erika for three looks.' : 'An unmistakable face. A different mood.';
    $('#stage-word').textContent = state.cast === 'erika' ? 'MERCER' : 'DEREK';
    $$('[data-scene]').filter(b => b.tagName === 'BUTTON').forEach(button => {
      const selected = button.dataset.scene === state.scene;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
    $$('[data-cast]').forEach(button => {
      const selected = button.dataset.cast === state.cast;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
    $$('[data-look]').forEach(button => {
      const selected = button.dataset.look === state.look;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
      button.disabled = state.cast === 'derek' && button.dataset.look !== 'signature';
    });
    const figure = $('#studio-figure');
    const src = figureSource();
    figure.alt = `${state.cast === 'erika' ? 'Erika' : 'Derek'} in the ${looks[state.look].name} outfit`;
    if (figure.getAttribute('src') !== src) {
      const version = ++imageChange;
      figure.classList.add('changing');
      const image = new Image();
      image.onload = () => {
        if (version !== imageChange) return;
        figure.src = src;
        requestAnimationFrame(() => figure.classList.remove('changing'));
      };
      image.onerror = () => { figure.classList.remove('changing'); toast('This look could not load. Please try again.'); };
      image.src = src;
    }
    store.write('erika-club-studio-v1', state);
    if (syncHash && activeView === 'studio') history.replaceState(null, '', `#studio?${studioQuery()}`);
  }
  $$('button[data-scene]').forEach(button => button.addEventListener('click', () => { state.scene = button.dataset.scene; updateStudio(); }));
  $$('button[data-cast]').forEach(button => button.addEventListener('click', () => { state.cast = button.dataset.cast; updateStudio(); }));
  $$('button[data-look]').forEach(button => button.addEventListener('click', () => { state.look = button.dataset.look; updateStudio(); }));
  $('#shuffle-studio').addEventListener('click', () => {
    const options = [];
    Object.keys(scenes).forEach(scene => {
      Object.keys(looks).forEach(look => options.push({scene,look,cast:'erika'}));
      options.push({scene,look:'signature',cast:'derek'});
    });
    const other = options.filter(s => JSON.stringify(s) !== JSON.stringify({scene:state.scene,look:state.look,cast:state.cast}));
    Object.assign(state, other[Math.floor(Math.random() * other.length)]);
    updateStudio();
    toast('A new version of the world.');
  });
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {
      const field = document.createElement('textarea');
      field.value = text; field.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(field);
      field.select(); let copied = false;
      try { copied = document.execCommand('copy'); } catch {}
      field.remove(); return copied;
    }
  }
  $('#share-studio').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#studio?${studioQuery()}`;
    toast(await copyText(url) ? 'Scene link copied. Share your version.' : 'Copy the link from your browser address bar.');
  });
  function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }
  function fillCrop(ctx, image, x, y, w, h) {
    const scale = Math.max(w / image.width, h / image.height);
    const sw = w / scale, sh = h / scale;
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
  }
  $('#save-card').addEventListener('click', async () => {
    const button = $('#save-card');
    const previous = button.innerHTML;
    button.disabled = true; button.textContent = 'Creating your card…';
    try {
      const snapshot = { ...state };
      const scene = scenes[snapshot.scene];
      const src = snapshot.cast === 'derek' ? 'assets/studio/derek-signature.webp' : looks[snapshot.look].image;
      const [figure, background] = await Promise.all([loadImage(src), scene.image ? loadImage(scene.image) : Promise.resolve(null)]);
      await document.fonts.load('100px Mercer');
      const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#eeeae2'; ctx.fillRect(0, 0, 1080, 1350);
      if (background) fillCrop(ctx, background, 27, 27, 1026, 1170);
      else {
        const gradient = ctx.createLinearGradient(27, 27, 1053, 1197); gradient.addColorStop(0, '#e2dcd2'); gradient.addColorStop(1, '#beb7ab');
        ctx.fillStyle = gradient; ctx.fillRect(27, 27, 1026, 1170);
        ctx.strokeStyle = '#10101415'; ctx.lineWidth = 1;
        for (let y = 27; y < 1197; y += 78) { ctx.beginPath(); ctx.moveTo(27, y); ctx.lineTo(1053, y); ctx.stroke(); }
      }
      ctx.fillStyle = background ? '#0007' : '#10101409'; ctx.fillRect(27, 27, 1026, 1170);
      ctx.textAlign = 'center'; ctx.font = '160px Mercer'; ctx.fillStyle = background ? '#f4f0e63b' : '#1010142b'; ctx.fillText('Mercer', 540, 330);
      ctx.strokeStyle = '#f14c9d99'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(540, 581, 350, 0, Math.PI * 2); ctx.stroke();
      const h = 1030, w = h * figure.width / figure.height;
      ctx.drawImage(figure, (1080 - w) / 2, 148, w, h);
      ctx.textAlign = 'left'; ctx.font = 'bold 24px Courier New'; ctx.fillStyle = background ? '#eeeae2' : '#101014';
      ctx.fillText('ERIKA CLUB / MAKE A SCENE', 62, 83);
      ctx.fillStyle = '#f14c9d'; ctx.fillRect(62, 113, 150, 5);
      ctx.fillStyle = '#101014'; ctx.font = '56px Mercer';
      ctx.fillText(snapshot.cast === 'erika' ? 'Erika Mercer' : 'Derek Mercer', 48, 1258);
      ctx.font = '20px Courier New'; ctx.fillText(`${looks[snapshot.look].name.toUpperCase()} / ${scene.name.toUpperCase()}`, 49, 1301);
      ctx.textAlign = 'right'; ctx.font = '19px Courier New'; ctx.fillStyle = '#a22d65'; ctx.fillText('erikamercer.club', 1032, 1301);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .9));
      if (!blob) throw new Error('Image export unavailable');
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url;
      link.download = `erika-club-${snapshot.cast}-${snapshot.look}-${snapshot.scene}.jpg`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast('Your scene card is ready.');
    } catch { toast('The card could not be created. Please try again after the images load.'); }
    finally { button.disabled = false; button.innerHTML = previous; }
  });
  function toggleStage(force) {
    const stage = $('#studio-stage'); const expanded = typeof force === 'boolean' ? force : !stage.classList.contains('expanded');
    stage.classList.toggle('expanded', expanded);
    $('#stage-fullscreen').textContent = expanded ? '×' : '↗';
    $('#stage-fullscreen').setAttribute('aria-label', expanded ? 'Close expanded studio' : 'Expand studio');
    stage.setAttribute('role', expanded ? 'dialog' : 'region');
    stage.setAttribute('aria-label', 'Character studio');
    if (expanded) stage.setAttribute('aria-modal', 'true'); else stage.removeAttribute('aria-modal');
    document.body.style.overflow = expanded ? 'hidden' : '';
    $('#stage-fullscreen').focus();
  }
  $('#stage-fullscreen').addEventListener('click', () => toggleStage());

  function updateFavorites() {
    $('#saved-count').textContent = favorites.size;
    $$('[data-favorite]').forEach(button => {
      const saved = favorites.has(button.dataset.favorite);
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${looks[button.dataset.favorite].name} ${saved ? 'from' : 'to'} favourites`);
    });
    $$('[data-outfit]').forEach(card => { card.hidden = wardrobeFilter === 'saved' && !favorites.has(card.dataset.outfit); });
    $('#empty-wardrobe').hidden = wardrobeFilter !== 'saved' || favorites.size > 0;
    store.write('erika-club-favorites-v1', [...favorites]);
  }
  $$('[data-favorite]').forEach(button => button.addEventListener('click', () => {
    const look = button.dataset.favorite;
    if (favorites.has(look)) favorites.delete(look); else favorites.add(look);
    updateFavorites();
  }));
  function filterWardrobe(name) {
    wardrobeFilter = name;
    $$('[data-wardrobe-filter]').forEach(button => { const selected = button.dataset.wardrobeFilter === name; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
    updateFavorites();
  }
  $$('[data-wardrobe-filter]').forEach(button => button.addEventListener('click', () => filterWardrobe(button.dataset.wardrobeFilter)));
  $('[data-show-all-looks]').addEventListener('click', () => filterWardrobe('all'));
  $$('[data-try-look]').forEach(button => button.addEventListener('click', () => {
    state.cast = 'erika'; state.look = button.dataset.tryLook;
    normalizeState(); updateStudio(false);
    window.location.hash = `studio?${studioQuery()}`;
  }));
  updateFavorites();

  $('#reels-grid').innerHTML = films.map((film, index) => `<article class="reel" id="${film.id}" data-categories="${film.category.join(' ')}"><button class="reel-media" data-open-reel="${film.id}" aria-label="Watch ${film.name}"><img src="${film.poster}" alt="Scene from ${film.name}" loading="lazy"><video class="reel-preview-video" data-src="${film.src}" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video><span class="reel-category">${String(index + 1).padStart(2, '0')} / ${film.label}</span><span class="reel-play"><svg aria-hidden="true"><use href="#i-play"/></svg></span><span class="reel-time">${film.time}</span></button><div class="reel-info"><h2>${film.name}</h2><p>${film.description}</p><button class="text-link" data-open-reel="${film.id}">Watch full scene <svg aria-hidden="true"><use href="#i-diagonal"/></svg></button></div></article>`).join('');
  function filterFilms(name) {
    let count = 0;
    $$('.reel').forEach(card => { card.hidden = name !== 'all' && !card.dataset.categories.split(' ').includes(name); if (!card.hidden) count++; });
    $$('[data-reel-filter]').forEach(button => { const selected = button.dataset.reelFilter === name; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
    $('#reels-count').textContent = `${count} SCENES`;
    $$('.reel-preview-video').forEach(v => v.pause());
  }
  $$('[data-reel-filter]').forEach(button => button.addEventListener('click', () => filterFilms(button.dataset.reelFilter)));
  let cinemaTrigger = null;
  function openCinema(id, trigger) {
    const film = films.find(f => f.id === id); if (!film) return;
    currentFilm = film; cinemaTrigger = trigger;
    $('#cinema-title').textContent = film.name;
    $('#cinema-label').textContent = `ERIKA / ${film.label.toUpperCase()} / ${film.time}`;
    cinemaVideo.src = film.src; cinemaVideo.poster = film.poster;
    heroVideo.pause(); $$('.reel-preview-video').forEach(v => v.pause());
    if (!cinema.open) cinema.showModal();
    document.body.style.overflow = 'hidden';
    cinemaVideo.play().catch(() => {});
  }
  function closeCinema() {
    cinemaVideo.pause(); cinemaVideo.removeAttribute('src'); cinemaVideo.load();
    cinema.close(); document.body.style.overflow = '';
    if (cinemaTrigger?.isConnected) cinemaTrigger.focus();
    startHero();
  }
  $$('[data-open-reel]').forEach(button => button.addEventListener('click', () => openCinema(button.dataset.openReel, button)));
  $('#close-cinema').addEventListener('click', closeCinema);
  cinema.addEventListener('cancel', event => { event.preventDefault(); closeCinema(); });
  cinema.addEventListener('click', event => { if (event.target === cinema) { const rect = cinema.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeCinema(); } });
  $('#share-reel').addEventListener('click', async () => {
    if (!currentFilm) return;
    const url = `${location.origin}${location.pathname}#${currentFilm.id}`;
    toast(await copyText(url) ? 'Scene link copied.' : 'Copy the scene link from your browser.');
  });
  $$('.reel-media').forEach(card => {
    const video = $('video', card);
    card.addEventListener('pointerenter', () => {
      if (motionPaused || reducedMotion.matches || !window.matchMedia('(hover:hover)').matches) return;
      if (!video.src) video.src = video.dataset.src;
      video.play().then(() => video.classList.add('playing')).catch(() => {});
    });
    card.addEventListener('pointerleave', () => { video.pause(); video.classList.remove('playing'); });
  });

  let publishedContract = null;
  let tokenRequestPending = false;
  let lastTokenRequest = 0;
  function renderToken(config) {
    const token = resolveTokenConfig(config);
    publishedContract = token.contractAddress;
    $('#contract-address').textContent = token.contractAddress || 'CONTRACT ADDRESS COMING SOON';
    $('#copy-contract').disabled = !token.contractAddress;
    $('#token-ticker').textContent = token.ticker || 'To be announced';
    $('#contract-heading').textContent = token.contractAddress ? 'Keep the complete address.' : 'The next piece of the story.';
    $('#contract-description').textContent = token.contractAddress ? 'Use the complete contract address to identify the matching token. Verify it before opening any token page.' : 'The contract has not been published yet. The published address and token page will appear here when launch details are ready.';
    const buy = $('#token-buy');
    buy.replaceChildren(document.createTextNode(token.live ? `Open on ${token.tradingPlatform} ` : 'Pump.fun · coming soon '));
    buy.insertAdjacentHTML('beforeend', '<svg><use href="#i-diagonal"/></svg>');
    buy.classList.toggle('disabled', !token.live);
    if (token.live) {
      buy.href = token.tradingUrl; buy.target = '_blank'; buy.rel = 'noopener noreferrer';
      buy.removeAttribute('aria-disabled'); buy.removeAttribute('tabindex');
    } else {
      buy.removeAttribute('href'); buy.setAttribute('aria-disabled', 'true'); buy.setAttribute('tabindex', '-1');
    }
    $('#token-status').textContent = token.live ? 'CONTRACT & TRADING LINK PUBLISHED' : token.contractAddress ? 'CONTRACT AVAILABLE / TRADING LINK TO FOLLOW' : 'LAUNCH DETAILS COMING SOON';
    $('#token-live-label').textContent = token.live ? 'Trading link available' : 'Coming soon';
    $('#home-token-status').textContent = token.live ? 'EXPLORE THE TOKEN / SOLANA' : 'CONTRACT COMING SOON';
    $('#join-token-status').textContent = token.live ? 'READY' : 'SOON';
    $('#join-token-copy').textContent = token.live ? 'Check the complete address above, then open the published trading page.' : 'Once published, check the complete address on this page before opening its trading page.';
    $('#token-community-copy').textContent = token.live ? 'A community token on Solana. The published contract and trading link are above; no wallet deposit is accepted on this site.' : 'A planned community token on Solana. Launch information will be published here; no presale or wallet deposit is open on this site.';
    $('#faq-launch').textContent = token.live ? 'The contract address and trading page are published above. Verify the complete address and check the current token details on that platform.' : 'No complete launch details have been published on this site yet. The token section will update when they are provided.';
    $('#faq-contract').textContent = token.live ? 'The complete address is in the contract panel above. Use Copy contract address and the published trading link to find the token.' : 'In the contract panel above. The complete address and trading link will be added together. There is no active purchase link until then.';
    $('#token-bottom-status').textContent = token.live ? 'THE ADDRESS IS PUBLISHED. KEEP IT COMPLETE.' : 'STORY FIRST. CONTRACT DETAILS WHEN READY.';
  }
  async function refreshToken() {
    if (tokenRequestPending || Date.now() - lastTokenRequest < 1000) return;
    tokenRequestPending = true; lastTokenRequest = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('assets/token.json', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return;
      const config = await response.json();
      if (config && typeof config === 'object' && !Array.isArray(config)) renderToken(config);
    } catch { /* Keep the last published details when the connection is unavailable. */ }
    finally { clearTimeout(timeout); tokenRequestPending = false; }
  }
  refreshToken();
  setInterval(() => { if (activeView === 'token' && !document.hidden) refreshToken(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshToken(); });
  $('#copy-contract').addEventListener('click', async () => { if (publishedContract) toast(await copyText(publishedContract) ? 'Contract address copied.' : 'Select and copy the complete address above.'); });
  $('#token-buy').addEventListener('click', event => { if ($('#token-buy').getAttribute('aria-disabled') === 'true') event.preventDefault(); });

  function attachTilt(element, transform, reset) {
    let frame;
    element.addEventListener('pointermove', event => {
      if (motionPaused || reducedMotion.matches || event.pointerType === 'touch') return;
      const box = element.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - .5;
      const y = (event.clientY - box.top) / box.height - .5;
      cancelAnimationFrame(frame); frame = requestAnimationFrame(() => transform(x, y));
    });
    element.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); reset(); });
  }
  attachTilt($('#hero-art'), (x,y) => { $('#hero-art').style.transform = `perspective(1200px) rotate(1deg) rotateY(${x*5}deg) rotateX(${-y*5}deg)`; }, () => { $('#hero-art').style.transform = ''; });
  attachTilt($('#studio-stage'), (x,y) => { $('#scene-background').style.transform = `scale(1.025) translate(${x*-12}px,${y*-8}px)`; $('#stage-figure-wrap').style.transform = `translate(${x*7}px,${y*4}px)`; }, () => { $('#scene-background').style.transform = ''; $('#stage-figure-wrap').style.transform = ''; });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('#studio-stage').classList.contains('expanded')) { toggleStage(false); return; }
    if (event.key === 'Tab' && $('#studio-stage').classList.contains('expanded')) { event.preventDefault(); $('#stage-fullscreen').focus(); return; }
    if (activeView !== 'studio' || event.altKey || event.metaKey || event.ctrlKey || event.target.closest('input,textarea,select,.main-nav')) return;
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); const names = Object.keys(scenes); state.scene = names[(names.indexOf(state.scene) + (event.key === 'ArrowRight' ? 1 : -1) + names.length) % names.length]; updateStudio();
    }
  });
  updateStudio(false);
  route();
})();
