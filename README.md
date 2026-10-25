# Anzuelo: triaje de correos sospechosos

Aplicación web que ayuda a cualquier colaborador a decidir, en dos minutos y sin conocimientos técnicos, si un correo es phishing y qué hacer a continuación. Genera un reporte listo para enviar al área de TI.

| Entregable | Enlace |
|---|---|
| Aplicación (GitHub Pages) | https://cerbero506.github.io/anzuelo/ |
| Video demostrativo (≤ 1 min) | `<enlace al video>` ← completar |
| Evidencia de uso de GitHub Copilot | [COPILOT.md](COPILOT.md) |

---

## 1. Caso de uso

### Contexto
**Distribuidora Andina S.A.C.** (empresa simulada) es una pyme de Lima con unos 40 colaboradores administrativos en contabilidad, compras, ventas y recursos humanos. Su área de TI tiene dos personas. Todos usan correo corporativo y banca por internet a diario.

### Problema
El personal recibe con frecuencia correos que suplantan a bancos, a la SUNAT, a servicios como Microsoft 365 y a proveedores reales. Hoy ocurre lo siguiente:

- **No hay un criterio común.** Cada persona decide por intuición si un correo es falso. Algunas hacen clic; otras reenvían a TI correos legítimos.
- **Los reportes llegan sin información útil.** TI recibe mensajes como "¿esto es virus?", sin remitente, sin enlace y sin saber si el colaborador ya interactuó.
- **La respuesta llega tarde.** Cuando alguien ya ingresó su contraseña o abrió un adjunto, nadie le dice qué hacer primero.

### Usuario objetivo
- **Principal:** colaboradores no técnicos que reciben correos sospechosos (administración, contabilidad, compras, RR. HH.).
- **Secundario:** el área de TI o seguridad, que recibe reportes estandarizados y priorizados.

### Objetivo de la solución
Dar a cada colaborador una forma rápida, guiada y uniforme de evaluar un correo sospechoso, obtener un nivel de riesgo explicable, saber exactamente qué hacer y enviar a TI un reporte completo y seguro.

### Solución propuesta
Anzuelo guía a la persona: copiar los datos del correo (sin abrir el enlace), revisar las señales sugeridas en el texto, marcar manualmente lo que observa e indicar si ya interactuó. La aplicación combina esas respuestas con una revisión automática del remitente y del enlace, calcula un puntaje de 0 a 100, asigna un nivel (Bajo, Medio, Alto o Crítico) y muestra las acciones a seguir. Todo ocurre en el navegador: ningún dato sale del equipo.

## 2. Funcionalidades principales

1. **Checklist guiado de 15 señales** en cuatro grupos (remitente, contenido, enlaces/QR, adjuntos), cada una con su peso visible.
2. **Revisión orientativa del texto pegado:** busca frases explícitas en español e inglés sobre urgencia, credenciales, pagos, adjuntos, macros, premios y secreto. Muestra fragmentos y motivos para revisar; la persona confirma manualmente cualquier señal en el checklist. No altera el puntaje por sí sola.
3. **Revisión automática del remitente:** detecta correos gratuitos, dominios que imitan marcas (BCP, Interbank, SUNAT, Microsoft, etc.) y nombres visibles que mencionan una marca desde otro dominio.
4. **Revisión automática del enlace sin abrirlo:** IP en lugar de dominio, acortadores, caracteres especiales (punycode), uso de `@` para ocultar el destino, subdominios excesivos, puertos inusuales, hosting gratuito, extensiones riesgosas y typosquatting.
5. **Protección contra fraude al proveedor / "fraude del CEO":** opcionalmente se registra el dominio de la organización y se detectan dominios que lo imitan.
6. **Puntaje y nivel de riesgo explicables:** medidor visual, principales motivos y regla de señal crítica.
7. **Acciones según el nivel y según la interacción:** si la persona ya hizo clic, ingresó credenciales o abrió un adjunto, aparecen primero las acciones urgentes.
8. **Reporte para TI:** se copia o descarga como `.txt`, con enlaces y correos desactivados (`hxxp`, `[.]`, `[@]`) para evitar clics accidentales.
9. **Historial local:** guarda hasta 50 evaluaciones en el navegador para volver a copiar un reporte o descargarlas como CSV UTF-8.
10. **Accesible y adaptable:** navegación por teclado, lectores de pantalla, modo oscuro automático, diseño móvil con barra de resultado fija y tipografía de alta legibilidad.

