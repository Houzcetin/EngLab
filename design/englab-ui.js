/* EngLab UI helpers — plain JavaScript, no framework. Assigns window.EngLab.
   Pairs with components/bundle.css and the tokens. Safe to copy into a GitHub Pages site as-is. */
(function () {
  'use strict';

  /* ---------------- Icons (24×24, stroke = currentColor) ---------------- */
  var P = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    pulse: '<path d="M2 12h4l2.5-6 4 13 3-9 1.5 2H22"/>',
    cmpe: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
    ee: '<path d="M2 12h4l1.5-3.5 3 7 3-7 3 7 1.5-3.5H22"/><circle cx="2" cy="12" r=".6" fill="currentColor"/><circle cx="22" cy="12" r=".6" fill="currentColor"/>',
    me: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/><circle cx="12" cy="12" r="7.2"/>',
    ce: '<path d="M2.5 20.5h19"/><path d="M4 20.5V9l8-5 8 5v11.5"/><path d="M4 9h16M8 9v11.5M12 9v11.5M16 9v11.5"/>',
    che: '<path d="M9 2.5h6M10 2.5v6.2L4.6 18.4A2 2 0 0 0 6.3 21.5h11.4a2 2 0 0 0 1.7-3.1L14 8.7V2.5"/><path d="M7 14.5h10"/><circle cx="10.5" cy="17.5" r=".8" fill="currentColor"/><circle cx="14" cy="18.6" r=".6" fill="currentColor"/>',
    all: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    warn: '<path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.3" r=".7" fill="currentColor"/>',
    check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    shuffle: '<path d="M3 7h3.5c4 0 6.5 10 11 10H21M3 17h3.5c1.6 0 2.9-1.5 4-3.5M14 9c1-1.3 2.2-2 3.5-2H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5"/><path d="M4 3.5v5h5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    star: '<path d="m12 3 2.8 5.8 6.2.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.2-.8L12 3Z" fill="currentColor"/>'
  };
  function icon(name, cls) {
    return '<svg viewBox="0 0 24 24" ' + P + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------------- CPU scheduling ---------------- */
  var ALGOS = [
    { id: 'fcfs', name: 'FCFS' }, { id: 'sjf', name: 'SJF' }, { id: 'srtf', name: 'SRTF' },
    { id: 'prio', name: 'Priority' }, { id: 'priop', name: 'Priority (P)' }, { id: 'rr', name: 'Round Robin' }
  ];
  function schedule(procs, algo, quantum) {
    var ps = procs.map(function (p, i) { return { id: p.id, at: +p.at, bt: +p.bt, pri: +p.pri, i: i, rem: +p.bt, start: -1, ct: 0 }; });
    var slices = [], t = 0, done = 0, n = ps.length;
    function push(id, a, b) { var l = slices[slices.length - 1]; if (l && l.id === id && l.end === a) l.end = b; else slices.push({ id: id, start: a, end: b }); }
    function byArrival(a, b) { return a.at - b.at || a.i - b.i; }
    if (algo === 'rr') {
      var q = Math.max(1, quantum | 0), queue = [], order = ps.slice().sort(byArrival), k = 0;
      while (done < n) {
        while (k < n && order[k].at <= t) queue.push(order[k++]);
        if (!queue.length) { var nt = order[k].at; push(null, t, nt); t = nt; continue; }
        var p = queue.shift(); if (p.start < 0) p.start = t;
        var run = Math.min(q, p.rem); push(p.id, t, t + run); t += run; p.rem -= run;
        while (k < n && order[k].at <= t) queue.push(order[k++]);
        if (p.rem > 0) queue.push(p); else { p.ct = t; done++; }
      }
    } else {
      var pre = algo === 'srtf' || algo === 'priop';
      var key = algo === 'sjf' || algo === 'srtf' ? function (p) { return p.rem; } : algo === 'fcfs' ? function (p) { return p.at; } : function (p) { return p.pri; };
      var cur = null;
      while (done < n) {
        var ready = ps.filter(function (p) { return p.at <= t && p.rem > 0; });
        if (!ready.length) { var nx = Math.min.apply(null, ps.filter(function (p) { return p.rem > 0; }).map(function (p) { return p.at; })); push(null, t, nx); t = nx; continue; }
        ready.sort(function (a, b) { return key(a) - key(b) || a.at - b.at || a.i - b.i; });
        if (!pre && cur && cur.rem > 0) ready = [cur];
        var p2 = ready[0]; cur = p2; if (p2.start < 0) p2.start = t;
        var step = pre ? 1 : p2.rem;
        push(p2.id, t, t + step); t += step; p2.rem -= step;
        if (p2.rem === 0) { p2.ct = t; done++; cur = null; }
      }
    }
    var rows = ps.map(function (p) { var tat = p.ct - p.at; return { id: p.id, at: p.at, bt: p.bt, pri: p.pri, ct: p.ct, tat: tat, wt: tat - p.bt, rt: p.start - p.at }; });
    var avg = function (k2) { return rows.reduce(function (s, r) { return s + r[k2]; }, 0) / n; };
    var end = slices.length ? slices[slices.length - 1].end : 0, first = slices.length ? slices[0].start : 0;
    var busy = slices.reduce(function (s, x) { return s + (x.id ? x.end - x.start : 0); }, 0);
    return { slices: slices, rows: rows, avgWT: avg('wt'), avgTAT: avg('tat'), avgRT: avg('rt'), util: busy / ((end - first) || 1), throughput: n / (end || 1), end: end };
  }

  /* ---------------- Page replacement ---------------- */
  function pageReplace(refs, frames, algo) {
    var slots = [], loadedAt = [], lastUse = [], steps = [], faults = 0;
    refs.forEach(function (r, t) {
      var hitSlot = slots.indexOf(r), loadSlot = -1;
      if (hitSlot >= 0) { lastUse[hitSlot] = t; }
      else {
        faults++;
        if (slots.length < frames) { loadSlot = slots.length; slots.push(r); }
        else {
          if (algo === 'fifo') loadSlot = loadedAt.indexOf(Math.min.apply(null, loadedAt));
          else if (algo === 'lru') loadSlot = lastUse.indexOf(Math.min.apply(null, lastUse));
          else {
            var best = -1, far = -1;
            slots.forEach(function (s, i) { var nx = refs.indexOf(s, t + 1); var d = nx < 0 ? Infinity : nx; if (d > far) { far = d; best = i; } });
            loadSlot = best;
          }
          slots[loadSlot] = r;
        }
        loadedAt[loadSlot] = t; lastUse[loadSlot] = t;
      }
      steps.push({ ref: r, slots: slots.slice(), hit: hitSlot >= 0, hitSlot: hitSlot, loadSlot: loadSlot });
    });
    return { steps: steps, faults: faults, hits: refs.length - faults };
  }

  /* ---------------- Renderers ---------------- */
  function fmt(x, d) { d = d == null ? 2 : d; var s = (+x).toFixed(d); return s.indexOf('.') < 0 ? s : s.replace(/0+$/, '').replace(/\.$/, ''); }
  function procClass(id) { var m = /\d+/.exec(id || ''); return m ? 'p' + (((+m[0] - 1) % 6) + 1) : ''; }

  function gantt(slices, opts) {
    opts = opts || {};
    var end = slices[slices.length - 1].end, start = slices[0].start, span = end - start;
    var bars = slices.map(function (s) {
      var w = (s.end - s.start) / span * 100;
      var label = s.id || 'idle';
      return '<div class="el-gantt__bar ' + (s.id ? procClass(s.id) : 'el-gantt__bar--idle') + '" style="flex:0 0 calc(' + w + '% - 2px)" title="' + label + ' · ' + s.start + '–' + s.end + '">' + label + '</div>';
    }).join('');
    var times = [start].concat(slices.map(function (s) { return s.end; }));
    var ticks = times.map(function (x) { return '<span class="el-gantt__tick" style="left:' + ((x - start) / span * 100) + '%">' + x + '</span>'; }).join('');
    return '<div class="el-gantt' + (opts.mini ? ' el-gantt--mini' : '') + '" role="img" aria-label="Gantt chart: ' + slices.map(function (s) { return (s.id || 'idle') + ' ' + s.start + ' to ' + s.end; }).join(', ') + '"><div class="el-gantt__track">' + bars + '</div><div class="el-gantt__ticks">' + ticks + '</div></div>';
  }

  function compareBars(rows, opts) {
    opts = opts || {};
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; })), min = Math.min.apply(null, rows.map(function (r) { return r.value; }));
    return '<div class="el-bars">' + rows.map(function (r) {
      var best = r.value === min, cur = r.name === opts.current;
      return '<div class="el-bars__row' + (best ? ' is-best' : '') + (cur ? ' is-current' : '') + '"><span class="el-bars__name">' + r.name + '</span><span class="el-bars__track"><span class="el-bars__fill" style="display:block;width:' + (r.value / max * 100) + '%"></span></span><span class="el-bars__val">' + fmt(r.value) + (best ? ' <span class="el-bars__star" aria-label="best">★</span>' : '') + '</span></div>';
    }).join('') + '</div>';
  }

  function frameTable(refs, res, frames) {
    var h = '<div class="el-frames" role="table" aria-label="Frame table">';
    h += '<div class="el-frames__row"><span class="el-frames__lab">REF</span>' + refs.map(function (r) { return '<span class="el-frames__ref">' + r + '</span>'; }).join('') + '</div>';
    for (var f = 0; f < frames; f++) {
      h += '<div class="el-frames__row"><span class="el-frames__lab">F' + (f + 1) + '</span>' + res.steps.map(function (s) {
        var v = s.slots[f];
        if (v == null) return '<span class="el-ptc el-ptc--empty" aria-label="empty">·</span>';
        var c = s.loadSlot === f ? 'el-ptc--loaded' : s.hitSlot === f ? 'el-ptc--hit' : '';
        return '<span class="el-ptc ' + c + '">' + v + '</span>';
      }).join('') + '</div>';
    }
    h += '<div class="el-frames__row"><span class="el-frames__lab"></span>' + res.steps.map(function (s) { return s.hit ? '<span class="el-mark el-mark--h" aria-label="hit">H</span>' : '<span class="el-mark el-mark--f" aria-label="fault">F</span>'; }).join('') + '</div>';
    return h + '</div>';
  }

  function lineChart(series, opts) {
    opts = opts || {};
    var W = 560, H = 260, L = 44, R = 92, T = 16, B = 40;
    var xs = series[0].points.map(function (p) { return p[0]; });
    var ymax = Math.ceil(Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s.points.map(function (p) { return p[1]; })); })) / 5) * 5;
    var X = function (x) { return L + (x - xs[0]) / (xs[xs.length - 1] - xs[0]) * (W - L - R); };
    var Y = function (y) { return T + (1 - y / ymax) * (H - T - B); };
    var g = '<svg class="el-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (opts.label || 'Line chart') + '">';
    for (var y = 0; y <= ymax; y += 5) g += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(y) + '" y2="' + Y(y) + '"/><text class="tick" x="' + (L - 8) + '" y="' + (Y(y) + 4) + '" text-anchor="end">' + y + '</text>';
    xs.forEach(function (x) { g += '<text class="tick" x="' + X(x) + '" y="' + (H - B + 18) + '" text-anchor="middle">' + x + '</text>'; });
    g += '<line class="axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
    g += '<text class="axlab" x="' + ((L + W - R) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">FRAMES</text>';
    g += '<text class="axlab" x="12" y="' + ((T + H - B) / 2) + '" text-anchor="middle" transform="rotate(-90 12 ' + ((T + H - B) / 2) + ')">PAGE FAULTS</text>';
    var lastY = [];
    series.forEach(function (s) {
      var d = s.points.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1]); }).join(' ');
      g += '<path class="s-' + s.tone + '" d="' + d + '" stroke-width="' + (s.tone === 'primary' ? 2.75 : 2) + '"' + (s.dash ? ' stroke-dasharray="5 4"' : '') + '/>';
      s.points.forEach(function (p) {
        var cx = X(p[0]), cy = Y(p[1]);
        if (s.shape === 'square') g += '<rect class="m-' + s.tone + '" x="' + (cx - 4) + '" y="' + (cy - 4) + '" width="8" height="8" stroke-width="1.5"/>';
        else if (s.shape === 'triangle') g += '<path class="m-' + s.tone + '" d="M' + cx + ' ' + (cy - 5) + 'L' + (cx + 5) + ' ' + (cy + 4) + 'L' + (cx - 5) + ' ' + (cy + 4) + 'Z" stroke-width="1.5"/>';
        else g += '<circle class="m-' + s.tone + '" cx="' + cx + '" cy="' + cy + '" r="4" stroke-width="1.75"/>';
      });
      var lp = s.points[s.points.length - 1], ly = Y(lp[1]);
      lastY.forEach(function (o) { if (Math.abs(o - ly) < 14) ly = o + 14; }); lastY.push(ly);
      g += '<text class="lab-' + s.tone + '" x="' + (X(lp[0]) + 10) + '" y="' + (ly + 4) + '">' + s.name + '</text>';
    });
    return g + '</svg>';
  }

  function circuit(opts) {
    opts = opts || {};
    var I = opts.current, V = opts.voltage, Rv = opts.resistance, off = !(I > 0) || !isFinite(I);
    var loop = 'M90 210 V90 H230 M370 90 H510 V330 H90 V250';
    return '<svg class="el-circuit' + (off ? ' is-off' : '') + '" viewBox="20 40 560 320" role="img" aria-label="Circuit: battery ' + V + ' volts, resistor ' + Rv + ' ohms, current ' + (off ? 'none' : I + ' amperes') + '">' +
      '<path class="wire" d="' + loop + '"/>' +
      '<path class="flow" d="' + loop + '"/>' +
      '<path class="res-glow" d="M230 90 l12 -18 l24 36 l24 -36 l24 36 l24 -36 l20 30 l12 -12"/>' +
      '<path class="res" d="M230 90 l12 -18 l24 36 l24 -36 l24 36 l24 -36 l20 30 l12 -12"/>' +
      '<line class="bat-long" x1="58" y1="210" x2="122" y2="210"/><line class="bat-short" x1="72" y1="250" x2="108" y2="250"/>' +
      '<path class="wire" d="M90 210 V214 M90 250 V246" />' +
      '<text class="lbl-strong" x="130" y="204">+</text><text class="lbl-strong" x="118" y="266">−</text>' +
      '<text class="lbl" x="140" y="235">V = ' + V + ' V</text>' +
      '<text class="lbl" x="300" y="146" text-anchor="middle">R = ' + Rv + ' Ω</text>' +
      '<path class="arrow" d="M510 222 l-10 -18 h20 Z"/><text class="lbl" x="526" y="214">I</text>' +
      '<text class="center" x="300" y="222" text-anchor="middle">' + (off ? 'I = —' : 'I = ' + fmt(I, 3) + ' A') + '</text>' +
      '<text class="lbl" x="300" y="250" text-anchor="middle">' + (off ? 'no current' : 'conventional current, + → −') + '</text>' +
      '</svg>';
  }

  /* ---------------- Screens ---------------- */
  var DISCIPLINES = [
    { code: 'CmpE', icon: 'cmpe', field: 'Computer Engineering', tool: 'OS Scheduler Lab', desc: 'Simulate CPU scheduling and page replacement step by step, then compare every algorithm on the same workload.', tags: ['FCFS', 'SJF', 'RR', 'LRU', 'Optimal'] },
    { code: 'EE', icon: 'ee', field: 'Electrical Engineering', tool: "Ohm's law", desc: 'Solve current and power from voltage and resistance.', tags: ['V = I·R', 'P = V·I'] },
    { code: 'ME', icon: 'me', field: 'Mechanical Engineering', tool: 'Torque & power', desc: 'Turn torque and shaft speed into power, in any unit.', tags: ['P = τ·ω', 'ω = 2πn/60'] },
    { code: 'CE', icon: 'ce', field: 'Civil Engineering', tool: 'Concrete slab', desc: 'Volume, weight and bags of concrete for a slab.', tags: ['V = L·W·t', 'ρ ≈ 2400 kg/m³'] },
    { code: 'ChE', icon: 'che', field: 'Chemical Engineering', tool: 'Ideal gas law', desc: 'Solve for P, V, n or T — the others stay fixed.', tags: ['PV = nRT', 'R = 8.314'] },
    { code: 'ALL', icon: 'all', field: 'Every discipline', tool: 'Unit converter', desc: 'Length, pressure, energy, temperature and more.', tags: ['SI', 'Imperial', '60+ units'] }
  ];
  var EXAMPLE = [{ id: 'P1', at: 0, bt: 8, pri: 3 }, { id: 'P2', at: 1, bt: 4, pri: 1 }, { id: 'P3', at: 2, bt: 9, pri: 4 }, { id: 'P4', at: 3, bt: 5, pri: 2 }];
  var REFS = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];

  function topbar(o) {
    o = o || {};
    return '<header class="el-topbar"><div class="el-wrap"' + (o.phone ? ' style="padding:0 var(--space-4)"' : '') + '>' +
      '<div style="display:flex;align-items:center;gap:var(--space-6)"><a class="el-logo" href="#"><img class="el-logo__img" src="' + window.EngLab.logoSrc + '" alt="" width="34" height="34">EngLab</a>' +
      (o.crumb && !o.phone ? '<a class="el-crumb" href="#">' + icon('arrowLeft').replace('<svg', '<svg width="14" height="14"') + 'All tools</a>' : '') + '</div>' +
      '<div class="el-topbar__right"><button class="el-iconbtn" aria-label="Switch theme">' + icon(o.dark ? 'sun' : 'moon') + '</button></div></div></header>';
  }

  function dcard(d, o) {
    o = o || {};
    var featured = !!o.featured;
    var visual = featured ? '<div class="el-dcard__visual"><div style="display:flex;justify-content:space-between;align-items:center"><span class="el-label">Round Robin · q = 3</span><span class="el-label" style="display:inline-flex;gap:8px;align-items:center"><span class="el-live"></span>Live</span></div>' +
      gantt(schedule(EXAMPLE, 'rr', 3).slices, { mini: true }) +
      '<div style="display:flex;gap:var(--space-6);flex-wrap:wrap;font-family:var(--font-mono);font-size:var(--fs-xs);color:var(--text-muted)"><span>avg WT <b style="color:var(--text)">13.5</b></span><span>avg TAT <b style="color:var(--text)">20</b></span><span>CPU <b style="color:var(--text)">100%</b></span><span>★ best <b style="color:var(--success)">SRTF 6.5</b></span></div>' +
      '<div class="el-term"><span class="el-term__prompt">$</span><span>schedlab <span class="el-term__flag">--algo</span> rr <span class="el-term__flag">--quantum</span> 3<span class="el-cursor"></span></span></div></div>' : '';
    return '<a class="el-card el-marks el-dcard' + (featured ? ' el-dcard--featured' : '') + (o.state ? ' ' + o.state : '') + '" href="#"' + (o.style ? ' style="' + o.style + '"' : '') + '>' +
      '<div class="el-dcard__top"><span class="el-icontile' + (featured ? ' el-icontile--lg' : '') + '">' + icon(d.icon) + '</span><span class="el-code' + (featured ? ' el-code--solid' : '') + '">' + d.code + '</span></div>' +
      '<div><div class="el-label">' + d.field + '</div><h3 class="el-dcard__tool">' + d.tool + '</h3></div>' +
      '<p class="el-dcard__desc">' + d.desc + '</p>' + visual +
      '<div class="el-dcard__foot"><div class="el-tags">' + d.tags.map(function (t) { return '<span class="el-tag">' + t + '</span>'; }).join('') + '</div><span class="el-dcard__open">Open <span>→</span></span></div></a>';
  }

  function startScreen(o) {
    o = o || {};
    var ph = !!o.phone;
    var hero = '<section style="padding:' + (ph ? 'var(--space-10) 0 var(--space-8)' : 'var(--space-16) 0 var(--space-12)') + ';max-width:' + (ph ? 'none' : '880px') + '">' +
      '<div class="el-eyebrow el-label"><span class="el-live"></span>Engineering toolkit · 6 disciplines</div>' +
      '<h1 style="font-family:var(--font-display);font-weight:700;margin:' + (ph ? '16px' : '20px') + ' 0 ' + (ph ? '16px' : '24px') + ';font-size:' + (ph ? 'var(--fs-4xl)' : 'var(--fs-hero)') + ';line-height:' + (ph ? '1.02' : '.98') + ';letter-spacing:' + (ph ? '-0.02em' : '-0.025em') + ';color:var(--text)">Which <span style="color:var(--primary-text);background:linear-gradient(transparent 58%, var(--primary-soft) 58%, var(--primary-soft) 92%, transparent 92%);padding:0 .06em">engineer</span> are you?<span class="el-cursor el-cursor--hero"></span></h1>' +
      '<p style="margin:0 0 ' + (ph ? '20px' : '28px') + ';font-size:var(--fs-lg);line-height:28px;color:var(--text-muted);max-width:56ch">Pick your discipline and open a calculator or simulator built for the problems you actually solve in class.</p>' +
      '<div class="el-chips"><span class="el-chip">' + icon('check') + 'No sign-up</span><span class="el-chip">' + icon('check') + 'Runs in your browser</span><span class="el-chip">' + icon('check') + 'Light &amp; dark</span></div></section>';
    var grid;
    if (ph) grid = '<div class="el-grid" style="grid-template-columns:1fr;gap:var(--space-4);padding-bottom:var(--space-10)">' + DISCIPLINES.map(function (d, i) { return dcard(d, { featured: i === 0 }); }).join('') + '</div>';
    else grid = '<div class="el-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));padding-bottom:var(--space-16)">' +
      dcard(DISCIPLINES[0], { featured: true, style: 'grid-column:span 2;grid-row:span 2' }) +
      DISCIPLINES.slice(1).map(function (d) { return dcard(d); }).join('') + '</div>';
    return '<div class="el-paper" style="min-height:100%">' + topbar({ phone: ph, dark: o.dark }) + '<main class="el-wrap"' + (ph ? ' style="padding:0 var(--space-4)"' : '') + '>' + hero + grid + '</main></div>';
  }

  function toolHead(o) {
    return '<div class="el-toolhead"><div class="el-toolhead__id"><span class="el-icontile el-icontile--lg">' + icon(o.icon) + '</span><div><div class="el-label">' + o.eyebrow + '</div><h1>' + o.title + '</h1></div></div>' + (o.right || '') + '</div>';
  }

  function stepper(label, v) {
    return '<div class="el-stepper-field"><span class="el-label">' + label + '</span><div class="el-stepper"><button aria-label="Decrease">' + icon('minus') + '</button><span class="el-stepper__val" aria-live="polite">' + v + '</span><button aria-label="Increase">' + icon('plus') + '</button></div></div>';
  }

  function seg(active) {
    return '<div class="el-seg" role="tablist"><button class="el-seg__btn" role="tab" aria-selected="' + (active === 0) + '">CPU scheduling</button><button class="el-seg__btn" role="tab" aria-selected="' + (active === 1) + '">Page replacement</button></div>';
  }

  function cpuScreen(o) {
    o = o || {};
    var r = schedule(EXAMPLE, 'rr', 3);
    var all = ALGOS.map(function (a) { return { name: a.name, value: schedule(EXAMPLE, a.id, 3).avgWT }; });
    var stat = function (label, v, unit, hi, hint) { return '<div class="el-stat' + (hi ? ' el-stat--hi' : '') + '"><span class="el-label">' + label + '</span><span class="el-stat__value">' + v + (unit ? '<span class="el-stat__unit">' + unit + '</span>' : '') + '</span>' + (hint ? '<span class="el-stat__hint">' + hint + '</span>' : '') + '</div>'; };
    var ptable = '<table class="el-table"><thead><tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Priority</th><th></th></tr></thead><tbody>' + EXAMPLE.map(function (p) {
      return '<tr><td><span class="el-swatch ' + procClass(p.id) + '">' + p.id + '</span></td><td><input class="el-cellinput" type="number" value="' + p.at + '" aria-label="' + p.id + ' arrival"></td><td><input class="el-cellinput" type="number" value="' + p.bt + '" aria-label="' + p.id + ' burst"></td><td><input class="el-cellinput" type="number" value="' + p.pri + '" aria-label="' + p.id + ' priority"></td><td style="width:40px"><button class="el-iconbtn el-iconbtn--sm" aria-label="Remove ' + p.id + '">' + icon('trash') + '</button></td></tr>';
    }).join('') + '</tbody></table>';
    var res = '<table class="el-table"><thead><tr><th>Process</th><th>AT</th><th>BT</th><th>Pri</th><th>CT</th><th>TAT</th><th>WT</th><th>RT</th></tr></thead><tbody>' + r.rows.map(function (x) {
      return '<tr><td><span class="el-swatch ' + procClass(x.id) + '">' + x.id + '</span></td><td>' + x.at + '</td><td>' + x.bt + '</td><td>' + x.pri + '</td><td>' + x.ct + '</td><td>' + x.tat + '</td><td class="is-key">' + x.wt + '</td><td>' + x.rt + '</td></tr>';
    }).join('') + '</tbody><tfoot><tr><td>Average</td><td></td><td></td><td></td><td></td><td>' + fmt(r.avgTAT) + '</td><td>' + fmt(r.avgWT) + '</td><td>' + fmt(r.avgRT) + '</td></tr></tfoot></table>';
    return '<div class="el-paper" style="min-height:100%">' + topbar({ crumb: true, dark: o.dark }) + '<main class="el-wrap" style="padding-bottom:var(--space-12)">' +
      toolHead({ icon: 'cmpe', eyebrow: 'CmpE · Computer Engineering', title: 'OS Scheduler Lab', right: seg(0) }) +
      '<div class="el-grid">' +
      '<section class="el-card el-marks"><div class="el-toolbar" style="margin-bottom:var(--space-5)"><div class="el-pills" role="group" aria-label="Algorithm">' + ALGOS.map(function (a) { return '<button class="el-pill" aria-pressed="' + (a.id === 'rr') + '">' + a.name + '</button>'; }).join('') + '</div>' + stepper('Time quantum', 3) + '</div>' +
      '<div class="el-card__head" style="margin-bottom:var(--space-3)"><span class="el-label">Gantt chart · Round Robin, q = 3</span><span class="el-label" style="display:inline-flex;align-items:center;gap:8px"><span class="el-live"></span>t = 0 → ' + r.end + '</span></div>' + gantt(r.slices) + '</section>' +
      '<div class="el-stats">' + stat('Avg waiting', fmt(r.avgWT), '', true, 'lower is better') + stat('Avg turnaround', fmt(r.avgTAT)) + stat('Avg response', fmt(r.avgRT)) + stat('CPU utilization', fmt(r.util * 100, 0), '%') + stat('Throughput', r.throughput.toFixed(3), '/ unit') + '</div>' +
      '<div class="el-grid" style="grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)">' +
      '<section class="el-card el-marks"><div class="el-card__head"><span class="el-label">Processes</span><span class="el-tag">' + EXAMPLE.length + ' / 6</span></div>' + ptable + '<div style="display:flex;gap:var(--space-2);margin-top:var(--space-4);flex-wrap:wrap"><button class="el-btn el-btn--secondary el-btn--sm">' + icon('plus') + 'Add process</button><button class="el-btn el-btn--ghost el-btn--sm">' + icon('shuffle') + 'Random</button><button class="el-btn el-btn--ghost el-btn--sm">' + icon('reset') + 'Example</button></div></section>' +
      '<section class="el-card el-marks"><div class="el-card__head"><span class="el-label">Every algorithm, same workload</span><span class="el-label">Avg waiting</span></div>' + compareBars(all, { current: 'Round Robin' }) + '<p class="el-bars__note" style="margin:var(--space-4) 0 0;font-family:var(--font-mono)">★ best · <span style="color:var(--primary-text);font-weight:600">bold</span> = current</p></section></div>' +
      '<section class="el-card el-card--flush"><div class="el-card__head" style="padding:var(--space-5) var(--space-6) 0;margin-bottom:var(--space-4)"><span class="el-label">Results</span><span class="el-label">CT completion · TAT turnaround · WT waiting · RT response</span></div>' + res + '</section>' +
      '<section class="el-card el-marks"><div class="el-card__head"><span class="el-label">Test cases</span><span class="el-tag">2 / 2 passed</span></div><div style="display:grid;gap:var(--space-3)">' + [['SRTF · textbook example', '6.5'], ['Round Robin, q = 3 · this workload', '13.5']].map(function (t) { return '<div style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap"><span class="el-mono" style="width:260px;font-size:var(--fs-xs);color:var(--text-muted)">' + t[0] + '</span><span class="el-test el-test--pass"><span class="el-test__icon">✓</span>Matches · expected average waiting time ' + t[1] + '</span></div>'; }).join('') + '</div></section>' +
      '</div></main></div>';
  }

  function pagingScreen(o) {
    o = o || {};
    var res = pageReplace(REFS, 3, 'lru');
    var cmp = [{ name: 'FIFO', value: pageReplace(REFS, 3, 'fifo').faults }, { name: 'LRU', value: res.faults }, { name: 'Optimal', value: pageReplace(REFS, 3, 'opt').faults }];
    var curve = function (a) { var pts = []; for (var f = 1; f <= 7; f++) pts.push([f, pageReplace(REFS, f, a).faults]); return pts; };
    var series = [
      { name: 'FIFO', tone: 'muted', shape: 'square', dash: true, points: curve('fifo') },
      { name: 'LRU', tone: 'primary', shape: 'circle', points: curve('lru') },
      { name: 'Optimal ★', tone: 'success', shape: 'triangle', points: curve('opt') }
    ];
    var stat = function (label, v, cls, mark) { return '<div class="el-stat ' + (cls || '') + '"><span class="el-label" style="display:flex;justify-content:space-between;align-items:center">' + label + (mark || '') + '</span><span class="el-stat__value">' + v + '</span></div>'; };
    return '<div class="el-paper" style="min-height:100%">' + topbar({ crumb: true, dark: o.dark }) + '<main class="el-wrap" style="padding-bottom:var(--space-12)">' +
      toolHead({ icon: 'cmpe', eyebrow: 'CmpE · Computer Engineering', title: 'OS Scheduler Lab', right: seg(1) }) +
      '<div class="el-grid">' +
      '<section class="el-card el-marks"><div class="el-field" style="margin-bottom:var(--space-5)"><label class="el-label" for="refs">Reference string</label><div class="el-input"><input id="refs" value="' + REFS.join(' ') + '" style="padding-right:110px;letter-spacing:.06em"><span class="el-input__unit" style="width:100px">' + REFS.length + ' refs</span></div></div>' +
      '<div class="el-toolbar"><div class="el-pills" role="group" aria-label="Algorithm"><button class="el-pill" aria-pressed="false">FIFO</button><button class="el-pill" aria-pressed="true">LRU</button><button class="el-pill" aria-pressed="false">Optimal</button></div>' + stepper('Frames', 3) + '</div></section>' +
      '<section class="el-card el-marks" style="overflow-x:auto"><div class="el-card__head"><span class="el-label">Frame table · LRU, 3 frames</span><span style="display:flex;gap:var(--space-4);align-items:center;font-family:var(--font-mono);font-size:var(--fs-xs);color:var(--text-muted)"><span style="display:inline-flex;gap:6px;align-items:center"><span class="el-ptc el-ptc--loaded" style="width:18px;height:18px"></span>page loaded</span><span style="display:inline-flex;gap:6px;align-items:center"><span class="el-ptc el-ptc--hit" style="width:18px;height:18px"></span>page found</span><span style="display:inline-flex;gap:6px;align-items:center"><span class="el-mark el-mark--f el-mark--sm">F</span>fault</span><span style="display:inline-flex;gap:6px;align-items:center"><span class="el-mark el-mark--h el-mark--sm">H</span>hit</span></span></div>' + frameTable(REFS, res, 3) + '</section>' +
      '<div class="el-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + stat('Page faults', res.faults, 'el-stat--fault', '<span class="el-mark el-mark--f el-mark--sm">F</span>') + stat('Hits', res.hits, 'el-stat--hit', '<span class="el-mark el-mark--h el-mark--sm">H</span>') + stat('Hit ratio', fmt(res.hits / REFS.length * 100, 0) + '<span class="el-stat__unit">%</span>') + '</div>' +
      '<div class="el-grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);align-items:start">' +
      '<div class="el-grid"><section class="el-card el-marks"><div class="el-card__head"><span class="el-label">Same string, 3 frames</span><span class="el-label">Faults</span></div>' + compareBars(cmp, { current: 'LRU' }) + '</section>' +
      '<div class="el-callout" role="note"><span class="el-callout__icon">' + icon('warn') + '</span><div><p class="el-callout__title">Belady’s anomaly</p><p>FIFO has 10 faults with 4 frames but only 9 with 3. More memory is not always fewer faults.</p></div></div></div>' +
      '<section class="el-card el-marks"><div class="el-card__head"><span class="el-label">Faults vs frames</span><span class="el-label">1 – 7 frames</span></div>' + lineChart(series, { label: 'Page faults versus number of frames for FIFO, LRU and Optimal' }) + '</section></div>' +
      '</div></main></div>';
  }

  function ohmScreen(o) {
    o = o || {};
    var ph = !!o.phone, err = !!o.error;
    var V = 12, R = err ? 0 : 4, I = err ? NaN : V / R, Pw = V * I;
    var field = function (id, label, sym, v, unit, bad) {
      return '<div class="el-field"><div class="el-field__label"><label class="el-label" for="' + id + '">' + label + '</label><span class="el-label" style="color:var(--text-faint)">' + sym + '</span></div><div class="el-input' + (bad ? ' is-error' : '') + '"><input id="' + id + '" type="number" value="' + v + '"' + (bad ? ' aria-invalid="true" aria-describedby="' + id + '-err"' : '') + '><span class="el-input__unit">' + unit + '</span></div>' +
        (bad ? '<p class="el-field__msg el-field__msg--error" id="' + id + '-err">' + icon('alert') + 'Resistance must be greater than 0 Ω.</p>' : '') + '</div>';
    };
    var tile = function (label, sym, v, unit, formula) {
      return '<div class="el-result' + (err ? ' is-empty' : ' is-live') + '"><div class="el-result__row"><span class="el-label">' + label + '</span><span class="el-tag">' + formula + '</span></div><div class="el-result__value"><span class="el-result__sym">' + sym + ' =</span>' + (err ? '—' : fmt(v, 3)) + '<span class="el-result__unit">' + unit + '</span></div></div>';
    };
    var inputs = '<section class="el-card el-marks"><div class="el-card__head"><span class="el-label">Inputs</span><button class="el-btn el-btn--ghost el-btn--sm">' + icon('reset') + 'Reset</button></div><div class="el-grid" style="gap:var(--space-5)">' + field('v', 'Voltage', 'V', V, 'V') + field('r', 'Resistance', 'R', R, 'Ω', err) + '</div></section>';
    var results = '<div class="el-grid" style="grid-template-columns:' + (ph ? '1fr' : 'repeat(2,minmax(0,1fr))') + ';gap:var(--space-4)">' + tile('Current', 'I', I, 'A', 'I = V / R') + tile('Power', 'P', Pw, 'W', 'P = V × I') + '</div>';
    var circ = '<section class="el-card el-marks"><div class="el-card__head"><span class="el-label">Circuit</span><span class="el-label" style="display:inline-flex;align-items:center;gap:8px">' + (err ? 'Open' : '<span class="el-live"></span>Current flowing') + '</span></div>' + circuit({ current: I, voltage: V, resistance: R }) + '</section>';
    var head = ph ? '<div style="padding:var(--space-6) 0 var(--space-5);display:flex;gap:var(--space-3);align-items:center"><span class="el-icontile">' + icon('ee') + '</span><div><div class="el-label">EE · Electrical Engineering</div><h1 style="margin:2px 0 0;font-family:var(--font-display);font-size:var(--fs-2xl);line-height:32px;font-weight:700">Ohm’s law</h1></div></div>'
      : toolHead({ icon: 'ee', eyebrow: 'EE · Electrical Engineering', title: 'Ohm’s law', right: '<div class="el-tags"><span class="el-tag">V = I · R</span><span class="el-tag">P = V · I</span></div>' });
    var body = ph ? '<div class="el-grid" style="gap:var(--space-4)">' + inputs + results + circ + '</div>'
      : '<div class="el-grid" style="grid-template-columns:minmax(0,5fr) minmax(0,7fr);align-items:start"><div class="el-grid">' + inputs + results + '</div>' + circ + '</div>';
    return '<div class="el-paper" style="min-height:100%">' + topbar({ crumb: true, phone: ph, dark: o.dark }) + '<main class="el-wrap" style="padding:0 ' + (ph ? 'var(--space-4)' : 'var(--space-8)') + ' var(--space-12)">' + head + body + '</main></div>';
  }

  window.EngLab = {
    logoSrc: 'assets/englab-mark.png', // path to the logo mark on your site; the design system's previews point it at the uploaded file
    icons: ICONS, icon: icon, algorithms: ALGOS, disciplines: DISCIPLINES, example: EXAMPLE, referenceString: REFS,
    schedule: schedule, pageReplace: pageReplace,
    gantt: gantt, compareBars: compareBars, frameTable: frameTable, lineChart: lineChart, circuit: circuit, disciplineCard: dcard,
    screens: { start: startScreen, cpu: cpuScreen, paging: pagingScreen, ohm: ohmScreen }
  };
})();
