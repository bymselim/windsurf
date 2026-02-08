export interface Artwork {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description?: string;
  dimensions: string;
  price: number;
  isFeatured: boolean;
}

export const artworks: Artwork[] = [
  {
    id: '1',
    title: 'Cloud Waltz',
    category: 'Cosmo',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
    description: 'Aerial view of stunning cloud formations at golden hour',
    dimensions: '80×120 cm',
    price: 1500,
    isFeatured: true,
  },
  {
    id: '2',
    title: 'Stone Harmony',
    category: 'Stone',
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
    description: 'Abstract composition of natural stones and minerals',
    dimensions: '60×90 cm',
    price: 1200,
    isFeatured: true,
  },
  {
    id: '3',
    title: 'Balloon Dreams',
    category: 'Balloon',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=8&q=80',
    description: 'Colorful hot air balloons floating over scenic landscape',
    dimensions: '100×150 cm',
    price: 2000,
    isFeatured: true,
  },
  {
    id: '4',
    title: 'Cosmic Journey',
    category: 'Cosmo',
    imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&q=80',
    description: 'Galaxy and star formation in deep space',
    dimensions: '90×135 cm',
    price: 1800,
    isFeatured: false,
  },
  {
    id: '5',
    title: 'Marble Echoes',
    category: 'Stone',
    imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80',
    description: 'Elegant marble texture with natural veins',
    dimensions: '70×105 cm',
    price: 950,
    isFeatured: false,
  },
  {
    id: '6',
    title: 'Sky Carnival',
    category: 'Balloon',
    imageUrl: 'https://images.unsplash.com/photo-1536746803623-cef87080bfc9?w=800&q=80',
    description: 'Vibrant hot air balloon festival at dawn',
    dimensions: '120×180 cm',
    price: 2500,
    isFeatured: true,
  },
  {
    id: '7',
    title: 'Nebula Dreams',
    category: 'Cosmo',
    imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80',
    description: 'Colorful nebula clouds in distant galaxy',
    dimensions: '85×130 cm',
    price: 2200,
    isFeatured: true,
  },
  {
    id: '8',
    title: 'Granite Flow',
    category: 'Stone',
    imageUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
    description: 'Natural granite patterns and textures',
    dimensions: '75×110 cm',
    price: 1350,
    isFeatured: false,
  },
];

export const categories = ['All', 'Stone', 'Balloon', 'Cosmo'];
