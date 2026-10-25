// Pruebas del motor de evaluación. Ejecutar con: npm test  (Node 18 o superior, sin dependencias)
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../assets/js/analyzer.js');

const ids = (res) => (res ? res.findings.map((f) => f.id) : []);

test('calcula el dominio registrable con sufijos de dos niveles', () => {
  assert.equal(A.registrableDomain('login.seguro.viabcp.com'), 'viabcp.com');
  assert.equal(A.registrableDomain('e-menu.sunat.gob.pe'), 'sunat.gob.pe');
  assert.equal(A.registrableDomain('www.scotiabank.com.pe'), 'scotiabank.com.pe');
});

test('reconoce dominios oficiales y no los marca como imitación', () => {
  assert.deepEqual(ids(A.analyzeUrl('https://www.viabcp.com/')), ['u_oficial']);
  assert.ok(ids(A.analyzeUrl('https://login.microsoftonline.com/common')).includes('u_oficial'));
  assert.ok(ids(A.analyzeSender('Interbank <avisos@interbank.pe>')).includes('s_oficial'));
});

test('analiza enlaces en mayúsculas, con punto final y espacios iniciales', () => {
  for (const url of [
    'HTTPS://WWW.VIABCP.COM/',
    'https://www.viabcp.com./',
    '   https://www.viabcp.com/'
  ]) {
    const result = A.analyzeUrl(url);
    assert.equal(result.valid, true, url);
    assert.ok(ids(result).includes('u_oficial'), url);
    assert.ok(!ids(result).includes('u_imita'), url);
  }
});

test('detecta direcciones IPv6 en enlaces', () => {
  const result = A.analyzeUrl('https://[2001:db8::1]/login');
  assert.equal(result.valid, true);
  assert.equal(result.host, '[2001:db8::1]');
  assert.ok(ids(result).includes('u_ip'));
});

test('detecta dominios que imitan marcas', () => {
  assert.ok(ids(A.analyzeUrl('http://viabcp-alertas.com/login')).includes('u_imita'));
  assert.ok(ids(A.analyzeUrl('https://v1abcp.com')).includes('u_imita'), 'homoglifo 1 por i');
  assert.ok(ids(A.analyzeUrl('https://paypai.com')).includes('u_imita'), 'typosquatting');
  assert.ok(ids(A.analyzeUrl('https://viabcp-login.web.app')).includes('u_imita'), 'marca en subdominio de hosting');
  assert.ok(ids(A.analyzeSender('soporte@dhl-envios.xyz')).includes('s_imita'), 'nombre corto como palabra');
});

test('evita falsos positivos conocidos', () => {
  assert.ok(!ids(A.analyzeUrl('https://amazonas.gob.pe')).includes('u_imita'), 'dominio gubernamental');
  assert.ok(!ids(A.analyzeUrl('https://deliveries.com')).includes('u_imita'));
  assert.ok(!ids(A.analyzeUrl('https://email.com')).includes('u_imita'));
  assert.ok(!ids(A.analyzeUrl('https://s3.amazonaws.com/x')).includes('u_imita'), 'hosting de Amazon no imita a Amazon');
});

test('detecta técnicas de ocultamiento en enlaces', () => {
  assert.ok(ids(A.analyzeUrl('http://192.168.1.10/a')).includes('u_ip'));
  assert.ok(ids(A.analyzeUrl('https://bit.ly/3abc')).includes('u_acortador'));
  assert.ok(ids(A.analyzeUrl('https://www.viabcp.com@evil.xyz/')).includes('u_userinfo'));
  assert.ok(ids(A.analyzeUrl('https://xn--pypal-4ve.com')).includes('u_punycode'));
  assert.ok(!ids(A.analyzeUrl('https://xn--pypal-4ve.com')).includes('u_guiones'), 'el prefijo xn-- no cuenta como guiones');
  assert.ok(ids(A.analyzeUrl('javascript:alert(1)')).includes('u_esquema'));
  assert.ok(ids(A.analyzeUrl('https://a.b.c.d.example.com')).includes('u_subdominios'));
  assert.ok(ids(A.analyzeUrl('http://ejemplo.com:8081/x')).includes('u_puerto'));
});

test('acepta enlaces sin http ni https', () => {
  const res = A.analyzeUrl('viabcp-alertas.com/login');
  assert.equal(res.valid, true);
  assert.ok(res.findings.some((f) => f.id === 'u_sin_esquema'));
  assert.ok(!res.findings.some((f) => f.id === 'u_http'), 'no penaliza http si no se escribió');
});

test('analiza el remitente con nombre visible', () => {
  const free = A.analyzeSender('BCP Seguridad <bcp.seguridad@gmail.com>');
  assert.deepEqual(ids(free).sort(), ['s_gratuito', 's_nombre_marca']);
  assert.equal(A.analyzeSender('hola').valid, false);
});

test('detecta imitación del dominio de la organización', () => {
  const res = A.analyzeSender('pagos@distrib-andina.pe', { orgDomain: 'distribandina.pe' });
  assert.ok(ids(res).includes('s_imita'));
  const own = A.analyzeSender('jefe@distribandina.pe', { orgDomain: 'distribandina.pe' });
  assert.ok(ids(own).includes('s_oficial'));
});

