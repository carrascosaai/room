// Añade al target principal de iOS:
//  - native/ios/TaimoCaptureIntent.swift: acciones de Atajos y Siri («Apunta un gasto en Taimo»).
//    Los App Intents tienen que estar en el target de la app para que Atajos y Siri los vean.
//  - native/ios/AppShortcuts.xcstrings: las frases de Siri en cada idioma.
//  - native/ios/Localizable.xcstrings: lo que Siri pregunta y responde en cada idioma.
const fs = require('fs');
const path = require('path');
const { withInfoPlist, withXcodeProject, IOSConfig } = require('expo/config-plugins');

const SOURCES = ['TaimoCaptureIntent.swift'];
const RESOURCES = ['AppShortcuts.xcstrings', 'Localizable.xcstrings'];
// Idiomas de la app: iOS solo usa las traducciones de los idiomas que la app declara.
const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ca', 'eu', 'gl', 'nl', 'sv', 'nb', 'da', 'fi', 'pl', 'cs', 'ro', 'el', 'tr', 'uk'];

module.exports = function withTaimoAppIntent(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleLocalizations = LANGUAGES;
    return cfg;
  });
  return withXcodeProject(config, (cfg) => {
    const { projectRoot, platformProjectRoot, projectName } = cfg.modRequest;
    const project = cfg.modResults;
    for (const file of [...SOURCES, ...RESOURCES]) {
      fs.copyFileSync(path.join(projectRoot, 'native', 'ios', file), path.join(platformProjectRoot, projectName, file));
      const relative = `${projectName}/${file}`;
      if (project.hasFile(relative)) continue;
      if (SOURCES.includes(file)) {
        IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath: relative, groupName: projectName, project });
      } else {
        IOSConfig.XcodeUtils.addResourceFileToGroup({ filepath: relative, groupName: projectName, project, isBuildFile: true });
      }
    }
    // Para que Xcode sepa en qué idiomas está la app (las frases de Siri lo necesitan).
    const root = project.pbxProjectSection()[project.getFirstProject().uuid];
    root.knownRegions = [...new Set([...(root.knownRegions ?? []), ...LANGUAGES, 'Base'])];
    return cfg;
  });
};