## 3. Cómo se evalúa

| Componente | Regla |
|---|---|
| Señales observadas | Cada una suma entre 5 y 30 puntos. |
| Revisión automática | Cada hallazgo suma entre 5 y 30 puntos. |
| Texto pegado | Sugiere señales con frases coincidentes, pero no suma puntos hasta que la persona confirme manualmente en el checklist. |
| Puntaje | Suma total, con tope de 100. |
| Niveles | Bajo: 0-19. Medio: 20-44. Alto: 45-69. Crítico: 70-100. |
| Señal crítica | Pedir credenciales o pagos, adjuntos ejecutables, macros o un dominio que imita una marca elevan el nivel a **Alto como mínimo**, aunque el puntaje sea menor. |
| Interacción | No cambia el puntaje (probabilidad de phishing); cambia las acciones (impacto). |

**Decisiones de diseño:**
- La regla de señal crítica evita que un correo que solo pide la contraseña quede en "Medio" por sumar pocos puntos.
- "Errores de redacción" pesa solo 5 puntos porque, con IA generativa, muchos correos falsos ya no tienen errores (CISA).
- Se separa probabilidad (puntaje) de impacto (interacción) para no confundir "qué tan falso parece" con "qué tan urgente es actuar".
- Los pesos, marcas, listas y patrones de texto viven en `assets/js/criteria.js` y se ajustan sin tocar la lógica.
- El análisis del texto se limita a los primeros 20 000 caracteres y usa reglas explícitas; no entiende el contexto completo y puede equivocarse.

