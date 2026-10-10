(function () {
  'use strict';

  /* ==================== Section 1: pure calculation functions ==================== */
  function ohmsLaw(V, R) {
    const voltage = V;
    const resistance = R;
    if (!Number.isFinite(resistance) || resistance <= 0) {
      return { error: 'Resistance must be greater than 0 Ω.' };
    }
    if (!Number.isFinite(voltage)) {
      return { error: 'Voltage must be a finite number.' };
    }
    const current = voltage / resistance;
    return { I: current, P: voltage * current };
  }

  function torquePower(T, rpm) {
    const torque = T;
    if (!Number.isFinite(torque) || !Number.isFinite(rpm)) {
      return { error: 'Torque and speed must be finite numbers.' };
    }
    const omega = 2 * Math.PI * rpm / 60;
    const power = torque * omega;
    return { omega, P: power, kW: power / 1000 };
  }

  function concreteSlab(L, W, t, yieldPerBag) {
    const length = L;
    const width = W;
    const thickness = t;
    const values = [length, width, thickness, yieldPerBag];
    const names = ['Length', 'Width', 'Thickness', 'Yield per bag'];
    for (let index = 0; index < values.length; index += 1) {
      if (!Number.isFinite(values[index]) || values[index] <= 0) {
        return { error: names[index] + ' must be greater than 0.' };
      }
    }
    const volume = length * width * thickness;
    const ratio = volume / yieldPerBag;
    // Floating point can make an exact count such as 100 become 100.00000000000001.
    const bags = Math.ceil(ratio - 1e-9);
    return { volume, ratio, bags, weight: bags * 25 };
  }

  function idealGas(input) {
    const keys = ['P', 'V', 'n', 'T'];
    const empty = keys.filter((key) => input[key] === null || input[key] === undefined || input[key] === '');
    if (!empty.length) {
      return { error: 'Leave one field empty so there is something to solve for.' };
    }
    if (empty.length > 1) {
      return { error: 'Leave only one field empty.' };
    }
    const missing = empty[0];
    const names = { P: 'Pressure', V: 'Volume', n: 'Amount', T: 'Temperature' };
    for (const key of keys) {
      if (key === missing) continue;
      const value = Number(input[key]);
      if (!Number.isFinite(value) || value <= 0) {
        const suffix = key === 'T' ? '; use kelvin, not °C.' : '.';
        return { error: names[key] + ' must be greater than 0' + suffix, field: key };
      }
    }
    const pressure = Number(input.P);
    const volume = Number(input.V);
    const amount = Number(input.n);
    const temperature = Number(input.T);
    const gasConstant = 8.314;
    const answers = {
      P: amount * gasConstant * temperature / volume,
      V: amount * gasConstant * temperature / pressure,
      n: pressure * volume / (gasConstant * temperature),
      T: pressure * volume / (amount * gasConstant)
    };
    return { solved: missing, value: answers[missing] };
  }
  const UNIT_TABLE = {
    Length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
    Mass: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.45359237 / 16, lb: 0.45359237 },
    Pressure: {
      Pa: 1, kPa: 1000, MPa: 1e6, bar: 100000, atm: 101325,
      psi: 6894.757293168, mmHg: 133.322387415
    },
    Energy: {
      J: 1, kJ: 1000, MJ: 1e6, cal: 4.184, kcal: 4184, Wh: 3600,
      kWh: 3600000, BTU: 1055.05585262, eV: 1.602176634e-19
    },
    Temperature: { '°C': 'temperature', '°F': 'temperature', K: 'temperature' }
  };
  function convertUnit(value, from, to) {
    value = Number(value);
    if (!Number.isFinite(value)) return NaN;
    const category = Object.keys(UNIT_TABLE).find((name) =>
      Object.prototype.hasOwnProperty.call(UNIT_TABLE[name], from));
    if (!category || !Object.prototype.hasOwnProperty.call(UNIT_TABLE[category], to)) return NaN;
    if (category === 'Temperature') {
      const kelvin = from === 'K' ? value : from === '°C' ? value + 273.15 : (value - 32) * 5 / 9 + 273.15;
      return to === 'K' ? kelvin : to === '°C' ? kelvin - 273.15 : (kelvin - 273.15) * 9 / 5 + 32;
    }
    return value * UNIT_TABLE[category][from] / UNIT_TABLE[category][to];
  }

  function formatNumber(x, sig) {
    let value = Number(x);
    const significantDigits = sig == null
      ? 5
      : Math.max(1, Math.min(12, Number(sig) || 5));
    if (!Number.isFinite(value)) return '—';
    if (Object.is(value, -0)) value = 0;
    const absolute = Math.abs(value);
    if (absolute >= 1e9 || (absolute > 0 && absolute < 1e-4)) {
      const parts = value.toExponential(significantDigits - 1).split('e');
      const mantissa = parts[0].replace(/(?:\.0+|(?:(\.\d*?)0+))$/, '$1');
      // Scientific notation for very large or very small values, e.g. 1.6022 × 10⁻¹⁹.
      const superscripts = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
      const exponent = String(Number(parts[1])).replace(/[-\d]/g, (character) => superscripts[character]);
      return mantissa + ' × 10' + exponent;
    }
    const decimals = absolute === 0
      ? 0
      : Math.max(0, significantDigits - 1 - Math.floor(Math.log10(absolute)));
    const parts = value.toFixed(Math.min(12, decimals))
      .replace(/(?:\.0+|(?:(\.\d*?)0+))$/, '$1').split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function formatSI(x, unit) {
    const value = x;
    if (!Number.isFinite(value)) return { value: '—', unit };
    if (value === 0) return { value: '0', unit };
    const prefixes = [['G', 9], ['M', 6], ['k', 3], ['', 0], ['m', -3], ['µ', -6], ['n', -9]];
    const absolute = Math.abs(value);
    const prefix = prefixes.find((item) => absolute >= 10 ** item[1]) || prefixes[prefixes.length - 1];
    let scaled = value / 10 ** prefix[1];
    if (Math.abs(scaled - Math.round(scaled)) < 1e-10 * Math.max(1, Math.abs(scaled))) {
      scaled = Math.round(scaled);
    }
    return { value: formatNumber(scaled, 4), unit: prefix[0] + unit };
  }
  function schedule(algo, processes, quantum) {
    const precision = 1e9;
    const epsilon = 1e-9;
    const roundTime = (value) => Math.round(value * precision) / precision;
    const input = Array.isArray(processes) ? processes : [];

    if (!input.length) {
      return { slices: [], rows: [], avgWT: 0, avgTAT: 0, avgRT: 0, utilization: 0, throughput: 0, end: 0 };
    }

    const ps = input.map((process, index) => {
      const arrivalValue = Number(process.arrival);
      const burstValue = Number(process.burst);
      const priorityValue = Number(process.priority);
      const arrival = roundTime(Number.isFinite(arrivalValue) ? arrivalValue : 0);
      const burst = roundTime(Math.max(0, Number.isFinite(burstValue) ? burstValue : 0));
      return {
        name: process.name,
        index,
        arrival,
        burst,
        priority: Number.isFinite(priorityValue) ? priorityValue : 0,
        remaining: burst,
        firstStart: null,
        ct: burst === 0 ? arrival : null
      };
    });

    const allowed = ['fcfs', 'sjf', 'srtf', 'prio', 'priop', 'rr'];
    if (allowed.indexOf(algo) < 0) throw new RangeError('Unknown scheduling algorithm: ' + algo);

    const slices = [];
    let time = 0;
    let done = ps.filter((process) => process.remaining === 0).length;
    const active = ps.filter((process) => process.remaining > 0);

    // Ties are broken by arrival time, then by order in the input array.
    function compareArrival(a, b) {
      return a.arrival - b.arrival || a.index - b.index;
    }

    function addSlice(index, start, end) {
      start = roundTime(start);
      end = roundTime(end);
      if (end <= start) return;
      const previous = slices[slices.length - 1];
      if (previous && previous.index === index && Math.abs(previous.end - start) <= epsilon) {
        previous.end = end;
      } else {
        slices.push({ name: index < 0 ? null : ps[index].name, index, start, end });
      }
    }

    function startProcess(process) {
      if (process.firstStart === null) process.firstStart = time;
    }

    if (algo === 'rr') {
      const requestedQuantum = Number(quantum);
      const q = Number.isFinite(requestedQuantum) && requestedQuantum > 0 ? Math.max(epsilon, roundTime(requestedQuantum)) : 1;
      const order = active.slice().sort(compareArrival);
      const queue = [];
      let next = 0;

      while (done < ps.length) {
        while (next < order.length && order[next].arrival <= time + epsilon) queue.push(order[next++]);
        if (!queue.length) {
          if (next >= order.length) break;
          const nextArrival = order[next].arrival;
          addSlice(-1, time, nextArrival);
          time = nextArrival;
          continue;
        }

        const process = queue.shift();
        startProcess(process);
        const duration = Math.min(q, process.remaining);
        const sliceEnd = roundTime(time + duration);
        addSlice(process.index, time, sliceEnd);
        process.remaining = roundTime(process.remaining - (sliceEnd - time));
        time = sliceEnd;

        // Arrivals during a slice join the queue before the preempted process returns to its end.
        while (next < order.length && order[next].arrival <= time + epsilon) queue.push(order[next++]);
        if (process.remaining <= epsilon) {
          process.remaining = 0;
          process.ct = time;
          done += 1;
        } else {
          queue.push(process);
        }
      }
    } else {
      const preemptive = algo === 'srtf' || algo === 'priop';
      const keyFor = (process) => {
        if (algo === 'fcfs') return process.arrival;
        if (algo === 'sjf') return process.burst;
        if (algo === 'srtf') return process.remaining;
        return process.priority;
      };

      while (done < ps.length) {
        const ready = ps.filter((process) => process.remaining > 0 && process.arrival <= time + epsilon);
        if (!ready.length) {
          const nextArrival = Math.min.apply(null, ps.filter((process) => process.remaining > 0).map((process) => process.arrival));
          if (!Number.isFinite(nextArrival)) break;
          addSlice(-1, time, nextArrival);
          time = nextArrival;
          continue;
        }

        ready.sort((a, b) => keyFor(a) - keyFor(b) || compareArrival(a, b));
        const process = ready[0];
        startProcess(process);
        let duration = process.remaining;
        if (preemptive) {
          const futureArrivals = ps.filter((candidate) => candidate.remaining > 0 && candidate.arrival > time + epsilon);
          if (futureArrivals.length) {
            const nextArrival = Math.min.apply(null, futureArrivals.map((candidate) => candidate.arrival));
            duration = Math.min(duration, nextArrival - time);
          }
        }

        const sliceEnd = roundTime(time + duration);
        addSlice(process.index, time, sliceEnd);
        process.remaining = roundTime(process.remaining - (sliceEnd - time));
        time = sliceEnd;
        if (process.remaining <= epsilon) {
          process.remaining = 0;
          process.ct = time;
          done += 1;
        }
      }
    }

    const rows = ps.map((process) => {
      const completion = process.ct === null ? time : process.ct;
      const tat = roundTime(completion - process.arrival);
      const wt = roundTime(tat - process.burst);
      const rt = roundTime(process.firstStart === null ? 0 : process.firstStart - process.arrival);
      return {
        name: process.name,
        arrival: process.arrival,
        burst: process.burst,
        priority: process.priority,
        ct: roundTime(completion),
        tat,
        wt,
        rt
      };
    });
    const average = (key) => roundTime(rows.reduce((sum, row) => sum + row[key], 0) / rows.length);
    const end = slices.length ? slices[slices.length - 1].end : 0;
    const busy = roundTime(slices.reduce((sum, slice) => sum + (slice.index >= 0 ? slice.end - slice.start : 0), 0));

    return {
      slices,
      rows,
      avgWT: average('wt'),
      avgTAT: average('tat'),
      avgRT: average('rt'),
      utilization: end > 0 ? roundTime(busy / end) : 0,
      throughput: end > 0 ? rows.length / end : 0,
      end
    };
  }

  function pageReplacement(algo, refs, frames) {
    const allowed = ['fifo', 'lru', 'opt'];
    if (allowed.indexOf(algo) < 0) throw new RangeError('Unknown page replacement algorithm: ' + algo);
    if (!Array.isArray(refs) || !Number.isInteger(frames) || frames < 1) {
      throw new TypeError('References must be an array and frames must be an integer of at least 1.');
    }
    const slots = Array(frames).fill(null);
    const lastUsed = new Map();
    const loadedAt = new Map();
    const steps = [];
    let faults = 0;
    let hits = 0;

    refs.forEach((ref, index) => {
      const hitSlot = slots.indexOf(ref);
      let loadSlot = -1;
      let replaced = null;
      const hit = hitSlot >= 0;
      if (hit) {
        hits += 1;
        lastUsed.set(ref, index);
      } else {
        faults += 1;
        loadSlot = slots.indexOf(null);
        if (loadSlot < 0) {
          // FIFO follows load age, LRU follows use age, and Optimal looks ahead to the next use.
          if (algo === 'fifo') {
            loadSlot = slots.reduce((bestSlot, page, slot) =>
              loadedAt.get(page) < loadedAt.get(slots[bestSlot]) ? slot : bestSlot, 0);
          } else if (algo === 'lru') {
            loadSlot = slots.reduce((bestSlot, page, slot) =>
              lastUsed.get(page) < lastUsed.get(slots[bestSlot]) ? slot : bestSlot, 0);
          } else {
            let furthestUse = -1;
            slots.forEach((page, slot) => {
              const nextUse = refs.indexOf(page, index + 1);
              const distance = nextUse < 0 ? Infinity : nextUse;
              if (distance > furthestUse) {
                furthestUse = distance;
                loadSlot = slot;
              }
            });
          }
          replaced = slots[loadSlot];
          loadedAt.delete(replaced);
          lastUsed.delete(replaced);
        }
        slots[loadSlot] = ref;
        loadedAt.set(ref, index);
        lastUsed.set(ref, index);
      }
      steps.push({ ref, slots: slots.slice(), hit, hitSlot: hit ? hitSlot : -1, loadSlot, replaced });
    });
    return { steps, faults, hits };
  }

  function parseReferenceString(text) {
    const source = String(text == null ? '' : text).trim();
    const error = 'Use whole numbers from 0 to 999, separated by spaces or commas.';
    if (!source) return { refs: [], error: 'Enter at least one page number.' };
    const parts = source.split(/[\s,]+/);
    if (parts.some((part) => !/^\d+$/.test(part) || Number(part) > 999)) {
      return { refs: [], error };
    }
    if (parts.length > 40) return { refs: [], error: 'Use at most 40 references.' };
    return { refs: parts.map(Number), error: '' };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      schedule, ohmsLaw, torquePower, concreteSlab, idealGas,
      convertUnit, formatNumber, formatSI, UNIT_TABLE, pageReplacement, parseReferenceString
    };
  }

  /* ==================== Section 2: UI helpers ==================== */
  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  const ICONS = {
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

  const SVG_STYLE = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
  function icon(name) {
    return '<svg viewBox="0 0 24 24" ' + SVG_STYLE + ' aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  function storeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function announce(text) {
    if (typeof document === 'undefined') return;
    const live = document.getElementById('live');
    if (live) live.textContent = text;
  }

  function prefersReducedMotion() {
    try {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (error) {
      return false;
    }
  }

  function fmt(value, maxDecimals) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const decimals = maxDecimals == null ? 2 : Math.max(0, Math.min(9, maxDecimals));
    const clean = Math.abs(number) < 0.5 / Math.pow(10, decimals) ? 0 : number;
    const fixed = clean.toFixed(decimals);
    return fixed.indexOf('.') < 0 ? fixed : fixed.replace(/0+$/, '').replace(/\.$/, '');
  }

  function numberField(options) {
    const wideUnit = String(options.unit).length > 2;
    const id = escapeHtml(options.id);
    const hint = options.hint
      ? '<p class="el-field__msg" id="' + id + '-hint">' + escapeHtml(options.hint) + '</p>'
      : '';
    const describedBy = options.hint ? ' aria-describedby="' + id + '-hint"' : '';
    return '<div class="el-field" data-field="' + id + '">' +
      '<div class="el-field__label">' +
      '<label class="el-label" for="' + id + '">' + escapeHtml(options.label) + '</label>' +
      '<span class="el-label el-field__symbol">' + escapeHtml(options.symbol || '') + '</span>' +
      '</div>' +
      '<div class="el-input' + (wideUnit ? ' el-input--wide-unit' : '') + '">' +
      '<input id="' + id + '" type="number" step="any" inputmode="decimal" value="' +
      escapeHtml(options.value == null ? '' : options.value) + '"' + describedBy + '>' +
      '<span class="el-input__unit">' + escapeHtml(options.unit) + '</span>' +
      '</div>' + hint +
      '<p class="el-field__msg el-field__msg--error" id="' + id + '-err" hidden>' +
      icon('alert') + '<span></span></p>' +
      '</div>';
  }

  function resultTile(options) {
    return '<div class="el-result is-empty" id="' + options.id + '">' +
      '<div class="el-result__row">' +
      '<span class="el-label">' + escapeHtml(options.label) + '</span>' +
      '<span class="el-tag">' + escapeHtml(options.formula) + '</span>' +
      '</div>' +
      '<div class="el-result__value">' +
      '<span class="el-result__sym">' + escapeHtml(options.symbol) + ' =</span>' +
      '<span class="el-result__number">—</span>' +
      '<span class="el-result__unit">' + escapeHtml(options.unit || '') + '</span>' +
      '</div>' +
      '<div class="el-result__detail" hidden></div>' +
      '</div>';
  }

  function setValue(element, text) {
    if (!element || element.textContent === String(text)) return;
    element.textContent = String(text);
    if (prefersReducedMotion()) return;
    element.classList.remove('el-value-pop');
    void element.offsetWidth;
    element.classList.add('el-value-pop');
  }

  function testCard(options) {
    const cases = options.cases;
    const rows = cases.map((testCase, index) =>
      '<div class="el-test-row">' +
      '<span class="el-test-description">' + escapeHtml(testCase.label) + '</span>' +
      '<button type="button" class="el-test" data-test-index="' + index + '">' +
      '<span class="el-test__icon">▸</span>' +
      '<span>Run · expected ' + escapeHtml(testCase.expected) + '</span>' +
      '</button>' +
      '</div>').join('');
    return '<section class="el-card el-marks el-test-card">' +
      '<div class="el-card__head">' +
      '<span class="el-label">' + escapeHtml(options.title || 'Test cases') + '</span>' +
      '<span class="el-tag" data-test-counter>0 / ' + cases.length + ' passed</span>' +
      '</div><div class="el-test-list">' + rows + '</div></section>';
  }

  function comparisonRowMarkup(options) {
    const className = options.className || '';
    const best = options.best ? ' is-best' : '';
    const current = options.current ? ' is-current' : '';
    const active = options.current ? ' aria-current="true"' : '';
    const width = options.max ? options.value / options.max * 100 : 0;
    const star = options.best
      ? ' <span class="el-bars__star"><span aria-hidden="true">★</span>' +
        '<span class="scheduler-sr-only">best</span></span>'
      : '';
    return '<button type="button" class="el-bars__row ' + className + best + current +
      '" data-' + options.attribute + '="' + escapeHtml(options.id) + '"' + active +
      (options.title ? ' title="' + escapeHtml(options.title) + '"' : '') +
      '><span class="el-bars__name">' + escapeHtml(options.label) + star +
      '</span><span class="el-bars__track"><span class="el-bars__fill" style="width:' +
      width + '%"></span></span><span class="el-bars__val">' + escapeHtml(options.value) +
      '</span></button>';
  }

  function wireTests(root, cases) {
    root.querySelectorAll('[data-test-index]').forEach((button, index) => {
      button.addEventListener('click', () => {
        const result = cases[index].run();
        const label = result.pass
          ? 'Matches · expected ' + cases[index].expected
          : 'Does not match · expected ' + cases[index].expected + ' · got ' + result.got;
        button.className = 'el-test ' + (result.pass ? 'el-test--pass' : 'el-test--fail');
        button.innerHTML = '<span class="el-test__icon">' + (result.pass ? '✓' : '✗') +
          '</span><span>' + escapeHtml(label) + '</span>';
        const passed = root.querySelectorAll('.el-test--pass').length;
        root.querySelector('[data-test-counter]').textContent = passed + ' / ' + cases.length + ' passed';
        announce(label);
      });
    });
  }

  function near(got, expected, decimals) {
    const scale = 10 ** decimals;
    return Number.isFinite(Number(got)) &&
      Math.round(Number(got) * scale) === Math.round(Number(expected) * scale);
  }

  function fieldError(root, id, message) {
    const field = root.querySelector('[data-field="' + id + '"]');
    if (!field) return;
    const input = field.querySelector('input');
    const box = field.querySelector('.el-input');
    const error = field.querySelector('.el-field__msg--error');
    error.hidden = !message;
    error.querySelector('span').textContent = message || '';
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', id + '-err');
      box.classList.add('is-error');
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      box.classList.remove('is-error');
    }
  }

  function updateTile(root, id, value, unit, detail) {
    const tile = root.querySelector('#' + id);
    const text = value == null ? '—' : String(value);
    tile.classList.toggle('is-empty', text === '—');
    tile.classList.toggle('is-live', text !== '—');
    setValue(tile.querySelector('.el-result__number'), text);
    setValue(tile.querySelector('.el-result__unit'), text === '—' ? '' : unit || '');
    const detailElement = tile.querySelector('.el-result__detail');
    detailElement.hidden = !detail;
    setValue(detailElement, detail || '');
  }

  function inputValue(root, id) {
    const value = root.querySelector('#' + id).value;
    return value === '' ? null : Number(value);
  }

  function setInput(root, id, value) {
    root.querySelector('#' + id).value = value == null ? '' : String(value);
  }

  function pageMarkup(root, discipline, fields, tiles, visual, cases, title, resultLayout) {
    root.innerHTML = toolHead(discipline) +
      '<div class="el-tool"><div class="el-tool__left">' +
      '<section class="el-card el-marks"><div class="el-card__head">' +
      '<span class="el-label">Inputs</span>' +
      '<button class="el-btn el-btn--ghost el-btn--sm" type="button" data-reset>' +
      icon('reset') + 'Reset</button></div>' +
      '<div class="el-tool-fields">' + fields + '</div></section>' +
      '<div class="el-tool-results ' + (resultLayout || '') + '">' + tiles + '</div></div>' +
      '<section class="el-card el-marks el-tool-visual"><div class="el-card__head">' +
      '<span class="el-label">' + escapeHtml(title) + '</span>' +
      '<span class="el-label el-tool-status"></span></div>' + visual + '</section></div>' +
      testCard({ title: 'Test cases', cases });
    wireTests(root, cases);
  }

  function status(root, text, live) {
    root.querySelector('.el-tool-status').innerHTML =
      (live ? '<span class="el-live"></span>' : '') + escapeHtml(text);
  }

  /* ==================== Section 3: start screen, routing, and theme ==================== */
  const DISCIPLINES = [
    {
      route: 'computer', code: 'CmpE', field: 'Computer Engineering', tool: 'OS Scheduler Lab', icon: 'cmpe',
      tags: ['FCFS', 'SJF', 'SRTF', 'Priority', 'Round Robin', 'FIFO', 'LRU', 'Optimal'],
      desc: 'Simulate CPU scheduling and page replacement step by step, then compare every algorithm on the same workload.',
      lead: 'Simulate CPU scheduling and page replacement step by step, then compare every algorithm on the same workload.'
    },
    {
      route: 'electrical', code: 'EE', field: 'Electrical', tool: "Ohm's law", icon: 'ee',
      tags: ['I = V / R', 'P = V × I'],
      desc: 'Solve current and power from voltage and resistance.',
      lead: 'Enter a voltage and a resistance to get the current and the power, and watch the circuit respond.'
    },
    {
      route: 'mechanical', code: 'ME', field: 'Mechanical', tool: 'Torque & power', icon: 'me',
      tags: ['ω = 2π·rpm / 60', 'P = T × ω'],
      desc: 'Turn torque and shaft speed into angular velocity and power.',
      lead: 'Turn torque and shaft speed into angular velocity and mechanical power.'
    },
    {
      route: 'civil', code: 'CE', field: 'Civil', tool: 'Concrete slab', icon: 'ce',
      tags: ['V = L × W × t', 'bags'],
      desc: 'Volume, bags and weight of concrete for a slab.',
      lead: 'Work out the volume of a slab, how many 25 kg bags of concrete it takes, and what they weigh.'
    },
    {
      route: 'chemical', code: 'ChE', field: 'Chemical', tool: 'Ideal gas law', icon: 'che',
      tags: ['PV = nRT', 'R = 8.314'],
      desc: 'Leave one of P, V, n or T empty and solve for it.',
      lead: 'Leave one of P, V, n or T empty and the tool solves PV = nRT for it.'
    },
    {
      route: 'anyone', code: 'ALL', field: 'Anyone', tool: 'Unit converter', icon: 'all',
      tags: ['5 categories', 'history'],
      desc: 'Length, mass, pressure, energy and temperature, with a history of your conversions.',
      lead: 'Convert between common engineering units and keep a history of your last conversions.'
    }
  ];

  const EXAMPLE_PROCESSES = [
    { name: 'P1', arrival: 0, burst: 8, priority: 3 },
    { name: 'P2', arrival: 1, burst: 4, priority: 1 },
    { name: 'P3', arrival: 2, burst: 9, priority: 4 },
    { name: 'P4', arrival: 3, burst: 5, priority: 2 }
  ];

  const ALGORITHMS = [
    { id: 'fcfs', short: 'FCFS', title: 'First Come, First Served' },
    { id: 'sjf', short: 'SJF', title: 'Shortest Job First, non-preemptive' },
    { id: 'srtf', short: 'SRTF', title: 'Shortest Remaining Time First, preemptive' },
    { id: 'prio', short: 'Priority', title: 'Priority, non-preemptive' },
    { id: 'priop', short: 'Priority (P)', title: 'Priority, preemptive' },
    { id: 'rr', short: 'Round Robin', title: 'Round Robin' }
  ];

  function renderGantt(slices, mini) {
    if (!slices.length) return '';
    const start = slices[0].start;
    const end = slices[slices.length - 1].end;
    const span = end - start || 1;
    const description = slices.map((slice) => (slice.name || 'idle') + ' ' + fmt(slice.start, 3) + ' to ' + fmt(slice.end, 3)).join(', ');
    const bars = slices.map((slice, index) => {
      const share = (slice.end - slice.start) / span * 100;
      const className = slice.index < 0 ? 'el-gantt__bar--idle' : 'p' + ((slice.index % 10) + 1);
      const label = slice.name || 'idle';
      const delay = index * 60;
      return '<div class="el-gantt__bar ' + className + '" style="flex:0 0 calc(' + share + '% - 2px);' +
        '--bar-delay:' + delay + 'ms" title="' +
        escapeHtml(label + ' · ' + fmt(slice.start, 3) + '–' + fmt(slice.end, 3)) +
        '" aria-hidden="true">' + escapeHtml(label) + '</div>';
    }).join('');
    const times = [start].concat(slices.map((slice) => slice.end));
    const ticks = times.map((value) => {
      const position = (value - start) / span * 100;
      return '<span class="el-gantt__tick" style="left:' + position + '%">' + fmt(value, 3) + '</span>';
    }).join('');
    return '<div class="el-gantt-scroll"><div class="el-gantt' + (mini ? ' el-gantt--mini' : '') +
      '" role="img" aria-label="Gantt chart: ' + escapeHtml(description) + '">' +
      '<div class="el-gantt__track">' + bars + '</div>' +
      '<div class="el-gantt__ticks" aria-hidden="true">' + ticks + '</div></div></div>';
  }

  function dcard(d, index) {
    const featured = index === 0;
    let visual = '';
    if (featured) {
      const rr = schedule('rr', EXAMPLE_PROCESSES, 3);
      const comparisons = ALGORITHMS.map((algorithm) => ({
        algorithm,
        average: schedule(algorithm.id, EXAMPLE_PROCESSES, 3).avgWT
      }));
      const best = comparisons.reduce((current, item) => item.average < current.average ? item : current);
      const bestName = best.algorithm.short;
      visual = '<div class="el-dcard__visual">' +
        '<div class="el-dcard__visual-head"><span class="el-label">Round Robin · q = 3</span>' +
        '<span class="el-label el-dcard__live"><span class="el-live"></span>Live</span></div>' +
        renderGantt(rr.slices, true) +
        '<div class="el-dcard__stats"><span>avg WT <b>' + fmt(rr.avgWT) + '</b></span>' +
        '<span>avg TAT <b>' + fmt(rr.avgTAT) + '</b></span>' +
        '<span>CPU <b>' + fmt(rr.utilization * 100, 0) + '%</b></span>' +
        '<span>★ best <b class="is-best">' + escapeHtml(bestName) + ' ' + fmt(best.average) +
        '</b></span></div>' +
        '<div class="el-term"><span class="el-term__prompt">$</span>' +
        '<span>schedlab <span class="el-term__flag">--algo</span> rr ' +
        '<span class="el-term__flag">--quantum</span> 3<span class="el-cursor"></span></span></div>' +
        '</div>';
    }
    const tags = d.tags.map((tag) => '<span class="el-tag">' + escapeHtml(tag) + '</span>').join('');
    return '<a class="el-card el-marks el-dcard' + (featured ? ' el-dcard--featured' : '') +
      '" href="#' + escapeHtml(d.route) + '">' +
      '<div class="el-dcard__top"><span class="el-icontile' +
      (featured ? ' el-icontile--lg' : '') + '">' + icon(d.icon) + '</span>' +
      '<span class="el-code' + (featured ? ' el-code--solid' : '') + '">' +
      escapeHtml(d.code) + '</span></div>' +
      '<div><div class="el-label">' + escapeHtml(d.field) + '</div>' +
      '<h2 class="el-dcard__tool">' + escapeHtml(d.tool) + '</h2></div>' +
      '<p class="el-dcard__desc">' + escapeHtml(d.desc) + '</p>' + visual +
      '<div class="el-dcard__foot"><div class="el-tags">' + tags + '</div>' +
      '<span class="el-dcard__open">Open <span aria-hidden="true">→</span></span></div>' +
      '</a>';
  }

  function startScreen(container) {
    container.innerHTML = '<section class="el-start-hero">' +
      '<div class="el-eyebrow el-label"><span class="el-live"></span>Engineering toolkit · 6 disciplines</div>' +
      '<h1 id="page-title" tabindex="-1">Which ' +
      '<span class="el-start-highlight">engineer</span> are you?' +
      '<span class="el-cursor el-cursor--hero" aria-hidden="true"></span></h1>' +
      '<p class="el-start-lead">Pick your discipline and open a calculator or simulator built ' +
      'for the problems you actually solve in class.</p>' +
      '<div class="el-chips"><span class="el-chip">' + icon('check') + 'No sign-up</span>' +
      '<span class="el-chip">' + icon('check') + 'Runs in your browser</span>' +
      '<span class="el-chip">' + icon('check') + 'Light &amp; dark</span></div>' +
      '</section><div class="el-grid el-start-grid">' + DISCIPLINES.map(dcard).join('') + '</div>';

    const cards = Array.from(container.querySelectorAll('.el-dcard'));
    const hoverFine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hoverFine && !prefersReducedMotion()) {
      cards.forEach((card) => {
        card.addEventListener('pointermove', (event) => {
          const rect = card.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
          card.style.setProperty('--spot-x', (x * 100) + '%');
          card.style.setProperty('--spot-y', (y * 100) + '%');
          card.style.setProperty('--tilt-x', ((0.5 - y) * 6) + 'deg');
          card.style.setProperty('--tilt-y', ((x - 0.5) * 6) + 'deg');
        });
        card.addEventListener('pointerleave', () => {
          card.style.removeProperty('--spot-x');
          card.style.removeProperty('--spot-y');
          card.style.removeProperty('--tilt-x');
          card.style.removeProperty('--tilt-y');
        });
      });
    }

    let ganttTimer = null;
    const miniGantt = container.querySelector('.el-dcard--featured .el-gantt');
    if (miniGantt && !prefersReducedMotion()) {
      // Removing the class, forcing a reflow and adding it again restarts the CSS animation.
      const restartGantt = () => {
        miniGantt.classList.remove('is-gantt-animating');
        void miniGantt.offsetWidth;
        miniGantt.classList.add('is-gantt-animating');
      };
      restartGantt();
      ganttTimer = window.setInterval(restartGantt, 6000);
    }

    return function cleanupStartScreen() {
      if (ganttTimer !== null) window.clearInterval(ganttTimer);
    };
  }

  function toolHead(d, rightSlot) {
    const tags = d.tags.map((tag) => '<span class="el-tag">' + escapeHtml(tag) + '</span>').join('');
    return '<header class="el-toolhead"><div class="el-toolhead__id"><span class="el-icontile el-icontile--lg">' + icon(d.icon) + '</span>' +
      '<div class="el-toolhead__text"><div class="el-label">' + escapeHtml(d.code) + ' · ' + escapeHtml(d.field) + '</div>' +
      '<h1 id="page-title" tabindex="-1">' + escapeHtml(d.tool) + '</h1><p class="el-toolhead__lead">' + escapeHtml(d.lead) + '</p></div></div>' +
      '<div class="el-toolhead__right">' + (rightSlot || '<div class="el-tags">' + tags + '</div>') +
      '</div></header>';
  }

  function routeFromHash() {
    const route = window.location.hash.replace(/^#/, '');
    return DISCIPLINES.some((discipline) => discipline.route === route) ? route : 'start';
  }

  function updateTopbar(route) {
    const breadcrumb = document.getElementById('breadcrumb');
    const allLink = document.getElementById('all-disciplines');
    const discipline = DISCIPLINES.find((item) => item.route === route);
    if (!discipline) {
      breadcrumb.hidden = true;
      allLink.hidden = true;
      return;
    }
    document.getElementById('breadcrumb-desktop').textContent = '/ ' + discipline.code + ' / ' + discipline.tool;
    document.getElementById('breadcrumb-phone').textContent = '/ ' + discipline.code;
    breadcrumb.hidden = false;
    allLink.hidden = false;
  }

  function initApp() {
    const app = document.getElementById('app');
    const root = document.documentElement;
    const themeButton = document.getElementById('theme-toggle');
    const storedTheme = storeGet('englab.theme');
    let explicitThemeChoice = storedTheme === 'light' || storedTheme === 'dark';
    if (explicitThemeChoice) root.setAttribute('data-theme', storedTheme);
    else root.removeAttribute('data-theme');

    function updateThemeButton() {
      const dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      themeButton.innerHTML = icon(dark ? 'sun' : 'moon');
    }

    themeButton.addEventListener('click', () => {
      const dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = dark ? 'light' : 'dark';
      explicitThemeChoice = true;
      root.setAttribute('data-theme', next);
      storeSet('englab.theme', next);
      updateThemeButton();
      document.dispatchEvent(new CustomEvent('englab:themechange', { detail: { theme: next } }));
    });

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = () => {
      if (!explicitThemeChoice) {
        root.removeAttribute('data-theme');
        updateThemeButton();
        document.dispatchEvent(new CustomEvent('englab:themechange', {
          detail: { theme: systemTheme.matches ? 'dark' : 'light' }
        }));
      }
    };
    if (systemTheme.addEventListener) systemTheme.addEventListener('change', onSystemThemeChange);
    else if (systemTheme.addListener) systemTheme.addListener(onSystemThemeChange);

    let cleanupPage = null;
    function renderRoute(moveFocus) {
      if (typeof cleanupPage === 'function') cleanupPage();
      cleanupPage = null;
      const route = routeFromHash();
      const page = document.createElement('div');
      page.className = prefersReducedMotion() ? 'el-page' : 'el-page el-page--enter';
      app.replaceChildren(page);

      if (route === 'start') {
        document.title = 'EngLab · Engineering toolkit';
        cleanupPage = startScreen(page);
      } else {
        const discipline = DISCIPLINES.find((item) => item.route === route);
        document.title = discipline.tool + ' · EngLab';
        cleanupPage = TOOL_RENDERERS[route](page, discipline) || null;
      }
      updateTopbar(route);
      announce(route === 'start' ? 'Engineering toolkit home' : document.title);

      const heading = page.querySelector('h1');
      if (moveFocus && heading) {
        try {
          heading.focus({ preventScroll: true });
        } catch (error) {
          heading.focus();
        }
      }
      window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', () => renderRoute(true));
    updateThemeButton();
    renderRoute(false);
  }

  /* ==================== Section 4: engineering tools ==================== */
  function renderOhm(root, discipline) {
    const cases = [
      {
        label: '12 V across 4 Ω',
        expected: '3 A, 36 W',
        run() { return run(12, 4, 3, 36); }
      },
      {
        label: '5 V across 1 kΩ',
        expected: '5 mA, 25 mW',
        run() { return run(5, 1000, 0.005, 0.025); }
      },
      {
        label: '230 V across 52.9 Ω',
        expected: '≈ 4.348 A, 1 kW',
        run() { return run(230, 52.9, 4.348, 1000); }
      }
    ];
    const fields = numberField({ id: 'ohm-v', label: 'Voltage', symbol: 'V', unit: 'V', value: 12 }) +
      numberField({ id: 'ohm-r', label: 'Resistance', symbol: 'R', unit: 'Ω', value: 4 }) +
      '<p id="ohm-input-note" class="el-field__msg el-empty-note" hidden>' +
      'Enter a voltage and a resistance.</p>';
    const tiles = resultTile({ id: 'ohm-i', label: 'Current', symbol: 'I', formula: 'I = V / R', unit: 'A' }) +
      resultTile({ id: 'ohm-p', label: 'Power', symbol: 'P', formula: 'P = V × I', unit: 'W' });
    const loop = 'M90 210 V90 H230 M370 90 H510 V330 H90 V250';
    const visual = `
      <svg id="circuit" class="el-circuit is-off" viewBox="20 40 560 320" role="img" aria-label="Circuit, no current">
        <path class="wire" d="${loop}"/>
        <path id="cflow" class="flow" d="${loop}"/>
        <path id="cglow" class="res-glow" d="M230 90 l12 -18 l24 36 l24 -36 l24 36 l24 -36 l20 30 l12 -12"/>
        <path class="res" d="M230 90 l12 -18 l24 36 l24 -36 l24 36 l24 -36 l20 30 l12 -12"/>
        <line class="bat-long" x1="58" y1="210" x2="122" y2="210"/>
        <line class="bat-short" x1="72" y1="250" x2="108" y2="250"/>
        <path class="wire" d="M90 210 V214 M90 250 V246"/>
        <text class="lbl-strong" x="130" y="204">+</text>
        <text class="lbl-strong" x="118" y="266">−</text>
        <text id="cv" class="lbl" x="140" y="235">V = 12 V</text>
        <text id="cr" class="lbl" x="300" y="146" text-anchor="middle">R = 4 Ω</text>
        <path class="arrow" d="M510 222 l-10 -18 h20 Z"/>
        <text class="lbl" x="526" y="214">I</text>
        <text id="ci" class="center" x="300" y="222" text-anchor="middle">I = —</text>
        <text id="cc" class="lbl" x="300" y="250" text-anchor="middle">no current</text>
      </svg>`;
    pageMarkup(root, discipline, fields, tiles, visual, cases, 'Circuit', 'el-tool-results--ohm');
    let offset = 0;
    let last = 0;
    let raf = null;
    let alive = true;
    const svg = root.querySelector('#circuit');
    const flow = root.querySelector('#cflow');
    function paint() {
      const voltage = inputValue(root, 'ohm-v');
      const resistance = inputValue(root, 'ohm-r');
      const result = voltage == null || resistance == null
        ? { error: '' }
        : ohmsLaw(voltage, resistance);
      const isValid = !result.error && voltage != null && resistance != null;
      fieldError(root, 'ohm-v', '');
      fieldError(root, 'ohm-r', result.error && resistance != null ? result.error : '');

      if (isValid) {
        const current = formatSI(result.I, 'A');
        const power = formatSI(result.P, 'W');
        updateTile(root, 'ohm-i', current.value, current.unit);
        updateTile(root, 'ohm-p', power.value, power.unit);
      } else {
        updateTile(root, 'ohm-i', null);
        updateTile(root, 'ohm-p', null);
      }
      svg.classList.toggle('is-off', !isValid);
      svg.dataset.i = isValid ? result.I : 0;
      svg.setAttribute('aria-label', isValid
        ? 'Circuit: ' + formatNumber(voltage) + ' volts, ' + formatNumber(resistance) +
          ' ohms, current ' + formatNumber(result.I) + ' amperes'
        : 'Circuit, no current');
      const currentDisplay = isValid ? formatSI(result.I, 'A') : null;
      setValue(root.querySelector('#ci'), currentDisplay
        ? 'I = ' + currentDisplay.value + ' ' + currentDisplay.unit
        : 'I = —');
      setValue(root.querySelector('#cv'), 'V = ' +
        (voltage == null ? '—' : formatNumber(voltage)) + ' V');
      setValue(root.querySelector('#cr'), 'R = ' +
        (resistance == null ? '—' : formatNumber(resistance)) + ' Ω');
      const circuitNote = !isValid || result.I === 0
        ? 'no current'
        : result.I < 0 ? 'current reversed, − → +' : 'conventional current, + → −';
      setValue(root.querySelector('#cc'), circuitNote);
      status(root, !isValid ? 'Open' : result.I === 0 ? 'No current' : 'Current flowing',
        isValid && result.I !== 0);

      // A logarithmic power scale keeps the resistor glow useful from milliwatts to megawatts.
      const glowFraction = isValid && Math.abs(result.P) > 0
        ? Math.max(0, Math.min(1, (Math.log10(Math.abs(result.P)) + 3) / 7))
        : 0;
      const glow = root.querySelector('#cglow');
      glow.style.opacity = isValid ? 0.08 + 0.52 * glowFraction : 0;
      glow.style.strokeWidth = (8 + 12 * glowFraction) + 'px';
      const inputNote = root.querySelector('#ohm-input-note');
      inputNote.hidden = !(voltage == null || resistance == null) || !!result.error;
    }
    function frame(time) {
      if (!alive) return;
      const current = Number(svg.dataset.i || 0);
      if (last && current && !prefersReducedMotion()) {
        const deltaTime = Math.min(0.05, (time - last) / 1000);
        // Log mapping makes dot speed readable across several orders of current magnitude.
        const speedFraction = Math.max(0, Math.min(1,
          (Math.log10(Math.max(Math.abs(current), 0.001)) + 3) / 5));
        offset += (current < 0 ? -1 : 1) * (8.67 + 95.33 * speedFraction) * deltaTime;
        flow.style.strokeDashoffset = offset;
      }
      last = time;
      raf = requestAnimationFrame(frame);
    }
    root.querySelectorAll('#ohm-v,#ohm-r').forEach((input) => input.addEventListener('input', paint));
    root.querySelector('[data-reset]').addEventListener('click', () => {
      setInput(root, 'ohm-v', 12);
      setInput(root, 'ohm-r', 4);
      paint();
    });
    function run(voltage, resistance, expectedCurrent, expectedPower) {
      setInput(root, 'ohm-v', voltage);
      setInput(root, 'ohm-r', resistance);
      paint();
      const result = ohmsLaw(voltage, resistance);
      const current = formatSI(result.I, 'A');
      const power = formatSI(result.P, 'W');
      return {
        pass: near(result.I, expectedCurrent, 3) && near(result.P, expectedPower, 3),
        got: current.value + ' ' + current.unit + ', ' + power.value + ' ' + power.unit
      };
    }
    paint();
    if (!prefersReducedMotion()) raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      if (raf != null) cancelAnimationFrame(raf);
    };
  }
  function gearPath(teeth, radius, centerX, centerY, phase) {
    const points = [];
    for (let index = 0; index < teeth * 4; index += 1) {
      const angle = phase + index * Math.PI * 2 / (teeth * 4) - Math.PI / 2;
      // Shallow teeth leave room for strokes between the 16:10 gears' tip and root circles.
      const toothRadius = index % 4 === 1 || index % 4 === 2 ? radius * 1.01 : radius * 0.88;
      points.push(
        (centerX + Math.cos(angle) * toothRadius).toFixed(2) + ',' +
        (centerY + Math.sin(angle) * toothRadius).toFixed(2)
      );
    }
    return 'M' + points.join(' L') + ' Z';
  }
  function renderTorque(root, discipline) {
    const cases = [
      {
        label: '10 N·m at 1000 rpm',
        expected: 'ω ≈ 104.72 rad/s, P ≈ 1,047.2 W',
        run() { return run(10, 1000, 104.72, 1047.2, 2, 1, false); }
      },
      {
        label: '200 N·m at 3000 rpm',
        expected: 'ω ≈ 314.16 rad/s, P ≈ 62.83 kW',
        run() { return run(200, 3000, 314.16, 62.83, 2, 2, true); }
      },
      {
        label: '50 N·m at 60 rpm',
        expected: 'ω ≈ 6.283 rad/s, P ≈ 314.16 W',
        run() { return run(50, 60, 6.283, 314.16, 3, 2, false); }
      }
    ];
    const fields = numberField({ id: 'tor-t', label: 'Torque', symbol: 'T', unit: 'N·m', value: 50 }) +
      numberField({ id: 'tor-rpm', label: 'Speed', symbol: 'n', unit: 'rpm', value: 1500 });
    const tiles = resultTile({ id: 'tor-w', label: 'Angular velocity', symbol: 'ω',
      formula: 'ω = 2π·rpm / 60', unit: 'rad/s' }) +
      resultTile({ id: 'tor-p', label: 'Power', symbol: 'P', formula: 'P = T × ω', unit: 'W' });
    const visual = `
      <div class="el-gear-stage">
        <div class="el-gear-power" id="gear-p">P = —</div>
        <svg class="el-gears" viewBox="0 0 420 280" role="img" aria-label="Two meshing gears">
          <g id="gb">
            <path class="gear-big"/>
            <circle class="gear-hub" cx="145" cy="138" r="21"/>
            <circle class="gear-axle" cx="145" cy="138" r="5"/>
          </g>
          <g id="gs">
            <path class="gear-small"/>
            <circle class="gear-hub" cx="249" cy="138" r="13"/>
            <circle class="gear-axle" cx="249" cy="138" r="4"/>
          </g>
        </svg>
        <div class="el-gear-stats"><span id="gear-t">T = 50 N·m</span><span id="gear-n">1,500 rpm</span></div>
        <p class="el-visual-note">Animation speed is scaled down (∝ √rpm) so it stays watchable.</p>
      </div>`;
    pageMarkup(root, discipline, fields, tiles, visual, cases, 'Meshing gears', 'el-tool-results--single');
    const big = root.querySelector('#gb');
    const small = root.querySelector('#gs');
    // Align the large tooth to the centerline; a half small-gear tooth pitch places its gap there.
    big.querySelector('path').setAttribute('d', gearPath(16, 64, 145, 138, -Math.PI / 32));
    small.querySelector('path').setAttribute('d', gearPath(10, 40, 249, 138, Math.PI / 10));
    let rpmNow = 1500;
    let angle = 0;
    let last = 0;
    let raf = null;
    let alive = true;
    function setGearTransforms() {
      // The pitch diameters follow the 16:10 tooth count, so their angular speeds use the same ratio.
      big.setAttribute('transform', 'rotate(' + angle * 180 / Math.PI + ' 145 138)');
      small.setAttribute('transform', 'rotate(' + (-angle * 16 / 10 * 180 / Math.PI) + ' 249 138)');
    }
    function paint() {
      const torque = inputValue(root, 'tor-t');
      const rpm = inputValue(root, 'tor-rpm');
      const result = torque == null || rpm == null ? { error: '' } : torquePower(torque, rpm);
      const isValid = !result.error && torque != null && rpm != null;
      fieldError(root, 'tor-t', result.error && torque != null ? result.error : '');
      fieldError(root, 'tor-rpm', result.error && rpm != null ? result.error : '');
      rpmNow = isValid ? rpm : 0;
      if (isValid) {
        updateTile(root, 'tor-w', formatNumber(result.omega), 'rad/s');
        updateTile(root, 'tor-p', formatNumber(result.P), 'W', formatNumber(result.kW) + ' kW');
        setValue(root.querySelector('#gear-p'), 'P = ' + formatNumber(result.kW) + ' kW');
      } else {
        updateTile(root, 'tor-w', null);
        updateTile(root, 'tor-p', null);
        setValue(root.querySelector('#gear-p'), 'P = —');
      }
      setValue(root.querySelector('#gear-t'), 'T = ' +
        (torque == null ? '—' : formatNumber(torque)) + ' N·m');
      setValue(root.querySelector('#gear-n'), (rpm == null ? '—' : formatNumber(rpm)) + ' rpm');
      status(root, isValid ? (rpm ? 'Rotating' : 'Stopped') : 'Open', isValid && !!rpm);
      setGearTransforms();
    }
    function frame(time) {
      if (!alive) return;
      if (last && rpmNow && !prefersReducedMotion()) {
        const deltaTime = Math.min(0.05, (time - last) / 1000);
        // Square-root RPM scaling keeps motion visible; one revolution per second is the cap.
        const angularSpeed = Math.min(2 * Math.PI, Math.sqrt(Math.abs(rpmNow)) * 0.06);
        angle += Math.sign(rpmNow) * angularSpeed * deltaTime;
        setGearTransforms();
      }
      last = time;
      raf = requestAnimationFrame(frame);
    }
    root.querySelectorAll('#tor-t,#tor-rpm').forEach((input) => input.addEventListener('input', paint));
    root.querySelector('[data-reset]').addEventListener('click', () => {
      setInput(root, 'tor-t', 50);
      setInput(root, 'tor-rpm', 1500);
      paint();
    });
    function run(torque, rpm, expectedOmega, expectedPower, omegaDigits, powerDigits, powerIsKilowatts) {
      setInput(root, 'tor-t', torque);
      setInput(root, 'tor-rpm', rpm);
      paint();
      const result = torquePower(torque, rpm);
      const power = powerIsKilowatts ? result.kW : result.P;
      return {
        pass: near(result.omega, expectedOmega, omegaDigits) && near(power, expectedPower, powerDigits),
        got: formatNumber(result.omega) + ' rad/s, ' + formatNumber(result.P) + ' W'
      };
    }
    paint();
    if (!prefersReducedMotion()) raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      if (raf != null) cancelAnimationFrame(raf);
    };
  }
  function slabSvg(length, width, thickness) {
    const viewWidth = 440;
    const viewHeight = 300;
    if (![length, width, thickness].every(Number.isFinite) || length <= 0 || width <= 0 || thickness <= 0) {
      return '<svg class="el-slab-svg" viewBox="0 0 440 300" role="img" ' +
        'aria-label="Slab outline unavailable"><path class="slab-outline" ' +
        'd="M70 120 205 60 350 112 210 180v78l-140-60v-78l135-60v78l140-68v78l-140 62"/></svg>';
    }
    const cosThirty = Math.cos(Math.PI / 6);
    const sinThirty = Math.sin(Math.PI / 6);
    const projectedSpan = length + width;
    const scale = Math.min(270 / (projectedSpan * cosThirty), 92 / (projectedSpan * sinThirty));
    const lengthX = length * scale * cosThirty;
    const lengthY = length * scale * sinThirty;
    const widthX = -width * scale * cosThirty;
    const widthY = width * scale * sinThirty;
    const visualThickness = Math.max(18, Math.min(40, Math.sqrt(thickness) * 55));
    const originX = viewWidth / 2 - (lengthX + widthX) / 2;
    const originY = 124 - (lengthY + widthY) / 2;
    const farX = originX + lengthX + widthX;
    const farY = originY + lengthY + widthY;
    const frontX = originX + lengthX;
    const frontY = originY + lengthY;
    const backX = originX + widthX;
    const backY = originY + widthY;
    const bottomY = visualThickness;
    const labelLength = 'L = ' + escapeHtml(formatNumber(length)) + ' m';
    const labelWidth = 'W = ' + escapeHtml(formatNumber(width)) + ' m';
    const labelThickness = 't = ' + escapeHtml(formatNumber(thickness)) + ' m';

    // Both ground dimensions use the same scale, so their displayed ratio matches the input ratio.
    // The origin is the far (top) corner: length runs down-right, width runs down-left, and the
    // nearest corner is the bottom one. The two visible vertical faces hang from the edges that
    // meet at that nearest corner.
    const point = (x, y) => x.toFixed(1) + ' ' + y.toFixed(1);
    const face = (className, x1, y1, x2, y2) =>
      '<path class="slab-face ' + className + '" d="M' + point(x1, y1) + ' L' + point(x2, y2) +
      ' L' + point(x2, y2 + bottomY) + ' L' + point(x1, y1 + bottomY) + ' Z"/>';

    // Dimension lines sit 14 units outside the bottom edges, parallel to them.
    const gap = 14;
    const lengthLine = {
      x1: backX - sinThirty * gap, y1: backY + bottomY + cosThirty * gap,
      x2: farX - sinThirty * gap, y2: farY + bottomY + cosThirty * gap
    };
    const widthLine = {
      x1: frontX + sinThirty * gap, y1: frontY + bottomY + cosThirty * gap,
      x2: farX + sinThirty * gap, y2: farY + bottomY + cosThirty * gap
    };
    const thicknessX = backX - gap;
    const tick = (x, y, dx, dy) => ' M' + point(x - dx, y - dy) + ' L' + point(x + dx, y + dy);
    const dimensions =
      'M' + point(lengthLine.x1, lengthLine.y1) + ' L' + point(lengthLine.x2, lengthLine.y2) +
      tick(lengthLine.x1, lengthLine.y1, 2.5, -4.3) + tick(lengthLine.x2, lengthLine.y2, 2.5, -4.3) +
      ' M' + point(widthLine.x1, widthLine.y1) + ' L' + point(widthLine.x2, widthLine.y2) +
      tick(widthLine.x1, widthLine.y1, 2.5, 4.3) + tick(widthLine.x2, widthLine.y2, 2.5, 4.3) +
      ' M' + point(thicknessX, backY) + ' V' + (backY + bottomY).toFixed(1) +
      tick(thicknessX, backY, 5, 0) + tick(thicknessX, backY + bottomY, 5, 0);
    const label = (x, y, anchor, text) =>
      '<text class="slab-label" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
      '" text-anchor="' + anchor + '">' + text + '</text>';

    return '<svg class="el-slab-svg" viewBox="0 0 ' + viewWidth + ' ' + viewHeight + '" ' +
      'role="img" aria-label="Concrete slab, ' + labelLength + ', ' + labelWidth + ', ' + labelThickness + '">' +
      '<path class="slab-face slab-top" d="M' + point(originX, originY) + ' L' + point(frontX, frontY) +
      ' L' + point(farX, farY) + ' L' + point(backX, backY) + ' Z"/>' +
      face('slab-front', backX, backY, farX, farY) +
      face('slab-side', frontX, frontY, farX, farY) +
      '<path class="slab-dimension" d="' + dimensions + '"/>' +
      label((lengthLine.x1 + lengthLine.x2) / 2 - 10, (lengthLine.y1 + lengthLine.y2) / 2 + 18, 'end', labelLength) +
      label((widthLine.x1 + widthLine.x2) / 2 + 10, (widthLine.y1 + widthLine.y2) / 2 + 18, 'start', labelWidth) +
      label(thicknessX - 9, backY + bottomY / 2 + 4, 'end', labelThickness) +
      '</svg>';
  }
  function renderSlab(root, discipline) {
    const cases = [
      {
        label: '4 × 3 × 0.10 m',
        expected: '1.2 m³, 100 bags',
        run() { return run(4, 3, 0.1, 1.2, 100); }
      },
      {
        label: '5 × 5 × 0.15 m',
        expected: '3.75 m³, 313 bags',
        run() { return run(5, 5, 0.15, 3.75, 313); }
      },
      {
        label: '2 × 1 × 0.08 m',
        expected: '0.16 m³, 14 bags',
        run() { return run(2, 1, 0.08, 0.16, 14); }
      }
    ];
    const fields = numberField({ id: 'slab-l', label: 'Length', symbol: 'L', unit: 'm', value: 4 }) +
      numberField({ id: 'slab-w', label: 'Width', symbol: 'W', unit: 'm', value: 3 }) +
      numberField({ id: 'slab-t', label: 'Thickness', symbol: 't', unit: 'm', value: 0.1 }) +
      numberField({ id: 'slab-y', label: 'Yield per 25 kg bag', symbol: 'yield', unit: 'm³',
        value: 0.012, hint: 'Printed on the bag, usually about 0.011–0.012 m³.' });
    const tiles = resultTile({ id: 'slab-v', label: 'Volume', symbol: 'V',
      formula: 'V = L × W × t', unit: 'm³' }) +
      resultTile({ id: 'slab-b', label: 'Bags', symbol: 'N',
        formula: 'bags = V ÷ yield, rounded up', unit: 'bags' }) +
      resultTile({ id: 'slab-weight', label: 'Total weight', symbol: 'm',
        formula: 'bags × 25 kg', unit: 'kg' });
    const visual = '<div id="slab-drawing">' + slabSvg(4, 3, 0.1) + '</div>' +
      '<p class="el-visual-note">Thickness is exaggerated for clarity.</p>';
    pageMarkup(root, discipline, fields, tiles, visual, cases, 'Slab dimensions', 'el-tool-results--single');
    let lastValid = [4, 3, 0.1];
    function paint() {
      const ids = ['slab-l', 'slab-w', 'slab-t', 'slab-y'];
      const names = ['Length', 'Width', 'Thickness', 'Yield per bag'];
      const values = ids.map((id) => inputValue(root, id));
      let error = '';
      values.forEach((value, index) => {
        const message = value == null
          ? ''
          : !Number.isFinite(value) || value <= 0 ? names[index] + ' must be greater than 0.' : '';
        fieldError(root, ids[index], message);
        if (message && !error) error = message;
      });
      if (values.some((value) => value == null)) {
        error = 'Enter all four dimensions and yield values.';
      }
      if (!error) {
        const result = concreteSlab(...values);
        lastValid = values.slice(0, 3);
        updateTile(root, 'slab-v', formatNumber(result.volume), 'm³');
        updateTile(root, 'slab-b', formatNumber(result.bags, 12), 'bags',
          formatNumber(result.volume) + ' ÷ ' + formatNumber(values[3]) + ' = ' +
          formatNumber(result.ratio, 6) + ', rounded up');
        const weightDetail = result.weight >= 1000
          ? formatNumber(result.weight / 1000) + ' t'
          : '';
        updateTile(root, 'slab-weight', formatNumber(result.weight, 12), 'kg', weightDetail);
        root.querySelector('#slab-drawing').innerHTML = slabSvg(...lastValid);
      } else {
        ['slab-v', 'slab-b', 'slab-weight'].forEach((id) => updateTile(root, id, null));
      }
      status(root, error ? 'Check dimensions' : 'Ready', !error);
    }
    root.querySelectorAll('#slab-l,#slab-w,#slab-t,#slab-y').forEach((input) => {
      input.addEventListener('input', paint);
    });
    root.querySelector('[data-reset]').addEventListener('click', () => {
      [['slab-l', 4], ['slab-w', 3], ['slab-t', 0.1], ['slab-y', 0.012]].forEach(([id, value]) => {
        setInput(root, id, value);
      });
      paint();
    });
    function run(length, width, thickness, expectedVolume, expectedBags) {
      [['slab-l', length], ['slab-w', width], ['slab-t', thickness], ['slab-y', 0.012]]
        .forEach(([id, value]) => setInput(root, id, value));
      paint();
      const result = concreteSlab(length, width, thickness, 0.012);
      return {
        pass: near(result.volume, expectedVolume, 2) && result.bags === expectedBags,
        got: formatNumber(result.volume) + ' m³, ' + result.bags + ' bags'
      };
    }
    paint();
    return null;
  }

  function renderGas(root, discipline) {
    const cases = [
      { label: '1 mol at 0 °C and 1 atm', expected: 'V ≈ 0.022413 m³ (22.41 L)',
        run() { return run({ P: 101325, V: null, n: 1, T: 273.15 }, 'V', 0.022413, 6); } },
      { label: '2 mol in 50 L at 300 K', expected: 'P = 99,768 Pa',
        run() { return run({ P: null, V: 0.05, n: 2, T: 300 }, 'P', 99768, 0); } },
      { label: '1 mol, 2 bar, 10 L', expected: 'T ≈ 240.56 K',
        run() { return run({ P: 200000, V: 0.01, n: 1, T: null }, 'T', 240.56, 2); } }
    ];
    const ids = { P: 'gas-p', V: 'gas-v', n: 'gas-n', T: 'gas-t' };
    const units = { P: 'Pa', V: 'm³', n: 'mol', T: 'K' };
    const labels = { P: 'Pressure', V: 'Volume', n: 'Amount', T: 'Temperature' };
    const formulas = {
      P: 'P = nRT / V', V: 'V = nRT / P', n: 'n = PV / RT', T: 'T = PV / nR'
    };
    const solveButtons = ['P', 'V', 'n', 'T'].map((key) =>
      '<button type="button" class="el-pill" data-solve="' + key + '" aria-pressed="' +
      (key === 'V') + '">Solve for ' + key + '</button>').join('');
    const fields = '<div class="el-pills el-gas-pills" role="group" aria-label="Solve for">' +
      solveButtons + '</div>' +
      numberField({ id: ids.P, label: 'Pressure', symbol: 'P', unit: 'Pa', value: 101325 }) +
      numberField({ id: ids.V, label: 'Volume', symbol: 'V', unit: 'm³', value: '' }) +
      numberField({ id: ids.n, label: 'Amount', symbol: 'n', unit: 'mol', value: 1 }) +
      numberField({ id: ids.T, label: 'Temperature', symbol: 'T', unit: 'K', value: 273.15 }) +
      '<p id="gas-error" class="el-field__msg el-field__msg--error" hidden>' +
      icon('alert') + '<span></span></p>';
    const visual = '<canvas id="gas-canvas" class="el-gas-canvas" role="img" ' +
      'aria-label="Gas particle simulation"></canvas>' +
      '<p class="el-visual-note" id="gas-caption">0 particles · speed ∝ √T</p>';
    const tile = resultTile({ id: 'gas-result', label: 'Solved: Volume V', symbol: 'V',
      formula: formulas.V, unit: 'm³' });
    pageMarkup(root, discipline, fields, tile, visual, cases, 'Particle model', 'el-tool-results--single');
    const canvas = root.querySelector('#gas-canvas');
    const context = canvas.getContext('2d');
    let particles = [];
    let raf = null;
    let last = 0;
    let alive = true;
    let colors = {};
    let observer = null;
    let currentTemperature = 300;
    function vals() {
      return {
        P: inputValue(root, ids.P),
        V: inputValue(root, ids.V),
        n: inputValue(root, ids.n),
        T: inputValue(root, ids.T)
      };
    }
    function readColors() {
      const styles = getComputedStyle(document.documentElement);
      colors = {
        particle: styles.getPropertyValue('--primary-text').trim(),
        outline: styles.getPropertyValue('--border-strong').trim(),
        surface: styles.getPropertyValue('--surface').trim()
      };
    }
    function draw() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);
      context.fillStyle = colors.surface;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = colors.outline;
      context.strokeRect(0.5, 0.5, width - 1, height - 1);
      context.fillStyle = colors.particle;
      particles.forEach((particle) => {
        context.beginPath();
        context.arc(particle.x * width, particle.y * height, particle.radius, 0, Math.PI * 2);
        context.fill();
      });
    }
    function resize() {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw();
    }
    function count(particleCount) {
      // Show at least six particles, then add about 24 per mole up to a readable canvas limit.
      particleCount = Math.max(6, Math.min(160, particleCount));
      particles = particles.slice(0, particleCount);
      while (particles.length < particleCount) {
        // New particles start with randomized direction and position to avoid a rigid lattice.
        particles.push({
          x: Math.random(), y: Math.random(), vx: Math.random() - 0.5,
          vy: Math.random() - 0.5, radius: 2.5 + Math.random() * 1.5
        });
      }
    }
    function paint() {
      const values = vals();
      const emptyFields = ['P', 'V', 'n', 'T'].filter((key) => values[key] === null);
      const result = idealGas(values);
      ['P', 'V', 'n', 'T'].forEach((key) => {
        const field = root.querySelector('[data-field="' + ids[key] + '"]');
        const input = field.querySelector('input');
        const inputBox = field.querySelector('.el-input');
        const isMissing = emptyFields.length === 1 && emptyFields[0] === key;
        input.placeholder = isMissing ? 'solving…' : '';
        inputBox.classList.toggle('is-solving', isMissing);
        fieldError(root, ids[key], '');
      });
      root.querySelectorAll('[data-solve]').forEach((button) => {
        button.setAttribute('aria-pressed', String(
          emptyFields.length === 1 && emptyFields[0] === button.dataset.solve
        ));
      });

      const errorElement = root.querySelector('#gas-error');
      errorElement.hidden = !result.error;
      errorElement.querySelector('span').textContent = result.error || '';
      if (result.error) {
        if (result.field) {
          fieldError(root, ids[result.field], result.error);
        } else {
          (emptyFields.length ? emptyFields : ['P']).forEach((key) => {
            const input = root.querySelector('#' + ids[key]);
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', 'gas-error');
          });
        }
        root.querySelector('#gas-result .el-label').textContent = 'Solved: —';
        root.querySelector('#gas-result .el-tag').textContent = 'PV = nRT';
        updateTile(root, 'gas-result', null);
        status(root, 'Check inputs', false);
      } else {
        const solvedKey = result.solved;
        root.querySelector('#gas-result .el-label').textContent =
          'Solved: ' + labels[solvedKey] + ' ' + solvedKey;
        root.querySelector('#gas-result .el-tag').textContent = formulas[solvedKey];
        root.querySelector('#gas-result .el-result__sym').textContent = solvedKey + ' =';
        let detail = '';
        if (solvedKey === 'P') {
          detail = formatNumber(result.value / 1000, 6) + ' kPa · ' +
            formatNumber(result.value / 101325, 6) + ' atm · ' +
            formatNumber(result.value / 100000, 6) + ' bar';
        }
        if (solvedKey === 'V') detail = formatNumber(result.value * 1000, 6) + ' L';
        if (solvedKey === 'n') detail = formatNumber(result.value * 1000, 6) + ' mmol';
        if (solvedKey === 'T') detail = formatNumber(result.value - 273.15, 6) + ' °C';
        updateTile(root, 'gas-result', formatNumber(result.value, 6), units[solvedKey], detail);
        status(root, 'Solved for ' + solvedKey, true);
      }

      let amount = values.n;
      if (result.solved === 'n') amount = result.value;
      currentTemperature = result.solved === 'T' ? result.value : values.T;
      currentTemperature = Number.isFinite(currentTemperature) && currentTemperature > 0
        ? currentTemperature
        : 300;
      // The model uses roughly 24 particles per mole, with a six-particle minimum and a 160 cap.
      const particleCount = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 24) : 6;
      count(particleCount);
      root.querySelector('#gas-caption').textContent = particles.length + ' particles · speed ∝ √T';
      canvas.setAttribute('aria-label', particles.length + ' gas particles at ' +
        formatNumber(currentTemperature) + ' kelvin');
      if (prefersReducedMotion()) draw();
    }
    function frame(time) {
      if (!alive || document.hidden) return;
      const deltaTime = last ? Math.min(0.05, (time - last) / 1000) : 0;
      last = time;
      // Particle speed follows the square root of kelvin temperature, matching kinetic theory.
      const speed = Math.sqrt(currentTemperature / 300) * 0.12;
      particles.forEach((particle) => {
        particle.x += particle.vx * speed * deltaTime;
        particle.y += particle.vy * speed * deltaTime;
        if (particle.x < 0.02 || particle.x > 0.98) particle.vx *= -1;
        if (particle.y < 0.04 || particle.y > 0.96) particle.vy *= -1;
        particle.x = Math.max(0.02, Math.min(0.98, particle.x));
        particle.y = Math.max(0.04, Math.min(0.96, particle.y));
      });
      draw();
      raf = requestAnimationFrame(frame);
    }
    const theme = () => {
      readColors();
      draw();
    };
    const visibility = () => {
      if (document.hidden) {
        if (raf != null) cancelAnimationFrame(raf);
        raf = null;
        last = 0;
      } else if (!prefersReducedMotion() && raf == null) {
        raf = requestAnimationFrame(frame);
      }
    };
    root.querySelectorAll('#gas-p,#gas-v,#gas-n,#gas-t').forEach((input) => {
      input.addEventListener('input', paint);
    });
    root.querySelectorAll('[data-solve]').forEach((button) => {
      button.addEventListener('click', () => {
        const previous = idealGas(vals());
        if (previous.solved && previous.solved !== button.dataset.solve && Number.isFinite(previous.value)) {
          setInput(root, ids[previous.solved], Number(previous.value.toPrecision(6)));
        }
        setInput(root, ids[button.dataset.solve], '');
        paint();
      });
    });
    root.querySelector('[data-reset]').addEventListener('click', () => {
      setInput(root, ids.P, 101325);
      setInput(root, ids.V, '');
      setInput(root, ids.n, 1);
      setInput(root, ids.T, 273.15);
      paint();
    });

    readColors();
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }
    document.addEventListener('englab:themechange', theme);
    document.addEventListener('visibilitychange', visibility);
    resize();
    function run(input, key, expectedValue, decimals) {
      Object.keys(input).forEach((fieldKey) => setInput(root, ids[fieldKey], input[fieldKey]));
      paint();
      const result = idealGas(input);
      return {
        pass: result.solved === key && near(result.value, expectedValue, decimals),
        got: formatNumber(result.value, 6) + ' ' + units[key]
      };
    }
    paint();
    if (!prefersReducedMotion()) raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      if (raf != null) cancelAnimationFrame(raf);
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener('resize', resize);
      }
      document.removeEventListener('englab:themechange', theme);
      document.removeEventListener('visibilitychange', visibility);
    };
  }

  function categoryOf(unit) {
    return Object.keys(UNIT_TABLE).find((category) =>
      Object.prototype.hasOwnProperty.call(UNIT_TABLE[category], unit));
  }
  function renderConverter(root, discipline) {
    const categories = ['Length', 'Mass', 'Pressure', 'Energy', 'Temperature'];
    const cases = [
      {
        label: '1 km → mi',
        expected: '0.621371 mi',
        run() { return run('Length', 1, 'km', 'mi', 0.621371); }
      },
      {
        label: '100 °C → °F',
        expected: '212 °F',
        run() { return run('Temperature', 100, '°C', '°F', 212); }
      },
      {
        label: '1 atm → psi',
        expected: '14.6959 psi',
        run() { return run('Pressure', 1, 'atm', 'psi', 14.6959); }
      }
    ];
    const categoryButtons = categories.map((category, index) =>
      '<button type="button" class="el-pill" data-cat="' + category + '" aria-pressed="' +
      (index === 0) + '">' + category + '</button>').join('');
    root.innerHTML = toolHead(discipline) +
      '<div class="el-converter-layout"><div>' +
      '<section class="el-card el-marks"><div class="el-card__head">' +
      '<span class="el-label">Category</span></div>' +
      '<div class="el-pills el-category-pills" role="group" aria-label="Unit category">' +
      categoryButtons + '</div><div class="el-converter-flow">' +
      '<div class="el-converter-row"><div class="el-field">' +
      '<label class="el-label" for="conv-value">Value</label>' +
      '<div class="el-input"><input id="conv-value" type="number" step="any" ' +
      'inputmode="decimal" value="1"></div></div>' +
      '<div class="el-field"><label class="el-label" for="conv-from">From unit</label>' +
      '<div class="el-select-wrap"><select id="conv-from" aria-label="From unit"></select></div></div>' +
      '</div><button class="el-iconbtn el-swap" type="button" aria-label="Swap units">' +
      icon('all') + '</button>' +
      '<div class="el-converter-row"><div class="el-converter-output">' +
      '<span class="el-label">Result</span><output id="conv-result" aria-live="polite">—</output>' +
      '</div><div class="el-field"><label class="el-label" for="conv-to">To unit</label>' +
      '<div class="el-select-wrap"><select id="conv-to" aria-label="To unit"></select></div></div>' +
      '</div><p id="conv-formula" class="el-converter-formula"></p></div></section>' +
      testCard({ title: 'Test cases', cases }) + '</div>' +
      '<section class="el-card el-marks el-history"><div class="el-card__head">' +
      '<span class="el-label">Recent conversions</span>' +
      '<button type="button" class="el-btn el-btn--ghost el-btn--sm" data-clear>' +
      icon('trash') + 'Clear</button></div><div id="history"></div></section></div>';

    const valueInput = root.querySelector('#conv-value');
    const fromSelect = root.querySelector('#conv-from');
    const toSelect = root.querySelector('#conv-to');
    let category = 'Length';
    let timer = null;
    let restoring = false;

    function setCategory(nextCategory, fromUnit, toUnit) {
      category = nextCategory;
      root.querySelectorAll('[data-cat]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.cat === category));
      });
      const options = (selectedUnit) => Object.keys(UNIT_TABLE[category]).map((unit) =>
        '<option value="' + escapeHtml(unit) + '"' +
        (unit === selectedUnit ? ' selected' : '') + '>' + escapeHtml(unit) + '</option>').join('');
      fromSelect.innerHTML = options(fromUnit);
      toSelect.innerHTML = options(toUnit);
    }

    function readHistory() {
      try {
        const stored = JSON.parse(storeGet('englab.history') || '[]');
        if (!Array.isArray(stored)) return [];
        return stored.filter((item) => item && categories.includes(item.category) &&
          Number.isFinite(Number(item.value)) && Number.isFinite(Number(item.time)) &&
          categoryOf(item.from) === item.category && categoryOf(item.to) === item.category).slice(0, 10);
      } catch (error) {
        return [];
      }
    }

    let history = readHistory();
    function saveHistory() {
      storeSet('englab.history', JSON.stringify(history.slice(0, 10)));
    }
    function displayHistoryItem(item) {
      const converted = convertUnit(item.value, item.from, item.to);
      return formatNumber(item.value, 6) + ' ' + item.from + ' = ' +
        formatNumber(converted, 6) + ' ' + item.to;
    }
    function dateText(timestamp) {
      const date = new Date(timestamp);
      const today = new Date();
      return date.toDateString() === today.toDateString()
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    function showHistory() {
      const historyBox = root.querySelector('#history');
      if (!history.length) {
        historyBox.innerHTML = '<p class="el-history-empty">No conversions yet. Your last 10 will show up here.</p>';
        return;
      }
      const rows = history.map((item, index) =>
        '<button type="button" class="el-history-row" data-history="' + index + '">' +
        '<span class="el-history-row__main">' + escapeHtml(displayHistoryItem(item)) + '</span>' +
        '<span class="el-history-row__meta">' + escapeHtml(item.category) + ' · ' +
        escapeHtml(dateText(item.time)) + '</span></button>').join('');
      historyBox.innerHTML = '<div class="el-history-list">' + rows + '</div>';
      historyBox.querySelectorAll('[data-history]').forEach((button) => {
        button.addEventListener('click', () => {
          const item = history[Number(button.dataset.history)];
          restoring = true;
          setCategory(item.category, item.from, item.to);
          valueInput.value = item.value;
          restoring = false;
          compute(false);
        });
      });
    }
    function addHistoryItem() {
      if (restoring || valueInput.value === '' || !Number.isFinite(Number(valueInput.value))) return;
      const item = {
        category,
        value: Number(valueInput.value),
        from: fromSelect.value,
        to: toSelect.value,
        time: Date.now()
      };
      // Remove a matching entry before adding it at the front, keeping history free of duplicates.
      const duplicateIndex = history.findIndex((previous) =>
        previous.category === item.category && Number(previous.value) === item.value &&
        previous.from === item.from && previous.to === item.to);
      if (duplicateIndex >= 0) history.splice(duplicateIndex, 1);
      history.unshift(item);
      history = history.slice(0, 10);
      saveHistory();
      showHistory();
    }
    function compute(debounce = true) {
      const inputValue = valueInput.value === '' ? NaN : Number(valueInput.value);
      const convertedValue = convertUnit(inputValue, fromSelect.value, toSelect.value);
      root.querySelector('#conv-result').textContent = Number.isFinite(convertedValue)
        ? formatNumber(convertedValue, 6)
        : '—';
      const formula = category === 'Temperature'
        ? formatNumber(inputValue, 6) + ' ' + fromSelect.value + ' = ' +
          formatNumber(convertedValue, 6) + ' ' + toSelect.value
        : '1 ' + fromSelect.value + ' = ' +
          formatNumber(convertUnit(1, fromSelect.value, toSelect.value), 6) + ' ' + toSelect.value;
      root.querySelector('#conv-formula').textContent = Number.isFinite(convertedValue) ? formula : '';
      if (timer != null) clearTimeout(timer);
      // Debounce history writes so typing produces one entry after a one-second pause.
      if (debounce && Number.isFinite(convertedValue)) timer = setTimeout(addHistoryItem, 1000);
    }

    setCategory('Length', 'km', 'mi');
    showHistory();
    compute(false);
    root.querySelectorAll('[data-cat]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextCategory = button.dataset.cat;
        const units = Object.keys(UNIT_TABLE[nextCategory]);
        setCategory(nextCategory, units[0], units[1] || units[0]);
        compute();
      });
    });
    valueInput.addEventListener('input', () => compute());
    fromSelect.addEventListener('change', () => compute());
    toSelect.addEventListener('change', () => compute());
    root.querySelector('.el-swap').addEventListener('click', () => {
      const oldFrom = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = oldFrom;
      compute();
    });
    root.querySelector('[data-clear]').addEventListener('click', () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      history = [];
      saveHistory();
      showHistory();
    });
    function run(nextCategory, input, fromUnit, toUnit, expected) {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      restoring = true;
      setCategory(nextCategory, fromUnit, toUnit);
      valueInput.value = input;
      restoring = false;
      compute(false);
      const convertedValue = convertUnit(input, fromUnit, toUnit);
      const decimals = (String(expected).split('.')[1] || '').length;
      return {
        pass: near(convertedValue, expected, decimals),
        got: formatNumber(convertedValue, 6) + ' ' + toUnit
      };
    }
    wireTests(root, cases);
    return () => {
      if (timer != null) clearTimeout(timer);
    };
  }
  function renderSchedulerLab(container, discipline) {
    const state = {
      processes: EXAMPLE_PROCESSES.map((process) => ({
        name: String(process.name),
        arrival: String(process.arrival),
        burst: String(process.burst),
        priority: String(process.priority)
      })),
      algo: 'rr',
      quantum: 3,
      tab: 'cpu',
      hasRenderedCpu: false,
      pageText: '7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1',
      pageAlgo: 'lru',
      frames: 3,
      hasRenderedPages: false
    };
    let activePanelCleanup = null;

    const tabs = '<div class="el-seg scheduler-tabs" role="tablist" aria-label="OS Scheduler Lab tabs">' +
      '<button type="button" class="el-seg__btn" role="tab" id="scheduler-tab-cpu" ' +
      'aria-controls="scheduler-panel" aria-selected="true" tabindex="0">CPU scheduling</button>' +
      '<button type="button" class="el-seg__btn" role="tab" id="scheduler-tab-pages" ' +
      'aria-controls="scheduler-panel" aria-selected="false" tabindex="-1">Page replacement</button>' +
      '</div>';
    container.innerHTML = toolHead(discipline, tabs) +
      '<div class="scheduler-panel" id="scheduler-panel" role="tabpanel" ' +
      'aria-labelledby="scheduler-tab-cpu" tabindex="0"></div>';
    container.querySelector('.el-toolhead__right').classList.add('scheduler-toolhead-right');
    let panel = container.querySelector('#scheduler-panel');
    const tabButtons = Array.from(container.querySelectorAll('[role="tab"]'));

    function showTab(tabName, focusTab) {
      if (typeof activePanelCleanup === 'function') activePanelCleanup();
      activePanelCleanup = null;
      state.tab = tabName;
      tabButtons.forEach((button) => {
        const selected = button.id === (tabName === 'cpu' ? 'scheduler-tab-cpu' : 'scheduler-tab-pages');
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        if (selected && focusTab) button.focus();
      });
      const nextPanel = document.createElement('div');
      nextPanel.className = 'scheduler-panel';
      nextPanel.id = 'scheduler-panel';
      nextPanel.setAttribute('role', 'tabpanel');
      nextPanel.setAttribute('tabindex', '0');
      nextPanel.setAttribute('aria-labelledby', tabName === 'cpu' ? 'scheduler-tab-cpu' : 'scheduler-tab-pages');
      panel.replaceWith(nextPanel);
      panel = nextPanel;
      activePanelCleanup = tabName === 'cpu'
        ? renderCpuScheduling(panel, state)
        : renderPageReplacement(panel, state);
    }

    function onTabClick(event) {
      const button = event.target.closest('[role="tab"]');
      if (!button) return;
      showTab(button.id === 'scheduler-tab-cpu' ? 'cpu' : 'pages', false);
    }

    function onTabKeydown(event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const currentIndex = tabButtons.indexOf(event.target);
      if (currentIndex < 0) return;
      event.preventDefault();
      const nextIndex = (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length;
      showTab(nextIndex === 0 ? 'cpu' : 'pages', true);
    }

    container.addEventListener('click', onTabClick);
    container.addEventListener('keydown', onTabKeydown);
    showTab('cpu', false);
    return () => {
      if (typeof activePanelCleanup === 'function') activePanelCleanup();
      container.removeEventListener('click', onTabClick);
      container.removeEventListener('keydown', onTabKeydown);
    };
  }

  function renderPageReplacement(panel, state) {
    const classic = '7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1';
    const belady = '1 2 3 4 1 2 5 1 2 3 4 5';
    const algorithms = [
      { id: 'fifo', name: 'FIFO', tone: 'muted', shape: 'square' },
      { id: 'lru', name: 'LRU', tone: 'primary', shape: 'circle' },
      { id: 'opt', name: 'Optimal', tone: 'success', shape: 'triangle' }
    ];
    const cases = [
      { label: 'Classic string, 3 frames', expected: 'FIFO 15, LRU 12, Optimal 9 faults' },
      { label: 'Belady’s anomaly, FIFO', expected: '9 faults with 3 frames, 10 with 4' }
    ];
    const statMarkup = (key, label, extraClass, mark, unit) =>
      '<div class="el-stat ' + extraClass + '"><span class="el-label">' + label +
      (mark || '') + '</span><span class="el-stat__value"><span data-page-stat="' + key +
      '">—</span>' + (unit ? '<span class="el-stat__unit">' + unit + '</span>' : '') +
      '</span></div>';
    panel.innerHTML = '<div class="el-grid page-stack">' +
      '<section class="el-card el-marks page-input-card"><div class="el-field">' +
      '<div class="el-field__label"><label class="el-label" for="page-refs">Reference string</label></div>' +
      '<div class="el-input el-input--wide-unit"><input id="page-refs" type="text" inputmode="numeric" ' +
      'autocomplete="off" spellcheck="false" value="' + escapeHtml(state.pageText) + '" ' +
      'aria-describedby="page-refs-error" data-page-refs><span class="el-input__unit" ' +
      'data-ref-count>20 refs</span></div><p class="el-field__msg el-field__msg--error page-error" ' +
      'id="page-refs-error" role="alert" hidden></p></div><div class="el-toolbar page-toolbar">' +
      '<div class="el-pills" role="group" aria-label="Page replacement algorithm">' +
      algorithms.map((algorithm) => '<button type="button" class="el-pill" data-page-algorithm="' +
        algorithm.id + '" aria-pressed="' + (state.pageAlgo === algorithm.id) + '">' +
        algorithm.name + '</button>').join('') + '</div>' +
      '<span class="el-stepper-field"><span class="el-label">Frames</span>' +
      '<span class="el-stepper"><button type="button" data-frame-step="-1" aria-label="Decrease frames">' +
      icon('minus') + '</button><span class="el-stepper__val" aria-live="polite" data-frame-count>' +
      state.frames + '</span><button type="button" data-frame-step="1" aria-label="Increase frames">' +
      icon('plus') + '</button></span></span></div></section>' +
      '<section class="el-card el-marks page-frame-card"><div class="el-card__head page-frame-head">' +
      '<span class="el-label" data-frame-title></span><div class="page-legend">' +
      '<span><i class="el-ptc el-ptc--loaded" aria-hidden="true"></i>page loaded</span>' +
      '<span><i class="el-ptc el-ptc--hit" aria-hidden="true"></i>page found</span>' +
      '<span><i class="el-mark el-mark--f el-mark--sm" aria-hidden="true">F</i>fault</span>' +
      '<span><i class="el-mark el-mark--h el-mark--sm" aria-hidden="true">H</i>hit</span></div></div>' +
      '<div class="page-table-host"></div></section>' +
      '<div class="el-stats page-stats">' +
      statMarkup('faults', 'Page faults', 'el-stat--fault', '<span class="el-mark el-mark--f el-mark--sm">F</span>') +
      statMarkup('hits', 'Hits', 'el-stat--hit', '<span class="el-mark el-mark--h el-mark--sm">H</span>') +
      statMarkup('ratio', 'Hit ratio', '', '', '%') +
      statMarkup('references', 'References', '', '') + '</div>' +
      '<div class="el-grid page-analysis"><div class="el-grid page-analysis-left">' +
      '<section class="el-card el-marks"><div class="el-card__head"><span class="el-label" data-compare-title>' +
      '</span><span class="el-label">Faults</span></div><div class="page-comparison"></div></section>' +
      '<div class="page-anomaly-host"></div></div><section class="el-card el-marks page-chart-card">' +
      '<div class="el-card__head"><span class="el-label">Faults vs frames</span>' +
      '<span class="el-label">1 – 7 frames</span></div><div class="page-chart-legend"></div>' +
      '<div class="page-chart-host"></div></section></div>' +
      testCard({ title: 'Test cases', cases }) + '</div>';

    const refInput = panel.querySelector('[data-page-refs]');
    const tableHost = panel.querySelector('.page-table-host');
    const comparisonHost = panel.querySelector('.page-comparison');
    const anomalyHost = panel.querySelector('.page-anomaly-host');
    const chartHost = panel.querySelector('.page-chart-host');
    const testDefinitions = [
      { label: cases[0].label, expected: cases[0].expected },
      { label: cases[1].label, expected: cases[1].expected }
    ];

    function countsFor(refs, frameCount) {
      return algorithms.map((algorithm) => ({
        algorithm,
        result: pageReplacement(algorithm.id, refs, frameCount)
      }));
    }

    function findAnomaly(refs) {
      for (let frameCount = 1; frameCount < 7; frameCount += 1) {
        const smaller = pageReplacement('fifo', refs, frameCount).faults;
        const larger = pageReplacement('fifo', refs, frameCount + 1).faults;
        if (larger > smaller) return { smaller, larger, frameCount };
      }
      return null;
    }

    function frameTableMarkup(result, refs, animate) {
      const columnHeader = refs.map((ref, index) => '<span class="el-frames__ref" role="columnheader">' +
        escapeHtml(ref) + '</span>').join('');
      let rows = '<div class="el-frames__row" role="row"><span class="el-frames__lab" ' +
        'role="rowheader">REF</span>' + columnHeader + '</div>';
      for (let frame = 0; frame < state.frames; frame += 1) {
        const cells = result.steps.map((step, index) => {
          const page = step.slots[frame];
          const empty = page == null;
          const loaded = step.loadSlot === frame;
          const hit = step.hitSlot === frame;
          const victim = loaded && step.replaced != null;
          const classes = ['el-ptc', empty ? 'el-ptc--empty' : '', loaded ? 'el-ptc--loaded' : '',
            hit ? 'el-ptc--hit' : '', victim ? 'el-ptc--victim' : '', animate ? 'page-cell-animate' : '']
            .filter(Boolean).join(' ');
          const action = empty ? 'empty' : loaded ? 'page ' + page + ' loaded' :
            hit ? 'page ' + page + ' found' : 'page ' + page;
          const description = 'step ' + (index + 1) + ', frame ' + (frame + 1) + ': ' + action +
            (victim ? ', replaced page ' + step.replaced : '');
          const tooltip = victim ? ' data-tip="replaced page ' + escapeHtml(step.replaced) + '"' : '';
          const title = victim ? ' title="replaced page ' + escapeHtml(step.replaced) + '"' : '';
          const focusable = victim ? ' tabindex="0"' : '';
          return '<span class="' + classes + '" role="cell" aria-label="' + escapeHtml(description) + '"' +
            tooltip + title + focusable + ' style="--cell-delay:' + (index * 22) + 'ms">' +
            (empty ? '·' : page) + '</span>';
        }).join('');
        rows += '<div class="el-frames__row" role="row"><span class="el-frames__lab" ' +
          'role="rowheader">F' + (frame + 1) + '</span>' + cells + '</div>';
      }
      const marks = result.steps.map((step, index) => '<span class="el-mark el-mark--' +
        (step.hit ? 'h' : 'f') + '" role="cell" aria-label="step ' + (index + 1) + ': ' +
        (step.hit ? 'hit' : 'fault') + '">' + (step.hit ? 'H' : 'F') + '</span>').join('');
      rows += '<div class="el-frames__row" role="row"><span class="el-frames__lab" ' +
        'role="rowheader">MARK</span>' + marks + '</div>';
      return '<div class="page-table-scroll" tabindex="0" role="group" ' +
        'aria-label="Scrollable page frame table"><div class="el-frames" role="table" aria-label="Page frame table">' +
        rows + '</div></div>';
    }

    function chartMarkup(series, anomaly, animate) {
      const width = 560;
      const height = 290;
      const left = 48;
      const right = 84;
      const top = 22;
      const bottom = 54;
      const maxFaults = Math.max.apply(null, series.map((entry) => Math.max.apply(null, entry.values)));
      const roughStep = Math.max(1, maxFaults / 5);
      const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
      const normalized = roughStep / magnitude;
      const stepSize = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
      const yMax = Math.max(stepSize, Math.ceil(maxFaults / stepSize) * stepSize);
      const x = (frames) => left + (frames - 1) / 6 * (width - left - right);
      const y = (faults) => top + (1 - faults / yMax) * (height - top - bottom);
      let svg = '<svg class="el-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" ' +
        'aria-label="Page faults at ' + state.frames + ' frames: ' +
        series.map((entry) => entry.name + ' ' + entry.values[state.frames - 1]).join(', ') + '">';
      for (let tick = 0; tick <= yMax; tick += stepSize) {
        svg += '<line class="grid" x1="' + left + '" x2="' + (width - right) + '" y1="' + y(tick) +
          '" y2="' + y(tick) + '"/><text class="tick" x="' + (left - 8) + '" y="' +
          (y(tick) + 4) + '" text-anchor="end">' + tick + '</text>';
      }
      for (let frame = 1; frame <= 7; frame += 1) {
        svg += '<text class="tick" x="' + x(frame) + '" y="' + (height - bottom + 18) +
          '" text-anchor="middle">' + frame + '</text>';
      }
      svg += '<line class="axis" x1="' + left + '" x2="' + (width - right) + '" y1="' + y(0) +
        '" y2="' + y(0) + '"/><line class="page-current-line" x1="' + x(state.frames) +
        '" x2="' + x(state.frames) + '" y1="' + top + '" y2="' + (height - bottom) + '"/>' +
        '<text class="page-current-label" x="' + x(state.frames) + '" y="' + (top - 7) +
        '" text-anchor="middle">' + state.frames + ' frames</text>' +
        '<text class="axlab" x="' + ((left + width - right) / 2) + '" y="' + (height - 4) +
        '" text-anchor="middle">FRAMES</text><text class="axlab" x="12" y="' +
        ((top + height - bottom) / 2) + '" text-anchor="middle" transform="rotate(-90 12 ' +
        ((top + height - bottom) / 2) + ')">PAGE FAULTS</text>';
      const endLabels = [];
      series.forEach((entry) => {
        const points = entry.values.map((faults, index) => (index ? 'L' : 'M') +
          x(index + 1) + ' ' + y(faults)).join(' ');
        svg += '<path class="s-' + entry.tone + (entry.dash ? ' page-series-dashed' : '') +
          '" d="' + points + '" stroke-width="' + (entry.id === 'lru' ? '2.75' : '2') + '"/>';
        entry.values.forEach((faults, index) => {
          const frame = index + 1;
          const cx = x(frame);
          const cy = y(faults);
          const anomalous = entry.id === 'fifo' && anomaly && frame === anomaly.frameCount + 1;
          const markerClass = anomalous ? ' marker-anom' : '';
          const title = anomalous ? '<title>Belady’s anomaly: FIFO faults increase with ' +
            frame + ' frames</title>' : '';
          if (entry.shape === 'square') {
            svg += '<rect class="m-' + entry.tone + markerClass + '" x="' + (cx - 4) + '" y="' +
              (cy - 4) + '" width="8" height="8" stroke-width="1.5">' + title + '</rect>';
          } else if (entry.shape === 'triangle') {
            svg += '<path class="m-' + entry.tone + markerClass + '" d="M' + cx + ' ' +
              (cy - 5) + 'L' + (cx + 5) + ' ' + (cy + 4) + 'L' + (cx - 5) + ' ' + (cy + 4) +
              'Z" stroke-width="1.5">' + title + '</path>';
          } else {
            svg += '<circle class="m-' + entry.tone + markerClass + '" cx="' + cx + '" cy="' +
              cy + '" r="4" stroke-width="1.75">' + title + '</circle>';
          }
        });
        const endY = y(entry.values[6]);
        let labelY = endY;
        endLabels.forEach((usedY) => {
          if (Math.abs(labelY - usedY) < 15) labelY = usedY + 15;
        });
        endLabels.push(labelY);
        svg += '<text class="lab-' + entry.tone + '" x="' + (x(7) + 9) + '" y="' +
          (labelY + 4) + '">' + entry.name + '</text>';
      });
      svg += '</svg>';
      return svg;
    }

    function updateComparison(refs, animate) {
      const rows = countsFor(refs, state.frames);
      const best = Math.min.apply(null, rows.map((row) => row.result.faults));
      const maximum = Math.max.apply(null, rows.map((row) => row.result.faults));
      panel.querySelector('[data-compare-title]').textContent = 'Same string, ' + state.frames + ' frames';
      comparisonHost.innerHTML = '<div class="el-bars">' + rows.map((row) => {
        const current = row.algorithm.id === state.pageAlgo;
        const isBest = row.result.faults === best;
        return comparisonRowMarkup({
          className: 'page-comparison-row' + (animate ? ' page-bar-animate' : ''),
          attribute: 'page-compare',
          id: row.algorithm.id,
          label: row.algorithm.name,
          value: row.result.faults,
          max: maximum,
          best: isBest,
          current
        });
      }).join('') + '</div>';
    }

    function updateView(animate) {
      const parsed = parseReferenceString(state.pageText);
      if (refInput.value !== state.pageText) refInput.value = state.pageText;
      panel.querySelector('[data-ref-count]').textContent = parsed.error ? '— refs' : parsed.refs.length + ' refs';
      const errorLine = panel.querySelector('.page-error');
      errorLine.hidden = !parsed.error;
      errorLine.innerHTML = parsed.error ? icon('alert') + '<span>' + escapeHtml(parsed.error) + '</span>' : '';
      panel.querySelectorAll('[data-page-algorithm]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.pageAlgorithm === state.pageAlgo));
      });
      panel.querySelector('[data-frame-count]').textContent = String(state.frames);
      panel.querySelector('[data-frame-step="-1"]').disabled = state.frames <= 1;
      panel.querySelector('[data-frame-step="1"]').disabled = state.frames >= 7;
      const valid = !parsed.error;
      if (!valid) {
        tableHost.innerHTML = '<p class="scheduler-empty">Enter a valid reference string to see the frame table.</p>';
        ['faults', 'hits', 'ratio', 'references'].forEach((key) => {
          setValue(panel.querySelector('[data-page-stat="' + key + '"]'), '—');
        });
        comparisonHost.innerHTML = '<p class="scheduler-empty">' +
          'Enter a valid reference string to compare algorithms.</p>';
        anomalyHost.innerHTML = '';
        chartHost.innerHTML = '<p class="scheduler-empty">Enter a valid reference string to chart faults.</p>';
        panel.querySelector('.page-chart-legend').innerHTML = '';
        return;
      }
      const result = pageReplacement(state.pageAlgo, parsed.refs, state.frames);
      const algoName = algorithms.find((algorithm) => algorithm.id === state.pageAlgo).name;
      panel.querySelector('[data-frame-title]').textContent = 'Frame table · ' + algoName +
        ', ' + state.frames + ' frames';
      tableHost.innerHTML = frameTableMarkup(result, parsed.refs, animate && !prefersReducedMotion());
      const summary = {
        faults: String(result.faults),
        hits: String(result.hits),
        ratio: (result.hits / parsed.refs.length * 100).toFixed(0),
        references: String(parsed.refs.length)
      };
      Object.keys(summary).forEach((key) => {
        setValue(panel.querySelector('[data-page-stat="' + key + '"]'), summary[key]);
      });
      updateComparison(parsed.refs, animate && !prefersReducedMotion());
      const anomaly = findAnomaly(parsed.refs);
      anomalyHost.innerHTML = anomaly
        ? '<div class="el-callout" role="note"><span class="el-callout__icon">' + icon('warn') +
          '</span><div><p class="el-callout__title">Belady’s anomaly</p><p>FIFO has ' +
          anomaly.larger + ' faults with ' + (anomaly.frameCount + 1) + ' frames but only ' +
          anomaly.smaller + ' with ' + anomaly.frameCount +
          '. More memory is not always fewer faults.</p></div></div>' : '';
      const series = algorithms.map((algorithm) => ({
        id: algorithm.id,
        name: algorithm.name,
        tone: algorithm.tone,
        shape: algorithm.shape,
        dash: algorithm.id === 'fifo',
        values: Array.from({ length: 7 }, (unused, index) =>
          pageReplacement(algorithm.id, parsed.refs, index + 1).faults)
      }));
      panel.querySelector('.page-chart-legend').innerHTML = series.map((entry) =>
        '<span class="page-chart-key page-chart-key--' + entry.id + '"><i aria-hidden="true">' +
        (entry.shape === 'square' ? '■' : entry.shape === 'triangle' ? '▲' : '●') +
        '</i>' + entry.name + '</span>').join('');
      chartHost.innerHTML = chartMarkup(series, anomaly, animate);
      const scrollWrapper = tableHost.querySelector('.page-table-scroll');
      if (scrollWrapper.scrollWidth <= scrollWrapper.clientWidth) scrollWrapper.removeAttribute('tabindex');
    }

    function changeFrames(delta) {
      state.frames = Math.max(1, Math.min(7, state.frames + delta));
      updateView(true);
      announce('Frames ' + state.frames);
    }

    function onInput(event) {
      if (event.target !== refInput) return;
      state.pageText = refInput.value;
      updateView(false);
    }

    function onClick(event) {
      const algorithmButton = event.target.closest('[data-page-algorithm]');
      if (algorithmButton) {
        state.pageAlgo = algorithmButton.dataset.pageAlgorithm;
        updateView(true);
        return;
      }
      const frameButton = event.target.closest('[data-frame-step]');
      if (frameButton && !frameButton.disabled) {
        changeFrames(Number(frameButton.dataset.frameStep));
        return;
      }
      const compareButton = event.target.closest('[data-page-compare]');
      if (compareButton) {
        state.pageAlgo = compareButton.dataset.pageCompare;
        updateView(true);
      }
    }

    panel.addEventListener('input', onInput);
    panel.addEventListener('click', onClick);
    wireTests(panel, [
      {
        label: cases[0].label,
        expected: cases[0].expected,
        run: () => {
          state.pageText = classic;
          state.frames = 3;
          refInput.value = state.pageText;
          updateView(true);
          const refs = parseReferenceString(state.pageText).refs;
          const results = countsFor(refs, 3);
          const pass = results[0].result.faults === 15 && results[1].result.faults === 12 &&
            results[2].result.faults === 9;
          return { pass, got: results.map((row) => row.algorithm.name + ' ' +
            row.result.faults).join(', ') + ' faults' };
        }
      },
      {
        label: cases[1].label,
        expected: cases[1].expected,
        run: () => {
          state.pageText = belady;
          state.pageAlgo = 'fifo';
          state.frames = 3;
          refInput.value = state.pageText;
          updateView(true);
          const refs = parseReferenceString(state.pageText).refs;
          const three = pageReplacement('fifo', refs, 3).faults;
          const four = pageReplacement('fifo', refs, 4).faults;
          return {
            pass: three === 9 && four === 10 && !!anomalyHost.querySelector('.el-callout'),
            got: three + ' faults with 3 frames, ' + four + ' with 4' +
              (anomalyHost.querySelector('.el-callout') ? ', Belady’s anomaly' : '')
          };
        }
      }
    ]);
    updateView(!state.hasRenderedPages);
    state.hasRenderedPages = true;
    return () => {
      panel.removeEventListener('input', onInput);
      panel.removeEventListener('click', onClick);
    };
  }

  function renderCpuScheduling(panel, state) {
    const cases = [
      {
        label: 'FCFS · P1(0,24) P2(0,3) P3(0,3)', expected: 'average waiting 17', decimals: 0,
        algo: 'fcfs', quantum: 3,
        processes: [['P1', 0, 24], ['P2', 0, 3], ['P3', 0, 3]]
      },
      {
        label: 'SJF · P1(0,6) P2(0,8) P3(0,7) P4(0,3)', expected: 'average waiting 7', decimals: 0,
        algo: 'sjf', quantum: 3,
        processes: [['P1', 0, 6], ['P2', 0, 8], ['P3', 0, 7], ['P4', 0, 3]]
      },
      {
        label: 'SRTF · P1(0,8) P2(1,4) P3(2,9) P4(3,5)', expected: 'average waiting 6.5', decimals: 1,
        algo: 'srtf', quantum: 3,
        processes: [['P1', 0, 8], ['P2', 1, 4], ['P3', 2, 9], ['P4', 3, 5]]
      },
      {
        label: 'Priority · P1(0,10,3) P2(0,1,1) P3(0,2,4) P4(0,1,5) P5(0,5,2)',
        expected: 'average waiting 8.2', decimals: 1, algo: 'prio', quantum: 3,
        processes: [['P1', 0, 10, 3], ['P2', 0, 1, 1], ['P3', 0, 2, 4], ['P4', 0, 1, 5], ['P5', 0, 5, 2]]
      },
      {
        label: 'Priority (P) · P1(0,5,3) P2(1,3,1) P3(2,2,2)', expected: 'average waiting 2.33',
        decimals: 2, algo: 'priop', quantum: 3,
        processes: [['P1', 0, 5, 3], ['P2', 1, 3, 1], ['P3', 2, 2, 2]]
      },
      {
        label: 'Round Robin q=4 · P1(0,24) P2(0,3) P3(0,3)', expected: 'average waiting 5.67',
        decimals: 2, algo: 'rr', quantum: 4,
        processes: [['P1', 0, 24], ['P2', 0, 3], ['P3', 0, 3]]
      }
    ];
    const statSpecs = [
      { key: 'avgWT', label: 'Avg waiting', hi: true, hint: 'lower is better' },
      { key: 'avgTAT', label: 'Avg turnaround' },
      { key: 'avgRT', label: 'Avg response' },
      { key: 'utilization', label: 'CPU utilization', unit: '%' },
      { key: 'throughput', label: 'Throughput', unit: '/ unit', decimals: 3 }
    ];
    let lastResult = null;

    function statMarkup(spec) {
      return '<div class="el-stat' + (spec.hi ? ' el-stat--hi' : '') + '">' +
        '<span class="el-label">' + spec.label + '</span>' +
        '<span class="el-stat__value"><span class="scheduler-stat-number" data-stat="' +
        spec.key + '">—</span>' +
        (spec.unit ? '<span class="el-stat__unit">' + spec.unit + '</span>' : '') + '</span>' +
        (spec.hint ? '<span class="el-stat__hint">' + spec.hint + '</span>' : '') + '</div>';
    }

    function rowMarkup(process, index) {
      const name = escapeHtml(process.name);
      const colorClass = 'p' + ((index % 10) + 1);
      return '<tr data-process-row="' + index + '"><td class="scheduler-process-cell">' +
        '<span class="scheduler-dot ' + colorClass + '" aria-hidden="true"></span>' +
        '<input class="el-cellinput el-cellinput--name" type="text" maxlength="8" ' +
        'aria-label="' + name + ' name" value="' + name + '" data-process-field="name"></td>' +
        '<td><input class="el-cellinput" type="number" step="any" aria-label="' + name +
        ' arrival" value="' + escapeHtml(process.arrival) + '" data-process-field="arrival"></td>' +
        '<td><input class="el-cellinput" type="number" step="any" aria-label="' + name +
        ' burst" value="' + escapeHtml(process.burst) + '" data-process-field="burst"></td>' +
        '<td><input class="el-cellinput" type="number" step="any" aria-label="' + name +
        ' priority" value="' + escapeHtml(process.priority) + '" data-process-field="priority"></td>' +
        '<td class="scheduler-delete-cell"><button type="button" class="el-iconbtn el-iconbtn--sm" ' +
        'aria-label="Remove ' + name + '" data-remove-process="' + index + '"' +
        (state.processes.length === 1 ? ' disabled' : '') + '>' + icon('trash') + '</button></td></tr>';
    }

    panel.innerHTML = '<div class="el-grid scheduler-stack">' +
      '<section class="el-card el-marks"><div class="el-toolbar scheduler-toolbar">' +
      '<div class="el-pills" role="group" aria-label="Algorithm">' +
      ALGORITHMS.map((algorithm) => '<button type="button" class="el-pill" data-algorithm="' +
        algorithm.id + '" title="' + escapeHtml(algorithm.title) + '" aria-pressed="' +
        (algorithm.id === state.algo) + '">' + escapeHtml(algorithm.short) + '</button>').join('') +
      '</div><div class="scheduler-stepper"' + (state.algo === 'rr' ? '' : ' hidden') + '>' +
      '<span class="el-stepper-field"><span class="el-label">Time quantum</span>' +
      '<span class="el-stepper"><button type="button" data-quantum="-1" aria-label="Decrease time quantum"' +
      (state.quantum <= 1 ? ' disabled' : '') + '>' + icon('minus') + '</button>' +
      '<span class="el-stepper__val" aria-live="polite" data-quantum-value>' + state.quantum + '</span>' +
      '<button type="button" data-quantum="1" aria-label="Increase time quantum"' +
      (state.quantum >= 20 ? ' disabled' : '') + '>' + icon('plus') + '</button></span></span></div></div>' +
      '<div class="el-card__head scheduler-chart-head"><span class="el-label" data-chart-title></span>' +
      '<span class="el-label scheduler-live"><span class="el-live"></span><span data-chart-time></span></span>' +
      '</div><div class="scheduler-chart-host"></div></section>' +
      '<div class="el-stats scheduler-stats">' + statSpecs.map(statMarkup).join('') + '</div>' +
      '<div class="el-grid scheduler-columns"><section class="el-card el-marks">' +
      '<div class="el-card__head"><span class="el-label">Processes</span>' +
      '<span class="el-tag" data-process-count></span></div>' +
      '<div class="scheduler-table-scroll"><table class="el-table scheduler-input-table">' +
      '<thead><tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Priority</th><th></th></tr></thead>' +
      '<tbody data-process-body></tbody></table></div><p class="scheduler-validation" role="alert" hidden></p>' +
      '<div class="scheduler-actions"><button type="button" class="el-btn el-btn--secondary el-btn--sm" ' +
      'data-action="add">' + icon('plus') + 'Add process</button>' +
      '<button type="button" class="el-btn el-btn--ghost el-btn--sm" data-action="random">' +
      icon('shuffle') + 'Random</button><button type="button" class="el-btn el-btn--ghost el-btn--sm" ' +
      'data-action="example">' + icon('reset') + 'Example</button></div></section>' +
      '<section class="el-card el-marks"><div class="el-card__head">' +
      '<span class="el-label">Every algorithm, same workload</span>' +
      '<span class="el-label">Avg waiting</span></div><div class="scheduler-comparison"></div>' +
      '<p class="el-bars__note scheduler-bars-note"><span aria-hidden="true">★</span> best · ' +
      '<span class="scheduler-current-note">bold</span> = current</p></section></div>' +
      '<section class="el-card el-card--flush scheduler-results"><div class="el-card__head">' +
      '<span class="el-label">Results</span><span class="el-label scheduler-legend">' +
      'CT completion · TAT turnaround · WT waiting · RT response</span></div>' +
      '<div class="scheduler-results-host"></div></section>' + testCard({ title: 'Test cases', cases }) + '</div>';

    const processBody = panel.querySelector('[data-process-body]');
    const chartHost = panel.querySelector('.scheduler-chart-host');
    const comparisonHost = panel.querySelector('.scheduler-comparison');
    const resultsHost = panel.querySelector('.scheduler-results-host');
    const validationLine = panel.querySelector('.scheduler-validation');

    function renderProcessRows() {
      processBody.innerHTML = state.processes.map(rowMarkup).join('');
      panel.querySelector('[data-process-count]').textContent = state.processes.length + ' / 10';
      panel.querySelector('[data-action="add"]').disabled = state.processes.length >= 10;
    }

    function parseWorkload() {
      const names = state.processes.map((process) => process.name.trim());
      const seen = new Set();
      for (const name of names) {
        if (!name || seen.has(name.toLowerCase())) return { error: 'Process names must be unique.' };
        seen.add(name.toLowerCase());
      }
      const parsed = [];
      for (let index = 0; index < state.processes.length; index += 1) {
        const process = state.processes[index];
        const arrival = Number(process.arrival);
        const burst = Number(process.burst);
        const priority = Number(process.priority);
        if (process.arrival.trim() === '' || !Number.isFinite(arrival) || arrival < 0) {
          return { error: 'Arrival must be a number greater than or equal to 0.', index, field: 'arrival' };
        }
        if (process.burst.trim() === '' || !Number.isFinite(burst) || burst <= 0) {
          return { error: 'Burst must be a number greater than 0.', index, field: 'burst' };
        }
        if (process.priority.trim() === '' || !Number.isFinite(priority)) {
          return { error: 'Priority must be a number.', index, field: 'priority' };
        }
        parsed.push({ name: process.name.trim(), arrival, burst, priority });
      }
      return { processes: parsed };
    }

    function updateValidation(validation) {
      processBody.querySelectorAll('input').forEach((input) => input.removeAttribute('aria-invalid'));
      if (validation.index != null) {
        const row = processBody.querySelector('[data-process-row="' + validation.index + '"]');
        const input = row && row.querySelector('[data-process-field="' + validation.field + '"]');
        if (input) input.setAttribute('aria-invalid', 'true');
      } else if (validation.error) {
        processBody.querySelectorAll('[data-process-field="name"]').forEach((input) => {
          input.setAttribute('aria-invalid', 'true');
        });
      }
      validationLine.hidden = !validation.error;
      validationLine.innerHTML = validation.error ? icon('alert') + '<span>' +
        escapeHtml(validation.error) + '</span>' : '';
    }

    function renderChart(result, animate) {
      if (!result || !result.slices.length) {
        chartHost.innerHTML = '<p class="scheduler-empty">Fix the highlighted cells to see the schedule.</p>';
        return;
      }
      const slices = result.slices;
      const start = slices[0].start;
      const end = slices[slices.length - 1].end;
      const span = Math.max(end - start, 1);
      const trackWidth = Math.max(1, (end - start) * 30);
      const labels = slices.map((slice) => (slice.name || 'idle') + ' ' + fmt(slice.start, 3) +
        ' to ' + fmt(slice.end, 3));
      const ariaLabel = escapeHtml('Gantt chart: ' + labels.join(', '));
      const bars = slices.map((slice, index) => {
        const share = (slice.end - slice.start) / span * 100;
        const label = slice.index < 0 ? 'idle' : state.processes[slice.index].name.trim();
        const colorClass = slice.index < 0 ? 'el-gantt__bar--idle' :
          'p' + ((slice.index % 10) + 1);
        const delay = slices.length <= 1 ? 0 : Math.min(90, 900 / (slices.length - 1));
        const trackPixels = Math.max(trackWidth, chartHost.clientWidth);
        const narrow = trackPixels * share / 100 < Math.max(24, label.length * 8 + 8);
        return '<div class="el-gantt__bar ' + colorClass +
          (narrow ? ' scheduler-bar--narrow' : '') +
          (animate && !prefersReducedMotion() ? ' scheduler-bar-animate' : '') + '" style="flex:0 0 calc(' +
          share + '% - 2px);--bar-delay:' + (index * delay) + 'ms" title="' +
          escapeHtml(label + ' · ' + fmt(slice.start, 3) + '–' + fmt(slice.end, 3)) +
          '" aria-hidden="true"><span class="scheduler-bar-label">' +
          escapeHtml(label) + '</span></div>';
      }).join('');
      const times = [start].concat(slices.map((slice) => slice.end));
      const ticks = times.map((value, index) => {
        const position = (value - start) / span * 100;
        const crowded = index > 0 && index < times.length - 1 &&
          (value - times[index - 1]) * 30 < 34;
        return '<span class="el-gantt__tick' + (crowded ? ' scheduler-tick-hidden' : '') +
          '" style="left:' + position + '%">' + fmt(value, 3) + '</span>';
      }).join('');
      chartHost.innerHTML = '<div class="el-gantt-scroll scheduler-gantt-scroll" tabindex="0" ' +
        'role="group" aria-label="Scrollable Gantt chart"><div class="el-gantt scheduler-gantt" ' +
        'role="img" aria-label="' + ariaLabel + '" style="min-width:' + trackWidth + 'px">' +
        '<div class="el-gantt__track">' + bars + '</div>' +
        '<div class="el-gantt__ticks" aria-hidden="true">' + ticks + '</div></div></div>';
      const scrollWrapper = chartHost.querySelector('.scheduler-gantt-scroll');
      if (scrollWrapper.scrollWidth <= scrollWrapper.clientWidth) {
        scrollWrapper.removeAttribute('tabindex');
      }
    }

    function updateChart(options) {
      const result = options.result;
      const title = ALGORITHMS.find((algorithm) => algorithm.id === state.algo);
      panel.querySelector('[data-chart-title]').textContent = 'Gantt chart · ' + title.short +
        (state.algo === 'rr' ? ', q = ' + state.quantum : '');
      panel.querySelector('[data-chart-time]').textContent = result
        ? 't = ' + fmt(result.slices.length ? result.slices[0].start : 0, 3) + ' → ' + fmt(result.end, 3)
        : 'schedule unavailable';
      renderChart(result, options.animate);
    }

    function updateStats(result) {
      statSpecs.forEach((spec) => {
        const element = panel.querySelector('[data-stat="' + spec.key + '"]');
        const value = result
          ? spec.key === 'utilization' ? fmt(result.utilization * 100, 2)
            : spec.key === 'throughput' ? result.throughput.toFixed(3)
              : fmt(result[spec.key], 2)
          : '—';
        setValue(element, value);
      });
    }

    function updateComparison(result) {
      if (!result) {
        comparisonHost.innerHTML = '<p class="scheduler-empty">Fix the highlighted cells to compare algorithms.</p>';
        return;
      }
      const rows = ALGORITHMS.map((algorithm) => ({
        algorithm,
        value: schedule(algorithm.id, result.rows.map((row) => ({
          name: row.name, arrival: row.arrival, burst: row.burst, priority: row.priority
        })), state.quantum).avgWT
      }));
      const minimum = Math.min.apply(null, rows.map((row) => row.value));
      const maximum = Math.max.apply(null, rows.map((row) => row.value));
      const existingRows = Array.from(comparisonHost.querySelectorAll('.scheduler-comparison-row'));
      if (existingRows.length === rows.length) {
        rows.forEach((row, index) => {
          const button = existingRows[index];
          const best = Math.abs(row.value - minimum) <= 1e-8;
          const current = row.algorithm.id === state.algo;
          const label = row.algorithm.id === 'rr' ? 'RR q=' + state.quantum : row.algorithm.short;
          const width = maximum === 0 ? 0 : row.value / maximum * 100;
          button.className = 'el-bars__row scheduler-comparison-row' +
            (best ? ' is-best' : '') + (current ? ' is-current' : '');
          button.toggleAttribute('aria-current', current);
          if (current) button.setAttribute('aria-current', 'true');
          button.dataset.compare = row.algorithm.id;
          button.title = row.algorithm.title;
          button.querySelector('.el-bars__name').innerHTML = escapeHtml(label) +
            (best ? ' <span class="el-bars__star"><span aria-hidden="true">★</span>' +
            '<span class="scheduler-sr-only">best</span></span>' : '');
          button.querySelector('.el-bars__fill').style.width = width + '%';
          button.querySelector('.el-bars__val').textContent = fmt(row.value, 2);
        });
        return;
      }
      comparisonHost.innerHTML = '<div class="el-bars">' + rows.map((row) => {
        const best = Math.abs(row.value - minimum) <= 1e-8;
        const current = row.algorithm.id === state.algo;
        const label = row.algorithm.id === 'rr' ? 'RR q=' + state.quantum : row.algorithm.short;
        return comparisonRowMarkup({
          className: 'scheduler-comparison-row',
          attribute: 'compare',
          id: row.algorithm.id,
          label,
          value: fmt(row.value, 2),
          max: maximum,
          best,
          current,
          title: row.algorithm.title
        });
      }).join('') + '</div>';
    }

    function updateResults(result) {
      if (!result) {
        resultsHost.innerHTML = '<p class="scheduler-empty">Fix the highlighted cells to see results.</p>';
        return;
      }
      const rows = result.rows.map((row, index) => '<tr><td><span class="el-swatch p' +
        ((index % 10) + 1) + '" title="' + escapeHtml(row.name) + '">' + escapeHtml(row.name) +
        '</span></td><td>' + fmt(row.arrival, 2) + '</td><td>' + fmt(row.burst, 2) + '</td><td>' +
        fmt(row.priority, 2) + '</td><td>' + fmt(row.ct, 2) + '</td><td>' + fmt(row.tat, 2) +
        '</td><td class="is-key">' + fmt(row.wt, 2) + '</td><td>' + fmt(row.rt, 2) + '</td></tr>').join('');
      resultsHost.innerHTML = '<div class="scheduler-table-scroll"><table class="el-table scheduler-result-table">' +
        '<thead><tr><th>Process</th><th>AT</th><th>BT</th><th>Pri</th><th>CT</th><th>TAT</th>' +
        '<th>WT</th><th>RT</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr>' +
        '<td>Average</td><td></td><td></td><td></td><td></td><td>' + fmt(result.avgTAT, 2) +
        '</td><td>' + fmt(result.avgWT, 2) + '</td><td>' + fmt(result.avgRT, 2) +
        '</td></tr></tfoot></table></div>';
    }

    function recompute(options) {
      const validation = parseWorkload();
      updateValidation(validation);
      const result = validation.error ? null : schedule(state.algo, validation.processes, state.quantum);
      lastResult = result;
      updateChart({ result, animate: options.animate });
      updateStats(result);
      updateComparison(result);
      updateResults(result);
    }

    function updateInputLabels() {
      processBody.querySelectorAll('[data-process-row]').forEach((row, index) => {
        const process = state.processes[index];
        const safeName = process.name.trim() || 'Process ' + (index + 1);
        row.querySelector('[data-process-field="name"]').setAttribute('aria-label', safeName + ' name');
        row.querySelector('[data-process-field="arrival"]').setAttribute('aria-label', safeName + ' arrival');
        row.querySelector('[data-process-field="burst"]').setAttribute('aria-label', safeName + ' burst');
        row.querySelector('[data-process-field="priority"]').setAttribute('aria-label', safeName + ' priority');
        row.querySelector('[data-remove-process]').setAttribute('aria-label', 'Remove ' + safeName);
      });
    }

    function setAlgorithm(algo) {
      state.algo = algo;
      panel.querySelectorAll('[data-algorithm]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.algorithm === algo));
      });
      panel.querySelector('.scheduler-stepper').hidden = algo !== 'rr';
      recompute({ animate: true });
    }

    function setQuantum(next) {
      state.quantum = Math.max(1, Math.min(20, next));
      panel.querySelector('[data-quantum-value]').textContent = String(state.quantum);
      panel.querySelector('[data-quantum="-1"]').disabled = state.quantum <= 1;
      panel.querySelector('[data-quantum="1"]').disabled = state.quantum >= 20;
      recompute({ animate: true });
      announce('Time quantum ' + state.quantum);
    }

    function addProcess() {
      if (state.processes.length >= 10) return;
      const used = new Set(state.processes.map((process) => process.name.trim().toLowerCase()));
      let nameIndex = 1;
      while (used.has('p' + nameIndex)) nameIndex += 1;
      state.processes.push({ name: 'P' + nameIndex, arrival: '0', burst: '1', priority: '1' });
      renderProcessRows();
      recompute({ animate: true });
    }

    function randomWorkload() {
      const count = 4 + Math.floor(Math.random() * 3);
      state.processes = Array.from({ length: count }, (unused, index) => ({
        name: 'P' + (index + 1),
        arrival: String(index === 0 ? 0 : Math.floor(Math.random() * 9)),
        burst: String(1 + Math.floor(Math.random() * 10)),
        priority: String(1 + Math.floor(Math.random() * 5))
      }));
      renderProcessRows();
      recompute({ animate: true });
    }

    function loadExample() {
      state.processes = EXAMPLE_PROCESSES.map((process) => ({
        name: String(process.name), arrival: String(process.arrival),
        burst: String(process.burst), priority: String(process.priority)
      }));
      state.algo = 'rr';
      state.quantum = 3;
      panel.querySelectorAll('[data-algorithm]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.algorithm === 'rr'));
      });
      panel.querySelector('.scheduler-stepper').hidden = false;
      panel.querySelector('[data-quantum-value]').textContent = '3';
      panel.querySelector('[data-quantum="-1"]').disabled = false;
      panel.querySelector('[data-quantum="1"]').disabled = false;
      renderProcessRows();
      recompute({ animate: true });
    }

    function onInput(event) {
      const input = event.target.closest('[data-process-field]');
      if (!input) return;
      const row = input.closest('[data-process-row]');
      const index = Number(row.dataset.processRow);
      state.processes[index][input.dataset.processField] = input.value;
      updateInputLabels();
      recompute({ animate: false });
    }

    function onClick(event) {
      const algorithmButton = event.target.closest('[data-algorithm]');
      if (algorithmButton) {
        setAlgorithm(algorithmButton.dataset.algorithm);
        return;
      }
      const quantumButton = event.target.closest('[data-quantum]');
      if (quantumButton) {
        setQuantum(state.quantum + Number(quantumButton.dataset.quantum));
        return;
      }
      const compareButton = event.target.closest('[data-compare]');
      if (compareButton) {
        setAlgorithm(compareButton.dataset.compare);
        return;
      }
      const removeButton = event.target.closest('[data-remove-process]');
      if (removeButton && state.processes.length > 1) {
        state.processes.splice(Number(removeButton.dataset.removeProcess), 1);
        renderProcessRows();
        recompute({ animate: true });
        return;
      }
      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) return;
      if (actionButton.dataset.action === 'add') addProcess();
      if (actionButton.dataset.action === 'random') randomWorkload();
      if (actionButton.dataset.action === 'example') loadExample();
    }

    renderProcessRows();
    panel.addEventListener('input', onInput);
    panel.addEventListener('click', onClick);
    wireTests(panel, cases.map((testCase) => ({
      label: testCase.label,
      expected: testCase.expected,
      run: () => {
        state.processes = testCase.processes.map((process) => ({
          name: process[0], arrival: String(process[1]), burst: String(process[2]),
          priority: String(process[3] == null ? 1 : process[3])
        }));
        state.algo = testCase.algo;
        state.quantum = testCase.quantum;
        panel.querySelectorAll('[data-algorithm]').forEach((button) => {
          button.setAttribute('aria-pressed', String(button.dataset.algorithm === state.algo));
        });
        panel.querySelector('.scheduler-stepper').hidden = state.algo !== 'rr';
        panel.querySelector('[data-quantum-value]').textContent = String(state.quantum);
        panel.querySelector('[data-quantum="-1"]').disabled = state.quantum <= 1;
        panel.querySelector('[data-quantum="1"]').disabled = state.quantum >= 20;
        renderProcessRows();
        recompute({ animate: true });
        return {
          pass: lastResult !== null && near(lastResult.avgWT, Number(testCase.expected.match(/[\d.]+$/)[0]), testCase.decimals),
          got: 'average waiting ' + (lastResult ? fmt(lastResult.avgWT, 4) : '—')
        };
      }
    })));
    const animateInitialChart = !state.hasRenderedCpu;
    state.hasRenderedCpu = true;
    recompute({ animate: animateInitialChart });

    return () => {
      panel.removeEventListener('input', onInput);
      panel.removeEventListener('click', onClick);
    };
  }

  function renderPlaceholder(container, discipline) {
    container.innerHTML = toolHead(discipline) +
      '<section class="el-card el-marks el-placeholder"><p>This tool is being built.</p></section>';
  }

  const TOOL_RENDERERS = {
    computer: renderSchedulerLab,
    electrical: renderOhm,
    mechanical: renderTorque,
    civil: renderSlab,
    chemical: renderGas,
    anyone: renderConverter
  };

  if (typeof document !== 'undefined') initApp();
})();
