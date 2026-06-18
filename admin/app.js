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
      infoItem('Betrieb', esc(data.business) || '—') +
      infoItem('Telefon', esc(data.phone) || '—') +
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
    document.getElementById('clientPlan').value = data ? data.plan : 'flat';
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
      .select('id, business_name, business_type, site_slug, payment_status')
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
      var base = 'https://web.lokalonline.at/' + slug;
      return '<tr>' +
        '<td><strong>' + esc(o.business_name) + '</strong><br><span style="font-size:11px;color:var(--text-muted)">' + (o.business_type || '') + '</span></td>' +
        '<td><code style="font-size:12px;background:var(--bg);padding:2px 6px;border-radius:4px">' + slug + '</code></td>' +
        '<td>' + orderStatusBadge(o.payment_status) + '</td>' +
        '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<a href="' + base + '/" target="_blank" class="btn btn-outline btn-sm">🏠 Start</a>' +
          '<a href="' + base + '/menu/" target="_blank" class="btn btn-outline btn-sm">📋 Menü</a>' +
          '<a href="' + base + '/link/" target="_blank" class="btn btn-outline btn-sm">🔗 Links</a>' +
        '</td>' +
        '<td style="display:flex;gap:6px">' +
          '<button class="btn btn-outline btn-sm" onclick="openOrder(\'' + o.id + '\')">✏️ Details</button>' +
          '<button class="btn btn-danger btn-sm" onclick="deleteSite(\'' + o.id + '\',\'' + slug + '\')">🗑️</button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  window.deleteSite = async function(orderId, slug) {
    if (!confirm('Website "' + slug + '" wirklich löschen?\nDieser Vorgang kann nicht rückgängig gemacht werden.')) return;
    var session = (await sb.auth.getSession()).data.session;
    var token = session ? session.access_token : '';
    var res = await fetch(EDGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action: 'delete-folder', slug: slug })
    });
    var data = await res.json();
    if (data.error) { showToast('Fehler: ' + data.error); return; }
    await sb.from('orders').update({ site_slug: null }).eq('id', orderId);
    showToast('✅ "' + slug + '" gelöscht.');
    loadSites();
  };

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
      infoItem('Ansprechperson', esc(data.contact_name) || '—') +
      infoItem('Branche', esc(data.business_type) || '—') +
      infoItem('Kurzbeschreibung', esc(data.description) || '—') +
      infoItem('Adresse', esc(data.address) || '—') +
      infoItem('Telefon', esc(data.phone) || '—') +
      infoItem('E-Mail', '<a href="mailto:' + esc(data.email) + '" style="color:var(--primary)">' + esc(data.email) + '</a>') +
      infoItem('Instagram', esc(data.instagram) || '—') +
      infoItem('Website', esc(data.website) || '—') +
      infoItem('Öffnungszeiten', data.hours ? '<pre style="font-size:12px;white-space:pre-wrap">' + esc(data.hours) + '</pre>' : '—') +
      infoItem('Wünsche', esc(data.notes) || '—') +
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
    document.getElementById('orderSiteSlug').value = data.site_slug || '';
    var editBtn = document.getElementById('editSiteBtn');
    editBtn.style.display = data.site_slug ? 'inline-flex' : 'none';
    document.getElementById('editLinksBtn').style.display = data.site_slug ? 'inline-flex' : 'none';
    document.getElementById('previewSiteBtn').style.display = data.site_slug ? 'inline-flex' : 'none';
    document.getElementById('generateSiteBtn').textContent = data.site_slug ? '🔄 Neu generieren' : '🌐 Website erstellen';
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

    document.getElementById('previewSiteBtn').addEventListener('click', function () {
      var slug = document.getElementById('orderSiteSlug').value.trim();
      if (!slug) { showToast('Bitte zuerst einen Slug eingeben und speichern.'); return; }
      window.open('https://web.lokalonline.at/' + slug + '/', '_blank');
    });

    document.getElementById('editSiteBtn').addEventListener('click', function () {
      var slug = document.getElementById('orderSiteSlug').value.trim();
      if (!slug) { showToast('Bitte zuerst einen Slug eingeben und speichern.'); return; }
      openFileEditor(slug);
    });

    document.getElementById('editLinksBtn').addEventListener('click', function () {
      var slug = document.getElementById('orderSiteSlug').value.trim();
      if (!slug) { showToast('Bitte zuerst einen Slug eingeben und speichern.'); return; }
      openLinkEditor(slug);
    });

    document.getElementById('saveOrderBtn').addEventListener('click', async function () {
      if (!currentOrderId) return;
      var slug = document.getElementById('orderSiteSlug').value.trim() || null;
      var { error } = await sb.from('orders').update({
        payment_status: document.getElementById('orderStatus').value,
        admin_notes: document.getElementById('orderNotes').value,
        site_slug: slug
      }).eq('id', currentOrderId);
      if (!error) {
        document.getElementById('editSiteBtn').style.display = slug ? 'inline-flex' : 'none';
        document.getElementById('editLinksBtn').style.display = slug ? 'inline-flex' : 'none';
        document.getElementById('previewSiteBtn').style.display = slug ? 'inline-flex' : 'none';
        document.getElementById('generateSiteBtn').textContent = slug ? '🔄 Neu generieren' : '🌐 Website erstellen';
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
    return { flat: 'Premium', basis: 'Premium', standard: 'Premium', premium: 'Premium', unsure: 'Unsicher' }[plan] || plan;
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
      '<div style="margin-top:8px;color:#16a34a;font-weight:600">🔗 web.lokalonline.at/' + slug + '/</div>';
  }

  window.openSiteGenerator = function (order) {
    currentOrderData = order;
    // Bei bestehender Site denselben Slug behalten (Neu-Generierung), sonst aus Name ableiten.
    document.getElementById('siteSlug').value = order.site_slug || slugify(order.business_name);
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

  // ── Kuratierte Text-Presets (kostenloser Ersatz für KI-Texte) ──────
  // Pro Branche × Stil; {name}/{type} werden eingesetzt.
  var COPY_PRESETS = {
    restaurant: {
      herzlich: {
        tagline: 'Herzliche Küche im Herzen Wiens',
        intro: 'Bei {name} dreht sich alles um Genuss, Gastfreundschaft und frische Zutaten. Wir freuen uns darauf, Sie bei uns begrüßen zu dürfen.',
        about: 'Was als kleine Idee begann, ist heute ein Ort, an dem sich Gäste wie zuhause fühlen. Jedes Gericht bei {name} wird mit Sorgfalt und Leidenschaft zubereitet — frisch, ehrlich und mit Liebe zum Detail.',
        slides: [
          { eyebrow: 'Herzlich Willkommen', title: '{name}<br><em>Wien</em>', desc: 'Gutes Essen in gemütlicher Atmosphäre' },
          { eyebrow: 'Unsere Küche', title: 'Frisch &amp;<br><em>Hausgemacht</em>', desc: 'Täglich frisch für Sie zubereitet' },
          { eyebrow: 'Ambiente', title: 'Gemütlich &amp;<br><em>Herzlich</em>', desc: 'Ein Ort zum Wohlfühlen' }
        ],
        highlights: ['Täglich frisch gekocht', 'Herzliche Gastfreundschaft', 'Im Herzen Wiens', 'Hausgemachte Spezialitäten']
      },
      traditionell: {
        tagline: 'Authentische Küche mit Tradition',
        intro: 'Bei {name} pflegen wir traditionelle Rezepte und echtes Handwerk. Schmecken Sie den Unterschied, den Erfahrung macht.',
        about: '{name} steht für Beständigkeit und Qualität. Nach überlieferten Rezepten und mit ausgewählten Zutaten bewahren wir den authentischen Geschmack — Gericht für Gericht.',
        slides: [
          { eyebrow: 'Willkommen', title: '{name}<br><em>seit jeher</em>', desc: 'Traditionelle Küche, ehrlich zubereitet' },
          { eyebrow: 'Handwerk', title: 'Echte<br><em>Rezepte</em>', desc: 'Nach überlieferter Art zubereitet' },
          { eyebrow: 'Qualität', title: 'Ausgewählte<br><em>Zutaten</em>', desc: 'Sorgfalt in jedem Detail' }
        ],
        highlights: ['Traditionelle Rezepte', 'Ausgewählte Zutaten', 'Echtes Handwerk', 'Seit Jahren bewährt']
      },
      modern: {
        tagline: 'Moderne Küche, klare Aromen',
        intro: '{name} verbindet zeitgemäße Küche mit besten Produkten. Reduziert, kreativ und kompromisslos im Geschmack.',
        about: 'Bei {name} denken wir Küche neu: saisonale Produkte, klare Aromen und eine Atmosphäre, die zum Verweilen einlädt. Genuss auf der Höhe der Zeit.',
        slides: [
          { eyebrow: 'Willkommen', title: '{name}<br><em>Wien</em>', desc: 'Zeitgemäße Küche, klar und kreativ' },
          { eyebrow: 'Konzept', title: 'Saisonal &amp;<br><em>Kreativ</em>', desc: 'Beste Produkte, modern interpretiert' },
          { eyebrow: 'Erlebnis', title: 'Geschmack<br><em>neu gedacht</em>', desc: 'Ein Ort für Genießer' }
        ],
        highlights: ['Saisonale Produkte', 'Kreative Küche', 'Klares Konzept', 'Modernes Ambiente']
      }
    },
    cafe: {
      herzlich: {
        tagline: 'Ihr Wohnzimmer in Wien',
        intro: 'Bei {name} treffen sich guter Kaffee, frische Mehlspeisen und herzliche Gespräche. Kommen Sie vorbei und bleiben Sie ein wenig.',
        about: '{name} ist ein Ort zum Ankommen — bei einer guten Tasse Kaffee und hausgemachten Köstlichkeiten. Wir freuen uns auf Ihren Besuch.',
        slides: [
          { eyebrow: 'Herzlich Willkommen', title: '{name}<br><em>Wien</em>', desc: 'Kaffee, Kuchen & gute Gespräche' },
          { eyebrow: 'Hausgemacht', title: 'Frisch &amp;<br><em>Süß</em>', desc: 'Täglich frische Mehlspeisen' },
          { eyebrow: 'Wohlfühlen', title: 'Gemütlich &amp;<br><em>Herzlich</em>', desc: 'Ihr Lieblingsplatz in der Stadt' }
        ],
        highlights: ['Frisch gerösteter Kaffee', 'Hausgemachte Mehlspeisen', 'Gemütliche Atmosphäre', 'Herzlicher Service']
      },
      modern: {
        tagline: 'Specialty Coffee in Wien',
        intro: 'Bei {name} gibt es Specialty Coffee, frische Backwaren und einen Ort, an dem man gerne verweilt.',
        about: '{name} steht für besten Kaffee und ein modernes, einladendes Ambiente. Sorgfältig ausgewählte Bohnen, frisch zubereitet.',
        slides: [
          { eyebrow: 'Willkommen', title: '{name}<br><em>Wien</em>', desc: 'Specialty Coffee & frische Backwaren' },
          { eyebrow: 'Kaffee', title: 'Beste<br><em>Bohnen</em>', desc: 'Sorgfältig ausgewählt & frisch zubereitet' },
          { eyebrow: 'Ambiente', title: 'Modern &amp;<br><em>Einladend</em>', desc: 'Ein Ort zum Verweilen' }
        ],
        highlights: ['Specialty Coffee', 'Frische Backwaren', 'Modernes Ambiente', 'Zum Verweilen']
      },
      traditionell: {
        tagline: 'Wiener Kaffeehaus-Kultur',
        intro: 'Bei {name} lebt die Wiener Kaffeehaus-Tradition: gute Melange, klassische Mehlspeisen und Zeit für ein gutes Gespräch.',
        about: '{name} pflegt die echte Wiener Kaffeehaus-Kultur — mit klassischen Spezialitäten und einer Atmosphäre, in der die Zeit ein wenig langsamer vergeht.',
        slides: [
          { eyebrow: 'Willkommen', title: '{name}<br><em>Wien</em>', desc: 'Wiener Kaffeehaus-Kultur' },
          { eyebrow: 'Klassisch', title: 'Melange &amp;<br><em>Mehlspeisen</em>', desc: 'Wiener Spezialitäten' },
          { eyebrow: 'Tradition', title: 'Zeit zum<br><em>Genießen</em>', desc: 'Wie es sich gehört' }
        ],
        highlights: ['Wiener Tradition', 'Klassische Mehlspeisen', 'Gute Melange', 'Zeit zum Verweilen']
      }
    },
    beauty: {
      herzlich: {
        tagline: 'Zeit für Sie',
        intro: 'Bei {name} nehmen wir uns Zeit für Sie. Lassen Sie sich verwöhnen und fühlen Sie sich rundum wohl.',
        about: '{name} ist Ihr Ort zum Entspannen und Schönfühlen. Mit Können und Herz kümmern wir uns um Ihr Wohlbefinden.',
        slides: [
          { eyebrow: 'Willkommen', title: '{name}<br><em>Wien</em>', desc: 'Zeit für Ihr Wohlbefinden' },
          { eyebrow: 'Verwöhnen', title: 'Schön &amp;<br><em>Entspannt</em>', desc: 'Lassen Sie sich verwöhnen' },
          { eyebrow: 'Service', title: 'Mit Herz &amp;<br><em>Können</em>', desc: 'Persönliche Betreuung' }
        ],
        highlights: ['Persönliche Beratung', 'Mit Herz & Können', 'Zum Wohlfühlen', 'Im Herzen Wiens']
      },
      modern: {
        tagline: 'Beauty auf der Höhe der Zeit',
        intro: 'Bei {name} verbinden wir moderne Techniken mit einem klaren Sinn für Stil. Für Ihren perfekten Look.',
        about: '{name} steht für zeitgemäße Beauty und gepflegtes Design. Mit aktuellen Techniken bringen wir Ihren Stil zur Geltung.',
        slides: [
          { eyebrow: 'Willkommen', title: '{name}<br><em>Wien</em>', desc: 'Beauty auf der Höhe der Zeit' },
          { eyebrow: 'Stil', title: 'Modern &amp;<br><em>Gepflegt</em>', desc: 'Ihr perfekter Look' },
          { eyebrow: 'Technik', title: 'Aktuell &amp;<br><em>Präzise</em>', desc: 'Mit modernen Methoden' }
        ],
        highlights: ['Moderne Techniken', 'Klarer Stil', 'Persönliche Beratung', 'Gepflegtes Ambiente']
      }
    },
    retail: {
      modern: {
        tagline: 'Ausgewählt für Sie',
        intro: 'Bei {name} finden Sie sorgfältig ausgewählte Produkte und persönliche Beratung. Schauen Sie vorbei.',
        about: '{name} steht für ein kuratiertes Sortiment und ehrliche Beratung. Wir nehmen uns Zeit, das Richtige für Sie zu finden.',
        slides: [
          { eyebrow: 'Willkommen', title: '{name}<br><em>Wien</em>', desc: 'Ausgewählt für Sie' },
          { eyebrow: 'Sortiment', title: 'Kuratiert &amp;<br><em>Besonders</em>', desc: 'Mit Sorgfalt ausgewählt' },
          { eyebrow: 'Service', title: 'Persönlich &amp;<br><em>Ehrlich</em>', desc: 'Beratung, die weiterhilft' }
        ],
        highlights: ['Kuratiertes Sortiment', 'Persönliche Beratung', 'Ausgewählte Produkte', 'Im Herzen Wiens']
      },
      herzlich: {
        tagline: 'Ihr Geschäft um die Ecke',
        intro: 'Bei {name} werden Sie persönlich beraten und finden Produkte, die wir selbst lieben. Wir freuen uns auf Sie.',
        about: '{name} ist Ihr Geschäft mit persönlicher Note. Wir kennen unsere Produkte und beraten Sie ehrlich und herzlich.',
        slides: [
          { eyebrow: 'Willkommen', title: '{name}<br><em>Wien</em>', desc: 'Ihr Geschäft um die Ecke' },
          { eyebrow: 'Auswahl', title: 'Mit Liebe<br><em>ausgewählt</em>', desc: 'Produkte, die wir selbst lieben' },
          { eyebrow: 'Service', title: 'Persönlich &amp;<br><em>Herzlich</em>', desc: 'Beratung mit Herz' }
        ],
        highlights: ['Persönliche Beratung', 'Mit Liebe ausgewählt', 'Herzlicher Service', 'Im Herzen Wiens']
      }
    }
  };

  function getCopyPreset(type, tone) {
    var byType = COPY_PRESETS[type] || COPY_PRESETS.restaurant;
    return byType[tone] || byType[Object.keys(byType)[0]];
  }

  // Fotos nach Kundenrolle gruppieren (hero/innen/speisen/rest), ausgerichtet an photo_urls.
  function classifyPhotos(order) {
    var urls = [];
    if (order.photo_urls) { try { urls = JSON.parse(order.photo_urls); } catch (e) {} }
    else if (order.photo_url) { urls = [order.photo_url]; }
    if (!Array.isArray(urls)) urls = [];
    var roles = [];
    if (order.photo_roles) { try { roles = JSON.parse(order.photo_roles); } catch (e) {} }
    if (!Array.isArray(roles)) roles = [];

    var hero = [], innen = [], speisen = [], rest = [];
    urls.forEach(function (u, i) {
      var r = roles[i] || '';
      if (r === 'hero') hero.push(u);
      else if (r === 'innen') innen.push(u);
      else if (r === 'speisen') speisen.push(u);
      else rest.push(u);
    });
    // Slides bevorzugen Titelbilder, sonst alle Fotos.
    return { urls: urls, hero: hero, innen: innen, speisen: speisen, rest: rest,
             slideUrls: hero.length ? hero : urls };
  }

  function fillTpl(str, order) {
    return String(str || '')
      .replace(/\{name\}/g, order.business_name || '')
      .replace(/\{type\}/g, order.business_type || '');
  }

  // Freitext-Öffnungszeiten ("Mo-Fr 11:00-22:00") best effort in Tabelle parsen.
  function parseHours(raw) {
    if (!raw) return null;
    var timeRe = /(\d{1,2}([:.]\d{2})?\s*[-–—]\s*\d{1,2}([:.]\d{2})?(\s*Uhr)?)/;
    var rows = [];
    raw.split(/[\n;]/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var m = line.match(timeRe);
      if (m) {
        var time = m[0].replace(/\s*Uhr/i, '').replace(/\s+/g, '').replace(/\./g, ':');
        var day = line.slice(0, m.index).replace(/[:\-–—,\s]+$/, '').trim();
        rows.push({ day: { de: day || '', en: day || '' }, time: time });
      } else {
        rows.push({ day: { de: line, en: line }, time: '' });
      }
    });
    return rows.length ? rows : null;
  }

  function generateDataJs(type, slug, order) {
    var photoUrls = [];
    if (order.photo_urls) { try { photoUrls = JSON.parse(order.photo_urls); } catch (e) {} }
    else if (order.photo_url) { photoUrls = [order.photo_url]; }

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

    var preset = getCopyPreset(type, order.tone || 'herzlich');
    var name = order.business_name || '';

    // Texte: Kundenbeschreibung hat Vorrang, sonst kuratiertes Preset.
    var taglineDe = order.description ? order.description : fillTpl(preset.tagline, order);
    var aboutDe   = order.description && order.description.length > 60
      ? order.description : fillTpl(preset.about, order);
    var introDe   = fillTpl(preset.intro, order);

    // Fotos nach Rolle: Titelbilder → Slider, Innen → Über-uns, Speisen/Rest → Galerie.
    var pc = classifyPhotos(order);
    var galleryUrls = pc.speisen.concat(pc.rest, pc.innen, pc.hero);
    if (galleryUrls.length === 0) galleryUrls = photoUrls;

    // Slides aus den Titelbildern (img/slide1..N, von copyPhotosToGitHub erzeugt) + Preset-Texten.
    var slideImgs = [];
    for (var si = 0; si < pc.slideUrls.length && si < 3; si++) slideImgs.push('img/slide' + (si + 1) + '.jpg');
    if (slideImgs.length === 0) slideImgs = ['img/slide1.jpg', 'img/slide2.jpg', 'img/slide3.jpg'];
    var slides = slideImgs.map(function (img, i) {
      var s = preset.slides[i % preset.slides.length];
      return {
        img: img,
        eyebrow: { de: s.eyebrow, en: '' },
        title:   { de: fillTpl(s.title, order), en: '' },
        desc:    { de: s.desc, en: '' }
      };
    });

    var highlights = (preset.highlights || []).map(function (h) { return { de: h, en: '' }; });
    var parsedHours = parseHours(order.hours);

    var D = {
      template: type,
      slug: slug,
      name: name,
      tagline: { de: taglineDe, en: '' },
      type:    { de: order.business_type || '', en: '' },
      colors:  colorDefaults[type] || colorDefaults.restaurant,
      fonts:   fontDefaults[type]  || fontDefaults.restaurant,
      nav: { links: [
        { de: 'Start', en: 'Home', href: '#top' },
        { de: 'Über uns', en: 'About', href: '#about' },
        { de: 'Speisekarte', en: 'Menu', href: 'menu/' },
        { de: 'Öffnungszeiten', en: 'Hours', href: '#hours' },
        { de: 'Kontakt', en: 'Contact', href: '#contact' }
      ] },
      address: order.address || '',
      phone:   order.phone   || '',
      email:   order.email   || '',
      instagram: order.instagram ? order.instagram.replace(/^@/, '') : '',
      googleMapsUrl:   'https://maps.google.com/?q=' + encodeURIComponent(order.address || ''),
      googleMapsEmbed: '',
      hours: parsedHours || [
        { day: { de: 'Mo–Fr', en: 'Mon–Fri' }, time: '11:00–22:00' },
        { day: { de: 'Sa–So', en: 'Sat–Sun' }, time: '12:00–22:00' }
      ],
      slides: slides,
      introText: { de: introDe, en: '' },
      about: {
        img: pc.innen[0] || pc.hero[0] || photoUrls[0] || 'img/iroom.jpg',
        text: { de: aboutDe, en: '' },
        highlights: highlights.length ? highlights : [
          { de: 'Täglich frisch', en: 'Daily fresh' },
          { de: 'Persönlicher Service', en: 'Personal service' },
          { de: 'Im Herzen Wiens', en: 'In the heart of Vienna' }
        ]
      },
      menuUrl: 'menu/',
      menuBand: { headline: { de: 'Unsere<br><em>Speisekarte</em>', en: 'Our<br><em>Menu</em>' }, sub: { de: '', en: '' }, cta: { de: 'Speisekarte ansehen →', en: 'View menu →' } },
      services: [],
      categories: [],
      highlights: highlights.slice(0, 3).map(function (h) { return { icon: '✦', title: h, desc: { de: '', en: '' } }; }),
      announcementBar: { de: '', en: '' },
      photos: galleryUrls.length > 0 ? galleryUrls : ['img/slide1.jpg', 'img/slide2.jpg', 'img/iroom.jpg'],
      supabase: { url: SUPABASE_URL, key: SUPABASE_KEY },
      reviewSlug: slug,
      instagramPhotos: galleryUrls.slice(0, 6).concat(['img/slide1.jpg','img/slide2.jpg','img/iroom.jpg','img/food.jpg','img/slide1.jpg','img/slide2.jpg']).slice(0, 6),
      seo: { title: name + ' — Wien', description: { de: taglineDe, en: '' }, ogImage: pc.hero[0] || photoUrls[0] || 'img/og-image.jpg' },
      legal: {
        type: order.legal_type || 'einzelunternehmer',
        name: order.legal_name || '',
        legal_form: order.legal_form || '',
        geschaeftsfuehrer: order.geschaeftsfuehrer || '',
        fn_number: order.fn_number || '',
        uid_number: order.uid_number || ''
      }
    };

    return 'window.SITE_DATA = ' + JSON.stringify(D, null, 2) + ';\n';
  }

  function generateImpressumHtml(slug, order) {
    var isEU = (order.legal_type || 'einzelunternehmer') === 'einzelunternehmer';
    var businessName = order.business_name || '';
    var legalName = order.legal_name || '';
    var address = order.address || '';
    var phone = order.phone || '';
    var email = order.email || '';
    var legalForm = order.legal_form || '';
    var gf = order.geschaeftsfuehrer || '';
    var fn = order.fn_number || '';
    var uid = order.uid_number || '';

    var tableRows = '';
    if (isEU) {
      tableRows =
        '<tr><td>Diensteanbieter</td><td>' + esc(businessName) + '<br><span style="font-size:12px;color:var(--mid)">(Inhaber/in: ' + esc(legalName) + ')</span></td></tr>' +
        '<tr><td>Adresse</td><td>' + esc(address) + '</td></tr>' +
        '<tr><td>Telefon</td><td><a href="tel:' + esc(phone.replace(/\s/g,'')) + '">' + esc(phone) + '</a></td></tr>' +
        '<tr><td>E-Mail</td><td><a href="mailto:' + esc(email) + '">' + esc(email) + '</a></td></tr>' +
        '<tr><td>Unternehmens&shy;gegenstand</td><td>' + esc(order.business_type || '') + '</td></tr>' +
        '<tr><td>Mitgliedschaft</td><td>Wirtschaftskammer Wien</td></tr>' +
        '<tr><td>Gewerbebehörde</td><td>Magistrat der Stadt Wien</td></tr>';
    } else {
      tableRows =
        '<tr><td>Unternehmensname</td><td>' + esc(legalName) + (legalForm ? ' (' + esc(legalForm) + ')' : '') + '<br><span style="font-size:12px;color:var(--mid)">(Betrieb: ' + esc(businessName) + ')</span></td></tr>' +
        '<tr><td>Rechtsform</td><td>' + esc(legalForm) + '</td></tr>' +
        (gf ? '<tr><td>Geschäftsführung</td><td>' + esc(gf) + '</td></tr>' : '') +
        '<tr><td>Adresse</td><td>' + esc(address) + '</td></tr>' +
        '<tr><td>Telefon</td><td><a href="tel:' + esc(phone.replace(/\s/g,'')) + '">' + esc(phone) + '</a></td></tr>' +
        '<tr><td>E-Mail</td><td><a href="mailto:' + esc(email) + '">' + esc(email) + '</a></td></tr>' +
        '<tr><td>Unternehmens&shy;gegenstand</td><td>' + esc(order.business_type || '') + '</td></tr>' +
        (fn  ? '<tr><td>Firmenbuchnummer</td><td>FN ' + esc(fn) + '</td></tr><tr><td>Firmenbuchgericht</td><td>Handelsgericht Wien</td></tr>' : '') +
        (uid ? '<tr><td>UID-Nummer</td><td>' + esc(uid) + '</td></tr>' : '') +
        '<tr><td>Mitgliedschaft</td><td>Wirtschaftskammer Wien</td></tr>' +
        '<tr><td>Gewerbebehörde</td><td>Magistrat der Stadt Wien</td></tr>';
    }

    return '<!DOCTYPE html>\n<html lang="de">\n<head>\n' +
      '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<title>Impressum — ' + esc(businessName) + '</title>\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
      '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">\n' +
      '<style>\n*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}\n' +
      ':root{--black:#111110;--white:#F8F7F4;--warm:#EDEAE4;--mid:#9B9893;--dim:#5C5A57;--line:#DDDAD4}\n' +
      'body{font-family:"DM Sans",sans-serif;background:var(--white);color:var(--black)}\n' +
      'nav{padding:20px 48px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}\n' +
      '.nav-logo{font-family:"DM Serif Display",serif;font-size:20px;color:var(--black);text-decoration:none}\n' +
      '.back-link{font-size:12px;color:var(--mid);text-decoration:none;letter-spacing:0.1em}\n' +
      '.back-link:hover{color:var(--black)}\n' +
      '.page-header{background:var(--black);padding:64px 80px 48px}\n' +
      '.page-tag{font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:16px}\n' +
      '.page-title{font-family:"DM Serif Display",serif;font-size:clamp(32px,4vw,54px);color:#fff;line-height:1.1}\n' +
      '.content{max-width:720px;margin:0 auto;padding:64px 48px 96px}\n' +
      '.content h2{font-family:"DM Serif Display",serif;font-size:22px;font-weight:400;margin:48px 0 20px;padding-top:48px;border-top:1px solid var(--line)}\n' +
      '.content h2:first-of-type{margin-top:0;padding-top:0;border-top:none}\n' +
      '.content p{font-size:14px;font-weight:300;line-height:1.9;color:var(--dim);margin-bottom:12px}\n' +
      '.content a{color:var(--black)}\n' +
      '.info-table{width:100%;border-collapse:collapse;margin-bottom:12px}\n' +
      '.info-table td{font-size:14px;font-weight:300;color:var(--dim);padding:10px 0;border-bottom:1px solid var(--line);vertical-align:top;line-height:1.65}\n' +
      '.info-table td:first-child{width:180px;font-weight:400;color:var(--black)}\n' +
      '.info-table tr:last-child td{border-bottom:none}\n' +
      'footer{background:var(--black);padding:32px 80px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}\n' +
      '.footer-copy{font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:0.06em}\n' +
      '.footer-link{font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:0.06em;text-decoration:none}\n' +
      '.footer-link:hover{color:rgba(255,255,255,0.5)}\n' +
      '@media(max-width:768px){nav{padding:16px 24px}.page-header{padding:48px 24px 36px}.content{padding:40px 24px 72px}footer{padding:20px 24px}}\n' +
      '</style></head><body>\n' +
      '<nav><a href="/' + slug + '/" class="nav-logo">' + esc(businessName) + '</a><a href="/' + slug + '/" class="back-link">← Zurück</a></nav>\n' +
      '<div class="page-header"><div class="page-tag">Rechtliches</div><h1 class="page-title">Impressum</h1></div>\n' +
      '<div class="content">\n' +
      '<h2>Angaben gemäß § 5 ECG</h2>\n' +
      '<table class="info-table"><tbody>' + tableRows + '</tbody></table>\n' +
      '<h2>Urheberrecht</h2>\n' +
      '<p>Die auf dieser Website veröffentlichten Inhalte unterliegen dem österreichischen Urheberrecht. Jede Vervielfältigung oder Verbreitung bedarf der schriftlichen Zustimmung des jeweiligen Urhebers.</p>\n' +
      '<h2>Haftungsausschluss</h2>\n' +
      '<p>Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte übernehmen wir keine Gewähr.</p>\n' +
      '</div>\n' +
      '<footer><span class="footer-copy">© ' + new Date().getFullYear() + ' ' + esc(businessName) + '</span>' +
      '<div style="display:flex;gap:16px"><span class="footer-copy">Impressum</span><a href="/' + slug + '/datenschutz/" class="footer-link">Datenschutz</a></div>' +
      '<span class="footer-copy">' + esc(address) + '</span></footer>\n' +
      '</body></html>\n';
  }

  function generateDatenschutzHtml(slug, order) {
    var businessName = order.business_name || '';
    var isEU = (order.legal_type || 'einzelunternehmer') === 'einzelunternehmer';
    var legalName = order.legal_name || '';
    var address = order.address || '';
    var phone = order.phone || '';
    var email = order.email || '';
    var legalId = isEU ? '' : ((order.fn_number ? 'FN ' + order.fn_number + ' · ' : '') + (order.uid_number ? order.uid_number : ''));
    var hasReservation = !!(order.notes && order.notes.toLowerCase().includes('reserv'));

    var verantwortlicher = isEU
      ? esc(legalName) + ' (Betrieb: ' + esc(businessName) + ')'
      : esc(order.legal_name || businessName) + (order.legal_form ? ' (' + esc(order.legal_form) + ')' : '') + '<br>(Betrieb: ' + esc(businessName) + ')';

    var thirdParties =
      (hasReservation
        ? '<div class="service-block"><div class="service-name">Formspree.io (USA)</div>' +
          '<div class="service-desc">Reservierungsanfragen werden über Formspree weitergeleitet. Angemessenes Schutzniveau durch EU-Standardvertragsklauseln (SCCs).<br>' +
          '<a href="https://formspree.io/legal/privacy-policy" target="_blank" rel="noopener">Datenschutzerklärung Formspree →</a></div></div>'
        : '') +
      '<div class="service-block"><div class="service-name">Supabase (EU-Rechenzentren)</div>' +
      '<div class="service-desc">Bewertungen werden in der Supabase-Datenbank gespeichert. Die Daten liegen auf Servern innerhalb der EU.<br>' +
      '<a href="https://supabase.com/privacy" target="_blank" rel="noopener">Datenschutzerklärung Supabase →</a></div></div>' +
      '<div class="service-block"><div class="service-name">Google Fonts (USA)</div>' +
      '<div class="service-desc">Beim Seitenaufruf wird eine Verbindung zu Google-Servern aufgebaut und Ihre IP-Adresse übertragen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.<br>' +
      '<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Datenschutzerklärung Google →</a></div></div>' +
      '<div class="service-block"><div class="service-name">OpenStreetMap</div>' +
      '<div class="service-desc">Die eingebettete Karte lädt Kartendaten von openstreetmap.org. Dabei wird Ihre IP-Adresse an die OpenStreetMap Foundation übertragen.<br>' +
      '<a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener">Datenschutzerklärung OpenStreetMap →</a></div></div>';

    return '<!DOCTYPE html>\n<html lang="de">\n<head>\n' +
      '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<title>Datenschutz — ' + esc(businessName) + '</title>\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
      '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">\n' +
      '<style>\n*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}\n' +
      ':root{--black:#111110;--white:#F8F7F4;--warm:#EDEAE4;--mid:#9B9893;--dim:#5C5A57;--line:#DDDAD4}\n' +
      'body{font-family:"DM Sans",sans-serif;background:var(--white);color:var(--black)}\n' +
      'nav{padding:20px 48px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}\n' +
      '.nav-logo{font-family:"DM Serif Display",serif;font-size:20px;color:var(--black);text-decoration:none}\n' +
      '.back-link{font-size:12px;color:var(--mid);text-decoration:none;letter-spacing:0.1em}\n' +
      '.back-link:hover{color:var(--black)}\n' +
      '.page-header{background:var(--black);padding:64px 80px 48px}\n' +
      '.page-tag{font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:16px}\n' +
      '.page-title{font-family:"DM Serif Display",serif;font-size:clamp(32px,4vw,54px);color:#fff;line-height:1.1}\n' +
      '.content{max-width:720px;margin:0 auto;padding:64px 48px 96px}\n' +
      '.content h2{font-family:"DM Serif Display",serif;font-size:22px;font-weight:400;margin:48px 0 16px;padding-top:48px;border-top:1px solid var(--line)}\n' +
      '.content h2:first-of-type{margin-top:0;padding-top:0;border-top:none}\n' +
      '.content p{font-size:14px;font-weight:300;line-height:1.9;color:var(--dim);margin-bottom:12px}\n' +
      '.content ul{margin:8px 0 16px;padding-left:0;list-style:none}\n' +
      '.content ul li{font-size:14px;font-weight:300;line-height:1.9;color:var(--dim);padding:3px 0 3px 18px;position:relative}\n' +
      '.content ul li::before{content:"—";position:absolute;left:0;color:var(--mid)}\n' +
      '.content a{color:var(--black)}\n' +
      '.contact-box{background:var(--warm);border:1px solid var(--line);border-radius:4px;padding:20px 24px;margin:16px 0}\n' +
      '.contact-box p{margin-bottom:0}\n' +
      '.service-block{border:1px solid var(--line);border-radius:4px;padding:20px 24px;margin:16px 0}\n' +
      '.service-name{font-size:13px;font-weight:500;color:var(--black);margin-bottom:6px}\n' +
      '.service-desc{font-size:13px;font-weight:300;color:var(--dim);line-height:1.75}\n' +
      '.rights-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);margin:16px 0}\n' +
      '.rights-item{background:var(--white);padding:16px 20px}\n' +
      '.rights-art{font-size:10px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--mid);margin-bottom:4px}\n' +
      '.rights-label{font-size:14px;font-weight:300;color:var(--dim)}\n' +
      'footer{background:var(--black);padding:32px 80px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}\n' +
      '.footer-copy{font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:0.06em}\n' +
      '.footer-link{font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:0.06em;text-decoration:none}\n' +
      '.footer-link:hover{color:rgba(255,255,255,0.5)}\n' +
      '@media(max-width:768px){nav{padding:16px 24px}.page-header{padding:48px 24px 36px}.content{padding:40px 24px 72px}footer{padding:20px 24px}.rights-grid{grid-template-columns:1fr}}\n' +
      '</style></head><body>\n' +
      '<nav><a href="/' + slug + '/" class="nav-logo">' + esc(businessName) + '</a><a href="/' + slug + '/" class="back-link">← Zurück</a></nav>\n' +
      '<div class="page-header"><div class="page-tag">Rechtliches</div><h1 class="page-title">Datenschutz&shy;erklärung</h1></div>\n' +
      '<div class="content">\n' +
      '<h2>1. Verantwortlicher</h2>\n' +
      '<div class="contact-box"><p><strong>' + verantwortlicher + '</strong><br>' +
      esc(address) + '<br><a href="tel:' + esc(phone.replace(/\s/g,'')) + '">' + esc(phone) + '</a>' +
      (email ? ' · <a href="mailto:' + esc(email) + '">' + esc(email) + '</a>' : '') +
      (legalId ? '<br>' + esc(legalId) : '') +
      (isEU ? '' : (order.geschaeftsfuehrer ? '<br>Geschäftsführer/in: ' + esc(order.geschaeftsfuehrer) : '')) +
      '</p></div>\n' +
      '<h2>2. Welche Daten wir verarbeiten</h2>\n' +
      '<p><strong>Bewertungen:</strong> Wenn Sie freiwillig eine Bewertung hinterlassen, speichern wir Ihren Namen, den Bewertungstext, die Sternebewertung und das angegebene Datum.</p>\n' +
      '<p>Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch aktives Absenden).</p>\n' +
      '<h2>3. Drittanbieter</h2>\n' + thirdParties + '\n' +
      '<h2>4. Cookies &amp; Tracking</h2>\n' +
      '<p>Diese Website verwendet <strong>keine Tracking-Cookies und keine Werbecookies</strong>.</p>\n' +
      '<p>Die von Ihnen gewählte Spracheinstellung wird lokal in Ihrem Browser gespeichert (<code>localStorage</code>). Diese Daten verbleiben auf Ihrem Gerät und werden nicht übertragen.</p>\n' +
      '<h2>5. Speicherdauer</h2>\n' +
      '<ul><li>Bewertungen: unbegrenzt bis zu einer Löschanfrage</li><li>Spracheinstellung (localStorage): bis zur manuellen Löschung im Browser</li></ul>\n' +
      '<h2>6. Ihre Rechte (DSGVO Art. 15–21)</h2>\n' +
      '<div class="rights-grid">' +
      '<div class="rights-item"><div class="rights-art">Art. 15</div><div class="rights-label">Auskunft über gespeicherte Daten</div></div>' +
      '<div class="rights-item"><div class="rights-art">Art. 16</div><div class="rights-label">Berichtigung unrichtiger Daten</div></div>' +
      '<div class="rights-item"><div class="rights-art">Art. 17</div><div class="rights-label">Löschung</div></div>' +
      '<div class="rights-item"><div class="rights-art">Art. 18</div><div class="rights-label">Einschränkung der Verarbeitung</div></div>' +
      '<div class="rights-item"><div class="rights-art">Art. 20</div><div class="rights-label">Datenübertragbarkeit</div></div>' +
      '<div class="rights-item"><div class="rights-art">Art. 21</div><div class="rights-label">Widerspruch gegen die Verarbeitung</div></div>' +
      '</div>\n' +
      '<p>Zur Ausübung Ihrer Rechte: <a href="mailto:' + esc(email) + '">' + esc(email) + '</a></p>\n' +
      '<h2>7. Beschwerderecht</h2>\n' +
      '<div class="contact-box"><p><strong>Österreichische Datenschutzbehörde</strong><br>Barichgasse 40–42, 1030 Wien<br><a href="https://www.dsb.gv.at" target="_blank" rel="noopener">dsb.gv.at</a></p></div>\n' +
      '</div>\n' +
      '<footer><span class="footer-copy">© ' + new Date().getFullYear() + ' ' + esc(businessName) + '</span>' +
      '<div style="display:flex;gap:16px"><a href="/' + slug + '/impressum/" class="footer-link">Impressum</a><span class="footer-copy">Datenschutz</span></div>' +
      '<span class="footer-copy">' + esc(address) + '</span></footer>\n' +
      '</body></html>\n';
  }

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  async function uploadFile(path, content, rawBase64) {
    var session = (await sb.auth.getSession()).data.session;
    var token = session ? session.access_token : '';
    var encoded = rawBase64 || btoa(unescape(encodeURIComponent(content)));
    var res = await fetch(EDGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action: 'put-file', path: path, content: encoded, message: 'Generate site: ' + path })
    });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Upload failed');
  }

  // ── File Editor ───────────────────────────────────────────────────
  var editingSlug = null;

  async function loadEditorFile() {
    var file = document.getElementById('fileEditorSelect').value;
    var errEl = document.getElementById('fileEditorError');
    var contentEl = document.getElementById('fileEditorContent');
    var infoEl = document.getElementById('fileEditorInfo');
    errEl.style.display = 'none';
    contentEl.value = '⏳ Lade…';
    infoEl.textContent = 'web.lokalonline.at/' + editingSlug + '/' + file;

    try {
      var session = (await sb.auth.getSession()).data.session;
      var token = session ? session.access_token : '';
      var res = await fetch(EDGE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ action: 'get-file', path: editingSlug + '/' + file })
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

  function openFileEditor(slug) {
    editingSlug = slug;
    document.getElementById('fileEditorSelect').value = 'data.js';
    openModal('fileEditorOverlay');
    loadEditorFile();
  }

  document.getElementById('fileEditorSelect').addEventListener('change', function () {
    if (editingSlug) loadEditorFile();
  });

  document.getElementById('fileEditorSave').addEventListener('click', async function () {
    if (!editingSlug) return;
    var file = document.getElementById('fileEditorSelect').value;
    var content = document.getElementById('fileEditorContent').value;
    var errEl = document.getElementById('fileEditorError');
    var btn = document.getElementById('fileEditorSave');
    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = '⏳ Speichert…';

    try {
      await uploadFile(editingSlug + '/' + file, content);
      closeModal('fileEditorOverlay');
      showToast('✅ ' + file + ' gespeichert!');
    } catch (e) {
      errEl.textContent = 'Fehler: ' + e.message;
      errEl.style.display = 'block';
    }
    btn.disabled = false; btn.textContent = '💾 Speichern & deployen';
  });

  // ── Link Editor (Linkseite ohne Code bearbeiten) ──────────────────
  var linkEditorSlug = null;
  var linkEditorHtml = '';
  var linkEditorLinks = [];

  async function openLinkEditor(slug) {
    linkEditorSlug = slug;
    linkEditorHtml = '';
    linkEditorLinks = [];
    var errEl = document.getElementById('linkEditorError');
    var rowsEl = document.getElementById('linkEditorRows');
    var infoEl = document.getElementById('linkEditorInfo');
    errEl.style.display = 'none';
    rowsEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px">⏳ Lade…</div>';
    infoEl.textContent = 'web.lokalonline.at/' + slug + '/link/';
    openModal('linkEditorOverlay');

    try {
      var session = (await sb.auth.getSession()).data.session;
      var token = session ? session.access_token : '';
      var res = await fetch(EDGE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ action: 'get-file', path: slug + '/link/index.html' })
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      linkEditorHtml = data.content;

      var doc = new DOMParser().parseFromString(linkEditorHtml, 'text/html');
      var anchors = doc.querySelectorAll('a.link-btn');
      anchors.forEach(function (a) {
        var labelEl = a.querySelector('.label');
        linkEditorLinks.push({
          label: labelEl ? labelEl.textContent.trim() : a.textContent.trim(),
          href: a.getAttribute('href') || ''
        });
      });

      if (linkEditorLinks.length === 0) {
        rowsEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Keine Links gefunden (a.link-btn).</div>';
        return;
      }

      rowsEl.innerHTML = linkEditorLinks.map(function (l, i) {
        return '<div style="margin-bottom:14px">' +
          '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">' + esc(l.label) + '</label>' +
          '<input type="text" class="link-editor-input" data-idx="' + i + '" value="' + esc(l.href) + '"' +
          ' style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:monospace;outline:none" />' +
          '</div>';
      }).join('');
    } catch (e) {
      rowsEl.innerHTML = '';
      errEl.textContent = 'Fehler beim Laden: ' + e.message;
      errEl.style.display = 'block';
    }
  }

  document.getElementById('linkEditorSave').addEventListener('click', async function () {
    if (!linkEditorSlug || !linkEditorHtml) return;
    var errEl = document.getElementById('linkEditorError');
    var btn = document.getElementById('linkEditorSave');
    errEl.style.display = 'none';

    var inputs = document.querySelectorAll('.link-editor-input');
    var html = linkEditorHtml;
    var changed = false;

    for (var i = 0; i < inputs.length; i++) {
      var idx = parseInt(inputs[i].getAttribute('data-idx'), 10);
      var oldHref = linkEditorLinks[idx].href;
      var newHref = inputs[i].value.trim();
      if (newHref === oldHref) continue;
      if (!/^(https?:\/\/|mailto:|tel:|\/)/.test(newHref)) {
        errEl.textContent = 'Ungültige URL bei "' + linkEditorLinks[idx].label + '" — muss mit https://, mailto:, tel: oder / beginnen.';
        errEl.style.display = 'block';
        return;
      }
      var oldAttr = 'href="' + oldHref + '"';
      var newAttr = 'href="' + newHref.replace(/"/g, '%22') + '"';
      if (html.indexOf(oldAttr) === -1) {
        // DOMParser decodes entities — try the HTML-encoded variant (& → &amp;)
        oldAttr = 'href="' + oldHref.replace(/&/g, '&amp;') + '"';
      }
      if (html.indexOf(oldAttr) === -1) {
        errEl.textContent = 'Link "' + linkEditorLinks[idx].label + '" nicht gefunden — bitte Datei-Editor verwenden.';
        errEl.style.display = 'block';
        return;
      }
      html = html.replace(oldAttr, newAttr);
      changed = true;
    }

    if (!changed) { closeModal('linkEditorOverlay'); return; }

    btn.disabled = true; btn.textContent = '⏳ Speichert…';
    try {
      await uploadFile(linkEditorSlug + '/link/index.html', html);
      closeModal('linkEditorOverlay');
      showToast('✅ Linkseite gespeichert!');
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

    // Nur die Titelbilder als slide1..N (deckungsgleich mit generateDataJs).
    var pc = classifyPhotos(order);
    for (var i = 0; i < pc.slideUrls.length && i < 3; i++) {
      await copyOne(pc.slideUrls[i], slug + '/img/slide' + (i + 1) + '.jpg');
    }
  }

  function generateMenuDataJs(type, slug, order) {
    // Strukturierte Speisekarte aus dem Bestellformular (OCR oder manuell).
    var items = [];
    if (order.menu_items) { try { items = JSON.parse(order.menu_items); } catch(e) {} }
    if (!Array.isArray(items)) items = [];
    // Fallback: altes services-Feld
    if (items.length === 0 && order.services) {
      try { items = JSON.parse(order.services); } catch(e) {}
    }

    var categories = [];
    if (items.length > 0) {
      // Optional nach item.category gruppieren, sonst eine Kategorie.
      var byCat = {};
      var order_ = [];
      items.forEach(function (it) {
        var cat = (it.category || '').trim() || '__';
        if (!byCat[cat]) { byCat[cat] = []; order_.push(cat); }
        byCat[cat].push({
          name: { de: it.name || '', en: it.name || '' },
          desc: { de: it.desc || it.description || '', en: it.desc || it.description || '' },
          price: it.price || ''
        });
      });
      categories = order_.map(function (cat) {
        return { name: cat === '__' ? { de: 'Speisekarte', en: 'Menu' } : { de: cat, en: cat }, items: byCat[cat] };
      });
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
    links.push({ icon: '🌐', label: 'Website', url: 'https://web.lokalonline.at/' + slug + '/' });
    links.push({ icon: '📋', label: 'Speisekarte / Leistungen', url: 'https://web.lokalonline.at/' + slug + '/menu/' });
    if (phone) links.push({ icon: '📞', label: phone, url: 'tel:' + phone.replace(/\s/g,'') });
    if (instagram) links.push({ icon: '📸', label: '@' + instagram, url: 'https://instagram.com/' + instagram });
    if (address) links.push({ icon: '📍', label: address, url: mapsUrl });

    var linksHtml = links.map(function(l) {
      return '<a href="' + l.url + '" class="link-btn" target="_blank"><span class="link-icon">' + l.icon + '</span><span>' + l.label + '</span></a>';
    }).join('\n      ');

    return '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + name + '</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0}\nbody{min-height:100vh;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:24px}\n.card{width:100%;max-width:400px}\n.logo{width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 16px;display:block;background:#222}\n.name{color:#fff;font-size:22px;font-weight:700;text-align:center;margin-bottom:4px}\n.sub{color:rgba(255,255,255,.45);font-size:14px;text-align:center;margin-bottom:32px}\n.link-btn{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;text-decoration:none;padding:16px 20px;border-radius:12px;margin-bottom:10px;font-size:15px;transition:background .2s,border-color .2s}\n.link-btn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.25)}\n.link-icon{font-size:20px;flex-shrink:0;width:28px;text-align:center}\n.footer{text-align:center;margin-top:28px;font-size:11px;color:rgba(255,255,255,.2)}\n</style>\n</head>\n<body>\n<div class="card">\n  <img class="logo" src="img/logo.png" onerror="this.style.display=\'none\'">\n  <div class="name">' + name + '</div>\n  <div class="sub" id="subtext">Wien</div>\n  <div id="links">\n      ' + linksHtml + '\n  </div>\n  <div class="footer">lokalonline.at</div>\n</div>\n<script>\nvar d=document.getElementById("subtext");\nif(d&&"' + address + '")d.textContent="' + address + '";\n<\/script>\n</body>\n</html>\n';
  }

  async function generateQrCode(slug) {
    var menuUrl = 'https://web.lokalonline.at/' + slug + '/menu/';
    var apiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=' + encodeURIComponent(menuUrl);
    var imgRes = await fetch(apiUrl);
    if (!imgRes.ok) throw new Error('QR-API nicht erreichbar (' + imgRes.status + ')');
    var buffer = await imgRes.arrayBuffer();
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    var base64 = btoa(binary);
    await uploadFile(slug + '/img/qr-menu.png', null, base64);
  }

  function showQrResult(slug) {
    var menuUrl = 'https://web.lokalonline.at/' + slug + '/menu/';

    var linksEl = document.getElementById('qrResultLinks');
    linksEl.innerHTML = [
      { label: '🌐 Website', url: 'https://web.lokalonline.at/' + slug + '/' },
      { label: '📋 Menü', url: menuUrl },
      { label: '🔗 Link Page', url: 'https://web.lokalonline.at/' + slug + '/link/' }
    ].map(function(l) {
      return '<a href="' + l.url + '" target="_blank" class="btn btn-outline btn-sm">' + l.label + '</a>';
    }).join('');

    document.getElementById('qrCodeUrl').textContent = menuUrl;

    // Render QR via API
    var qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=' + encodeURIComponent(menuUrl);
    document.getElementById('qrCodeImg').src = qrApiUrl;
    document.getElementById('qrDownloadBtn').href = qrApiUrl;

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
      btn.textContent = '⏳ 2/7 Menüseite…';
      var menuRes = await fetch('/templates/' + selectedTemplate + '/menu/index.html');
      if (menuRes.ok) {
        var menuHtml = await menuRes.text();
        var menuDataJs = generateMenuDataJs(selectedTemplate, slug, currentOrderData);
        await uploadFile(slug + '/menu/index.html', menuHtml);
        await uploadFile(slug + '/menu/menu-data.js', menuDataJs);
      }

      // 3. Link page
      btn.textContent = '⏳ 3/7 Link-Seite…';
      var linkHtml = generateLinkPageHtml(slug, currentOrderData);
      await uploadFile(slug + '/link/index.html', linkHtml);

      // 4. Impressum
      btn.textContent = '⏳ 4/7 Impressum…';
      await uploadFile(slug + '/impressum/index.html', generateImpressumHtml(slug, currentOrderData));

      // 5. Datenschutz
      btn.textContent = '⏳ 5/7 Datenschutz…';
      await uploadFile(slug + '/datenschutz/index.html', generateDatenschutzHtml(slug, currentOrderData));

      // 6. Photos + QR code
      btn.textContent = '⏳ 6/7 Fotos & QR…';
      await copyPhotosToGitHub(slug, currentOrderData);
      var qrErr = null;
      try { await generateQrCode(slug); } catch(e) { qrErr = e.message; }

      // 7. Save to DB
      btn.textContent = '⏳ 7/7 Speichert…';
      await sb.from('orders').update({
        site_slug: slug,
        admin_notes: (currentOrderData.admin_notes ? currentOrderData.admin_notes + '\n' : '') + 'Site: web.lokalonline.at/' + slug + '/'
      }).eq('id', currentOrderData.id);

      currentOrderData.site_slug = slug;
      document.getElementById('orderSiteSlug').value = slug;
      document.getElementById('editSiteBtn').style.display = 'inline-flex';
      document.getElementById('editLinksBtn').style.display = 'inline-flex';
      document.getElementById('previewSiteBtn').style.display = 'inline-flex';
      document.getElementById('generateSiteBtn').textContent = '🔄 Neu generieren';

      closeModal('siteGenOverlay');
      showQrResult(slug);
      if (qrErr) showToast('⚠️ QR-Code: ' + qrErr);

    } catch (e) {
      var step = btn.textContent.replace('⏳ ', '');
      errEl.textContent = 'Fehler bei [' + step + ']: ' + (e && e.message ? e.message : String(e));
      errEl.style.display = 'block';
      console.error('doGenerateSite error:', step, e);
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
