# Actualizaciones Android

Este módulo implementa el updater de Kujira para Android. Consulta los
releases de GitHub, descarga el APK y abre el instalador de Android. La
instalación siempre la confirma el usuario: Android no permite instalar en
silencio desde una app normal.

## Contrato de actualización

Para que Android trate el APK como una actualización de la app existente y no
como una app aparte, el release tiene que cumplir **las cuatro condiciones**:

1. Mismo package: `com.anonymous.KujiraAPP`.
2. Misma firma que el APK instalado. Hoy se usa el keystore debug de Expo.
3. `versionCode` mayor que el de la app instalada. El CI usa
   `github.run_number`, con mínimo 2.
4. Nombre de asset exacto: `kujira-app-vX.Y.Z.apk`.

El workflow `.github/workflows/release.yml` verifica firma, package,
`versionName` y `versionCode` antes de crear el release. Si cualquiera cambia,
el release no se publica.

## Flujo

```
inicio / volver a primer plano
        |
        v
  ¿pasaron 24 h? --no--> esperar
        | sí
        v
  consultar GitHub Releases
        |
        +--> sin versión nueva --> up-to-date
        |
        +--> versión nueva --> available
                                  |
                                  +--> auto-download (si está activo)
                                  |       |
                                  |       v
                                  |   downloading
                                  |       |
                                  |       v
                                  |   ready --> abrir instalador
                                  |
                                  +--> descarga manual --> ready
```

- `ready` significa que el APK está descargado y validado; no significa que ya
  esté instalado.
- Si el usuario cancela el instalador, la tarjeta ofrece **Instalar
  actualización** de nuevo.
- Si Android bloquea la instalación por apps desconocidas, la tarjeta ofrece
  **Abrir ajustes de instalación**.
- La descarga se hace a un archivo `.part`. Solo se renombra al `.apk` final
  después de verificar que el tamaño coincide con el asset de GitHub. Así una
  descarga interrumpida nunca se confunde con un APK listo.
- Al iniciar se limpian APKs viejos y `.part`; se conserva únicamente el APK
  pendiente que se va a instalar.

## Persistencia

Se usa AsyncStorage con estas claves:

- `@kujira/updater/auto-check`: buscar automáticamente (`1`/`0`).
- `@kujira/updater/auto-download`: descargar automáticamente (`1`/`0`).
- `@kujira/updater/wifi-only`: limitar el auto-download a Wi-Fi (`1`/`0`).
- `@kujira/updater/last-check`: timestamp del último chequeo exitoso.
- `@kujira/updater/pending-release`: JSON del último release detectado.

La descarga manual funciona con datos móviles aunque `wifi-only` esté activo.
El auto-download respeta la preferencia de Wi-Fi.

## Archivos

- `config.ts`: constantes, repositorio, intervalo y claves de storage.
- `types.ts`: modelos de GitHub, release normalizado y estados del updater.
- `github.ts`: consulta a la API, semver, selección del APK y formato de tamaño.
- `install.ts`: descarga atómica, caché, FileProvider e intent del instalador.
- `useUpdater.tsx`: provider global, máquina de estados, preferencias,
  persistencia y automatizaciones.
- `components/UpdateCard.tsx`: UI de la tarjeta en Config.

## Publicación

### Primera build con updater

La app `1.5.0` no tiene updater, así que **`v1.6.0` se instala una vez a mano**
descargando el APK desde GitHub Releases. Esa instalación debe ser una
actualización in-place sobre la app existente, no una app nueva.

### Siguientes versiones

Para publicar, por ejemplo, `1.6.1`:

1. Actualizar `version` en `app.json` y `package.json`.
2. Commit y push a `master`.
3. Crear y pushear el tag `v1.6.1`.
4. El workflow compila, valida y publica `kujira-app-v1.6.1.apk`.
5. En el teléfono, abrir **Config → Actualizaciones** y usar **Buscar de
   nuevo** si el último chequeo fue hace menos de 24 h.

También se puede ejecutar el workflow manualmente con `version: 1.6.1`; en ese
caso el workflow crea el tag. Elegir **una sola** vía para evitar dos builds de
la misma versión.

## Requisitos externos

- El repositorio `K1ssSh0t/Kujira-APP` debe ser público. La API de GitHub se
  consulta sin token y un repo privado devuelve 404.
- La app tiene que haberse instalado desde el APK oficial con el package y la
  firma correctos. Una build local con otro package o firma no se puede
  actualizar in-place.
- El primer APK con updater se instala manualmente.

## Seguridad

La firma actual es el keystore debug de Expo. Es una clave pública: la
seguridad del updater depende de la cuenta y del repositorio de GitHub. Para
eliminar ese riesgo hay que migrar a una keystore de release privada; eso
implica una reinstalación manual una vez porque la firma cambia.

## Checklist de prueba

- [ ] Instalar `v1.6.0` sobre la app publicada anterior y verificar que los
      datos siguen ahí.
- [ ] Publicar `v1.6.1`.
- [ ] Abrir la app y forzar **Buscar de nuevo**.
- [ ] Probar descarga por Wi-Fi y descarga manual con datos móviles.
- [ ] Cancelar el instalador y verificar que **Instalar actualización**
      reaparece.
- [ ] Instalar y verificar que la app se actualiza in-place y conserva datos.
- [ ] Probar el flujo de apps desconocidas desde **Abrir ajustes de
      instalación**.
