// study_render.js — shared study block rendering
// Loaded by each studyXXX.html page.

// ── Shared Plotly layout base (light theme) ──────────────────────────────────
const PLY = {
  paper_bgcolor: '#ffffff',
  plot_bgcolor:  '#f6f8fa',
  font:   { color: '#1f2328', family: 'Segoe UI, Arial, sans-serif', size: 12 },
  margin: { t: 40, r: 16, b: 56, l: 68 },
  xaxis:  { gridcolor: '#e1e4e8', zeroline: false, color: '#636c76' },
  yaxis:  { gridcolor: '#e1e4e8', zeroline: false, color: '#636c76' },
  legend: { bgcolor: '#f6f8fa', bordercolor: '#d0d7de', borderwidth: 1 },
  hovermode: 'x unified',
};

const CFG = { responsive: true, displayModeBar: true, displaylogo: false };

const STUDY_COLORS = [
  '#0969da','#1a7f37','#cf222e','#9a6700',
  '#8250df','#1b7c83','#bf3989','#116329',
  '#953800','#0550ae',
];

const DL_ICON = `<svg viewBox="0 0 16 16"><path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14ZM7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"/></svg>`;

// ── Main study block renderer ─────────────────────────────────────────────────
function renderStudy(container, data) {
  const name        = data.study;
  const t           = data.timeline;
  const vars        = data.variables || {};
  const displayName = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const varCount    = Object.keys(vars).length;
  const chartH      = Math.max(317, Math.round(t.sessions.length * 36 + 108));

  const block = document.createElement('div');
  block.className = 'study-block';
  block.id = `study-${name}`;

  const descHtml = data.description
    ? `<div class="study-description">${data.description.replace(/\n/g, '<br>')}</div>`
    : '';

  block.innerHTML = `
    <div class="study-header">
      <h3 class="study-title">${displayName}</h3>
      <span class="study-gen">Generated: ${data.generated}</span>
    </div>
    ${descHtml}
    <div class="card-grid study-cards">
      <div class="card"><div class="label">First Sample</div><div class="value sval">${t.first}</div></div>
      <div class="card"><div class="label">Last Sample</div><div class="value sval">${t.last}</div></div>
      <div class="card"><div class="label">Wall Clock</div><div class="value">${t.wall_clock_hours} h</div></div>
      <div class="card"><div class="label">Total Logged</div><div class="value">${t.total_logged_hours} h</div></div>
      <div class="card"><div class="label">Sessions</div><div class="value">${t.session_count}</div></div>
      <div class="card"><div class="label">Gaps</div><div class="value">${t.gap_count}</div></div>
    </div>
    <div class="study-chart-row">
      <div class="chart-box" id="timeline-${name}" style="height:${chartH}px"></div>
      <div class="chart-box" id="baddata-${name}"  style="height:${chartH}px"></div>
    </div>
    <div class="tbl-controls">
      <button class="btn" id="dl-stats-${name}">${DL_ICON} Download CSV</button>
      <span style="color:var(--text-dim);font-size:.85rem">${varCount} variables</span>
    </div>
    <div id="table-stats-${name}"></div>
  `;
  container.appendChild(block);

  // ── Variable stats table ──────────────────────────────────────────────────
  const tblData = Object.entries(vars).map(([col, v]) => ({
    variable: v.label || col,
    unit:     v.unit,
    valid:    v.valid_rows,
    bad:      v.bad_rows,
    bad_s:    v.bad_duration_s,
    reasons:  Object.keys(v.bad_reasons || {}).join(', ') || '—',
    min:      v.min,
    max:      v.max,
    range:    v.range,
    mean:     v.mean,
  }));

  const fmt0   = cell => (cell.getValue() ?? 0).toLocaleString();
  const fmtBad = cell => {
    const v = cell.getValue() ?? 0;
    return v > 0 ? `<span style="color:#f78166">${v.toLocaleString()}</span>` : '0';
  };
  const fmtNum = cell => {
    const v = cell.getValue();
    return (v !== null && v !== undefined) ? v : '—';
  };

  const statsTbl = new Tabulator(`#table-stats-${name}`, {
    data: tblData,
    layout: 'fitColumns',
    headerSort: true,
    initialSort: [{ column: 'variable', dir: 'asc' }],
    columns: [
      { title: 'Variable',    field: 'variable', headerSort: true,  widthGrow: 2 },
      { title: 'Unit',        field: 'unit',     headerSort: true,  width: 80 },
      { title: 'Valid Rows',  field: 'valid',    headerSort: true,  sorter: 'number', hozAlign: 'right', width: 110, formatter: fmt0 },
      { title: 'Bad Rows',    field: 'bad',      headerSort: true,  sorter: 'number', hozAlign: 'right', width: 100, formatter: fmtBad },
      { title: 'Bad Dur (s)', field: 'bad_s',    headerSort: true,  sorter: 'number', hozAlign: 'right', width: 110, formatter: fmtBad },
      { title: 'Bad Reason',  field: 'reasons',  headerSort: false, widthGrow: 1 },
      { title: 'Min',         field: 'min',      headerSort: true,  sorter: 'number', hozAlign: 'right', width: 90, formatter: fmtNum },
      { title: 'Max',         field: 'max',      headerSort: true,  sorter: 'number', hozAlign: 'right', width: 90, formatter: fmtNum },
      { title: 'Range',       field: 'range',    headerSort: true,  sorter: 'number', hozAlign: 'right', width: 90, formatter: fmtNum },
      { title: 'Mean',        field: 'mean',     headerSort: true,  sorter: 'number', hozAlign: 'right', width: 90, formatter: fmtNum },
    ],
  });

  document.getElementById(`dl-stats-${name}`).addEventListener('click', () => {
    statsTbl.download('csv', `${name}_variable_stats.csv`);
  });

  // ── Session timeline chart ────────────────────────────────────────────────
  const timeTraces = t.sessions.map((s, i) => ({
    type: 'scatter', mode: 'lines',
    x: [s.start, s.end],
    y: [`S${i + 1}`, `S${i + 1}`],
    line: { color: STUDY_COLORS[i % STUDY_COLORS.length], width: 14 },
    hovertemplate:
      `<b>Session ${i + 1}</b><br>File: ${s.file}<br>` +
      `Start: ${s.start}<br>End:&nbsp;&nbsp; ${s.end}<br>` +
      `Duration: ${(s.duration_s / 3600).toFixed(2)} h<br>` +
      `Rows: ${s.rows.toLocaleString()}<extra></extra>`,
    showlegend: false,
  }));

  Plotly.newPlot(`timeline-${name}`, timeTraces, {
    paper_bgcolor: '#ffffff', plot_bgcolor: '#f6f8fa',
    font:      { color: '#1f2328', family: 'Segoe UI, Arial, sans-serif', size: 11 },
    title:     { text: 'Session Timeline', font: { color: '#1f2328', size: 13 }, x: 0.04 },
    xaxis:     { type: 'date', gridcolor: '#e1e4e8', zeroline: false, color: '#636c76' },
    yaxis:     { gridcolor: '#e1e4e8', zeroline: false, color: '#636c76', tickfont: { size: 10 } },
    hovermode: 'closest', showlegend: false,
    margin:    { t: 40, r: 12, b: 44, l: 44 },
    height:    chartH,
  }, CFG);

  // ── Bad-data duration chart ───────────────────────────────────────────────
  const badEntries = Object.entries(vars)
    .filter(([, v]) => v.bad_rows > 0)
    .sort((a, b) => b[1].bad_duration_s - a[1].bad_duration_s);

  if (!badEntries.length) {
    document.getElementById(`baddata-${name}`).innerHTML =
      `<div style="height:${chartH}px;display:flex;align-items:center;
                   justify-content:center;flex-direction:column;gap:8px;
                   color:var(--green);font-size:.9rem">
         <span style="font-size:1.6rem">✓</span>No bad data detected
       </div>`;
  } else {
    const bLabels    = badEntries.map(([, v]) => v.label);
    const bDurations = badEntries.map(([, v]) => v.bad_duration_s);
    const bReasons   = badEntries.map(([, v]) =>
      Object.entries(v.bad_reasons).map(([k, n]) => `${k}: ${n.toLocaleString()}`).join(', ')
    );
    const bCounts = badEntries.map(([, v]) => v.bad_rows);

    Plotly.newPlot(`baddata-${name}`, [{
      type: 'bar', orientation: 'h',
      x: bDurations, y: bLabels,
      customdata: bReasons.map((r, i) => [r, bCounts[i]]),
      marker: { color: '#cf222e', opacity: 0.85 },
      hovertemplate:
        '<b>%{y}</b><br>Duration: %{x} s<br>' +
        'Rows: %{customdata[1]}<br>Reason: %{customdata[0]}<extra></extra>',
    }], {
      paper_bgcolor: '#ffffff', plot_bgcolor: '#f6f8fa',
      font:     { color: '#1f2328', family: 'Segoe UI, Arial, sans-serif', size: 11 },
      title:    { text: 'Bad / Out-of-Range Duration', font: { color: '#1f2328', size: 13 }, x: 0.04 },
      xaxis:    { gridcolor: '#e1e4e8', zeroline: false, color: '#636c76',
                  title: { text: 'seconds', font: { color: '#636c76', size: 11 } } },
      yaxis:    { gridcolor: '#e1e4e8', zeroline: false, color: '#636c76',
                  automargin: true, tickfont: { size: 10 } },
      hovermode: 'closest',
      margin:   { t: 40, r: 20, b: 54, l: 16 },
      height:   chartH,
    }, CFG);
  }

  // ── Time-series charts heading + info ─────────────────────────────────────
  const tsH = document.createElement('h3');
  tsH.style.cssText = 'font-size:1rem;color:var(--blue);margin:28px 0 8px';
  tsH.textContent   = 'Time-Series Charts';
  block.appendChild(tsH);

  const studyCharts = (window.STUDY_CHARTS || {})[name];
  if (studyCharts) {
    const tsInfo = document.createElement('p');
    tsInfo.style.cssText = 'font-size:.8rem;color:var(--text-dim);margin-bottom:14px';
    tsInfo.textContent =
      `${studyCharts.sampled_rows.toLocaleString()} of ` +
      `${studyCharts.original_rows.toLocaleString()} rows plotted (downsampled). ` +
      'Gaps indicate session breaks.';
    block.appendChild(tsInfo);
  }

  const tsContainer = document.createElement('div');
  block.appendChild(tsContainer);
  renderStudyCharts(name, tsContainer);

  // ── Interpretation bullets ────────────────────────────────────────────────
  const interp = data.interpretation;
  if (interp && interp.bullets && interp.bullets.length) {
    const iH = document.createElement('h3');
    iH.style.cssText = 'font-size:1rem;color:var(--blue);margin:28px 0 10px';
    iH.textContent   = 'Results Interpretation';
    block.appendChild(iH);

    const iNote = document.createElement('p');
    iNote.style.cssText = 'font-size:.8rem;color:var(--text-dim);margin-bottom:12px';
    iNote.textContent =
      'Auto-generated from logged statistics. Consider sensor placement, ' +
      'conditioning time, and session continuity when interpreting.';
    block.appendChild(iNote);

    const ul = document.createElement('ul');
    ul.className = 'interp-list';
    interp.bullets.forEach(b => {
      const li = document.createElement('li');
      li.textContent = b;
      ul.appendChild(li);
    });
    block.appendChild(ul);
  }

  // ── Weather overlay + scatter + export ────────────────────────────────────
  renderStudyWeather(name, block);

  const tsCharts = (window.STUDY_CHARTS || {})[name];
  if (tsCharts) {
    renderStudyScatter(name, block, tsCharts);
    renderStudyDataExport(name, block, tsCharts);
  }
}

