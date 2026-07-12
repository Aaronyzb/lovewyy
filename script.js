(() => {
  'use strict';

  // 纪念日：如需更换，只修改下面这一行即可。
  const LOVE_STARTED_AT = new Date('2022-01-01T00:00:00+08:00');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const opening = $('#opening');
  const topbar = $('#topbar');
  const openLetter = $('#openLetter');
  const soundToggle = $('#soundToggle');

  function updateLoveClock() {
    const elapsed = Math.max(0, Date.now() - LOVE_STARTED_AT.getTime());
    const days = Math.floor(elapsed / 86400000);
    const hours = Math.floor((elapsed % 86400000) / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    $('#daysTogether').textContent = String(days).padStart(4, '0');
    $('#hoursTogether').textContent = String(hours).padStart(2, '0');
    $('#minutesTogether').textContent = String(minutes).padStart(2, '0');
    $('#heartbeats').textContent = Math.floor((elapsed / 60000) * 72 / 10000).toLocaleString('zh-CN');
  }

  updateLoveClock();
  setInterval(updateLoveClock, 30000);
  $('#currentYear').textContent = new Date().getFullYear();

  openLetter.addEventListener('click', () => {
    opening.classList.add('opened');
    document.body.classList.remove('locked');
    topbar.classList.add('visible');
    burst(window.innerWidth / 2, window.innerHeight * .55, 34);
    startMusic();
    window.setTimeout(() => opening.remove(), 1400);
  });

  window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 80), { passive: true });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .14, rootMargin: '0px 0px -5% 0px' });
  $$('.reveal').forEach((node, index) => {
    node.style.transitionDelay = `${Math.min((index % 3) * 90, 180)}ms`;
    revealObserver.observe(node);
  });

  // 照片胶片支持鼠标拖拽，手机端则原生滑动。
  const film = $('.film');
  let dragging = false;
  let dragStart = 0;
  let startScroll = 0;
  film.addEventListener('pointerdown', (event) => {
    dragging = true;
    dragStart = event.clientX;
    startScroll = film.scrollLeft;
    film.setPointerCapture(event.pointerId);
  });
  film.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    film.scrollLeft = startScroll - (event.clientX - dragStart) * 1.25;
  });
  ['pointerup', 'pointercancel'].forEach((name) => film.addEventListener(name, () => { dragging = false; }));

  const lightbox = $('#lightbox');
  const lightboxImage = $('img', lightbox);
  const lightboxCaption = $('p', lightbox);
  $$('.memory-card .photo').forEach((photo) => {
    photo.addEventListener('click', () => {
      if (Math.abs(film.scrollLeft - startScroll) > 8) return;
      const image = $('img', photo);
      lightboxImage.src = image.src;
      lightboxImage.alt = image.alt;
      lightboxCaption.textContent = $('.memory-meta b', photo.closest('.memory-card')).textContent;
      lightbox.hidden = false;
      document.body.classList.add('locked');
    });
  });
  function closeLightbox() {
    lightbox.hidden = true;
    document.body.classList.remove('locked');
  }
  $('button', lightbox).addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !lightbox.hidden) closeLightbox(); });

  // 用 Web Audio 合成一段轻柔的五声音阶，不依赖外部音乐文件。
  let audioContext;
  let musicTimer;
  let musicPlaying = false;
  let noteIndex = 0;
  const melody = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66, 392, 493.88, 587.33, 523.25, 392, 329.63];

  function playNote(frequency, when) {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(.035, when + .05);
    gain.gain.exponentialRampToValueAtTime(.001, when + 1.6);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(when);
    oscillator.stop(when + 1.7);
  }

  function scheduleNotes() {
    if (!musicPlaying || !audioContext) return;
    const now = audioContext.currentTime;
    playNote(melody[noteIndex % melody.length], now);
    if (noteIndex % 2 === 0) playNote(melody[(noteIndex + 4) % melody.length] / 2, now + .04);
    noteIndex += 1;
  }

  function startMusic() {
    if (musicPlaying) return;
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    musicPlaying = true;
    soundToggle.classList.add('playing');
    soundToggle.setAttribute('aria-pressed', 'true');
    soundToggle.querySelector('b').textContent = '暂停';
    scheduleNotes();
    musicTimer = setInterval(scheduleNotes, 920);
  }

  function stopMusic() {
    musicPlaying = false;
    clearInterval(musicTimer);
    soundToggle.classList.remove('playing');
    soundToggle.setAttribute('aria-pressed', 'false');
    soundToggle.querySelector('b').textContent = '旋律';
  }

  soundToggle.addEventListener('click', () => musicPlaying ? stopMusic() : startMusic());

  // 花海会在点击时从地面长出来，每朵花的位置与高度都略有不同。
  const flowerGround = $('#flowerGround');
  const bloomButton = $('#bloomButton');
  const bloomMessage = $('#bloomMessage');
  let flowerCount = 0;

  function plantFlowers(amount) {
    for (let i = 0; i < amount; i += 1) {
      const flower = document.createElement('i');
      flower.className = 'flower';
      const scale = .45 + Math.random() * 1.25;
      flower.style.left = `${Math.random() * 100}%`;
      flower.style.setProperty('--s', scale.toFixed(2));
      flower.style.setProperty('--r', `${-10 + Math.random() * 20}deg`);
      flower.style.animationDelay = `${Math.random() * .55}s, ${1.5 + Math.random()}s`;
      flower.style.zIndex = String(Math.round(scale * 10));
      flowerGround.appendChild(flower);
    }
    flowerCount += amount;
  }

  plantFlowers(22);
  bloomButton.addEventListener('click', (event) => {
    plantFlowers(flowerCount < 90 ? 42 : 12);
    bloomButton.classList.add('done');
    bloomButton.querySelector('span').textContent = flowerCount < 90 ? '花海正在为她盛开' : '再种一朵喜欢';
    bloomMessage.classList.add('visible');
    const rect = event.currentTarget.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 28);
  });

  // 顶层画布：缓慢漂浮的光点，以及互动时出现的花瓣。
  const canvas = $('#dreamCanvas');
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticle(x = Math.random() * width, y = Math.random() * height, burstMode = false) {
    const angle = Math.random() * Math.PI * 2;
    const speed = burstMode ? 1.4 + Math.random() * 3.5 : .08 + Math.random() * .25;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: burstMode ? Math.sin(angle) * speed - .8 : -.05 - Math.random() * .16,
      size: burstMode ? 3 + Math.random() * 5 : 1 + Math.random() * 2.2,
      life: burstMode ? 1 : .2 + Math.random() * .45,
      decay: burstMode ? .008 + Math.random() * .011 : 0,
      type: burstMode ? 'petal' : 'glow',
      spin: Math.random() * Math.PI
    };
  }

  function burst(x, y, amount) {
    if (reducedMotion) return;
    for (let i = 0; i < amount; i += 1) particles.push(makeParticle(x, y, true));
  }

  function drawParticle(particle) {
    context.save();
    context.globalAlpha = Math.max(0, particle.life);
    if (particle.type === 'glow') {
      context.fillStyle = '#ffe4a2';
      context.shadowBlur = 10;
      context.shadowColor = '#ffcf77';
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    } else {
      context.translate(particle.x, particle.y);
      context.rotate(particle.spin);
      context.fillStyle = Math.random() > .45 ? '#f2a6b6' : '#ffe2dc';
      context.beginPath();
      context.ellipse(0, 0, particle.size, particle.size * .55, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function animate() {
    context.clearRect(0, 0, width, height);
    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.spin += .035;
      particle.life -= particle.decay;
      if (particle.type === 'glow' && particle.y < -10) {
        particle.y = height + 10;
        particle.x = Math.random() * width;
      }
      drawParticle(particle);
    });
    particles = particles.filter((particle) => particle.life > 0);
    requestAnimationFrame(animate);
  }

  resizeCanvas();
  if (!reducedMotion) {
    particles = Array.from({ length: Math.min(42, Math.round(width / 32)) }, () => makeParticle());
    animate();
  }
  window.addEventListener('resize', resizeCanvas, { passive: true });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('button, a, .photo')) burst(event.clientX, event.clientY, 7);
  });
})();
