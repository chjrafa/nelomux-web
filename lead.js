/* Formulario de contacto de Nelomux → CRM (Supabase).
   Uso: NelomuxLead.bind(form, {lang:'es'|'en', origen:'demo'}) sobre un <form> con campos
   name="nombre|empresa|email|whatsapp|equipo|mensaje", casillas name="interes", la casilla obligatoria name="acepto" (consentimiento)
   y un campo trampa name="sitio" oculto. El consentimiento queda registrado en el campo origen del contacto.
   Si Supabase no está configurado (config.js) o falla, el contacto se manda por WhatsApp con los datos ya escritos. */
(function () {
  const C = window.NELOMUX || {};
  const T = {
    es: {
      req: 'Escribe tu nombre.', consent: 'Para enviar, marca la casilla de la política de privacidad.', contact: 'Deja tu WhatsApp o tu correo para poder responderte.', mail: 'Revisa el correo: parece incompleto.',
      sending: 'Enviando…', ok: '¡Listo! Recibimos tus datos y te escribimos pronto por WhatsApp o correo.',
      wa: 'Abrimos WhatsApp con tus datos listos: solo toca enviar.', fail: 'No se pudo enviar. Escríbenos por WhatsApp y te respondemos igual.',
      greet: 'Hola, quiero agendar una demo con Nelomux.', f: { nombre: 'Nombre', empresa: 'Empresa', email: 'Correo', whatsapp: 'WhatsApp', equipo: 'Equipo', interes: 'Quiero automatizar', mensaje: 'Mensaje' }
    },
    en: {
      req: 'Please write your name.', consent: 'To send, tick the privacy policy box.', contact: 'Leave your WhatsApp or email so we can reply.', mail: 'Check the email: it looks incomplete.',
      sending: 'Sending…', ok: 'Done! We got your details and will reach out soon by WhatsApp or email.',
      wa: 'We opened WhatsApp with your details ready: just tap send.', fail: 'It didn’t go through. Message us on WhatsApp and we’ll still reply.',
      greet: 'Hi, I’d like to book a demo with Nelomux.', f: { nombre: 'Name', empresa: 'Company', email: 'Email', whatsapp: 'WhatsApp', equipo: 'Team size', interes: 'I want to automate', mensaje: 'Message' }
    }
  };
  const configured = () => !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);

  function waLink(d, lang) {
    const t = T[lang] || T.es;
    const lines = [t.greet];
    ['nombre', 'empresa', 'equipo', 'email', 'whatsapp'].forEach(k => { if (d[k]) lines.push(`${t.f[k]}: ${d[k]}`) });
    if (d.interes && d.interes.length) lines.push(`${t.f.interes}: ${d.interes.join(', ')}`);
    if (d.mensaje) lines.push(d.mensaje);
    return `https://wa.me/${C.WHATSAPP || '584246759019'}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  async function save(d) {
    const r = await fetch(C.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/leads', {
      method: 'POST',
      headers: { apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(d)
    });
    if (!r.ok) {
      let info = '';
      try { const j = await r.json(); info = j.code || j.message || '' } catch (e) {}
      console.error('Nelomux CRM: Supabase respondió', r.status, info);
      throw new Error(r.status + (info ? ' · ' + info : ''));
    }
  }

  function bind(form, opts) {
    const lang = opts.lang || 'es', t = T[lang] || T.es, t0 = Date.now();
    const status = form.querySelector('[data-status]'), btn = form.querySelector('button[type="submit"]'), waBtn = form.querySelector('[data-wa]');
    const say = (msg, kind) => { if (status) { status.textContent = msg; status.dataset.kind = kind || '' } };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(form);
      if (f.get('sitio')) return; // trampa para bots
      const val = k => (f.get(k) || '').toString().trim();
      const d = {
        nombre: val('nombre'), empresa: val('empresa') || null, email: val('email') || null, whatsapp: val('whatsapp') || null,
        equipo: val('equipo') || null, mensaje: val('mensaje') || null, interes: f.getAll('interes').map(String),
        idioma: lang, origen: (opts.origen || 'sitio') + (location.search ? ' ' + location.search.slice(0, 200) : '')
      };
      if (d.nombre.length < 2) { say(t.req, 'err'); form.nombre && form.nombre.focus(); return }
      if (!d.email && !d.whatsapp) { say(t.contact, 'err'); (form.whatsapp || form.email).focus(); return }
      if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { say(t.mail, 'err'); form.email.focus(); return }
      const ok = form.querySelector('[name="acepto"]');
      if (ok && !ok.checked) { say(t.consent, 'err'); ok.focus(); return }
      if (ok) d.origen = (d.origen + ' · acepta privacidad v2026-10-05').slice(0, 300);
      const wait = 2500 - (Date.now() - t0); // envíos instantáneos = bots: esperamos en vez de ignorar en silencio
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      const link = waLink(d, lang);
      if (waBtn) waBtn.href = link;
      if (!configured()) { window.open(link, '_blank', 'noopener'); say(t.wa, 'ok'); form.classList.add('sent'); if (waBtn) waBtn.hidden = false; return }
      btn && (btn.disabled = true); say(t.sending, '');
      try { await save(d); say(t.ok, 'ok'); form.classList.add('sent'); form.reset() }
      catch (err) { say(t.fail + ' (' + (err && err.message || 'red') + ')', 'err'); if (waBtn) waBtn.hidden = false }
      finally { btn && (btn.disabled = false) }
    });
  }
  window.NelomuxLead = { bind, waLink, configured };
})();
