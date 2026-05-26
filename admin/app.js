(function () {
  'use strict';

  var SUPABASE_URL = 'https://vhnourjddnlslgabrasb.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_y5l1cAZXoAj8xaSVXUkBfw_Pk9pxb6H';
  var ADMIN_EMAIL = 'snowsiro@gmail.com';
  var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  var currentInquiryId = null;
  var currentOrderId = null;
  var inquiryFilter = 'all';
  var requestFilter = 'all';
  var signupFilter = 'all';
  var reviewFilter = 'all';
  var orderFilter = 'all';

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
    bindFilters();
    bindModals();
    bindClientForm();
    bindInquiryForm();
    bindRequestFilters();
    bindSignupFilters();
    bindReviewFilters();
    bindOrderFilters();
    bindOrderForm();
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

  function bindRequestFilters() {
    document.querySelectorAll('[data-req-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-req-status]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        requestFilter = btn.getAttribute('data-req-status');
        loadRequests();
      });
    });
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

  function bindSignupFilters() {
    document.querySelectorAll('[data-signup-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-signup-status]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        signupFilter = btn.getAttribute('data-signup-status');
        loadSignups();
      });
    });
  }

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

  function bindReviewFilters() {
    document.querySelectorAll('[data-review-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-review-status]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        reviewFilter = btn.getAttribute('data-review-status');
        loadReviews();
      });
    });
  }

  // ── Orders ────────────────────────────────────────────────────────
  async function loadOrders() {
    var query = sb.from('orders').select('*').order('created_at', { ascending: false });
    if (orderFilter !== 'all') query = query.eq('payment_status', orderFilter);

    var { data } = await query;
    var tbody = document.getElementById('ordersBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">주문 없음</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(function (o) {
      return '<tr>' +
        '<td>' + formatDate(o.created_at) + '</td>' +
        '<td><strong>' + esc(o.business_name) + '</strong></td>' +
        '<td>' + (o.business_type ? esc(o.business_type) : '—') + '</td>' +
        '<td><a href="mailto:' + esc(o.email) + '" style="color:var(--primary)">' + esc(o.email) + '</a></td>' +
        '<td>' + (o.phone ? esc(o.phone) : '—') + '</td>' +
        '<td>' + orderStatusBadge(o.payment_status) + '</td>' +
        '<td><button class="btn btn-outline btn-sm" onclick="openOrder(\'' + o.id + '\')">상세</button></td>' +
        '</tr>';
    }).join('');
  }

  function orderStatusBadge(status) {
    var map = { pending: 'badge-new', paid: 'badge-contacted', in_progress: 'badge-contacted', done: 'badge-active' };
    var labels = { pending: '결제대기', paid: '결제완료', in_progress: '작업중', done: '완료' };
    return '<span class="badge ' + (map[status] || 'badge-new') + '">' + (labels[status] || status) + '</span>';
  }

  window.openOrder = async function (id) {
    currentOrderId = id;
    var { data } = await sb.from('orders').select('*').eq('id', id).single();
    if (!data) return;

    var infoGrid = document.getElementById('orderInfo');
    infoGrid.innerHTML =
      infoItem('업장명', esc(data.business_name)) +
      infoItem('업종', data.business_type || '—') +
      infoItem('주소', data.address || '—') +
      infoItem('전화', data.phone || '—') +
      infoItem('이메일', '<a href="mailto:' + esc(data.email) + '" style="color:var(--primary)">' + esc(data.email) + '</a>') +
      infoItem('인스타그램', data.instagram || '—') +
      infoItem('영업시간', data.hours ? '<pre style="font-size:12px;white-space:pre-wrap">' + esc(data.hours) + '</pre>' : '—') +
      infoItem('요청사항', data.notes || '—') +
      infoItem('접수일', formatDate(data.created_at));

    var filesWrap = document.getElementById('orderFilesWrap');
    var filesEl = document.getElementById('orderFiles');
    filesEl.innerHTML = '';
    var hasFiles = false;
    if (data.logo_url) {
      hasFiles = true;
      filesEl.innerHTML += '<a href="' + esc(data.logo_url) + '" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:4px;text-decoration:none">' +
        '<img src="' + esc(data.logo_url) + '" style="width:80px;height:80px;object-fit:contain;border:1px solid var(--border);border-radius:8px;background:#f8fafc" />' +
        '<span style="font-size:11px;color:var(--text-muted)">로고</span></a>';
    }
    if (data.photo_url) {
      hasFiles = true;
      filesEl.innerHTML += '<a href="' + esc(data.photo_url) + '" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:4px;text-decoration:none">' +
        '<img src="' + esc(data.photo_url) + '" style="width:80px;height:80px;object-fit:cover;border:1px solid var(--border);border-radius:8px" />' +
        '<span style="font-size:11px;color:var(--text-muted)">대표사진</span></a>';
    }
    filesWrap.style.display = hasFiles ? 'block' : 'none';

    document.getElementById('orderStatus').value = data.payment_status || 'pending';
    document.getElementById('orderNotes').value = data.admin_notes || '';
    openModal('orderOverlay');
  };

  function bindOrderForm() {
    document.getElementById('saveOrderBtn').addEventListener('click', async function () {
      if (!currentOrderId) return;
      var { error } = await sb.from('orders').update({
        payment_status: document.getElementById('orderStatus').value,
        admin_notes: document.getElementById('orderNotes').value
      }).eq('id', currentOrderId);
      if (!error) {
        closeModal('orderOverlay');
        showToast('저장되었습니다');
        loadOrders();
        loadStats();
      }
    });

    document.getElementById('deleteOrderBtn').addEventListener('click', async function () {
      if (!currentOrderId) return;
      if (!confirm('주문을 삭제할까요?')) return;
      await sb.from('orders').delete().eq('id', currentOrderId);
      closeModal('orderOverlay');
      showToast('삭제되었습니다');
      loadOrders();
      loadStats();
    });
  }

  function bindOrderFilters() {
    document.querySelectorAll('[data-order-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-order-status]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        orderFilter = btn.getAttribute('data-order-status');
        loadOrders();
      });
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
      });
    });
  }

  // ── Filters ───────────────────────────────────────────────────────
  function bindFilters() {
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        inquiryFilter = btn.getAttribute('data-status');
        loadInquiries();
      });
    });
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
