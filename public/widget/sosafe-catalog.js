(function () {
  "use strict";

  var script = document.currentScript;
  var apiKey = script.getAttribute("data-api-key");
  var widgetId = script.getAttribute("data-widget-id");
  var baseUrl = script.src.replace(/\/widget\/sosafe-catalog\.js.*$/, "");
  var formationsPageUrl = script.getAttribute("data-formations-url") || "https://www.so-safe.fr/formations/";

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

  var bannerImage = "https://www.so-safe.fr/wp-content/uploads/2024/05/HD-11-scaled.jpg";

  function buildStyles(theme) {
    var t = Object.assign({}, defaultTheme, theme || {});
    return (
      "@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');" +
      "*{box-sizing:border-box;margin:0;padding:0}" +
      ":host{display:block}" +
      ".sosafe-widget{font-family:" + t.fontFamily + ";color:#000;margin:0;padding:0}" +

      // Page header
      ".sosafe-page-header{position:relative;width:100%;margin-bottom:0}" +
      ".sosafe-banner-img{width:100%;height:400px;object-fit:cover;display:block}" +
      ".sosafe-header-overlay{position:absolute;top:0;left:0;right:0;bottom:auto;padding:2rem;display:flex;flex-direction:column;justify-content:flex-end;height:calc(100% - 80px)}" +
      ".sosafe-breadcrumb{font-size:.9rem;color:#fff;margin-bottom:.5rem}" +
      ".sosafe-breadcrumb a{color:#fff;text-decoration:none}" +
      ".sosafe-breadcrumb a:hover{text-decoration:underline}" +
      ".sosafe-breadcrumb-sep{margin:0 .3rem}" +
      ".sosafe-page-title{font-size:2rem;font-weight:700;color:#fff;margin-bottom:.3rem;text-shadow:0 1px 4px rgba(0,0,0,.3)}" +
      ".sosafe-stats-bar{background:linear-gradient(-45deg,#F6DE14,#F7B136);padding:1.2rem 2rem;display:flex;justify-content:center;gap:3rem;flex-wrap:wrap}" +
      ".sosafe-stat{text-align:center;min-width:120px}" +
      ".sosafe-stat-value{font-size:2rem;font-weight:700;color:#000}" +
      ".sosafe-stat-label{font-size:.75rem;color:#000;text-transform:uppercase;letter-spacing:.03em;font-weight:500}" +

      // Under construction section
      ".sosafe-construction{max-width:720px;margin:0 auto;padding:3rem 1.5rem 4rem}" +
      ".sosafe-construction-inner{text-align:center}" +
      ".sosafe-construction-icon{margin-bottom:1.5rem}" +
      ".sosafe-construction-icon svg{display:inline-block}" +
      ".sosafe-construction-title{font-size:1.6rem;font-weight:700;color:#1a1a1a;margin-bottom:1rem;line-height:1.3}" +
      ".sosafe-construction-text{font-size:1rem;color:#555;line-height:1.7;margin-bottom:2rem}" +
      ".sosafe-construction-divider{width:60px;height:3px;background:linear-gradient(-45deg,#F6DE14,#F7B136);margin:0 auto 2rem;border-radius:2px}" +
      ".sosafe-construction-redirect{font-size:1rem;color:#333;line-height:1.6;margin-bottom:1.5rem;font-weight:500}" +
      ".sosafe-construction-btn{display:inline-block;padding:.9rem 2.5rem;background:#fec700;color:#000;text-decoration:none;border-radius:0;font-size:1.05rem;font-weight:700;border:none;cursor:pointer;transition:all .25s;font-family:" + t.fontFamily + ";letter-spacing:.02em}" +
      ".sosafe-construction-btn:hover{background:#e6b400;transform:translateY(-1px);box-shadow:0 4px 12px rgba(254,199,0,.4)}" +
      ".sosafe-construction-contact{margin-top:2.5rem;padding-top:2rem;border-top:1px solid #e5e7eb}" +
      ".sosafe-construction-contact p{font-size:.9rem;color:#6b7280;margin-bottom:.8rem}" +
      ".sosafe-construction-contact-link{display:inline-block;padding:.6rem 1.8rem;background:transparent;color:#32373c;text-decoration:none;border:2px solid #32373c;border-radius:0;font-size:.9rem;font-weight:600;cursor:pointer;transition:all .25s;font-family:" + t.fontFamily + "}" +
      ".sosafe-construction-contact-link:hover{background:#32373c;color:#fff}" +

      // Responsive
      "@media(max-width:600px){.sosafe-banner-img{height:250px}.sosafe-header-overlay{padding:1rem}.sosafe-page-title{font-size:1.4rem}.sosafe-stats-bar{gap:1rem;padding:1rem}.sosafe-stat-value{font-size:1.3rem}.sosafe-construction{padding:2rem 1rem 3rem}.sosafe-construction-title{font-size:1.3rem}.sosafe-construction-btn{width:100%;text-align:center}}"
    );
  }

  function renderPage() {
    var html = '<div class="sosafe-widget">';

    // Page header: banner + overlay + stats
    html += '<header class="sosafe-page-header">';
    html += '<img class="sosafe-banner-img" src="' + bannerImage + '" alt="SO\'SAFE Formations">';
    html += '<div class="sosafe-header-overlay">';
    html += '<nav class="sosafe-breadcrumb"><a href="https://www.so-safe.fr/" target="_top">Accueil</a><span class="sosafe-breadcrumb-sep">\u203A</span> Nos Formations</nav>';
    html += '<h1 class="sosafe-page-title">Nos Formations</h1>';
    html += '</div>';
    html += '</header>';

    // Under construction notice
    html += '<div class="sosafe-construction">';
    html += '<div class="sosafe-construction-inner">';

    // Clock/construction icon
    html += '<div class="sosafe-construction-icon">';
    html += '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">';
    html += '<circle cx="12" cy="12" r="10" stroke="#F7B136" stroke-width="1.5"/>';
    html += '<path d="M12 7v5l3.5 2" stroke="#F7B136" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
    html += '<path d="M4.5 19.5l1-1M19.5 19.5l-1-1" stroke="#F7B136" stroke-width="1.5" stroke-linecap="round"/>';
    html += '</svg>';
    html += '</div>';

    html += '<h2 class="sosafe-construction-title">Cette page est en cours de construction</h2>';
    html += '<p class="sosafe-construction-text">Nous travaillons actuellement \u00E0 la refonte de cette page pour vous proposer une exp\u00E9rience encore meilleure. Les informations pr\u00E9sent\u00E9es ici ne sont pas \u00E0 jour.</p>';
    html += '<div class="sosafe-construction-divider"></div>';
    html += '<p class="sosafe-construction-redirect">Pour consulter nos formations et vous inscrire, rendez-vous sur notre page d\u00E9di\u00E9e :</p>';
    html += '<a class="sosafe-construction-btn" href="' + formationsPageUrl + '" target="_top">D\u00E9couvrir nos formations</a>';

    html += '<div class="sosafe-construction-contact">';
    html += '<p>Une question ? Notre \u00E9quipe est \u00E0 votre disposition.</p>';
    html += '<a href="https://www.so-safe.fr/contact/" target="_blank" rel="noopener" class="sosafe-construction-contact-link">Nous contacter</a>';
    html += '</div>';

    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
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
        wrapper.innerHTML = renderPage();
        shadow.appendChild(wrapper);
      })
      .catch(function (err) {
        shadow.innerHTML = "";
        var style = document.createElement("style");
        style.textContent = buildStyles(null);
        shadow.appendChild(style);
        var div = document.createElement("div");
        div.innerHTML = renderPage();
        shadow.appendChild(div);
        console.error("[SO'SAFE Widget]", err);
      });
  }

  shadow.innerHTML = '<div style="text-align:center;padding:3rem;color:#9ca3af;font-size:.9rem;font-family:Poppins,sans-serif">Chargement...</div>';
  fetchData();
})();
