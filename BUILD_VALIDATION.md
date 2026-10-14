# Validación de build — Fase 2

## Hallazgo

npm run build en L:\OMEKH compila la aplicación y TypeScript, pero Next.js falla al crear directorios dentro de .next con errores EPERM como:

    EPERM: operation not permitted, mkdir 'L:\OMEKH\.next\static\chunks\next\dist\client'

La ruta de salida es relativa y válida. El mismo proyecto no falla por tipado ni por Webpack; el problema es la creación de carpetas en el volumen compartido L:.

## Verificación aislada

Se copió únicamente el contenido del proyecto, excluyendo node_modules, .next y archivos de compilación, a:

C:\Users\DYANN\.codex\visualizations\2026\10\13\01a13616-054f-7f00-a1b1-f9b1b6bb6362\omekh-build-validation

En esa copia:

1. npm ci terminó correctamente.
2. npm run build terminó con código 0.
3. Next generó /, /_not-found y la ruta dinámica /api/vision.

## Solución operativa

Mantén el código fuente en L:\OMEKH. Para un build de concurso desde este equipo, copia el proyecto a un directorio local con permisos normales, ejecuta npm ci y npm run build. No se modificaron ni eliminaron archivos ajenos a OMEKH.

La reducción de concurrencia de generación estática quedó en next.config.ts; disminuye presión de escritura, aunque no puede superar una restricción de permisos del volumen.
