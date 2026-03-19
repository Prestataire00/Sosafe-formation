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

  var defaultImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' fill='%23e5e7eb'%3E%3Crect width='400' height='250'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%239ca3af'%3EFormation SO'SAFE%3C/text%3E%3C/svg%3E";
  var bannerImage = "https://www.so-safe.fr/wp-content/uploads/2024/05/HD-11-scaled.jpg";

  var allPrograms = [];

  function buildStyles(theme) {
    var t = Object.assign({}, defaultTheme, theme || {});
    return (
      "@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');" +
      "*{box-sizing:border-box;margin:0;padding:0}" +
      ":host{display:block}" +
      ".sosafe-widget{font-family:" + t.fontFamily + ";color:#000;margin:0;padding:0}" +

      // KPI stats bar with yellow gradient — full width
      ".sosafe-stats-bar{background:linear-gradient(-45deg,#F6DE14,#F7B136);padding:1.5rem 2rem;display:flex;justify-content:center;gap:3rem;flex-wrap:wrap;margin-bottom:0}" +
      ".sosafe-stat{text-align:center;min-width:120px}" +
      ".sosafe-stat-value{font-size:2rem;font-weight:700;color:#000}" +
      ".sosafe-stat-label{font-size:.8rem;color:#000;text-transform:uppercase;letter-spacing:.04em;font-weight:500}" +

      // Banner image — full width, no overlay
      ".sosafe-banner{width:100%;height:350px;overflow:hidden;margin-bottom:1.5rem}" +
      ".sosafe-banner img{width:100%;height:100%;object-fit:cover;display:block}" +

      // Content wrapper (centered below banner)
      ".sosafe-content{max-width:1200px;margin:0 auto;padding:0 1rem 2rem}" +

      // Search & Filters
      ".sosafe-search-bar{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center}" +
      ".sosafe-search-input{flex:1;min-width:200px;padding:.5rem .8rem .5rem 2.2rem;border:1px solid #ddd;border-radius:4px;font-size:.9rem;font-family:" + t.fontFamily + ";outline:none;transition:border-color .2s;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:8px center}" +
      ".sosafe-search-input:focus{border-color:" + t.primaryColor + "}" +
      ".sosafe-search-input::placeholder{color:#9ca3af}" +
      ".sosafe-select{padding:.5rem .6rem;border:1px solid #ddd;border-radius:4px;font-size:.85rem;font-family:" + t.fontFamily + ";background:#fff;cursor:pointer;outline:none;min-width:150px}" +
      ".sosafe-select:focus{border-color:" + t.primaryColor + "}" +
      ".sosafe-filter-btn{padding:.5rem 1.2rem;border:none;border-radius:9999px;cursor:pointer;font-size:.85rem;font-family:" + t.fontFamily + ";transition:all .2s;font-weight:500}" +
      ".sosafe-filter-reset{background:#fff;border:1px solid #ddd;color:#6b7280}" +
      ".sosafe-filter-reset:hover{border-color:#999;color:#333}" +
      ".sosafe-filter-submit{background:#32373c;color:#fff}" +
      ".sosafe-filter-submit:hover{background:#23272b}" +

      // Toolbar
      ".sosafe-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}" +
      ".sosafe-count{font-size:.9rem;color:#6b7280}" +
      ".sosafe-view-toggle{display:flex;gap:.3rem}" +
      ".sosafe-view-btn{padding:.4rem .6rem;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;color:#9ca3af;transition:all .2s}" +
      ".sosafe-view-btn.active{background:#32373c;border-color:#32373c;color:#fff}" +
      ".sosafe-view-btn svg{width:18px;height:18px;display:block}" +

      // Grid — 3 columns
      ".sosafe-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}" +
      ".sosafe-grid.list-view{grid-template-columns:1fr}" +

      // Cards
      ".sosafe-card{border:none;border-radius:0;background:#fff;overflow:hidden;transition:box-shadow .3s,transform .2s;box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:pointer}" +
      ".sosafe-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.12);transform:translateY(-2px)}" +
      ".sosafe-card-img-wrap{position:relative;overflow:hidden}" +
      ".sosafe-card-img{width:100%;height:220px;object-fit:cover;display:block;transition:transform .3s}" +
      ".sosafe-card:hover .sosafe-card-img{transform:scale(1.03)}" +
      ".sosafe-card-modality{position:absolute;top:10px;left:10px;background:#32373c;color:#fff;font-size:.7rem;font-weight:600;padding:.25rem .7rem;border-radius:9999px}" +
      ".sosafe-card-body{padding:1rem}" +
      ".sosafe-card-title{font-size:.95rem;font-weight:700;color:#000;margin-bottom:.4rem;line-height:1.3}" +
      ".sosafe-card-duration{font-size:.85rem;color:#6b7280;margin-bottom:.5rem}" +
      ".sosafe-card-dates-title{font-size:.8rem;font-weight:700;color:#000;margin-bottom:.3rem}" +
      ".sosafe-card-dates{margin-bottom:.8rem}" +
      ".sosafe-card-date-row{display:flex;align-items:center;gap:.4rem;margin-bottom:.2rem}" +
      ".sosafe-card-date-icon{width:16px;height:16px;flex-shrink:0;cursor:pointer;color:#32373c;transition:color .2s}" +
      ".sosafe-card-date-icon:hover{color:#F7B136}" +
      ".sosafe-card-date-text{font-size:.8rem;color:#32373c;font-weight:500}" +
      ".sosafe-card-date-link{font-size:.75rem;color:#F7B136;font-weight:600;text-decoration:none;margin-left:auto;cursor:pointer}" +
      ".sosafe-card-date-link:hover{text-decoration:underline}" +
      ".sosafe-card-btn{display:block;text-align:center;padding:calc(.667em + 2px) calc(1.333em + 2px);background:#32373c;color:#fff;text-decoration:none;border-radius:9999px;font-size:1rem;font-weight:600;border:none;cursor:pointer;transition:background .2s;font-family:" + t.fontFamily + ";width:100%}" +
      ".sosafe-card-btn:hover{background:#23272b}" +

      // List view
      ".list-view .sosafe-card{display:flex;flex-direction:row}" +
      ".list-view .sosafe-card-img-wrap{width:260px;flex-shrink:0}" +
      ".list-view .sosafe-card-img{height:100%;min-height:180px}" +
      ".list-view .sosafe-card-body{flex:1;display:flex;flex-direction:column;justify-content:center}" +

      // Modal (detail view)
      ".sosafe-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;justify-content:center;align-items:flex-start;padding:2rem;overflow-y:auto}" +
      ".sosafe-modal{background:#fff;border-radius:0;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);position:relative}" +
      ".sosafe-modal-close{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;transition:background .2s}" +
      ".sosafe-modal-close:hover{background:rgba(0,0,0,.8)}" +
      ".sosafe-modal-img{width:100%;height:280px;object-fit:cover;display:block}" +
      ".sosafe-modal-body{padding:2rem}" +
      ".sosafe-modal-badges{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1rem}" +
      ".sosafe-modal-badge{font-size:.7rem;text-transform:uppercase;letter-spacing:.03em;padding:.25rem .7rem;border-radius:9999px;font-weight:600}" +
      ".sosafe-modal-badge-cat{background:#F6DE1430;color:#8B6914}" +
      ".sosafe-modal-badge-modality{background:#32373c;color:#fff}" +
      ".sosafe-modal-badge-cert{background:#fef3c7;color:#b45309}" +
      ".sosafe-modal-title{font-size:1.5rem;font-weight:700;color:#000;margin-bottom:.8rem;line-height:1.3}" +
      ".sosafe-modal-meta{display:flex;flex-wrap:wrap;gap:1.5rem;margin-bottom:1.2rem;font-size:.9rem;color:#6b7280}" +
      ".sosafe-modal-meta span{display:flex;align-items:center;gap:.3rem}" +
      ".sosafe-modal-section{margin-bottom:1.5rem}" +
      ".sosafe-modal-section h3{font-size:1rem;font-weight:600;color:#000;margin-bottom:.6rem;padding-bottom:.4rem;border-bottom:2px solid " + t.primaryColor + "}" +
      ".sosafe-modal-section p,.sosafe-modal-section ul{font-size:.9rem;color:#4b5563;line-height:1.7}" +
      ".sosafe-modal-section ul{padding-left:1.2rem}" +
      ".sosafe-modal-section li{margin-bottom:.3rem}" +
      ".sosafe-modal-sessions{margin-bottom:1.5rem}" +
      ".sosafe-modal-session{display:flex;justify-content:space-between;align-items:center;padding:.7rem 1rem;background:#f9fafb;border-radius:4px;margin-bottom:.4rem;font-size:.9rem}" +
      ".sosafe-modal-session-date{font-weight:600;color:#000}" +
      ".sosafe-modal-session-loc{color:#6b7280;font-size:.85rem}" +
      ".sosafe-modal-session-spots{font-size:.85rem;font-weight:600;padding:.2rem .6rem;border-radius:9999px}" +
      ".sosafe-modal-session-spots.available{color:#059669;background:#ecfdf5}" +
      ".sosafe-modal-session-spots.full{color:#dc2626;background:#fef2f2}" +
      ".sosafe-modal-footer{display:flex;justify-content:space-between;align-items:center;padding-top:1.2rem;border-top:2px solid #f3f4f6;margin-top:1rem}" +
      ".sosafe-modal-price{font-size:1.3rem;font-weight:700;color:#000}" +
      ".sosafe-modal-price small{font-size:.8rem;font-weight:400;color:#6b7280}" +
      ".sosafe-modal-cta{display:inline-block;padding:calc(.667em + 2px) calc(1.333em + 2px);background:#32373c;color:#fff;text-decoration:none;border-radius:9999px;font-size:1rem;font-weight:600;border:none;cursor:pointer;transition:background .2s;font-family:" + t.fontFamily + "}" +
      ".sosafe-modal-cta:hover{background:#23272b}" +
      ".sosafe-modal-cta-outline{background:transparent;color:#32373c;border:2px solid #32373c}" +
      ".sosafe-modal-cta-outline:hover{background:#32373c;color:#fff}" +
      ".sosafe-no-session-modal{font-size:.9rem;color:#9ca3af;font-style:italic;padding:.8rem;background:#f9fafb;border-radius:4px;text-align:center}" +

      // States
      ".sosafe-loading{text-align:center;padding:3rem;color:#9ca3af;font-size:.9rem}" +
      ".sosafe-error{text-align:center;padding:3rem;color:#dc2626;font-size:.9rem}" +

      // Responsive
      "@media(max-width:900px){.sosafe-grid{grid-template-columns:repeat(2,1fr)}}" +
      "@media(max-width:600px){.sosafe-grid{grid-template-columns:1fr}.sosafe-banner{height:200px}.sosafe-stats-bar{gap:1rem;padding:1rem}.sosafe-stat-value{font-size:1.3rem}.sosafe-search-bar{flex-direction:column}.list-view .sosafe-card{flex-direction:column}.list-view .sosafe-card-img-wrap{width:100%}.list-view .sosafe-card-img{height:200px}.sosafe-modal{margin:1rem;max-height:95vh}.sosafe-modal-body{padding:1.2rem}.sosafe-modal-footer{flex-direction:column;gap:1rem;text-align:center}}"
    );
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  }

  function formatDateLong(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  }

  function formatDuration(hours) {
    if (!hours) return "";
    if (hours >= 7) {
      var days = Math.round(hours / 7);
      return hours + " heures sur " + days + " jour" + (days > 1 ? "s" : "");
    }
    return hours + "h";
  }

  function formatDurationShort(hours) {
    if (!hours) return "";
    if (hours >= 7) {
      var days = Math.round(hours / 7);
      return days + " jour" + (days > 1 ? "s" : "");
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

  function renderCatalog(programs, theme, config) {
    var t = Object.assign({}, defaultTheme, theme || {});
    var html = '<div class="sosafe-widget">';

    // KPI stats bar with yellow gradient
    var totalSessions = 0;
    programs.forEach(function (p) { totalSessions += (p.sessions || []).length; });
    html += '<div class="sosafe-stats-bar">';
    html += '<div class="sosafe-stat"><div class="sosafe-stat-value">668</div><div class="sosafe-stat-label">Stagiaires form\u00E9s</div></div>';
    html += '<div class="sosafe-stat"><div class="sosafe-stat-value">' + programs.length + '</div><div class="sosafe-stat-label">Programmes</div></div>';
    html += '<div class="sosafe-stat"><div class="sosafe-stat-value">100%</div><div class="sosafe-stat-label">R\u00E9ussite</div></div>';
    html += '<div class="sosafe-stat"><div class="sosafe-stat-value">99%</div><div class="sosafe-stat-label">Satisfaction</div></div>';
    html += '</div>';

    // Banner image (no overlay)
    html += '<div class="sosafe-banner">';
    html += '<img src="' + bannerImage + '" alt="SO\'SAFE Formations">';
    html += '</div>';

    // Content wrapper
    html += '<div class="sosafe-content">';

    // Collect categories
    var categories = [];
    programs.forEach(function (p) {
      (p.categories || []).forEach(function (c) {
        if (categories.indexOf(c) === -1) categories.push(c);
      });
    });

    // Search + dropdown + reset
    html += '<div class="sosafe-search-bar">';
    html += '<input type="text" class="sosafe-search-input" placeholder="Saisissez au moins 3 caract\u00E8res pour filtrer..." data-role="search">';
    html += '<select class="sosafe-select" data-role="cat-select">';
    html += '<option value="all">Cat\u00E9gorie</option>';
    categories.forEach(function (cat) {
      html += '<option value="' + cat + '">' + cat + '</option>';
    });
    html += '</select>';
    html += '<select class="sosafe-select" data-role="surmesure-select">';
    html += '<option value="all">Sur-mesure</option>';
    html += '<option value="oui">Oui</option>';
    html += '<option value="non">Non</option>';
    html += '</select>';
    html += '<button class="sosafe-filter-btn sosafe-filter-reset" data-role="reset">R\u00E9initialiser</button>';
    html += '<button class="sosafe-filter-btn sosafe-filter-submit" data-role="filter">Filtrer</button>';
    html += '</div>';

    // Toolbar
    var maxItems = config.maxItems || 50;
    var displayed = programs.slice(0, maxItems);
    html += '<div class="sosafe-toolbar">';
    html += '<div class="sosafe-count">' + displayed.length + ' r\u00E9sultat' + (displayed.length > 1 ? 's' : '') + '</div>';
    html += '<div class="sosafe-view-toggle">';
    html += '<button class="sosafe-view-btn active" data-view="grid" title="Voir en grille"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>';
    html += '<button class="sosafe-view-btn" data-view="list" title="Voir en liste"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>';
    html += '</div></div>';

    // Grid - simple cards
    html += '<div class="sosafe-grid" data-role="grid">';
    displayed.forEach(function (p, index) {
      var cats = (p.categories || []).join(",");
      var searchText = ((p.title || "") + " " + (p.objectives || "") + " " + (p.description || "") + " " + cats).toLowerCase();
      html += '<div class="sosafe-card" data-category="' + cats + '" data-search="' + searchText.replace(/"/g, "") + '" data-index="' + index + '">';

      // Image with modality badge
      html += '<div class="sosafe-card-img-wrap">';
      var img = p.imageUrl || defaultImage;
      html += '<img class="sosafe-card-img" src="' + img + '" alt="' + (p.title || "Formation") + '" onerror="this.src=\'' + defaultImage + '\'">';
      if (p.modality) {
        html += '<div class="sosafe-card-modality">' + modalityLabel(p.modality) + '</div>';
      }
      html += '</div>';

      // Body: title + duration + next date + button
      html += '<div class="sosafe-card-body">';
      html += '<div class="sosafe-card-title">' + (p.title || "Formation") + '</div>';
      if (p.duration) {
        html += '<div class="sosafe-card-duration">' + formatDuration(p.duration) + '</div>';
      }
      if (p.sessions && p.sessions.length > 0) {
        html += '<div class="sosafe-card-dates-title">Prochaines dates</div>';
        html += '<div class="sosafe-card-dates">';
        var maxDates = Math.min(p.sessions.length, 3);
        for (var si = 0; si < maxDates; si++) {
          var sess = p.sessions[si];
          html += '<div class="sosafe-card-date-row">';
          html += '<svg class="sosafe-card-date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
          html += '<span class="sosafe-card-date-text">' + formatDate(sess.startDate) + '</span>';
          if (!sess.isFull) {
            html += '<a class="sosafe-card-date-link" href="' + enrollUrl + '?sessionId=' + sess.id + '" target="_blank" rel="noopener" data-enroll="true">S\'inscrire</a>';
          }
          html += '</div>';
        }
        html += '</div>';
      }
      html += '<button class="sosafe-card-btn" data-index="' + index + '">Voir le programme</button>';
      html += '</div></div>';
    });
    html += '</div>';
    html += '</div></div>';
    return html;
  }

  function renderModal(p) {
    var html = '<div class="sosafe-modal-overlay" data-role="modal-overlay">';
    html += '<div class="sosafe-modal">';
    html += '<button class="sosafe-modal-close" data-role="modal-close">\u00D7</button>';

    // Image
    var img = p.imageUrl || defaultImage;
    html += '<img class="sosafe-modal-img" src="' + img + '" alt="' + (p.title || "") + '" onerror="this.src=\'' + defaultImage + '\'">';

    html += '<div class="sosafe-modal-body">';

    // Badges
    html += '<div class="sosafe-modal-badges">';
    if (p.modality) {
      html += '<span class="sosafe-modal-badge sosafe-modal-badge-modality">' + modalityLabel(p.modality) + '</span>';
    }
    (p.categories || []).forEach(function (c) {
      html += '<span class="sosafe-modal-badge sosafe-modal-badge-cat">' + c + '</span>';
    });
    if (p.certifying) {
      html += '<span class="sosafe-modal-badge sosafe-modal-badge-cert">Certifiante</span>';
    }
    html += '</div>';

    // Title
    html += '<h2 class="sosafe-modal-title">' + (p.title || "Formation") + '</h2>';

    // Meta
    html += '<div class="sosafe-modal-meta">';
    if (p.duration) html += '<span>\u23F0 ' + formatDuration(p.duration) + '</span>';
    if (p.modality) html += '<span>\uD83D\uDCCD ' + modalityLabel(p.modality) + '</span>';
    if (p.certifying) html += '<span>\uD83C\uDF93 Certifiante</span>';
    html += '</div>';

    // Objectives
    if (p.objectives) {
      html += '<div class="sosafe-modal-section"><h3>Objectifs</h3><p>' + p.objectives + '</p></div>';
    }

    // Description
    if (p.description) {
      html += '<div class="sosafe-modal-section"><h3>Description</h3><p>' + p.description + '</p></div>';
    }

    // Programme content
    if (p.programContent) {
      html += '<div class="sosafe-modal-section"><h3>Programme</h3><p>' + p.programContent + '</p></div>';
    }

    // Prerequisites
    if (p.prerequisites) {
      html += '<div class="sosafe-modal-section"><h3>Pr\u00E9requis</h3><p>' + p.prerequisites + '</p></div>';
    }

    // Target audience
    if (p.targetAudience) {
      html += '<div class="sosafe-modal-section"><h3>Public vis\u00E9</h3><p>' + p.targetAudience + '</p></div>';
    }

    // Teaching methods
    if (p.teachingMethods) {
      html += '<div class="sosafe-modal-section"><h3>M\u00E9thodes p\u00E9dagogiques</h3><p>' + p.teachingMethods + '</p></div>';
    }

    // Evaluation
    if (p.evaluationMethods) {
      html += '<div class="sosafe-modal-section"><h3>\u00C9valuation</h3><p>' + p.evaluationMethods + '</p></div>';
    }

    // Accessibility
    if (p.accessibilityInfo) {
      html += '<div class="sosafe-modal-section"><h3>Accessibilit\u00E9</h3><p>' + p.accessibilityInfo + '</p></div>';
    }

    // Sessions
    if (p.sessions && p.sessions.length > 0) {
      html += '<div class="sosafe-modal-section"><h3>Sessions \u00E0 venir</h3></div>';
      html += '<div class="sosafe-modal-sessions">';
      p.sessions.forEach(function (s) {
        html += '<div class="sosafe-modal-session">';
        html += '<div>';
        html += '<div class="sosafe-modal-session-date">' + formatDateLong(s.startDate);
        if (s.endDate && s.endDate !== s.startDate) {
          html += ' \u2192 ' + formatDateLong(s.endDate);
        }
        html += '</div>';
        if (s.location) {
          html += '<div class="sosafe-modal-session-loc">\uD83D\uDCCD ' + s.location + '</div>';
        }
        html += '</div>';
        if (s.isFull) {
          html += '<span class="sosafe-modal-session-spots full">Complet</span>';
        } else {
          html += '<span class="sosafe-modal-session-spots available">' + s.remainingSpots + ' place' + (s.remainingSpots > 1 ? 's' : '') + '</span>';
        }
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="sosafe-no-session-modal">Aucune session pr\u00E9vue pour le moment</div>';
    }

    // Footer: price + CTA
    html += '<div class="sosafe-modal-footer">';
    if (p.price) {
      html += '<div class="sosafe-modal-price">' + formatPrice(p.price) + ' <small>HT</small></div>';
    } else {
      html += '<div class="sosafe-modal-price"><small>Prix sur demande</small></div>';
    }
    html += '<div style="display:flex;gap:.6rem;flex-wrap:wrap">';
    if (p.sessions && p.sessions.length > 0) {
      var firstAvailable = p.sessions.find(function (s) { return !s.isFull; });
      if (firstAvailable) {
        html += '<a class="sosafe-modal-cta" href="' + enrollUrl + '?sessionId=' + firstAvailable.id + '" target="_blank" rel="noopener">S\'inscrire</a>';
      }
    }
    html += '<a class="sosafe-modal-cta sosafe-modal-cta-outline" href="https://www.so-safe.fr/contact/" target="_blank" rel="noopener">Nous contacter</a>';
    html += '</div>';
    html += '</div></div></div></div>';
    return html;
  }

  function openModal(root, index) {
    var p = allPrograms[index];
    if (!p) return;
    var existing = root.querySelector('[data-role="modal-overlay"]');
    if (existing) existing.remove();
    var modalDiv = document.createElement("div");
    modalDiv.innerHTML = renderModal(p);
    root.appendChild(modalDiv.firstChild);

    // Close events
    var overlay = root.querySelector('[data-role="modal-overlay"]');
    var closeBtn = root.querySelector('[data-role="modal-close"]');
    if (closeBtn) {
      closeBtn.addEventListener("click", function () { overlay.remove(); });
    }
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) overlay.remove();
      });
    }
  }

  function setupInteractions(root) {
    // Card clicks → open modal
    var cards = root.querySelectorAll(".sosafe-card");
    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.tagName === "A" || e.target.closest("[data-enroll]")) return;
        var idx = parseInt(card.getAttribute("data-index"));
        openModal(root, idx);
      });
    });

    // "Voir le programme" buttons
    var btns = root.querySelectorAll(".sosafe-card-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute("data-index"));
        openModal(root, idx);
      });
    });

    // Search
    var searchInput = root.querySelector('[data-role="search"]');
    if (searchInput) {
      searchInput.addEventListener("input", function () { applyFilters(root); });
    }

    // Category dropdown
    var catSelect = root.querySelector('[data-role="cat-select"]');
    if (catSelect) {
      catSelect.addEventListener("change", function () { applyFilters(root); });
    }

    // Reset
    var resetBtn = root.querySelector('[data-role="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (searchInput) searchInput.value = "";
        if (catSelect) catSelect.value = "all";
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
        allPrograms = programs;
        var style = document.createElement("style");
        style.textContent = buildStyles(config.theme);
        shadow.innerHTML = "";
        shadow.appendChild(style);
        var wrapper = document.createElement("div");
        wrapper.innerHTML = renderCatalog(programs, config.theme, config);
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
