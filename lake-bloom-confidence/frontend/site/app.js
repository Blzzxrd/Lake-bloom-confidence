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

const advisoryLinks = {
  OH: {
    label: "Ohio HAB advisories and monitoring",
    url: "https://www.ohioalgaeinfo.com/",
  },
};

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
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
  createLake: async (payload) => {
    if (!API_BASE_URL) {
      throw new Error("Backend lake verification is required before a new dashboard can be created.");
    }
    const response = await fetch(apiUrl("/lakes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(await apiErrorMessage(response));
    }
    return response.json();
  },
  lookupLakes: async (query, selectedState) => {
    if (!API_BASE_URL) return [];
    const params = new URLSearchParams({ q: query, state: selectedState });
    const response = await fetch(apiUrl(`/lakes/lookup?${params.toString()}`));
    if (!response.ok) throw new Error(await apiErrorMessage(response));
    return response.json();
  },
  getLake: (id) => request(`/lakes/${id}`, state.lakes.find((lake) => lake.id === Number(id)) || demoLakes.find((lake) => lake.id === Number(id)) || demoLakes[0]),
  getLatest: (id) => request(`/lakes/${id}/latest`, demoPredictions[id] || demoPredictions[1]),
  getHistory: (id) => request(`/lakes/${id}/history`, makeHistory(Number(id))),
  explain: (id) => {
    const prediction = Object.values(demoPredictions).find((item) => item.id === Number(id)) || demoPredictions[1];
    const lake = state.lakes.find((item) => item.id === prediction.lake_id) || demoLakes.find((item) => item.id === prediction.lake_id) || demoLakes[0];
    const advisory = advisoryLinks[lake.state] || {
      label: `${lake.state} official water quality advisories`,
      url: "https://www.epa.gov/habs/hab-advisories",
    };
    return request(`/predictions/${id}/explain`, {
      ...prediction,
      confidence_factors: factorsOnly(prediction),
      explanation: factorExplanation(factorsOnly(prediction)),
      screening_notice: "Satellite estimates do not replace official advisories or lab testing. This service estimates bloom likelihood and assessment confidence only; it does not detect toxins.",
      advisory,
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

async function apiErrorMessage(response) {
  const text = await response.text();
  try {
    const payload = JSON.parse(text);
    if (payload.detail) return typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
  } catch (error) {
    return text || `HTTP ${response.status}`;
  }
  return text || `HTTP ${response.status}`;
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
  selectedSearchState: "MN",
  lookup: {
    query: "",
    candidates: [],
    loading: false,
    searched: false,
    error: "",
  },
  route: location.hash || "#/",
};

let lookupTimer = null;

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
    scheduleLakeLookup(event.target.value);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("#lake-state")) {
    state.selectedSearchState = event.target.value;
    scheduleLakeLookup(document.querySelector("#lake-search")?.value || "");
  }
});

document.addEventListener("click", (event) => {
  const candidateTarget = event.target.closest("[data-lookup-index]");
  if (candidateTarget) {
    createVerifiedLake(Number(candidateTarget.dataset.lookupIndex), candidateTarget);
    return;
  }

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
        <a href="#/report" data-route="#/report">Report possible bloom</a>
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
    <section class="page-header hero-panel">
      <div>
        <p class="eyebrow">Confidence-aware bloom assessment</p>
        <h1>Lake Bloom Confidence</h1>
        <p class="subtitle">Confidence-aware satellite bloom assessment for lakes.</p>
        <p class="lede">Satellite bloom maps can be uncertain because of clouds, shoreline interference, sensor limits, and missing field data. This app shows both bloom likelihood and assessment confidence.</p>
      </div>
    </section>
    ${disclaimer()}
    <section class="feature-grid">
      <article class="feature-card">
        <h2>Bloom Likelihood</h2>
        <p>Satellite-based screening estimates whether current signals resemble bloom-like conditions.</p>
      </article>
      <article class="feature-card confidence-feature">
        <h2>Assessment Confidence</h2>
        <p>Confidence-aware bloom assessment explains how reliable the estimate is before decisions are made.</p>
      </article>
      <article class="feature-card">
        <h2>Official Advisory Context</h2>
        <p>Results are framed beside official advisory links because this is screening, not official health advice.</p>
      </article>
    </section>
    <section class="search-panel">
      <div class="search-controls">
        <label for="lake-search">Lake name</label>
        <input id="lake-search" type="search" placeholder="Search verified U.S. lakes" autocomplete="off" />
        <label for="lake-state">State</label>
        <select id="lake-state">
          ${usStates.map((code) => `<option value="${code}" ${code === state.selectedSearchState ? "selected" : ""}>${code}</option>`).join("")}
        </select>
      </div>
      <div id="lake-results" class="lake-results"></div>
    </section>
    <section class="info-strip">
      <div>
        <strong>Uncertainty-aware monitoring</strong>
        <span>Clouds, mixed shoreline pixels, and sensor limits can reduce reliability.</span>
      </div>
      <div>
        <strong>Field verification recommended</strong>
        <span>Lower-confidence results should be checked against field observations and advisories.</span>
      </div>
      <div>
        <strong>Screening boundary</strong>
        <span>Satellites estimate bloom-like surface signals; toxin questions require official testing.</span>
      </div>
    </section>
    <section class="science-section">
      <div class="section-heading">
        <p class="eyebrow">Why confidence matters</p>
        <h2>Most public bloom maps do not expose uncertainty. Lake Bloom Confidence makes uncertainty visible.</h2>
      </div>
      <div class="uncertainty-grid">
        ${uncertaintyCard("Cloud contamination", "Clouds and haze can mask water reflectance signals.", "☁")}
        ${uncertaintyCard("Shoreline interference", "Mixed land-water pixels can distort small coves and edges.", "◒")}
        ${uncertaintyCard("Small lake resolution limits", "Sensor pixel size matters for narrow or complex lakes.", "▦")}
        ${uncertaintyCard("Missing field measurements", "Sparse labels reduce calibration confidence.", "⌁")}
        ${uncertaintyCard("Changing conditions", "Wind, rain, and circulation can shift surface patterns quickly.", "↝")}
        ${uncertaintyCard("Model disagreement", "Different signals may not point to the same conclusion.", "≋")}
      </div>
    </section>
    <section class="workflow-section">
      <div class="section-heading">
        <p class="eyebrow">How the system works</p>
        <h2>From imagery to verification guidance</h2>
      </div>
      <div class="workflow-grid">
        ${workflowStep("1", "Satellite imagery ingestion", "Collect recent surface observations.", "Metadata: sensor, acquisition time, cloud cover, image age.")}
        ${workflowStep("2", "Bloom signal analysis", "Screen for bloom-like spectral patterns.", "Features: NDCI, NDWI, green/red/NIR ratios.")}
        ${workflowStep("3", "Confidence evaluation", "Estimate reliability before interpretation.", "Factors: clouds, shoreline pixels, model agreement, data age.")}
        ${workflowStep("4", "Advisory + verification guidance", "Place screening results beside official context.", "Output: status label, uncertainty reason, field verification prompt.")}
      </div>
    </section>
    <section class="live-demo card">
      <div>
        <p class="eyebrow">Live confidence demo</p>
        <h2>Lake Hopatcong example</h2>
        <p>Bloom likelihood is only half the story. The confidence score explains how carefully to use the estimate.</p>
      </div>
      <div class="demo-metrics">
        <div class="demo-ring" style="--value:0.61"><span>61%</span><small>Assessment confidence</small></div>
        <div class="demo-readout">
          <strong>Bloom likelihood: 72%</strong>
          <span>Main uncertainty: mixed shoreline pixels</span>
          <span>Recommended action: field verification recommended</span>
          <details>
            <summary>Expandable explanation</summary>
            <p>Elevated bloom-like signal is present, but shoreline complexity and limited field labels reduce reliability.</p>
          </details>
        </div>
      </div>
    </section>`;
  renderLakeResults("");
}

function uncertaintyCard(title, body, icon) {
  return `<article class="uncertainty-card"><span>${icon}</span><strong>${title}</strong><p>${body}</p></article>`;
}

function workflowStep(step, title, body, detail) {
  return `<article class="workflow-card" title="${escapeAttr(detail)}"><span>${step}</span><strong>${title}</strong><p>${body}</p><small>${detail}</small></article>`;
}

function renderLakeResults(query) {
  const needle = query.trim().toLowerCase();
  const lakes = state.lakes.filter((lake) => {
    const nameMatch = `${lake.name} ${lake.state}`.toLowerCase().includes(needle);
    const stateMatch = !state.selectedSearchState || lake.state === state.selectedSearchState;
    return nameMatch && stateMatch;
  });
  const rows = lakes.map((lake) => {
    const prediction = demoPredictions[lake.id] || demoPredictions[1];
    return `
      <button class="lake-row" data-lake-id="${lake.id}">
        <span>
          <strong>${escapeHtml(lake.name)}</strong>
          <small>${escapeHtml(lake.state)} / ${escapeHtml(String(lake.area_km2))} km2</small>
        </span>
        <span class="row-metrics">
          ${badge(prediction.label)}
          <span class="metric-mini">${pct(prediction.confidence_score)} confidence</span>
        </span>
      </button>`;
  }).join("");
  const lookupMatches = state.lookup.query === needle
    ? state.lookup.candidates
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ candidate }) => !state.lakes.some((lake) => lake.name.toLowerCase() === candidate.name.toLowerCase() && lake.state === candidate.state))
    : [];
  const suggestions = lookupMatches.map(({ candidate, index }) => `
    <button class="lake-row candidate-row" data-lookup-index="${index}" type="button">
      <span>
        <strong>${escapeHtml(candidate.name)}</strong>
        <small>${escapeHtml(candidate.display_name || `${candidate.name}, ${candidate.state}`)}</small>
      </span>
      <span class="row-metrics">
        <span class="metric-mini verified">Verified match</span>
        <span class="metric-mini">${escapeHtml(candidate.state)}</span>
      </span>
    </button>`).join("");
  const status = lakeLookupStatus(needle, rows, suggestions);
  document.querySelector("#lake-results").innerHTML = [rows, suggestions, status].filter(Boolean).join("");
}

function lakeLookupStatus(needle, rows, suggestions) {
  if (needle.length < 2) {
    return `<div class="empty">Start typing a lake name. New dashboards require a verified lake match.</div>`;
  }
  if (state.lookup.loading) {
    return `<div class="lookup-status">Checking verified lake sources...</div>`;
  }
  if (state.lookup.error) {
    return `<div class="notice error"><strong>Lake lookup is unavailable.</strong><span>${escapeHtml(state.lookup.error)}</span></div>`;
  }
  if (!API_BASE_URL && !rows) {
    return `<div class="empty">Demo mode can only open seeded lakes. Connect the backend to verify additional U.S. lakes.</div>`;
  }
  if (!rows && !suggestions && state.lookup.searched) {
    return `
      <div class="notice error">
        <strong>No verified lake match found.</strong>
        <span>Try the official lake name and state. Lake Bloom Confidence will not create an assessment for an unverified or non-real lake.</span>
      </div>`;
  }
  return "";
}

function scheduleLakeLookup(query) {
  const cleanQuery = query.trim();
  state.lookup.query = cleanQuery.toLowerCase();
  state.lookup.error = "";
  state.lookup.candidates = [];
  state.lookup.searched = false;
  if (lookupTimer) clearTimeout(lookupTimer);
  if (cleanQuery.length < 2) {
    state.lookup.loading = false;
    renderLakeResults(query);
    return;
  }
  state.lookup.loading = Boolean(API_BASE_URL);
  state.lookup.searched = !API_BASE_URL;
  renderLakeResults(query);
  if (!API_BASE_URL) return;
  lookupTimer = setTimeout(async () => {
    const activeQuery = cleanQuery;
    try {
      const candidates = await api.lookupLakes(activeQuery, state.selectedSearchState);
      if (state.lookup.query !== activeQuery.toLowerCase()) return;
      state.lookup.candidates = candidates;
      state.lookup.searched = true;
    } catch (error) {
      if (state.lookup.query !== activeQuery.toLowerCase()) return;
      state.lookup.error = error.message;
      state.lookup.searched = true;
    } finally {
      if (state.lookup.query === activeQuery.toLowerCase()) {
        state.lookup.loading = false;
        renderLakeResults(document.querySelector("#lake-search")?.value || "");
      }
    }
  }, 280);
}

async function createVerifiedLake(candidateIndex, button) {
  const candidate = state.lookup.candidates[candidateIndex];
  if (!candidate) return;
  button.disabled = true;
  button.classList.add("loading");
  try {
    const lake = await api.createLake(candidate);
    if (!state.lakes.some((item) => item.id === lake.id)) {
      state.lakes.push(lake);
      state.lakes.sort((a, b) => a.name.localeCompare(b.name));
    }
    state.selectedLakeId = lake.id;
    location.hash = `#/lake/${lake.id}`;
  } catch (error) {
    document.querySelector("#lake-results").innerHTML = `
      <div class="notice error">
        <strong>Could not create that verified lake dashboard.</strong>
        <span>${escapeHtml(error.message)}</span>
      </div>`;
  }
}
async function renderDashboard() {
  const [lake, latest, history] = await Promise.all([
    api.getLake(state.selectedLakeId),
    api.getLatest(state.selectedLakeId),
    api.getHistory(state.selectedLakeId),
  ]);
  const explanation = await api.explain(latest.id);
  const factors = normalizeConfidenceFactors(explanation.confidence_factors);
  const warnings = confidenceWarnings(latest, factors);
  const why = whyEstimate(latest, factors);
  document.querySelector("#page").innerHTML = `
    <section class="page-header dashboard-header">
      <div>
        <p class="eyebrow">Confidence-aware dashboard</p>
        <h1>${escapeHtml(lake.name)}, ${escapeHtml(lake.state)}</h1>
        <p class="lede">The bloom likelihood and assessment confidence should be interpreted together before using this screening result.</p>
        <p class="lede">Latest scene reviewed ${dateLabel(latest.generated_at)} · Model ${escapeHtml(latest.model_version)}</p>
      </div>
      ${badge(latest.label)}
    </section>
    ${disclaimer()}
    ${warnings.length ? `<section class="warning-strip">${warnings.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</section>` : ""}
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
      <article class="card stat-card primary-metric">
        <div class="card-head">
          <h2>Bloom Likelihood</h2>
          <span>Satellite-based screening</span>
        </div>
        <strong class="big-stat">${pct(latest.bloom_probability)}</strong>
        <div class="bar"><span style="width:${pct(latest.bloom_probability)}"></span></div>
        ${badge(latest.label)}
      </article>
      <article class="card stat-card primary-metric confidence-card">
        <div class="card-head">
          <h2>Assessment Confidence</h2>
          <span>Estimate reliability</span>
        </div>
        <div class="gauge" style="--value:${latest.confidence_score}">
          <span>${pct(latest.confidence_score)}</span>
        </div>
        <p class="muted">Confidence is central: it describes how much trust to place in the bloom likelihood estimate.</p>
      </article>
      <article class="card why-card">
        <div class="card-head">
          <h2>Why This Estimate?</h2>
          <span>Interpretation guide</span>
        </div>
        <dl class="why-list">
          <div><dt>Recent satellite signal</dt><dd>${escapeHtml(why.signal)}</dd></div>
          <div><dt>Possible bloom pattern</dt><dd>${escapeHtml(why.pattern)}</dd></div>
          <div><dt>Main uncertainty reason</dt><dd>${escapeHtml(why.uncertainty)}</dd></div>
          <div><dt>Field verification</dt><dd>${escapeHtml(why.verification)}</dd></div>
        </dl>
        <a class="button-link subtle-button" href="#/report">Report possible bloom</a>
      </article>
      <article class="card factors-card">
        <div class="card-head">
          <h2>Confidence Breakdown</h2>
          <span>Reliability factors</span>
        </div>
        ${factorList(factors)}
      </article>
      <article class="card timeline-card">
        <div class="card-head">
          <h2>Prediction Timeline</h2>
          <span>Bloom likelihood and assessment confidence</span>
        </div>
        ${timeline(history)}
      </article>
      <article class="card uncertainty-card-wide">
        <div class="card-head">
          <h2>Main Sources of Uncertainty</h2>
          <span>Reliability limitations</span>
        </div>
        ${uncertaintyList(latest, factors, lake)}
      </article>
      <article class="card explainability-card">
        <div class="card-head">
          <h2>Explainability Module</h2>
          <span>Feature contribution</span>
        </div>
        ${featureImportance(latest)}
      </article>
      <article class="card temporal-card">
        <div class="card-head">
          <h2>Temporal Analytics</h2>
          <span>Unstable periods</span>
        </div>
        ${temporalAnalytics(history)}
      </article>
      <article class="card advisory-card">
        <div class="card-head">
          <h2>Official Advisory Status</h2>
          <span>Comparison context</span>
        </div>
        <div class="advisory-status">
          <span>No advisory data connected</span>
          <small>Compare official status against bloom likelihood and confidence when available.</small>
        </div>
        <p>Satellite assessments do not replace official advisories.</p>
        <a class="button-link" href="${escapeAttr(explanation.advisory.url)}" target="_blank" rel="noreferrer">${escapeHtml(explanation.advisory.label)}</a>
      </article>
      <article class="card model-card">
        <div class="card-head">
          <h2>Field Verification System</h2>
          <span>Human observations reduce uncertainty</span>
        </div>
        <p>When confidence is guarded, shoreline photos and volunteer observations help reduce uncertainty.</p>
        <a class="button-link subtle-button" href="#/report">Report possible bloom</a>
      </article>
    </section>`;
}

function renderReport() {
  document.querySelector("#page").innerHTML = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Citizen observation</p>
        <h1>Report possible bloom</h1>
        <p class="lede">Submit visual observations to support confidence-aware bloom assessment. Official advisories and lab testing remain authoritative.</p>
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
        <label>Photo upload
          <input name="photo_file" type="file" accept="image/*" />
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
        <label>Water color
          <select name="water_color">
            <option value="green">Green</option>
            <option value="blue green">Blue-green</option>
            <option value="brown">Brown</option>
            <option value="reddish">Reddish</option>
            <option value="unclear">Unclear</option>
          </select>
        </label>
        <label>Smell
          <select name="smell">
            <option value="none noticed">None noticed</option>
            <option value="earthy">Earthy</option>
            <option value="musty">Musty</option>
            <option value="sewage like">Sewage-like</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>Surface texture
          <select name="surface_texture">
            <option value="streaks">Streaks</option>
            <option value="scum">Surface scum</option>
            <option value="paint like">Paint-like film</option>
            <option value="floating mats">Floating mats</option>
            <option value="normal">No obvious surface texture</option>
          </select>
        </label>
        <label>Weather notes
          <input name="weather_notes" type="text" placeholder="Recent rain, calm wind, heat, or cloud conditions" />
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
          Reports may include location and submitted media. Avoid including people or private property details in photos. Uploaded images should be stripped of precise EXIF metadata before storage; public displays should use coarse location protection.
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

function normalizeConfidenceFactors(factors) {
  return {
    cloud_quality: factors.cloud_quality ?? factors.observation_quality ?? 0.5,
    shoreline_interference: factors.shoreline_risk ?? factors.domain_quality ?? 0.5,
    data_freshness: factors.data_age ?? factors.time_quality ?? 0.5,
    sensor_model_agreement: factors.model_agreement ?? factors.model_quality ?? 0.5,
    historical_consistency: factors.label_quality ?? 0.5,
    model_certainty: factors.model_quality ?? factors.model_agreement ?? 0.5,
    lake_size_suitability: factors.domain_quality ?? factors.shoreline_risk ?? 0.5,
  };
}

function confidenceWarnings(prediction, factors) {
  const warnings = [];
  if (prediction.confidence_score < 0.55) warnings.push("Field verification recommended");
  if (factors.data_freshness < 0.65) warnings.push("Recent imagery is limited");
  if (factors.cloud_quality < 0.7) warnings.push("Cloud cover may reduce reliability");
  if (factors.shoreline_interference < 0.75) warnings.push("Shoreline pixels may affect the estimate");
  return warnings;
}

function whyEstimate(prediction, factors) {
  const likely = prediction.bloom_probability >= 0.65;
  const possible = prediction.bloom_probability >= 0.35;
  const uncertaintyEntries = [
    ["cloud cover", factors.cloud_quality],
    ["shoreline interference", factors.shoreline_interference],
    ["data freshness", factors.data_freshness],
    ["sensor/model agreement", factors.sensor_model_agreement],
    ["historical consistency", factors.historical_consistency],
  ].sort((a, b) => a[1] - b[1]);
  return {
    signal: likely ? "Recent satellite signal is elevated." : possible ? "Recent satellite signal is mixed." : "Recent satellite signal is limited or low.",
    pattern: likely ? "Possible bloom pattern is present." : possible ? "Some bloom-like pattern is possible." : "Bloom-like pattern is not prominent in the screening estimate.",
    uncertainty: `${uncertaintyEntries[0][0]} is the main confidence limiter.`,
    verification: prediction.confidence_score < 0.65 ? "Field verification recommended." : "Continue checking official advisories and local observations.",
  };
}

function factorList(factors) {
  const rows = [
    ["Cloud quality", factors.cloud_quality, "Clearer observations increase reliability."],
    ["Shoreline interference", factors.shoreline_interference, "Lower mixed-pixel interference improves confidence."],
    ["Data freshness", factors.data_freshness, "Recent clear observations carry more weight."],
    ["Sensor agreement", factors.sensor_model_agreement, "Agreement across satellite signals improves confidence."],
    ["Historical consistency", factors.historical_consistency, "Consistency with reviewed patterns improves trust."],
    ["Model certainty", factors.model_certainty, "Stable model outputs improve reliability."],
    ["Lake size suitability", factors.lake_size_suitability, "Larger, less complex lakes are easier to assess from orbit."],
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

function uncertaintyList(prediction, factors, lake) {
  const items = [];
  if (factors.cloud_quality < 0.7) items.push(["Cloud cover may reduce reliability.", "Cloud quality is below the preferred screening threshold."]);
  if (factors.shoreline_interference < 0.75) items.push(["Shoreline pixels may affect the estimate.", "Mixed land-water pixels can distort reflectance near edges."]);
  if (factors.data_freshness < 0.65) items.push(["Recent imagery is limited.", "The most reliable clear observation is aging."]);
  if (factors.sensor_model_agreement < 0.7) items.push(["Sensor outputs may disagree.", "Spectral indicators are not fully aligned."]);
  if (lake.area_km2 < 5) items.push(["Lake size near satellite resolution threshold.", "Small water bodies can be difficult to separate from surrounding land."]);
  if (!items.length) items.push(["No dominant uncertainty source detected.", "Continue to compare with official advisories and field observations."]);
  if (prediction.confidence_score < 0.65) items.push(["Field verification recommended.", "Human observations can reduce uncertainty for this screening estimate."]);
  return `<div class="uncertainty-list">${items.map(([title, body]) => `<div><strong>${title}</strong><span>${body}</span></div>`).join("")}</div>`;
}

function featureImportance(prediction) {
  const rows = [
    ["Elevated NDCI signal detected", prediction.bloom_probability * 0.86],
    ["Reflectance resembles historical bloom events", prediction.bloom_probability * 0.74],
    ["Surface temperature context placeholder", 0.58],
    ["Recent calm wind context placeholder", 0.52],
  ];
  return `<details open class="science-details">
    <summary>Scientific detail</summary>
    <div class="importance-bars">
      ${rows.map(([label, value]) => `<div><span>${label}</span><i><b style="width:${pct(clamp(value))}"></b></i><strong>${pct(clamp(value))}</strong></div>`).join("")}
    </div>
  </details>`;
}

function temporalAnalytics(history) {
  return `<div class="temporal-grid">
    <div><strong>Bloom likelihood timeline</strong><span>${pct(history.at(-1)?.bloom_probability ?? 0)} latest</span></div>
    <div><strong>Confidence timeline</strong><span>${pct(history.at(-1)?.confidence_score ?? 0)} latest</span></div>
    <div><strong>Cloud contamination timeline</strong><span>Modeled from scene quality</span></div>
  </div>
  <p class="muted">Hoverable date-level analytics can be connected when full scene history is available.</p>`;
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
