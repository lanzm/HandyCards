const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '../dist/build/mp-weixin/common/assets.js'),
  path.join(__dirname, '../dist/dev/mp-weixin/common/assets.js')
];

targets.forEach(target => {
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, '"use strict";\nmodule.exports = {};\n');
    }
  } catch (err) {
    // ignore
  }
});

// Ensure WordCard component has virtualHost enabled in WeChat Mini Program
const wordCardJsons = [
  path.join(__dirname, '../dist/build/mp-weixin/components/WordCard.json'),
  path.join(__dirname, '../dist/dev/mp-weixin/components/WordCard.json')
];

wordCardJsons.forEach(jsonPath => {
  try {
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      data.virtualHost = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch (err) {
    // ignore
  }
});

// Ensure project.config.json disables unused file filtering on upload
const projectConfigJsons = [
  path.join(__dirname, '../dist/build/mp-weixin/project.config.json'),
  path.join(__dirname, '../dist/dev/mp-weixin/project.config.json')
];

projectConfigJsons.forEach(configPath => {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!data.setting) data.setting = {};
      data.setting.ignoreDevUnusedFiles = false;
      data.setting.ignoreUploadUnusedFiles = false;
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch (err) {
    // ignore
  }
});
