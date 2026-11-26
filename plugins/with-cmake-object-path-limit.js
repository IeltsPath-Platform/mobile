const { withAppBuildGradle } = require('@expo/config-plugins');

const CMAKE_ARGUMENT = '-DCMAKE_OBJECT_PATH_MAX=240';

function withCmakeObjectPathLimit(config) {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config;

    if (modResults.contents.includes(CMAKE_ARGUMENT)) {
      return config;
    }

    const anchor = /(\s*buildConfigField\s+"String",\s+"REACT_NATIVE_RELEASE_LEVEL"[^\r\n]*\r?\n)/;
    if (!anchor.test(modResults.contents)) {
      throw new Error('Không tìm thấy vị trí cấu hình CMake trong android/app/build.gradle.');
    }

    modResults.contents = modResults.contents.replace(
      anchor,
      `$1\n        externalNativeBuild {\n            cmake {\n                arguments "${CMAKE_ARGUMENT}"\n            }\n        }\n`,
    );

    return config;
  });
}

module.exports = withCmakeObjectPathLimit;
