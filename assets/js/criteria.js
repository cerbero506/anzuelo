/**
 * Anzuelo: catálogo de criterios (solo datos, sin lógica).
 * Editar este archivo permite ajustar pesos, marcas y listas sin tocar el motor.
 * Funciona en el navegador (window.AnzueloCriteria) y en Node (require).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AnzueloCriteria = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Grupos del checklist manual, en el orden en que se muestran. */
  const GROUPS = [
    { id: 'remitente', label: 'Remitente' },
    { id: 'contenido', label: 'Contenido del mensaje' },
    { id: 'enlaces', label: 'Enlaces y códigos QR' },
    { id: 'adjuntos', label: 'Archivos adjuntos' }
  ];

  /**
   * Señales que la persona observa en el correo.
   * points: aporte al puntaje (0-100). critical: eleva el nivel mínimo a "Alto".
   */
  const INDICATORS = [
    { id: 'r_inesperado', group: 'remitente', points: 10,
      label: 'No esperaba este correo o no conozco al remitente' },
    { id: 'r_nombre', group: 'remitente', points: 15,
      label: 'El nombre visible no coincide con la dirección de correo real',
      hint: 'Pasa el cursor o toca el nombre del remitente para ver la dirección completa.' },
    { id: 'r_gratuito', group: 'remitente', points: 20,
      label: 'Dice ser una empresa o entidad, pero escribe desde Gmail, Hotmail u otro correo gratuito' },

    { id: 'c_urgencia', group: 'contenido', points: 15,
      label: 'Presiona con urgencia o amenaza: bloqueo de cuenta, multa o plazo de pocas horas' },
    { id: 'c_credenciales', group: 'contenido', points: 30, critical: true,
      label: 'Pide tu contraseña, un código de verificación o los datos de tu tarjeta' },
    { id: 'c_pago', group: 'contenido', points: 30, critical: true,
      label: 'Pide un pago, una transferencia o cambiar la cuenta bancaria de un proveedor' },
    { id: 'c_premio', group: 'contenido', points: 15,
      label: 'Ofrece un premio, reembolso o devolución que no solicitaste' },
    { id: 'c_secreto', group: 'contenido', points: 15,
      label: 'Pide que lo mantengas en reserva o que no lo consultes con nadie' },
    { id: 'c_generico', group: 'contenido', points: 5,
      label: 'Usa un saludo genérico o tiene errores de redacción',
      hint: 'Señal débil: hoy muchos correos falsos se redactan sin errores.' },

    { id: 'e_no_coincide', group: 'enlaces', points: 20,
      label: 'El texto del enlace no coincide con la dirección que aparece al pasar el cursor' },
    { id: 'e_login', group: 'enlaces', points: 15,
      label: 'El enlace lleva a una página que pide iniciar sesión' },
    { id: 'e_qr', group: 'enlaces', points: 10,
      label: 'Incluye un código QR para escanear con el celular' },

    { id: 'a_inesperado', group: 'adjuntos', points: 10,
      label: 'Trae un adjunto que no esperabas: factura, orden de compra o comprobante' },
    { id: 'a_riesgoso', group: 'adjuntos', points: 25, critical: true,
      label: 'El adjunto es un programa, un comprimido o una página web (.exe, .zip, .rar, .iso, .js, .html)' },
    { id: 'a_macros', group: 'adjuntos', points: 30, critical: true,
      label: 'El documento pide “Habilitar edición” o “Habilitar contenido”' }
  ];

  /** Lo que la persona ya hizo. No cambia el puntaje: cambia las acciones. */
  const EXPOSURES = [
    { id: 'x_clic', label: 'Hice clic en el enlace' },
    { id: 'x_credenciales', label: 'Ingresé mi usuario o contraseña' },
    { id: 'x_adjunto', label: 'Abrí o descargué el adjunto' },
    { id: 'x_banco', label: 'Entregué datos bancarios o hice un pago' },
    { id: 'x_respondi', label: 'Respondí el correo' }
  ];

  /** Umbrales de nivel (límite inferior inclusivo). */
  const LEVELS = [
    { key: 'bajo', label: 'Bajo', min: 0 },
    { key: 'medio', label: 'Medio', min: 20 },
    { key: 'alto', label: 'Alto', min: 45 },
    { key: 'critico', label: 'Crítico', min: 70 }
  ];

  /**
   * Marcas que suelen suplantarse en Perú y en general.
   * domains: dominios oficiales. keywords: nombres a buscar dentro de dominios sospechosos.
   */
  const BRANDS = [
    { name: 'BCP', domains: ['viabcp.com'], keywords: ['viabcp', 'bcp'] },
    { name: 'Interbank', domains: ['interbank.pe'], keywords: ['interbank'] },
    { name: 'BBVA', domains: ['bbva.pe', 'bbva.com'], keywords: ['bbva'] },
    { name: 'Scotiabank', domains: ['scotiabank.com.pe', 'scotiabank.com'], keywords: ['scotiabank'] },
    { name: 'BanBif', domains: ['banbif.com.pe'], keywords: ['banbif'] },
    { name: 'Yape', domains: ['yape.com.pe'], keywords: ['yape'] },
    { name: 'SUNAT', domains: ['sunat.gob.pe'], keywords: ['sunat'] },
    { name: 'Mercado Libre', domains: ['mercadolibre.com.pe', 'mercadolibre.com', 'mercadopago.com.pe', 'mercadopago.com'], keywords: ['mercadolibre', 'mercadopago'] },
    { name: 'UPC', domains: ['upc.edu.pe'], keywords: ['upc'] },
    { name: 'Microsoft', domains: ['microsoft.com', 'microsoftonline.com', 'office.com', 'office365.com', 'sharepoint.com', 'onedrive.com', 'outlook.com', 'outlook.es', 'hotmail.com', 'hotmail.es', 'live.com'], keywords: ['microsoft', 'office365', 'outlook', 'sharepoint', 'onedrive', 'hotmail'] },
    { name: 'Google', domains: ['google.com', 'google.com.pe', 'gmail.com', 'googlemail.com', 'googleapis.com', 'googleusercontent.com', 'gstatic.com'], keywords: ['google', 'gmail'] },
    { name: 'Apple', domains: ['apple.com', 'icloud.com'], keywords: ['apple', 'icloud'] },
    { name: 'PayPal', domains: ['paypal.com'], keywords: ['paypal'] },
    { name: 'Amazon', domains: ['amazon.com'], keywords: ['amazon'] },
    { name: 'Netflix', domains: ['netflix.com'], keywords: ['netflix'] },
    { name: 'DHL', domains: ['dhl.com'], keywords: ['dhl'] }
  ];

  /** Sufijos cuyo registro está restringido a instituciones; no se evalúan como imitación. */
  const TRUSTED_SUFFIXES = ['gob.pe', 'mil.pe', 'edu.pe'];

  /** Proveedores de correo gratuito. */
  const FREE_MAIL = [
    'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es',
    'live.com', 'yahoo.com', 'yahoo.es', 'icloud.com', 'aol.com', 'proton.me',
    'protonmail.com', 'gmx.com', 'mail.com', 'yandex.com'
  ];

  /** Acortadores que ocultan el destino real. */
  const SHORTENERS = [
    'bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd', 'ow.ly', 'rebrand.ly',
    'shorturl.at', 'tiny.cc', 'rb.gy', 'buff.ly', 'goo.su', 's.id', 'v.gd', 't.ly'
  ];

  /** Servicios de alojamiento gratuito o en la nube usados con frecuencia para páginas falsas. */
  const HOSTING = [
    'amazonaws.com', 'blob.core.windows.net', 'web.core.windows.net', 'firebaseapp.com',
    'web.app', 'github.io', 'netlify.app', 'vercel.app', 'pages.dev', 'workers.dev',
    'glitch.me', 'wixsite.com', 'weebly.com', '000webhostapp.com', 'ngrok.io',
    'ngrok-free.app', 'r2.dev', 'onrender.com', 'replit.app'
  ];

  /** Extensiones de dominio frecuentes en campañas maliciosas (heurística, no prueba). */
  const RISKY_TLDS = [
    'zip', 'mov', 'xyz', 'top', 'click', 'country', 'gq', 'tk', 'ml', 'cf', 'ga',
    'work', 'support', 'rest', 'cam', 'icu', 'monster', 'cyou', 'sbs', 'buzz', 'lat'
  ];

  /** Sufijos de dos niveles para calcular el dominio registrable. */
  const MULTI_SUFFIXES = [
    'com.pe', 'gob.pe', 'edu.pe', 'org.pe', 'net.pe', 'nom.pe', 'mil.pe',
    'com.ar', 'com.mx', 'com.co', 'gov.co', 'com.br', 'com.ec', 'com.bo', 'com.cl',
    'co.uk', 'org.uk', 'com.es', 'com.au', 'co.jp'
  ];

  /** Palabras en la ruta que sugieren una página de acceso o verificación. */
  const PATH_KEYWORDS = /(login|signin|sign-in|logon|verify|verific|validar|actualiz|update|secure|seguridad|cuenta|account|password|contrasen|banca|token|confirm|desbloque|unlock)/i;

  /** Sustituciones visuales comunes (homoglifos ASCII). */
  const HOMOGLYPHS = [
    ['rn', 'm'], ['vv', 'w'], ['0', 'o'], ['1', 'l'], ['3', 'e'], ['4', 'a'],
    ['5', 's'], ['7', 't'], ['8', 'b'], ['@', 'a'], ['$', 's']
  ];

  /** Puntos de los hallazgos automáticos. */
  const FINDING_POINTS = {
    u_esquema: 20, u_ip: 20, u_punycode: 20, u_userinfo: 20, u_acortador: 15, u_imita: 30,
    u_hosting: 10, u_tld: 10, u_subdominios: 10, u_puerto: 10, u_http: 5,
    u_guiones: 5, u_largo: 5, u_palabras: 5,
    s_imita: 30, s_nombre_marca: 20, s_punycode: 20, s_tld: 10, s_gratuito: 5
  };

  /** Hallazgos automáticos que elevan el nivel mínimo a "Alto". */
  const CRITICAL_FINDINGS = ['u_imita', 's_imita'];

  /** Qué hacer según el nivel. Los pasos se muestran en orden. */
  const RECOMMENDATIONS = {
    bajo: {
      summary: 'No se detectaron señales relevantes.',
      steps: [
        'Si el correo te pide algo fuera de lo habitual, confírmalo con el remitente por un canal que ya conozcas.',
        'Ante la duda, consulta con el área de TI antes de actuar.'
      ]
    },
    medio: {
      summary: 'Hay señales de alerta. Trátalo con cuidado hasta verificarlo.',
      steps: [
        'No abras enlaces ni adjuntos todavía.',
        'Verifica con el supuesto remitente usando un teléfono o correo que ya tengas, no los datos de este mensaje.',
        'Si necesitas entrar al servicio, escribe tú mismo la dirección oficial en el navegador.'
      ]
    },
    alto: {
      summary: 'Es probable que sea phishing.',
      steps: [
        'No hagas clic, no respondas y no lo reenvíes a tus compañeros.',
        'Copia o descarga el reporte y envíalo al área de TI o de seguridad.',
        'Usa la opción “Reportar phishing” o “Marcar como spam” de tu correo.',
        'Elimina el mensaje después de reportarlo.'
      ]
    },
    critico: {
      summary: 'Phishing casi seguro. Repórtalo hoy mismo.',
      steps: [
        'No interactúes con el mensaje de ninguna forma.',
        'Copia o descarga el reporte y envíalo de inmediato al área de TI o de seguridad.',
        'Usa la opción “Reportar phishing” o “Marcar como spam” de tu correo.',
        'Avisa a tu equipo si sospechas que el mismo correo llegó a más personas.',
        'Elimina el mensaje después de reportarlo.'
      ]
    }
  };

  /** Acciones urgentes si la persona ya interactuó, ordenadas por prioridad. */
  const EXPOSURE_ACTIONS = [
    { id: 'x_adjunto', text: 'Desconecta el equipo de la red (Wi-Fi o cable), no lo apagues y llama a TI.' },
    { id: 'x_credenciales', text: 'Cambia tu contraseña ahora desde el sitio oficial (escribe la dirección tú mismo), activa la verificación en dos pasos y cámbiala también donde uses la misma.' },
    { id: 'x_banco', text: 'Llama de inmediato a tu banco a su número oficial para bloquear la tarjeta o la operación.' },
    { id: 'x_clic', text: 'Cierra la página que se abrió y avisa a TI indicando la hora aproximada del clic.' },
    { id: 'x_respondi', text: 'No continúes la conversación e informa a TI qué datos compartiste.' }
  ];

  return {
    GROUPS, INDICATORS, EXPOSURES, LEVELS, BRANDS, FREE_MAIL, SHORTENERS, HOSTING,
    TRUSTED_SUFFIXES, RISKY_TLDS, MULTI_SUFFIXES, PATH_KEYWORDS, HOMOGLYPHS, FINDING_POINTS, CRITICAL_FINDINGS,
    RECOMMENDATIONS, EXPOSURE_ACTIONS
  };
});
