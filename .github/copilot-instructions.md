# Instrucciones para Copilot

1. Sitio estático: HTML, CSS y JS sin dependencias, sin CDN y sin peticiones de red. Respeta la CSP `connect-src 'none'`.
2. Inserta texto del usuario solo con `textContent`, nunca con `innerHTML`.
3. Mantén la interfaz y los mensajes en español, con un tono claro para personas no técnicas.
4. Mantén la separación: pesos y listas en `criteria.js`, lógica pura en `analyzer.js`, historial en `storage.js` y DOM solo en `app.js`.
5. Todo cambio en `analyzer.js` lleva pruebas y debe dejar `npm test` en verde.
6. No configures Playwright ni otras herramientas externas. Las pruebas en navegador se hacen con el navegador integrado.
