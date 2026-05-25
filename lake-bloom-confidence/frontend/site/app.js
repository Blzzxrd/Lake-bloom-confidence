const CONFIGURED_API_BASE_URL = (window.LBC_API_BASE_URL || "").replace(/\/$/, "");
const IS_NETLIFY_HOST = location.hostname.endsWith(".netlify.app") || Boolean(window.netlifyIdentity);
const API_BASE_URL = CONFIGURED_API_BASE_URL || (IS_NETLIFY_HOST ? "/.netlify/functions/api" : "");

const labels = [
  "Probable bloom, high confidence",
  "Probable bloom, guarded confidence",
  "Possible bloom",
  "Bloom unlikely, high confidence",
  "Not enough reliable information",
];

const demoLakes = [
  {
    id: 1,
    name: "Lake Erie Western Basin",
    state: "OH",
    geometry: "POLYGON((-83.5 41.3,-82.5 41.3,-82.5 42.0,-83.5 42.0,-83.5 41.3))",
    area_km2: 3200,
    shoreline_length_km: 510,
  },
  {
    id: 2,
    name: "Utah Lake",
    state: "UT",
    geometry: "POLYGON((-111.95 40.05,-111.65 40.05,-111.65 40.35,-111.95 40.35,-111.95 40.05))",
    area_km2: 380,
    shoreline_length_km: 121,
  },
  {
    id: 3,
    name: "Clear Lake",
    state: "CA",
    geometry: "POLYGON((-123.05 38.85,-122.55 38.85,-122.55 39.15,-123.05 39.15,-123.05 38.85))",
    area_km2: 180,
    shoreline_length_km: 160,
  },
  {
    id: 4,
    name: "Lake Okeechobee",
    state: "FL",
    geometry: "POLYGON((-81.15 26.75,-80.55 26.75,-80.55 27.25,-81.15 27.25,-81.15 26.75))",
    area_km2: 1890,
    shoreline_length_km: 216,
  },
  {
    id: 5,
    name: "Upper Klamath Lake",
    state: "OR",
    geometry: "POLYGON((-122.05 42.15,-121.65 42.15,-121.65 42.55,-122.05 42.55,-122.05 42.15))",
    area_km2: 249,
    shoreline_length_km: 145,
  },
];

const demoPredictions = {
  1: makePrediction(1, 1, 0.68, 0.71, labels[0], 0.82, 0.93, 0.86, 0.9, 0.78),
  2: makePrediction(2, 2, 0.57, 0.48, labels[2], 0.72, 0.79, 0.74, 0.81, 0.78),
  3: makePrediction(3, 3, 0.74, 0.42, labels[1], 0.64, 0.51, 0.8, 0.83, 0.78),
  4: makePrediction(4, 4, 0.31, 0.68, labels[3], 0.88, 0.94, 0.84, 0.91, 0.78),
  5: makePrediction(5, 5, 0.43, 0.22, labels[4], 0.46, 0.71, 0.7, 0.58, 0.78),
};

