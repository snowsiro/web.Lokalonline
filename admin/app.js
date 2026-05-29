(function () {
  'use strict';

  var SUPABASE_URL = 'https://vhnourjddnlslgabrasb.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_y5l1cAZXoAj8xaSVXUkBfw_Pk9pxb6H';
  var ADMIN_EMAIL = 'info@lokalonline.at';
  var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  var currentInquiryId = null;
  var currentInquiryEmail = null;
  var currentInquiryName = null;
  var currentOrderId = null;
  var inquiryFilter = 'all';
  var requestFilter = 'all';
  var signupFilter = 'all';
  var reviewFilter = 'all';
  var orderFilter = 'all';
  var siteTypeFilter = 'all';
  var adminMsgChannel = null;

  // ── Auth ─────────────────────────────────────────────────────────
  sb.auth.getSession().then(function (ref) {
    var session = ref.data.session;
    if (!session) { location.href = 'index.html'; return; }
    // 관리자 외 접근 차단
    if (session.user.email !== ADMIN_EMAIL) {
      location.href = '../portal/dashboard.html'; return;
    }
    var userEl = document.getElementById('adminUser');
    if (userEl) userEl.textContent = session.user.email;
    init();
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    sb.auth.signOut().then(function () { location.href = 'index.html'; });
  });

  // ── Init ──────────────────────────────────────────────────────────
  function init() {
    loadStats();
    loadInquiries();
    bindTabs();
    bindAllFilters();
    bindModals();
    bindClientForm();
    bindInquiryForm();
    bindOrderForm();
    bindSiteGenerator();
  }

  // ── Stats ─────────────────────────────────────────────────────────
  async function loadStats() {
    var [inqRes, clientRes, signupRes, reviewRes, orderRes] = await Promise.all([
      sb.from('inquiries').select('status'),
      sb.from('clients').select('status'),
      sb.from('signups').select('status'),
      sb.from('reviews').select('approved'),
      sb.from('orders').select('payment_status')
    ]);

    var inquiries = inqRes.data || [];
    var clients = clientRes.data || [];
    var signups = signupRes.data || [];
    var reviews = reviewRes.data || [];
    var orders = orderRes.data || [];
    var newCount = inquiries.filter(function (i) { return i.status === 'new'; }).length;
    var newSignups = signups.filter(function (s) { return s.status === 'new'; }).length;
    var pendingReviews = reviews.filter(function (r) { return !r.approved; }).length;
    var pendingOrders = orders.filter(function (o) { return o.payment_status === 'pending'; }).length;

    setText('statNew', newCount);
    setText('statTotal', inquiries.length);
    setText('statClients', clients.filter(function (c) { return c.status === 'active'; }).length);
    setText('statSignups', signups.length);
    setText('statOrders', orders.length);

    var badge = document.getElementById('newBadge');
    if (badge) {
      badge.textContent = newCount;
      badge.style.display = newCount > 0 ? 'inline-flex' : 'none';
    }

    var signupBadge = document.getElementById('signupBadge');
    if (signupBadge) {
      signupBadge.textContent = newSignups;
      signupBadge.style.display = newSignups > 0 ? 'inline-flex' : 'none';
    }

    var reviewBadge = document.getElementById('reviewBadge');
    if (reviewBadge) {
      reviewBadge.textContent = pendingReviews;
      reviewBadge.style.display = pendingReviews > 0 ? 'inline-flex' : 'none';
    }

    var orderBadge = document.getElementById('orderBadge');
    if (orderBadge) {
      orderBadge.textContent = pendingOrders;
      orderBadge.style.display = pendingOrders > 0 ? 'inline-flex' : 'none';
    }
  }

  // ── Inquiries ─────────────────────────────────────────────────────
  async function loadInquiries() {
    var query = sb.from('inquiries').select('*').order('created_at', { ascending: false });
    if (inquiryFilter !== 'all') query = query.eq('status', inquiryFilter);

    var { data, error } = await query;
    var tbody = document.getElementById('inquiriesBody');
    if (!tbody) return;

    if (error || !data || data.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Keine Anfragen gefunden.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(function (inq) {
      return '<tr>' +
        '<td>' + formatDate(inq.created_at) + '</td>' +
        '<td><strong>' + esc(inq.name) + '</strong></td>' +
        '<td>' + (inq.business ? esc(inq.business) : '<span style="color:var(--text-muted)">—</span>') + '</td>' +
        '<td><a href="mailto:' + esc(inq.email) + '" style="color:var(--primary)">' + esc(inq.email) + '</a></td>' +
        '<td>' + (inq.plan_interest ? '<span class="plan-tag">' + planLabel(inq.plan_interest) + '</span>' : '—') + '</td>' +
        '<td>' + statusBadge(inq.status) + '</td>' +
        '<td><button class="btn btn-outline btn-sm" onclick="openInquiry(\'' + inq.id + '\')">Details</button></td>' +
        '</tr>';
    }).join('');
  }

  window.openInquiry = async function (id) {
    currentInquiryId = id;
    var { data } = await sb.from('inquiries').select('*').eq('id', id).single();
    if (!data) return;
    currentInquiryEmail = data.email;
    currentInquiryName = data.name;

    var infoGrid = document.getElementById('inquiryInfo');
    infoGrid.innerHTML =
      infoItem('Name', esc(data.name)) +
      infoItem('E-Mail', '<a href="mailto:' + esc(data.email) + '" style="color:var(--primary)">' + esc(data.email) + '</a>') +
      infoItem('Betrieb', data.business || '—') +
      infoItem('Telefon', data.phone || '—') +
      infoItem('Plan', data.plan_interest ? planLabel(data.plan_interest) : '—') +
      infoItem('Eingegangen', formatDate(data.created_at));

    var msgWrap = document.getElementById('inquiryMsgWrap');
    var msgEl = document.getElementById('inquiryMsg');
    if (data.message) {
      msgEl.textContent = data.message;
      msgWrap.style.display = 'block';
    } else {
      msgWrap.style.display = 'none';
    }

    document.getElementById('inquiryStatus').value = data.status;
    document.getElementById('inquiryNotes').value = data.notes || '';
    openModal('inquiryOverlay');
  };

  function bindInquiryForm() {
    document.getElementById('sendPaymentLinkBtn').addEventListener('click', function () {
      if (!currentInquiryEmail) return;
      var name = currentInquiryName || '';
      var stripeLink = 'https://buy.stripe.com/00w6oA7DVeC3fXqbaQf3a01';
      var subject = encodeURIComponent('lokalonline.at — Ihr Website-Prototyp ist fertig!');
      var body = encodeURIComponent(
        'Guten Tag' + (name ? ' ' + name : '') + ',\n\n' +
        'Ihr Website-Prototyp ist fertig!\n\n' +
        'Falls Sie zufrieden sind, starten Sie einfach Ihr Abonnement:\n\n' +
        stripeLink + '\n\n' +
        '✅ Die ersten 30 Tage sind kostenlos.\n\n' +
        'Bei Fragen stehen wir Ihnen gerne zur Verfügung.\n\n' +
        'Beste Grüße\n' +
        'lokalonline.at\n' +
        'info@lokalonline.at'
      );
      window.open('mailto:' + encodeURIComponent(currentInquiryEmail) + '?subject=' + subject + '&body=' + body);
    });

    document.getElementById('saveInquiryBtn').addEventListener('click', async function () {
      if (!currentInquiryId) return;
      var { error } = await sb.from('inquiries').update({
        status: document.getElementById('inquiryStatus').value,
        notes: document.getElementById('inquiryNotes').value
      }).eq('id', currentInquiryId);

      if (!error) {
        closeModal('inquiryOverlay');
        showToast('Gespeichert');
        loadInquiries();
        loadStats();
      }
    });

    document.getElementById('deleteInquiryBtn').addEventListener('click', async function () {
      if (!currentInquiryId) return;
      if (!confirm('Anfrage wirklich löschen?')) return;
      await sb.from('inquiries').delete().eq('id', currentInquiryId);
      closeModal('inquiryOverlay');
      showToast('Gelöscht');
      loadInquiries();
      loadStats();
    });
  }

  // ── Clients ───────────────────────────────────────────────────────
  async function loadClients() {
    var { data, error } = await sb.from('clients').select('*').order('created_at', { ascending: false });
    var tbody = document.getElementById('clientsBody');
    if (!tbody) return;

    if (error || !data || data.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Noch keine Kunden vorhanden.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(function (c) {
      return '<tr>' +
        '<td><strong>' + esc(c.business_name) + '</strong><br><span style="color:var(--text-muted);font-size:12px">' + esc(c.name) + '</span></td>' +
        '<td><span class="plan-tag">' + planLabel(c.plan) + '</span></td>' +
        '<td>' + (c.billing_cycle === 'yearly' ? 'Jährlich' : 'Monatlich') + '</td>' +
        '<td>' + (c.page_url ? '<a href="https://' + esc(c.page_url) + '" target="_blank" style="color:var(--primary)">' + esc(c.page_url) + '</a>' : '—') + '</td>' +
        '<td>' + statusBadge(c.status) + '</td>' +
        '<td>' + (c.next_billing ? formatDate(c.next_billing) : '—') + '</td>' +
        '<td><button class="btn btn-outline btn-sm" onclick="openClient(\'' + c.id + '\')">Bearbeiten</button></td>' +
        '</tr>';
    }).join('');
  }

  window.openClient = async function (id) {
    var { data } = await sb.from('clients').select('*').eq('id', id).single();
    if (!data) return;
    fillClientModal(data);
    document.getElementById('clientModalTitle').textContent = 'Kunden bearbeiten';
    document.getElementById('deleteClientBtn').style.display = 'inline-flex';
    openModal('clientOverlay');
  };

  function fillClientModal(data) {
    document.getElementById('clientId').value = data ? data.id : '';
    document.getElementById('clientName').value = data ? data.name : '';
    document.getElementById('clientBusiness').value = data ? data.business_name : '';
    document.getElementById('clientEmail').value = data ? data.email : '';
    document.getElementById('clientPhone').value = data ? (data.phone || '') : '';
    document.getElementById('clientPlan').value = data ? data.plan : 'basis';
    document.getElementById('clientBilling').value = data ? data.billing_cycle : 'monthly';
    document.getElementById('clientStartDate').value = data ? (data.start_date || '') : '';
    document.getElementById('clientNextBilling').value = data ? (data.next_billing || '') : '';
    document.getElementById('clientPageUrl').value = data ? (data.page_url || '') : '';
    document.getElementById('clientStatus').value = data ? data.status : 'active';
    document.getElementById('clientSetupFeeWaived').checked = data ? data.setup_fee_waived : false;
    document.getElementById('clientNotes').value = data ? (data.notes || '') : '';
  }

  function bindClientForm() {
    document.getElementById('addClientBtn').addEventListener('click', function () {
      fillClientModal(null);
      document.getElementById('clientModalTitle').textContent = 'Kunden hinzufügen';
      document.getElementById('deleteClientBtn').style.display = 'none';
      openModal('clientOverlay');
    });

    document.getElementById('saveClientBtn').addEventListener('click', async function () {
      var name = document.getElementById('clientName').value.trim();
      var business = document.getElementById('clientBusiness').value.trim();
      var email = document.getElementById('clientEmail').value.trim();
      if (!name || !business || !email) { showToast('Pflichtfelder ausfüllen'); return; }

      var payload = {
        name: name,
        business_name: business,
        email: email,
        phone: document.getElementById('clientPhone').value.trim() || null,
        plan: document.getElementById('clientPlan').value,
        billing_cycle: document.getElementById('clientBilling').value,
        setup_fee_waived: document.getElementById('clientSetupFeeWaived').checked,
        start_date: document.getElementById('clientStartDate').value || null,
        next_billing: document.getElementById('clientNextBilling').value || null,
        page_url: document.getElementById('clientPageUrl').value.trim() || null,
        status: document.getElementById('clientStatus').value,
        notes: document.getElementById('clientNotes').value.trim() || null
      };

      var id = document.getElementById('clientId').value;
      var error;
      if (id) {
        ({ error } = await sb.from('clients').update(payload).eq('id', id));
      } else {
        ({ error } = await sb.from('clients').insert([payload]));
      }

      if (!error) {
        closeModal('clientOverlay');
        showToast(id ? 'Gespeichert' : 'Kunde hinzugefügt');
        loadClients();
        loadStats();
      } else {
        showToast('Fehler: ' + error.message);
      }
    });

    document.getElementById('deleteClientBtn').addEventListener('click', async function () {
      var id = document.getElementById('clientId').value;
      if (!id || !confirm('Kunden wirklich löschen?')) return;
      await sb.from('clients').delete().eq('id', id);
      closeModal('clientOverlay');
      showToast('Gelöscht');
      loadClients();
      loadStats();
    });
  }

  // ── Update Requests ───────────────────────────────────────────────
  async function loadRequests() {
    var query = sb.from('update_requests').select('*').order('created_at', { ascending: false });
    if (requestFilter !== 'all') query = query.eq('status', requestFilter);

    var { data } = await query;
    var tbody = document.getElementById('requestsBody');
    if (!tbody) return;

    var typeLabels = { content: 'Inhalt', menu: 'Speisekarte', design: 'Design', other: 'Sonstiges' };
    var pending = (data || []).filter(function (r) { return r.status === 'pending'; }).length;
    var badge = document.getElementById('pendingBadge');
    if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'inline-flex' : 'none'; }

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Keine Änderungswünsche vorhanden.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(function (r) {
      return '<tr>' +
        '<td>' + formatDate(r.created_at) + '</td>' +
        '<td>' + esc(r.client_email) + '</td>' +
        '<td>' + (typeLabels[r.type] || r.type) + '</td>' +
        '<td style="max-width:240px;word-break:break-word">' + esc(r.description) + '</td>' +
        '<td>' + reqStatusBadge(r.status) + '</td>' +
        '<td>' +
          '<select class="req-status-select" data-id="' + r.id + '" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:#fff">' +
          '<option value="pending"' + (r.status === 'pending' ? ' selected' : '') + '>Ausstehend</option>' +
          '<option value="in_progress"' + (r.status === 'in_progress' ? ' selected' : '') + '>In Bearbeitung</option>' +
          '<option value="done"' + (r.status === 'done' ? ' selected' : '') + '>Erledigt</option>' +
          '</select>' +
        '</td>' +
        '</tr>';
    }).join('');

    // Status 변경 이벤트
    tbody.querySelectorAll('.req-status-select').forEach(function (sel) {
      sel.addEventListener('change', async function () {
        var { error } = await sb.from('update_requests').update({ status: sel.value }).eq('id', sel.getAttribute('data-id'));
        if (!error) { showToast('Status aktualisiert'); loadRequests(); loadStats(); }
      });
    });
  }

  function reqStatusBadge(status) {
    var map = { pending: 'badge-new', in_progress: 'badge-contacted', done: 'badge-active' };
    var labels = { pending: 'Ausstehend', in_progress: 'In Bearbeitung', done: 'Erledigt' };
    return '<span class="badge ' + (map[status] || '') + '">' + (labels[status] || status) + '</span>';
  }


  // ── Signups ───────────────────────────────────────────────────────
  async function loadSignups() {
    var query = sb.from('signups').select('*').order('created_at', { ascending: false });
    if (signupFilter !== 'all') query = query.eq('status', signupFilter);

    var { data } = await query;
    var tbody = document.getElementById('signupsBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Noch keine Registrierungen.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(function (s) {
      var social = [];
      if (s.instagram) social.push('<a href="https://instagram.com/' + esc(s.instagram.replace('@','')) + '" target="_blank" style="color:var(--primary)">@' + esc(s.instagram.replace('@','')) + '</a>');
      if (s.website) social.push('<a href="' + (s.website.startsWith('http') ? '' : 'https://') + esc(s.website) + '" target="_blank" style="color:var(--primary)">' + esc(s.website) + '</a>');
      return '<tr>' +
        '<td>' + formatDate(s.created_at) + '</td>' +
        '<td><strong>' + esc(s.name || '—') + '</strong>' + (s.address ? '<br><span style="color:var(--text-muted);font-size:11px">' + esc(s.address) + '</span>' : '') + '</td>' +
        '<td>' + (s.business ? esc(s.business) : '<span style="color:var(--text-muted)">—</span>') + '</td>' +
        '<td><a href="mailto:' + esc(s.email) + '" style="color:var(--primary)">' + esc(s.email) + '</a></td>' +
        '<td>' + (s.phone ? esc(s.phone) : '—') + '</td>' +
        '<td style="font-size:12px">' + (social.length ? social.join('<br>') : '—') + '</td>' +
        '<td>' + signupStatusBadge(s.status) + '</td>' +
        '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="btn btn-outline btn-sm" onclick="markSignupContacted(\'' + s.id + '\')"' + (s.status === 'contacted' ? ' style="opacity:.4" disabled' : '') + '>Kontaktiert</button>' +
          '<button class="btn btn-primary btn-sm" onclick="convertSignupToInquiry(\'' + s.id + '\')">→ Anfrage</button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  function signupStatusBadge(status) {
    var map = { new: 'badge-new', contacted: 'badge-contacted' };
    var labels = { new: 'Neu', contacted: 'Kontaktiert' };
    return '<span class="badge ' + (map[status] || 'badge-new') + '">' + (labels[status] || status) + '</span>';
  }

  window.markSignupContacted = async function (id) {
    var { error } = await sb.from('signups').update({ status: 'contacted' }).eq('id', id);
    if (!error) { showToast('Als kontaktiert markiert'); loadSignups(); loadStats(); }
  };

  window.convertSignupToInquiry = async function (id) {
    var { data } = await sb.from('signups').select('*').eq('id', id).single();
    if (!data) return;

    var { error } = await sb.from('inquiries').insert([{
      name: data.name || '',
      email: data.email,
      business: data.business,
      phone: data.phone,
      status: 'new',
      notes: [
        data.address ? 'Adresse: ' + data.address : '',
        data.instagram ? 'Instagram: ' + data.instagram : '',
        data.website ? 'Website: ' + data.website : ''
      ].filter(Boolean).join(' | ') || null
    }]);

    if (!error) {
      await sb.from('signups').update({ status: 'contacted' }).eq('id', id);
      showToast('Anfrage erstellt');
      loadSignups();
      loadInquiries();
      loadStats();
    } else {
      showToast('Fehler: ' + error.message);
    }
  };


  // ── Reviews ───────────────────────────────────────────────────────
  async function loadReviews() {
    var query = sb.from('reviews').select('*').order('created_at', { ascending: false });
    if (reviewFilter === 'pending') query = query.eq('approved', false);
    if (reviewFilter === 'approved') query = query.eq('approved', true);

    var { data } = await query;
    var tbody = document.getElementById('reviewsBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Noch keine Bewertungen.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(function (r) {
      var stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
      var approved = r.approved;
      return '<tr>' +
        '<td>' + formatDate(r.created_at) + '</td>' +
        '<td><span class="plan-tag">' + esc(r.client_slug) + '</span></td>' +
        '<td><strong>' + esc(r.name) + '</strong></td>' +
        '<td style="color:#f59e0b;letter-spacing:2px">' + stars + '</td>' +
        '<td style="max-width:260px;word-break:break-word;font-size:13px">"' + esc(r.text) + '"</td>' +
        '<td>' + (approved
          ? '<span class="badge badge-active">Freigegeben</span>'
          : '<span class="badge badge-new">Ausstehend</span>') + '</td>' +
        '<td style="display:flex;gap:6px">' +
          (!approved ? '<button class="btn btn-primary btn-sm" onclick="approveReview(\'' + r.id + '\')">Freigeben</button>' : '') +
          '<button class="btn btn-danger btn-sm" onclick="deleteReview(\'' + r.id + '\')">Löschen</button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  window.approveReview = async function (id) {
    var { error } = await sb.from('reviews').update({ approved: true }).eq('id', id);
    if (!error) { showToast('Freigegeben'); loadReviews(); loadStats(); }
  };

  window.deleteReview = async function (id) {
    if (!confirm('Bewertung wirklich löschen?')) return;
    var { error } = await sb.from('reviews').delete().eq('id', id);
    if (!error) { showToast('Gelöscht'); loadReviews(); loadStats(); }
  };


  // ── Orders ────────────────────────────────────────────────────────
  async function loadOrders() {
    var query = sb.from('orders').select('*').order('created_at', { ascending: false });
    if (orderFilter !== 'all') query = query.eq('payment_status', orderFilter);

    var { data } = await query;
    var tbody = document.getElementById('ordersBody');
    if (!tbody) return;

    // Load unread message counts (client messages not yet read by admin)
    var { data: unreadMsgs } = await sb.from('messages')
      .select('order_id')
      .eq('sender_type', 'client')
      .is('read_at', null);

    var unreadByOrder = {};
    (unreadMsgs || []).forEach(function(m) {
      unreadByOrder[m.order_id] = (unreadByOrder[m.order_id] || 0) + 1;
    });

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Keine Bestellungen vorhanden.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(function (o) {
      var unreadCount = unreadByOrder[o.id] || 0;
      var unreadBadge = unreadCount ? ' <span class="badge-count">' + unreadCount + '</span>' : '';
      return '<tr>' +
        '<td>' + formatDate(o.created_at) + '</td>' +
        '<td><strong>' + esc(o.business_name) + '</strong></td>' +
        '<td>' + (o.business_type ? esc(o.business_type) : '—') + '</td>' +
        '<td><a href="mailto:' + esc(o.email) + '" style="color:var(--primary)">' + esc(o.email) + '</a></td>' +
        '<td>' + (o.phone ? esc(o.phone) : '—') + '</td>' +
        '<td>' + orderStatusBadge(o.payment_status) + '</td>' +
        '<td><button class="btn btn-outline btn-sm" onclick="openOrder(\'' + o.id + '\')">Details' + unreadBadge + '</button></td>' +
        '</tr>';
    }).join('');
  }

  async function loadSites() {
    var { data } = await sb.from('orders')
      .select('id, business_name, business_type, site_slug, payment_status, status')
      .not('site_slug', 'is', null)
      .order('created_at', { ascending: false });

    var tbody = document.getElementById('sitesBody');
    if (!tbody) return;

    var allData = data || [];
    if (siteTypeFilter !== 'all') {
      var typeGroups = {
        gastronomie: ['restaurant', 'asiatisches', 'bar', 'schnellimbiss', 'pub'],
        cafe: ['café', 'cafe', 'bäckerei', 'bakery'],
        beauty: ['nagelstudio', 'beauty', 'friseur', 'hair'],
        retail: ['einzelhandel', 'retail']
      };
      var terms = typeGroups[siteTypeFilter] || [];
      allData = allData.filter(function(o) {
        var bt = (o.business_type || '').toLowerCase();
        return terms.some(function(t) { return bt.indexOf(t) !== -1; });
      });
    }

    if (allData.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Keine Webseiten vorhanden.</td></tr>';
      return;
    }

    tbody.innerHTML = allData.map(function (o) {
      var slug = esc(o.site_slug);
      var base = 'https://lokalonline.at/' + slug;
      return '<tr>' +
        '<td><strong>' + esc(o.business_name) + '</strong><br><span style="font-size:11px;color:var(--text-muted)">' + (o.business_type || '') + '</span></td>' +
        '<td><code style="font-size:12px;background:var(--bg);padding:2px 6px;border-radius:4px">' + slug + '</code></td>' +
        '<td>' + orderStatusBadge(o.payment_status) + '</td>' +
        '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<a href="' + base + '/" target="_blank" class="btn btn-outline btn-sm">🏠 Start</a>' +
          '<a href="' + base + '/menu/" target="_blank" class="btn btn-outline btn-sm">📋 Menü</a>' +
          '<a href="' + base + '/link/" target="_blank" class="btn btn-outline btn-sm">🔗 Links</a>' +
        '</td>' +
        '<td><button class="btn btn-outline btn-sm" onclick="openOrder(\'' + o.id + '\')">✏️ Details</button></td>' +
        '</tr>';
    }).join('');
  }

  function orderStatusBadge(status) {
    var map = { pending: 'badge-new', paid: 'badge-contacted', in_progress: 'badge-contacted', done: 'badge-active' };
    var labels = { pending: 'Ausstehend', paid: 'Bezahlt', in_progress: 'In Bearbeitung', done: 'Abgeschlossen' };
    return '<span class="badge ' + (map[status] || 'badge-new') + '">' + (labels[status] || status) + '</span>';
  }

  window.openOrder = async function (id) {
    currentOrderId = id;
    var { data } = await sb.from('orders').select('*').eq('id', id).single();
    if (!data) return;
    currentOrderData = data;

    var infoGrid = document.getElementById('orderInfo');
    infoGrid.innerHTML =
      infoItem('Betriebsname', esc(data.business_name)) +
      infoItem('Ansprechperson', data.contact_name || '—') +
      infoItem('Branche', data.business_type || '—') +
      infoItem('Kurzbeschreibung', data.description || '—') +
      infoItem('Adresse', data.address || '—') +
      infoItem('Telefon', data.phone || '—') +
      infoItem('E-Mail', '<a href="mailto:' + esc(data.email) + '" style="color:var(--primary)">' + esc(data.email) + '</a>') +
      infoItem('Instagram', data.instagram || '—') +
      infoItem('Website', data.website || '—') +
      infoItem('Öffnungszeiten', data.hours ? '<pre style="font-size:12px;white-space:pre-wrap">' + esc(data.hours) + '</pre>' : '—') +
      infoItem('Wünsche', data.notes || '—') +
      infoItem('Eingegangen', formatDate(data.created_at));

    var filesWrap = document.getElementById('orderFilesWrap');
    var filesEl = document.getElementById('orderFiles');
    filesEl.innerHTML = '';
    var hasFiles = false;

    if (data.logo_url) {
      hasFiles = true;
      filesEl.innerHTML += '<a href="' + esc(data.logo_url) + '" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:4px;text-decoration:none">' +
        '<img src="' + esc(data.logo_url) + '" style="width:80px;height:80px;object-fit:contain;border:1px solid var(--border);border-radius:8px;background:#f8fafc" />' +
        '<span style="font-size:11px;color:var(--text-muted)">Logo</span></a>';
    }

    var photoUrls = [];
    if (data.photo_urls) {
      try { photoUrls = JSON.parse(data.photo_urls); } catch (e) {}
    } else if (data.photo_url) {
      photoUrls = [data.photo_url];
    }
    photoUrls.forEach(function (url, i) {
      hasFiles = true;
      filesEl.innerHTML += '<a href="' + esc(url) + '" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:4px;text-decoration:none">' +
        '<img src="' + esc(url) + '" style="width:80px;height:80px;object-fit:cover;border:1px solid var(--border);border-radius:8px" />' +
        '<span style="font-size:11px;color:var(--text-muted)">Foto ' + (i + 1) + '</span></a>';
    });

    filesWrap.style.display = hasFiles ? 'block' : 'none';

    document.getElementById('orderStatus').value = data.payment_status || 'pending';
    document.getElementById('orderNotes').value = data.admin_notes || '';
    var legalType = data.legal_type || 'einzelunternehmer';
    document.getElementById('orderLegalType').value = legalType;
    document.getElementById('adminLegalEinzeln').style.display = legalType === 'einzelunternehmer' ? 'block' : 'none';
    document.getElementById('adminLegalGesellschaft').style.display = legalType === 'gesellschaft' ? 'block' : 'none';
    document.getElementById('orderGisaNumber').value = data.gisa_number || '';
    document.getElementById('orderUidNumber').value = data.uid_number || '';
    document.getElementById('orderLegalName').value = data.legal_name || '';
    document.getElementById('orderLegalForm').value = data.legal_form || 'GmbH';
    document.getElementById('orderFnNumber').value = data.fn_number || '';
    document.getElementById('orderGeschaeftsfuehrer').value = data.geschaeftsfuehrer || '';
    document.getElementById('orderLegalType').onchange = function() {
      var t = this.value;
      document.getElementById('adminLegalEinzeln').style.display = t === 'einzelunternehmer' ? 'block' : 'none';
      document.getElementById('adminLegalGesellschaft').style.display = t === 'gesellschaft' ? 'block' : 'none';
    };
    document.getElementById('orderSiteSlug').value = data.site_slug || '';
    var editBtn = document.getElementById('editSiteBtn');
    editBtn.style.display = data.site_slug ? 'inline-flex' : 'none';
    openModal('orderOverlay');

    loadOrderMessages(id);

    // Clone inputs to remove accumulated old listeners
    var sendBtn = document.getElementById('orderMsgSend');
    var msgInput = document.getElementById('orderMsgInput');
    var msgFile = document.getElementById('orderMsgFile');
    var newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    var newInput = msgInput.cloneNode(true);
    msgInput.parentNode.replaceChild(newInput, msgInput);
    var newMsgFile = msgFile.cloneNode(true);
    msgFile.parentNode.replaceChild(newMsgFile, msgFile);

    async function sendAdminMsg(attachmentUrl, attachmentName) {
      var text = document.getElementById('orderMsgInput').value.trim();
      if (!text && !attachmentUrl) return;
      document.getElementById('orderMsgInput').value = '';
      await sb.from('messages').insert([{
        order_id: id,
        sender_type: 'admin',
        sender_name: 'lokalonline.at',
        content: text || '',
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null
      }]);
      loadOrderMessages(id);
    }

    document.getElementById('orderMsgSend').addEventListener('click', function() { sendAdminMsg(); });
    document.getElementById('orderMsgInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') sendAdminMsg();
    });

    document.getElementById('orderMsgFile').addEventListener('change', async function() {
      var file = this.files[0];
      if (!file) return;
      var btn = document.getElementById('orderMsgSend');
      btn.disabled = true; btn.textContent = '⏳';
      try {
        var ext = file.name.split('.').pop();
        var path = 'chat/' + id + '/' + Date.now() + '.' + ext;
        var { error } = await sb.storage.from('uploads').upload(path, file, { upsert: true });
        if (error) throw error;
        var { data: urlData } = sb.storage.from('uploads').getPublicUrl(path);
        await sendAdminMsg(urlData.publicUrl, file.name);
      } catch(e) { showToast('Upload fehlgeschlagen: ' + e.message); }
      btn.disabled = false; btn.textContent = 'Senden';
      this.value = '';
    });
  };

  async function fetchOrderMessages(orderId) {
    var thread = document.getElementById('orderMsgThread');
    if (!thread) return;

    var { data: msgs } = await sb.from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    renderMsgThread(thread, msgs || [], 'admin');
    thread.scrollTop = thread.scrollHeight;

    var unread = (msgs || []).filter(function(m) { return m.sender_type === 'client' && !m.read_at; });
    if (unread.length > 0) {
      await sb.from('messages').update({ read_at: new Date().toISOString() })
        .in('id', unread.map(function(m) { return m.id; }));
    }
  }

  function loadOrderMessages(orderId) {
    fetchOrderMessages(orderId);

    // Subscribe once per order; clean up the previous order's channel first
    if (adminMsgChannel) {
      adminMsgChannel.unsubscribe();
      adminMsgChannel = null;
    }
    adminMsgChannel = sb.channel('admin-msg:' + orderId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'order_id=eq.' + orderId
      }, function() {
        fetchOrderMessages(orderId);
      })
      .subscribe();
  }

  window.addEventListener('beforeunload', function() {
    if (adminMsgChannel) adminMsgChannel.unsubscribe();
  });

  function renderMsgThread(container, msgs, viewerType) {
    if (msgs.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:16px 0">Noch keine Nachrichten</div>';
      return;
    }
    container.innerHTML = msgs.map(function(m) {
      var isOwn = m.sender_type === viewerType;
      var time = new Date(m.created_at).toLocaleString('de-AT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      var bubbleStyle = 'max-width:80%;background:' + (isOwn ? 'var(--primary)' : 'var(--surface)') + ';color:' + (isOwn ? '#fff' : 'var(--text)') + ';border:' + (isOwn ? 'none' : '1px solid var(--border)') + ';border-radius:12px;padding:8px 12px;font-size:13px;line-height:1.5';
      var attachHtml = '';
      if (m.attachment_url) {
        var safeUrl = esc(m.attachment_url);
        var isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(m.attachment_name || m.attachment_url);
        attachHtml = isImg
          ? '<a href="' + safeUrl + '" target="_blank"><img src="' + safeUrl + '" style="max-width:220px;max-height:200px;border-radius:8px;display:block;margin-top:' + (m.content ? '6px' : '0') + '" /></a>'
          : '<a href="' + safeUrl + '" target="_blank" style="display:inline-flex;align-items:center;gap:6px;color:inherit;font-size:12px;opacity:.85;text-decoration:underline;margin-top:' + (m.content ? '4px' : '0') + '">📎 ' + esc(m.attachment_name || 'Datei') + '</a>';
      }
      return '<div style="display:flex;flex-direction:column;align-items:' + (isOwn ? 'flex-end' : 'flex-start') + '">' +
        '<div style="' + bubbleStyle + '">' + (m.content ? esc(m.content) : '') + attachHtml + '</div>' +
        '<span style="font-size:10px;color:var(--text-muted);margin-top:2px">' + time + '</span>' +
        '</div>';
    }).join('');
  }

  function bindOrderForm() {
    document.getElementById('sendPaymentBtn').addEventListener('click', async function () {
      if (!currentOrderData || !currentOrderData.email) return;
      var paymentUrl = window.STRIPE_CONFIG && window.STRIPE_CONFIG.links && window.STRIPE_CONFIG.links.basis_monthly;
      if (!paymentUrl) { showToast('Zahlungslink nicht konfiguriert.'); return; }

      var btn = this;
      btn.disabled = true; btn.textContent = '⏳ Wird gesendet…';

      var session = (await sb.auth.getSession()).data.session;
      var res = await fetch('https://vhnourjddnlslgabrasb.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({
          type: 'payment-link',
          to: currentOrderData.email,
          contact_name: currentOrderData.contact_name,
          business_name: currentOrderData.business_name,
          payment_url: paymentUrl
        })
      });
      var data = await res.json();
      if (data.ok) {
        showToast('Zahlungslink an ' + currentOrderData.email + ' gesendet.');
      } else {
        showToast('Fehler: ' + (data.error || 'unbekannt'));
      }
      btn.disabled = false; btn.textContent = '💳 Zahlungslink senden';
    });

    document.getElementById('generateSiteBtn').addEventListener('click', function () {
      if (!currentOrderId || !currentOrderData) return;
      openSiteGenerator(currentOrderData);
    });

    document.getElementById('editSiteBtn').addEventListener('click', function () {
      var slug = document.getElementById('orderSiteSlug').value.trim();
      if (!slug) { showToast('Bitte zuerst einen Slug eingeben und speichern.'); return; }
      openFileEditor(slug);
    });

    document.getElementById('saveOrderBtn').addEventListener('click', async function () {
      if (!currentOrderId) return;
      var slug = document.getElementById('orderSiteSlug').value.trim() || null;
      var legalT = document.getElementById('orderLegalType').value;
      var { error } = await sb.from('orders').update({
        payment_status: document.getElementById('orderStatus').value,
        admin_notes: document.getElementById('orderNotes').value,
        site_slug: slug,
        legal_type: legalT,
        gisa_number: document.getElementById('orderGisaNumber').value.trim() || null,
        uid_number: document.getElementById('orderUidNumber').value.trim() || null,
        legal_name: document.getElementById('orderLegalName').value.trim() || null,
        legal_form: document.getElementById('orderLegalForm').value || null,
        fn_number: document.getElementById('orderFnNumber').value.trim() || null,
        geschaeftsfuehrer: document.getElementById('orderGeschaeftsfuehrer').value.trim() || null
      }).eq('id', currentOrderId);
      if (!error) {
        document.getElementById('editSiteBtn').style.display = slug ? 'inline-flex' : 'none';
        closeModal('orderOverlay');
        showToast('Gespeichert');
        loadOrders();
        loadStats();
      }
    });

    document.getElementById('deleteOrderBtn').addEventListener('click', async function () {
      if (!currentOrderId) return;
      if (!confirm('Bestellung wirklich löschen?')) return;
      await sb.from('orders').delete().eq('id', currentOrderId);
      closeModal('orderOverlay');
      showToast('Gelöscht');
      loadOrders();
      loadStats();
    });
  }

  // ── Tabs ──────────────────────────────────────────────────────────
  function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('tab-' + tab).classList.add('active');
        if (tab === 'clients') loadClients();
        if (tab === 'inquiries') loadInquiries();
        if (tab === 'requests') loadRequests();
        if (tab === 'signups') loadSignups();
        if (tab === 'reviews') loadReviews();
        if (tab === 'orders') loadOrders();
        if (tab === 'sites') loadSites();
      });
    });
  }

  // ── Filters ───────────────────────────────────────────────────────
  function bindFilterGroup(selector, onSelect) {
    document.querySelectorAll(selector).forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll(selector).forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        onSelect(btn);
      });
    });
  }

  function bindAllFilters() {
    bindFilterGroup('[data-status]',        function(b) { inquiryFilter  = b.getAttribute('data-status');        loadInquiries(); });
    bindFilterGroup('[data-req-status]',    function(b) { requestFilter  = b.getAttribute('data-req-status');    loadRequests();  });
    bindFilterGroup('[data-signup-status]', function(b) { signupFilter   = b.getAttribute('data-signup-status'); loadSignups();   });
    bindFilterGroup('[data-review-status]', function(b) { reviewFilter   = b.getAttribute('data-review-status'); loadReviews();   });
    bindFilterGroup('[data-order-status]',  function(b) { orderFilter    = b.getAttribute('data-order-status');  loadOrders();    });
    bindFilterGroup('[data-site-type]',     function(b) { siteTypeFilter = b.getAttribute('data-site-type');     loadSites();     });
  }

  // ── Modals ────────────────────────────────────────────────────────
  function bindModals() {
    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(btn.getAttribute('data-close')); });
    });
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });
  }

  function openModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }

  // ── Helpers ───────────────────────────────────────────────────────
  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function statusBadge(status) {
    var labels = { new: 'Neu', contacted: 'Kontaktiert', converted: 'Konvertiert', rejected: 'Abgelehnt', active: 'Aktiv', inactive: 'Inaktiv', cancelled: 'Gekündigt' };
    return '<span class="badge badge-' + status + '">' + (labels[status] || status) + '</span>';
  }

  function planLabel(plan) {
    return { basis: 'Basis', standard: 'Standard', premium: 'Premium', unsure: 'Unsicher' }[plan] || plan;
  }

  function infoItem(label, value) {
    return '<div class="info-item"><label>' + label + '</label><span>' + value + '</span></div>';
  }

  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  // ── Site Generator ────────────────────────────────────────────────
  var selectedTemplate = 'restaurant';
  var currentOrderData = null;

  var EDGE_FN = 'https://vhnourjddnlslgabrasb.supabase.co/functions/v1/github_upload';

  function bindSiteGenerator() {
    // Template card selection
    document.getElementById('templateGrid').addEventListener('click', function (e) {
      var card = e.target.closest('.template-card');
      if (!card) return;
      document.querySelectorAll('.template-card').forEach(function (c) { c.classList.remove('active'); });
      card.classList.add('active');
      selectedTemplate = card.getAttribute('data-tpl');
      updateSiteGenPreview();
    });

    // Slug input live preview
    document.getElementById('siteSlug').addEventListener('input', updateSiteGenPreview);

    // Generate button
    document.getElementById('siteGenSubmit').addEventListener('click', doGenerateSite);
  }

  function slugify(str) {
    return (str || '')
      .toLowerCase()
      .replace(/[äöüÄÖÜ]/g, function (c) { return { ä:'ae', ö:'oe', ü:'ue', Ä:'ae', Ö:'oe', Ü:'ue' }[c] || c; })
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function updateSiteGenPreview() {
    var slug = document.getElementById('siteSlug').value.trim();
    var preview = document.getElementById('siteGenPreview');
    var content = document.getElementById('siteGenPreviewContent');
    if (!slug) { preview.style.display = 'none'; return; }
    preview.style.display = 'block';
    content.innerHTML =
      '<div style="margin-bottom:4px">📄 <code>' + slug + '/index.html</code> ← templates/' + selectedTemplate + '</div>' +
      '<div style="margin-bottom:4px">📄 <code>' + slug + '/data.js</code> ← Bestelldaten</div>' +
      '<div style="margin-top:8px;color:#16a34a;font-weight:600">🔗 lokalonline.at/' + slug + '/</div>';
  }

  window.openSiteGenerator = function (order) {
    currentOrderData = order;
    var autoSlug = slugify(order.business_name);
    document.getElementById('siteSlug').value = autoSlug;
    document.getElementById('siteGenError').style.display = 'none';
    // Reset template selection
    document.querySelectorAll('.template-card').forEach(function (c) { c.classList.remove('active'); });
    var defaultTpl = 'restaurant';
    var typeMap = { 'café': 'cafe', 'cafe': 'cafe', 'coffee': 'cafe', 'nagelstudio': 'beauty', 'nail': 'beauty', 'friseur': 'beauty', 'hairstudio': 'beauty', 'beauty': 'beauty', 'einzelhandel': 'retail', 'retail': 'retail', 'boutique': 'retail' };
    if (order.business_type) {
      var bt = order.business_type.toLowerCase();
      for (var key in typeMap) {
        if (bt.indexOf(key) !== -1) { defaultTpl = typeMap[key]; break; }
      }
    }
    selectedTemplate = defaultTpl;
    var activeCard = document.querySelector('.template-card[data-tpl="' + defaultTpl + '"]');
    if (activeCard) activeCard.classList.add('active');
    updateSiteGenPreview();
    openModal('siteGenOverlay');
  };

  function generateDataJs(type, slug, order) {
    var photoUrls = [];
    if (order.photo_urls) { try { photoUrls = JSON.parse(order.photo_urls); } catch (e) {} }
    else if (order.photo_url) { photoUrls = [order.photo_url]; }

    // copyPhotosToGitHub saves photos as img/slide1.jpg, img/slide2.jpg, ...
    // Use local paths in data.js, not Supabase Storage URLs
    var localImgs = photoUrls.map(function(_, i) { return 'img/slide' + (i + 1) + '.jpg'; });
    var fallbackImgs = ['img/slide1.jpg', 'img/slide2.jpg', 'img/iroom.jpg'];
    var imgs = localImgs.length > 0 ? localImgs : fallbackImgs;

    var slides = imgs.map(function(img, i) {
      return {
        img: img,
        eyebrow: { de: i === 0 ? 'Herzlich Willkommen' : '', en: i === 0 ? 'Welcome' : '' },
        title: { de: i === 0 ? (order.business_name || '') + '<br><em>Wien</em>' : '', en: i === 0 ? (order.business_name || '') + '<br><em>Vienna</em>' : '' },
        desc: { de: i === 0 ? (order.description || '') : '', en: '' }
      };
    });
    var colorDefaults = {
      restaurant: { primary:'#C8302A', accent:'#C8302A', bg:'#F8F7F4', dark:'#111110', mid:'#9B9893', dim:'#5C5A57', line:'#DDDAD4' },
      cafe:        { primary:'#B8763A', accent:'#B8763A', bg:'#FAF7F2', dark:'#1C1208', mid:'#8C7B6B', dim:'#6B5C4E', line:'#E8DDD0' },
      beauty:      { primary:'#C9A96E', accent:'#C9A96E', bg:'#FAF9F7', dark:'#1A1A1A', mid:'#8A8480', dim:'#6B6865', line:'#E8E4DF' },
      retail:      { primary:'#E85D26', accent:'#E85D26', bg:'#FFFFFF', dark:'#0A0A0A', mid:'#6B6B6B', dim:'#9A9A9A', line:'#E8E8E8' }
    };
    var fontDefaults = {
      restaurant: { heading:'DM Serif Display', body:'DM Sans' },
      cafe:        { heading:'Playfair Display',  body:'Inter' },
      beauty:      { heading:'Cormorant Garamond', body:'DM Sans' },
      retail:      { heading:'Space Grotesk',      body:'Inter' }
    };

    var D = {
      template: type,
      slug: slug,
      name: order.business_name || '',
      tagline: { de: order.description || '', en: '' },
      type:    { de: order.business_type || '', en: '' },
      colors:  colorDefaults[type] || colorDefaults.restaurant,
      fonts:   fontDefaults[type]  || fontDefaults.restaurant,
      address: order.address || '',
      phone:   order.phone   || '',
      email:   order.email   || '',
      instagram: order.instagram ? order.instagram.replace(/^@/, '') : '',
      googleMapsUrl:   'https://maps.google.com/?q=' + encodeURIComponent(order.address || ''),
      googleMapsEmbed: '',
      hours: [
        { day: { de: 'Mo–Fr', en: 'Mon–Fri' }, time: '11:00–22:00' },
        { day: { de: 'Sa–So', en: 'Sat–Sun' }, time: '12:00–22:00' }
      ],
      slides: slides,
      about: {
        img: imgs[1] || imgs[0] || 'img/iroom.jpg',
        text: { de: order.description || '', en: '' },
        highlights: [
          { de: 'Täglich frisch', en: 'Daily fresh' },
          { de: 'Persönlicher Service', en: 'Personal service' },
          { de: 'Im Herzen Wiens', en: 'In the heart of Vienna' }
        ]
      },
      menuUrl: 'menu/',
      menuBand: { headline: { de: 'Unsere<br><em>Speisekarte</em>', en: 'Our<br><em>Menu</em>' }, sub: { de: '', en: '' }, cta: { de: 'Speisekarte ansehen →', en: 'View menu →' } },
      services: [],
      categories: [],
      highlights: [
        { icon: '✦', title: { de: 'Qualität', en: 'Quality' }, desc: { de: 'Höchste Qualität', en: 'Highest quality' } },
        { icon: '✦', title: { de: 'Service', en: 'Service' }, desc: { de: 'Persönlicher Service', en: 'Personal service' } },
        { icon: '✦', title: { de: 'Wien', en: 'Vienna' }, desc: { de: 'Im Herzen der Stadt', en: 'In the heart of the city' } }
      ],
      announcementBar: { de: 'Jetzt Termin buchen — schnell & einfach online', en: 'Book your appointment online' },
      photos: imgs,
      supabase: { url: SUPABASE_URL, key: SUPABASE_KEY },
      reviewSlug: slug,
      instagramPhotos: imgs.concat(fallbackImgs).slice(0, 6),
      logo: order.logo_url ? 'img/logo.png' : '',
      seo: { title: (order.business_name || '') + ' — Wien', description: { de: order.description || '', en: '' }, ogImage: imgs[0] || 'img/og-image.jpg' },
      legal: {
        type: order.legal_type || 'einzelunternehmer',
        name: order.legal_name || '',
        legal_form: order.legal_form || '',
        geschaeftsfuehrer: order.geschaeftsfuehrer || '',
        gisa_number: order.gisa_number || '',
        fn_number: order.fn_number || '',
        uid_number: order.uid_number || ''
      }
    };

    return 'window.SITE_DATA = ' + JSON.stringify(D, null, 2) + ';\n';
  }

  async function uploadFile(path, content) {
    var session = (await sb.auth.getSession()).data.session;
    var token = session ? session.access_token : '';
    var res = await fetch(EDGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action: 'put-file', path: path, content: btoa(unescape(encodeURIComponent(content))), message: 'Generate site: ' + path })
    });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Upload failed');
  }

  // ── File Editor ───────────────────────────────────────────────────
  var editingSlug = null;

  async function openFileEditor(slug) {
    editingSlug = slug;
    var errEl = document.getElementById('fileEditorError');
    var contentEl = document.getElementById('fileEditorContent');
    var infoEl = document.getElementById('fileEditorInfo');
    errEl.style.display = 'none';
    contentEl.value = '⏳ Lade…';
    infoEl.textContent = 'lokalonline.at/' + slug + '/data.js';
    openModal('fileEditorOverlay');

    try {
      var session = (await sb.auth.getSession()).data.session;
      var token = session ? session.access_token : '';
      var res = await fetch(EDGE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ action: 'get-file', path: slug + '/data.js' })
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      contentEl.value = data.content;
    } catch (e) {
      contentEl.value = '';
      errEl.textContent = 'Fehler beim Laden: ' + e.message;
      errEl.style.display = 'block';
    }
  }

  document.getElementById('fileEditorSave').addEventListener('click', async function () {
    if (!editingSlug) return;
    var content = document.getElementById('fileEditorContent').value;
    var errEl = document.getElementById('fileEditorError');
    var btn = document.getElementById('fileEditorSave');
    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = '⏳ Speichert…';

    try {
      await uploadFile(editingSlug + '/data.js', content);
      closeModal('fileEditorOverlay');
      showToast('✅ data.js gespeichert!');
    } catch (e) {
      errEl.textContent = 'Fehler: ' + e.message;
      errEl.style.display = 'block';
    }
    btn.disabled = false; btn.textContent = '💾 Speichern & deployen';
  });

  // ── Copy photos from Supabase Storage to GitHub ───────────────────
  async function copyPhotosToGitHub(slug, order) {
    var session = (await sb.auth.getSession()).data.session;
    var token = session ? session.access_token : '';

    async function copyOne(sourceUrl, destPath) {
      try {
        await fetch(EDGE_FN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ action: 'copy-from-url', source_url: sourceUrl, dest_path: destPath, message: 'Upload photo: ' + destPath })
        });
      } catch (e) { /* non-fatal */ }
    }

    if (order.logo_url) await copyOne(order.logo_url, slug + '/img/logo.png');

    var photoUrls = [];
    if (order.photo_urls) { try { photoUrls = JSON.parse(order.photo_urls); } catch (e) {} }
    else if (order.photo_url) { photoUrls = [order.photo_url]; }

    for (var i = 0; i < photoUrls.length && i < 6; i++) {
      await copyOne(photoUrls[i], slug + '/img/slide' + (i + 1) + '.jpg');
    }
  }

  function generateMenuDataJs(type, slug, order) {
    var services = [];
    if (order.services) { try { services = JSON.parse(order.services); } catch(e) {} }

    var categories = [];
    if (services.length > 0) {
      categories = [{ name: { de: 'Angebot', en: 'Offerings' }, items: services.map(function(s) {
        return { name: { de: s.name || '', en: s.name || '' }, desc: { de: s.description || '', en: s.description || '' }, price: s.price || '' };
      }) }];
    }

    var menuLabels = {
      restaurant: { cat: { de: 'Speisekarte', en: 'Menu' }, hero: { de: 'Unsere Küche', en: 'Our Kitchen' } },
      cafe:        { cat: { de: 'Karte', en: 'Menu' },       hero: { de: 'Genuss & Kaffee', en: 'Coffee & Treats' } },
      beauty:      { cat: { de: 'Leistungen', en: 'Services' }, hero: { de: 'Unsere Leistungen', en: 'Our Services' } },
      retail:      { cat: { de: 'Sortiment', en: 'Collections' }, hero: { de: 'Unser Sortiment', en: 'Our Collections' } }
    };
    var labels = menuLabels[type] || menuLabels.restaurant;
    if (categories.length === 0) {
      categories = [{ name: labels.cat, items: [] }];
    }

    return 'window.MENU_DATA = ' + JSON.stringify({ categories: categories }, null, 2) + ';\n';
  }

  function generateLinkPageHtml(slug, order) {
    var name = order.business_name || '';
    var phone = order.phone || '';
    var instagram = order.instagram ? order.instagram.replace(/^@/, '') : '';
    var address = order.address || '';
    var mapsUrl = 'https://maps.google.com/?q=' + encodeURIComponent(address);

    var links = [];
    links.push({ icon: '🌐', label: 'Website', url: 'https://lokalonline.at/' + slug + '/' });
    links.push({ icon: '📋', label: 'Speisekarte / Leistungen', url: 'https://lokalonline.at/' + slug + '/menu/' });
    if (phone) links.push({ icon: '📞', label: phone, url: 'tel:' + phone.replace(/\s/g,'') });
    if (instagram) links.push({ icon: '📸', label: '@' + instagram, url: 'https://instagram.com/' + instagram });
    if (address) links.push({ icon: '📍', label: address, url: mapsUrl });

    var linksHtml = links.map(function(l) {
      return '<a href="' + l.url + '" class="link-btn" target="_blank"><span class="link-icon">' + l.icon + '</span><span>' + l.label + '</span></a>';
    }).join('\n      ');

    return '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + name + '</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0}\nbody{min-height:100vh;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:24px}\n.card{width:100%;max-width:400px}\n.logo{width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 16px;display:block;background:#222}\n.name{color:#fff;font-size:22px;font-weight:700;text-align:center;margin-bottom:4px}\n.sub{color:rgba(255,255,255,.45);font-size:14px;text-align:center;margin-bottom:32px}\n.link-btn{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;text-decoration:none;padding:16px 20px;border-radius:12px;margin-bottom:10px;font-size:15px;transition:background .2s,border-color .2s}\n.link-btn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.25)}\n.link-icon{font-size:20px;flex-shrink:0;width:28px;text-align:center}\n.footer{text-align:center;margin-top:28px;font-size:11px;color:rgba(255,255,255,.2)}\n</style>\n</head>\n<body>\n<div class="card">\n  <img class="logo" src="../img/logo.png" onerror="this.style.display=\'none\'">\n  <div class="name">' + name + '</div>\n  <div class="sub" id="subtext">Wien</div>\n  <div id="links">\n      ' + linksHtml + '\n  </div>\n  <div class="footer">lokalonline.at</div>\n</div>\n<script>\nvar d=document.getElementById("subtext");\nif(d&&"' + address + '")d.textContent="' + address + '";\n<\/script>\n</body>\n</html>\n';
  }

  async function generateQrCode(slug) {
    var menuUrl = 'https://lokalonline.at/' + slug + '/menu/';
    return new Promise(function(resolve) {
      var canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, menuUrl, { width: 400, margin: 2, color: { dark: '#000000', light: '#ffffff' } }, async function(err) {
        if (!err) {
          canvas.toBlob(async function(blob) {
            var reader = new FileReader();
            reader.onloadend = async function() {
              var base64 = reader.result.split(',')[1];
              try {
                var session = (await sb.auth.getSession()).data.session;
                var token = session ? session.access_token : '';
                await fetch(EDGE_FN, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                  body: JSON.stringify({ action: 'put-file', path: slug + '/img/qr-menu.png', content: base64, message: 'Add QR code for menu' })
                });
              } catch(e) { /* non-fatal */ }
              resolve();
            };
            reader.readAsDataURL(blob);
          }, 'image/png');
        } else { resolve(); }
      });
    });
  }

  function showQrResult(slug) {
    var menuUrl = 'https://lokalonline.at/' + slug + '/menu/';

    var linksEl = document.getElementById('qrResultLinks');
    linksEl.innerHTML = [
      { label: '🌐 Website', url: 'https://lokalonline.at/' + slug + '/' },
      { label: '📋 Menü', url: menuUrl },
      { label: '🔗 Link Page', url: 'https://lokalonline.at/' + slug + '/link/' }
    ].map(function(l) {
      return '<a href="' + l.url + '" target="_blank" class="btn btn-outline btn-sm">' + l.label + '</a>';
    }).join('');

    document.getElementById('qrCodeUrl').textContent = menuUrl;

    // Render QR directly into the img element via canvas
    var canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, menuUrl, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } }, function(err) {
      if (!err) {
        var dataUrl = canvas.toDataURL('image/png');
        document.getElementById('qrCodeImg').src = dataUrl;
        document.getElementById('qrDownloadBtn').href = dataUrl;
      }
    });

    openModal('qrResultOverlay');
  }

  async function doGenerateSite() {
    var slug = document.getElementById('siteSlug').value.trim();
    var errEl = document.getElementById('siteGenError');
    var btn = document.getElementById('siteGenSubmit');
    errEl.style.display = 'none';

    if (!slug) { errEl.textContent = 'Bitte einen URL Slug eingeben.'; errEl.style.display = 'block'; return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { errEl.textContent = 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt.'; errEl.style.display = 'block'; return; }

    btn.disabled = true;
    btn.textContent = '⏳ 1/5 Hauptseite…';

    try {
      // 1. Main site
      var tplRes = await fetch('/templates/' + selectedTemplate + '/index.html');
      if (!tplRes.ok) throw new Error('Template nicht gefunden.');
      var tplHtml = await tplRes.text();
      var dataJs = generateDataJs(selectedTemplate, slug, currentOrderData);
      await uploadFile(slug + '/index.html', tplHtml);
      await uploadFile(slug + '/data.js', dataJs);

      // 2. Menu page
      btn.textContent = '⏳ 2/5 Menüseite…';
      var menuRes = await fetch('/templates/' + selectedTemplate + '/menu/index.html');
      if (menuRes.ok) {
        var menuHtml = await menuRes.text();
        var menuDataJs = generateMenuDataJs(selectedTemplate, slug, currentOrderData);
        await uploadFile(slug + '/menu/index.html', menuHtml);
        await uploadFile(slug + '/menu/menu-data.js', menuDataJs);
      }

      // 3. Link page
      btn.textContent = '⏳ 3/5 Link-Seite…';
      var linkHtml = generateLinkPageHtml(slug, currentOrderData);
      await uploadFile(slug + '/link/index.html', linkHtml);

      // 4. Photos + QR code
      btn.textContent = '⏳ 4/5 Fotos & QR…';
      await copyPhotosToGitHub(slug, currentOrderData);
      await generateQrCode(slug);

      // 5. Save to DB
      btn.textContent = '⏳ 5/5 Speichert…';
      await sb.from('orders').update({
        site_slug: slug,
        admin_notes: (currentOrderData.admin_notes ? currentOrderData.admin_notes + '\n' : '') + 'Site: lokalonline.at/' + slug + '/'
      }).eq('id', currentOrderData.id);

      currentOrderData.site_slug = slug;
      document.getElementById('orderSiteSlug').value = slug;
      document.getElementById('editSiteBtn').style.display = 'inline-flex';

      closeModal('siteGenOverlay');
      showQrResult(slug);

    } catch (e) {
      errEl.textContent = 'Fehler: ' + e.message;
      errEl.style.display = 'block';
    }

    btn.disabled = false;
    btn.textContent = '🚀 Website generieren';
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
