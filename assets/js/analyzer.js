/**
 * Anzuelo: lógica de análisis y reportes, sin acceso al DOM.
 * Todo se calcula localmente; no hace peticiones de red.
 * Funciona en el navegador (window.Anzuelo) y en Node (require) para las pruebas.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./criteria.js'));
  } else {
    root.Anzuelo = factory(root.AnzueloCriteria);
  }
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  /* ---------- Utilidades de dominio ---------- */

  /** Recorta espacios exteriores, pasa a minúsculas y quita www inicial y punto final. */
  function normalizeDomain(domain) {
    return String(domain || '').trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  }

  /** Detecta IPv4 numérica o un host que comienza con "[" (formato IPv6); no valida la dirección. */
  function isIp(host) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
  }

  /** Dominio registrable aproximado: "a.b.viabcp.com" → "viabcp.com"; "x.sunat.gob.pe" → "sunat.gob.pe". */
  function registrableDomain(host) {
    const h = normalizeDomain(host);
    if (!h || isIp(h)) return h;
    const labels = h.split('.');
    if (labels.length <= 2) return h;
    const lastTwo = labels.slice(-2).join('.');
    const take = C.MULTI_SUFFIXES.includes(lastTwo) ? 3 : 2;
    return labels.slice(-take).join('.');
  }

  /** Etiqueta principal del dominio registrable: "scotiabank.com.pe" → "scotiabank". */
  function mainLabel(domain) {
    return registrableDomain(domain).split('.')[0] || '';
  }

  /** true si host es igual a domain o es un subdominio suyo. */
  function matchesDomain(host, domain) {
    const h = normalizeDomain(host);
    const d = normalizeDomain(domain);
    return h === d || h.endsWith('.' + d);
  }

  /** Distancia de edición de Levenshtein. */
  function levenshtein(a, b) {
    if (a === b) return 0;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let diag = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = prev[j];
        prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
        diag = tmp;
      }
    }
    return prev[b.length];
  }

  /** Reemplaza homoglifos ASCII y quita guiones: "v1a-bcp" → "viabcp". */
  function deglyph(text) {
    let out = String(text).toLowerCase();
    for (const [from, to] of C.HOMOGLYPHS) out = out.split(from).join(to);
    return out.replace(/-/g, '');
  }

  /** Lista de marcas más el dominio de la organización, si se indicó con un punto. */
  function brandList(orgDomain) {
    const org = normalizeDomain(orgDomain);
    const list = C.BRANDS.slice();
    if (org && org.includes('.')) {
      list.push({ name: 'tu organización', domains: [org], keywords: [mainLabel(org)], isOrg: true });
    }
    return list;
  }

  /** Marca cuyo dominio oficial coincide con el host, o null. */
  function officialBrand(host, brands) {
    for (const brand of brands) {
      if (brand.domains.some((d) => matchesDomain(host, d))) return brand;
    }
    return null;
  }

  /** Diferencia máxima de letras tolerada según el largo de la palabra clave. */
  function maxTypos(length) {
    if (length >= 8) return 2;
    if (length >= 6) return 1;
    return 0;
  }

  /**
   * Detecta si un host imita a una marca sin ser su dominio oficial.
   * Reglas:
   *  1. Una palabra clave de la marca aparece en alguna parte del host (tras quitar homoglifos).
   *     Palabras de 3 letras o menos (ej. "upc", "dhl") solo cuentan como palabra completa.
   *  2. La etiqueta principal difiere de la palabra clave en 1 letra (6-7 caracteres)
   *     o 1-2 letras (8 o más caracteres).
   * @returns {null | {brand: string, official: string, isOrg: boolean}}
   */
  function detectLookalike(host, brands) {
    const h = normalizeDomain(host);
    if (!h || isIp(h) || officialBrand(h, brands)) return null;
    if (C.TRUSTED_SUFFIXES.some((s) => matchesDomain(h, s))) return null;

    // En servicios de hosting, el nombre del servicio (ej. "amazonaws") no cuenta: solo la parte del cliente.
    const hostingReg = C.HOSTING.find((d) => matchesDomain(h, d));
    const ownPart = hostingReg ? h.slice(0, -hostingReg.length).replace(/\.$/, '') : h;
    const labels = ownPart.split('.').filter(Boolean);
    const regLabel = hostingReg ? (labels[labels.length - 1] || '') : mainLabel(h);

    for (const brand of brands) {
      const keywords = brand.keywords && brand.keywords.length ? brand.keywords : brand.domains.map(mainLabel);
      const hit = { brand: brand.name, official: brand.domains[0], isOrg: !!brand.isOrg };
      for (const kw of keywords) {
        if (!kw) continue;
        for (const label of labels) {
          if (kw.length <= 3) {
            if (label.split('-').includes(kw)) return hit;
          } else if (deglyph(label).includes(deglyph(kw))) {
            return hit;
          }
        }
        const typos = maxTypos(kw.length);
        if (typos) {
          const d = levenshtein(deglyph(regLabel), deglyph(kw));
          if (d > 0 && d <= typos) return hit;
        }
      }
    }
    return null;
  }

  function finding(id, label, extra) {
    const points = C.FINDING_POINTS[id] || 0;
    return Object.assign({ id, label, points, critical: C.CRITICAL_FINDINGS.includes(id), kind: 'riesgo' }, extra);
  }

  function note(id, label) {
    return { id, label, points: 0, critical: false, kind: 'info' };
  }

  /* ---------- Análisis de enlace ---------- */

  /**
   * Analiza un enlace copiado del correo (nunca lo abre).
   * @param {string} raw Texto del enlace.
   * @param {{orgDomain?: string}} [ctx]
   * @returns {null | ({valid: false, findings: Array<{id: string, label: string, points: number, critical: boolean, kind: string}>} | {valid: true, host: string, registrable?: string, findings: Array<{id: string, label: string, points: number, critical: boolean, kind: string}>})}
   */
  function analyzeUrl(raw, ctx) {
    const text = String(raw || '').trim();
    if (!text) return null;
    const brands = brandList(ctx && ctx.orgDomain);
    const findings = [];

    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^:]+:\d+/.test(text);
    let url;
    try {
      url = new URL(hasScheme ? text : 'http://' + text);
    } catch (e) {
      return { valid: false, findings: [note('u_invalida', 'No se pudo interpretar el enlace. Revisa que lo copiaste completo.')] };
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      findings.push(finding('u_esquema', `El enlace no es una página web normal (${url.protocol.replace(':', '')}:), un formato usado para ocultar contenido`));
      return { valid: true, host: '', findings };
    }

    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    const reg = registrableDomain(host);
    const label = mainLabel(reg);
    const official = isIp(host) ? null : officialBrand(host, brands);

    if (!hasScheme) findings.push(note('u_sin_esquema', 'El enlace no indica http ni https; se analizó tal como está.'));
    if (url.username || url.password) {
      findings.push(finding('u_userinfo', `Contiene “@”: lo que va antes es decoración y el destino real es ${host}`));
    }
    if (isIp(host)) {
      findings.push(finding('u_ip', 'Usa una dirección IP en lugar de un nombre de dominio'));
    }
    if (host.includes('xn--') || /[^\x00-\x7F]/.test(text.split('/')[hasScheme ? 2 : 0] || '')) {
      findings.push(finding('u_punycode', 'El dominio usa caracteres especiales que pueden imitar letras normales'));
    }
    if (C.SHORTENERS.includes(host) || C.SHORTENERS.includes(reg)) {
      findings.push(finding('u_acortador', `Usa un acortador (${reg}) que oculta el destino real`));
    }

    if (official) {
      findings.push(note('u_oficial', official.isOrg
        ? 'Pertenece al dominio de tu organización.'
        : `Pertenece a un dominio oficial de ${official.name}. Aun así, confirma que el mensaje sea esperado.`));
    } else if (!isIp(host)) {
      const look = detectLookalike(host, brands);
      if (look) {
        findings.push(finding('u_imita', look.isOrg
          ? `El dominio ${reg} se parece al de tu organización (${look.official}) sin serlo`
          : `El dominio ${reg} parece imitar a ${look.brand} (oficial: ${look.official})`));
      }
      const hosting = C.HOSTING.find((d) => matchesDomain(host, d));
      if (hosting) {
        findings.push(finding('u_hosting', `Está alojado en un servicio gratuito o en la nube (${hosting}), común en páginas falsas`));
      }
      const tld = host.split('.').pop();
      if (C.RISKY_TLDS.includes(tld)) {
        findings.push(finding('u_tld', `Usa la extensión .${tld}, frecuente en campañas maliciosas`));
      }
      if (host.split('.').length - reg.split('.').length >= 3) {
        findings.push(finding('u_subdominios', 'Tiene demasiados subdominios, una técnica para esconder el dominio real'));
      }
      if ((label.replace(/^xn--/, '').match(/-/g) || []).length >= 2) {
        findings.push(finding('u_guiones', 'El dominio tiene varios guiones, típico de dominios improvisados'));
      }
      if (C.PATH_KEYWORDS.test(url.pathname + url.search)) {
        findings.push(finding('u_palabras', 'La dirección contiene palabras de acceso o verificación (login, verificar, actualizar)'));
      }
    }

    if (url.port && !['80', '443'].includes(url.port)) {
      findings.push(finding('u_puerto', `Usa un puerto poco común (${url.port})`));
    }
    if (hasScheme && url.protocol === 'http:') {
      findings.push(finding('u_http', 'No usa conexión cifrada (http). Ojo: https tampoco garantiza que sea legítimo'));
    }
    if (text.length > 120) {
      findings.push(finding('u_largo', 'El enlace es inusualmente largo'));
    }

    return { valid: true, host, registrable: reg, findings };
  }

  /* ---------- Análisis de remitente ---------- */

  /** Separa "Nombre <correo@dominio>" en sus partes. */
  function parseSender(raw) {
    const text = String(raw || '').trim();
    const angled = text.match(/^\s*"?([^"<]*?)"?\s*<\s*([^<>\s]+)\s*>\s*$/);
    if (angled) return { display: angled[1].trim(), email: angled[2].trim() };
    const bare = text.match(/[^\s<>"']+@[^\s<>"']+/);
    if (bare) {
      const display = text.replace(bare[0], '').replace(/[<>"]/g, '').trim();
      return { display, email: bare[0] };
    }
    return { display: text, email: '' };
  }

  /**
   * Analiza la dirección del remitente.
   * @param {string} raw Remitente tal como se ve en el correo.
   * @param {{orgDomain?: string}} [ctx]
   * @returns {null | ({valid: false, display: string, email: string, findings: Array<{id: string, label: string, points: number, critical: boolean, kind: string}>} | {valid: true, display: string, email: string, domain: string, findings: Array<{id: string, label: string, points: number, critical: boolean, kind: string}>})}
   */
  function analyzeSender(raw, ctx) {
    const text = String(raw || '').trim();
    if (!text) return null;
    const brands = brandList(ctx && ctx.orgDomain);
    const { display, email } = parseSender(text);
    const findings = [];

    const at = email.lastIndexOf('@');
    const rawDomain = at > 0 ? email.slice(at + 1) : '';
    if (!rawDomain || !rawDomain.includes('.')) {
      return { valid: false, display, email, findings: [note('s_invalido', 'No se encontró una dirección de correo válida. Copia la dirección completa del remitente.')] };
    }

    let domain = normalizeDomain(rawDomain);
    if (/[^\x00-\x7F]/.test(domain)) {
      findings.push(finding('s_punycode', 'El dominio del remitente usa caracteres especiales que pueden imitar letras normales'));
      try { domain = new URL('http://' + domain).hostname; } catch (e) { /* se mantiene tal cual */ }
    } else if (domain.includes('xn--')) {
      findings.push(finding('s_punycode', 'El dominio del remitente usa caracteres especiales que pueden imitar letras normales'));
    }

    const reg = registrableDomain(domain);
    const free = C.FREE_MAIL.includes(domain);
    const official = free ? null : officialBrand(domain, brands);

    if (free) {
      findings.push(finding('s_gratuito', `Escribe desde un correo gratuito (${domain}). Si dice ser una empresa o entidad, marca esa señal abajo`));
    } else if (official) {
      findings.push(note('s_oficial', official.isOrg
        ? 'Viene del dominio de tu organización. Si pide algo inusual, confírmalo por otro canal: el remitente se puede falsificar.'
        : `Usa un dominio oficial de ${official.name}. El remitente se puede falsificar: si pide algo inusual, confírmalo por otro canal.`));
    } else {
      const look = detectLookalike(domain, brands);
      if (look) {
        findings.push(finding('s_imita', look.isOrg
          ? `El dominio ${reg} se parece al de tu organización (${look.official}) sin serlo`
          : `El dominio ${reg} parece imitar a ${look.brand} (oficial: ${look.official})`));
      }
    }

    if (display) {
      const mentioned = brands.find((b) => !b.isOrg && new RegExp(`(^|[^a-z])${b.name.toLowerCase()}([^a-z]|$)`, 'i').test(display));
      if (mentioned && !mentioned.domains.some((d) => matchesDomain(domain, d))) {
        findings.push(finding('s_nombre_marca', `El nombre visible menciona a ${mentioned.name}, pero el correo viene de ${domain}`));
      }
    }

    const tld = domain.split('.').pop();
    if (C.RISKY_TLDS.includes(tld)) {
      findings.push(finding('s_tld', `El remitente usa la extensión .${tld}, frecuente en campañas maliciosas`));
    }

    return { valid: true, display, email, domain, findings };
  }

  /* ---------- Revisión orientativa del texto ---------- */

  const MAX_MESSAGE_LENGTH = 20000;

  function normalizeMessage(text) {
    let normalized = '';
    const starts = [];
    const ends = [];

    for (let index = 0; index < text.length;) {
      const start = index;
      const character = String.fromCodePoint(text.codePointAt(index));
      index += character.length;
      const clean = character.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      normalized += clean;
      for (let i = 0; i < clean.length; i++) {
        starts.push(start);
        ends.push(index);
      }
    }

    return { text: normalized, starts, ends };
  }

  function messageExcerpt(text, start, end) {
    const maxLength = 120;
    const matchLength = end - start;
    const context = Math.max(0, Math.floor((maxLength - matchLength) / 2));
    let from = Math.max(0, start - context);
    let to = Math.min(text.length, from + maxLength);
    from = Math.max(0, to - maxLength);
    return `${from ? '…' : ''}${text.slice(from, to)}${to < text.length ? '…' : ''}`;
  }

  /**
   * Busca frases explícitas en el cuerpo de un correo. Los hallazgos son orientativos
   * y no se incorporan al puntaje ni seleccionan indicadores.
   * @param {string} raw Texto del mensaje.
   * @returns {{truncated: boolean, findings: Array<{id: string, indicatorId: string, indicatorLabel: string, label: string, explanation: string, excerpt: string}>}}
   */
  function analyzeMessage(raw) {
    const text = String(raw || '');
    const truncated = text.length > MAX_MESSAGE_LENGTH;
    let source = text.slice(0, MAX_MESSAGE_LENGTH);
    if (source.length && /[\uD800-\uDBFF]/.test(source.slice(-1))) source = source.slice(0, -1);
    const normalized = normalizeMessage(source);
    const findings = [];

    for (const signal of C.TEXT_SIGNALS) {
      const match = new RegExp(signal.pattern).exec(normalized.text);
      if (!match || !match[0].length) continue;
      const start = normalized.starts[match.index];
      const end = normalized.ends[match.index + match[0].length - 1];
      const indicator = C.INDICATORS.find((item) => item.id === signal.indicatorId);
      findings.push({
        id: signal.id,
        indicatorId: signal.indicatorId,
        indicatorLabel: indicator.label,
        label: signal.label,
        explanation: signal.explanation,
        excerpt: messageExcerpt(source, start, end)
      });
    }

    return { truncated, findings };
  }

  /* ---------- Puntaje y nivel ---------- */

  function levelFor(score) {
    let level = C.LEVELS[0];
    for (const l of C.LEVELS) if (score >= l.min) level = l;
    return level;
  }

  function levelIndex(key) {
    return C.LEVELS.findIndex((l) => l.key === key);
  }

  /**
   * Evalúa un correo.
   * @param {{indicators?: string[], url?: string, sender?: string, orgDomain?: string, exposures?: string[]}} input
   * @returns {{hasData: boolean, score: number, rawScore: number, level: {key: string, label: string}, floored: boolean, criticalReasons: Array<{id: string, label: string, points: number, critical: boolean, source: string, origin?: string}>, reasons: Array<{id: string, label: string, points: number, critical: boolean, source: string, origin?: string}>, summary: string, steps: string[], exposureActions: string[], exposures: string[], url: ReturnType<typeof analyzeUrl>, sender: ReturnType<typeof analyzeSender>}}
   */
  function evaluate(input) {
    const ids = new Set(input.indicators || []);
    const exposures = new Set(input.exposures || []);
    const ctx = { orgDomain: input.orgDomain };
    const urlResult = analyzeUrl(input.url, ctx);
    const senderResult = analyzeSender(input.sender, ctx);

    const hasData = ids.size > 0 || exposures.size > 0 || !!urlResult || !!senderResult;

    const reasons = [];
    for (const ind of C.INDICATORS) {
      if (ids.has(ind.id)) reasons.push({ id: ind.id, label: ind.label, points: ind.points, critical: !!ind.critical, source: 'observada' });
    }
    for (const [res, origin] of [[senderResult, 'Remitente'], [urlResult, 'Enlace']]) {
      if (!res) continue;
      for (const f of res.findings) {
        if (f.kind === 'riesgo') reasons.push({ id: f.id, label: f.label, points: f.points, critical: f.critical, source: 'automatica', origin });
      }
    }

    const rawScore = reasons.reduce((sum, r) => sum + r.points, 0);
    const score = Math.min(100, rawScore);
    let level = levelFor(score);
    const criticalReasons = reasons.filter((r) => r.critical);
    let floored = false;
    if (criticalReasons.length && levelIndex(level.key) < levelIndex('alto')) {
      level = C.LEVELS[levelIndex('alto')];
      floored = true;
    }

    const rec = C.RECOMMENDATIONS[level.key];
    const exposureActions = C.EXPOSURE_ACTIONS.filter((a) => exposures.has(a.id)).map((a) => a.text);

    return {
      hasData,
      score,
      rawScore,
      level,
      floored,
      criticalReasons,
      reasons: reasons.slice().sort((a, b) => b.points - a.points),
      summary: rec.summary,
      steps: rec.steps.slice(),
      exposureActions,
      exposures: C.EXPOSURES.filter((e) => exposures.has(e.id)).map((e) => e.label),
      url: urlResult,
      sender: senderResult
    };
  }

  /* ---------- Reporte ---------- */

  /** Desactiva un enlace para que no sea clicable en el reporte: https://a.com → hxxps://a[.]com */
  function defangUrl(raw) {
    const text = String(raw || '').trim();
    if (!text) return '';
    return text
      .replace(/^http/i, 'hxxp')
      .replace(/^([a-z]+:\/\/)?([^/?#]*)/i, (m, scheme, authority) => (scheme || '') + authority.replace(/\.(?!\])/g, '[.]').replace(/@(?!\])/g, '[@]'));
  }

  /** Desactiva un correo: ana@dominio.com → ana[@]dominio[.]com */
  function defangEmail(raw) {
    return String(raw || '').trim().replace(/(^|[^[])@([^\s>]+)/g, (m, before, domain) => before + '[@]' + domain.replace(/\.(?!\])/g, '[.]'));
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function csvCell(value) {
    const text = String(value == null ? '' : value);
    const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  /** Construye un CSV del historial con correos y enlaces desactivados. */
  function buildHistoryCsv(items) {
    const rows = [
      ['Fecha', 'Asunto', 'Remitente', 'Enlace', 'Puntaje (sobre 100)', 'Nivel de riesgo', 'Hubo interacción'],
      ...items.map((item) => [
        formatDate(item.date),
        item.subject || '(sin asunto)',
        defangEmail(item.sender),
        item.url ? defangUrl(item.url) : '',
        item.score,
        item.levelLabel,
        item.exposed ? 'Sí' : 'No'
      ])
    ];
    return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  }

  /**
   * Construye el reporte en texto plano para enviar a TI.
   * @param {ReturnType<typeof evaluate>} result
   * @param {{subject?: string, sender?: string, url?: string, date?: Date|string}} [meta]
   */
  function buildReport(result, meta) {
    const m = meta || {};
    const lines = [];
    lines.push('Reporte de correo sospechoso (Anzuelo)');
    lines.push('');
    lines.push(`Fecha de evaluación: ${formatDate(m.date || new Date())}`);
    lines.push(`Asunto: ${m.subject && m.subject.trim() ? m.subject.trim() : '(sin asunto)'}`);
    lines.push(`Remitente: ${m.sender && m.sender.trim() ? defangEmail(m.sender) : '(no indicado)'}`);
    lines.push(`Enlace: ${m.url && m.url.trim() ? defangUrl(m.url) : '(no indicado)'}`);
    lines.push(`Puntaje: ${result.score}/100`);
    lines.push(`Nivel: ${result.level.label}${result.floored ? ' (elevado por una señal crítica)' : ''}`);
    lines.push('');

    const observed = result.reasons.filter((r) => r.source === 'observada');
    const auto = result.reasons.filter((r) => r.source === 'automatica');
    lines.push('Señales observadas por la persona:');
    lines.push(...(observed.length ? observed.map((r) => `- ${r.label}`) : ['- Ninguna']));
    lines.push('');
    lines.push('Hallazgos de la revisión automática:');
    lines.push(...(auto.length ? auto.map((r) => `- ${r.origin}: ${r.label}`) : ['- Ninguno']));
    lines.push('');
    lines.push('Interacción con el correo:');
    lines.push(...(result.exposures.length ? result.exposures.map((e) => `- ${e}`) : ['- Ninguna']));
    lines.push('');
    if (result.exposureActions.length) {
      lines.push('Acciones urgentes:');
      lines.push(...result.exposureActions.map((a) => `- ${a}`));
      lines.push('');
    }
    lines.push('Acciones recomendadas:');
    lines.push(...result.steps.map((s, i) => `${i + 1}. ${s}`));
    lines.push('');
    lines.push('Nota: evaluación heurística de apoyo. No reemplaza el análisis del equipo de seguridad.');
    lines.push('Los enlaces y correos se muestran desactivados ([.] y hxxp) para evitar clics accidentales.');
    return lines.join('\n');
  }

  return {
    normalizeDomain, isIp, registrableDomain, mainLabel, matchesDomain, levenshtein, deglyph,
    detectLookalike, brandList, parseSender, analyzeUrl, analyzeSender, analyzeMessage, levelFor, evaluate,
    defangUrl, defangEmail, formatDate, buildHistoryCsv, buildReport
  };
});
