/* Golden Bloom: continuous scroll flight, four readable chapters, and section reveals. */
(() => {
  'use strict';

  /* ---------- 1. EDITABLE CONFIG (product, price, CTA) ---------- */
  const CONFIG = {
    productName: 'Golden Bloom Classic Honey',
    price: '₹399',
    size: '400 g',
    storyUrl: '#panel-1'
  };

  // Timeline labels and the scroll "rest" position (in timeline units) each nav item jumps to.
  const SEGMENTS = 4;
  const LABELS = { panel1: 0, panel2: 1, panel3: 2, panel4: 3 };
  const REST = [0, 1.56, 2.65, 3.78];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let tl = null;                      // the master timeline (null in static mode)
  let surfaceHandler = null;          // refreshInit listener, removed on teardown

  /* ---------- 2. CONTENT BINDING + CTA ---------- */
  function hydrate() {
    $$('[data-bind="productName"]').forEach(el => (el.textContent = CONFIG.productName));
    $$('[data-bind="price"]').forEach(el => (el.textContent = CONFIG.price));
    $$('[data-bind="size"]').forEach(el => (el.textContent = CONFIG.size));
    const year = $('#year'); if (year) year.textContent = new Date().getFullYear();

    const story = $('#story-link');
    if (story && !CONFIG.storyUrl.startsWith('#')) { story.setAttribute('href', CONFIG.storyUrl); story.removeAttribute('data-goto'); }

    // Pointer-follow light on buttons
    $$('.btn').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        btn.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    const footerYear = $('#footer-year');
    if (footerYear) footerYear.textContent = new Date().getFullYear();
  }

  /* ---------- 3. AMBIENT PARTICLES (CSS-animated, no JS per frame) ---------- */
  function buildParticles() {
    const host = $('#particles');
    if (!host || host.childElementCount) return;
    const count = window.innerWidth < 768 ? 14 : 28;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'p';
      const size = 2 + Math.random() * 5;
      p.style.cssText =
        `left:${Math.random() * 100}%;top:${30 + Math.random() * 70}%;width:${size}px;height:${size}px;` +
        `--dx:${(Math.random() - .5) * 120}px;--dy:${-80 - Math.random() * 200}px;` +
        `--dur:${12 + Math.random() * 14}s;--delay:${-Math.random() * 20}s;--o:${.35 + Math.random() * .5}`;
      frag.appendChild(p);
    }
    host.appendChild(frag);
  }

  /* ---------- 4. NAVIGATION (scroll-to-label, active states) ---------- */
  function scrollToPanel(i) {
    if (i < 4) {
      if (!tl || !tl.scrollTrigger) {                    // static mode: native anchor behaviour
        const target = $('#panel-' + (i + 1));
        if (target) target.scrollIntoView({ behavior: reduceMotionQuery.matches ? 'auto' : 'smooth' });
        return;
      }
      const st = tl.scrollTrigger;
      const y = st.start + (st.end - st.start) * (REST[i] / SEGMENTS);
      window.scrollTo({ top: y, behavior: reduceMotionQuery.matches ? 'auto' : 'smooth' });
    } else {
      const sectionMap = { 4: '#collection', 5: '#process', 6: '#stories', 7: '#footer' };
      const target = $(sectionMap[i]);
      if (target) {
        target.scrollIntoView({ behavior: reduceMotionQuery.matches ? 'auto' : 'smooth' });
      }
    }
  }

  function setActive(i) {
    $$('.nav-links a').forEach((a, idx) => a.classList.toggle('is-active', idx === i));
    $$('.progress-dot').forEach((d, idx) => d.classList.toggle('is-active', idx === i));
  }

  function wireNav() {
    $$('[data-goto]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        scrollToPanel(Number(a.dataset.goto));
      });
    });
    $$('.progress-dot').forEach((d, i) => { d.style.pointerEvents = 'auto'; d.addEventListener('click', () => scrollToPanel(i)); });

    // Solid nav background once the page has scrolled (works in both modes)
    const nav = $('#nav');
    const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 5. POLLEN & HONEY SPARKLE ENGINE ---------- */
  class PollenSparkleEngine {
    constructor(canvas, beeEl) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.beeEl = beeEl;
      this.particles = [];
      this.maxParticles = 75;
      this.lastBeePos = { x: -1, y: -1 };
      this.active = true;
      this.rafId = null;

      this.resize = this.resize.bind(this);
      this.tick = this.tick.bind(this);

      this.resize();
      window.addEventListener('resize', this.resize, { passive: true });
      this.rafId = requestAnimationFrame(this.tick);
    }

    resize() {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
    }

    emit(x, y, count = 2, speedMult = 1, isBurst = false) {
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) {
          this.particles.shift();
        }
        const angle = isBurst ? Math.random() * Math.PI * 2 : (Math.PI * 0.4 + (Math.random() - 0.5) * 1.4);
        const speed = (isBurst ? 1.5 + Math.random() * 4.2 : 0.6 + Math.random() * 2.0) * speedMult;
        this.particles.push({
          x: x + (Math.random() - 0.5) * 18,
          y: y + (Math.random() - 0.5) * 18,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + (isBurst ? 0 : 0.45),
          size: 1.6 + Math.random() * 3.6,
          alpha: 0.85 + Math.random() * 0.15,
          decay: 0.009 + Math.random() * 0.016,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.06 + Math.random() * 0.08,
          hue: 43 + (Math.random() - 0.5) * 10
        });
      }
    }

    burst(x, y, count = 28) {
      this.emit(x, y, count, 1.5, true);
    }

    destroy() {
      this.active = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      window.removeEventListener('resize', this.resize);
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.particles = [];
    }

    tick() {
      if (!this.active) return;

      const rect = this.beeEl.getBoundingClientRect();
      const currentX = rect.left + rect.width * 0.5;
      const currentY = rect.top + rect.height * 0.5;

      // Detect movement
      if (this.lastBeePos.x > 0) {
        const dx = currentX - this.lastBeePos.x;
        const dy = currentY - this.lastBeePos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1.2 && rect.top > -60 && rect.bottom < this.height + 60) {
          // Emit golden pollen trails behind the bee
          this.emit(currentX - dx * 0.35, currentY - dy * 0.35, Math.min(3, Math.ceil(dist / 5.5)));
        }
      }
      this.lastBeePos.x = currentX;
      this.lastBeePos.y = currentY;

      // Ambient golden pollen breathing
      if (Math.random() < 0.22 && rect.top > 0 && rect.bottom < this.height) {
        this.emit(currentX, currentY, 1, 0.4);
      }

      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.45;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > this.height || p.x < 0 || p.x > this.width) {
          this.particles.splice(i, 1);
          continue;
        }

        const radGrad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        radGrad.addColorStop(0, `hsla(${p.hue}, 100%, 78%, ${p.alpha})`);
        radGrad.addColorStop(0.4, `hsla(${p.hue}, 95%, 55%, ${p.alpha * 0.85})`);
        radGrad.addColorStop(1, `hsla(${p.hue}, 90%, 42%, 0)`);

        this.ctx.fillStyle = radGrad;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  /* ---------- 6. BEE INTERACTIVITY & CURIOSITY ---------- */
  function wireBeeInteractivity(beeEl, pollenEngine) {
    const beeFloat = beeEl.querySelector('.bee-float');
    if (!beeFloat) return () => {};

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isTrickActive = false;
    let rafActive = true;

    const onPointerMove = e => {
      if (isTrickActive) return;
      const rect = beeEl.getBoundingClientRect();
      const beeCenterX = rect.left + rect.width / 2;
      const beeCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - beeCenterX;
      const dy = e.clientY - beeCenterY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < 480) {
        const factor = (1 - dist / 480);
        targetX = (dx / dist) * 24 * factor;
        targetY = (dy / dist) * 18 * factor;
        const tilt = Math.max(-14, Math.min(14, (dx / 480) * 18));
        gsap.to(beeFloat, { rotation: tilt, duration: 0.35, ease: 'power1.out', overwrite: 'auto' });
      } else {
        targetX = 0;
        targetY = 0;
        gsap.to(beeFloat, { rotation: 0, duration: 0.7, ease: 'sine.out', overwrite: 'auto' });
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const lerpTick = () => {
      if (!rafActive) return;
      if (!isTrickActive) {
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;
        beeFloat.style.setProperty('--curiosity-x', `${currentX.toFixed(2)}px`);
        beeFloat.style.setProperty('--curiosity-y', `${currentY.toFixed(2)}px`);
      }
      requestAnimationFrame(lerpTick);
    };
    requestAnimationFrame(lerpTick);

    const doBeeTrick = () => {
      if (isTrickActive) return;
      isTrickActive = true;

      const rect = beeEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (pollenEngine) pollenEngine.burst(cx, cy, 32);

      const trickTl = gsap.timeline({
        onComplete: () => {
          isTrickActive = false;
        }
      });

      trickTl
        .to(beeFloat, {
          y: '-=42',
          scale: 1.25,
          rotation: '+=360',
          duration: 0.65,
          ease: 'back.out(2)'
        })
        .to(beeFloat, {
          y: '+=42',
          scale: 1,
          duration: 0.35,
          ease: 'power2.inOut'
        });
    };

    beeEl.addEventListener('click', doBeeTrick);
    const onKey = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        doBeeTrick();
      }
    };
    beeEl.addEventListener('keydown', onKey);

    return () => {
      rafActive = false;
      window.removeEventListener('pointermove', onPointerMove);
      beeEl.removeEventListener('click', doBeeTrick);
      beeEl.removeEventListener('keydown', onKey);
    };
  }

  /* ---------- 7. MASTER TIMELINE ---------- */
  function buildMaster(isMobile) {
    const bee = $('.bee-holder');
    const flower = $('.flower-holder');
    const drop = $('.drop-holder');
    const height = () => $('#journey').clientHeight;
    const panels = $$('.panel');
    const status = $('#journey-chapter');
    const names = ['The wild bloom', 'From hive to honey', 'Naturally alive', 'The forest, bottled'];
    // One continuous spline owns the bee transform. No competing pointer/hover tweens.
    const hive = $('.hive-holder');
    const jar = $('.story-jar');
    const thread = $('.nectar-thread');
    const fill = $('.jar-fill');
    const impact = $('.jar-impact');
    // Normalized waypoints describe a generous flight arc, then a precise landing.
    const points = isMobile
      ? [[.66,.68],[.87,.60],[.77,.50],[.43,.54],[.36,.65],[.64,.68],[.79,.57]]
      : [[.75,.47],[.87,.35],[.79,.23],[.54,.34],[.60,.57],[.86,.51],[.79,.34]];
    const flight = { progress: 0 };
    const tail = { progress: 0 };
    const bee3d = window.Bee3D;
    if (bee3d) bee3d.setActive(true);
    // Keep one actor outside the pinned/clipped hero so it can accompany every section.
    const originalHost = bee.parentNode;
    const beeAnchor = document.createComment('scroll bee home');
    originalHost.insertBefore(beeAnchor, bee);
    const flightStage = document.createElement('div');
    flightStage.className = 'bee-flight-stage';
    flightStage.setAttribute('aria-hidden', 'true');
    document.body.appendChild(flightStage);
    flightStage.appendChild(bee);
    const depthPoints = [0, -.35, -.75, 1, .8, -.25, 0];
    const trail = document.createElement('div');
    trail.className = 'flight-pollen';
    flightStage.appendChild(trail);
    const motes = Array.from({ length: isMobile ? 10 : 18 }, () => {
      const mote = document.createElement('i');trail.appendChild(mote);return mote;
    });
    const setters = ['x', 'y', 'rotation'].map(prop => gsap.quickSetter(bee, prop, prop === 'rotation' ? 'deg' : 'px'));
    const onward = isMobile
      ? [[.8,.5],[.87,.48],[.71,.62],[.86,.74],[.78,.53],[.88,.37],[.73,.56],[.86,.72],[.78,.5],[.88,.35],[.73,.55],[.86,.73],[.76,.58],[.89,.4],[.76,.3],[.70,.56],[.86,.72],[.89,.48],[.74,.34],[.78,.56],[.87,.68]]
      : [[.8,.3],[.91,.42],[.72,.59],[.87,.74],[.93,.51],[.75,.29],[.87,.36],[.92,.66],[.74,.72],[.65,.49],[.83,.3],[.94,.44],[.82,.67],[.68,.54],[.8,.29],[.93,.4],[.85,.7],[.69,.59],[.75,.32],[.91,.43],[.85,.69]];
    const spline = (axis, t, route = points) => {
      const n = route.length - 1;
      const u = Math.max(0, Math.min(n, t * n));
      const i = Math.min(n - 1, Math.floor(u));
      const f = u - i;
      const p0 = route[Math.max(0, i - 1)][axis], p1 = route[i][axis];
      const p2 = route[i + 1][axis], p3 = route[Math.min(n, i + 2)][axis];
      return .5 * ((2*p1) + (-p0+p2)*f + (2*p0-5*p1+4*p2-p3)*f*f + (-p0+3*p1-3*p2+p3)*f*f*f);
    };
    const releaseTime = 1.56;
    const impactTime = 1.96;
    const clamp = gsap.utils.clamp(0, 1);
    const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
    const depthAt = t => {
      const u = clamp(t) * (depthPoints.length - 1), i = Math.min(depthPoints.length - 2, Math.floor(u));
      return gsap.utils.interpolate(depthPoints[i], depthPoints[i+1], smooth(u-i));
    };
    let route = [], routeTimes = [];
    let geometry;
    const measure = () => {
      const h = height(), w = innerWidth;
      const hiveLeft = w * (isMobile ? .72 : .79) - hive.offsetWidth / 2;
      const hiveTop = h * (isMobile ? .435 : .095);
      const jarTop = h * (isMobile ? .69 : .55);
      const dropX = hiveLeft + hive.offsetWidth * .39;
      geometry = {
        flowerX: flower.offsetLeft + flower.offsetWidth * .49,
        flowerY: isMobile ? flower.offsetTop + flower.offsetWidth * .49 : h * .5,
        landingX: hiveLeft + hive.offsetWidth * .64,
        landingY: hiveTop + hive.offsetWidth * .47 - bee.offsetHeight * .12,
        dropX,
        dropY: hiveTop + hive.offsetWidth * .955,
        mouthY: jarTop + jar.offsetWidth * .145
      };
      points[0] = [geometry.flowerX / w, (geometry.flowerY - bee.offsetHeight * .19) / h];
      points[points.length-1] = [geometry.landingX / w, geometry.landingY / h];
      onward[0] = [...points[points.length-1]];
      points[points.length-2] = [geometry.landingX / w - (isMobile ? .16 : .12), geometry.landingY / h + .12];
      const distanceTable=[0];
      for(let i=1;i<=240;i++){
        const a=(i-1)/240,b=i/240;
        distanceTable.push(distanceTable[i-1]+Math.hypot((spline(0,b)-spline(0,a))*w,(spline(1,b)-spline(1,a))*h,(depthAt(b)-depthAt(a))*220));
      }
      // One time-aware Hermite path shares the same tangent on both sides of
      // every knot, including the flower-to-hive and hero-to-footer joins.
      route = points.map((point,i) => [...point,depthPoints[i]])
        .concat(onward.slice(1).map((point,i) => [...point,Math.sin((i+1)*1.4)*.24]));
      routeTimes = points.map((_,i) => 1.2*distanceTable[i*40]/distanceTable[240])
        .concat(onward.slice(1).map((_,i) => 1.2+6.8*(i+1)/(onward.length-1)));
      gsap.set(hive, { x: hiveLeft, y: hiveTop });
      gsap.set(jar, { x: dropX - jar.offsetWidth * .465, y: jarTop });
      gsap.set(thread, { x: geometry.dropX - 1.5, y: geometry.dropY, height: Math.max(0, geometry.mouthY - geometry.dropY) });
    };
    const dropSet = {
      x: gsap.quickSetter(drop, 'x', 'px'), y: gsap.quickSetter(drop, 'y', 'px'),
      scaleX: gsap.quickSetter(drop, 'scaleX'), scaleY: gsap.quickSetter(drop, 'scaleY'),
      opacity: gsap.quickSetter(drop, 'opacity')
    };
    const renderDrop = time => {
      const growth = smooth((time - 1.30) / .22);
      const fall = clamp((time - releaseTime) / (impactTime - releaseTime));
      const dissolve = smooth((time - impactTime) / .12);
      const landing = geometry.mouthY - drop.offsetHeight * .6;
      dropSet.x(geometry.dropX - drop.offsetWidth / 2);
      dropSet.y(geometry.dropY + (landing - geometry.dropY) * fall * fall);
      dropSet.scaleX((.12 + .68 * growth) * (1 - fall * .18));
      dropSet.scaleY((.08 + .72 * growth) * (1 + Math.sin(fall * Math.PI) * .4));
      dropSet.opacity(time < 1.30 ? 0 : growth * (1 - dissolve));
      gsap.set(thread, {
        autoAlpha: time < releaseTime ? growth * .75 : .75 * (1-smooth(fall/.18)),
        scaleY: .025 + growth * .055 + Math.min(fall,.18) * .15
      });
    };
    const sampleFlight = (axis, time) => {
      const t = Math.max(0, Math.min(8,time));
      let i=0;
      while(i<route.length-2 && routeTimes[i+1]<t)i++;
      const prev=Math.max(0,i-1), next=Math.min(route.length-1,i+2);
      const span=routeTimes[i+1]-routeTimes[i];
      const u=clamp((t-routeTimes[i])/span), u2=u*u, u3=u2*u;
      const a=route[i][axis], b=route[i+1][axis];
      const m0=(b-route[prev][axis])/(routeTimes[i+1]-routeTimes[prev]);
      const m1=(route[next][axis]-a)/(routeTimes[next]-routeTimes[i]);
      return (2*u3-3*u2+1)*a+(u3-2*u2+u)*m0*span+(-2*u3+3*u2)*b+(u3-u2)*m1*span;
    };
    const setBeeScale=gsap.quickSetter(bee,'scale');
    let lastChapter=-1, wasInJourney=false;
    const renderFlight = () => {
      if (!geometry) measure();
      const time = flight.progress * 4;
      // Initial flower rest, then uninterrupted flight past the hive and through the footer.
      const beeTime = time + tail.progress * 4;
      const flying = beeTime > .0001;
      setters[0](sampleFlight(0,beeTime) * innerWidth - bee.offsetWidth / 2);
      setters[1](sampleFlight(1,beeTime) * height() - bee.offsetHeight / 2);
      const ahead=Math.min(8,beeTime+.008), behind=Math.max(0,beeTime-.008);
      const dx=(sampleFlight(0,ahead)-sampleFlight(0,behind))*innerWidth;
      const dy=(sampleFlight(1,ahead)-sampleFlight(1,behind))*height();
      const depth=sampleFlight(2,beeTime);
      const yaw=Math.atan2(-Math.sin(beeTime*3)*2,dx);
      const bank=gsap.utils.clamp(-.55,.55,-Math.atan2(dy,Math.abs(dx)+2)*Math.cos(yaw)*.65);
      setters[2](bee3d?0:bank*45);
      const baseScale=gsap.utils.interpolate(isMobile?.88:1.02,.72,smooth((beeTime-1.2)/.6));
      setBeeScale(baseScale*(1+depth*.53));
      if(bee3d)bee3d.setPose({flying, yaw:flying?yaw:-.28, pitch:flying?Math.sin(beeTime*3)*.16:0, bank:flying?bank:-.1, visible:true});
      bee.classList.toggle('is-flying', flying);
      motes.forEach((mote,i)=>{
        const p=Math.max(0,beeTime-(i+1)*.014);
        const spread=Math.sin(i*12.7)*i*.65;
        mote.style.transform=`translate3d(${sampleFlight(0,p)*innerWidth+spread}px,${sampleFlight(1,p)*height()+Math.cos(i*8.3)*i}px,0) scale(${1-i/motes.length*.8})`;
        mote.style.opacity=flying?String((1-i/motes.length)*.55):'0';
      });
      renderDrop(time);
      const chapter = time < .92 ? 0 : time < 2.18 ? 1 : time < 3.08 ? 2 : 3;
      const inJourney=!tl?.scrollTrigger || window.scrollY<=tl.scrollTrigger.end;
      if(chapter!==lastChapter || inJourney!==wasInJourney){
        if(inJourney)setActive(chapter);
        if(status)status.textContent=`0${chapter+1} / 04 - ${names[chapter]}`;
        panels.forEach((panel,i)=>{panel.inert=i!==chapter;panel.setAttribute('aria-hidden',String(i!==chapter));});
        lastChapter=chapter;wasInJourney=inJourney;
      }
    };
    gsap.set(panels.slice(1), { autoAlpha: 0 });
    gsap.set(['.bg-2', '.bg-3', '.bg-4'], { autoAlpha: 0 });
    gsap.set(bee, { autoAlpha: 1, scale: isMobile ? .78 : .8 });
    gsap.set(drop, { left: 0, top: 0, opacity: 0, visibility: 'visible', transformOrigin: '50% 0%' });
    gsap.set('.botanical-b', { scaleX: -1 });
    gsap.set([hive, jar, thread], { autoAlpha: 0 });
    gsap.set(fill, { opacity: 0, scale: .7 });
    surfaceHandler = measure;
    ScrollTrigger.addEventListener('refreshInit', measure);
    measure();
    renderFlight();
    tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#journey', start: 'top top',
        end: () => '+=' + height() * (isMobile ? 4.8 : 5),
        pin: true, scrub: .3, anticipatePin: 1, invalidateOnRefresh: true,
        onRefresh: () => { measure(); renderFlight(); },
        onToggle: self => gsap.set('.progress', { autoAlpha: self.isActive || self.progress === 0 ? 1 : 0 })
      }
    });
    Object.entries(LABELS).forEach(([name,time]) => tl.addLabel(name,time));
    tl.to(flight, { progress: 1, duration: 4, onUpdate: renderFlight }, 0)
      .to('.progress-fill', { scaleY: 1, duration: 4 }, 0)
      .to('.scroll-hint', { autoAlpha: 0, duration: .18 }, .12)
      .to(flower, { scale: .95, rotation: 3, xPercent: 3, duration: .78, ease: 'sine.inOut' }, .06)
      .to(flower, { autoAlpha: 0, duration: .48, ease: 'sine.inOut' }, .22)
      .fromTo(hive, { scale: .98, yPercent: -2 }, { autoAlpha: 1, scale: 1, yPercent: 0, duration: .52, ease: 'sine.inOut' }, .56)
      .fromTo(jar, { scale: .97, yPercent: 4 }, { autoAlpha: 1, scale: 1, yPercent: 0, duration: .48, ease: 'sine.inOut' }, .98)
      .to(fill, { opacity: .65, scale: 1.12, duration: .12 }, impactTime)
      .to(fill, { opacity: 0, scale: 1.3, duration: .20 }, impactTime+.12)
      .set(impact, { opacity: 1 }, impactTime)
      .fromTo('.impact-ring', { scale: .15, opacity: .85 }, { scale: 1.15, opacity: 0, stagger: .045, duration: .25, ease: 'power2.out' }, impactTime)
      .fromTo('.honey-splash i', { x: 0, y: 0, scale: .3, opacity: 0 }, { x: i => [-24,-15,-7,8,17,26][i], y: i => [-12,-21,-28,-24,-17,-10][i], scale: 1, opacity: .9, duration: .085, ease: 'power2.out' }, impactTime)
      .to('.honey-splash i', { y: 5, scale: .3, opacity: 0, duration: .16, ease: 'power2.in' }, impactTime+.085)
      .fromTo('.jar-sheen', { backgroundPosition: '180% 0' }, { backgroundPosition: '-80% 0', duration: .45, ease: 'sine.inOut' }, 1.84)
      .to(hive, { autoAlpha: 0, duration: .4, ease: 'sine.inOut' }, 2.08)
      .to(jar, { autoAlpha: 0, scale: 1.025, duration: .4, ease: 'sine.inOut' }, 2.12);
    // Crossfade already-rasterized backgrounds. Move only the incoming copy,
    // avoiding stacked parent/child transforms and a blank between chapters.
    for (let i = 1; i < 4; i++) {
      const entrance = [0, .88, 2.23, 3.12][i];
      const at = entrance - .28;
      tl.to(panels[i-1], { autoAlpha: 0, duration: .4, ease: 'sine.inOut' }, at)
        .to('.bg-' + (i+1), { autoAlpha: 1, duration: .65, ease: 'sine.inOut' }, at-.12)
        .fromTo(panels[i], { y: 0 }, { y: 0, autoAlpha: 1, duration: .4, ease: 'sine.inOut' }, at+.12)
        .fromTo(panels[i].querySelectorAll('.copy .rv'), { y: 12 },
          { y: 0, duration: .46, stagger: .025, ease: 'sine.out' }, at+.12);
    }
    tl.fromTo('.jar-3-wrap', { y: 36, scale: .94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .32, ease: 'power2.out' }, 2.29)
      .fromTo('.benefit', { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: .18, stagger: .1 }, 2.39)
      .to('.botanical-a', { y: -45, rotation: 3, duration: .85 }, 2)
      .fromTo('#purchase-card', { opacity: 0, y: 32, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .3, ease: 'power2.out' }, 3.12)
      .fromTo('.trust li', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .15, stagger: .055 }, 3.48);
    const tailTween = gsap.to(tail, {
      progress: 1, ease: 'none', onUpdate: renderFlight,
      scrollTrigger: {
        trigger: document.documentElement,
        start: () => tl.scrollTrigger.end,
        end: () => Math.max(tl.scrollTrigger.end+1, ScrollTrigger.maxScroll(window)),
        scrub: .3, invalidateOnRefresh: true, onRefresh: renderFlight
      }
    });
    tl.cleanupPollen = () => {
      tailTween.scrollTrigger?.kill();
      tailTween.kill();
      if(bee3d)bee3d.setActive(false);
      trail.remove();
      if (beeAnchor.parentNode) originalHost.insertBefore(bee, beeAnchor);
      beeAnchor.remove();
      flightStage.remove();
      bee.classList.remove('is-flying');
      panels.forEach(panel => { panel.inert = false; panel.removeAttribute('aria-hidden'); });
    };
    return tl;
  }

  /* ==========================================================================
     8 ─ SECTIONS 5–8 EXPANSION: PRODUCTS, CART, SIGNATURE BEE & STORYTELLING
     ========================================================================== */

  // Single editable source of truth for products
  const PRODUCTS = [
    {
      id: 'wildflower-raw',
      name: 'Golden Bloom Classic Honey',
      weight: '400g',
      price: 399,
      description: 'A golden addition to breakfast, drinks and everyday recipes.',
      image: 'assets/product-wildflower.webp',
      badge: 'Classic Honey'
    },
    {
      id: 'forest-gold',
      name: 'Golden Bloom Amber Honey',
      weight: '400g',
      price: 499,
      description: 'A golden addition to breakfast, drinks and everyday recipes.',
      image: 'assets/product-forest-gold.webp',
      badge: 'Amber Honey'
    },
    {
      id: 'honeycomb-reserve',
      name: 'Golden Bloom Signature Honey',
      weight: '400g',
      price: 599,
      description: 'A golden addition to breakfast, drinks and everyday recipes.',
      image: 'assets/product-honeycomb.webp',
      badge: 'Signature Honey'
    },
    {
      id: 'reserve-500g',
      name: 'Golden Bloom Classic Honey',
      weight: '400g',
      price: 399,
      description: 'A golden addition to breakfast, drinks and everyday recipes.',
      image: 'assets/honey-jar.webp',
      badge: 'Golden Bloom'
    }
  ];

  /* ---------- Client-side Cart Store ---------- */
  const CartStore = {
    items: [],
    shippingFee: 0,
    freeShippingThreshold: Infinity,

    init() {
      try {
        const saved = localStorage.getItem('golden_bloom_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) this.items = parsed.filter(item => PRODUCTS.some(p => p.id === item.id) && Number.isInteger(item.quantity) && item.quantity > 0).map(item => ({ ...PRODUCTS.find(p => p.id === item.id), quantity: item.quantity }));
        }
      } catch (e) {
        this.items = [];
      }
      this.render();
    },

    save() {
      try {
        localStorage.setItem('golden_bloom_cart', JSON.stringify(this.items));
      } catch (e) {}
      this.render();
    },

    add(product) {
      const existing = this.items.find(i => i.id === product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          weight: product.weight,
          image: product.image,
          quantity: 1
        });
      }
      this.save();
    },

    updateQty(id, delta) {
      const item = this.items.find(i => i.id === id);
      if (!item) return;
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.items = this.items.filter(i => i.id !== id);
      }
      this.save();
    },

    remove(id) {
      this.items = this.items.filter(i => i.id !== id);
      this.save();
    },

    clear() {
      this.items = [];
      this.save();
    },

    getSubtotal() {
      return this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    },

    getShipping() {
      if (this.items.length === 0) return 0;
      return this.getSubtotal() >= this.freeShippingThreshold ? 0 : this.shippingFee;
    },

    getTotal() {
      if (this.items.length === 0) return 0;
      return this.getSubtotal() + this.getShipping();
    },

    getItemCount() {
      return this.items.reduce((sum, i) => sum + i.quantity, 0);
    },

    render() {
      const count = this.getItemCount();
      const subtotal = this.getSubtotal();
      const shipping = this.getShipping();
      const total = this.getTotal();

      // Header count badge
      const badge = $('#cart-badge');
      if (badge) {
        const prevCount = parseInt(badge.textContent, 10) || 0;
        badge.textContent = count;
        if (count > prevCount) {
          badge.classList.remove('bump');
          void badge.offsetWidth; // trigger reflow
          badge.classList.add('bump');
        }
      }

      // Drawer header count
      const headerCount = $('#cart-header-count');
      if (headerCount) {
        headerCount.textContent = `(${count} ${count === 1 ? 'item' : 'items'})`;
      }

      // Drawer items container
      const container = $('#cart-items-container');
      if (container) {
        if (this.items.length === 0) {
          container.innerHTML = `
            <div class="cart-empty-state">
              <div class="empty-cart-icon">&#127855;</div>
              <h3>Your basket is empty</h3>
              <p>The bees are ready to prepare your first artisanal jar of pure liquid gold.</p>
              <a href="#collection" class="btn btn-sm" id="empty-shop-btn">Explore Collection</a>
            </div>
          `;
          const emptyShopBtn = $('#empty-shop-btn');
          if (emptyShopBtn) {
            emptyShopBtn.addEventListener('click', e => {
              e.preventDefault();
              closeCartDrawer();
              scrollToPanel(4);
            });
          }
        } else {
          container.innerHTML = this.items.map(item => `
            <div class="cart-item-row" data-id="${item.id}">
              <img src="${item.image}" alt="${item.name}" class="cart-item-img">
              <div class="cart-item-details">
                <h4 class="cart-item-title">${item.name}</h4>
                <span class="cart-item-meta">${item.weight} &middot; &#8377;${item.price} each</span>
                <span class="cart-item-unit-price">&#8377;${item.price * item.quantity}</span>
              </div>
              <div class="cart-item-actions">
                <div class="cart-stepper">
                  <button type="button" class="stepper-btn btn-dec" data-id="${item.id}" aria-label="Decrease quantity">&minus;</button>
                  <span class="stepper-val">${item.quantity}</span>
                  <button type="button" class="stepper-btn btn-inc" data-id="${item.id}" aria-label="Increase quantity">&plus;</button>
                </div>
                <button type="button" class="cart-item-del-btn" data-id="${item.id}" aria-label="Remove item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          `).join('');

          // Wire steppers & delete
          container.querySelectorAll('.btn-dec').forEach(btn => {
            btn.addEventListener('click', () => this.updateQty(btn.dataset.id, -1));
          });
          container.querySelectorAll('.btn-inc').forEach(btn => {
            btn.addEventListener('click', () => this.updateQty(btn.dataset.id, 1));
          });
          container.querySelectorAll('.cart-item-del-btn').forEach(btn => {
            btn.addEventListener('click', () => this.remove(btn.dataset.id));
          });
        }
      }

      // Summary lines
      const elSubtotal = $('#cart-subtotal');
      if (elSubtotal) elSubtotal.innerHTML = `&#8377;${subtotal}`;

      const elShipping = $('#cart-shipping');
      if (elShipping) elShipping.textContent = 'Confirmed when ordering';
      const elPolicy = $('#shipping-policy-note');
      if (elPolicy) elPolicy.textContent = 'Demo checkout only. No payment is processed.';

      const elTotal = $('#cart-total');
      if (elTotal) elTotal.innerHTML = `&#8377;${total}`;

      // Update Checkout review lines
      const reviewCount = $('#review-items-count');
      if (reviewCount) reviewCount.textContent = count;
      const reviewTotal = $('#review-total-val');
      if (reviewTotal) reviewTotal.innerHTML = `&#8377;${total}`;
    }
  };

  /* ---------- Toast Notification ---------- */
  let toastTimer = null;
  function showToast(title, desc) {
    const toast = $('#cart-toast');
    if (!toast) return;
    const tTitle = $('#toast-title');
    const tDesc = $('#toast-desc');
    if (tTitle) tTitle.textContent = title;
    if (tDesc) tDesc.textContent = desc;

    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2800);
  }

  /* ---------- Signature Flying Bee Add-to-Cart Animation ---------- */
  let cartArrivalAnimation = null;
  function flyBeeToCart(sourceBtn, product) {
    if (sourceBtn?.dataset.animating === 'true') return;
    // Save the accepted add immediately, so opening the cart or leaving the
    // page during the visual flight never loses or duplicates the product.
    CartStore.add(product);
    const cartBtn = $('#cart-toggle-btn');
    if (reduceMotionQuery.matches || !cartBtn || !sourceBtn || document.hidden) {
      showToast('Added to Cart', `${product.name} (${product.weight})`);
      return;
    }
    sourceBtn.dataset.animating = 'true';
    sourceBtn.setAttribute('aria-busy', 'true');
    const src = sourceBtn.getBoundingClientRect();
    const start = { x: src.left + src.width / 2, y: src.top + src.height / 2 };
    const courier = document.createElement('div');
    courier.className = 'flying-bee-courier';
    courier.setAttribute('aria-hidden', 'true');
    const body = document.createElement('div');body.className = 'courier-body';
    const beeImg = new Image();beeImg.src = 'assets/bee.webp';beeImg.alt = '';beeImg.className = 'courier-bee';
    const cargo = new Image();cargo.src = product.image;cargo.alt = '';cargo.className = 'courier-cargo';
    body.append(beeImg, cargo);courier.appendChild(body);
    const trail = document.createElement('div');trail.className = 'courier-flight-trail';trail.setAttribute('aria-hidden', 'true');
    const motes = Array.from({ length: 10 }, () => { const dot = document.createElement('i');trail.appendChild(dot);return dot; });
    document.body.append(trail, courier);
    const duration = 2000;
    let raf = 0, closed = false;
    const started = performance.now();
    const finish = (celebrate = true) => {
      if (closed) return;closed = true;
      cancelAnimationFrame(raf);courier.remove();trail.remove();
      delete sourceBtn.dataset.animating;sourceBtn.removeAttribute('aria-busy');
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      reduceMotionQuery.removeEventListener('change', onMotion);
      if (celebrate && !reduceMotionQuery.matches) {
        cartArrivalAnimation?.cancel();
        cartArrivalAnimation = cartBtn.animate([
          { transform: 'scale(1)' }, { transform: 'scale(1.2)', offset: .3 },
          { transform: 'scale(.96)', offset: .65 }, { transform: 'scale(1)' }
        ], { duration: 430, easing: 'cubic-bezier(.22,1,.36,1)' });
        const rect = cartBtn.getBoundingClientRect();
        const ring = document.createElement('span');ring.className = 'cart-arrival-ring';ring.setAttribute('aria-hidden', 'true');
        ring.style.left = rect.left + rect.width / 2 + 'px';ring.style.top = rect.top + rect.height / 2 + 'px';document.body.appendChild(ring);
        ring.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: .8 }, { transform: 'translate(-50%,-50%) scale(1.7)', opacity: 0 }], { duration: 500, easing: 'ease-out' }).onfinish = () => ring.remove();
      }
      showToast('Added to Cart', `${product.name} (${product.weight})`);
    };
    const onVisibility = () => { if (document.hidden) finish(false); };
    const onPageHide = () => finish(false);
    const onMotion = () => { if (reduceMotionQuery.matches) finish(false); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    reduceMotionQuery.addEventListener('change', onMotion);
    const curve = (p, end) => {
      const direction = end.x >= start.x ? 1 : -1;
      const reach = Math.min(150, Math.max(55, Math.abs(end.x - start.x) * .35));
      const c1 = { x: Math.max(25, Math.min(innerWidth-25, start.x + direction * reach)), y: Math.max(85, start.y - Math.min(160, start.y * .3)) };
      const c2 = { x: Math.max(25, Math.min(innerWidth-25, end.x - direction * reach)), y: Math.max(85, end.y + 105) };
      const q = 1-p;
      return { x: q*q*q*start.x + 3*q*q*p*c1.x + 3*q*p*p*c2.x + p*p*p*end.x,
        y: q*q*q*start.y + 3*q*q*p*c1.y + 3*q*p*p*c2.y + p*p*p*end.y };
    };
    const tick = now => {
      if (closed) return;
      const elapsed = Math.min(1, (now-started)/duration);
      const p = elapsed*elapsed*(3-2*elapsed);
      // Re-measure the target so resizing or scrolling mid-flight still lands
      // exactly on the visible cart icon, without an offscreen control point.
      const dest = cartBtn.getBoundingClientRect();
      const end = { x: dest.left+dest.width/2, y: dest.top+dest.height/2 };
      const point = curve(p,end), ahead = curve(Math.min(1,p+.015),end), behind = curve(Math.max(0,p-.015),end);
      const dx = ahead.x-behind.x, dy = ahead.y-behind.y;
      const facing = dx<0?-1:1;
      const bank = Math.max(-.55,Math.min(.55,Math.atan2(dy,Math.abs(dx)+1)*facing*.55));
      const shrink = Math.max(0,(p-.76)/.24);
      const scale = (.55+.45*Math.sin(Math.PI*p))*(1-shrink*.68);
      courier.style.transform = `translate3d(${point.x}px,${point.y}px,0) translate(-50%,-50%) scale(${scale})`;
      courier.style.opacity = String(Math.min(1,elapsed*10));
      body.style.transform = `rotate(${bank}rad)`;beeImg.style.transform = `scaleX(${facing})`;
      motes.forEach((dot,i) => {
        const t = p-(i+1)*.018, pos = curve(Math.max(0,t),end);
        dot.style.transform = `translate3d(${pos.x}px,${pos.y+Math.sin(i*9)*3}px,0) scale(${1-i*.07})`;
        dot.style.opacity = t>0?String((1-i/10)*.6*(1-shrink)):'0';
      });
      if (elapsed<1) raf=requestAnimationFrame(tick);else finish();
    };
    raf=requestAnimationFrame(tick);
  }

  /* ---------- Cart Drawer & Checkout UI Controller ---------- */
  function openCartDrawer(view = 'items') {
    const rootEl = $('#cart-drawer-root');
    if (!rootEl) return;
    rootEl.classList.add('is-open');
    rootEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showCartStage(view);
  }

  function closeCartDrawer() {
    const rootEl = $('#cart-drawer-root');
    if (!rootEl) return;
    rootEl.classList.remove('is-open');
    rootEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showCartStage(stageName) {
    const stages = {
      items: $('#cart-view-items'),
      checkout: $('#cart-view-checkout'),
      success: $('#cart-view-success')
    };
    Object.values(stages).forEach(el => {
      if (el) el.classList.remove('is-active');
    });
    if (stages[stageName]) {
      stages[stageName].classList.add('is-active');
    }
  }

  function wireCartDrawer() {
    // Open cart
    const cartToggle = $('#cart-toggle-btn');
    if (cartToggle) {
      cartToggle.addEventListener('click', e => {
        e.preventDefault();
        openCartDrawer('items');
      });
    }

    // Close triggers
    const closeBtn = $('#cart-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);

    const backdrop = $('#cart-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeCartDrawer);

    const continueBtn = $('#btn-continue-shop');
    if (continueBtn) continueBtn.addEventListener('click', closeCartDrawer);

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const rootEl = $('#cart-drawer-root');
        if (rootEl && rootEl.classList.contains('is-open')) closeCartDrawer();
      }
    });

    // Local demo form: validate details, then show a confirmation without downloading or sending data.
    const toCheckout = $('#btn-to-checkout');
    if (toCheckout) toCheckout.addEventListener('click', () => {
      if (!CartStore.items.length) { showToast('Your basket is empty', 'Choose a jar from the Golden Bloom collection.'); return; }
      CartStore.render();
      showCartStage('checkout');
      $('#c-name').focus();
    });
    $('#btn-back-to-cart')?.addEventListener('click', () => showCartStage('items'));
    $('#btn-success-done')?.addEventListener('click', closeCartDrawer);
    $('#checkout-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      // Reject whitespace-only values as well as the browser's type/pattern checks.
      form.querySelectorAll('input').forEach(input => {
        input.value = input.value.trim();
      });
      if (!form.reportValidity()) return;
      if (!CartStore.items.length) { showCartStage('items'); showToast('Your basket is empty', 'Choose a jar before checkout.'); return; }
      form.reset();
      showCartStage('success');
      $('#checkout-confirmation').focus();
    });

    // Add to cart buttons wiring on Section 5
    $$('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const prodId = btn.dataset.id;
        const prod = PRODUCTS.find(p => p.id === prodId) || PRODUCTS[0];
        flyBeeToCart(btn, prod);
      });
    });

    // Panel 4 Reserve Jar "Buy Now" button
    const cardBuyBtn = $('#card-buy');
    if (cardBuyBtn) {
      cardBuyBtn.addEventListener('click', e => {
        e.preventDefault();
        const reserveProd = PRODUCTS.find(p => p.id === 'reserve-500g') || PRODUCTS[1];
        flyBeeToCart(cardBuyBtn, reserveProd);
      });
    }
  }

  /* ---------- Section 5: The Golden Collection (GSAP + ScrollTrigger Entrance) ---------- */
  function initCollectionSectionAnim() {
    const collectionSec = $('#collection');
    if (!collectionSec || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    if (reduceMotionQuery.matches) return;

    const header = collectionSec.querySelector('.collection-header');
    const cards = collectionSec.querySelectorAll('.product-card');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: collectionSec,
        start: 'top 82%',
        once: true
      }
    });

    if (header) {
      const eyebrow = header.querySelector('.eyebrow-pill');
      const title = header.querySelector('.collection-title');
      const lede = header.querySelector('.collection-lede');
      const trustBar = header.querySelector('.collection-trust-bar');

      const headerItems = [eyebrow, title, lede, trustBar].filter(Boolean);
      tl.fromTo(headerItems,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.12,
          ease: 'power3.out'
        }
      );
    }

    if (cards.length) {
      tl.fromTo(cards,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power2.out',
          clearProps: 'transform' // Frees CSS :hover transform once entered
        },
        '-=0.45'
      );
    }
  }

  /* ---------- Section 6: From Hive to Home (Interactive Timeline Scrub & Stagger) ---------- */
  function wireProcessTimeline() {
    if (reduceMotionQuery.matches) return;
    const railGlow = $('#process-rail-glow');
    const markerBee = $('#process-marker-bee');
    const processSec = $('#process');

    if (!processSec || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    // Desktop/Tablet horizontal progress rail scrub (single unified timeline)
    if (railGlow && markerBee && window.innerWidth >= 992) {
      const processTl = gsap.timeline({
        scrollTrigger: {
          trigger: processSec,
          start: 'top 75%',
          end: 'bottom 80%',
          scrub: 0.8
        }
      });
      processTl.to(railGlow, { width: '100%', ease: 'none' }, 0);
      processTl.to(markerBee, { left: '100%', ease: 'none' }, 0);
    }

    // Smooth sequence reveal for the 4 process stages (once: true prevents reverse flicker)
    const stages = $$('.process-stage-item');
    if (stages.length) {
      stages.forEach((stage, i) => {
        gsap.fromTo(stage,
          { y: 35, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.75,
            delay: i * 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: stage,
              start: 'top 88%',
              once: true
            }
          }
        );
      });
    }
  }

  /* ---------- Section 7: Customer Stories Slider ---------- */
  function wireStoriesSlider() {
    const track = $('#stories-track');
    const cards = $$('.story-card');
    const dots = $$('.story-dot');
    const prevBtn = $('#story-prev');
    const nextBtn = $('#story-next');

    if (!track || cards.length === 0) return;

    let currentIndex = 0;
    const total = cards.length;

    function goToSlide(idx) {
      if (idx < 0) idx = total - 1;
      if (idx >= total) idx = 0;
      currentIndex = idx;

      track.style.transform = `translateX(-${currentIndex * 100}%)`;

      cards.forEach((c, i) => c.classList.toggle('is-active', i === currentIndex));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === currentIndex));
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => goToSlide(i));
    });

    // Touch swipe support
    let startX = 0;
    track.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    track.addEventListener('touchend', e => {
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 45) {
        if (diff > 0) goToSlide(currentIndex + 1);
        else goToSlide(currentIndex - 1);
      }
    }, { passive: true });
  }

  /* ---------- Section 8: Newsletter Form ---------- */

  /* ---------- Sections 5–8 Smooth, Fail-Safe Reveals ---------- */
  function wireSectionReveals() {
    const reveals = $$('.sec-reveal');

    // First ensure every element is marked for observation
    if ('IntersectionObserver' in window && !reduceMotionQuery.matches) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('is-pending');
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
      });

      reveals.forEach(el => {
        const siblings = Array.from(el.parentElement.children).filter(child => child.classList.contains('sec-reveal'));
        el.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(el), 3) * 90}ms`);
        // Only set is-pending if it is currently below the viewport
        const rect = el.getBoundingClientRect();
        if (rect.top > window.innerHeight && !el.matches('.product-card, .collection-header, .process-stage-item')) {
          el.classList.add('is-pending');
        } else {
          el.classList.add('is-revealed');
        }
        observer.observe(el);
      });
    } else {
      reveals.forEach(el => {
        el.classList.remove('is-pending');
        el.classList.add('is-revealed');
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }

    // Nav active sync for Sections 5, 6, 7
    if (typeof ScrollTrigger !== 'undefined') {
      ['#collection', '#process', '#stories'].forEach((selector, idx) => {
        const secEl = $(selector);
        if (!secEl) return;
        ScrollTrigger.create({
          trigger: secEl,
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter: () => setActive(4 + idx),
          onEnterBack: () => setActive(4 + idx)
        });
      });
    }

  }

    /* =========================================================================
     7. HIGH-PRECISION HONEYBEE CUSTOM CURSOR (Animated Asset GIF/WebP)
     ========================================================================= */
  function initHoneybeeCursor() {
    // Touch devices and reduced motion check
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(hover: none)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReducedMotion) return;

    const cursorEl = $('#bee-cursor');
    const motionEl = $('#bee-cursor-motion');
    const flipEl = $('#bee-cursor-flip');
    if (!cursorEl || !flipEl) return;

    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let prevX = -100;
    let prevY = -100;
    let facing = 1; // 1 = right, -1 = left

    // Smooth physics loop
    function loopCursor() {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      currentX += dx * 0.22;
      currentY += dy * 0.22;

      // Determine horizontal movement & direction flip
      const vx = targetX - prevX;
      if (vx > 1.2 && facing !== 1) {
        facing = 1;
        flipEl.style.transform = 'scaleX(1)';
      } else if (vx < -1.2 && facing !== -1) {
        facing = -1;
        flipEl.style.transform = 'scaleX(-1)';
      }

      // Subtle flight tilt based on vertical movement
      const vy = targetY - prevY;
      const tilt = Math.max(-16, Math.min(16, vy * 0.5 * facing));
      if (motionEl) {
        motionEl.style.transform = `rotate(${tilt}deg)`;
      }

      cursorEl.style.transform = `translate3d(${currentX - 22}px, ${currentY - 18}px, 0)`;

      prevX = targetX;
      prevY = targetY;

      requestAnimationFrame(loopCursor);
    }
    requestAnimationFrame(loopCursor);

    // Track real mouse position
    window.addEventListener('mousemove', e => {
      targetX = e.clientX;
      targetY = e.clientY;
      cursorEl.classList.add('is-active');
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      cursorEl.classList.remove('is-active');
    });

    // Realistic Golden Honey Splash on click (Exact coordinates, non-blocking, fades out in ~1s)
    function triggerHoneySplash(x, y) {
      if (reduceMotionQuery.matches) return;

      const splash = document.createElement('div');
      splash.className = 'honey-splash-container';
      splash.style.left = `${x}px`;
      splash.style.top = `${y}px`;

      const core = document.createElement('div');
      core.className = 'honey-splash-core';
      splash.appendChild(core);

      const dropletCount = 7;
      for (let i = 0; i < dropletCount; i++) {
        const droplet = document.createElement('div');
        droplet.className = 'honey-droplet';
        const angle = (Math.PI * 2 * i) / dropletCount + (Math.random() - 0.5) * 0.45;
        const distance = 16 + Math.random() * 24;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const scale = 0.55 + Math.random() * 0.45;
        droplet.style.setProperty('--dx', `${dx.toFixed(1)}px`);
        droplet.style.setProperty('--dy', `${dy.toFixed(1)}px`);
        droplet.style.setProperty('--dscale', scale.toFixed(2));
        droplet.style.setProperty('--rot', `${(angle * (180 / Math.PI) + 90).toFixed(0)}deg`);
        splash.appendChild(droplet);
      }

      document.body.appendChild(splash);

      setTimeout(() => {
        splash.remove();
      }, 1000);
    }

    // Click quick burst animation + realistic honey splash interaction
    window.addEventListener('click', e => {
      cursorEl.classList.remove('is-bursting');
      void cursorEl.offsetWidth; // re-flow
      cursorEl.classList.add('is-bursting');
      setTimeout(() => cursorEl.classList.remove('is-bursting'), 280);

      // Spawn realistic golden honey splash at exact click position
      triggerHoneySplash(e.clientX, e.clientY);

      // Spawn tiny golden pollen particles
      spawnPollenBurst(e.clientX, e.clientY);
    });

    function spawnPollenBurst(x, y) {
      const count = 6;
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('div');
        dot.className = 'bee-pollen-dot';
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const dist = 20 + Math.random() * 26;
        const pdx = Math.cos(angle) * dist;
        const pdy = Math.sin(angle) * dist;

        dot.style.setProperty('--pdx', `${pdx}px`);
        dot.style.setProperty('--pdy', `${pdy}px`);

        document.body.appendChild(dot);
        setTimeout(() => dot.remove(), 450);
      }
    }
  }

  /* =========================================================================
     8. AUTONOMOUS ROAMING HONEYBEE GIF (Natural Flight & Edge Turning Sequence)
     ========================================================================= */
  function initRoamerBee() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 767px)').matches) return;

    const roamer = $('#roamer-bee');
    const motion = $('#roamer-bee-motion');
    const flip = $('#roamer-bee-flip');
    if (!roamer || !motion || !flip || typeof gsap === 'undefined') return;

    let isFlying = true;
    document.addEventListener('visibilitychange', () => {
      isFlying = !document.hidden;
    });

    function flyRight() {
      if (!isFlying) {
        setTimeout(flyRight, 1000);
        return;
      }

      // 1. Point bee face right
      flip.style.transform = 'scaleX(1)';

      const w = window.innerWidth;
      const h = window.innerHeight;
      const startY = h * (0.22 + Math.random() * 0.40);
      const midY1 = startY + (Math.random() - 0.5) * 80;
      const midY2 = startY + (Math.random() - 0.5) * 80;
      const endY = h * (0.22 + Math.random() * 0.40);

      // Start off-screen left
      gsap.set(roamer, { x: -140, y: startY });
      gsap.set(motion, { rotation: 4 });

      // Fly leisurely along smooth curved path across to right edge
      const duration = 10 + Math.random() * 3.5;

      const tl = gsap.timeline({
        onComplete: () => {
          // 2. Turning sequence at right edge:
          // Bee has reached turning point past visible page edge
          // Flip horizontal direction off-screen
          flip.style.transform = 'scaleX(-1)';
          // Pause briefly (0.8s), then return flying left
          setTimeout(flyLeft, 800 + Math.random() * 600);
        }
      });

      tl.to(roamer, {
        x: w * 0.35,
        y: midY1,
        duration: duration * 0.35,
        ease: 'sine.inOut'
      })
      .to(motion, { rotation: -6, duration: duration * 0.35, ease: 'sine.inOut' }, 0)
      .to(roamer, {
        x: w * 0.70,
        y: midY2,
        duration: duration * 0.35,
        ease: 'sine.inOut'
      })
      .to(motion, { rotation: 6, duration: duration * 0.35, ease: 'sine.inOut' }, duration * 0.35)
      .to(roamer, {
        x: w + 140, // moves slightly away past page edge
        y: endY,
        duration: duration * 0.30,
        ease: 'power1.in' // slows down towards edge
      })
      .to(motion, { rotation: 0, duration: duration * 0.30 }, duration * 0.70);
    }

    function flyLeft() {
      if (!isFlying) {
        setTimeout(flyLeft, 1000);
        return;
      }

      // 1. Point bee face left
      flip.style.transform = 'scaleX(-1)';

      const w = window.innerWidth;
      const h = window.innerHeight;
      const startY = h * (0.24 + Math.random() * 0.40);
      const midY1 = startY + (Math.random() - 0.5) * 90;
      const midY2 = startY + (Math.random() - 0.5) * 90;
      const endY = h * (0.24 + Math.random() * 0.40);

      // Start off-screen right
      gsap.set(roamer, { x: w + 140, y: startY });
      gsap.set(motion, { rotation: -4 });

      const duration = 10 + Math.random() * 3.5;

      const tl = gsap.timeline({
        onComplete: () => {
          // 2. Turning sequence at left edge:
          // Bee has reached turning point past left edge
          // Flip horizontal direction off-screen
          flip.style.transform = 'scaleX(1)';
          // Pause briefly, then return flying right
          setTimeout(flyRight, 800 + Math.random() * 600);
        }
      });

      tl.to(roamer, {
        x: w * 0.65,
        y: midY1,
        duration: duration * 0.35,
        ease: 'sine.inOut'
      })
      .to(motion, { rotation: 6, duration: duration * 0.35, ease: 'sine.inOut' }, 0)
      .to(roamer, {
        x: w * 0.30,
        y: midY2,
        duration: duration * 0.35,
        ease: 'sine.inOut'
      })
      .to(motion, { rotation: -6, duration: duration * 0.35, ease: 'sine.inOut' }, duration * 0.35)
      .to(roamer, {
        x: -140, // moves slightly away past left page edge
        y: endY,
        duration: duration * 0.30,
        ease: 'power1.in'
      })
      .to(motion, { rotation: 0, duration: duration * 0.30 }, duration * 0.70);
    }

    // Start initial flight after short delay
    setTimeout(flyRight, 1200);
  }

  /* ---------- Master Expansion Initializer ---------- */
  function initExpansion() {
    CartStore.init();
    wireCartDrawer();
    initCollectionSectionAnim();
    wireProcessTimeline();
    wireStoriesSlider();

    wireSectionReveals();
    // Native pointer keeps small controls precise and avoids a perpetual cursor loop.
    // The scroll journey owns the bee; no autonomous flight competes with it.
  }

/* ---------- 6. INIT / MATCHMEDIA ---------- */
  function init() {
    root.classList.add('js');
    hydrate();
    wireNav();
    const gsapOk = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    if (gsapOk) gsap.registerPlugin(ScrollTrigger);
    // Shopping and native section reveals also work if animation libraries fail.
    if (!gsapOk) initExpansion();
    if (!gsapOk) {                                    // libraries failed to load → static layout stays
      root.classList.add('ready');
      console.warn('[Golden Bloom] GSAP/ScrollTrigger not available — showing the static layout.');
      return;
    }

    ScrollTrigger.config({ ignoreMobileResize: true }); // ignore mobile browser-chrome resize jitter

    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        mobile: '(max-width: 767px)'
      },
      context => {
        const { motion, mobile } = context.conditions;
        if (!motion) { tl = null; return; }            // reduced motion → simple stacked layout

        root.classList.add('cine');
        buildParticles();
        buildMaster(mobile);

        // everything created here is reverted automatically when the media query changes
        return () => {
          root.classList.remove('cine');
          if (surfaceHandler) { ScrollTrigger.removeEventListener('refreshInit', surfaceHandler); surfaceHandler = null; }
          if (tl && typeof tl.cleanupPollen === 'function') tl.cleanupPollen();
          tl = null;
        };
      }
    );

    // Pin spacing must exist before below-the-fold reveal triggers are measured.
    initExpansion();

    const reveal = () => {
      ScrollTrigger.refresh();
      root.classList.add('ready');
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('panel')) {
        const p = parseInt(urlParams.get('panel'), 10);
        if (p >= 1 && p <= 4) setTimeout(() => scrollToPanel(p - 1), 150);
      } else if (window.location.hash) {
        const h = window.location.hash;
        if (h === '#panel-2') setTimeout(() => scrollToPanel(1), 150);
        else if (h === '#panel-3') setTimeout(() => scrollToPanel(2), 150);
        else if (h === '#panel-4') setTimeout(() => scrollToPanel(3), 150);
      }
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reveal); else reveal();
    window.addEventListener('load', () => ScrollTrigger.refresh());

    let rt;                                           // debounced resize safety net
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
