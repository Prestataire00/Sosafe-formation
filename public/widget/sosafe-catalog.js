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

  var shadow = container.attachShadow({ mode: "open" });

  var defaultTheme = {
    primaryColor: "#fec700",
    accentColor: "#00509f",
    fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
    borderRadius: "12px",
  };

  // Default placeholder image
  var defaultImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='220' fill='%23f3f4f6'%3E%3Crect width='400' height='220'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239ca3af'%3EFormation%3C/text%3E%3C/svg%3E";

  function buildStyles(theme) {
    var t = Object.assign({}, defaultTheme, theme || {});
    return (
      "@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');" +
      "*{box-sizing:border-box;margin:0;padding:0}" +
      ":host{display:block}" +
      ".sosafe-widget{font-family:" + t.fontFamily + ";color:#1f2937;max-width:1200px;margin:0 auto;padding:2rem 1rem}" +

      // Header stats
      ".sosafe-header{text-align:center;margin-bottom:2rem}" +
      ".sosafe-header h2{font-size:2rem;font-weight:700;color:#111827;margin-bottom:.3rem}" +
      ".sosafe-header p{font-size:1rem;color:#6b7280;margin-bottom:1.5rem}" +
      ".sosafe-stats{display:flex;justify-content:center;gap:2.5rem;flex-wrap:wrap;margin-bottom:1.5rem}" +
      ".sosafe-stat{text-align:center}" +
      ".sosafe-stat-value{font-size:1.8rem;font-weight:700;color:" + t.accentColor + "}" +
      ".sosafe-stat-label{font-size:.78rem;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}" +

      // Banner image
      ".sosafe-banner{width:100%;border-radius:" + t.borderRadius + ";overflow:hidden;margin-bottom:2rem}" +
      ".sosafe-banner img{width:100%;height:300px;object-fit:cover;display:block}" +

      // Search & Filters bar
      ".sosafe-search-bar{display:flex;gap:.8rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center}" +
      ".sosafe-search-input{flex:1;min-width:200px;padding:.65rem 1rem;border:2px solid #e5e7eb;border-radius:100px;font-size:.9rem;font-family:" + t.fontFamily + ";outline:none;transition:border-color .2s}" +
      ".sosafe-search-input:focus{border-color:" + t.primaryColor + "}" +
      ".sosafe-search-input::placeholder{color:#9ca3af}" +
      ".sosafe-select{padding:.65rem 1rem;border:2px solid #e5e7eb;border-radius:100px;font-size:.85rem;font-family:" + t.fontFamily + ";background:#fff;cursor:pointer;outline:none;min-width:160px;-webkit-appearance:none;appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 12px center;padding-right:2rem}" +
      ".sosafe-select:focus{border-color:" + t.primaryColor + "}" +
      ".sosafe-filter-actions{display:flex;gap:.5rem}" +
      ".sosafe-filter-reset{padding:.65rem 1.2rem;border:2px solid #e5e7eb;border-radius:100px;background:#fff;cursor:pointer;font-size:.85rem;font-family:" + t.fontFamily + ";color:#6b7280;transition:all .2s}" +
      ".sosafe-filter-reset:hover{border-color:#d1d5db;color:#374151}" +
      ".sosafe-filter-apply{padding:.65rem 1.2rem;border:none;border-radius:100px;background:" + t.primaryColor + ";cursor:pointer;font-size:.85rem;font-weight:600;font-family:" + t.fontFamily + ";color:#111827;transition:all .2s}" +
      ".sosafe-filter-apply:hover{opacity:.9}" +

      // Category pill filters
      ".sosafe-filters{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap;justify-content:center}" +
      ".sosafe-filter-btn{padding:.5rem 1.1rem;border:2px solid #e5e7eb;border-radius:100px;background:#fff;cursor:pointer;font-size:.82rem;font-weight:500;transition:all .2s;font-family:" + t.fontFamily + "}" +
      ".sosafe-filter-btn:hover{border-color:" + t.primaryColor + "}" +
      ".sosafe-filter-btn.active{background:" + t.primaryColor + ";color:#111827;border-color:" + t.primaryColor + ";font-weight:600}" +

      // View toggle
      ".sosafe-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem}" +
      ".sosafe-count{font-size:.9rem;color:#6b7280}" +
      ".sosafe-view-toggle{display:flex;gap:.3rem}" +
      ".sosafe-view-btn{padding:.4rem .6rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;border-radius:6px;color:#9ca3af;transition:all .2s}" +
      ".sosafe-view-btn.active{background:" + t.primaryColor + ";border-color:" + t.primaryColor + ";color:#111827}" +
      ".sosafe-view-btn svg{width:18px;height:18px;display:block}" +

      // Grid view
      ".sosafe-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1.5rem}" +
      ".sosafe-grid.list-view{grid-template-columns:1fr}" +

      // Cards
      ".sosafe-card{border:none;border-radius:" + t.borderRadius + ";background:#fff;overflow:hidden;transition:box-shadow .3s,transform .2s;box-shadow:0 2px 8px rgba(0,0,0,.08)}" +
      ".sosafe-card:hover{box-shadow:0 12px 32px rgba(0,0,0,.12);transform:translateY(-3px)}" +

      // Card image
      ".sosafe-card-img{width:100%;height:200px;object-fit:cover;display:block}" +

      // List view card
      ".list-view .sosafe-card{display:flex;flex-direction:row}" +
      ".list-view .sosafe-card-img{width:280px;height:auto;min-height:180px}" +
      ".list-view .sosafe-card-body{flex:1}" +

      // Card body
      ".sosafe-card-body{padding:1.2rem}" +

      // Badges
      ".sosafe-card-badges{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.6rem}" +
      ".sosafe-badge{font-size:.7rem;text-transform:uppercase;letter-spacing:.03em;padding:.25rem .7rem;border-radius:100px;font-weight:600}" +
      ".sosafe-badge-cat{background:" + t.accentColor + "12;color:" + t.accentColor + "}" +
      ".sosafe-badge-modality{background:#f3f4f6;color:#6b7280}" +
      ".sosafe-badge-cert{background:#fef3c7;color:#b45309}" +

      // Title
      ".sosafe-card-title{font-size:1.05rem;font-weight:700;color:#111827;margin-bottom:.5rem;line-height:1.3}" +

      // Meta
      ".sosafe-card-meta{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:.8rem;font-size:.85rem;color:#6b7280}" +
      ".sosafe-card-meta span{display:flex;align-items:center;gap:.3rem}" +

      // Description
      ".sosafe-card-desc{font-size:.85rem;color:#4b5563;line-height:1.6;margin-bottom:.8rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}" +

      // Sessions
      ".sosafe-sessions-label{font-size:.8rem;font-weight:600;color:#374151;margin-bottom:.4rem}" +
      ".sosafe-session-list{list-style:none;padding:0;margin:0 0 .8rem}" +
      ".sosafe-session-item{display:flex;justify-content:space-between;align-items:center;padding:.45rem .6rem;border-radius:8px;font-size:.83rem;margin-bottom:.3rem;background:#f9fafb}" +
      ".sosafe-session-date{color:#374151;font-weight:500}" +
      ".sosafe-session-loc{color:#6b7280;font-size:.8rem}" +
      ".sosafe-spots{font-size:.78rem;font-weight:600;white-space:nowrap;padding:.2rem .5rem;border-radius:100px}" +
      ".sosafe-spots.available{color:#059669;background:#ecfdf5}" +
      ".sosafe-spots.full{color:#dc2626;background:#fef2f2}" +
      ".sosafe-no-session{font-size:.83rem;color:#9ca3af;font-style:italic;margin-bottom:.8rem;padding:.4rem;background:#f9fafb;border-radius:8px;text-align:center}" +

      // Footer
      ".sosafe-card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:.8rem;border-top:1px solid #f3f4f6}" +
      ".sosafe-price{font-size:1.1rem;font-weight:700;color:#111827}" +
      ".sosafe-price small{font-size:.75rem;font-weight:400;color:#6b7280}" +
      ".sosafe-btn{display:inline-block;padding:.6rem 1.3rem;background:" + t.primaryColor + ";color:#111827;text-decoration:none;border-radius:100px;font-size:.85rem;font-weight:600;border:none;cursor:pointer;transition:all .2s;font-family:" + t.fontFamily + "}" +
      ".sosafe-btn:hover{opacity:.9;transform:scale(1.02)}" +
      ".sosafe-btn-outline{background:transparent;color:" + t.accentColor + ";border:2px solid " + t.accentColor + "}" +
      ".sosafe-btn-outline:hover{background:" + t.accentColor + ";color:#fff}" +

      // States
      ".sosafe-loading{text-align:center;padding:3rem;color:#9ca3af;font-size:.9rem}" +
      ".sosafe-error{text-align:center;padding:3rem;color:#dc2626;font-size:.9rem}" +

      // Responsive
      "@media(max-width:700px){.sosafe-grid{grid-template-columns:1fr}.sosafe-stats{gap:1.5rem}.sosafe-header h2{font-size:1.5rem}.sosafe-search-bar{flex-direction:column}.list-view .sosafe-card{flex-direction:column}.list-view .sosafe-card-img{width:100%;height:200px}}"
    );
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatDuration(hours) {
    if (!hours) return "";
    if (hours >= 7) {
      var days = Math.round(hours / 7);
      return hours + " heures sur " + days + " jour" + (days > 1 ? "s" : "");
    }
    return hours + "h";
  }

  function formatPrice(price) {
    if (!price && price !== 0) return "";
    return price.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " \u20AC";
  }

  function modalityLabel(m) {
    var labels = { presentiel: "Pr\u00E9sentiel", distanciel: "Distanciel", blended: "Blended" };
    return labels[m] || m || "";
  }

  function render(programs, theme, config) {
    var t = Object.assign({}, defaultTheme, theme || {});
    var html = '<div class="sosafe-widget">';

    // Header with stats
    html += '<div class="sosafe-header">';
    html += '<h2>Nos formations</h2>';
    html += '<p>Retrouvez nos formations en sant\u00E9 et gestes de premiers secours</p>';
    html += '<div class="sosafe-stats">';
    html += '<div class="sosafe-stat"><div class="sosafe-stat-value">' + programs.length + '</div><div class="sosafe-stat-label">Programmes</div></div>';
    var totalSessions = 0;
    programs.forEach(function (p) { totalSessions += (p.sessions || []).length; });
    html += '<div class="sosafe-stat"><div class="sosafe-stat-value">' + totalSessions + '</div><div class="sosafe-stat-label">Sessions \u00E0 venir</div></div>';
    html += '<div class="sosafe-stat"><div class="sosafe-stat-value">100%</div><div class="sosafe-stat-label">Taux de r\u00E9ussite</div></div>';
    html += '<div class="sosafe-stat"><div class="sosafe-stat-value">99%</div><div class="sosafe-stat-label">Satisfaction</div></div>';
    html += '</div>';

    // Banner image
    html += '<div class="sosafe-banner"><img src="https://www.so-safe.fr/wp-content/uploads/2024/05/HD-11-scaled.jpg" alt="SO\'SAFE Formations"></div>';

    html += '</div>';

    // Collect categories
    var categories = [];
    programs.forEach(function (p) {
      (p.categories || []).forEach(function (c) {
        if (categories.indexOf(c) === -1) categories.push(c);
      });
    });

    // Search bar + dropdown filter
    html += '<div class="sosafe-search-bar">';
    html += '<input type="text" class="sosafe-search-input" placeholder="Rechercher une formation..." data-role="search">';
    html += '<select class="sosafe-select" data-role="cat-select">';
    html += '<option value="all">Toutes les cat\u00E9gories</option>';
    categories.forEach(function (cat) {
      html += '<option value="' + cat + '">' + cat + '</option>';
    });
    html += '</select>';
    html += '<div class="sosafe-filter-actions">';
    html += '<button class="sosafe-filter-reset" data-role="reset">R\u00E9initialiser</button>';
    html += '<button class="sosafe-filter-apply" data-role="apply">Filtrer</button>';
    html += '</div></div>';

    // Category pill filters
    if (categories.length > 1) {
      html += '<div class="sosafe-filters">';
      html += '<button class="sosafe-filter-btn active" data-cat="all">Toutes</button>';
      categories.forEach(function (cat) {
        html += '<button class="sosafe-filter-btn" data-cat="' + cat + '">' + cat + '</button>';
      });
      html += '</div>';
    }

    // Toolbar: count + view toggle
    var maxItems = config.maxItems || 50;
    var displayed = programs.slice(0, maxItems);
    html += '<div class="sosafe-toolbar">';
    html += '<div class="sosafe-count">' + displayed.length + ' r\u00E9sultat' + (displayed.length > 1 ? 's' : '') + '</div>';
    html += '<div class="sosafe-view-toggle">';
    html += '<button class="sosafe-view-btn active" data-view="grid" title="Vue grille"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>';
    html += '<button class="sosafe-view-btn" data-view="list" title="Vue liste"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>';
    html += '</div></div>';

    // Grid
    html += '<div class="sosafe-grid" data-role="grid">';

    displayed.forEach(function (p) {
      var cats = (p.categories || []).join(",");
      var searchText = ((p.title || "") + " " + (p.objectives || "") + " " + (p.description || "") + " " + cats).toLowerCase();
      html += '<div class="sosafe-card" data-category="' + cats + '" data-search="' + searchText.replace(/"/g, '') + '">';

      // Image
      var img = p.imageUrl || defaultImage;
      html += '<img class="sosafe-card-img" src="' + img + '" alt="' + (p.title || 'Formation') + '" onerror="this.src=\'' + defaultImage + '\'">';

      html += '<div class="sosafe-card-body">';

      // Badges
      html += '<div class="sosafe-card-badges">';
      if (p.modality) {
        html += '<span class="sosafe-badge sosafe-badge-modality">' + modalityLabel(p.modality) + '</span>';
      }
      (p.categories || []).forEach(function (c) {
        html += '<span class="sosafe-badge sosafe-badge-cat">' + c + '</span>';
      });
      if (p.certifying) {
        html += '<span class="sosafe-badge sosafe-badge-cert">Certifiante</span>';
      }
      html += '</div>';

      // Title
      html += '<div class="sosafe-card-title">' + (p.title || "Formation") + '</div>';

      // Meta
      html += '<div class="sosafe-card-meta">';
      if (p.duration) {
        html += '<span>\u23F0 ' + formatDuration(p.duration) + '</span>';
      }
      if (p.sessions && p.sessions.length > 0) {
        var nextDate = p.sessions[0].startDate;
        if (nextDate) {
          html += '<span>\uD83D\uDCC5 ' + formatDate(nextDate) + '</span>';
        }
      }
      html += '</div>';

      // Description
      if (p.objectives) {
        html += '<div class="sosafe-card-desc">' + p.objectives + '</div>';
      } else if (p.description) {
        html += '<div class="sosafe-card-desc">' + p.description + '</div>';
      }

      // Sessions
      if (p.sessions && p.sessions.length > 0) {
        html += '<div class="sosafe-sessions-label">Prochaines sessions :</div>';
        html += '<ul class="sosafe-session-list">';
        p.sessions.slice(0, 3).forEach(function (s) {
          html += '<li class="sosafe-session-item">';
          html += '<div>';
          html += '<span class="sosafe-session-date">' + formatDate(s.startDate);
          if (s.endDate && s.endDate !== s.startDate) {
            html += ' \u2192 ' + formatDate(s.endDate);
          }
          html += '</span>';
          if (s.location) {
            html += ' <span class="sosafe-session-loc">\u2022 ' + s.location + '</span>';
          }
          html += '</div>';
          if (s.isFull) {
            html += '<span class="sosafe-spots full">Complet</span>';
          } else {
            html += '<span class="sosafe-spots available">' + s.remainingSpots + ' place' + (s.remainingSpots > 1 ? 's' : '') + '</span>';
          }
          html += '</li>';
        });
        html += '</ul>';
      } else {
        html += '<div class="sosafe-no-session">Aucune session pr\u00E9vue pour le moment</div>';
      }

      // Footer
      html += '<div class="sosafe-card-footer">';
      if (p.price) {
        html += '<div class="sosafe-price">' + formatPrice(p.price) + ' <small>HT</small></div>';
      } else {
        html += '<div class="sosafe-price"><small>Prix sur demande</small></div>';
      }
      if (p.sessions && p.sessions.length > 0) {
        var firstAvailable = p.sessions.find(function (s) { return !s.isFull; });
        if (firstAvailable) {
          html += '<a class="sosafe-btn" href="' + enrollUrl + '?sessionId=' + firstAvailable.id + '" target="_blank" rel="noopener">S\'inscrire</a>';
        } else {
          html += '<a class="sosafe-btn sosafe-btn-outline" href="' + enrollUrl + '" target="_blank" rel="noopener">Voir le programme</a>';
        }
      } else {
        html += '<a class="sosafe-btn sosafe-btn-outline" href="' + enrollUrl + '" target="_blank" rel="noopener">Voir le programme</a>';
      }
      html += '</div></div></div>';
    });

    html += '</div></div>';
    return html;
  }

  function setupInteractions(root) {
    // Category pill filters
    var btns = root.querySelectorAll(".sosafe-filter-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var select = root.querySelector('[data-role="cat-select"]');
        if (select) select.value = btn.getAttribute("data-cat");
        applyFilters(root);
      });
    });

    // Search input
    var searchInput = root.querySelector('[data-role="search"]');
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        applyFilters(root);
      });
    }

    // Category select dropdown
    var catSelect = root.querySelector('[data-role="cat-select"]');
    if (catSelect) {
      catSelect.addEventListener("change", function () {
        var val = catSelect.value;
        btns.forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-cat") === val);
        });
        applyFilters(root);
      });
    }

    // Reset button
    var resetBtn = root.querySelector('[data-role="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (searchInput) searchInput.value = "";
        if (catSelect) catSelect.value = "all";
        btns.forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-cat") === "all");
        });
        applyFilters(root);
      });
    }

    // Apply button
    var applyBtn = root.querySelector('[data-role="apply"]');
    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        applyFilters(root);
      });
    }

    // View toggle
    var viewBtns = root.querySelectorAll(".sosafe-view-btn");
    var grid = root.querySelector('[data-role="grid"]');
    viewBtns.forEach(function (vb) {
      vb.addEventListener("click", function () {
        viewBtns.forEach(function (b) { b.classList.remove("active"); });
        vb.classList.add("active");
        if (grid) {
          grid.classList.toggle("list-view", vb.getAttribute("data-view") === "list");
        }
      });
    });
  }

  function applyFilters(root) {
    var searchInput = root.querySelector('[data-role="search"]');
    var catSelect = root.querySelector('[data-role="cat-select"]');
    var query = (searchInput ? searchInput.value : "").toLowerCase().trim();
    var cat = catSelect ? catSelect.value : "all";
    var cards = root.querySelectorAll(".sosafe-card");
    var count = 0;

    cards.forEach(function (card) {
      var cardCats = (card.getAttribute("data-category") || "").split(",");
      var searchText = card.getAttribute("data-search") || "";
      var matchCat = (cat === "all" || cardCats.indexOf(cat) !== -1);
      var matchSearch = (!query || query.length < 3 || searchText.indexOf(query) !== -1);
      if (matchCat && matchSearch) {
        card.style.display = "";
        count++;
      } else {
        card.style.display = "none";
      }
    });

    var countEl = root.querySelector(".sosafe-count");
    if (countEl) {
      countEl.textContent = count + " r\u00E9sultat" + (count > 1 ? "s" : "");
    }
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
        setupInteractions(shadow);
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

  shadow.innerHTML = '<div style="text-align:center;padding:3rem;color:#9ca3af;font-size:.9rem">Chargement des formations...</div>';
  fetchData();
  setInterval(fetchData, 5 * 60 * 1000);
})();
