// Simple SVG to PNG icon generator for PWA
// This creates placeholder icons that can be replaced with actual designs later

const fs = require('fs');
const path = require('path');

// SVG icon template with stopwatch design
const createSVG = (size) => `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#38bdf8" rx="${size * 0.15}"/>
  
  <!-- Stopwatch circle -->
  <circle cx="${size/2}" cy="${size/2 + size*0.05}" r="${size*0.3}" fill="white"/>
  
  <!-- Stopwatch top button -->
  <rect x="${size/2 - size*0.04}" y="${size*0.15}" width="${size*0.08}" height="${size*0.1}" fill="white" rx="${size*0.02}"/>
  
  <!-- Clock marks -->
  <line x1="${size/2}" y1="${size/2 + size*0.05 - size*0.22}" x2="${size/2}" y2="${size/2 + size*0.05 - size*0.28}" stroke="white" stroke-width="${size*0.015}"/>
  <line x1="${size/2}" y1="${size/2 + size*0.05 + size*0.22}" x2="${size/2}" y2="${size/2 + size*0.05 + size*0.28}" stroke="white" stroke-width="${size*0.015}"/>
  <line x1="${size/2 - size*0.22}" y1="${size/2 + size*0.05}" x2="${size/2 - size*0.28}" y2="${size/2 + size*0.05}" stroke="white" stroke-width="${size*0.015}"/>
  <line x1="${size/2 + size*0.22}" y1="${size/2 + size*0.05}" x2="${size/2 + size*0.28}" y2="${size/2 + size*0.05}" stroke="white" stroke-width="${size*0.015}"/>
  
  <!-- Clock hands -->
  <line x1="${size/2}" y1="${size/2 + size*0.05}" x2="${size/2}" y2="${size/2 + size*0.05 - size*0.15}" stroke="#0f172a" stroke-width="${size*0.02}" stroke-linecap="round"/>
  <line x1="${size/2}" y1="${size/2 + size*0.05}" x2="${size/2 + size*0.12}" y2="${size/2 + size*0.05}" stroke="#0f172a" stroke-width="${size*0.015}" stroke-linecap="round"/>
  
  <!-- Center dot -->
  <circle cx="${size/2}" cy="${size/2 + size*0.05}" r="${size*0.02}" fill="#0f172a"/>
</svg>`;

// Create icons
const sizes = [192, 512];
const publicDir = path.join(__dirname, '..', 'public');

console.log('Generating PWA icons...');

sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}.svg`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✓ Created ${filename}`);
});

console.log('\nNote: SVG icons created. For production, consider converting to PNG using:');
console.log('- Online tools like https://cloudconvert.com/svg-to-png');
console.log('- Or use a package like sharp: npm install sharp');
console.log('\nFor now, update manifest.json to use .svg instead of .png');