// ── Time-series chart rendering ───────────────────────────────────────────────
function renderStudyCharts(name, container) {
  const charts = (window.STUDY_CHARTS || {})[name];
  if (!charts) {
    const msg = document.createElement('p');
    msg.style.cssText = 'color:var(--text-dim);font-size:.85rem;padding:4px 0 12px';
    msg.textContent = 'No chart data — re-run build.sh to generate.';
    container.appendChild(msg);
    return;
  }

  const x      = charts.x;
  const groups = charts.groups;

  const PLY_S = {
    paper_bgcolor: '#ffffff', plot_bgcolor: '#f6f8fa',
    font:      { color: '#1f2328', family: 'Segoe UI, Arial, sans-serif', size: 11 },
    legend:    { bgcolor: '#f6f8fa', bordercolor: '#d0d7de', borderwidth: 1 },
    hovermode: 'x unified',
    margin:    { t: 40, r: 16, b: 56, l: 68 },
  };
  const AX  = { type: 'date', gridcolor: '#e1e4e8', zeroline: false, color: '#636c76' };
  const YAX = { gridcolor: '#e1e4e8', zeroline: false, color: '#636c76' };

  // Dual-axis: Temperature (left) + Pressure (right)
  if (groups.temperature || groups.pressure) {
    const dualId  = `chart-temppres-${name}`;
    const dualDiv = document.createElement('div');
    dualDiv.className = 'chart-box study-chart-full';
    dualDiv.id = dualId;
    container.appendChild(dualDiv);

    const dualTraces = [];
    (groups.temperature ? groups.temperature.traces : []).forEach(t => {
      dualTraces.push({
        type: 'scatter', mode: 'lines', connectgaps: false,
        name: t.name + ' (°C)', x, y: t.y,
        line: { color: t.color, width: 1.5 },
      });
    });
    (groups.pressure ? groups.pressure.traces : []).forEach(t => {
      dualTraces.push({
        type: 'scatter', mode: 'lines', connectgaps: false,
        name: t.name + ' (hPa)', x, y: t.y,
        yaxis: 'y2',
        line: { color: t.color, width: 1.5, dash: 'dot' },
      });
    });

    Plotly.newPlot(dualId, dualTraces, Object.assign({}, PLY_S, {
      title:  { text: 'Temperature & Pressure', font: { color: '#1f2328', size: 13 }, x: 0.04 },
      xaxis:  AX,
      yaxis:  Object.assign({}, YAX, { title: { text: '°C',  font: { size: 11 } } }),
      yaxis2: Object.assign({}, YAX, {
        title: { text: 'hPa', font: { size: 11 } },
        overlaying: 'y', side: 'right',
      }),
      margin: { t: 40, r: 72, b: 56, l: 68 },
      height: 432,
    }), CFG);

    const summary = (window.STUDY_SUMMARIES || {})[name];
    const tpText  = summary && summary.interpretation && summary.interpretation.temp_pressure_text;
    if (tpText) {
      const tpP = document.createElement('p');
      tpP.className = 'chart-interp-text';
      tpP.textContent = tpText;
      container.appendChild(tpP);
    }
    appendChartNotes(container, name, 'temp_pres');
  }

  // Individual parameter charts
  const groupOrder = ['temperature', 'humidity', 'pressure', 'gas', 'light'];
  const drawGroups = groupOrder.filter(k => k in groups);
  if (!drawGroups.length) return;

  const grid = document.createElement('div');
  grid.className = 'study-ts-grid';
  container.appendChild(grid);

  drawGroups.forEach(key => {
    const g    = groups[key];
    const id   = `chart-ts-${key}-${name}`;
    const wrap = document.createElement('div');
    const div  = document.createElement('div');
    div.className = 'chart-box';
    div.id = id;
    wrap.appendChild(div);
    grid.appendChild(wrap);

    Plotly.newPlot(id, g.traces.map(t => ({
      type: 'scatter', mode: 'lines', connectgaps: false,
      name: t.name, x, y: t.y,
      line: { color: t.color, width: 1.5 },
    })), Object.assign({}, PLY_S, {
      title: { text: g.title, font: { color: '#1f2328', size: 13 }, x: 0.04 },
      xaxis: AX,
      yaxis: Object.assign({}, YAX, { title: { text: g.unit, font: { size: 11 } } }),
      height: 374,
    }), CFG);

    appendChartNotes(wrap, name, key);
  });
}

