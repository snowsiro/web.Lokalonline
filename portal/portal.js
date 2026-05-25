(function () {
  'use strict';

  var sb = supabase.createClient(
    'https://vhnourjddnlslgabrasb.supabase.co',
    'sb_publishable_y5l1cAZXoAj8xaSVXUkBfw_Pk9pxb6H'
  );

  var STRIPE_LINKS = (window.STRIPE_CONFIG && window.STRIPE_CONFIG.links) || {};

  var ADMIN_EMAIL = 'snowsiro@gmail.com';
  var userEmail = '';

  // ── Auth ─────────────────────────────────────────────────────────
  sb.auth.getSession().then(function (ref) {
    var session = ref.data.session;
    if (!session) { location.href = 'index.html'; return; }

    userEmail = session.user.email;

    // 관리자가 포털 접근 시 어드민으로 리다이렉트
    if (userEmail === ADMIN_EMAIL) { location.href = '../admin/dashboard.html'; return; }

    var userEl = document.getElementById('portalUser');
    if (userEl) userEl.textContent = userEmail;

    init();
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    sb.auth.signOut().then(function () { location.href = 'index.html'; });
  });

  // ── Init ──────────────────────────────────────────────────────────
  async function init() {
    var { data: client } = await sb
      .from('clients')
      .select('*')
      .eq('email', userEmail)
      .single();

    var content = document.getElementById('portalContent');

    if (!client) {
      // 아직 관리자가 등록하지 않은 상태
      document.getElementById('heroTitle').textContent = 'Willkommen!';
      document.getElementById('heroSub').textContent = 'Ihr Konto wird eingerichtet.';
      content.innerHTML =
        '<div class="not-found">' +
        '<h2>Ihr Konto wird noch eingerichtet</h2>' +
        '<p>Wir bereiten Ihren Bereich vor. Sie erhalten eine Benachrichtigung, sobald alles bereit ist.</p>' +
        '<p style="margin-top:8px"><a href="mailto:hallo@lokalonline.at" style="color:var(--primary)">hallo@lokalonline.at</a></p>' +
        '</div>';
      return;
    }

    // 환영 헤더
    document.getElementById('heroTitle').textContent = 'Willkommen, ' + client.business_name + '!';
    document.getElementById('heroSub').textContent = 'Hier verwalten Sie Ihren Auftrag bei lokalonline.at';

    // 구독 정보 카드
    var planLabels = { basis: 'Basis', standard: 'Standard', premium: 'Premium' };
    var billingLabels = { monthly: 'Monatlich', yearly: 'Jährlich' };
    var statusLabels = { active: '✓ Aktiv', inactive: 'Inaktiv', cancelled: 'Gekündigt' };

    var infoCard =
      '<div class="info-card">' +
      '<h2>Ihr Abonnement</h2>' +
      '<div class="info-grid-2">' +
      infoField('Plan', '<span class="plan-tag">' + (planLabels[client.plan] || client.plan) + '</span>') +
      infoField('Status', '<span class="badge badge-' + client.status + '">' + (statusLabels[client.status] || client.status) + '</span>') +
      infoField('Abrechnung', billingLabels[client.billing_cycle] || client.billing_cycle) +
      infoField('Nächste Zahlung', client.next_billing ? formatDate(client.next_billing) : '—') +
      '</div>' +
      (client.page_url
        ? '<div style="margin-top:16px"><div class="info-field"><label>Ihre Webseite</label>' +
          '<a class="page-link" href="https://' + esc(client.page_url) + '" target="_blank">🔗 ' + esc(client.page_url) + '</a></div></div>'
        : '') +
      stripeActionsHtml(client) +
      '</div>';

    // 업데이트 요청 폼
    var requestForm =
      '<div class="info-card">' +
      '<h2>Änderungswunsch einreichen</h2>' +
      '<form id="requestForm">' +
      '<div class="form-group"><label>Art der Änderung</label>' +
      '<select id="reqType">' +
      '<option value="content">Inhalt ändern (Text, Bilder, Öffnungszeiten…)</option>' +
      '<option value="menu">Speisekarte aktualisieren</option>' +
      '<option value="design">Design anpassen</option>' +
      '<option value="other">Sonstiges</option>' +
      '</select></div>' +
      '<div class="form-group"><label>Beschreibung *</label>' +
      '<textarea id="reqDesc" rows="4" placeholder="Beschreiben Sie bitte genau, was geändert werden soll…"></textarea></div>' +
      '<button type="submit" class="btn btn-primary">Anfrage absenden</button>' +
      '</form></div>';

    // 요청 히스토리
    var { data: requests } = await sb
      .from('update_requests')
      .select('*')
      .eq('client_email', userEmail)
      .order('created_at', { ascending: false });

    var historyRows = '';
    if (requests && requests.length > 0) {
      var typeLabels = { content: 'Inhalt', menu: 'Speisekarte', design: 'Design', other: 'Sonstiges' };
      var statusBadges = {
        pending: '<span class="badge badge-new">Ausstehend</span>',
        in_progress: '<span class="badge badge-contacted">In Bearbeitung</span>',
        done: '<span class="badge badge-active">Erledigt</span>'
      };
      historyRows = requests.map(function (r) {
        return '<tr>' +
          '<td>' + formatDate(r.created_at) + '</td>' +
          '<td>' + (typeLabels[r.type] || r.type) + '</td>' +
          '<td style="max-width:280px;word-break:break-word">' + esc(r.description) + '</td>' +
          '<td>' + (statusBadges[r.status] || r.status) + '</td>' +
          '</tr>';
      }).join('');
    } else {
      historyRows = '<tr class="empty-row"><td colspan="4">Noch keine Anfragen eingereicht.</td></tr>';
    }

    var historyCard =
      '<div class="info-card">' +
      '<h2>Meine Anfragen</h2>' +
      '<div class="table-wrap"><table class="admin-table">' +
      '<thead><tr><th>Datum</th><th>Art</th><th>Beschreibung</th><th>Status</th></tr></thead>' +
      '<tbody>' + historyRows + '</tbody>' +
      '</table></div></div>';

    content.innerHTML = infoCard + requestForm + historyCard;

    // 폼 제출
    document.getElementById('requestForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var desc = document.getElementById('reqDesc').value.trim();
      if (!desc) { showToast('Bitte eine Beschreibung eingeben.'); return; }

      var btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = '…';

      var { error } = await sb.from('update_requests').insert([{
        client_email: userEmail,
        type: document.getElementById('reqType').value,
        description: desc,
        status: 'pending'
      }]);

      if (!error) {
        showToast('Anfrage eingereicht!');
        document.getElementById('reqDesc').value = '';
        // 히스토리 새로고침
        setTimeout(function () { init(); }, 800);
      } else {
        showToast('Fehler. Bitte erneut versuchen.');
      }
      btn.disabled = false; btn.textContent = 'Anfrage absenden';
    });
  }

  // ── Stripe 결제 버튼 ──────────────────────────────────────────────
  function stripeActionsHtml(client) {
    var billing = client.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    var plans = ['basis', 'standard', 'premium'];
    var planLabels = { basis: 'Basis (€19/Mo)', standard: 'Standard (€39/Mo)', premium: 'Premium (€69/Mo)' };

    // 현재 플랜보다 높은 플랜만 업그레이드로 표시
    var currentIdx = plans.indexOf(client.plan);
    var upgrades = plans.slice(currentIdx + 1).filter(function (p) {
      return STRIPE_LINKS[p + '_' + billing];
    });

    var currentLink = STRIPE_LINKS[client.plan + '_' + billing];
    if (!currentLink && upgrades.length === 0) return '';

    var html = '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">' +
      '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:10px">Abonnement verwalten</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px">';

    if (currentLink) {
      html += '<a href="' + esc(currentLink) + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Abo erneuern / verwalten</a>';
    }

    upgrades.forEach(function (p) {
      var link = STRIPE_LINKS[p + '_' + billing];
      html += '<a href="' + esc(link) + '" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Upgrade → ' + (planLabels[p] || p) + '</a>';
    });

    html += '</div></div>';
    return html;
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function infoField(label, value) {
    return '<div class="info-field"><label>' + label + '</label><span>' + value + '</span></div>';
  }

  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var toastTimer;
  function showToast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2500);
  }

})();
