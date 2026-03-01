(function () {
  "use strict";

  var script = document.currentScript;
  var apiKey = script.getAttribute("data-api-key");
  var widgetId = script.getAttribute("data-widget-id");
  var baseUrl = script.src.replace(/\/widget\/sosafe-catalog\.js.*$/, "");

  if (!apiKey) {
    console.error("[SO'SAFE Widget] data-api-key est requis");
    return;
  }

  var container = document.getElementById("sosafe-catalog");
  if (!container) {
    console.error("[SO'SAFE Widget] Element #sosafe-catalog introuvable");
    return;
  }

  // Shadow DOM for CSS isolation
  var shadow = container.attachShadow({ mode: "open" });

  var defaultTheme = {
    primaryColor: "#2563eb",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "8px",
  };

  function buildStyles(theme) {
    var t = Object.assign({}, defaultTheme, theme || {});
    return (
      "*{box-sizing:border-box;margin:0;padding:0}" +
      ".sosafe-widget{font-family:" + t.fontFamily + ";color:#1f2937;max-width:900px;margin:0 auto}" +
      ".sosafe-title{font-size:1.5rem;font-weight:700;margin-bottom:1rem;color:#111827}" +
      ".sosafe-filters{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}" +
      ".sosafe-filter-btn{padding:.4rem .8rem;border:1px solid #d1d5db;border-radius:" + t.borderRadius + ";background:#fff;cursor:pointer;font-size:.85rem;transition:all .2s}" +
      ".sosafe-filter-btn:hover,.sosafe-filter-btn.active{background:" + t.primaryColor + ";color:#fff;border-color:" + t.primaryColor + "}" +
      ".sosafe-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}" +
      ".sosafe-card{border:1px solid #e5e7eb;border-radius:" + t.borderRadius + ";padding:1.2rem;background:#fff;transition:box-shadow .2s}" +
      ".sosafe-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}" +
      ".sosafe-card-category{font-size:.75rem;text-transform:uppercase;color:" + t.primaryColor + ";font-weight:600;margin-bottom:.4rem}" +
      ".sosafe-card-title{font-size:1rem;font-weight:600;color:#111827;margin-bottom:.6rem}" +
      ".sosafe-card-info{font-size:.85rem;color:#6b7280;margin-bottom:.3rem;display:flex;align-items:center;gap:.3rem}" +
      ".sosafe-card-footer{display:flex;justify-content:space-between;align-items:center;margin-top:.8rem;padding-top:.8rem;border-top:1px solid #f3f4f6}" +
      ".sosafe-spots{font-size:.8rem;font-weight:500}" +
      ".sosafe-spots.available{color:#059669}" +
      ".sosafe-spots.full{color:#dc2626}" +
      ".sosafe-btn{display:inline-block;padding:.5rem 1rem;background:" + t.primaryColor + ";color:#fff;text-decoration:none;border-radius:" + t.borderRadius + ";font-size:.85rem;font-weight:500;border:none;cursor:pointer;transition:opacity .2s}" +
      ".sosafe-btn:hover{opacity:.9}" +
      ".sosafe-btn:disabled,.sosafe-btn.disabled{opacity:.5;cursor:not-allowed}" +
      ".sosafe-loading{text-align:center;padding:2rem;color:#9ca3af}" +
      ".sosafe-error{text-align:center;padding:2rem;color:#dc2626}" +
      ".sosafe-empty{text-align:center;padding:2rem;color:#6b7280}" +
      "@media(max-width:600px){.sosafe-grid{grid-template-columns:1fr}}"
    );
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  function render(sessions, theme, config) {
    var html = '<div class="sosafe-widget">';
    html += '<h2 class="sosafe-title">Nos formations</h2>';

    // Filters
    if (config.showFilters !== false) {
      var categories = [];
      sessions.forEach(function (s) {
        if (s.programCategory && categories.indexOf(s.programCategory) === -1) {
          categories.push(s.programCategory);
        }
      });
      if (categories.length > 1) {
        html += '<div class="sosafe-filters">';
        html += '<button class="sosafe-filter-btn active" data-cat="all">Toutes</button>';
        categories.forEach(function (cat) {
          html += '<button class="sosafe-filter-btn" data-cat="' + cat + '">' + cat + "</button>";
        });
        html += "</div>";
      }
    }

    var maxItems = config.maxItems || 50;
    var displayed = sessions.slice(0, maxItems);

    html += '<div class="sosafe-grid">';
    displayed.forEach(function (s) {
      html += '<div class="sosafe-card" data-category="' + (s.programCategory || "") + '">';
      if (s.programCategory) {
        html += '<div class="sosafe-card-category">' + s.programCategory + "</div>";
      }
      html += '<div class="sosafe-card-title">' + (s.programTitle || "Formation") + "</div>";
      if (s.startDate) {
        html += '<div class="sosafe-card-info">&#128197; ' + formatDate(s.startDate);
        if (s.endDate && s.endDate !== s.startDate) {
          html += " - " + formatDate(s.endDate);
        }
        html += "</div>";
      }
      if (s.location) {
        html += '<div class="sosafe-card-info">&#128205; ' + s.location + "</div>";
      }
      if (s.duration) {
        html += '<div class="sosafe-card-info">&#9200; ' + s.duration + "</div>";
      }
      html += '<div class="sosafe-card-footer">';
      if (s.isFull) {
        html += '<span class="sosafe-spots full">Complet</span>';
        html += '<button class="sosafe-btn disabled" disabled>Complet</button>';
      } else {
        html +=
          '<span class="sosafe-spots available">' +
          s.remainingSpots +
          " place" +
          (s.remainingSpots > 1 ? "s" : "") +
          " restante" +
          (s.remainingSpots > 1 ? "s" : "") +
          "</span>";
        html +=
          '<a class="sosafe-btn" href="' +
          baseUrl +
          "/inscription?sessionId=" +
          s.id +
          '" target="_blank" rel="noopener">S\'inscrire</a>';
      }
      html += "</div></div>";
    });
    html += "</div></div>";
    return html;
  }

  function setupFilters(root) {
    var btns = root.querySelectorAll(".sosafe-filter-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var cat = btn.getAttribute("data-cat");
        var cards = root.querySelectorAll(".sosafe-card");
        cards.forEach(function (card) {
          if (cat === "all" || card.getAttribute("data-category") === cat) {
            card.style.display = "";
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  }

  function fetchData() {
    var headers = { "X-API-Key": apiKey };
    var configPromise = widgetId
      ? fetch(baseUrl + "/api/v1/widget/config?widgetId=" + widgetId, { headers: headers }).then(function (r) {
          return r.ok ? r.json() : {};
        })
      : Promise.resolve({});

    var sessionsPromise = fetch(baseUrl + "/api/v1/catalog/sessions", { headers: headers }).then(function (r) {
      if (!r.ok) throw new Error("Erreur " + r.status);
      return r.json();
    });

    Promise.all([configPromise, sessionsPromise])
      .then(function (results) {
        var config = results[0];
        var sessions = results[1];
        var style = document.createElement("style");
        style.textContent = buildStyles(config.theme);
        shadow.innerHTML = "";
        shadow.appendChild(style);
        var wrapper = document.createElement("div");
        wrapper.innerHTML = render(sessions, config.theme, config);
        shadow.appendChild(wrapper);
        setupFilters(shadow);
      })
      .catch(function (err) {
        shadow.innerHTML = "";
        var style = document.createElement("style");
        style.textContent = buildStyles(null);
        shadow.appendChild(style);
        var div = document.createElement("div");
        div.innerHTML = '<div class="sosafe-error">Impossible de charger les formations.</div>';
        shadow.appendChild(div);
        console.error("[SO'SAFE Widget]", err);
      });
  }

  // Initial load
  shadow.innerHTML = '<div style="text-align:center;padding:2rem;color:#9ca3af">Chargement des formations...</div>';
  fetchData();

  // Auto-refresh every 5 minutes
  setInterval(fetchData, 5 * 60 * 1000);
})();
