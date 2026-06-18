(function () {
  'use strict';

  var sb = supabase.createClient(
    'https://vhnourjddnlslgabrasb.supabase.co',
    'sb_publishable_y5l1cAZXoAj8xaSVXUkBfw_Pk9pxb6H'
  );

  var STRIPE_LINKS = (window.STRIPE_CONFIG && window.STRIPE_CONFIG.links) || {};

  var ADMIN_EMAIL = 'info@lokalonline.at';
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
      // Check if they have an order (pre-payment customer)
      var { data: order } = await sb
        .from('orders')
        .select('*')
        .eq('email', userEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (order) {
        // Pre-payment: show order status + messaging
        prePaymentView(order);
        return;
      }

      // No client and no order — account not set up yet
      document.getElementById('heroTitle').textContent = 'Willkommen!';
      document.getElementById('heroSub').textContent = 'Ihr Konto wird eingerichtet.';
      content.innerHTML =
        '<div class="not-found">' +
        '<h2>Ihr Konto wird noch eingerichtet</h2>' +
        '<p>Wir bereiten Ihren Bereich vor. Sie erhalten eine Benachrichtigung, sobald alles bereit ist.</p>' +
        '<p style="margin-top:8px"><a href="mailto:info@lokalonline.at" style="color:var(--primary)">info@lokalonline.at</a></p>' +
        '</div>';
      return;
    }

    // 환영 헤더
    document.getElementById('heroTitle').textContent = 'Willkommen, ' + client.business_name + '!';
    document.getElementById('heroSub').textContent = 'Hier verwalten Sie Ihren Auftrag bei lokalonline.at';

    // 구독 정보 카드
    var planLabels = { flat: 'Premium', basis: 'Premium', standard: 'Premium', premium: 'Premium' };
    var billingLabels = { monthly: 'Monatlich', yearly: 'Jährlich' };
    var statusLabels = { active: '✓ Aktiv', inactive: 'Inaktiv', cancelled: 'Gekündigt' };

    var infoCard =
      '<div class="info-card">' +
      '<h2>Ihr Abonnement</h2>' +
      '<div class="info-grid-2">' +
      infoField('Plan', '<span class="plan-tag">' + esc(planLabels[client.plan] || client.plan) + '</span>') +
      infoField('Status', '<span class="badge badge-' + esc(client.status) + '">' + esc(statusLabels[client.status] || client.status) + '</span>') +
      infoField('Abrechnung', esc(billingLabels[client.billing_cycle] || client.billing_cycle)) +
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

    // 후기 관리 카드
    var reviewCard = await buildReviewCard(client);

    // Messaging card for full clients
    var msgCard =
      '<div class="info-card" id="msgCard">' +
      '<h2>💬 Nachrichten <span id="msgUnreadBadge" class="badge-count" style="display:none"></span></h2>' +
      '<div id="portalMsgThread" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px;padding:4px 0"></div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<label for="portalMsgFile" style="cursor:pointer;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--border);border-radius:8px;font-size:18px;flex-shrink:0;color:var(--text-muted)">+</label>' +
      '<input type="file" id="portalMsgFile" accept="image/*,application/pdf" style="display:none" />' +
      '<input type="text" id="portalMsgInput" placeholder="Nachricht schreiben…" style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;outline:none" />' +
      '<button class="btn btn-primary" id="portalMsgSend">Senden</button>' +
      '</div></div>';

    // Find the most recent order for this client (for messaging)
    var { data: clientOrder } = await sb
      .from('orders')
      .select('id')
      .eq('email', userEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    content.innerHTML = infoCard + requestForm + historyCard + reviewCard + (clientOrder ? msgCard : '');

    if (clientOrder) {
      bindPortalMsg(clientOrder.id, 'client');
    }

    // 후기 삭제 이벤트
    content.querySelectorAll('.delete-review-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.getAttribute('data-id');
        if (!confirm('Bewertung wirklich löschen?')) return;
        var { error } = await sb.from('reviews').delete().eq('id', id);
        if (!error) { showToast('Gelöscht'); init(); }
        else showToast('Fehler beim Löschen.');
      });
    });

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

  // ── Pre-payment view ─────────────────────────────────────────────
  async function prePaymentView(order) {
    var statusMap = {
      pending: { label: 'Anfrage erhalten', desc: 'Wir erstellen Ihren kostenlosen Prototyp.', color: '#f59e0b' },
      paid: { label: 'Zahlung eingegangen', desc: 'Ihre Website wird jetzt erstellt.', color: '#3b82f6' },
      in_progress: { label: 'In Bearbeitung', desc: 'Wir arbeiten an Ihrer Website.', color: '#8b5cf6' },
      done: { label: 'Abgeschlossen', desc: 'Ihre Website ist fertig.', color: '#16a34a' }
    };
    var st = statusMap[order.payment_status] || statusMap.pending;

    document.getElementById('heroTitle').textContent = 'Willkommen, ' + order.business_name + '!';
    document.getElementById('heroSub').textContent = 'Hier können Sie den Status Ihrer Anfrage verfolgen.';

    var content = document.getElementById('portalContent');
    content.innerHTML =
      '<div class="info-card">' +
      '<h2>Status Ihrer Anfrage</h2>' +
      '<div style="display:flex;align-items:center;gap:12px;padding:12px 0">' +
      '<div style="width:12px;height:12px;border-radius:50%;background:' + st.color + ';flex-shrink:0"></div>' +
      '<div><div style="font-weight:700;font-size:15px">' + st.label + '</div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-top:2px">' + st.desc + '</div></div>' +
      '</div></div>' +
      '<div class="info-card" id="msgCard">' +
      '<h2>💬 Nachrichten <span id="msgUnreadBadge" class="badge-count" style="display:none"></span></h2>' +
      '<div id="portalMsgThread" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px;padding:4px 0"></div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<label for="portalMsgFile" style="cursor:pointer;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--border);border-radius:8px;font-size:18px;flex-shrink:0;color:var(--text-muted)">+</label>' +
      '<input type="file" id="portalMsgFile" accept="image/*,application/pdf" style="display:none" />' +
      '<input type="text" id="portalMsgInput" placeholder="Nachricht schreiben…" style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;outline:none" />' +
      '<button class="btn btn-primary" id="portalMsgSend">Senden</button>' +
      '</div></div>';

    bindPortalMsg(order.id, 'client');
  }

  // ── Portal messaging ──────────────────────────────────────────────
  var portalMsgChannel = null;

  function bindPortalMsg(orderId, senderType) {
    loadPortalMessages(orderId, senderType);

    var sendBtn = document.getElementById('portalMsgSend');
    var msgInput = document.getElementById('portalMsgInput');
    if (!sendBtn || !msgInput) return;

    async function sendPortalMsg(attachmentUrl, attachmentName) {
      var text = msgInput.value.trim();
      if (!text && !attachmentUrl) return;
      msgInput.value = '';
      await sb.from('messages').insert([{
        order_id: orderId,
        sender_type: senderType,
        sender_name: userEmail,
        content: text || '',
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null
      }]);
      loadPortalMessages(orderId, senderType);
    }

    sendBtn.addEventListener('click', function() { sendPortalMsg(); });
    msgInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') sendPortalMsg();
    });

    var fileInput = document.getElementById('portalMsgFile');
    if (fileInput) {
      fileInput.addEventListener('change', async function() {
        var file = this.files[0];
        if (!file) return;
        sendBtn.disabled = true; sendBtn.textContent = '⏳';
        try {
          var ext = file.name.split('.').pop();
          var path = 'chat/' + orderId + '/' + Date.now() + '.' + ext;
          var { error } = await sb.storage.from('uploads').upload(path, file, { upsert: true });
          if (error) throw error;
          var { data: urlData } = sb.storage.from('uploads').getPublicUrl(path);
          await sendPortalMsg(urlData.publicUrl, file.name);
        } catch(e) { showToast('Upload fehlgeschlagen: ' + e.message); }
        sendBtn.disabled = false; sendBtn.textContent = 'Senden';
        this.value = '';
      });
    }

    // Realtime subscription
    if (portalMsgChannel) {
      portalMsgChannel.unsubscribe();
    }
    portalMsgChannel = sb.channel('messages:' + orderId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'order_id=eq.' + orderId
      }, function() {
        loadPortalMessages(orderId, senderType);
      })
      .subscribe();
  }

  window.addEventListener('beforeunload', function() {
    if (portalMsgChannel) portalMsgChannel.unsubscribe();
  });

  async function loadPortalMessages(orderId, senderType) {
    var thread = document.getElementById('portalMsgThread');
    if (!thread) return;

    var { data: msgs } = await sb.from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    // Show unread badge on card heading before marking as read
    var unreadCount = (msgs || []).filter(function(m) { return m.sender_type === 'admin' && !m.read_at; }).length;
    var badge = document.getElementById('msgUnreadBadge');
    if (badge) {
      badge.textContent = unreadCount || '';
      badge.style.display = unreadCount > 0 ? '' : 'none';
    }

    renderPortalMsgThread(thread, msgs || [], senderType);
    thread.scrollTop = thread.scrollHeight;

    // Mark admin messages as read when client views them
    var unread = (msgs || []).filter(function(m) { return m.sender_type === 'admin' && !m.read_at; });
    if (unread.length > 0) {
      await sb.from('messages').update({ read_at: new Date().toISOString() })
        .in('id', unread.map(function(m) { return m.id; }));
    }
  }

  function renderPortalMsgThread(container, msgs, viewerType) {
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

  // ── 후기 관리 카드 ────────────────────────────────────────────────
  async function buildReviewCard(client) {
    if (!client.page_url) return '';

    // page_url 마지막 세그먼트를 slug로 사용 (예: web.lokalonline.at/yori2 → yori2)
    var slug = client.page_url.replace(/\/$/, '').split('/').pop();
    if (!slug) return '';

    var { data: reviews } = await sb
      .from('reviews')
      .select('*')
      .eq('client_slug', slug)
      .order('created_at', { ascending: false });

    var rows = '';
    if (reviews && reviews.length > 0) {
      rows = reviews.map(function (r) {
        var stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
        return '<tr>' +
          '<td>' + formatDate(r.created_at) + '</td>' +
          '<td><strong>' + esc(r.name) + '</strong></td>' +
          '<td style="color:#f59e0b;letter-spacing:1px">' + stars + '</td>' +
          '<td style="max-width:240px;word-break:break-word;font-size:13px">"' + esc(r.text) + '"</td>' +
          '<td><button class="btn btn-danger btn-sm delete-review-btn" data-id="' + r.id + '">Löschen</button></td>' +
          '</tr>';
      }).join('');
    } else {
      rows = '<tr class="empty-row"><td colspan="5">Noch keine Bewertungen.</td></tr>';
    }

    return '<div class="info-card">' +
      '<h2>Meine Bewertungen</h2>' +
      '<div class="table-wrap"><table class="admin-table">' +
      '<thead><tr><th>Datum</th><th>Name</th><th>Sterne</th><th>Kommentar</th><th>Aktionen</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table></div></div>';
  }

  // ── Stripe 결제 버튼 ──────────────────────────────────────────────
  function stripeActionsHtml(client) {
    var billing = client.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    var currentLink = STRIPE_LINKS['flat_' + billing] || STRIPE_LINKS['premium_' + billing];
    if (!currentLink) return '';

    return '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">' +
      '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:10px">Abonnement verwalten</p>' +
      '<a href="' + esc(currentLink) + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Abo erneuern / verwalten</a>' +
      '</div>';
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