Fundamento de las señales: [INCIBE, guía para identificar correos fraudulentos](https://www.incibe.es/empresas/blog/busca-otro-al-enganar-yo-no-voy-picar) y [CISA, Recognize and Report Phishing](https://www.cisa.gov/secure-our-world/recognize-and-report-phishing).

## 4. Estructura del proyecto

```
anzuelo/
├── index.html                  Estructura de la interfaz
├── package.json                Scripts de prueba y servidor local
├── LICENSE                     Licencia MIT
├── .gitignore                  Archivos excluidos de Git
├── .github/
│   ├── copilot-instructions.md Instrucciones del agente para este repositorio
│   └── workflows/
│       └── pages.yml           Pruebas y despliegue en GitHub Pages
├── assets/
│   ├── css/
│   │   └── styles.css          Estilos (tokens de color, modo oscuro, responsive)
│   ├── fonts/                  Atkinson Hyperlegible Next y licencia OFL
│   └── js/
│       ├── criteria.js         Datos: señales, pesos, marcas, listas, recomendaciones y patrones de texto
│       ├── analyzer.js         Lógica: análisis, puntaje, reportes y formato CSV
│       ├── storage.js          Historial en localStorage con respaldo en memoria
│       └── app.js              Interfaz: eventos y renderizado
├── tests/
│   └── analyzer.test.js        Pruebas del motor y del CSV (node:test, sin dependencias)
├── COPILOT.md                  Uso de GitHub Copilot: pasos del workshop y bitácora de evidencia
└── docs/
    ├── guion-video.md          Guion del video
    └── capturas/               Capturas de evidencia
```

Arquitectura: sitio estático en HTML, CSS y JavaScript sin frameworks ni dependencias en tiempo de ejecución, como propone el workshop *Copilot App*. El motor (`analyzer.js`) no toca el DOM, lo que permite probarlo con Node.

## 5. Ejecución

**Opción 1, sin instalar nada:** descarga el repositorio y abre `index.html` en el navegador.

**Opción 2, servidor local (recomendado para probar como en GitHub Pages):**
```bash
git clone https://github.com/cerbero506/anzuelo.git
cd anzuelo
python3 -m http.server 8080      # luego abre http://localhost:8080
```
En VS Code también puedes usar la extensión *Live Server*.

**Pruebas (requiere Node 18 o superior):**
```bash
npm test
```

**Uso rápido:** pulsa **Cargar un ejemplo** para ver una evaluación completa de un caso ficticio.

## 6. Publicación en GitHub Pages

1. En el repositorio: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
2. Haz push a `main`. El workflow `pages.yml` ejecuta las pruebas y, si pasan, publica solo `index.html` y `assets/`.
3. Revisa la pestaña **Actions** hasta ver el despliegue en verde y abre la URL que muestra.

## 7. Uso de GitHub Copilot

El detalle de cada interacción, las sugerencias aceptadas, modificadas o rechazadas y las capturas están en **[COPILOT.md](COPILOT.md)**. Resumen:

| Tipo de apoyo | Tarea en este proyecto | Decisión tomada |
|---|---|---|
| Explicación | ← completar | ← completar |
| Implementación | ← completar (issue #1) | ← completar |
| Planificación (Plan mode) | ← completar (issue #2) | ← completar |
| Corrección de errores | ← completar | ← completar |
| Refactorización | ← completar | ← completar |
| Documentación | ← completar | ← completar |

Se usó **GitHub Copilot Free**; se omitió la revisión automática de pull requests de Copilot (no incluida en Free) y se reemplazó por revisión manual, como indica el workshop.

## 8. Seguridad y privacidad

- **Sin conexión a servidores:** la política de seguridad de contenido (`connect-src 'none'`) impide cualquier petición de red desde la página. No hay analítica, CDN ni fuentes externas.
- **Sin inyección de HTML:** todo el texto del usuario, incluidos los fragmentos detectados, se inserta con `textContent`.
- **Enlaces desactivados** en reportes, historial y exportaciones CSV.
- **Datos locales:** el historial y el dominio de la organización se guardan solo en `localStorage` del navegador.
- **Texto del mensaje:** se analiza solo en memoria, hasta 20 000 caracteres; no se guarda en el historial ni se incluye en reportes.

## 9. Limitaciones

- Es una herramienta heurística de apoyo; no reemplaza al equipo de seguridad. Puede haber falsos positivos y falsos negativos.
- Las sugerencias sobre el cuerpo del mensaje reconocen frases concretas, no el contexto ni la intención; confirma cada señal antes de marcarla.
- No analiza cabeceras del correo (SPF, DKIM, DMARC) ni consulta listas de reputación en línea; esto es intencional para no enviar datos fuera del navegador.
- Las listas de marcas, acortadores y extensiones son estáticas y deben mantenerse.

## 10. Trabajo futuro

- Modo de práctica con correos de entrenamiento.

## 11. Declaración de uso de IA

<!-- Ajusta este texto a la política del curso. -->
La estructura base del proyecto se elaboró con apoyo de un asistente de IA. GitHub Copilot se utilizó durante el desarrollo según lo documentado en [COPILOT.md](COPILOT.md). Las decisiones de diseño, la revisión del código y la validación del funcionamiento son responsabilidad del autor.

## Créditos y licencia

- Autor: Cristian Andrés Quispe Astete, Universidad Peruana de Ciencias Aplicadas (UPC).
- Workshop de referencia: [GitHub Copilot app tour](https://github-samples.github.io/copilot-workshops/first-steps/copilot-app/) (MIT).
- Tipografía: [Atkinson Hyperlegible Next](https://github.com/googlefonts/atkinson-hyperlegible-next), SIL Open Font License 1.1.
- Código bajo licencia [MIT](LICENSE). Caso de uso y empresa simulados con fines académicos.
