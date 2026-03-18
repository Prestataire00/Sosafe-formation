(function () {
  "use strict";

  var script = document.currentScript;
  var apiKey = script.getAttribute("data-api-key");
  var widgetId = script.getAttribute("data-widget-id");
  var baseUrl = script.src.replace(/\/widget\/sosafe-catalog\.js.*$/, "");
  var enrollUrl = script.getAttribute("data-enroll-url") || (baseUrl + "/inscription");

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
      ":host{display:block}" +
      ".sosafe-widget{font-family:" + t.fontFamily + ";color:#1f2937;max-width:1100px;margin:0 auto}" +
      ".sosafe-filters{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap}" +
      ".sosafe-filter-btn{padding:.5rem 1rem;border:1px solid #d1d5db;border-radius:" + t.borderRadius + ";background:#fff;cursor:pointer;font-size:.85rem;font-weight:500;transition:all .2s}" +
      ".sosafe-filter-btn:hover,.sosafe-filter-btn.active{background:" + t.primaryColor + ";color:#fff;border-color:" + t.primaryColor + "}" +
      ".sosafe-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.2rem}" +
      ".sosafe-card{border:1px solid #e5e7eb;border-radius:" + t.borderRadius + ";background:#fff;overflow:hidden;transition:box-shadow .2s,transform .15s}" +
      ".sosafe-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.1);transform:translateY(-2px)}" +
      ".sosafe-card-body{padding:1.2rem}" +
      ".sosafe-card-badges{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.6rem}" +
      ".sosafe-badge{font-size:.7rem;text-transform:uppercase;letter-spacing:.03em;padding:.2rem .6rem;border-radius:100px;font-weight:600}" +
      ".sosafe-badge-cat{background:" + t.primaryColor + "15;color:" + t.primaryColor + "}" +
      ".sosafe-badge-modality{background:#f3f4f6;color:#6b7280}" +
      ".sosafe-badge-cert{background:#fef3c7;color:#b45309}" +
      ".sosafe-card-title{font-size:1.05rem;font-weight:700;color:#111827;margin-bottom:.5rem;line-height:1.3}" +
      ".sosafe-card-title a{color:inherit;text-decoration:none}" +
      ".sosafe-card-title a:hover{color:" + t.primaryColor + "}" +
      ".sosafe-card-meta{display:flex;flex-wrap:wrap;gap:.8rem;margin-bottom:.8rem;font-size:.85rem;color:#6b7280}" +
      ".sosafe-card-meta span{display:flex;align-items:center;gap:.3rem}" +
      ".sosafe-card-desc{font-size:.85rem;color:#4b5563;line-height:1.5;margin-bottom:.8rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}" +
      ".sosafe-sessions-label{font-size:.8rem;font-weight:600;color:#374151;margin-bottom:.4rem}" +
      ".sosafe-session-list{list-style:none;padding:0;margin:0 0 .8rem}" +
      ".sosafe-session-item{display:flex;justify-content:space-between;align-items:center;padding:.4rem 0;border-bottom:1px solid #f3f4f6;font-size:.83rem}" +
      ".sosafe-session-item:last-child{border-bottom:none}" +
      ".sosafe-session-date{color:#374151;font-weight:500}" +
      ".sosafe-session-loc{color:#6b7280;font-size:.8rem}" +
      ".sosafe-spots{font-size:.78rem;font-weight:500;white-space:nowrap}" +
      ".sosafe-spots.available{color:#059669}" +
      ".sosafe-spots.full{color:#dc2626}" +
      ".sosafe-no-session{font-size:.83rem;color:#9ca3af;font-style:italic;margin-bottom:.8rem}" +
      ".sosafe-card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:.8rem;border-top:1px solid #f3f4f6}" +
      ".sosafe-price{font-size:1rem;font-weight:700;color:#111827}" +
      ".sosafe-price small{font-size:.75rem;font-weight:400;color:#6b7280}" +
      ".sosafe-btn{display:inline-block;padding:.55rem 1.2rem;background:" + t.primaryColor + ";color:#fff;text-decoration:none;border-radius:" + t.borderRadius + ";font-size:.85rem;font-weight:600;border:none;cursor:pointer;transition:opacity .2s}" +
      ".sosafe-btn:hover{opacity:.85}" +
      ".sosafe-btn-outline{background:transparent;color:" + t.primaryColor + ";border:1.5px solid " + t.primaryColor + "}" +
      ".sosafe-btn-outline:hover{background:" + t.primaryColor + ";color:#fff}" +
      ".sosafe-loading{text-align:center;padding:3rem;color:#9ca3af;font-size:.9rem}" +
      ".sosafe-error{text-align:center;padding:3rem;color:#dc2626;font-size:.9rem}" +
      ".sosafe-empty{text-align:center;padding:3rem;color:#6b7280;font-size:.9rem}" +
      ".sosafe-count{font-size:.85rem;color:#6b7280;margin-bottom:1rem}" +
      "@media(max-width:700px){.sosafe-grid{grid-template-columns:1fr}}"
    );
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function formatDuration(hours) {
    if (!hours) return "";
    if (hours >= 7) {
      var days = Math.round(hours / 7);
      return days + " jour" + (days > 1 ? "s" : "");
    }
    return hours + "h";
  }

  function formatPrice(price) {
    if (!price && price !== 0) return "";
    return price.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
  }

  function modalityLabel(m) {
    var labels = { presentiel: "Présentiel", distanciel: "Distanciel", blended: "Blended" };
    return labels[m] || m || "";
  }

  function render(programs, theme, config) {
    var html = '<div class="sosafe-widget">';

    // Collect all categories
    var categories = [];
    programs.forEach(function (p) {
      (p.categories || []).forEach(function (c) {
        if (categories.indexOf(c) === -1) categories.push(c);
      });
    });

    // Filters
    if (config.showFilters !== false && categories.length > 1) {
      html += '<div class="sosafe-filters">';
      html += '<button class="sosafe-filter-btn active" data-cat="all">Toutes</button>';
      categories.forEach(function (cat) {
        html += '<button class="sosafe-filter-btn" data-cat="' + cat + '">' + cat + "</button>";
      });
      html += "</div>";
    }

    var maxItems = config.maxItems || 50;
    var displayed = programs.slice(0, maxItems);

    html += '<div class="sosafe-count">' + displayed.length + " formation" + (displayed.length > 1 ? "s" : "") + "</div>";
    html += '<div class="sosafe-grid">';

    displayed.forEach(function (p) {
      var cats = (p.categories || []).join(",");
      html += '<div class="sosafe-card" data-category="' + cats + '">';
      html += '<div class="sosafe-card-body">';

      // Badges
      html += '<div class="sosafe-card-badges">';
      (p.categories || []).forEach(function (c) {
        html += '<span class="sosafe-badge sosafe-badge-cat">' + c + "</span>";
      });
      if (p.modality) {
        html += '<span class="sosafe-badge sosafe-badge-modality">' + modalityLabel(p.modality) + "</span>";
      }
      if (p.certifying) {
        html += '<span class="sosafe-badge sosafe-badge-cert">Certifiante</span>';
      }
      html += "</div>";

      // Title
      html += '<div class="sosafe-card-title">' + (p.title || "Formation") + "</div>";

      // Meta (duration)
      html += '<div class="sosafe-card-meta">';
      if (p.duration) {
        html += "<span>\u23F0 " + formatDuration(p.duration) + "</span>";
      }
      if (p.sessions && p.sessions.length > 0) {
        html += "<span>\uD83D\uDCC5 " + p.sessions.length + " session" + (p.sessions.length > 1 ? "s" : "") + " à venir</span>";
      }
      html += "</div>";

      // Description
      if (p.objectives) {
        html += '<div class="sosafe-card-desc">' + p.objectives + "</div>";
      } else if (p.description) {
        html += '<div class="sosafe-card-desc">' + p.description + "</div>";
      }

      // Upcoming sessions
      if (p.sessions && p.sessions.length > 0) {
        html += '<div class="sosafe-sessions-label">Prochaines sessions :</div>';
        html += '<ul class="sosafe-session-list">';
        p.sessions.slice(0, 3).forEach(function (s) {
          html += '<li class="sosafe-session-item">';
          html += '<div>';
          html += '<span class="sosafe-session-date">' + formatDate(s.startDate);
          if (s.endDate && s.endDate !== s.startDate) {
            html += " → " + formatDate(s.endDate);
          }
          html += "</span>";
          if (s.location) {
            html += ' <span class="sosafe-session-loc">• ' + s.location + "</span>";
          }
          html += "</div>";
          if (s.isFull) {
            html += '<span class="sosafe-spots full">Complet</span>';
          } else {
            html += '<span class="sosafe-spots available">' + s.remainingSpots + " place" + (s.remainingSpots > 1 ? "s" : "") + "</span>";
          }
          html += "</li>";
        });
        if (p.sessions.length > 3) {
          html += '<li class="sosafe-session-item" style="color:#6b7280;font-style:italic">+ ' + (p.sessions.length - 3) + " autre" + (p.sessions.length - 3 > 1 ? "s" : "") + " session" + (p.sessions.length - 3 > 1 ? "s" : "") + "</li>";
        }
        html += "</ul>";
      } else {
        html += '<div class="sosafe-no-session">Aucune session prévue pour le moment</div>';
      }

      // Footer with price and CTA
      html += '<div class="sosafe-card-footer">';
      if (p.price) {
        html += '<div class="sosafe-price">' + formatPrice(p.price) + ' <small>HT</small></div>';
      } else {
        html += '<div class="sosafe-price"><small>Prix sur demande</small></div>';
      }
      if (p.sessions && p.sessions.length > 0) {
        var firstAvailable = p.sessions.find(function (s) { return !s.isFull; });
        if (firstAvailable) {
          html += '<a class="sosafe-btn" href="' + enrollUrl + "?sessionId=" + firstAvailable.id + '" target="_blank" rel="noopener">S\'inscrire</a>';
        } else {
          html += '<a class="sosafe-btn sosafe-btn-outline" href="' + enrollUrl + '" target="_blank" rel="noopener">Voir le programme</a>';
        }
      } else {
        html += '<a class="sosafe-btn sosafe-btn-outline" href="' + enrollUrl + '" target="_blank" rel="noopener">Voir le programme</a>';
      }
      html += "</div></div></div>";
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
        var count = 0;
        cards.forEach(function (card) {
          var cardCats = (card.getAttribute("data-category") || "").split(",");
          if (cat === "all" || cardCats.indexOf(cat) !== -1) {
            card.style.display = "";
            count++;
          } else {
            card.style.display = "none";
          }
        });
        var countEl = root.querySelector(".sosafe-count");
        if (countEl) {
          countEl.textContent = count + " formation" + (count > 1 ? "s" : "");
        }
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

    var programsPromise = fetch(baseUrl + "/api/v1/catalog/programs", { headers: headers }).then(function (r) {
      if (!r.ok) throw new Error("Erreur " + r.status);
      return r.json();
    });

    Promise.all([configPromise, programsPromise])
      .then(function (results) {
        var config = results[0];
        var programs = results[1];
        var style = document.createElement("style");
        style.textContent = buildStyles(config.theme);
        shadow.innerHTML = "";
        shadow.appendChild(style);
        var wrapper = document.createElement("div");
        wrapper.innerHTML = render(programs, config.theme, config);
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
  shadow.innerHTML = '<div style="text-align:center;padding:3rem;color:#9ca3af;font-size:.9rem">Chargement des formations...</div>';
  fetchData();

  // Auto-refresh every 5 minutes
  setInterval(fetchData, 5 * 60 * 1000);
})();
