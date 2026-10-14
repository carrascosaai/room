/** Widget de la pantalla de inicio de iPhone (lo crea @bacons/apple-targets al hacer prebuild). */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'TaimoWidget',
  icon: '../../assets/icon.png',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
