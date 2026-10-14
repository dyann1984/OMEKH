# OMEKH — Beyond Human Perception

Prototipo local-first de percepcion aumentada para hackathon y PWA movil. Incluye camara en vivo, espectro de audio local, reconocimiento de voz por turnos, narracion y adaptador de vision/audio con credenciales estrictamente del lado del servidor.

Para iniciar: `npm run dev`; para validar: `npm test`, `npm run lint`, `npm run build` y `npm run test:e2e`.

Consideraciones:
- Usa `localhost` o HTTPS para camara y microfono.
- Configura `OPENAI_API_KEY` solo en `.env.local`; sin ella la app sigue funcionando localmente y los endpoints IA devuelven 503 sin simular resultados.
- El build puede fallar con EPERM en el volumen `L:`; si ocurre, copia el proyecto a una ruta local con permisos normales y ejecuta `npm ci` y `npm run build`.

Consulta `ARCHITECTURE.md`, `LIMITATIONS.md`, `SECURITY_CONFIG.md` y `BUILD_VALIDATION.md`.