// Свет в конце страницы: жёлтый сгусток, напечатанный растром, как портрет на
// визитке (точки на сетке под 45°, площадь точки — по силе света). Контакты и
// подвал — два холста, но поле у них одно, в общих координатах: свет и волны
// переходят из блока в блок без шва.
// Сгусток — цепочка точек: голова тянется к цели на пружине, остальные за ней,
// на скорости получается хвост. Цель — курсор или палец, а без них он сам бродит
// по видимой части блоков. Нажатие стягивает сгусток в плотный шар, и он разряжается
// кольцом, а потом свет отрастает заново. Вокруг мелкого текста (data-light-calm)
// точки сходят на нет: это подложка из самого растра, контраст как на чистом фоне.
// Палец только смотрим (слушатели пассивные): вертикальный свайп листает страницу.
// Считается, только пока блоки на экране. Нет WebGL — холстов нет.

const LINKS = 6;
const RIPPLES = 6;
const RIPPLE_LIFE = 2.2; // с
/** Сколько сгусток стягивается перед выстрелом, с. */
const CHARGE = 0.2;
/** Участков с мелким текстом на контакты и подвал вместе. */
const CALMS = 3;

const VERTEX = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0., 1.); }`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uOrigin;
uniform float uHeight, uDpr, uCell, uTime, uHeat, uWave, uLoose, uPunch;
uniform vec3 uBound;
uniform vec4 uChain[${LINKS}];
uniform vec3 uRipple[${RIPPLES}];
uniform vec4 uCalm[${CALMS}];

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float field(vec2 p) {
  float f = 0.;
  for (int i = 0; i < ${LINKS}; i++) {
    vec2 d = p - uChain[i].xy;
    f += uChain[i].z * exp(-dot(d, d) / (uChain[i].w * uChain[i].w));
  }
  return f;
}
// 0 на тексте и рядом с ним, 1 дальше 44 пикселей от него.
float calm(vec2 p) {
  float m = 1.;
  for (int i = 0; i < ${CALMS}; i++) {
    vec2 q = abs(p - uCalm[i].xy) - uCalm[i].zw;
    m = min(m, smoothstep(0., 44., length(max(q, 0.)) + min(max(q.x, q.y), 0.)));
  }
  return m;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uDpr + uOrigin;
  vec2 toBound = p - uBound.xy;
  // Большая часть блока в темноте: там считать нечего.
  if (dot(toBound, toBound) > uBound.z * uBound.z) { gl_FragColor = vec4(0.); return; }

  // Поле течёт: из-за сдвига по шуму пятно получается не кругом, а с языками.
  // Сдвиг сильнее этого складывает поле само на себя: появляются резкие грани.
  vec2 q = p / 200.;
  vec2 warp = vec2(noise(q + vec2(0., uTime * .1)), noise(q + vec2(5.2, -uTime * .09))) - .5;
  vec2 fine = q * 2.3 + warp * 2.;
  warp += .3 * (vec2(noise(fine + vec2(uTime * .13, 0.)), noise(fine + vec2(3.1, uTime * .11))) - .5);
  warp *= 95. * uLoose;

  // Центр точки растра: у точки один тон на всю её площадь, как в печати.
  const float s = .70710678;
  vec2 g = vec2(s * (p.x + p.y), s * (p.y - p.x)) / uCell;
  vec2 id = floor(g);
  vec2 uv = g - id - .5;
  vec2 cg = (id + .5) * uCell;
  vec2 center = vec2(s * (cg.x - cg.y), s * (cg.x + cg.y));

  float tone = 1. - exp(-field(center + warp) * .5 * uHeat);
  tone *= tone;
  tone *= mix(.82, 1.08, noise(center / 150. + warp / 300. + uTime * .06));
  tone *= .92 + .16 * hash(id * .01);

  // Кольцо: расходится и плавно тормозит, спереди край резкий, сзади шлейф.
  float swell = 0.;
  for (int i = 0; i < ${RIPPLES}; i++) {
    float age = uRipple[i].z;
    if (age < 0.) continue;
    float life = age / ${RIPPLE_LIFE.toFixed(1)};
    float d = distance(center, uRipple[i].xy) - 30. - uWave * (1. - pow(1. - life, 2.));
    swell += exp(-d * d / (d > 0. ? 300. : 3000.)) * pow(1. - life, 1.3);
  }
  float quiet = calm(center);
  tone = clamp(tone + swell * .95, 0., 1.) * quiet;

  // В шаре и на кольце точки разрастаются и почти сливаются.
  float radius = sqrt(tone) * (.44 + .22 * uPunch + .2 * min(swell, 1.));
  float aa = 1. / (uCell * uDpr);
  float dotMask = (1. - smoothstep(radius - aa, radius + aa, length(uv))) * step(.02, tone);

  // Мягкое свечение под точками: шум убирает ступеньки на тёмном фоне.
  float glow = 1. - exp(-field(p + warp) * .5 * uHeat);
  glow *= glow * .1 * quiet;
  float alpha = 1. - (1. - glow) * (1. - dotMask * (.3 + .55 * tone + .15 * uPunch));
  alpha += (hash(gl_FragCoord.xy * .37) - .5) * step(.002, alpha) * 2.5 / 255.;
  vec3 color = mix(vec3(.86, .5, .07), vec3(1., .831, .231), smoothstep(.1, .55, tone));
  gl_FragColor = vec4(color * alpha, alpha);
}`;

