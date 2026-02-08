const fs = require('fs');
const path = require('path');

console.log('🔄 Generating artwork data...');

const artworksDir = path.join(__dirname, '../public/artworks');
const categories = ['stone', 'balloon', 'cosmo'];
let allArtworks = [];

categories.forEach(category => {
  const categoryPath = path.join(artworksDir, category);
  
  if (!fs.existsSync(categoryPath)) {
    console.log(`⚠️ Folder not found: ${categoryPath}`);
    return;
  }

  const files = fs.readdirSync(categoryPath)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

  console.log(`📁 ${category}: ${files.length} images found`);

  files.forEach((filename, index) => {
    // İsimden başlık oluştur
    const baseName = filename.replace(/\.[^/.]+$/, '');
    const title = baseName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();

    const artwork = {
      id: `${category}-${index + 1}`,
      title: title || `${category.charAt(0).toUpperCase() + category.slice(1)} ${index + 1}`,
      category: category.charAt(0).toUpperCase() + category.slice(1),
      filename: `${category}/${filename}`,
      description: `Beautiful ${category} artwork`,
      dimensions: index % 2 === 0 ? '60×90 cm' : '80×120 cm',
      price: 800 + (index * 200),
      tags: [category],
      isFeatured: index < 2,
    };

    allArtworks.push(artwork);
    console.log(`   ✅ ${artwork.title}`);
  });
});

// JSON dosyasına kaydet
const outputPath = path.join(__dirname, '../lib/data/artworks.json');
fs.writeFileSync(outputPath, JSON.stringify(allArtworks, null, 2));

console.log(`\n🎉 Done! Generated ${allArtworks.length} artworks`);
console.log(`📄 Saved to: ${outputPath}`);
