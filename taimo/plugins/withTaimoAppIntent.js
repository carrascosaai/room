// Añade native/ios/TaimoCaptureIntent.swift al target principal de iOS.
// Los App Intents tienen que estar en el target de la app para que Atajos los vea.
const fs = require('fs');
const path = require('path');
const { withXcodeProject, IOSConfig } = require('expo/config-plugins');

const FILE = 'TaimoCaptureIntent.swift';

module.exports = function withTaimoAppIntent(config) {
  return withXcodeProject(config, (cfg) => {
    const { projectRoot, platformProjectRoot, projectName } = cfg.modRequest;
    const src = path.join(projectRoot, 'native', 'ios', FILE);
    const dest = path.join(platformProjectRoot, projectName, FILE);
    fs.copyFileSync(src, dest);

    const project = cfg.modResults;
    const relative = `${projectName}/${FILE}`;
    if (!project.hasFile(relative)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath: relative, groupName: projectName, project });
    }
    return cfg;
  });
};
