const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// Find start of hospital map logic around DISTRICT_CENTERS
const targetStart = '  let hospitalMapInstance = null;\n  let userLocationCoords = null;\n  let routePolyline = null;';

const replacementStart = `  let hospitalMapInstance = null;
  let userLocationCoords = null;
  let routePolyline = null;
  let activeHospitalCategory = 'all';
  let hospitalSearchQuery = '';
  let hospitalVisibleCount = 12;`;

if (!content.includes(targetStart)) {
  console.error('Could not find targetStart in app.js');
  process.exit(1);
}

content = content.replace(targetStart, replacementStart);

// Now replace renderHospitalMapAndCards and initHospitalMapControls
const funcStart = '  function renderHospitalMapAndCards(userPos) {';
const funcEnd = '  initHospitalMapControls();';

const idxStart = content.indexOf(funcStart);
const idxEnd = content.indexOf(funcEnd);

if (idxStart === -1 || idxEnd === -1) {
  console.error('Could not find renderHospitalMapAndCards in app.js');
  process.exit(1);
}

const newFunctions = `  function renderHospitalMapAndCards(userPos) {
    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';

    const sortedAll = GOVT_HOSPITALS.map((h) => {
      const dist = haversineKm(userPos.lat, userPos.lng, h.lat, h.lng);
      const eta = calcDriveMinutes(dist);
      return { ...h, dist, eta };
    }).sort((a, b) => a.dist - b.dist);

    const closestOverall = sortedAll[0];

    // Filter by category and search query
    const filtered = sortedAll.filter((h) => {
      if (activeHospitalCategory !== 'all' && h.category !== activeHospitalCategory) {
        return false;
      }
      if (hospitalSearchQuery) {
        const q = hospitalSearchQuery.toLowerCase().trim();
        const haystack = (h.name + ' ' + (h.nameOr || '') + ' ' + (h.nameHi || '') + ' ' + (h.address || '') + ' ' + (h.district || '') + ' ' + (h.type || '')).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const closest = filtered[0] || closestOverall;

    // Update Floating Delivery-Style HUD
    const hud = $('liveRouteHud');
    const hudName = $('liveRouteHospitalName');
    const hudEta = $('liveRouteEta');
    const hudBtn = $('liveRouteGmapsBtn');

    if (hud && closest) {
      hud.hidden = false;
      const displayName = isHi ? closest.nameHi : (isOr ? closest.nameOr : closest.name);
      if (hudName) hudName.textContent = displayName;
      if (hudEta) {
        hudEta.textContent = isHi
          ? \`🚗 \${closest.dist.toFixed(1)} किमी • ~\${closest.eta} मिनट ड्राइव\`
          : (isOr ? \`🚗 \${closest.dist.toFixed(1)} କିମି • ~\${closest.eta} ମିନିଟ୍ ଡ୍ରାଇଭ୍\` : \`🚗 \${closest.dist.toFixed(1)} km • ~\${closest.eta} min drive\`);
      }
      if (hudBtn) {
        hudBtn.href = \`https://www.google.com/maps/dir/?api=1&destination=\${closest.lat},\${closest.lng}&travelmode=driving\`;
        hudBtn.textContent = isHi ? 'दिशा देखें ↗' : (isOr ? 'ରାସ୍ତା ଦେଖନ୍ତୁ ↗' : 'Navigate ↗');
      }
    }

    // Direct 1-Click Search: Centers Google Maps with live coordinates
    const extGmaps = $('externalGmapsNearMe');
    if (extGmaps) {
      extGmaps.href = \`https://www.google.com/maps/search/hospitals+near+me/@\${userPos.lat},\${userPos.lng},14z\`;
    }

    const badge = $('hospitalCountBadge');
    if (badge) {
      badge.textContent = isHi
        ? \`\${filtered.length} स्वास्थ्य केंद्र उपलब्ध\`
        : (isOr ? \`\${filtered.length}ଟି ସ୍ୱାସ୍ଥ୍ୟକେନ୍ଦ୍ର ସକ୍ରିୟ\` : \`\${filtered.length} Verified Facilities Active\`);
    }

    const container = $('hospitalListContainer');
    if (container) {
      container.innerHTML = '';
      if (filtered.length === 0) {
        container.innerHTML = \`<div style="text-align:center;padding:24px 12px;color:var(--muted);font-weight:600;">\${
          isHi ? 'कोई अस्पताल नहीं मिला। कृपया दूसरा शब्द या जिला खोजें।' : (isOr ? 'କୌଣସି ଡାକ୍ତରଖାନା ମିଳିଲା ନାହିଁ । ଦୟାକରି ଅନ୍ୟ ଜିଲ୍ଲା ବା ଶବ୍ଦ ଖୋଜନ୍ତୁ ।' : 'No matching facilities found. Try another search or select a district.')
        }</div>\`;
      }

      const visibleList = filtered.slice(0, hospitalVisibleCount);
      visibleList.forEach((h, idx) => {
        const card = document.createElement('div');
        card.className = 'hospital-card' + (idx === 0 ? ' closest' : '');
        const dispName = isHi ? h.nameHi : (isOr ? h.nameOr : h.name);
        const gmapsDirUrl = \`https://www.google.com/maps/dir/?api=1&destination=\${h.lat},\${h.lng}&travelmode=driving\`;
        const phone = h.phone || '108';

        let catClass = 'cat-chc';
        let catLabel = isHi ? 'सीएचसी' : (isOr ? 'ସିଏଚସି' : 'CHC');
        if (h.category === 'mch') {
          catClass = 'cat-mch';
          catLabel = isHi ? 'एम्स / मेडिकल कॉलेज' : (isOr ? 'ମେଡିକାଲ କଲେଜ' : 'Apex MCH');
        } else if (h.category === 'dhh') {
          catClass = 'cat-dhh';
          catLabel = isHi ? 'जिला मुख्य अस्पताल (DHH)' : (isOr ? 'ଜିଲ୍ଲା ମୁଖ୍ୟ (DHH)' : 'District Hospital (DHH)');
        } else if (h.category === 'sdh') {
          catClass = 'cat-sdh';
          catLabel = isHi ? 'उप-मंडलीय अस्पताल (SDH)' : (isOr ? 'ଉପ-ଖଣ୍ଡ (SDH)' : 'Sub-Divisional (SDH)');
        }

        card.innerHTML = \`
          <div class="hospital-card-top">
            <div>
              <h4 class="hospital-card-name">\${dispName} <span class="cat-badge \${catClass}">\${catLabel}</span></h4>
              <div class="hospital-card-sub">\${h.address}</div>
            </div>
            <span class="hospital-card-badge">\${idx === 0 ? (isHi ? '🏆 सबसे पास' : (isOr ? '🏆 ନିକଟତମ' : '🏆 Closest')) : '🚨 24x7'}</span>
          </div>
          <div class="hospital-card-meta">
            <span class="hospital-meta-dist">
              🚗 \${h.dist.toFixed(1)} km • ~\${h.eta} min drive
            </span>
            <span style="color:var(--muted);">&bull;</span>
            <span style="font-size:0.75rem;color:var(--muted);">\${h.type}</span>
          </div>
          <div class="hospital-card-actions">
            <a href="\${gmapsDirUrl}" target="_blank" rel="noopener noreferrer" class="btn-nav-gmaps">
              🧭 \${isHi ? 'Google Maps पर लाइव रास्ता' : (isOr ? 'Google Maps ରେ ରାସ୍ତା ଦେଖନ୍ତୁ' : 'Start Google Maps Navigation')}
            </a>
            <a href="tel:\${phone}" class="btn-call-hospital">
              📞 \${isHi ? 'हेल्पलाइन कॉल' : (isOr ? 'କଲ୍ କରନ୍ତୁ' : 'Call Desk')}
            </a>
          </div>
        \`;
        container.appendChild(card);
      });

      if (filtered.length > hospitalVisibleCount) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'btn-load-more-hospitals';
        moreBtn.type = 'button';
        const remaining = filtered.length - hospitalVisibleCount;
        moreBtn.textContent = isHi
          ? \`➕ और अस्पताल देखें (\${remaining} और बाकी)\`
          : (isOr ? \`➕ ଅଧିକ ଡାକ୍ତରଖାନା ଦେଖନ୍ତୁ (\${remaining}ଟି ବାକି)\` : \`➕ Load More Hospitals (\${remaining} remaining)\`);
        moreBtn.addEventListener('click', () => {
          hospitalVisibleCount += 12;
          renderHospitalMapAndCards(userPos);
        });
        container.appendChild(moreBtn);
      }
    }

    // Leaflet map rendering (Delivery-agent style tracking with top 10 pins)
    if (typeof window !== 'undefined' && typeof window.L !== 'undefined') {
      const mapContainer = $('hospitalLiveMap');
      if (!mapContainer) return;

      if (hospitalMapInstance) {
        try { hospitalMapInstance.remove(); } catch {}
        hospitalMapInstance = null;
      }

      try {
        hospitalMapInstance = window.L.map('hospitalLiveMap', {
          zoomControl: true,
          attributionControl: false
        }).setView([userPos.lat, userPos.lng], 12);

        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(hospitalMapInstance);

        const userRadarIcon = window.L.divIcon({
          className: 'user-radar-pin',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
        const userMarker = window.L.marker([userPos.lat, userPos.lng], { icon: userRadarIcon }).addTo(hospitalMapInstance);
        userMarker.bindPopup(isHi ? '📍 आपकी लाइव स्थिति' : (isOr ? '📍 ଆପଣଙ୍କ ଲାଇଭ୍ ସ୍ଥିତି' : '📍 Your Live Location'));

        const bounds = [[userPos.lat, userPos.lng]];
        filtered.slice(0, 10).forEach((h) => {
          const hospIcon = window.L.divIcon({
            className: 'hospital-beacon-pin',
            html: h.category === 'mch' ? '🏛️' : (h.category === 'dhh' ? '🏥' : '🩺'),
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          const m = window.L.marker([h.lat, h.lng], { icon: hospIcon }).addTo(hospitalMapInstance);
          const dispName = isHi ? h.nameHi : (isOr ? h.nameOr : h.name);
          m.bindPopup(\`<strong>\${dispName}</strong><br/>🚗 \${h.dist.toFixed(1)} km (~\${h.eta} min)<br/><a href="https://www.google.com/maps/dir/?api=1&destination=\${h.lat},\${h.lng}" target="_blank">Navigate ↗</a>\`);
          bounds.push([h.lat, h.lng]);
        });

        if (closest) {
          routePolyline = window.L.polyline(
            [[userPos.lat, userPos.lng], [closest.lat, closest.lng]],
            { color: '#0d9488', weight: 4, dashArray: '6, 8', opacity: 0.9 }
          ).addTo(hospitalMapInstance);
        }

        if (bounds.length > 1) {
          hospitalMapInstance.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
        }

        setTimeout(() => {
          if (hospitalMapInstance) hospitalMapInstance.invalidateSize();
        }, 300);
      } catch (mapErr) {
        console.warn('Leaflet map render error:', mapErr);
      }
    }
  }

  function initHospitalMapControls() {
    const pillBtn = $('emergencyMapPillBtn');
    if (pillBtn) pillBtn.addEventListener('click', openHospitalMap);

    const closeBtn = $('closeHospitalMapBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeHospitalMap);

    const refreshBtn = $('refreshGpsBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => locateUserAndRender('auto'));

    const districtSelect = $('districtSelect');
    if (districtSelect) {
      districtSelect.addEventListener('change', (e) => {
        hospitalVisibleCount = 12;
        locateUserAndRender(e.target.value);
      });
    }

    const searchInput = $('hospitalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        hospitalSearchQuery = e.target.value;
        hospitalVisibleCount = 12;
        if (userLocationCoords) renderHospitalMapAndCards(userLocationCoords);
      });
    }

    document.querySelectorAll('.hosp-filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.hosp-filter-btn').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeHospitalCategory = e.currentTarget.getAttribute('data-filter') || 'all';
        hospitalVisibleCount = 12;
        if (userLocationCoords) renderHospitalMapAndCards(userLocationCoords);
      });
    });

    const modal = $('hospitalMapModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeHospitalMap();
      });
    }
  }
`;

