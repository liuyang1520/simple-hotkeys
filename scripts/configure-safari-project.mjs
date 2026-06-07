import { readFile, writeFile } from 'node:fs/promises';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const marketingVersion = packageJson.version;
const buildNumber = process.env.SAFARI_BUILD_NUMBER ?? '1';
const bundleIdentifier =
  process.env.SAFARI_BUNDLE_IDENTIFIER ?? 'com.liuyang.simple-hotkeys';
const deploymentTarget = process.env.SAFARI_MACOS_DEPLOYMENT_TARGET ?? '10.15';

if (!/^\d+(?:\.\d+){0,3}$/.test(marketingVersion)) {
  throw new Error(`Invalid Safari marketing version: ${marketingVersion}`);
}

if (!/^[1-9]\d*$/.test(buildNumber)) {
  throw new Error(`SAFARI_BUILD_NUMBER must be a positive integer: ${buildNumber}`);
}

if (!/^[A-Za-z0-9.-]+$/.test(bundleIdentifier)) {
  throw new Error(`Invalid Safari bundle identifier: ${bundleIdentifier}`);
}

if (!/^\d+\.\d+$/.test(deploymentTarget)) {
  throw new Error(`Invalid Safari macOS deployment target: ${deploymentTarget}`);
}

const projectUrl = new URL(
  '../.safari/Simple Hotkeys/Simple Hotkeys.xcodeproj/project.pbxproj',
  import.meta.url,
);
const project = await readFile(projectUrl, 'utf8');
const marketingVersionCount = project.match(/MARKETING_VERSION = [^;]+;/g)?.length ?? 0;
const buildNumberCount = project.match(/CURRENT_PROJECT_VERSION = [^;]+;/g)?.length ?? 0;
const bundleIdentifierCount =
  project.match(/PRODUCT_BUNDLE_IDENTIFIER = "[^"]+";/g)?.length ?? 0;
const deploymentTargetCount =
  project.match(/MACOSX_DEPLOYMENT_TARGET = [^;]+;/g)?.length ?? 0;

if (
  marketingVersionCount === 0 ||
  buildNumberCount === 0 ||
  bundleIdentifierCount === 0 ||
  deploymentTargetCount === 0
) {
  throw new Error('Could not find expected Safari settings in the generated project');
}

const configuredProject = project
  .replaceAll(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${marketingVersion};`)
  .replaceAll(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`)
  .replaceAll(
    /PRODUCT_BUNDLE_IDENTIFIER = "([^"]+)";/g,
    (_match, currentIdentifier) =>
      `PRODUCT_BUNDLE_IDENTIFIER = "${bundleIdentifier}${
        currentIdentifier.endsWith('.Extension') ? '.Extension' : ''
      }";`,
  )
  .replaceAll(
    /MACOSX_DEPLOYMENT_TARGET = [^;]+;/g,
    `MACOSX_DEPLOYMENT_TARGET = ${deploymentTarget};`,
  );

await writeFile(projectUrl, configuredProject);

console.log(
  `Configured Safari ${marketingVersion} (${buildNumber}), ${bundleIdentifier}, macOS ${deploymentTarget}+`,
);
