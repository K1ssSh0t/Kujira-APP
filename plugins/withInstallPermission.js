const { withAndroidManifest } = require("expo/config-plugins");

const INSTALL_PACKAGES_PERMISSION =
  "android.permission.REQUEST_INSTALL_PACKAGES";

/**
 * Permite que la app abra el instalador de APK en Android 8+.
 * Se agrega mediante config plugin porque android/ se regenera en cada
 * prebuild (y está en .gitignore).
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
