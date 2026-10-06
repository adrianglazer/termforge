const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');

const fs = require('node:fs');
const path = require('node:path');
const { writeNotices } = require('../scripts/release-notices');
const nativeLock = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../native/Package.resolved'), 'utf8'),
);
const products = {
  swiftterm: 'SwiftTerm',
  citadel: 'Citadel',
  'swift-nio-ssh': 'NIOSSH',
  'swift-nio': 'NIO',
  'swift-crypto': 'Crypto',
  'swift-log': 'Logging',
};
const PACKAGES = [
  ...nativeLock.pins.map((pin) => ({
    product: products[pin.identity],
    repositoryURL: pin.location,
    version: pin.state.version,
    identity: pin.identity,
  })),
  { product: 'Citadel', identity: 'citadel', localPath: '../native/Vendor/Citadel' },
  { product: 'Crypto', identity: 'swift-crypto', localPath: '../native/Vendor/swift-crypto' },
];

function section(project, name) {
  const objects = project.hash.project.objects;
  objects[name] ??= {};
  return objects[name];
}

function findObjectId(objects, predicate) {
  return Object.keys(objects).find((key) => !key.endsWith('_comment') && predicate(objects[key]));
}

function ensureListEntry(list, value, comment) {
  if (!list.some((entry) => entry.value === value)) {
    list.push({ value, comment });
  }
}

function addPackage(project, targetId, frameworkPhaseId, spec) {
  const projects = section(project, 'PBXProject');
  const targets = section(project, 'PBXNativeTarget');
  const frameworkPhases = section(project, 'PBXFrameworksBuildPhase');
  const referenceType = spec.localPath
    ? 'XCLocalSwiftPackageReference'
    : 'XCRemoteSwiftPackageReference';
  const packageReferences = section(project, referenceType);
  const productDependencies = section(project, 'XCSwiftPackageProductDependency');
  const buildFiles = section(project, 'PBXBuildFile');

  const projectId = findObjectId(projects, () => true);
  const nativeTarget = targets[targetId];
  const frameworkPhase = frameworkPhases[frameworkPhaseId];
  const rootProject = projects[projectId];

  rootProject.packageReferences ??= [];
  nativeTarget.packageProductDependencies ??= [];
  frameworkPhase.files ??= [];

  let packageId = findObjectId(packageReferences, (item) =>
    spec.localPath
      ? item.relativePath === `\"${spec.localPath}\"`
      : item.repositoryURL === `\"${spec.repositoryURL}\"`,
  );
  if (!packageId) {
    packageId = project.generateUuid();
    packageReferences[packageId] = spec.localPath
      ? { isa: referenceType, relativePath: `\"${spec.localPath}\"` }
      : {
          isa: referenceType,
          repositoryURL: `\"${spec.repositoryURL}\"`,
          requirement: {
            kind: 'exactVersion',
            version: spec.version,
          },
        };
    packageReferences[`${packageId}_comment`] =
      `${referenceType} \"${spec.product || spec.identity}\"`;
  }
  if (!spec.localPath)
    packageReferences[packageId].requirement = { kind: 'exactVersion', version: spec.version };
  if (spec.localPath) {
    const remote = section(project, 'XCRemoteSwiftPackageReference');
    for (const id of Object.keys(remote)) {
      const replaced = spec.identity === 'citadel'
        ? 'https://github.com/orlandos-nl/Citadel.git'
        : 'https://github.com/apple/swift-crypto.git';
      if (remote[id]?.repositoryURL === `"${replaced}"`) {
        rootProject.packageReferences = rootProject.packageReferences.filter(
          (item) => item.value !== id,
        );
        delete remote[id];
        delete remote[`${id}_comment`];
      }
    }
  }
  ensureListEntry(
    rootProject.packageReferences,
    packageId,
    `${referenceType} \"${spec.product || spec.identity}\"`,
  );

  // Pin transitives without linking products the app does not use.
  if (!spec.product) return;

  let productId = findObjectId(productDependencies, (item) => item.productName === spec.product);
  if (!productId) {
    productId = project.generateUuid();
    productDependencies[productId] = {
      isa: 'XCSwiftPackageProductDependency',
      package: packageId,
      productName: spec.product,
    };
    productDependencies[`${productId}_comment`] = spec.product;
  }
  productDependencies[productId].package = packageId;
  ensureListEntry(nativeTarget.packageProductDependencies, productId, spec.product);

  let buildFileId = findObjectId(buildFiles, (item) => item.productRef === productId);
  if (!buildFileId) {
    buildFileId = project.generateUuid();
    buildFiles[buildFileId] = {
      isa: 'PBXBuildFile',
      productRef: productId,
    };
    buildFiles[`${buildFileId}_comment`] = `${spec.product} in Frameworks`;
  }
  ensureListEntry(frameworkPhase.files, buildFileId, `${spec.product} in Frameworks`);
}

module.exports = function withTermforgeNativePackages(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const target = project.getFirstTarget();
    const targetId = target.uuid;
    const nativeTarget = target.firstTarget;
    const frameworkPhase = nativeTarget.buildPhases.find((phase) => phase.comment === 'Frameworks');

    if (!frameworkPhase) {
      throw new Error('Termforge could not locate the iOS Frameworks build phase.');
    }

    // Xcode must use the reviewed revisions as well as exact version constraints.
    const directory = path.join(
      config.modRequest.platformProjectRoot,
      `${config.modRequest.projectName}.xcworkspace`,
      'xcshareddata',
      'swiftpm',
    );
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, 'Package.resolved'),
      JSON.stringify({ version: 2, pins: nativeLock.pins }, null, 2) + '\n',
    );
    writeNotices(
      config.modRequest.projectRoot,
      path.join(config.modRequest.platformProjectRoot, 'TermforgeAcknowledgements.txt'),
    );
    IOSConfig.XcodeUtils.addResourceFileToGroup({
      filepath: 'TermforgeAcknowledgements.txt',
      groupName: config.modRequest.projectName,
      project,
      isBuildFile: true,
    });
    const noticeRef = Object.values(section(project, 'PBXFileReference')).find(
      (item) => item.path === '"TermforgeAcknowledgements.txt"',
    );
    if (!noticeRef) throw new Error('Release acknowledgement resource is missing.');
    noticeRef.lastKnownFileType = 'text';
    noticeRef.fileEncoding = 4;
    delete noticeRef.explicitFileType;
    for (const spec of PACKAGES) {
      addPackage(project, targetId, frameworkPhase.value, spec);
    }
    return config;
  });
};