content = content.substring(0, idxStart) + newFunctions + content.substring(idxEnd);

// Also update updateHospitalMapLanguage to localize the search input placeholder & filter pills
const langTarget = '    const districtSelectLabel = $(\'districtSelectLabel\');';
const langReplacement = `    const searchInput = $('hospitalSearchInput');
    if (searchInput) {
      searchInput.placeholder = isHi
        ? '🔍 अस्पताल, सीएचसी, ब्लॉक या जिला खोजें...'
        : (isOr ? '🔍 ଡାକ୍ତରଖାନା, ସିଏଚସି, ବ୍ଲକ ବା ଜିଲ୍ଲା ଖୋଜନ୍ତୁ...' : '🔍 Search hospital, CHC, block, or district...');
    }
    const filterAll = $('filterHospAll');
    if (filterAll) filterAll.textContent = isHi ? 'सभी (249)' : (isOr ? 'ସମସ୍ତ (୨୪୯)' : 'All (249)');
    const filterMch = $('filterHospMch');
    if (filterMch) filterMch.textContent = isHi ? 'एम्स / मेडिकल कॉलेज' : (isOr ? 'ମେଡିକାଲ କଲେଜ (MCH)' : 'Medical Colleges (MCH)');
    const filterDhh = $('filterHospDhh');
    if (filterDhh) filterDhh.textContent = isHi ? 'जिला मुख्य (DHH)' : (isOr ? 'ଜିଲ୍ଲା ମୁଖ୍ୟ (DHH)' : 'District (DHH)');
    const filterSdh = $('filterHospSdh');
    if (filterSdh) filterSdh.textContent = isHi ? 'उप-मंडलीय (SDH)' : (isOr ? 'ଉପ-ଖଣ୍ଡ (SDH)' : 'Sub-Divisional (SDH)');
    const filterChc = $('filterHospChc');
    if (filterChc) filterChc.textContent = isHi ? 'ग्रामीण सीएचसी (CHC)' : (isOr ? 'ଗ୍ରାମୀଣ ସିଏଚସି (CHC)' : 'Rural CHC');
    const districtSelectLabel = $('districtSelectLabel');`;

if (content.includes(langTarget)) {
  content = content.replace(langTarget, langReplacement);
}

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('Successfully updated app.js with enhanced hospital search, filter, and pagination!');
