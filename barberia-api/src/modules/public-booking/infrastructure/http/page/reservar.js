'use strict';

// Booking page of the barber shop. No libraries; text always goes through textContent.
(() => {
  const API = '/reservar/api';
  const STORAGE_KEY = 'barberia:cita';
  const app = document.getElementById('app');
  const subtitle = document.getElementById('subtitle');

  const PARTS = [
    { label: '🌅 Mañana', from: 0, to: 12 },
    { label: '☀️ Tarde', from: 12, to: 18 },
    { label: '🌙 Noche', from: 18, to: 24 },
  ];
  const DAY_LABEL = { today: 'Hoy', tomorrow: 'Mañana' };
  const STATUS = {
    pending: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Atendida',
    past: 'Ya pasó',
  };
  const dateFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  // ---- helpers ----
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'text') node.textContent = value;
      else if (key === 'class') node.className = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) if (child) node.append(child);
    return node;
  }
  /** Replaces the children of `node`, skipping null/false (optional parts). */
  function put(node, ...children) { node.replaceChildren(...children.flat().filter(Boolean)); }
  function render(...nodes) { put(app, ...nodes); }
  function formatTime(time) {
    const [h, m] = time.split(':').map(Number);
    const suffix = h < 12 ? 'am' : 'pm';
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
  }
  function formatDate(date) { return dateFormat.format(new Date(`${date}T12:00:00`)); }
  function describe(day, date, time) {
    return `${day ? DAY_LABEL[day] + ', ' : ''}${formatDate(date)} a las ${formatTime(time)}`;
  }
  async function call(path, options) {
    let response;
    try {
      response = await fetch(`${API}${path}`, {
        method: options?.body ? 'POST' : options?.method || 'GET',
        headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
    } catch {
      throw new Error('No hay conexión. Revisa tu internet e intenta de nuevo.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = Array.isArray(data.message) ? data.message[0] : data.message;
      throw new Error(typeof message === 'string' ? message : 'Algo salió mal. Intenta de nuevo.');
    }
    return data;
  }
  function alertBox(message) { return el('p', { class: 'alert', role: 'alert', text: message }); }

  /** Day tabs + slot buttons grouped by part of the day. Calls onPick(date, day, time). */
  function slotPicker(days, onPick) {
    const wrap = el('div');
    let current = days.find((d) => d.times.length > 0) || days[0];
    let picked = null;
    const draw = () => {
      const tabs = el('div', { class: 'tabs', role: 'tablist' }, days.map((d) =>
        el('button', {
          class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(d === current),
          onclick: () => { current = d; draw(); },
        },
          el('span', { class: 'tab-day', text: DAY_LABEL[d.day] }),
          el('span', { class: 'tab-count', text: d.times.length === 1 ? '1 hora libre' : `${d.times.length} horas libres` }))));
      const groups = PARTS.map((part) => {
        const times = current.times.filter((t) => { const h = Number(t.slice(0, 2)); return h >= part.from && h < part.to; });
        if (times.length === 0) return null;
        return [
          el('p', { class: 'part', text: part.label }),
          el('div', { class: 'slots' }, times.map((time) =>
            el('button', {
              class: 'slot', type: 'button', text: formatTime(time),
              'aria-pressed': String(picked === `${current.date} ${time}`),
              onclick: () => { picked = `${current.date} ${time}`; draw(); onPick(current.date, current.day, time); },
            }))),
        ];
      });
      const empty = current.times.length === 0
        ? el('p', { class: 'empty', text: `No quedan horas libres para ${DAY_LABEL[current.day].toLowerCase()}.` })
        : null;
      put(wrap, tabs, empty, ...groups);
    };
    draw();
    return wrap;
  }

  // ---- booking (new client) ----
  async function showBooking() {
    let data;
    try {
      data = await call('/slots');
    } catch (error) {
      render(alertBox(error.message), el('button', { class: 'btn secondary', text: 'Reintentar', onclick: showBooking }));
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedBanner = saved
      ? el('div', { class: 'card' },
          el('p', { class: 'muted', text: 'Ya reservaste desde este celular.' }),
          el('a', { class: 'btn secondary', href: saved, text: 'Ver mi cita' }))
      : null;

    const formSlot = el('div');
    const picker = slotPicker(data.days, (date, day, time) => put(formSlot, bookingForm(date, day, time)));
    render(
      savedBanner,
      el('section', { class: 'card' },
        el('h2', { text: '1. Elige la hora' }),
        data.price > 0 ? el('p', { class: 'price', text: `Valor del corte: ${money.format(data.price)}` }) : null,
        picker),
      formSlot,
    );
  }

  function bookingForm(date, day, time) {
    const error = el('div');
    const name = el('input', { id: 'name', name: 'name', autocomplete: 'name', required: true, maxlength: '60' });
    const phone = el('input', {
      id: 'phone', name: 'phone', type: 'tel', inputmode: 'numeric', autocomplete: 'tel',
      required: true, maxlength: '20', placeholder: '300 123 4567',
    });
    const trap = el('input', { name: 'website', tabindex: '-1', autocomplete: 'off' });
    const submit = el('button', { class: 'btn', type: 'submit', text: 'Reservar cita' });
    const form = el('form', {
      class: 'card', novalidate: true,
      onsubmit: async (event) => {
        event.preventDefault();
        submit.disabled = true;
        submit.textContent = 'Reservando…';
        put(error);
        try {
          const result = await call('/bookings', {
            body: { name: name.value, phone: phone.value, date, time, website: trap.value },
          });
          const link = `${location.origin}/reservar/cita/${result.booking.id}/${result.token}`;
          localStorage.setItem(STORAGE_KEY, link);
          history.replaceState(null, '', link);
          void showManage(result.booking.id, result.token, { justBooked: true, booking: result.booking });
        } catch (e) {
          put(error, alertBox(e.message));
          submit.disabled = false;
          submit.textContent = 'Reservar cita';
          if (/ya no está disponible/.test(e.message)) void showBooking();
        }
      },
    },
      el('h2', { text: '2. Tus datos' }),
      el('p', { class: 'summary', text: describe(day, date, time) }),
      el('label', { for: 'name', text: 'Nombre' }), name,
      el('label', { for: 'phone', text: 'Celular (WhatsApp)' }), phone,
      el('p', { class: 'hint', text: 'Solo para avisarte si hay algún cambio. No necesitas correo.' }),
      el('div', { class: 'trap', 'aria-hidden': 'true' }, el('label', { text: 'No llenar' }), trap),
      error,
      submit);
    setTimeout(() => { form.scrollIntoView({ behavior: 'smooth', block: 'start' }); name.focus({ preventScroll: true }); }, 50);
    return form;
  }

  // ---- manage (private link) ----
  async function showManage(id, token, options = {}) {
    subtitle.textContent = 'Tu cita';
    let booking = options.booking;
    if (!booking) {
      try {
        booking = await call(`/bookings/${id}/${token}`);
      } catch (error) {
        render(alertBox(error.message), el('a', { class: 'btn secondary', href: '/reservar', text: 'Reservar una cita' }));
        return;
      }
    }
    const link = `${location.origin}/reservar/cita/${id}/${token}`;
    const actions = el('div');
    const message = el('div');

    const startReschedule = () => {
      let choice = null;
      const confirm = el('button', {
        class: 'btn', type: 'button', text: 'Confirmar nueva hora', disabled: true,
        onclick: async () => {
          confirm.disabled = true;
          try {
            const updated = await call(`/bookings/${id}/${token}/reschedule`, { body: choice });
            void showManage(id, token, { booking: updated, notice: 'Listo, tu cita quedó para la nueva hora.' });
          } catch (e) {
            put(message, alertBox(e.message));
            confirm.disabled = false;
          }
        },
      });
      put(actions,
        el('h2', { text: 'Elige la nueva hora' }),
        el('p', { class: 'muted', text: 'Solo puedes cambiar la hora una vez.' }),
        slotPicker(booking.slots, (date, _day, time) => { choice = { date, time }; confirm.disabled = false; }),
        confirm,
        el('button', { class: 'btn secondary', type: 'button', text: 'Volver', onclick: () => showManage(id, token, { booking }) }));
    };

    const askCancel = () => {
      put(actions,
        el('p', { class: 'summary', text: '¿Seguro que quieres cancelar tu cita?' }),
        el('div', { class: 'row' },
          el('button', { class: 'btn secondary', type: 'button', text: 'No', onclick: () => showManage(id, token, { booking }) }),
          el('button', {
            class: 'btn danger', type: 'button', text: 'Sí, cancelar',
            onclick: async (event) => {
              event.currentTarget.disabled = true;
              try {
                const updated = await call(`/bookings/${id}/${token}/cancel`, { method: 'POST', body: {} });
                void showManage(id, token, { booking: updated, notice: 'Tu cita quedó cancelada.' });
              } catch (e) {
                put(message, alertBox(e.message));
              }
            },
          })));
    };

    if (booking.status === 'pending') {
      put(actions,
        booking.canReschedule ? el('button', { class: 'btn secondary', type: 'button', text: 'Cambiar la hora', onclick: startReschedule }) : null,
        booking.canCancel ? el('button', { class: 'btn danger', type: 'button', text: 'Cancelar la cita', onclick: askCancel }) : null,
        !booking.canCancel ? el('p', { class: 'muted', text: 'Ya no se puede cambiar por aquí. Si necesitas algo, escríbenos por WhatsApp.' }) : null,
      );
    } else {
      put(actions, el('a', { class: 'btn', href: '/reservar', text: 'Reservar otra cita' }));
      if (booking.status !== 'pending') localStorage.removeItem(STORAGE_KEY);
    }

    const copy = el('button', {
      class: 'btn secondary', type: 'button', text: 'Copiar enlace',
      onclick: async () => {
        try { await navigator.clipboard.writeText(link); copy.textContent = '¡Copiado!'; }
        catch { copy.textContent = 'Mantén presionado el enlace para copiarlo'; }
      },
    });
    const share = el('a', {
      class: 'btn secondary', target: '_blank', rel: 'noopener',
      href: `https://wa.me/?text=${encodeURIComponent(`Mi cita en la barbería: ${link}`)}`,
      text: 'Enviármelo por WhatsApp',
    });

    render(
      options.justBooked ? el('p', { class: 'success', role: 'status', text: '✅ ¡Listo! Tu cita quedó reservada.' }) : null,
      options.notice ? el('p', { class: 'success', role: 'status', text: options.notice }) : null,
      el('section', { class: 'card' },
        el('span', { class: `status ${booking.status}`, text: STATUS[booking.status] || booking.status }),
        el('p', { class: 'summary', text: booking.client }),
        el('p', { text: describe(null, booking.date, booking.time) }),
        booking.price > 0 ? el('p', { class: 'muted', text: `Valor del corte: ${money.format(booking.price)}` }) : null,
        message,
        actions),
      booking.status === 'pending'
        ? el('section', { class: 'card' },
            el('h2', { text: 'Guarda este enlace' }),
            el('p', { class: 'muted', text: 'Con él puedes ver, cambiar o cancelar tu cita.' }),
            el('div', { class: 'link-box', text: link }),
            el('div', { class: 'row' }, copy, share))
        : null,
    );
  }

  // ---- start ----
  const match = location.pathname.match(/^\/reservar\/cita\/(\d+)\/([\w-]+)\/?$/);
  if (match) void showManage(Number(match[1]), match[2]);
  else void showBooking();
})();
