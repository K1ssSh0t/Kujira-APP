const { withAndroidManifest } = require("expo/config-plugins");

const INSTALL_PACKAGES_PERMISSION =
  "android.permission.REQUEST_INSTALL_PACKAGES";

/**
 * Permite que la app abra el instalador de APK en Android 8+.
 *
 * `REQUEST_INSTALL_PACKAGES` es un permiso especial: no se concede con el
 * diálogo runtime normal, sino desde "Instalar apps desconocidas" en los
 * ajustes del sistema. El updater ofrece un atajo a esa pantalla.
 *
 * Se agrega mediante un config plugin porque android/ se regenera en cada
 * prebuild y está en .gitignore. El plugin es idempotente: no duplica el
 * permiso si Expo ya lo hubiera agregado.
 */
module.exports = function withInstallPermission(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const manifest = configWithManifest.modResults.manifest;
    const permissions = manifest["uses-permission"] ?? [];

    const alreadyPresent = permissions.some(
      (permission) =>
        permission?.$?.["android:name"] === INSTALL_PACKAGES_PERMISSION,
    );

    if (!alreadyPresent) {
      permissions.push({
        $: { "android:name": INSTALL_PACKAGES_PERMISSION },
      });
    }

    manifest["uses-permission"] = permissions;
    return configWithManifest;
  });
};