test('el puntaje se limita a 100 y respeta los umbrales', () => {
  const r = A.evaluate({ indicators: ['c_credenciales', 'c_pago', 'a_macros', 'a_riesgoso'] });
  assert.equal(r.rawScore, 115);
  assert.equal(r.score, 100);
  assert.equal(r.level.key, 'critico');
  assert.equal(A.levelFor(19).key, 'bajo');
  assert.equal(A.levelFor(20).key, 'medio');
  assert.equal(A.levelFor(45).key, 'alto');
  assert.equal(A.levelFor(70).key, 'critico');
});

test('una señal crítica eleva el nivel mínimo a Alto', () => {
  const r = A.evaluate({ indicators: ['c_credenciales'] });
  assert.equal(r.score, 30);
  assert.equal(r.level.key, 'alto');
  assert.equal(r.floored, true);
});

test('la interacción cambia las acciones, no el puntaje', () => {
  const base = A.evaluate({ indicators: ['c_urgencia'] });
  const exposed = A.evaluate({ indicators: ['c_urgencia'], exposures: ['x_clic', 'x_adjunto'] });
  assert.equal(exposed.score, base.score);
  assert.equal(exposed.exposureActions.length, 2);
  assert.match(exposed.exposureActions[0], /Desconecta/, 'el adjunto abierto es la prioridad');
});

test('sin datos no hay evaluación', () => {
  assert.equal(A.evaluate({}).hasData, false);
});

test('el reporte desactiva enlaces y correos', () => {
  assert.equal(A.defangUrl('https://viabcp-alertas.com/login'), 'hxxps://viabcp-alertas[.]com/login');
  assert.equal(A.defangEmail('BCP <a@b.com.pe>'), 'BCP <a[@]b[.]com[.]pe>');
  assert.equal(A.defangUrl('hxxps://viabcp-alertas[.]com/login'), 'hxxps://viabcp-alertas[.]com/login');
  assert.equal(A.defangEmail('BCP <a[@]b[.]com[.]pe>'), 'BCP <a[@]b[.]com[.]pe>');
  const r = A.evaluate({ url: 'http://viabcp-alertas.com/login', indicators: ['c_urgencia'] });
  const report = A.buildReport(r, { subject: 'Prueba', sender: 'x@viabcp-alertas.com', url: 'http://viabcp-alertas.com/login', date: new Date(2026, 9, 25, 9, 5) });
  assert.match(report, /Fecha de evaluación: 25\/10\/2026 09:05/);
  assert.match(report, /hxxp:\/\/viabcp-alertas\[\.\]com\/login/);
  assert.doesNotMatch(report, /https?:\/\/viabcp/);
});

test('exporta el historial como CSV UTF-8, escapando campos y desactivando enlaces', () => {
  const csv = A.buildHistoryCsv([{
    date: new Date(2026, 9, 25, 9, 5),
    subject: 'Revisión, "urgente"\ny confirmar',
    sender: 'Ana <ana@ejemplo.com>',
    url: 'https://ejemplo.com/verificar',
    score: 45,
    levelLabel: 'Alto',
    exposed: true
  }]);

  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.match(csv, /"Fecha","Asunto","Remitente","Enlace","Puntaje \(sobre 100\)","Nivel de riesgo","Hubo interacción"/);
  assert.ok(csv.includes('"25/10/2026 09:05","Revisión, ""urgente""\ny confirmar","Ana <ana[@]ejemplo[.]com>","hxxps://ejemplo[.]com/verificar","45","Alto","Sí"'));
  assert.doesNotMatch(csv, /https?:\/\/ejemplo/);

  const savedCsv = A.buildHistoryCsv([{
    date: new Date(2026, 9, 25, 9, 5),
    subject: 'Prueba',
    sender: 'Ana <ana[@]ejemplo[.]com>',
    url: 'hxxps://ejemplo[.]com/verificar',
    score: 45,
    levelLabel: 'Alto',
    exposed: true
  }]);
  assert.ok(savedCsv.includes('"Ana <ana[@]ejemplo[.]com>","hxxps://ejemplo[.]com/verificar"'));
});

test('exporta asunto y remitente ausentes de forma coherente con el historial', () => {
  const csv = A.buildHistoryCsv([{
    date: new Date(2026, 9, 25, 9, 5),
    subject: '',
    sender: '',
    score: 0,
    levelLabel: 'Bajo',
    exposed: false
  }]);

  assert.match(csv, /"\(sin asunto\)","","","0","Bajo","No"/);
});

test('neutraliza fórmulas y caracteres de control iniciales en celdas CSV', () => {
  const csv = A.buildHistoryCsv(['=', '+', '-', '@', '\t', '\r'].map((prefix, index) => ({
    date: new Date(2026, 9, 25, 9, 5),
    subject: `${prefix}2+2`,
    sender: '',
    score: index,
    levelLabel: 'Bajo',
    exposed: false
  })));

  for (const unsafeValue of ["'=2+2", "'+2+2", "'-2+2", "'@2+2", "'\t2+2", "'\r2+2"]) {
    assert.ok(csv.includes(`"${unsafeValue}"`), `debe proteger ${JSON.stringify(unsafeValue)}`);
  }
});
