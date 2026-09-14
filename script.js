(() => {
    'use strict';

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    const hero = document.getElementById('hero');

    const nameEl = document.getElementById('name');
    const subtitleEl = document.getElementById('subtitle');

    const loader = document.getElementById('loader');
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');

    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');

    const cursorGlow = document.getElementById('cursor-glow');
    const cursorDot = document.getElementById('cursor-dot');

    const scrollHint = document.getElementById('scroll-hint');


    // ============================================================
    // CONFIGURAÇÕES
    // ============================================================

    const isMobile = () => window.innerWidth <= 768;

    function getFrameFolder() {
        return isMobile() ? 'FramesIphone' : 'FramesMac';
    }

    function getTotal() {
        return isMobile() ? 301 : 314;
    }


    // ============================================================
    // TIMELINE
    // ============================================================

    // ------------------------------------------------------------
    // VÍDEO
    // ------------------------------------------------------------

    // Mac termina antes de qualquer texto aparecer.
    const VIDEO_END = 0.60;


    // ------------------------------------------------------------
    // NOME
    // ------------------------------------------------------------

    // Pequena pausa depois do último frame.
    const TEXT_START = 0.50;

    // Nome aparece gradualmente.
    const NAME_FADE_END = 0.80;

    // Fica bastante tempo parado no centro.
    const NAME_MOVE_START = 0.99;

    // Movimento lento até o final.
    const NAME_MOVE_END = 1.00;


    // ------------------------------------------------------------
    // SUBTÍTULO
    // ------------------------------------------------------------

    const SUBTITLE_START = 0.60;
    const SUBTITLE_FADE_END = 0.95;

    const SUBTITLE_HOLD_END = 0.99;
    const SUBTITLE_END = 0.99;


    // ------------------------------------------------------------
    // NAVBAR
    // ------------------------------------------------------------

    const NAVBAR_START = 0.985;

    // ============================================================
    // ESTADO
    // ============================================================

    const MAX_POOL = 80;
    const PRELOAD_AHEAD = 40;
    const PRELOAD_BEHIND = 10;

    let framePool = new Map();
    let loaded = 0;
    let lastIdx = -1;
    let loadingFrames = new Set();

    let ticking = false;


    // ============================================================
    // CANVAS
    // ============================================================

    function sizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
    }


    function draw(i) {
        let img = framePool.get(i);
        if (!img) {
            let best = lastIdx;
            let bestDist = Infinity;
            for (const [idx] of framePool) {
                const d = Math.abs(idx - i);
                if (d < bestDist) {
                    bestDist = d;
                    best = idx;
                }
            }
            if (best >= 0 && framePool.has(best)) {
                img = framePool.get(best);
            } else {
                preloadRange(i);
                return;
            }
        }

        lastIdx = i;

        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        const cvsW = canvas.width;
        const cvsH = canvas.height;

        const imgRatio = imgW / imgH;
        const cvsRatio = cvsW / cvsH;

        let sx, sy, sw, sh;

        if (imgRatio > cvsRatio) {
            sh = imgH;
            sw = imgH * cvsRatio;
            sx = (imgW - sw) / 2;
            sy = 0;
        } else {
            sw = imgW;
            sh = imgW / cvsRatio;
            sx = 0;
            sy = (imgH - sh) / 2;
        }

        ctx.drawImage(
            img,
            sx, sy, sw, sh,
            0, 0, cvsW, cvsH
        );
    }


    // ============================================================
    // PROGRESSO DO HERO
    // ============================================================

    function getProgress() {
        const total =
            hero.offsetHeight -
            window.innerHeight;

        if (total <= 0) {
            return 0;
        }

        return Math.max(
            0,
            Math.min(
                1,
                -hero.getBoundingClientRect().top / total
            )
        );
    }


    // ============================================================
    // FRAME DO MAC
    // ============================================================

    function getFrame() {

        const p = getProgress();


        // O vídeo ocupa somente a primeira parte do scroll.
        //
        // Quando p chega em VIDEO_END,
        // o vídeo já está no último frame.

        const videoProgress = clamp(
            p / VIDEO_END,
            0,
            1
        );


        return Math.min(
            getTotal() - 1,
            Math.floor(
                videoProgress * (getTotal() - 1)
            )
        );
    }


    // ============================================================
    // HELPERS
    // ============================================================

    function clamp(v, min, max) {
        return Math.max(
            min,
            Math.min(max, v)
        );
    }


    function lerp(a, b, t) {
        return a +
            (b - a) *
            clamp(t, 0, 1);
    }


    function smoothstep(t) {

        t = clamp(t, 0, 1);

        return t * t * (3 - 2 * t);
    }


    function easeInOutQuart(t) {

        t = clamp(t, 0, 1);

        return t < 0.5
            ? 8 * t * t * t * t
            : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }


    // ============================================================
    // NOME
    // ============================================================

    function updateName(p) {

        const vw = window.innerWidth;
        const vh = window.innerHeight;


        // --------------------------------------------------------
        // TAMANHOS
        // --------------------------------------------------------

        const centerFontSize = isMobile()
            ? clamp(vw * 0.065, 1.8, 2.5)
            : clamp(vw * 0.06, 2, 5);

        const finalFontSize = isMobile()
            ? clamp(vw * 0.035, 1.1, 1.5)
            : clamp(vw * 0.015, 0.9, 1.2);


        // --------------------------------------------------------
        // ESTADO INICIAL
        // --------------------------------------------------------

        let opacity = 0;

        let top = vh / 2;
        let left = vw / 2;

        let fontSize = centerFontSize;

        let translateX = -50;
        let translateY = -50;

        let align = 'center';


        // ========================================================
        // ANTES DO TEXTO
        // ========================================================

        if (p < TEXT_START) {

            nameEl.style.opacity = 0;

            nameEl.style.top =
                `${top}px`;

            nameEl.style.left =
                `${left}px`;

            nameEl.style.fontSize =
                `${fontSize}rem`;

            nameEl.style.textAlign =
                align;

            nameEl.style.transform =
                `translate(${translateX}%, ${translateY}%)`;

            return;
        }


        // ========================================================
        // FADE IN
        // ========================================================

        if (p >= TEXT_START) {

            const fadeProgress = clamp(
                (p - TEXT_START) /
                (NAME_FADE_END - TEXT_START),
                0,
                1
            );

            opacity = smoothstep(
                fadeProgress
            );
        }


        // ========================================================
        // MOVIMENTO
        // ========================================================

        if (p >= NAME_MOVE_START) {

            let movementProgress =
                (p - NAME_MOVE_START) /
                (NAME_MOVE_END - NAME_MOVE_START);


            movementProgress = clamp(
                movementProgress,
                0,
                1
            );


            // ----------------------------------------------------
            // CURVA MUITO LENTA
            // ----------------------------------------------------
            //
            // Não começa a correr imediatamente.
            //
            // A primeira metade da animação é propositalmente
            // muito lenta.
            //

            const eased =
                easeInOutQuart(
                    movementProgress
                );


            // ----------------------------------------------------
            // POSIÇÃO
            // ----------------------------------------------------

            top = lerp(
                vh / 2,
                1.1 * 16,
                eased
            );

            left = lerp(
                vw / 2,
                1.5 * 16,
                eased
            );


            // ----------------------------------------------------
            // TAMANHO
            // ----------------------------------------------------

            fontSize = lerp(
                centerFontSize,
                finalFontSize,
                eased
            );


            // ----------------------------------------------------
            // ALIGN
            // ----------------------------------------------------

            translateX = lerp(
                -50,
                0,
                eased
            );

            translateY = lerp(
                -50,
                0,
                eased
            );

            align = 'left';
        }


        // ========================================================
        // APLICA
        // ========================================================

        nameEl.style.opacity =
            opacity;

        nameEl.style.top =
            `${top}px`;

        nameEl.style.left =
            `${left}px`;

        nameEl.style.fontSize =
            `${fontSize}rem`;

        nameEl.style.textAlign =
            align;

        nameEl.style.transform =
            `translate(${translateX}%, ${translateY}%)`;
        nameEl.style.transition = `top 0.8s ease, left 0.8s ease, font-size 0.8s ease, transform 1s ease, text-align 0.8s ease`;    
    }


    // ============================================================
    // SUBTÍTULO
    // ============================================================

    function updateSubtitle(p) {

        const vw = window.innerWidth;
        const vh = window.innerHeight;


        let opacity = 0;
        let translateY = 30;


        // --------------------------------------------------------
        // ANTES
        // --------------------------------------------------------

        if (p < SUBTITLE_START) {

            subtitleEl.style.opacity = 0;

            subtitleEl.style.transform =
                'translateX(-50%) translateY(30px)';

            subtitleEl.style.top =
                `${vh / 2 + 6 * 16}px`;

            subtitleEl.style.left = '50%';

            return;
        }


        // --------------------------------------------------------
        // FADE IN
        // --------------------------------------------------------

        if (
            p >= SUBTITLE_START &&
            p < SUBTITLE_FADE_END
        ) {

            const t =
                (p - SUBTITLE_START) /
                (SUBTITLE_FADE_END - SUBTITLE_START);

            opacity = smoothstep(t);

            translateY = lerp(
                30,
                0,
                smoothstep(t)
            );
        }


        // --------------------------------------------------------
        // HOLD
        // --------------------------------------------------------

        else if (
            p >= SUBTITLE_FADE_END &&
            p < SUBTITLE_HOLD_END
        ) {

            opacity = 1;
            translateY = 0;
        }


        // --------------------------------------------------------
        // FADE OUT
        // --------------------------------------------------------

        else if (
            p >= SUBTITLE_HOLD_END &&
            p < SUBTITLE_END
        ) {

            const t =
                (p - SUBTITLE_HOLD_END) /
                (SUBTITLE_END - SUBTITLE_HOLD_END);

            const eased = smoothstep(t);

            opacity = lerp(
                1,
                0,
                eased
            );

            translateY = lerp(
                0,
                -25,
                eased
            );
        }


        // --------------------------------------------------------
        // POSIÇÃO
        // --------------------------------------------------------

        subtitleEl.style.opacity =
            opacity;

        subtitleEl.style.transform =
            `translateX(-50%) translateY(${translateY}px)`;

        subtitleEl.style.top =
            `${vh / 2 + 6 * 16}px`;

        subtitleEl.style.left =
            '50%';


        // Evita variável não utilizada caso queira usar
        // o viewport futuramente nessa posição.
        void vw;
    }


    // ============================================================
    // TEXTO / UI
    // ============================================================

    function updateText() {

        const p = getProgress();

        const vw = window.innerWidth;
        const vh = window.innerHeight;


        // ========================================================
        // NOME
        // ========================================================

        updateName(p);


        // ========================================================
        // SUBTÍTULO
        // ========================================================

        updateSubtitle(p);


        // ========================================================
        // FOTO SOBRE
        // ========================================================

        const fotoEl = document.getElementById('sobre-foto');

        if (fotoEl) {
            const rect = fotoEl.getBoundingClientRect();

            if (rect.top < vh * 0.85) {
                const t = clamp(
                    (vh * 0.85 - rect.top) / (vh * 0.4),
                    0,
                    1
                );
                const eased = easeInOutQuart(t);
                fotoEl.style.opacity = eased;
                fotoEl.style.transform =
                    `translateX(${lerp(80, 0, eased)}px)`;
            } else if (rect.top > vh * 1.0) {
                fotoEl.style.opacity = 0;
                fotoEl.style.transform = 'translateX(80px)';
            }
        }


        // ========================================================
        // CANVAS OPACITY (fade out when hero ends)
        // ========================================================

        canvas.style.opacity =
            p >= VIDEO_END
                ? clamp(1 - (p - VIDEO_END) / (NAVBAR_START - VIDEO_END), 0, 1)
                : 1;


        // ========================================================
        // NAVBAR
        // ========================================================

        navbar.classList.toggle(
            'visible',
            p >= NAVBAR_START
        );


        // ========================================================
        // CURSOR
        // ========================================================

        if (
            p >= NAVBAR_START &&
            !cursorReady
        ) {

            cursorReady = true;

            mouseX = vw / 2;
            mouseY = vh / 2;
        }


        // ========================================================
        // SCROLL REVEAL
        // ========================================================

        document
            .querySelectorAll('.scroll-reveal')
            .forEach((el) => {

                const rect =
                    el.getBoundingClientRect();

                if (
                    rect.top <
                    vh * 0.85
                ) {

                    el.classList.add(
                        'visible'
                    );
                } else if (
                    rect.top >
                    vh * 1.0
                ) {

                    el.classList.remove(
                        'visible'
                    );
                }
            });


        // ========================================================
        // CARD REVEAL (sem destruir innerHTML)
        // ========================================================

        document
            .querySelectorAll('.card-reveal')
            .forEach((el, i) => {

                if (!el.style.getPropertyValue('--i')) {
                    const siblings =
                        el.parentNode.querySelectorAll('.card-reveal');
                    const idx =
                        Array.from(siblings).indexOf(el);
                    el.style.setProperty('--i', idx);
                }

                const rect =
                    el.getBoundingClientRect();

                if (
                    rect.top <
                    vh * 0.9
                ) {

                    el.classList.add(
                        'visible'
                    );
                }
            });


        // ========================================================
        // TIMELINE ITEMS
        // ========================================================

        document
            .querySelectorAll('.timeline-item')
            .forEach((el) => {

                const rect =
                    el.getBoundingClientRect();

                if (
                    rect.top <
                    vh * 0.85
                ) {
                    el.classList.add('visible');
                } else if (
                    rect.top >
                    vh * 1.0
                ) {
                    el.classList.remove('visible');
                }
            });


        // ========================================================
        // TIMELINE LINE
        // ========================================================

        const timelineSection =
            document.getElementById('experiencias');

        if (timelineSection) {

            const line =
                timelineSection
                    .querySelector('.timeline-line');

            if (line) {

                const sRect =
                    timelineSection.getBoundingClientRect();

                const sTop =
                    -sRect.top;

                const sHeight =
                    sRect.height - vh;

                if (sHeight > 0) {

                    const progress =
                        clamp(
                            sTop / sHeight,
                            0,
                            1
                        );

                    line.style.setProperty(
                        '--fill',
                        `${progress * 100}%`
                    );
                }
            }
        }


        // ========================================================
        // NAV ACTIVE
        // ========================================================

        if (p >= NAVBAR_START) {

            const sections = [
                'sobre',
                'experiencias',
                'projetos',
                'certificados',
                'contato'
            ];

            let active = 0;


            for (
                let i = sections.length - 1;
                i >= 0;
                i--
            ) {

                const el =
                    document.getElementById(
                        sections[i]
                    );


                if (
                    el &&
                    el.getBoundingClientRect().top
                    <= vh * 0.5
                ) {

                    active = i;

                    break;
                }
            }


            navLinks.forEach(
                (link, i) => {

                    link.classList.toggle(
                        'active',
                        i === active
                    );
                }
            );
        }
    }


    // ============================================================
    // SCROLL
    // ============================================================

    function onScroll() {

        scrollHint.classList.remove('visible');

        if (ticking) {
            return;
        }

        ticking = true;


        requestAnimationFrame(() => {

            ticking = false;


            // ----------------------------------------------------
            // FRAME DO VÍDEO
            // ----------------------------------------------------

            const f = getFrame();

            if (f !== lastIdx) {

                draw(f);
                preloadRange(f);
            }


            // ----------------------------------------------------
            // TEXTOS
            // ----------------------------------------------------

            updateText();
        });
    }


    // ============================================================
    // POOL: EVICT FRAMES FAR FROM CURRENT
    // ============================================================

    function evictPool(currentIdx) {
        if (framePool.size <= MAX_POOL) return;

        const entries = [...framePool.keys()];
        entries.sort(
            (a, b) =>
                Math.abs(a - currentIdx) -
                Math.abs(b - currentIdx)
        );

        while (framePool.size > MAX_POOL) {
            const farthest = entries.pop();
            framePool.delete(farthest);
        }
    }


    // ============================================================
    // POOL: PRELOAD A RANGE AROUND CURRENT
    // ============================================================

    function preloadRange(currentIdx) {
        const total = getTotal();
        const start = Math.max(0, currentIdx - PRELOAD_BEHIND);
        const end = Math.min(total - 1, currentIdx + PRELOAD_AHEAD);

        for (let i = start; i <= end; i++) {
            if (
                !framePool.has(i) &&
                !loadingFrames.has(i)
            ) {
                loadSingleFrame(i);
            }
        }

        evictPool(currentIdx);
    }


    // ============================================================
    // LOAD SINGLE FRAME (POOL)
    // ============================================================

    function loadSingleFrame(index) {
        if (framePool.has(index) || loadingFrames.has(index)) return;

        loadingFrames.add(index);

        const img = new Image();

        img.onload = () => {
            framePool.set(index, img);
            loadingFrames.delete(index);
            loaded++;

            if (loaded === 1) {
                sizeCanvas();
                draw(0);

                loader.classList.add('hidden');

                setTimeout(() => {
                    loader.remove();
                    scrollHint.classList.add('visible');
                }, 400);

                window.addEventListener(
                    'scroll',
                    onScroll,
                    { passive: true }
                );

                window.addEventListener('resize', () => {
                    const idx = lastIdx >= 0 ? lastIdx : 0;
                    if (framePool.has(idx)) {
                        sizeCanvas();
                        draw(idx);
                    }
                    updateText();
                });

                updateText();
            }

            const pct = Math.round(
                (loaded / getTotal()) * 100
            );
            loaderBar.style.width = `${pct}%`;
            loaderText.textContent = `${pct}%`;
        };

        img.onerror = () => {
            loadingFrames.delete(index);
            loaded++;
        };

        img.src =
            `${getFrameFolder()}/frame_${String(index + 1).padStart(3, '0')}.jpg`;
    }


    // ============================================================
    // INIT
    // ============================================================

    async function init() {

        // --------------------------------------------------------
        // SCROLL REVEAL
        // --------------------------------------------------------

        document
            .querySelectorAll('.scroll-reveal')
            .forEach((el) => {

                const text =
                    el.textContent.trim();

                el.innerHTML = '';


                text.split('\n').forEach(
                    (line) => {

                        const trimmed =
                            line.trim();

                        if (!trimmed) {
                            return;
                        }


                        const span =
                            document.createElement(
                                'span'
                            );

                        span.className =
                            'line';

                        span.textContent =
                            trimmed;

                        el.appendChild(span);
                    }
                );
            });


        // --------------------------------------------------------
        // LOAD INICIAL: só os primeiros frames + janela à frente
        // --------------------------------------------------------

        const initialBatch = Math.min(PRELOAD_AHEAD + PRELOAD_BEHIND + 1, getTotal());
        const slice = [];

        for (let j = 0; j < initialBatch; j++) {
            slice.push(
                new Promise((resolve) => {
                    loadSingleFrame(j);
                    resolve();
                })
            );
        }

        await Promise.all(slice);
    }


    init();


    // ============================================================
    // CURSOR GLOW
    // ============================================================

    let mouseX = -100;
    let mouseY = -100;

    let glowX = -100;
    let glowY = -100;

    let dotX = -100;
    let dotY = -100;

    let cursorReady = false;


    // ============================================================
    // MOUSE MOVE
    // ============================================================

    document.addEventListener(
        'mousemove',
        (e) => {

            mouseX = e.clientX;
            mouseY = e.clientY;


            if (cursorReady) {

                cursorGlow.classList.add(
                    'active'
                );

                cursorDot.classList.add(
                    'active'
                );
            }
        }
    );


    // ============================================================
    // MOUSE LEAVE
    // ============================================================

    document.addEventListener(
        'mouseleave',
        () => {

            cursorGlow.classList.remove(
                'active'
            );

            cursorDot.classList.remove(
                'active'
            );
        }
    );


    // ============================================================
    // INTERACTIVE ELEMENTS
    // ============================================================

    const interactiveEls =
        'a, button, .nav-link, [role="button"]';


    // ============================================================
    // MOUSE OVER
    // ============================================================

    document.addEventListener(
        'mouseover',
        (e) => {

            if (
                e.target.closest(
                    interactiveEls
                )
            ) {

                cursorDot.classList.add(
                    'hover'
                );
            }
        }
    );


    // ============================================================
    // MOUSE OUT
    // ============================================================

    document.addEventListener(
        'mouseout',
        (e) => {

            if (
                e.target.closest(
                    interactiveEls
                )
            ) {

                cursorDot.classList.remove(
                    'hover'
                );
            }
        }
    );


    // ============================================================
    // CURSOR ANIMATION
    // ============================================================

    let cursorAnimFrame = null;

    function animateCursor() {

        if (isMobile()) return;

        const glowEase = 0.08;
        const dotEase = 0.18;


        glowX +=
            (mouseX - glowX) *
            glowEase;

        glowY +=
            (mouseY - glowY) *
            glowEase;


        dotX +=
            (mouseX - dotX) *
            dotEase;

        dotY +=
            (mouseY - dotY) *
            dotEase;


        cursorGlow.style.left =
            `${glowX}px`;

        cursorGlow.style.top =
            `${glowY}px`;


        cursorDot.style.left =
            `${dotX}px`;

        cursorDot.style.top =
            `${dotY}px`;


        cursorAnimFrame =
            requestAnimationFrame(
                animateCursor
            );
    }


    if (!isMobile()) {
        animateCursor();
    }


    // ============================================================
    // MODAL
    // ============================================================

    const modalOverlay =
        document.getElementById('modal-overlay');

    const modalTitle =
        document.getElementById('modal-title');

    const modalText =
        document.getElementById('modal-text');

    const modalClose =
        document.getElementById('modal-close');


    function openModal(title, text) {

        modalTitle.textContent = title;
        modalText.textContent = text;

        modalOverlay.classList.add('active');
    }


    function closeModal() {

        modalOverlay.classList.remove('active');
    }


    document
        .querySelectorAll('.timeline-card')
        .forEach((card) => {

            card.addEventListener('click', () => {

                const item =
                    card.closest('.timeline-item');

                if (!item) return;

                openModal(
                    item.dataset.title,
                    item.dataset.detalhes
                );
            });
        });


    modalClose.addEventListener(
        'click',
        closeModal
    );


    modalOverlay.addEventListener(
        'click',
        (e) => {

            if (
                e.target === modalOverlay
            ) {

                closeModal();
            }
        }
    );


    document.addEventListener(
        'keydown',
        (e) => {

            if (
                e.key === 'Escape' &&
                modalOverlay.classList.contains(
                    'active'
                )
            ) {

                closeModal();
            }
        }
    );


    // ============================================================
    // CAROUSEL
    // ============================================================

    document
        .querySelectorAll('.carousel')
        .forEach(function(carousel) {

            var track =
                carousel.querySelector(
                    '.carousel-track'
                );

            var slides =
                track.children;

            var prev =
                carousel.querySelector(
                    '.prev'
                );

            var next =
                carousel.querySelector(
                    '.next'
                );

            var dots =
                carousel.querySelectorAll(
                    '.dot'
                );

            var current = 0;


            function goTo(i) {

                current =
                    (i + slides.length) %
                    slides.length;

                track.style.transform =
                    'translateX(-' +
                    (current * 100) +
                    '%)';

                dots.forEach(
                    function(d, j) {

                        d.classList.toggle(
                            'active',
                            j === current
                        );
                    }
                );
            }


            prev.addEventListener(
                'click',
                function() {

                    goTo(current - 1);
                }
            );


            next.addEventListener(
                'click',
                function() {

                    goTo(current + 1);
                }
            );


            dots.forEach(
                function(d, i) {

                    d.addEventListener(
                        'click',
                        function() {

                            goTo(i);
                        }
                    );
                }
            );
        });


    // ============================================================
    // IMAGE MODAL
    // ============================================================

    const imgModalOverlay =
        document.getElementById('image-modal-overlay');

    const imgModalImg =
        document.getElementById('image-modal-img');

    const imgModalClose =
        document.getElementById('image-modal-close');

    const imgModalPrev =
        document.getElementById('image-modal-prev');

    const imgModalNext =
        document.getElementById('image-modal-next');

    let imgModalSlides = [];
    let imgModalIdx = 0;


    function openImageModal(slide, slides) {
        imgModalSlides = Array.from(slides);
        imgModalIdx = imgModalSlides.indexOf(slide);

        if (imgModalIdx < 0) return;

        imgModalImg.src = slide.src;
        imgModalImg.alt = slide.alt;

        imgModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }


    function closeImageModal() {
        imgModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }


    function navigateImageModal(dir) {
        imgModalIdx =
            (imgModalIdx + dir + imgModalSlides.length) %
            imgModalSlides.length;

        imgModalImg.src = imgModalSlides[imgModalIdx].src;
        imgModalImg.alt = imgModalSlides[imgModalIdx].alt;
    }


    imgModalClose.addEventListener('click', closeImageModal);

    imgModalOverlay.addEventListener('click', function(e) {
        if (e.target === imgModalOverlay) {
            closeImageModal();
        }
    });

    imgModalPrev.addEventListener('click', function() {
        navigateImageModal(-1);
    });

    imgModalNext.addEventListener('click', function() {
        navigateImageModal(1);
    });

    document.addEventListener('keydown', function(e) {
        if (!imgModalOverlay.classList.contains('active')) return;

        if (e.key === 'Escape') closeImageModal();
        if (e.key === 'ArrowLeft') navigateImageModal(-1);
        if (e.key === 'ArrowRight') navigateImageModal(1);
    });


    document.querySelectorAll('.carousel').forEach(function(carousel) {

        var track = carousel.querySelector('.carousel-track');
        var slides = track.querySelectorAll('.carousel-slide');

        slides.forEach(function(slide) {
            slide.style.cursor = 'zoom-in';

            slide.addEventListener('click', function() {
                openImageModal(slide, slides);
            });
        });
    });

})();