type Surface = {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  uniforms: Record<string, WebGLUniformLocation | null>;
  sized: boolean;
  shown: boolean;
};

function createSurface(el: HTMLElement): Surface | null {
  const canvas = document.createElement("canvas");
  canvas.className = "end-light";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.bindAttribLocation(program, 0, "a");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // Один треугольник на весь холст.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.clearColor(0, 0, 0, 0);

  const uniforms = Object.fromEntries(
    ["uOrigin", "uHeight", "uDpr", "uCell", "uTime", "uHeat", "uWave", "uLoose", "uPunch", "uBound", "uChain", "uRipple", "uCalm"].map(
      (name) => [name, gl.getUniformLocation(program, name)],
    ),
  );
  el.prepend(canvas);
  return { el, canvas, gl, uniforms, sized: false, shown: false };
}

export function initLight(): () => void {
  const contact = document.querySelector<HTMLElement>("#contact");
  const footer = document.querySelector<HTMLElement>("footer");
  if (!contact || !footer) return () => {};
  const blocks = [contact, footer];
  const calmBlocks = blocks.flatMap((block) => [...block.querySelectorAll<HTMLElement>("[data-light-calm]")]).slice(0, CALMS);

  // Холсты — при первом приближении к блокам: до них многие не долистывают.
  let surfaces: Surface[] = [];
  let built = false;
  /** Понижается, если кадры не успевают. */
  let maxDpr = 2;
  let slowFrames = 0;

  // Координаты света — от левого верхнего угла контактов: прокрутка его не двигает.
  const chain = Array.from({ length: LINKS }, () => ({ x: 0, y: 0 }));
  const velocity = { x: 0, y: 0 };
  const chainData = new Float32Array(LINKS * 4);
  const rippleData = new Float32Array(RIPPLES * 3).fill(-1);
  const calmData = new Float32Array(CALMS * 4).fill(-1e5);
  let nextRipple = 0;
  /** Нажатие, которое ещё не выстрелило: куда стягиваться и сколько осталось. */
  let charge: { x: number; y: number; left: number } | null = null;
  /** Насколько сгусток стянут в шар: 0 — обычный, 1 — шар. */
  let gather = 0;
  /** Сколько силы ушло в кольцо: сразу после выстрела 1, потом свет набирает её заново. */
  let spent = 0;
  /** Где курсор или палец — в координатах окна: прокрутка уносит блок, свет догоняет. */
  let pointer: { x: number; y: number } | null = null;
  let heat = 0;
  let ignition = 0;
  let placed = false;
  let time = Math.random() * 100;
  let last = 0;
  let frame = 0;
  const visible = new Set<Element>();

  const render = (now: number) => {
    frame = requestAnimationFrame(render);
    const dt = Math.min((now - last) / 1000 || 1 / 60, 1 / 20);
    last = now;
    time += dt;
    ignition = Math.min(1, ignition + dt / 1.8);

    // Медленный телефон: реже точки не сделаешь, а пикселей можно посчитать меньше.
    if (dt > 0.03 && maxDpr > 1) {
      if (++slowFrames > 40) {
        maxDpr = maxDpr > 1.5 ? 1.5 : 1;
        slowFrames = 0;
        surfaces.forEach((surface) => (surface.sized = false));
      }
    } else slowFrames = Math.max(0, slowFrames - 1);

    const zone = contact.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const zoneBottom = footerRect.bottom;

    // Цель: курсор, если он в блоках на экране, иначе медленный обход видимой части.
    const inside = pointer && pointer.y >= zone.top && pointer.y <= zoneBottom;
    let tx: number;
    let ty: number;
    if (inside) {
      tx = pointer!.x - zone.left;
      ty = pointer!.y - zone.top;
    } else {
      const top = Math.max(zone.top, 0);
      const height = Math.max(Math.min(zoneBottom, innerHeight) - top, 1);
      tx = zone.width * (0.5 + 0.36 * Math.sin(time * 0.23) + 0.09 * Math.sin(time * 0.61 + 1));
      ty = top - zone.top + height * (0.5 + 0.32 * Math.sin(time * 0.31 + 0.7) + 0.1 * Math.sin(time * 0.73));
    }
    if (!placed) {
      chain.forEach((link) => {
        link.x = tx;
        link.y = ty;
      });
      placed = true;
    }

    // Голова — на пружине с лёгким перелётом; за курсором быстрее, чем в обходе.
    const stiffness = inside ? 46 : 5;
    const damping = Math.pow(inside ? 0.0025 : 0.06, dt);
    velocity.x = (velocity.x + (tx - chain[0]!.x) * stiffness * dt) * damping;
    velocity.y = (velocity.y + (ty - chain[0]!.y) * stiffness * dt) * damping;
    chain[0]!.x += velocity.x * dt;
    chain[0]!.y += velocity.y * dt;
    for (let i = 1; i < LINKS; i++) {
      const follow = 1 - Math.exp(-dt * (15 - i * 2));
      chain[i]!.x += (chain[i - 1]!.x - chain[i]!.x) * follow;
      chain[i]!.y += (chain[i - 1]!.y - chain[i]!.y) * follow;
    }

    // Нажатие: вся цепочка быстро стягивается в точку, затем выстрел.
    if (charge) {
      gather += (1 - gather) * (1 - Math.exp(-dt * 30));
      const pull = 1 - Math.exp(-dt * 34);
      chain.forEach((link) => {
        link.x += (charge!.x - link.x) * pull;
        link.y += (charge!.y - link.y) * pull;
      });
      velocity.x = velocity.y = 0;
      charge.left -= dt;
      if (charge.left <= 0) {
        rippleData[nextRipple * 3] = charge.x;
        rippleData[nextRipple * 3 + 1] = charge.y;
        rippleData[nextRipple * 3 + 2] = 0;
        nextRipple = (nextRipple + 1) % RIPPLES;
        charge = null;
        spent = 1;
      }
    } else {
      gather *= Math.exp(-dt * 2);
      spent *= Math.exp(-dt * 1.6);
    }

    // На скорости и под рукой свет горит ярче, сам по себе — вполсилы.
    const speed = Math.hypot(velocity.x, velocity.y);
    const wantHeat = (inside ? 0.86 : 0.62) + Math.min(speed / 2600, 0.34);
    heat += (wantHeat - heat) * (1 - Math.exp(-dt * 3));
    const breath = 1 + 0.06 * Math.sin(time * 0.9);
    const size = Math.min(42 + zone.width * 0.026, 78) * breath * (1 - 0.6 * gather);
    const punch = gather * (1 - spent);

    let reach = 0;
    chain.forEach((link, i) => {
      const o = i * 4;
      chainData[o] = link.x;
      chainData[o + 1] = link.y;
      chainData[o + 2] = 1 - i * 0.13;
      chainData[o + 3] = size * (1 + i * 0.12);
      reach = Math.max(reach, Math.hypot(link.x - chain[0]!.x, link.y - chain[0]!.y) + size * (1 + i * 0.12));
    });

    // Волны старятся; пока идёт хоть одна, считать надо весь блок.
    let rippling = false;
    for (let i = 0; i < RIPPLES; i++) {
      const o = i * 3 + 2;
      if (rippleData[o]! < 0) continue;
      rippleData[o]! += dt;
      if (rippleData[o]! >= RIPPLE_LIFE) rippleData[o] = -1;
      else rippling = true;
    }
    const bound = rippling ? 1e5 : reach * 2.2 + 100;

    calmBlocks.forEach((block, i) => {
      const r = block.getBoundingClientRect();
      calmData[i * 4] = r.left + r.width / 2 - zone.left;
      calmData[i * 4 + 1] = r.top + r.height / 2 - zone.top;
      calmData[i * 4 + 2] = r.width / 2 + 6;
      calmData[i * 4 + 3] = r.height / 2 + 6;
    });

    surfaces.forEach((surface) => {
      const rect = surface.el === contact ? zone : footerRect;
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const { gl, canvas, uniforms: u } = surface;
      const dpr = Math.min(devicePixelRatio || 1, maxDpr);
      if (!surface.sized || canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        surface.sized = true;
      }
      gl.uniform2f(u.uOrigin!, 0, Math.round(rect.top - zone.top));
      gl.uniform1f(u.uHeight!, canvas.height);
      gl.uniform1f(u.uDpr!, dpr);
      gl.uniform1f(u.uCell!, zone.width < 640 ? 6 : 8);
      gl.uniform1f(u.uTime!, time);
      gl.uniform1f(u.uHeat!, heat * ignition * (1 + 1.6 * punch) * (1 - 0.9 * spent));
      gl.uniform1f(u.uWave!, Math.hypot(zone.width, innerHeight) * 0.6);
      gl.uniform1f(u.uLoose!, 1 - 0.9 * gather);
      gl.uniform1f(u.uPunch!, punch);
      gl.uniform3f(u.uBound!, chain[0]!.x, chain[0]!.y, bound);
      gl.uniform4fv(u.uChain!, chainData);
      gl.uniform3fv(u.uRipple!, rippleData);
      gl.uniform4fv(u.uCalm!, calmData);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!surface.shown) {
        surface.shown = true;
        canvas.classList.add("is-on");
      }
    });
  };

  const start = () => {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(render);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
      if (visible.size && !built) {
        built = true;
        surfaces = blocks.map(createSurface).filter((surface): surface is Surface => !!surface);
      }
      if (visible.size) start();
      else stop();
    },
    { rootMargin: "120px 0px" },
  );
  blocks.forEach((block) => observer.observe(block));

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "touch") pointer = { x: event.clientX, y: event.clientY };
  };
  const onLeave = (event: PointerEvent) => {
    if (event.pointerType !== "touch") pointer = null;
  };
  const onTouch = (event: TouchEvent) => {
    const touch = event.touches[0];
    pointer = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onClick = (event: MouseEvent) => {
    // Нажатие с клавиатуры без координат: кольцу неоткуда идти. Пока сгусток
    // стягивается, новые нажатия ждут выстрела.
    if (!event.detail || charge) return;
    const zone = contact.getBoundingClientRect();
    charge = { x: event.clientX - zone.left, y: event.clientY - zone.top, left: CHARGE };
  };
  const passive = { passive: true };
  blocks.forEach((block) => {
    block.addEventListener("pointermove", onMove, passive);
    block.addEventListener("pointerleave", onLeave, passive);
    block.addEventListener("touchstart", onTouch, passive);
    block.addEventListener("touchmove", onTouch, passive);
    block.addEventListener("touchend", onTouch, passive);
    block.addEventListener("touchcancel", onTouch, passive);
    block.addEventListener("click", onClick);
  });

  return () => {
    stop();
    observer.disconnect();
    blocks.forEach((block) => {
      block.removeEventListener("pointermove", onMove);
      block.removeEventListener("pointerleave", onLeave);
      block.removeEventListener("touchstart", onTouch);
      block.removeEventListener("touchmove", onTouch);
      block.removeEventListener("touchend", onTouch);
      block.removeEventListener("touchcancel", onTouch);
      block.removeEventListener("click", onClick);
    });
    surfaces.forEach((surface) => surface.canvas.remove());
  };
}
