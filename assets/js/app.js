/**
 * Anzuelo: interfaz. Conecta el formulario con el motor (analyzer.js) y el historial (storage.js).
 * Todo el contenido del usuario se inserta con textContent: nunca como HTML.
 */
(function () {
  'use strict';

  const C = window.AnzueloCriteria;
  const A = window.Anzuelo;
  const S = window.AnzueloStore;

  const $ = (id) => document.getElementById(id);

  /** Crea un elemento con atributos y texto seguro. */
  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value === false || value === null || value === undefined) continue;
        node.setAttribute(key, value === true ? '' : value);
      }
    }
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  const ui = {
    form: $('evaluacion'),
    subject: $('subject'),
    sender: $('sender'),
    url: $('url'),
    orgDomain: $('orgDomain'),
    orgDetails: $('orgDetails'),
    autoFindings: $('autoFindings'),
    autoEmpty: $('autoEmpty'),
    card: $('resultCard'),
    needle: $('needle'),
    levelLabel: $('levelLabel'),
    scoreLabel: $('scoreLabel'),
    summary: $('summary'),
    floorNote: $('floorNote'),
    srStatus: $('srStatus'),
    exposureBlock: $('exposureBlock'),
    exposureActions: $('exposureActions'),
    reasonsBlock: $('reasonsBlock'),
    reasons: $('reasons'),
    stepsBlock: $('stepsBlock'),
    steps: $('steps'),
    copyReport: $('copyReport'),
    downloadReport: $('downloadReport'),
    saveEval: $('saveEval'),
    historyList: $('historyList'),
    historyEmpty: $('historyEmpty'),
    historyCount: $('historyCount'),
    clearHistory: $('clearHistory'),
    mobileBar: $('mobileBar'),
    mobileText: $('mobileText'),
    toast: $('toast')
  };

  const EMPTY_SUMMARY = 'Completa al menos un dato o marca una señal para ver el resultado.';
  let current = null;
  let resultVisible = true;
  let srTimer = null;
  let toastTimer = null;

  /* ---------- Construcción del formulario ---------- */

  function checkRow(name, item) {
    const id = `${name}-${item.id}`;
    const row = el('label', { class: 'check', for: id });
    const input = el('input', { type: 'checkbox', id, name, value: item.id });
    const body = el('span', { class: 'check__body' });
    body.append(el('span', { class: 'check__label' }, item.label));
    if (item.hint) body.append(el('span', { class: 'check__hint' }, item.hint));
    row.append(input, el('span', { class: 'check__box', 'aria-hidden': 'true' }), body);

    if (typeof item.points === 'number') {
      const meta = el('span', { class: 'check__meta' });
      if (item.critical) meta.append(el('span', { class: 'tag' }, 'Crítica'));
      meta.append(el('span', { class: 'check__pts', 'aria-hidden': 'true' }, `+${item.points}`));
      meta.append(el('span', { class: 'visually-hidden' }, `, suma ${item.points} puntos`));
      row.append(meta);
    }
    return row;
  }

  function renderForm() {
    const groups = $('indicatorGroups');
    for (const group of C.GROUPS) {
      const fieldset = el('fieldset', { class: 'checklist' });
      fieldset.append(el('legend', { class: 'checklist__legend' }, group.label));
      for (const ind of C.INDICATORS.filter((i) => i.group === group.id)) {
        fieldset.append(checkRow('ind', ind));
      }
      groups.append(fieldset);
    }
    const exposures = $('exposureList');
    for (const exp of C.EXPOSURES) exposures.append(checkRow('exp', exp));
  }

  /* ---------- Lectura y evaluación ---------- */

  function checkedValues(name) {
    return Array.from(ui.form.querySelectorAll(`input[name="${name}"]:checked`)).map((i) => i.value);
  }

  function readInput() {
    return {
      indicators: checkedValues('ind'),
      exposures: checkedValues('exp'),
      url: ui.url.value,
      sender: ui.sender.value,
      orgDomain: ui.orgDomain.value
    };
  }

  function reportMeta() {
    return { subject: ui.subject.value, sender: ui.sender.value, url: ui.url.value, date: new Date() };
  }

  function update() {
    current = A.evaluate(readInput());
    renderAuto(current);
    renderResult(current);
    renderMobileBar();
  }

  /* ---------- Render: revisión automática ---------- */

  function renderAuto(result) {
    ui.autoFindings.replaceChildren();
    const sources = [['Remitente', result.sender], ['Enlace', result.url]];
    let count = 0;
    for (const [source, res] of sources) {
      if (!res) continue;
      for (const f of res.findings) {
        const li = el('li', { class: `finding finding--${f.kind}` });
        li.append(el('span', { class: 'finding__source' }, source));
        li.append(el('span', { class: 'finding__text' }, f.label));
        if (f.points) li.append(el('span', { class: 'finding__pts' }, `+${f.points}`));
        ui.autoFindings.append(li);
        count++;
      }
    }
    if (!count && (result.sender || result.url)) {
      ui.autoFindings.append(el('li', { class: 'finding finding--info' }, 'Sin hallazgos automáticos. Revisa igual las señales del paso 2.'));
      count++;
    }
    ui.autoEmpty.hidden = count > 0;
  }

  /* ---------- Render: resultado ---------- */

  function lowerFirst(text) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  function fillList(list, items, build) {
    list.replaceChildren(...items.map(build));
  }

  function renderResult(result) {
    const has = result.hasData;
    ui.card.dataset.level = has ? result.level.key : 'none';
    ui.needle.style.left = `${has ? result.score : 0}%`;
    ui.levelLabel.textContent = has ? result.level.label : 'Sin evaluar';
    ui.scoreLabel.textContent = has ? `${result.score} de 100` : '';
    ui.summary.textContent = has ? result.summary : EMPTY_SUMMARY;

    ui.floorNote.hidden = !(has && result.floored);
    if (has && result.floored) {
      ui.floorNote.textContent = `El nivel subió a Alto por una señal crítica: ${lowerFirst(result.criticalReasons[0].label)}.`;
    }

    ui.exposureBlock.hidden = !(has && result.exposureActions.length);
    fillList(ui.exposureActions, result.exposureActions, (t) => el('li', null, t));

    const top = result.reasons.slice(0, 5);
    ui.reasonsBlock.hidden = !(has && top.length);
    fillList(ui.reasons, top, (r) => {
      const li = el('li', { class: r.critical ? 'reason reason--critical' : 'reason' });
      const text = r.origin ? `${r.origin}: ${lowerFirst(r.label)}` : r.label;
      li.append(el('span', null, text), el('span', { class: 'reason__pts' }, `+${r.points}`));
      return li;
    });

    ui.stepsBlock.hidden = !has;
    fillList(ui.steps, has ? result.steps : [], (t) => el('li', null, t));

    for (const btn of [ui.copyReport, ui.downloadReport, ui.saveEval]) btn.disabled = !has;

    clearTimeout(srTimer);
    srTimer = setTimeout(() => {
      ui.srStatus.textContent = has ? `Nivel ${result.level.label}, ${result.score} de 100.` : '';
    }, 700);
  }

  function renderMobileBar() {
    const show = !!(current && current.hasData) && !resultVisible;
    ui.mobileBar.hidden = !show;
    if (current && current.hasData) {
      ui.mobileText.textContent = `Nivel ${current.level.label}, ${current.score} de 100`;
      ui.mobileBar.dataset.level = current.level.key;
    }
  }

  /* ---------- Acciones ---------- */

  function toast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('toast--visible'), 3200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true, () => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    const area = el('textarea', { readonly: true, class: 'visually-hidden' });
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    area.remove();
    return ok;
  }

  function onCopy() {
    if (!current || !current.hasData) return;
    copyText(A.buildReport(current, reportMeta())).then((ok) => {
      toast(ok ? 'Reporte copiado. Pégalo en un correo para TI.' : 'No se pudo copiar. Usa “Descargar reporte”.');
    });
  }

  function stamp(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
  }

  function onDownload() {
    if (!current || !current.hasData) return;
    const meta = reportMeta();
    const blob = new Blob([A.buildReport(current, meta)], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = el('a', { href, download: `reporte-anzuelo-${stamp(meta.date)}.txt` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    toast('Reporte descargado.');
  }

  function onSave() {
    if (!current || !current.hasData) return;
    const meta = reportMeta();
    const { persisted } = S.add({
      date: meta.date.toISOString(),
      subject: meta.subject.trim(),
      sender: A.defangEmail(meta.sender),
      score: current.score,
      levelKey: current.level.key,
      levelLabel: current.level.label,
      exposed: current.exposures.length > 0,
      report: A.buildReport(current, meta)
    });
    renderHistory();
    toast(persisted
      ? 'Evaluación guardada en el historial.'
      : 'Guardada solo mientras esta pestaña siga abierta: el navegador bloquea el almacenamiento.');
  }

  function onReset() {
    const org = ui.orgDomain.value;
    ui.form.reset();
    ui.orgDomain.value = org;
    update();
    ui.subject.focus();
    toast('Formulario listo para una nueva evaluación.');
  }

  function onExample() {
    ui.form.reset();
    ui.orgDomain.value = S.getOrgDomain();
    ui.subject.value = 'Alerta: su acceso a Banca por Internet será suspendido';
    ui.sender.value = 'BCP Seguridad <alertas@viabcp-verificacion.com>';
    ui.url.value = 'http://viabcp-verificacion.com/banca/validar?cliente=48213';
    for (const id of ['r_inesperado', 'c_urgencia', 'c_credenciales', 'e_login']) {
      const box = $(`ind-${id}`);
      if (box) box.checked = true;
    }
    update();
    toast('Ejemplo ficticio cargado.');
  }

  /* ---------- Historial ---------- */

  function renderHistory() {
    const items = S.list();
    ui.historyCount.textContent = String(items.length);
    ui.historyEmpty.hidden = items.length > 0;
    ui.clearHistory.hidden = items.length === 0;
    ui.historyList.replaceChildren(...items.map((item) => {
      const li = el('li', { class: 'hitem', 'data-level': item.levelKey });
      const main = el('div', { class: 'hitem__main' });
      main.append(
        el('span', { class: 'badge' }, item.levelLabel),
        el('span', { class: 'hitem__subject' }, item.subject || '(sin asunto)')
      );
      const meta = el('p', { class: 'hitem__meta' });
      const parts = [A.formatDate(item.date), `${item.score} de 100`];
      if (item.sender) parts.push(item.sender);
      if (item.exposed) parts.push('hubo interacción');
      meta.textContent = parts.join(', ');
      const actions = el('div', { class: 'hitem__actions' });
      const copy = el('button', { type: 'button', class: 'btn btn--small', 'data-action': 'copy', 'data-id': item.id }, 'Copiar reporte');
      const del = el('button', { type: 'button', class: 'btn btn--small btn--quiet', 'data-action': 'delete', 'data-id': item.id }, 'Eliminar');
      actions.append(copy, del);
      li.append(main, meta, actions);
      return li;
    }));
  }

  function onHistoryClick(event) {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const item = S.list().find((i) => i.id === btn.dataset.id);
    if (!item) return;
    if (btn.dataset.action === 'copy') {
      copyText(item.report).then((ok) => toast(ok ? 'Reporte copiado.' : 'No se pudo copiar el reporte.'));
    } else if (btn.dataset.action === 'delete') {
      S.remove(item.id);
      renderHistory();
      toast('Evaluación eliminada.');
    }
  }

  function onClearHistory() {
    if (!window.confirm('¿Borrar todas las evaluaciones guardadas? No se puede deshacer.')) return;
    S.clear();
    renderHistory();
    toast('Historial borrado.');
  }

  /* ---------- Inicio ---------- */

  function linkRepository() {
    const { hostname, pathname } = window.location;
    if (!hostname.endsWith('.github.io')) return;
    const user = hostname.split('.')[0];
    const repo = pathname.split('/').filter(Boolean)[0];
    if (!user || !repo) return;
    $('repoLink').href = `https://github.com/${user}/${repo}`;
    $('repoNote').hidden = false;
  }

  function watchResultVisibility() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      resultVisible = entries.some((e) => e.isIntersecting);
      renderMobileBar();
    }, { threshold: 0.15 });
    observer.observe(ui.card);
  }

  function init() {
    renderForm();
    ui.orgDomain.value = S.getOrgDomain();
    if (ui.orgDomain.value) ui.orgDetails.open = true;

    ui.form.addEventListener('input', update);
    ui.form.addEventListener('change', update);
    ui.form.addEventListener('submit', (e) => e.preventDefault());
    ui.orgDomain.addEventListener('input', () => S.setOrgDomain(ui.orgDomain.value.trim()));
    ui.copyReport.addEventListener('click', onCopy);
    ui.downloadReport.addEventListener('click', onDownload);
    ui.saveEval.addEventListener('click', onSave);
    $('resetForm').addEventListener('click', onReset);
    $('loadExample').addEventListener('click', onExample);
    ui.historyList.addEventListener('click', onHistoryClick);
    ui.clearHistory.addEventListener('click', onClearHistory);

    watchResultVisibility();
    linkRepository();
    renderHistory();
    update();
  }

  init();
})();
