const { withXcodeProject } = require('@expo/config-plugins');

const PACKAGES = [
  {
    product: 'SwiftTerm',
    repositoryURL: 'https://github.com/migueldeicaza/SwiftTerm.git',
    version: '1.19.0',
  },
  {
    product: 'Citadel',
    repositoryURL: 'https://github.com/orlandos-nl/Citadel.git',
    version: '0.12.1',
  },
  {
    product: 'NIOSSH',
    repositoryURL: 'https://github.com/Wellz26/swift-nio-ssh.git',
    version: '0.3.7',
  },
  {
    product: 'NIO',
    repositoryURL: 'https://github.com/apple/swift-nio.git',
    version: '2.102.0',
  },
  {
    product: 'Crypto',
    repositoryURL: 'https://github.com/apple/swift-crypto.git',
    version: '3.15.1',
  },
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
  const packageReferences = section(project, 'XCRemoteSwiftPackageReference');
  const productDependencies = section(project, 'XCSwiftPackageProductDependency');
  const buildFiles = section(project, 'PBXBuildFile');

  const projectId = findObjectId(projects, () => true);
  const nativeTarget = targets[targetId];
  const frameworkPhase = frameworkPhases[frameworkPhaseId];
  const rootProject = projects[projectId];

  rootProject.packageReferences ??= [];
  nativeTarget.packageProductDependencies ??= [];
  frameworkPhase.files ??= [];

  let packageId = findObjectId(
    packageReferences,
    (item) => item.repositoryURL === `\"${spec.repositoryURL}\"`,
  );
  if (!packageId) {
    packageId = project.generateUuid();
    packageReferences[packageId] = {
      isa: 'XCRemoteSwiftPackageReference',
      repositoryURL: `\"${spec.repositoryURL}\"`,
      requirement: {
        kind: 'exactVersion',
        version: spec.version,
      },
    };
    packageReferences[`${packageId}_comment`] = `XCRemoteSwiftPackageReference \"${spec.product}\"`;
  }
  ensureListEntry(
    rootProject.packageReferences,
    packageId,
    `XCRemoteSwiftPackageReference \"${spec.product}\"`,
  );

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

    for (const spec of PACKAGES) {
      addPackage(project, targetId, frameworkPhase.value, spec);
    }
    return config;
  });
};