function appendChartNotes(parent, studyName, groupKey) {
  const bullets = studyGroupNotes(studyName, groupKey);
  if (!bullets.length) return;
  const ul = document.createElement('ul');
  ul.className = 'chart-notes';
  bullets.forEach(html => {
    const li = document.createElement('li');
    li.innerHTML = html;
    ul.appendChild(li);
  });
  parent.appendChild(ul);
}

// ── Per-chart sensor context notes ───────────────────────────────────────────
function studyGroupNotes(studyName, groupKey) {
  const outlet    = studyName === 'study002_ecoli' || studyName === 'study003_ecoli' || studyName === 'study004_bsub';
  const sht30Ref  = '<a href="https://sensirion.com/products/catalog/SHT30-DIS-B/" target="_blank" rel="noopener">Sensirion SHT30 product page</a>';
  const bme688Ref = '<a href="https://www.bosch-sensortec.com/products/environmental-sensors/gas-sensors/bme688/" target="_blank" rel="noopener">Bosch Sensortec BME688</a>';
  const as7341Ref = '<a href="https://wiki.dfrobot.com/Gravity_AS7341_Visible_Light_Sensor_SKU_SEN0364" target="_blank" rel="noopener">DFRobot Gravity AS7341 (SEN0364)</a>';
  const moxRef    = '<a href="https://www.sciencedirect.com/science/article/pii/S2214180423000107" target="_blank" rel="noopener">Wöllner et al., Sens. Actuators B (2023) — MOX sensors in fermentation</a>';

  const n = {
    temp_pres: [
      '<b>SHT30 Temperature:</b> Sensirion CMOSens® technology integrates a polysilicon bandgap resistive thermometer directly on a CMOS die. Accuracy ±0.2 °C (typical), ±0.7 °C (max) over 0–90 °C. No internal heat source — tracks true ambient air temperature with negligible self-heating. Response time τ₆₃ ≈ 2 s. ' + sht30Ref,
      '<b>BME688 Temperature:</b> MEMS resistive sensor co-integrated on the same die as the metal-oxide gas sensor hot plate (~340 °C). Residual thermal conduction from the hot plate causes a systematic +1–3 °C positive offset even after factory compensation. Accuracy ±1.0 °C (typical). BME688 temperature readings are less accurate than SHT30 and should be treated as indicative rather than precise. ' + bme688Ref,
      '<b>Inter-sensor difference:</b> The SHT30 consistently reads lower than the BME688 because (1) it has no internal heat source, (2) it has tighter factory calibration (±0.2 vs ±1.0 °C), and (3) they may sample slightly different airstreams. A persistent SHT30-vs-BME688 offset of 1–3 °C is consistent with manufacturer specifications and should not be interpreted as a measurement error.',
      outlet
        ? '<b>Placement:</b> SHT30 and BME688 #1 are bench-mounted and measure room-ambient temperature. BME688 #2 is mounted at the bioreactor exhaust outlet; its temperature is the closest available proxy for culture headspace temperature. A sustained positive offset (BME688 #2 warmer than BME688 #1) is expected because exhaust air has been thermally equilibrated near culture temperature (~25–37 °C).'
        : '<b>Placement (Study 001):</b> Both SHT30 and BME688 #1 are bench-mounted adjacent to the bioreactor. Neither sensor contacts the culture. Temperature readings reflect bench-ambient room conditions only.',
      'Open vessel — T and P are decoupled: for an ideal gas in a sealed constant-volume vessel, dP/dT = P/T ≈ 3.4 hPa/K. This reactor is open to atmosphere, so culture heating cannot drive pressure changes. Any apparent T–P correlation is meteorological pressure variation or a BME688 temperature-compensation artefact, not culture physiology. Pressure accuracy: ±0.6 hPa (typical), ±1.0 hPa (max). ' + bme688Ref,
    ],

    temperature: [
      '<b>SHT30:</b> Sensirion CMOSens® bandgap resistive thermometer. Accuracy ±0.2 °C (typical). No internal heat source — closely tracks true ambient temperature. ' + sht30Ref,
      '<b>BME688 (both sensors):</b> MEMS resistive thermometer co-integrated with the gas sensor hot plate. Accuracy ±1.0 °C (typical). Self-heating from the ~340 °C hot plate causes a +1–3 °C positive offset that persists after factory compensation. ' + bme688Ref,
      '<b>Inter-sensor difference — SHT30 vs BME688:</b> Expect the SHT30 to read 1–3 °C lower than either BME688. This is a systematic, predictable offset caused by BME688 chip self-heating, not a calibration error. Both are measuring the same physical environment; the SHT30 measurement is closer to true air temperature.',
      outlet
        ? '<b>BME688 #2 (exhaust outlet) vs BME688 #1 (bench):</b> BME688 #2 is expected to read warmer when culture thermal output heats the exhaust stream. The ΔT between the two BME688 sensors is an indirect measure of the thermal gradient between room ambient and the bioreactor headspace.'
        : null,
      'Short-duration temperature spikes (<60 s) in any sensor most likely reflect HVAC cycling, door openings, or sensor power-on transients — not biological events.',
    ].filter(Boolean),

    humidity: [
      '<b>SHT30 Humidity:</b> Capacitive polymer sensor. Accuracy ±2 % RH (typical) over 10–90 % RH. Low hysteresis; the polymer recovers rapidly from condensation exposure. ' + sht30Ref,
      '<b>BME688 Humidity:</b> Also a capacitive polymer element, but co-integrated on the die with the gas sensor hot plate. The proximity of the ~340 °C hot plate introduces measurement noise during gas-sensing heater cycles. Accuracy ±3 % RH (typical). ' + bme688Ref,
      '<b>Inter-sensor difference — SHT30 vs BME688:</b> Agreement within ±3–5 % RH is within combined sensor tolerances. Divergence beyond ±5 % RH may indicate condensation on the BME688 element, placement in different airstreams, or calibration drift after repeated thermal cycling.',
      outlet
        ? '<b>BME688 #2 (exhaust outlet):</b> Saturation vapour pressure P*(37 °C) ≈ 62.8 hPa vs P*(22 °C) ≈ 26.4 hPa (Antoine equation) — exhaust air at culture temperature carries 2.4× more water vapour than bench air at room temperature. BME688 #2 is therefore expected to read near 100 % RH. Values ≥ 99.9 % RH are flagged as bad data (sensor saturation or condensation on the polymer element).'
        : '<b>Bench sensors (SHT30 and BME688 #1):</b> Both measure bench-ambient humidity controlled by HVAC (typically 30–60 % RH). These readings do not reflect bioreactor headspace conditions.',
      'Clausius-Clapeyron slope: dP*/dT ≈ L<sub>v</sub>·P*/(R<sub>v</sub>·T²) ≈ 1.8 hPa/°C at 300 K. A 15 °C rise from bench ambient to culture temperature roughly doubles saturation vapour pressure. Condensation on a sensing polymer permanently biases the baseline until the element fully dries.',
    ],

    pressure: [
      '<b>BME688 Pressure:</b> Capacitive MEMS barometric sensor. A thin silicon diaphragm deflects under atmospheric pressure, changing capacitance. Absolute accuracy ±0.6 hPa (typical), ±1.0 hPa (max) at 25 °C. Resolution 0.18 Pa. ' + bme688Ref,
      '<b>SHT30 does not measure pressure.</b> All pressure data in this study comes from the BME688 sensor(s) only.',
      outlet
        ? '<b>BME688 #1 vs BME688 #2 pressure offset:</b> Both measure absolute atmospheric pressure. The expected hydrostatic offset for ~30 cm height difference is ρgh ≈ 0.035 hPa — well below sensor noise. Any larger persistent offset reflects sensor-to-sensor factory calibration variation.'
        : null,
      'Open vessel: P<sub>internal</sub> = P<sub>atm</sub>. Culture metabolism cannot build gauge pressure in an open reactor. Pressure variation across sessions (typically 2–15 hPa) reflects synoptic meteorology — passing weather fronts — not biology.',
    ].filter(Boolean),

    gas: [
      '<b>BME688 Metal-Oxide Gas Sensor (MOX):</b> A thin film of metal oxide (SnO₂) is deposited on a microfabricated resistive hot plate operating at 300–400 °C. Reducing VOCs donate electrons to the oxide surface, lowering resistance. Response: R = R₀ · [C<sub>VOC</sub>]<sup>−α</sup> · exp(E<sub>a</sub>/kT), where α ≈ 0.3–0.7 and E<sub>a</sub> ≈ 0.1–0.5 eV. ' + bme688Ref,
      '<b>Thermal conditioning (burn-in):</b> After each power-on, the hot plate requires 1–3 hours of continuous operation before the baseline resistance R₀ stabilises. Early-session gas resistance values are unreliable. ' + moxRef,
      '<b>Non-selectivity:</b> The MOX element integrates the simultaneous response to all reducing gases. CO₂ — the primary E. coli respiration product — is NOT detected because it is fully oxidised. ' + moxRef,
      outlet
        ? '<b>BME688 #1 (bench) vs BME688 #2 (exhaust outlet):</b> BME688 #1 measures ambient lab VOC background and provides an environmental drift reference. BME688 #2, at the bioreactor exhaust outlet, measures ambient background plus culture-derived metabolic VOCs (acetate, ethanol, acetoin from overflow metabolism). A sustained decrease in R(BME688 #2) relative to R(BME688 #1) is consistent with increasing VOC production as the culture reaches high cell density.'
        : '<b>BME688 #1 (bench, Study 001):</b> Measures ambient lab VOC background only. Changes in gas resistance primarily reflect lab environmental variation rather than culture metabolism. Useful as an environmental baseline for comparison with later studies.',
    ].filter(Boolean),

    light: [
      '<b>AS7341 Spectral Sensor:</b> CMOS-based 11-channel spectral sensor (AMS-OSRAM AS7341). Narrowband optical interference filters are deposited directly on-chip above individual silicon photodiodes to isolate specific wavelength bands (~30–40 nm FWHM each). Each photodiode converts photons to charge accumulated in a 16-bit ADC (0–65535 counts; 65535 = saturated). Channels: F1 (415 nm, violet), F2 (445 nm, indigo), F3 (480 nm, blue), F4 (515 nm, cyan-green), F5 (555 nm, green), F6 (590 nm, amber), F7 (630 nm, orange-red), F8 (680 nm, red), CLEAR (broadband 380–700 nm), NIR (~855 nm). ' + as7341Ref,
      '<b>Photobleaching — not applicable to this sensor:</b> The AS7341 uses thin-film dielectric interference filters (metal-oxide multilayer coatings) — there are no organic dyes or fluorescent molecules in the optical path. Silicon and metal-oxide materials do not degrade under sustained illumination under normal lab conditions.',
      '<b>Output scale — 0 to 1000, not raw 16-bit:</b> The DFRobot_AS7341 library outputs normalized channel values on a 0–1000 scale, not raw 16-bit ADC counts (0–65535). A reading of exactly 1000 means the channel is at the library\'s full-scale ceiling. The pipeline flags values ≥ 1000 as <code>above_max</code>.',
      '<b>Channel saturation under lab lighting:</b> Channels F3 (480 nm, blue) and F4 (515 nm, cyan-green) saturate at 1000 in 63–90% of study003 rows. CLEAR (broadband visible) saturates at the same rate. F1 (415 nm, violet) peaks at ~320 and never saturates. NIR (855 nm) peaks at ~550 and never saturates. This spectral pattern is diagnostic of LED white-light overhead lighting: white LEDs produce a strong narrow blue/cyan peak centred on 450–550 nm that directly overlaps F3 and F4.',
      '<b>Saturation is instantaneous and reversible — not drift:</b> The rise of F3/F4/CLEAR toward 1000 is not a slow drift caused by sensor ageing. It occurs when the incident photon flux exceeds the photodiode\'s charge-accumulation capacity within the integration window.',
      '<b>Use as OD₆₀₀ proxy:</b> F5 (555 nm, green) and F6 (590 nm, amber) are the nearest available channels to 600 nm and should show decreasing counts as the culture grows. NIR (855 nm) serves as a turbidity reference decoupled from pigment signals.',
      '<b>GFP detection context:</b> The E. coli strain expresses GFP (excitation maximum ≈ 488 nm, emission maximum ≈ 509 nm). F3 (480 nm, blue) and F4 (515 nm, cyan-green) are closest to the GFP excitation and emission peaks. Without a dedicated 488 nm excitation source and a long-pass emission filter, GFP fluorescence will be negligible against broad-spectrum ambient illumination.',
      '<b>Ambient light contamination:</b> Without optical shielding of the bioreactor vessel, all channels are dominated by lab room illumination. Enclosing the bioreactor in an opaque housing with the sensor at a fixed standoff distance is required before these readings can be interpreted quantitatively.',
    ],
  };
  return (n[groupKey] || []).filter(Boolean);
}

