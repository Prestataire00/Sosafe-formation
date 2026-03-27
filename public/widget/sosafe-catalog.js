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

  // Preload Google Font non-blocking (outside shadow DOM)
  if (!document.querySelector('link[href*="Poppins"]')) {
    var fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";
    document.head.appendChild(fontLink);
  }

  var defaultTheme = {
    primaryColor: "#fec700",
    accentColor: "#00509f",
    fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
    borderRadius: "12px",
  };

  var defaultImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' fill='%23e5e7eb'%3E%3Crect width='400' height='250'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%239ca3af'%3EFormation SO'SAFE%3C/text%3E%3C/svg%3E";
  var bannerImage = "https://www.so-safe.fr/wp-content/uploads/2024/05/HD-11-scaled.jpg";

  var allPrograms = [];
  var widgetStats = null;

  function buildStyles(theme) {
    var t = Object.assign({}, defaultTheme, theme || {});
    return (
      "" +
      "*{box-sizing:border-box;margin:0;padding:0}" +
      ":host{display:block}" +
      ".sosafe-widget{font-family:" + t.fontFamily + ";color:#000;margin:0;padding:0}" +

      // Page header: banner image + overlay content + KPI bar
      ".sosafe-page-header{position:relative;width:100%;margin-bottom:0}" +
      ".sosafe-banner-img{width:100%;height:400px;object-fit:cover;display:block}" +
      ".sosafe-header-overlay{position:absolute;top:0;left:0;right:0;bottom:auto;padding:2rem;display:flex;flex-direction:column;justify-content:flex-end;height:calc(100% - 80px)}" +
      ".sosafe-breadcrumb{font-size:.9rem;color:#fff;margin-bottom:.5rem}" +
      ".sosafe-breadcrumb a{color:#fff;text-decoration:none}" +
      ".sosafe-breadcrumb a:hover{text-decoration:underline}" +
      ".sosafe-breadcrumb-sep{margin:0 .3rem}" +
      ".sosafe-page-title{font-size:2rem;font-weight:700;color:#fff;margin-bottom:.3rem;text-shadow:0 1px 4px rgba(0,0,0,.3)}" +
      ".sosafe-page-results{font-size:.9rem;color:rgba(255,255,255,.9)}" +
      ".sosafe-stats-bar{background:linear-gradient(-45deg,#F6DE14,#F7B136);padding:2rem 2rem;display:flex;justify-content:center;gap:3rem;flex-wrap:wrap}" +
      ".sosafe-stat{text-align:center;min-width:140px;display:flex;flex-direction:column;align-items:center}" +
      ".sosafe-stat-value{font-size:2.5rem;font-weight:800;color:#000;line-height:1.1;margin-bottom:.3rem}" +
      ".sosafe-stat-label{font-size:.75rem;color:#000;text-transform:uppercase;letter-spacing:.03em;font-weight:600;max-width:120px}" +

      // Content wrapper (centered below banner)
      ".sosafe-content{max-width:1200px;margin:0 auto;padding:0 1rem 2rem}" +

      // Search & Filters
      ".sosafe-search-bar{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center}" +
      ".sosafe-search-input{flex:1;min-width:200px;padding:.5rem .8rem .5rem 2.2rem;border:1px solid #ddd;border-radius:4px;font-size:.9rem;font-family:" + t.fontFamily + ";outline:none;transition:border-color .2s;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:8px center}" +
      ".sosafe-search-input:focus{border-color:" + t.primaryColor + "}" +
      ".sosafe-search-input::placeholder{color:#9ca3af}" +
      ".sosafe-select{padding:.5rem .6rem;border:1px solid #ddd;border-radius:4px;font-size:.85rem;font-family:" + t.fontFamily + ";background:#fff;cursor:pointer;outline:none;min-width:150px}" +
      ".sosafe-select:focus{border-color:" + t.primaryColor + "}" +
      ".sosafe-filter-label{font-size:.85rem;font-weight:600;color:#333;white-space:nowrap}" +
      ".sosafe-filter-btn{padding:.5rem 1.2rem;border:none;border-radius:0;cursor:pointer;font-size:.85rem;font-family:" + t.fontFamily + ";transition:all .2s;font-weight:500}" +
      ".sosafe-filter-reset{background:#fec700;border:1px solid #fec700;color:#000}" +
      ".sosafe-filter-reset:hover{background:#e6b400;border-color:#e6b400}" +
      ".sosafe-filter-submit{background:#fec700;color:#000}" +
      ".sosafe-filter-submit:hover{background:#e6b400}" +

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
      ".sosafe-card{border:none;border-radius:0;background:#fff;overflow:hidden;transition:box-shadow .3s;box-shadow:none;cursor:pointer}" +
      ".sosafe-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.1)}" +
      ".sosafe-card-img-wrap{position:relative;overflow:hidden}" +
      ".sosafe-card-img{width:100%;height:220px;object-fit:cover;display:block}" +
      ".sosafe-card-modality{position:absolute;top:10px;left:10px;background:#32373c;color:#fff;font-size:.7rem;font-weight:600;padding:.25rem .7rem;border-radius:9999px}" +
      ".sosafe-card-featured{position:absolute;top:10px;right:10px;background:linear-gradient(-45deg,#F6DE14,#F7B136);color:#32373c;font-size:.7rem;font-weight:700;padding:.25rem .7rem;border-radius:9999px}" +
      ".sosafe-card-body{padding:1rem}" +
      ".sosafe-card-title{font-size:.95rem;font-weight:700;margin-bottom:.4rem;line-height:1.3}" +
      ".sosafe-card-title-link{color:#000;text-decoration:none;cursor:pointer;transition:color .2s}" +
      ".sosafe-card-title-link:hover{color:#000;text-decoration:underline}" +
      ".sosafe-card-duration{font-size:.85rem;color:#6b7280;margin-bottom:.5rem}" +
      ".sosafe-card-dates-title{font-size:.8rem;font-weight:700;color:#000;margin-bottom:.3rem}" +
      ".sosafe-card-dates{margin-bottom:.8rem}" +
      ".sosafe-card-date-row{display:flex;align-items:center;gap:.4rem;margin-bottom:.2rem}" +
      ".sosafe-card-date-bullet{width:6px;height:6px;border-radius:50%;background:#fec700;flex-shrink:0}" +
      ".sosafe-card-date-text{font-size:.8rem;color:#333;font-weight:500}" +
      ".sosafe-card-location{font-size:.8rem;color:#6b7280;margin-bottom:.5rem;display:flex;align-items:center;gap:.3rem}" +
      ".sosafe-card-location svg{width:14px;height:14px;flex-shrink:0}" +
      ".sosafe-card-subtitle{font-size:.8rem;color:#6b7280;margin-bottom:.3rem;font-style:italic}" +
      ".sosafe-card-spots{display:inline-block;font-size:.75rem;font-weight:600;padding:.2rem .6rem;border-radius:9999px;margin-bottom:.6rem}" +
      ".sosafe-card-spots.available{color:#059669;background:#ecfdf5}" +
      ".sosafe-card-spots.full{color:#dc2626;background:#fef2f2}" +
      ".sosafe-card-spots.low{color:#d97706;background:#fffbeb}" +
      ".sosafe-card-btn{display:block;text-align:center;padding:calc(.667em + 2px) calc(1.333em + 2px);background:#fec700;color:#000;text-decoration:none;border-radius:0;font-size:1rem;font-weight:600;border:none;cursor:pointer;transition:background .2s;font-family:" + t.fontFamily + ";width:100%}" +
      ".sosafe-card-btn:hover{background:#e6b400}" +

      // List view
      ".list-view .sosafe-card{display:flex;flex-direction:row}" +
      ".list-view .sosafe-card-img-wrap{width:260px;flex-shrink:0}" +
      ".list-view .sosafe-card-img{height:100%;min-height:180px}" +
      ".list-view .sosafe-card-body{flex:1;display:flex;flex-direction:column;justify-content:center}" +

      // Detail page view (replaces catalog)
      ".sosafe-detail-page{}" +
      ".sosafe-detail-header{position:relative;width:100%}" +
      ".sosafe-detail-banner{width:100%;height:300px;object-fit:cover;display:block}" +
      ".sosafe-detail-header-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.35);display:flex;flex-direction:column;justify-content:flex-end;padding:2rem}" +
      ".sosafe-detail-breadcrumb{font-size:.9rem;color:#fff;margin-bottom:.5rem}" +
      ".sosafe-detail-breadcrumb a{color:#fff;text-decoration:none;cursor:pointer}" +
      ".sosafe-detail-breadcrumb a:hover{text-decoration:underline}" +
      ".sosafe-detail-title{font-size:2rem;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.3)}" +
      ".sosafe-detail-content{max-width:900px;margin:0 auto;padding:2rem 1rem}" +
      ".sosafe-detail-meta{display:flex;flex-wrap:wrap;gap:1.5rem;margin-bottom:1.5rem;font-size:.9rem;color:#6b7280;padding-bottom:1rem;border-bottom:1px solid #e5e7eb}" +
      ".sosafe-detail-meta span{display:flex;align-items:center;gap:.3rem}" +
      ".sosafe-modal-body{padding:0}" +
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
      ".sosafe-accessibility-header{display:flex;align-items:center;gap:.5rem}" +
      ".sosafe-accessibility-icon{width:28px;height:28px;flex-shrink:0}" +
      ".sosafe-accessibility-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:1rem 1.2rem;margin-top:.5rem}" +
      ".sosafe-accessibility-box p{margin-bottom:.5rem;font-size:.9rem;color:#4b5563;line-height:1.6}" +
      ".sosafe-accessibility-box p:last-child{margin-bottom:0}" +
      ".sosafe-accessibility-box strong{color:#000}" +
      ".sosafe-modal-sessions{margin-bottom:1.5rem}" +
      ".sosafe-modal-session{display:flex;justify-content:space-between;align-items:center;padding:.7rem 1rem;background:#f9fafb;border-radius:4px;margin-bottom:.4rem;font-size:.9rem}" +
      ".sosafe-modal-session-date{font-weight:600;color:#000}" +
      ".sosafe-modal-session-loc{color:#6b7280;font-size:.85rem}" +
      ".sosafe-modal-session-spots{font-size:.85rem;font-weight:600;padding:.2rem .6rem;border-radius:9999px}" +
      ".sosafe-modal-session-spots.available{color:#059669;background:#ecfdf5}" +
      ".sosafe-modal-session-spots.full{color:#dc2626;background:#fef2f2}" +
      ".sosafe-modal-footer{display:flex;justify-content:space-between;align-items:center;padding-top:1.2rem;border-top:2px solid #f3f4f6;margin-top:1.5rem}" +
      ".sosafe-modal-price{font-size:1.3rem;font-weight:700;color:#000}" +
      ".sosafe-modal-price small{font-size:.8rem;font-weight:400;color:#6b7280}" +
      ".sosafe-modal-cta{display:inline-block;padding:calc(.667em + 2px) calc(1.333em + 2px);background:#32373c;color:#fff;text-decoration:none;border-radius:9999px;font-size:1rem;font-weight:600;border:none;cursor:pointer;transition:background .2s;font-family:" + t.fontFamily + "}" +
      ".sosafe-modal-cta:hover{background:#23272b}" +
      ".sosafe-modal-cta-outline{background:transparent;color:#32373c;border:2px solid #32373c}" +
      ".sosafe-modal-cta-outline:hover{background:#32373c;color:#fff}" +
      ".sosafe-trainers{display:flex;flex-wrap:wrap;gap:1.5rem;margin-bottom:1.5rem}" +
      ".sosafe-trainer{text-align:center;min-width:100px}" +
      ".sosafe-trainer-avatar{width:70px;height:70px;border-radius:50%;object-fit:cover;margin:0 auto .5rem;display:block}" +
      ".sosafe-trainer-initials{background:linear-gradient(-45deg,#F6DE14,#F7B136);color:#000;font-size:1.2rem;font-weight:700;display:flex;align-items:center;justify-content:center}" +
      ".sosafe-trainer-name{font-size:.85rem;font-weight:600;color:#000}" +
      ".sosafe-trainer-specialty{font-size:.75rem;color:#6b7280}" +
      ".sosafe-trainer-bio{font-size:.75rem;color:#4b5563;margin-top:.3rem;line-height:1.4;text-align:left;max-width:280px}" +
      ".sosafe-no-session-modal{font-size:.9rem;color:#9ca3af;font-style:italic;padding:.8rem;background:#f9fafb;border-radius:4px;text-align:center}" +
      ".sosafe-back-link{display:inline-flex;align-items:center;gap:.4rem;color:#32373c;text-decoration:none;font-size:.9rem;font-weight:600;cursor:pointer;margin-bottom:1.5rem;transition:color .2s}" +
      ".sosafe-back-link:hover{color:#fec700}" +

      // Under construction banner
      ".sosafe-wip-banner{background:linear-gradient(135deg,#fff8e1,#fff3cd);border:2px solid #fec700;border-radius:8px;padding:1.5rem 2rem;margin:1.5rem auto;max-width:1200px;text-align:center;position:relative}" +
      ".sosafe-wip-icon{font-size:2rem;margin-bottom:.5rem}" +
      ".sosafe-wip-title{font-size:1.1rem;font-weight:700;color:#1a1a1a;margin-bottom:.5rem}" +
      ".sosafe-wip-text{font-size:.9rem;color:#555;line-height:1.6;margin-bottom:1rem}" +
      ".sosafe-wip-btn{display:inline-block;padding:.6rem 1.8rem;background:#fec700;color:#000;text-decoration:none;font-size:.95rem;font-weight:700;border:none;cursor:pointer;transition:all .25s;font-family:" + t.fontFamily + "}" +
      ".sosafe-wip-btn:hover{background:#e6b400;transform:translateY(-1px);box-shadow:0 4px 12px rgba(254,199,0,.4)}" +

      // States
      ".sosafe-loading{text-align:center;padding:3rem;color:#9ca3af;font-size:.9rem}" +
      ".sosafe-error{text-align:center;padding:3rem;color:#dc2626;font-size:.9rem}" +

      // Responsive
      "@media(max-width:900px){.sosafe-grid{grid-template-columns:repeat(2,1fr)}}" +
      "@media(max-width:600px){.sosafe-grid{grid-template-columns:1fr}.sosafe-banner-img{height:250px}.sosafe-header-overlay{padding:1rem}.sosafe-page-title{font-size:1.4rem}.sosafe-stats-bar{gap:1.5rem;padding:1.5rem 1rem}.sosafe-stat{min-width:100px}.sosafe-stat-value{font-size:2rem}.sosafe-search-bar{flex-direction:column}.list-view .sosafe-card{flex-direction:column}.list-view .sosafe-card-img-wrap{width:100%}.list-view .sosafe-card-img{height:200px}.sosafe-detail-banner{height:200px}.sosafe-detail-title{font-size:1.4rem}.sosafe-detail-content{padding:1.2rem}.sosafe-detail-meta{flex-direction:column;gap:.5rem}.sosafe-modal-footer{flex-direction:column;gap:1rem;text-align:center}}"
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

    // Page header: banner image + breadcrumb/title overlay + KPI bar
    html += '<header class="sosafe-page-header">';
    html += '<img class="sosafe-banner-img" src="' + bannerImage + '" alt="SO\'SAFE Formations" fetchpriority="high" width="1200" height="400">';
    html += '<div class="sosafe-header-overlay">';
    html += '<nav class="sosafe-breadcrumb"><a href="https://www.so-safe.fr/" target="_top">Accueil</a><span class="sosafe-breadcrumb-sep">\u203A</span> Formation</nav>';
    html += '<h1 class="sosafe-page-title">Formation</h1>';
    html += '<p class="sosafe-page-results">' + programs.length + ' r\u00E9sultats</p>';
    html += '</div>';
    html += '<div class="sosafe-stats-bar">';
    var stats = widgetStats || { totalTrainees: 668, totalPrograms: programs.length, successRate: 100, satisfactionRate: 99, recommendationRate: 99 };
    function statHtml(value, label, isPercent) {
      var displayVal = isPercent ? value + '%' : value;
      return '<div class="sosafe-stat"><div class="sosafe-stat-value">' + displayVal + '</div><div class="sosafe-stat-label">' + label + '</div></div>';
    }
    html += statHtml(stats.satisfactionRate, 'Taux de satisfaction', true);
    html += statHtml(stats.recommendationRate, 'Taux de recommandation', true);
    html += statHtml(stats.successRate, 'Taux de r\u00E9ussite', true);
    html += statHtml(stats.totalTrainees, 'Nombre d\'apprenants', false);
    html += '</div>';
    html += '</header>';

    // Under construction banner
    html += '<div class="sosafe-wip-banner">';
    html += '<div class="sosafe-wip-icon">\u26A0\uFE0F</div>';
    html += '<div class="sosafe-wip-title">Page en cours de construction \u2014 <a href="https://www.so-safe.fr/formations/" target="_top" style="color:#b45309;text-decoration:underline">Consultez nos formations ici</a></div>';
    html += '<div class="sosafe-wip-text">Les informations affich\u00E9es sur cette page ne sont pas \u00E0 jour. Merci de vous r\u00E9f\u00E9rer \u00E0 <a href="https://www.so-safe.fr/formations/" target="_top" style="color:#b45309;font-weight:600;text-decoration:underline">notre page formations</a> pour des informations actualis\u00E9es.</div>';
    html += '<a class="sosafe-wip-btn" href="https://www.so-safe.fr/formations/" target="_top">Voir nos formations \u00E0 jour</a>';
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
    html += '<input type="text" class="sosafe-search-input" placeholder="Saisissez au moins trois caract\u00E8res pour lancer le filtrage.." data-role="search">';
    html += '<label class="sosafe-filter-label">Cat\u00E9gorie</label>';
    html += '<select class="sosafe-select" data-role="cat-select">';
    html += '<option value="all">Indiff\u00E9rent</option>';
    categories.forEach(function (cat) {
      html += '<option value="' + cat + '">' + cat + '</option>';
    });
    html += '</select>';
    html += '<label class="sosafe-filter-label">Sur-mesure</label>';
    html += '<select class="sosafe-select" data-role="surmesure-select">';
    html += '<option value="all">Indiff\u00E9rent</option>';
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
      html += '<img class="sosafe-card-img" src="' + img + '" alt="' + (p.title || "Formation") + '" loading="lazy" onerror="this.src=\'' + defaultImage + '\'">';
      if (p.modality) {
        html += '<div class="sosafe-card-modality">' + modalityLabel(p.modality) + '</div>';
      }
      if (p.featured) {
        html += '<div class="sosafe-card-featured">\u2B50 En vedette</div>';
      }
      html += '</div>';

      // Body: title + duration + next date + button
      html += '<div class="sosafe-card-body">';
      html += '<div class="sosafe-card-title"><a class="sosafe-card-title-link" data-index="' + index + '">' + (p.title || "Formation") + '</a></div>';
      if (p.subtitle) {
        html += '<div class="sosafe-card-subtitle">' + p.subtitle + '</div>';
      }
      if (p.duration) {
        html += '<div class="sosafe-card-duration">' + formatDuration(p.duration) + '</div>';
      }
      if (p.sessions && p.sessions.length > 0) {
        var firstAvail = p.sessions.find(function(s) { return !s.isFull; });
        if (firstAvail) {
          html += '<div class="sosafe-card-dates-title">Prochaine session</div>';
          html += '<div class="sosafe-card-dates">';
          html += '<div class="sosafe-card-date-row">';
          html += '<span class="sosafe-card-date-bullet"></span>';
          html += '<span class="sosafe-card-date-text">' + formatDate(firstAvail.startDate) + ' \u2013 ' + firstAvail.remainingSpots + ' place' + (firstAvail.remainingSpots > 1 ? 's' : '') + '</span>';
          html += '</div></div>';
          if (firstAvail.location) {
            html += '<div class="sosafe-card-location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + firstAvail.location + '</div>';
          }
        } else {
          html += '<div class="sosafe-card-dates-title" style="color:#dc2626">Complet</div>';
          html += '<div class="sosafe-card-dates"><div class="sosafe-card-date-row"><span class="sosafe-card-date-text" style="font-style:italic;color:#6b7280">Contactez-nous pour les prochaines dates</span></div></div>';
        }
      } else {
        html += '<div class="sosafe-card-dates-title">Prochaine session</div>';
        html += '<div class="sosafe-card-dates"><div class="sosafe-card-date-row"><span class="sosafe-card-date-text" style="font-style:italic;color:#6b7280"><a href="https://www.so-safe.fr/contact/" target="_top" style="color:#6b7280;text-decoration:underline">Nous contacter</a></span></div></div>';
      }
      html += '<button class="sosafe-card-btn" data-index="' + index + '">Voir le programme</button>';
      html += '</div></div>';
    });
    html += '</div>';
    html += '</div></div>';
    return html;
  }

  function renderDetailPage(p) {
    var img = p.imageUrl || defaultImage;
    var html = '<div class="sosafe-widget"><div class="sosafe-detail-page">';

    // Banner with overlay
    html += '<div class="sosafe-detail-header">';
    html += '<img class="sosafe-detail-banner" src="' + img + '" alt="' + (p.title || "") + '" onerror="this.src=\'' + bannerImage + '\'">';
    html += '<div class="sosafe-detail-header-overlay">';
    html += '<nav class="sosafe-detail-breadcrumb"><a data-role="back-to-catalog">Accueil</a> \u203A <a data-role="back-to-catalog">Formation</a> \u203A ' + (p.title || "Formation") + '</nav>';
    html += '<h1 class="sosafe-detail-title">' + (p.title || "Formation") + '</h1>';
    html += '</div></div>';

    // Content
    html += '<div class="sosafe-detail-content">';

    // Back link
    html += '<a class="sosafe-back-link" data-role="back-to-catalog">\u2190 Retour aux formations</a>';

    // Meta bar
    html += '<div class="sosafe-detail-meta">';
    if (p.duration) html += '<span>' + formatDuration(p.duration) + '</span>';
    if (p.modality) html += '<span>' + modalityLabel(p.modality) + '</span>';
    if (p.sessions && p.sessions.length > 0 && p.sessions[0].maxParticipants) {
      html += '<span>' + p.sessions[0].maxParticipants + ' participants max</span>';
    }
    if (p.price) html += '<span>' + formatPrice(p.price) + ' HT/pers (exon\u00E9ration de TVA art 261 du CGI)</span>';
    html += '</div>';

    // Badges
    html += '<div class="sosafe-modal-badges">';
    if (p.modality) {
      html += '<span class="sosafe-modal-badge sosafe-modal-badge-modality">' + modalityLabel(p.modality) + '</span>';
    }
    (p.categories || []).forEach(function (c) {
      html += '<span class="sosafe-modal-badge sosafe-modal-badge-cat">' + c + '</span>';
    });
    if (p.certifying) {
      html += '<span class="sosafe-modal-badge sosafe-modal-badge-cert">Qualifiante</span>';
    }
    html += '</div>';

    // Description
    if (p.description) {
      html += '<div class="sosafe-modal-section"><h3>Description</h3><p>' + p.description + '</p></div>';
    }

    // Programme d\u00E9taill\u00E9
    if (p.programContent) {
      html += '<div class="sosafe-modal-section"><h3>Programme d\u00E9taill\u00E9</h3><p>' + p.programContent + '</p></div>';
    }

    // Objectifs p\u00E9dagogiques
    if (p.objectives) {
      html += '<div class="sosafe-modal-section"><h3>Objectifs p\u00E9dagogiques</h3><p>' + p.objectives + '</p></div>';
    }

    // Public vis\u00E9
    if (p.targetAudience) {
      html += '<div class="sosafe-modal-section"><h3>Public vis\u00E9</h3><p>' + p.targetAudience + '</p></div>';
    }

    // Pr\u00E9requis
    if (p.prerequisites) {
      html += '<div class="sosafe-modal-section"><h3>Pr\u00E9requis</h3><p>' + p.prerequisites + '</p></div>';
    }

    // Moyens p\u00E9dagogiques
    if (p.teachingMethods) {
      html += '<div class="sosafe-modal-section"><h3>Moyens p\u00E9dagogiques</h3><p>' + p.teachingMethods + '</p></div>';
    }

    // Modalit\u00E9s d'\u00E9valuation
    if (p.evaluationMethods) {
      html += '<div class="sosafe-modal-section"><h3>Modalit\u00E9s d\'\u00E9valuation</h3><p>' + p.evaluationMethods + '</p></div>';
    }

    // Accessibilit\u00E9
    html += '<div class="sosafe-modal-section">';
    html += '<h3 class="sosafe-accessibility-header"><img class="sosafe-accessibility-icon" src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Ccircle cx=%2712%27 cy=%274%27 r=%272%27 fill=%27%230369a1%27/%3E%3Cpath d=%27M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43C13.17 7.23 12.37 7 11.7 7c-.35 0-.71.07-1.03.22L6 9.7V14h2v-3.4l2.07-1.04L8.5 15.6 4 20l1.45 1.45L9.5 17 13 13.5V20h2v-8.45l-1.87-3.18C14.3 13.14 16.51 14 19 13z%27 fill=%27%230369a1%27/%3E%3C/svg%3E" alt="Accessibilit\u00E9"/>Accessibilit\u00E9</h3>';
    html += '<div class="sosafe-accessibility-box">';
    html += '<p>' + (p.accessibilityInfo || 'Nos formations sont accessibles aux personnes en situation de handicap. N\'h\u00E9sitez pas \u00E0 nous contacter pour \u00E9tudier ensemble les modalit\u00E9s d\'adaptation.') + '</p>';
    if (p.referentHandicap) {
      html += '<p><strong>R\u00E9f\u00E9rent handicap :</strong> ' + p.referentHandicap + '</p>';
    }
    if (p.referentContact) {
      html += '<p><strong>Contact :</strong> ' + p.referentContact + '</p>';
    }
    html += '</div></div>';

    // D\u00E9lais et modalit\u00E9s d'acc\u00E8s
    html += '<div class="sosafe-modal-section"><h3>D\u00E9lais et modalit\u00E9s d\'acc\u00E8s</h3><p>' + (p.accessDelay || 'A r\u00E9ception de la demande, r\u00E9ponse sous 48H. Apr\u00E8s la signature du devis, la date de formation sera d\u00E9termin\u00E9e d\'un commun accord avec les b\u00E9n\u00E9ficiaires, en g\u00E9n\u00E9ral 1 mois apr\u00E8s maximum. Inscription apr\u00E8s signature du devis et de la convention selon les informations transmises par le commanditaire.') + '</p></div>';

    // Formateurs
    if (p.trainers && p.trainers.length > 0) {
      html += '<div class="sosafe-modal-section"><h3>Votre \u00E9quipe p\u00E9dagogique</h3></div>';
      html += '<div class="sosafe-trainers">';
      p.trainers.forEach(function (tr) {
        html += '<div class="sosafe-trainer">';
        if (tr.avatarUrl) {
          html += '<img class="sosafe-trainer-avatar" src="' + tr.avatarUrl + '" alt="' + tr.firstName + ' ' + tr.lastName + '">';
        } else {
          html += '<div class="sosafe-trainer-avatar sosafe-trainer-initials">' + (tr.firstName || '')[0] + (tr.lastName || '')[0] + '</div>';
        }
        html += '<div class="sosafe-trainer-name">' + tr.firstName + ' ' + tr.lastName + '</div>';
        if (tr.specialty) {
          html += '<div class="sosafe-trainer-specialty">' + tr.specialty + '</div>';
        }
        if (tr.bio) {
          html += '<div class="sosafe-trainer-bio">' + tr.bio + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // Sessions \u00E0 venir
    if (p.sessions && p.sessions.length > 0) {
      html += '<div class="sosafe-modal-section"><h3>Sessions \u00E0 venir</h3></div>';
      html += '<div class="sosafe-modal-sessions">';
      var sortedSessions = p.sessions.slice().sort(function(a, b) { return (a.startDate || "").localeCompare(b.startDate || ""); });
      sortedSessions.forEach(function (s) {
        html += '<div class="sosafe-modal-session">';
        html += '<div>';
        html += '<div class="sosafe-modal-session-date">' + formatDateLong(s.startDate);
        if (s.endDate && s.endDate !== s.startDate) {
          html += ' \u2192 ' + formatDateLong(s.endDate);
        }
        html += '</div>';
        if (s.location) {
          html += '<div class="sosafe-modal-session-loc">' + s.location + '</div>';
        }
        html += '</div>';
        if (s.isFull) {
          html += '<span class="sosafe-modal-session-spots full">Complet</span>';
        } else {
          html += '<div style="display:flex;align-items:center;gap:.5rem">';
          html += '<span class="sosafe-modal-session-spots available">' + s.remainingSpots + ' place' + (s.remainingSpots > 1 ? 's' : '') + '</span>';
          html += '<a class="sosafe-modal-cta" style="padding:.4rem 1rem;font-size:.8rem" href="' + enrollUrl + '?sessionId=' + s.id + '" target="_blank" rel="noopener">S\'inscrire</a>';
          html += '</div>';
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
      html += '<div class="sosafe-modal-price">' + formatPrice(p.price) + ' <small>HT/pers (exon\u00E9ration de TVA art 261 du CGI)</small></div>';
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

  var currentView = 'catalog'; // 'catalog' or 'detail'
  var catalogHTML = '';

  function showDetailPage(root, index) {
    var p = allPrograms[index];
    if (!p) return;
    currentView = 'detail';

    // Save current catalog HTML
    var widgetEl = root.querySelector('.sosafe-widget');
    if (widgetEl) {
      catalogHTML = widgetEl.parentElement.innerHTML;
    }

    // Scroll to top of widget
    var host = root.host || root;
    if (host && host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth' });

    // Replace content with detail page
    var wrapper = root.querySelector('.sosafe-widget');
    if (wrapper && wrapper.parentElement) {
      wrapper.parentElement.innerHTML = renderDetailPage(p);
    }

    // Setup back navigation
    var backLinks = root.querySelectorAll('[data-role="back-to-catalog"]');
    backLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        showCatalog(root);
      });
    });
  }

  function showCatalog(root) {
    currentView = 'catalog';
    if (catalogHTML) {
      var wrapper = root.querySelector('.sosafe-widget');
      if (wrapper && wrapper.parentElement) {
        wrapper.parentElement.innerHTML = catalogHTML;
      }
      setupInteractions(root);
    }
  }

  function setupInteractions(root) {
    // Card clicks → open modal
    var cards = root.querySelectorAll(".sosafe-card");
    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.tagName === "A" || e.target.closest("[data-enroll]")) return;
        var idx = parseInt(card.getAttribute("data-index"));
        showDetailPage(root, idx);
      });
    });

    // "Voir le programme" buttons
    var btns = root.querySelectorAll(".sosafe-card-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute("data-index"));
        showDetailPage(root, idx);
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

  function renderBundle(bundle) {
    var config = bundle.config || {};
    var programs = bundle.programs || [];
    widgetStats = bundle.stats || null;
    if (widgetStats) {
      widgetStats.totalPrograms = programs.length;
    }
    allPrograms = programs;
    var style = document.createElement("style");
    style.textContent = buildStyles(config.theme);
    shadow.innerHTML = "";
    shadow.appendChild(style);
    var wrapper = document.createElement("div");
    wrapper.innerHTML = renderCatalog(programs, config.theme, config);
    shadow.appendChild(wrapper);
    setupInteractions(shadow);
  }

  function fetchData() {
    var headers = { "X-API-Key": apiKey };
    var bundleUrl = baseUrl + "/api/v1/widget/bundle";
    if (widgetId) bundleUrl += "?widgetId=" + widgetId;

    fetch(bundleUrl, { headers: headers })
      .then(function (r) {
        if (!r.ok) throw new Error("Erreur " + r.status);
        return r.json();
      })
      .then(function (bundle) {
        renderBundle(bundle);
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

  // If data is pre-embedded by the server (SSR), render instantly. Otherwise fetch.
  if (window.__SOSAFE_WIDGET_DATA__) {
    renderBundle(window.__SOSAFE_WIDGET_DATA__);
  } else {
    shadow.innerHTML = '<div style="text-align:center;padding:3rem;color:#9ca3af;font-size:.9rem">Chargement des formations...</div>';
    fetchData();
  }
})();
