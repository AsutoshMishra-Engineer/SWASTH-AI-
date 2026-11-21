const fs = require('fs');
const path = require('path');

const hospitalsJson = fs.readFileSync(path.join(__dirname, 'hospitals_array.json'), 'utf8');
const hospitals = JSON.parse(hospitalsJson);

let appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

// 1. Replace GOVT_HOSPITALS
const startMarker = '  const GOVT_HOSPITALS = [';
const endMarker = '  ];\n\n  // GEOGRAPHICAL CENTERS FOR ALL 30 DISTRICTS';

const startIndex = appJs.indexOf(startMarker);
const endIndex = appJs.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found in public/app.js!');
  process.exit(1);
}

const replacementHospitals = '  const GOVT_HOSPITALS = ' + JSON.stringify(hospitals, null, 2).replace(/\n/g, '\n  ') + ';';

appJs = appJs.substring(0, startIndex) + replacementHospitals + appJs.substring(endIndex + 4);

console.log('Successfully replaced GOVT_HOSPITALS with ' + hospitals.length + ' facilities!');
fs.writeFileSync(path.join(__dirname, '../public/app.js'), appJs, 'utf8');