function makePrediction(id, lakeId, probability, confidence, label, cloud, shoreline, agreement, age, quality) {
  const factors = {
    cloud_quality: cloud,
    shoreline_risk: shoreline,
    model_agreement: agreement,
    data_age: age,
    label_quality: quality,
    observation_quality: cloud,
    model_quality: agreement,
    domain_quality: shoreline,
    time_quality: age,
  };
  return {
    id,
    lake_id: lakeId,
    scene_id: id,
    generated_at: new Date(Date.now() - lakeId * 86400000).toISOString(),
    bloom_probability: probability,
    confidence_score: confidence,
    confidence_factors_json: {
      ...factors,
      features: {
        ndwi: round(0.18 - lakeId * 0.02),
        ndci: round(0.12 + lakeId * 0.07),
        green_red_ratio: round(1.2 + lakeId * 0.18),
        green_nir_ratio: round(1.1 + lakeId * 0.12),
        red_nir_ratio: round(0.8 + lakeId * 0.04),
      },
    },
    model_version: "mvp-placeholder-0.1.0",
    label,
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function dateLabel(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

async function request(path, fallback) {
  if (!API_BASE_URL) return clone(fallback);
  try {
    const response = await fetch(apiUrl(path));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    console.warn(`Using demo data for ${path}`, error);
    return clone(fallback);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const api = {
  listLakes: () => request("/lakes", demoLakes),
  getLake: (id) => request(`/lakes/${id}`, demoLakes.find((lake) => lake.id === Number(id)) || demoLakes[0]),
  getLatest: (id) => request(`/lakes/${id}/latest`, demoPredictions[id] || demoPredictions[1]),
  getHistory: (id) => request(`/lakes/${id}/history`, makeHistory(Number(id))),
  explain: (id) => {
    const prediction = Object.values(demoPredictions).find((item) => item.id === Number(id)) || demoPredictions[1];
    const lake = demoLakes.find((item) => item.id === prediction.lake_id) || demoLakes[0];
    return request(`/predictions/${id}/explain`, {
      ...prediction,
      confidence_factors: factorsOnly(prediction),
      explanation: factorExplanation(factorsOnly(prediction)),
      screening_notice: "Satellite estimates do not replace official advisories or lab testing. This service estimates bloom likelihood and assessment confidence only; it does not detect toxins.",
      advisory: {
        label: `${lake.state} official water quality advisories`,
        url: "https://www.epa.gov/cyanohabs/state-resources-addressing-cyanobacterial-harmful-algal-blooms",
      },
    });
  },
  submitReport: async (payload) => {
    if (!API_BASE_URL) {
      return {
        ...payload,
        id: Math.floor(Math.random() * 9000) + 1000,
        submitted_at: new Date().toISOString(),
        review_status: "pending",
      };
    }
    const response = await fetch(apiUrl("/reports"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
};

function factorsOnly(prediction) {
  const { features, ...factors } = prediction.confidence_factors_json;
  return factors;
}

function apiUrl(path) {
  if (API_BASE_URL.includes("/.netlify/functions/api")) {
    return `${API_BASE_URL}?path=${encodeURIComponent(path)}`;
  }
  return `${API_BASE_URL}${path}`;
}

function factorExplanation(factors) {
  return [
    `Cloud quality contribution: ${factors.cloud_quality.toFixed(2)}.`,
    `Shoreline mixed-pixel reliability: ${factors.shoreline_risk.toFixed(2)}.`,
    `Model agreement contribution: ${factors.model_agreement.toFixed(2)}.`,
    `Recent clear-observation contribution: ${factors.data_age.toFixed(2)}.`,
    `Supporting label quality contribution: ${factors.label_quality.toFixed(2)}.`,
  ];
}

function makeHistory(lakeId) {
  const latest = demoPredictions[lakeId] || demoPredictions[1];
  return Array.from({ length: 8 }, (_, index) => {
    const drift = (index - 3) * 0.035;
    return {
      ...latest,
      id: lakeId * 100 + index,
      generated_at: new Date(Date.now() - (7 - index) * 86400000 * 4).toISOString(),
      bloom_probability: clamp(latest.bloom_probability + drift),
      confidence_score: clamp(latest.confidence_score - drift / 2),
    };
  });
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

const state = {
  lakes: [],
  selectedLakeId: 1,
  route: location.hash || "#/",
};

window.addEventListener("hashchange", () => {
  state.route = location.hash || "#/";
  render();
});

document.addEventListener("submit", async (event) => {
  if (event.target.matches("#report-form")) {
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = {
      lake_id: Number(form.get("lake_id")),
      lat: Number(form.get("lat")),
      lon: Number(form.get("lon")),
      photo_url: form.get("photo_url") || null,
      visual_category: form.get("visual_category"),
      notes: form.get("notes") || null,
    };
    const button = event.target.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Submitting...";
    try {
      const result = await api.submitReport(payload);
      document.querySelector("#report-result").innerHTML = `
        <div class="notice success">
          <strong>Report submitted for review.</strong>
          <span>Reference ${escapeHtml(result.id)} · Review status ${escapeHtml(result.review_status)}</span>
        </div>`;
      event.target.reset();
    } catch (error) {
      document.querySelector("#report-result").innerHTML = `
        <div class="notice error">
          <strong>Report could not be submitted.</strong>
          <span>${escapeHtml(error.message)}</span>
        </div>`;
    } finally {
      button.disabled = false;
      button.textContent = "Submit report";
    }
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("#lake-search")) {
    renderLakeResults(event.target.value);
  }
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-lake-id]");
  if (target) {
    state.selectedLakeId = Number(target.dataset.lakeId);
    location.hash = `#/lake/${state.selectedLakeId}`;
  }
});

async function init() {
  state.lakes = await api.listLakes();
  render();
}

async function render() {
  const app = document.querySelector("#app");
  app.innerHTML = shell();
  setActiveNav();
  if (state.route.startsWith("#/lake/")) {
    state.selectedLakeId = Number(state.route.split("/").pop()) || 1;
    await renderDashboard();
  } else if (state.route === "#/report") {
    renderReport();
  } else if (state.route === "#/about") {
    renderAbout();
  } else {
    renderHome();
  }
}

function shell() {
  return `
    <aside class="sidebar">
      <a class="brand" href="#/">
        <span class="brand-mark">LB</span>
        <span>
          <strong>Lake Bloom</strong>
          <small>Confidence</small>
        </span>
      </a>
      <nav>
        <a href="#/" data-route="#/">Lake Search</a>
        <a href="#/lake/${state.selectedLakeId}" data-route="#/lake">Dashboard</a>
        <a href="#/report" data-route="#/report">Report Bloom</a>
        <a href="#/about" data-route="#/about">About</a>
      </nav>
      <div class="sidebar-note">
        <span class="dot ${API_BASE_URL ? "online" : ""}"></span>
        ${API_BASE_URL ? "Connected to backend API" : "Demo data mode"}
      </div>
    </aside>
    <main class="main">
      <div id="page"></div>
    </main>`;
}

function setActiveNav() {
  document.querySelectorAll(".sidebar nav a").forEach((link) => {
    const route = link.dataset.route;
    link.classList.toggle("active", route === "#/lake" ? state.route.startsWith("#/lake/") : state.route === route);
  });
}

function renderHome() {
  document.querySelector("#page").innerHTML = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Remote-sensing screening</p>
        <h1>Lake Bloom Confidence</h1>
        <p class="lede">Search monitored lakes, review bloom likelihood, and compare the assessment confidence behind each estimate.</p>
      </div>
    </section>
    ${disclaimer()}
    <section class="search-panel">
      <label for="lake-search">Search lakes</label>
      <input id="lake-search" type="search" placeholder="Search by lake name or state" autocomplete="off" />
      <div id="lake-results" class="lake-results"></div>
    </section>
    <section class="info-strip">
      <div>
        <strong>Bloom likelihood</strong>
        <span>Probability from 0 to 1 based on bloom-like remote-sensing signals.</span>
      </div>
      <div>
        <strong>Assessment confidence</strong>
        <span>Reliability score from 0 to 1 based on data quality and model agreement.</span>
      </div>
      <div>
        <strong>Model boundary</strong>
        <span>Estimates support review; toxins require field or lab confirmation.</span>
      </div>
    </section>`;
  renderLakeResults("");
}

function renderLakeResults(query) {
  const needle = query.trim().toLowerCase();
  const lakes = state.lakes.filter((lake) => `${lake.name} ${lake.state}`.toLowerCase().includes(needle));
  document.querySelector("#lake-results").innerHTML = lakes.map((lake) => {
    const prediction = demoPredictions[lake.id] || demoPredictions[1];
    return `
      <button class="lake-row" data-lake-id="${lake.id}">
        <span>
          <strong>${escapeHtml(lake.name)}</strong>
          <small>${escapeHtml(lake.state)} · ${escapeHtml(String(lake.area_km2))} km²</small>
        </span>
        <span class="row-metrics">
          ${badge(prediction.label)}
          <span class="metric-mini">${pct(prediction.confidence_score)} confidence</span>
        </span>
      </button>`;
  }).join("") || `<div class="empty">No lakes match that search.</div>`;
}

async function renderDashboard() {
  const [lake, latest, history] = await Promise.all([
    api.getLake(state.selectedLakeId),
    api.getLatest(state.selectedLakeId),
    api.getHistory(state.selectedLakeId),
  ]);
  const explanation = await api.explain(latest.id);
  document.querySelector("#page").innerHTML = `
    <section class="page-header dashboard-header">
      <div>
        <p class="eyebrow">Lake dashboard</p>
        <h1>${escapeHtml(lake.name)}, ${escapeHtml(lake.state)}</h1>
        <p class="lede">Latest scene reviewed ${dateLabel(latest.generated_at)} · Model ${escapeHtml(latest.model_version)}</p>
      </div>
      ${badge(latest.label)}
    </section>
    ${disclaimer()}
    <section class="dashboard-grid">
      <article class="card map-card">
        <div class="card-head">
          <h2>Map Panel</h2>
          <span>Geometry preview</span>
        </div>
        <div class="map-visual">
          <div class="lake-shape"></div>
          <div class="scan-lines"></div>
        </div>
        <dl class="details-grid">
          <div><dt>Area</dt><dd>${lake.area_km2.toLocaleString()} km²</dd></div>
          <div><dt>Shoreline</dt><dd>${lake.shoreline_length_km.toLocaleString()} km</dd></div>
          <div><dt>Source</dt><dd>Satellite scene</dd></div>
        </dl>
      </article>
      <article class="card stat-card">
        <div class="card-head">
          <h2>Bloom Likelihood</h2>
          <span>0 to 1 probability</span>
        </div>
        <strong class="big-stat">${pct(latest.bloom_probability)}</strong>
        <div class="bar"><span style="width:${pct(latest.bloom_probability)}"></span></div>
        ${badge(latest.label)}
      </article>
      <article class="card stat-card">
        <div class="card-head">
          <h2>Assessment Confidence</h2>
          <span>Reliability score</span>
        </div>
        <div class="gauge" style="--value:${latest.confidence_score}">
          <span>${pct(latest.confidence_score)}</span>
        </div>
        <p class="muted">Confidence combines observation, model, domain, time, and label quality.</p>
      </article>
      <article class="card factors-card">
        <div class="card-head">
          <h2>Confidence Explanation</h2>
          <span>Factor breakdown</span>
        </div>
        ${factorList(explanation.confidence_factors)}
      </article>
      <article class="card timeline-card">
        <div class="card-head">
          <h2>Prediction Timeline</h2>
          <span>Bloom likelihood and confidence</span>
        </div>
        ${timeline(history)}
      </article>
      <article class="card advisory-card">
        <div class="card-head">
          <h2>Official Advisory</h2>
          <span>Field verification</span>
        </div>
        <p>Use local advisories and lab testing for public-health decisions.</p>
        <a class="button-link" href="${escapeAttr(explanation.advisory.url)}" target="_blank" rel="noreferrer">${escapeHtml(explanation.advisory.label)}</a>
      </article>
      <article class="card model-card">
        <div class="card-head">
          <h2>Model Boundary</h2>
          <span>Screening only</span>
        </div>
        <p>This app estimates bloom likelihood and assessment confidence; toxins require field or lab testing.</p>
      </article>
    </section>`;
}

function renderReport() {
  document.querySelector("#page").innerHTML = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Citizen observation</p>
        <h1>Report Bloom</h1>
        <p class="lede">Submit visual observations to support review; official advisories and lab testing remain authoritative.</p>
      </div>
    </section>
    ${disclaimer()}
    <section class="form-layout">
      <form id="report-form" class="card form-card">
        <label>Lake <span>required</span>
          <select name="lake_id" required>
            ${state.lakes.map((lake) => `<option value="${lake.id}">${escapeHtml(lake.name)}, ${escapeHtml(lake.state)}</option>`).join("")}
          </select>
        </label>
        <label>Photo URL
          <input name="photo_url" type="url" placeholder="https://example.com/photo.jpg" />
        </label>
        <label>Visual category <span>required</span>
          <select name="visual_category" required>
            <option value="surface scum">Surface scum</option>
            <option value="green streaks">Green streaks</option>
            <option value="discolored water">Discolored water</option>
            <option value="floating mats">Floating mats</option>
            <option value="other observation">Other observation</option>
          </select>
        </label>
        <div class="field-row">
          <label>Latitude <span>required</span>
            <input name="lat" type="number" step="0.000001" min="-90" max="90" required placeholder="41.720000" />
          </label>
          <label>Longitude <span>required</span>
            <input name="lon" type="number" step="0.000001" min="-180" max="180" required placeholder="-83.200000" />
          </label>
        </div>
        <label>Notes
          <textarea name="notes" rows="5" placeholder="Describe what you observed, where it was, and approximate time."></textarea>
        </label>
        <div class="privacy">
          Reports may include location and submitted media; avoid including people or private property details in photos.
        </div>
        <button class="primary-button" type="submit">Submit report</button>
      </form>
      <aside id="report-result" class="result-panel">
        <div class="notice">
          <strong>Review status will appear here.</strong>
          <span>Visual reports support review and do not confirm toxin presence.</span>
        </div>
      </aside>
    </section>`;
}

function renderAbout() {
  document.querySelector("#page").innerHTML = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Transparency</p>
        <h1>About Lake Bloom Confidence</h1>
        <p class="lede">A decision-support interface for separating bloom likelihood from assessment reliability.</p>
      </div>
    </section>
    ${disclaimer()}
    <section class="about-grid">
      ${aboutCard("Bloom likelihood vs assessment confidence", `
        <p><strong>Bloom likelihood</strong> is a probability from 0 to 1 estimating visual or remote-sensing bloom-like conditions.</p>
        <p><strong>Assessment confidence</strong> is a reliability score from 0 to 1 based on observation quality, model quality, domain quality, time quality, and label quality.</p>
      `)}
      ${aboutCard("Why toxins are not directly detected", `
        <p>Satellite sensors observe spectral conditions at the water surface, not toxin concentrations.</p>
        <p>Toxin risk requires official advisories, field sampling, and lab testing.</p>
      `)}
      ${aboutCard("Confidence factors", `
        <ul class="plain-list">
          <li><strong>Cloud quality:</strong> how clear the observation is.</li>
          <li><strong>Shoreline risk:</strong> mixed-pixel uncertainty near complex edges.</li>
          <li><strong>Model agreement:</strong> consistency across model estimates.</li>
          <li><strong>Data age:</strong> how recent the clear observation is.</li>
          <li><strong>Label quality:</strong> reliability of supporting reviewed labels.</li>
        </ul>
      `)}
      ${aboutCard("API transparency", `
        <ul class="code-list">
          <li>GET /lakes</li>
          <li>GET /lakes/{lake_id}/latest</li>
          <li>GET /lakes/{lake_id}/history</li>
          <li>GET /predictions/{prediction_id}/explain</li>
          <li>POST /reports</li>
          <li>GET /models/current</li>
        </ul>
      `)}
      ${aboutCard("Status label glossary", `
        <div class="glossary">
          ${labels.map((label) => badge(label)).join("")}
        </div>
        <p>Lower bloom likelihood does not replace official guidance or field verification.</p>
      `)}
    </section>`;
}

function aboutCard(title, body) {
  return `<article class="card about-card"><h2>${title}</h2>${body}</article>`;
}

function disclaimer() {
  return `
    <section class="notice disclaimer">
      <strong>Satellite estimates do not replace official advisories or lab testing.</strong>
      <span>This tool supports screening and review only.</span>
    </section>`;
}

function badge(label) {
  let tone = "unknown";
  if (label.includes("Probable bloom, high")) tone = "high";
  else if (label.includes("guarded")) tone = "guarded";
  else if (label.includes("Possible")) tone = "possible";
  else if (label.includes("unlikely")) tone = "low";
  return `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
}

function factorList(factors) {
  const rows = [
    ["Cloud quality", factors.cloud_quality, "Clearer observations increase reliability."],
    ["Shoreline risk", factors.shoreline_risk, "Lower mixed-pixel risk improves confidence."],
    ["Model agreement", factors.model_agreement, "Agreement across estimates improves confidence."],
    ["Data age", factors.data_age, "Recent clear observations carry more weight."],
    ["Label quality", factors.label_quality, "Reviewed support labels improve trust."],
  ];
  return rows.map(([name, value, text]) => `
    <div class="factor-row">
      <div>
        <strong>${name}</strong>
        <span>${text}</span>
      </div>
      <div class="factor-score">${pct(value)}</div>
      <div class="bar"><span style="width:${pct(value)}"></span></div>
    </div>`).join("");
}

function timeline(history) {
  const max = 1;
  return `
    <div class="chart">
      ${history.map((item) => `
        <div class="chart-col">
          <span class="confidence" style="height:${Math.max(10, item.confidence_score / max * 120)}px"></span>
          <span class="likelihood" style="height:${Math.max(10, item.bloom_probability / max * 120)}px"></span>
          <small>${dateLabel(item.generated_at)}</small>
        </div>`).join("")}
    </div>
    <div class="legend">
      <span><i class="likelihood-dot"></i> Bloom likelihood</span>
      <span><i class="confidence-dot"></i> Assessment confidence</span>
    </div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

init();