// ── Scatter statistics ────────────────────────────────────────────────────────
function computeScatterStats(xArr, yArr) {
  const n = xArr.length;
  if (n < 2) return null;
  const mx = xArr.reduce((a, b) => a + b, 0) / n;
  const my = yArr.reduce((a, b) => a + b, 0) / n;
  const offset = my - mx;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - mx, dy = yArr[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const r = (dx2 > 0 && dy2 > 0) ? num / Math.sqrt(dx2 * dy2) : 0;
  return { meanX: mx, meanY: my, offset, r, n };
}

function buildScatterText(groupKey, tA, tB, st, unit, studyName) {
  const { meanX, meanY, offset, r, n } = st;
  const absOff  = Math.abs(offset);
  const higher  = offset > 0 ? tB.name : tA.name;
  const corrStr = r > 0.99 ? 'near-perfect' : r > 0.95 ? 'strong' : r > 0.8 ? 'moderate' : 'weak';
  const outlet  = studyName === 'study002_ecoli' || studyName === 'study003_ecoli' || studyName === 'study004_bsub';
  const dp      = unit === 'Ω' ? 0 : 2;

  let s = `<b>${tA.name} vs ${tB.name}</b> — ${n.toLocaleString()} paired valid points. `;
  s += `${tA.name} mean: ${meanX.toFixed(dp)} ${unit};  ${tB.name} mean: ${meanY.toFixed(dp)} ${unit}. `;
  s += `Mean offset: ${absOff.toFixed(dp)} ${unit} (${higher} reads higher). `;
  s += `Pearson r = ${r.toFixed(3)} (${corrStr} correlation). `;

  const isShtVsBme = tA.name === 'SHT30' && tB.name.startsWith('BME');
  const isBmeVsBme = tA.name.startsWith('BME') && tB.name.startsWith('BME');

  if (groupKey === 'temperature') {
    if (isShtVsBme && offset > 0) {
      s += 'The BME688 reads warmer than the SHT30 — the expected result of BME688 chip self-heating from its internal gas-sensor hot plate (~340 °C). The SHT30 has no internal heat source and more closely tracks true ambient air temperature. A 1–3 °C positive offset is within manufacturer tolerance and is systematic, not random.';
    } else if (isShtVsBme && offset <= 0) {
      s += 'The SHT30 reads warmer than the BME688, which is atypical. Possible causes: SHT30 is located near a local heat source (pump motor, rack power supply), or the BME688 is in a cooler, more ventilated microenvironment.';
    } else if (isBmeVsBme && outlet && offset > 0.5) {
      s += `BME688 #2 (exhaust outlet) reads ${absOff.toFixed(1)} °C warmer than BME688 #1 (bench). This reflects the thermal gradient between room-ambient air and the bioreactor exhaust, which is thermally equilibrated near culture temperature.`;
    } else if (isBmeVsBme && outlet && offset < -0.5) {
      s += 'BME688 #1 (bench) reads warmer than BME688 #2 (exhaust outlet) in this aggregated dataset. This likely reflects sessions logged before BME688 #2 was relocated to the exhaust port, or pump-off intervals when headspace temperature had cooled toward ambient.';
    } else if (isBmeVsBme) {
      s += `The ${absOff.toFixed(2)} °C mean offset between the two BME688 sensors is within the ±1.0 °C manufacturer accuracy specification and reflects sensor-to-sensor calibration variation.`;
    }
  } else if (groupKey === 'humidity') {
    const hasOutlet = outlet && (tA.name === 'BME688 #2' || tB.name === 'BME688 #2');
    if (hasOutlet && absOff > 5) {
      s += `The ${absOff.toFixed(0)} % RH offset reflects BME688 #2 sampling near-saturated exhaust air from the bioreactor headspace. At 37 °C, saturation vapour pressure is ~2.4× that at 22 °C (Antoine equation), so near-100 % RH at the outlet is physically expected.`;
    } else if (absOff < 3) {
      s += `Agreement within ${absOff.toFixed(1)} % RH is within the combined sensor tolerances (SHT30 ±2 % RH; BME688 ±3 % RH).`;
    } else {
      s += `An offset of ${absOff.toFixed(1)} % RH exceeds combined sensor tolerances. Possible causes: condensation on the BME688 polymer element, one sensor in a localised draught, or calibration drift after repeated high-humidity cycling.`;
    }
  } else if (groupKey === 'pressure') {
    if (r > 0.98) {
      s += `Near-perfect pressure correlation (r = ${r.toFixed(3)}) confirms both sensors are tracking the same meteorological signal. The ${absOff.toFixed(2)} hPa mean offset is within the ±0.6 hPa BME688 absolute accuracy specification.`;
    } else {
      s += 'Moderate pressure correlation may reflect BME688 temperature-compensation artefacts during sessions with large temperature swings, or sensor warm-up drift at session start.';
    }
  } else if (groupKey === 'gas') {
    if (outlet) {
      if (offset < 0) {
        s += 'BME688 #1 (bench ambient) shows higher resistance than BME688 #2 (exhaust outlet) — consistent with culture-derived reducing VOCs (acetate, ethanol, acetoin from E. coli overflow metabolism) lowering resistance at the outlet sensor.';
      } else {
        s += 'BME688 #1 (bench) shows lower resistance than BME688 #2 (exhaust) in this aggregated dataset. This can occur during early-session burn-in (BME688 #2 hot plate not yet thermally stabilised after power-on — requires 1–3 h) or when ambient lab VOC levels temporarily exceeded culture exhaust output.';
      }
    } else {
      s += 'Only bench-ambient gas data available — no exhaust sensor for direct culture comparison. Resistance variation reflects ambient lab conditions rather than E. coli metabolic output.';
    }
  }
  return s;
}

// ── Local weather overlay chart ───────────────────────────────────────────────
function renderStudyWeather(name, block) {
  const weather = (window.WEATHER_DATA || {})[name];
  const charts  = (window.STUDY_CHARTS  || {})[name];
  if (!weather || !charts) return;

  const h3 = document.createElement('h3');
  h3.style.cssText = 'font-size:1rem;color:var(--blue);margin:32px 0 8px';
  h3.textContent = 'Sensor Data vs. Local Weather (Moffett Field, CA)';
  block.appendChild(h3);

  const intro = document.createElement('p');
  intro.style.cssText = 'font-size:.82rem;color:var(--text-dim);margin-bottom:12px';
  intro.textContent =
    'ERA5 reanalysis hourly weather (thick dashed/dotted) overlaid with sensor readings (thin solid/dotted). ' +
    'Temperature on left axis (°C); atmospheric pressure on right axis (hPa). ' +
    'Weather data at 1-hour resolution; sensor data downsampled to ~4 000 points.';
  block.appendChild(intro);

  const chartId  = `weather-${name}`;
  const chartDiv = document.createElement('div');
  chartDiv.className = 'chart-box study-chart-full';
  chartDiv.id = chartId;
  block.appendChild(chartDiv);

  const traces = [];
  const wx = weather.time;

  traces.push({
    type: 'scatter', mode: 'lines',
    name: 'ERA5 Temperature (2 m AGL)',
    x: wx, y: weather.temperature_2m,
    line: { color: '#afb8c1', width: 3, dash: 'dashdot' },
    yaxis: 'y',
  });

  const tempGrp = charts.groups.temperature;
  if (tempGrp) {
    tempGrp.traces.forEach(t => traces.push({
      type: 'scatter', mode: 'lines', connectgaps: false,
      name: `${t.name} (sensor)`, x: charts.x, y: t.y,
      line: { color: t.color, width: 1.5 },
      yaxis: 'y',
    }));
  }

  traces.push({
    type: 'scatter', mode: 'lines',
    name: 'ERA5 Surface Pressure',
    x: wx, y: weather.surface_pressure,
    line: { color: '#8c959f', width: 3, dash: 'dot' },
    yaxis: 'y2',
  });

  const presGrp = charts.groups.pressure;
  if (presGrp) {
    presGrp.traces.forEach(t => traces.push({
      type: 'scatter', mode: 'lines', connectgaps: false,
      name: `${t.name} pressure (sensor)`, x: charts.x, y: t.y,
      line: { color: t.color, width: 1.5, dash: 'dot' },
      yaxis: 'y2',
    }));
  }

  Plotly.newPlot(chartId, traces, {
    paper_bgcolor: '#ffffff', plot_bgcolor: '#f6f8fa',
    font:      { color: '#1f2328', family: 'Segoe UI, Arial, sans-serif', size: 11 },
    legend:    { bgcolor: '#f6f8fa', bordercolor: '#d0d7de', borderwidth: 1,
                 orientation: 'h', x: 0, xanchor: 'left', y: -0.18, yanchor: 'top' },
    hovermode: 'x unified',
    title:     { text: 'Sensor Data vs. ERA5 Local Weather — Temperature & Pressure',
                 font: { color: '#1f2328', size: 13 }, x: 0.04 },
    xaxis:     { type: 'date', gridcolor: '#e1e4e8', zeroline: false, color: '#636c76' },
    yaxis:     { gridcolor: '#e1e4e8', zeroline: false, color: '#636c76',
                 title: { text: '°C', font: { size: 11 } } },
    yaxis2:    { gridcolor: '#e1e4e8', zeroline: false, color: '#8c959f',
                 title: { text: 'hPa', font: { size: 11 } },
                 overlaying: 'y', side: 'right' },
    margin:    { t: 44, r: 80, b: 100, l: 68 },
    height:    460,
  }, CFG);

  const noteUl = document.createElement('ul');
  noteUl.className = 'chart-notes';
  [
    '<b>Weather data source:</b> ERA5 global atmospheric reanalysis, accessed via the ' +
    '<a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo Historical Weather API</a> ' +
    '(free, open-source, no API key required). ERA5 is produced by the European Centre for Medium-Range Weather ' +
    'Forecasts (ECMWF) and distributed under CC BY 4.0. ' +
    'Reference: Hersbach H. et al. (2020). The ERA5 global reanalysis. ' +
    '<em>Q. J. R. Meteorol. Soc.</em>, 146(730), 1999–2049. ' +
    '<a href="https://doi.org/10.1002/qj.3803" target="_blank" rel="noopener">DOI: 10.1002/qj.3803</a>',

    '<b>Location:</b> Nearest ERA5 grid point to Moffett Federal Airfield, Mountain View, CA, USA ' +
    '(37.4161°N, 122.0477°W). ERA5 horizontal resolution ≈ 31 km (0.25° grid).',

    '<b>Variables:</b> <em>temperature_2m</em> — air temperature at 2 m above ground level (°C). ' +
    '<em>surface_pressure</em> — atmospheric pressure at the surface (hPa), equivalent to station pressure ' +
    'corrected for the ERA5 model orography.',

    '<b>Temporal resolution:</b> ERA5 data is hourly; bioreactor sensor data is logged at 1 Hz and ' +
    'downsampled to ~4 000 points per study for display.',
  ].forEach(html => {
    const li = document.createElement('li');
    li.innerHTML = html;
    noteUl.appendChild(li);
  });
  block.appendChild(noteUl);
}

// ── Sensor cross-correlation scatter plots ────────────────────────────────────
function renderStudyScatter(name, block, charts) {
  const groups     = charts.groups || {};
  const groupOrder = ['temperature', 'humidity', 'pressure', 'gas'];
  const SAT_MAX    = { humidity: 99.9 };
  const SHOW_1TO1  = new Set(['temperature', 'humidity', 'pressure']);
  const MARG       = { t: 50, r: 165, b: 70, l: 80 };
  const SQ_H       = 560;
  const PLOT_SZ    = SQ_H - MARG.t - MARG.b;
  const SQ_W       = PLOT_SZ + MARG.l + MARG.r;
  const PAIR_COLORS = ['#0969da', '#cf222e', '#1a7f37', '#8250df', '#9a6700'];

  const PLY_SC = {
    paper_bgcolor: '#ffffff', plot_bgcolor: '#f6f8fa',
    font:   { color: '#1f2328', family: 'Segoe UI, Arial, sans-serif', size: 11 },
    legend: { bgcolor: '#f6f8fa', bordercolor: '#d0d7de', borderwidth: 1,
              orientation: 'v', x: 1.02, xanchor: 'left', y: 1, yanchor: 'top' },
    hovermode: 'closest',
    width: SQ_W, height: SQ_H,
    margin: MARG,
  };
  const AX = { gridcolor: '#e1e4e8', zeroline: false, color: '#636c76' };

  let anyPair = false;
  groupOrder.forEach(key => {
    const g = groups[key];
    if (g && g.traces.length >= 2) anyPair = true;
  });
  if (!anyPair) return;

  const h3 = document.createElement('h3');
  h3.style.cssText = 'font-size:1rem;color:var(--blue);margin:32px 0 8px';
  h3.textContent = 'Sensor Cross-Correlation';
  block.appendChild(h3);

  const note = document.createElement('p');
  note.style.cssText = 'font-size:.82rem;color:var(--text-dim);margin-bottom:14px';
  note.textContent =
    'All sensor pairs for each measurement group on one chart. Valid simultaneous ' +
    'readings only — nulls and saturated values excluded. Both axes share the same ' +
    'range. Dashed 1:1 line = perfect agreement.';
  block.appendChild(note);

  const grid = document.createElement('div');
  grid.className = 'scatter-grid';
  block.appendChild(grid);

  groupOrder.forEach(key => {
    const g = groups[key];
    if (!g || g.traces.length < 2) return;
    const satMax = SAT_MAX[key] !== undefined ? SAT_MAX[key] : Infinity;

    const pairs = [];
    for (let i = 0; i < g.traces.length - 1; i++) {
      for (let j = i + 1; j < g.traces.length; j++) {
        const tA = g.traces[i], tB = g.traces[j];
        const xSc = [], ySc = [];
        for (let k = 0; k < tA.y.length; k++) {
          const va = tA.y[k], vb = tB.y[k];
          if (va === null || vb === null) continue;
          if (va >= satMax || vb >= satMax) continue;
          xSc.push(va);
          ySc.push(vb);
        }
        if (xSc.length >= 10) pairs.push({ tA, tB, xSc, ySc });
      }
    }
    if (!pairs.length) return;

    const allV   = pairs.flatMap(p => [...p.xSc, ...p.ySc]);
    const vmin   = Math.min(...allV);
    const vmax   = Math.max(...allV);
    const pad    = (vmax - vmin) * 0.05 || 1;
    const axRange = [vmin - pad, vmax + pad];

    const id   = `sc-${key}-${name}`;
    const wrap = document.createElement('div');
    wrap.style.cssText = `width:${SQ_W}px`;
    const div = document.createElement('div');
    div.className = 'chart-box scatter-sq';
    div.id = id;
    div.style.width  = SQ_W + 'px';
    div.style.height = SQ_H + 'px';
    wrap.appendChild(div);
    grid.appendChild(wrap);

    const pTraces = pairs.map(({ tA, tB, xSc, ySc }, idx) => ({
      type: 'scatter', mode: 'markers',
      name: `${tA.name} vs ${tB.name}`,
      x: xSc, y: ySc,
      marker: { color: PAIR_COLORS[idx % PAIR_COLORS.length], size: 3, opacity: 0.5 },
    }));

    if (SHOW_1TO1.has(key)) {
      pTraces.push({
        type: 'scatter', mode: 'lines', name: '1:1 reference',
        x: axRange, y: axRange,
        line: { color: '#636c76', width: 1.5, dash: 'dash' },
      });
    }

    Plotly.newPlot(id, pTraces, Object.assign({}, PLY_SC, {
      title: { text: `${g.title} — all sensor pairs`,
               font: { color: '#1f2328', size: 13 }, x: 0.04 },
      xaxis: Object.assign({}, AX, { range: axRange, title: { text: g.unit, font: { size: 11 } } }),
      yaxis: Object.assign({}, AX, { range: axRange, title: { text: g.unit, font: { size: 11 } } }),
    }), { responsive: false, displayModeBar: true, displaylogo: false });

    const interpUl = document.createElement('ul');
    interpUl.className = 'scatter-interp';
    pairs.forEach(({ tA, tB, xSc, ySc }) => {
      const st = computeScatterStats(xSc, ySc);
      if (!st) return;
      const li = document.createElement('li');
      li.innerHTML = buildScatterText(key, tA, tB, st, g.unit, name);
      interpUl.appendChild(li);
    });
    wrap.appendChild(interpUl);
  });
}

// ── Data export + paginated preview ──────────────────────────────────────────
function renderStudyDataExport(name, block, charts) {
  const groupOrder = ['temperature', 'humidity', 'pressure', 'gas', 'light'];

  const cols = [{ header: 'timestamp', field: 'ts' }];
  groupOrder.forEach(gk => {
    const g = charts.groups[gk];
    if (!g) return;
    g.traces.forEach((t, ti) => {
      cols.push({ header: `${g.title} - ${t.name} (${g.unit})`, field: `${gk}_${ti}`, gk, ti });
    });
  });

  const rows = charts.x.map((ts, i) => {
    const row = { ts };
    cols.slice(1).forEach(c => {
      const v = charts.groups[c.gk].traces[c.ti].y[i];
      row[c.field] = (v !== null && v !== undefined) ? v : '';
    });
    return row;
  });

  function downloadCSV() {
    const header = cols.map(c => `"${c.header}"`).join(',');
    const body   = rows.map(r =>
      cols.map(c => {
        const v = r[c.field];
        return (v === '' || v === null || v === undefined) ? '' : v;
      }).join(',')
    ).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `${name}_timeseries.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const expH = document.createElement('h3');
  expH.style.cssText = 'font-size:1rem;color:var(--blue);margin:28px 0 8px';
  expH.textContent   = 'Data Export';
  block.appendChild(expH);

  const ctrl = document.createElement('div');
  ctrl.className = 'tbl-controls';
  ctrl.innerHTML = `
    <button class="btn" id="dl-ts-${name}">${DL_ICON} Download CSV</button>
    <span style="color:var(--text-dim);font-size:.85rem">
      ${charts.sampled_rows.toLocaleString()} rows &times; ${cols.length - 1} sensor columns
      &nbsp;&mdash;&nbsp; downsampled from ${charts.original_rows.toLocaleString()} original rows
    </span>`;
  block.appendChild(ctrl);
  document.getElementById(`dl-ts-${name}`).addEventListener('click', downloadCSV);

  const tblDiv = document.createElement('div');
  tblDiv.id = `ts-preview-${name}`;
  tblDiv.style.marginBottom = '8px';
  block.appendChild(tblDiv);

  new Tabulator(`#ts-preview-${name}`, {
    data: rows,
    layout: 'fitDataTable',
    pagination: 'local',
    paginationSize: 10,
    paginationSizeSelector: [10, 25, 50, 100],
    headerSort: false,
    columns: cols.map(c => ({
      title: c.header,
      field: c.field,
      width: c.field === 'ts' ? 180 : 110,
      formatter: cell => {
        const v = cell.getValue();
        return (v === '' || v === null || v === undefined)
          ? `<span style="color:var(--text-dim)">—</span>`
          : v;
      },
    })),
  });
}
