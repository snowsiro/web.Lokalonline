window.SITE_DATA = {
  template: 'cafe',
  slug: 'cafe-lumina',

  name: 'Café Lumina',
  tagline: { de: 'Handgezogener Espresso & hausgemachte Mehlspeisen in Wien', en: 'Hand-pulled espresso & homemade pastries in Vienna' },
  type:    { de: 'Café', en: 'Café' },

  colors: {
    primary: '#B8763A',
    accent:  '#B8763A',
    bg:      '#FAF7F2',
    dark:    '#1C1208',
    mid:     '#8C7B6B',
    dim:     '#5A4A3A',
    line:    '#E8E0D4'
  },

  fonts: {
    heading: 'Playfair Display',
    body:    'Inter'
  },

  address:        'Neubaugasse 28, 1070 Wien',
  phone:          '+43 1 890 23 45',
  email:          'hallo@cafe-lumina.at',
  instagram:      '@cafelumina',
  googleMapsUrl:  'https://maps.google.com/?q=Neubaugasse+28,+1070+Wien',
  googleMapsEmbed:'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2659.1!2d16.3499!3d48.2003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDjCsDEyJzAwLjkiTiAxNsKwMjAnNTcuNiJF!5e0!3m2!1sde!2sat!4v1700000000000',

  hours: [
    { day: { de: 'Mo–Fr', en: 'Mon–Fri' }, time: '07:30–19:00' },
    { day: { de: 'Samstag', en: 'Saturday' }, time: '08:00–20:00' },
    { day: { de: 'Sonntag', en: 'Sunday' }, time: '09:00–18:00' }
  ],

  nav: [
    { label: { de: 'Angebote',   en: 'Specials' }, href: '#specials' },
    { label: { de: 'Über uns',   en: 'About' },    href: '#about' },
    { label: { de: 'Karte',      en: 'Menu' },     href: '#drinks' },
    { label: { de: 'Öffnungszeiten', en: 'Hours' }, href: '#hours' },
    { label: { de: 'Reservierung',   en: 'Book' },  href: '#reservation' }
  ],

  hero: {
    img:      'img/hero.jpg',
    headline: { de: 'Kaffee. Stille. <em>Genuss.</em>', en: 'Coffee. Calm. <em>Pleasure.</em>' },
    sub:      { de: 'Handgezogener Espresso und hausgemachte Mehlspeisen seit 2015', en: 'Hand-pulled espresso and homemade pastries since 2015' }
  },

  specials: [
    {
      img:   'img/special1.jpg',
      icon:  '☕',
      name:  { de: 'Signature Espresso', en: 'Signature Espresso' },
      desc:  { de: 'Unser hausgemischter Espresso — vollmundig, cremig, unvergleichlich', en: 'Our house-blend espresso — full-bodied, creamy, incomparable' }
    },
    {
      img:   'img/special2.jpg',
      icon:  '🥐',
      name:  { de: 'Frische Mehlspeisen', en: 'Fresh Pastries' },
      desc:  { de: 'Täglich frisch gebacken nach überlieferten Wiener Rezepten', en: 'Freshly baked daily using traditional Viennese recipes' }
    },
    {
      img:   'img/special3.jpg',
      icon:  '🌿',
      name:  { de: 'Saisonale Spezialitäten', en: 'Seasonal Specials' },
      desc:  { de: 'Jede Saison bringt neue Kreationen direkt auf Ihre Tasse', en: 'Each season brings new creations straight to your cup' }
    }
  ],

  about: {
    img1: 'img/about1.jpg',
    img2: 'img/about2.jpg',
    text: {
      de: 'Café Lumina wurde 2015 von Maria und Thomas Heger gegründet — zwei leidenschaftliche Kaffeeliebhaber mit einem Traum: ein Ort, an dem Qualität, Ruhe und Herzlichkeit aufeinandertreffen.\n\nWir beziehen unsere Kaffeebohnen direkt von kleinen Familienbetrieben in Äthiopien und Kolumbien. Jede Tasse erzählt eine Geschichte.',
      en:  'Café Lumina was founded in 2015 by Maria and Thomas Heger — two passionate coffee lovers with a dream: a place where quality, calm and warmth come together.\n\nWe source our coffee beans directly from small family farms in Ethiopia and Colombia. Every cup tells a story.'
    }
  },

  drinks: [
    { img: 'img/drink1.jpg', name: { de: 'Flat White', en: 'Flat White' }, desc: { de: 'Doppelter Ristretto, aufgeschäumte Vollmilch', en: 'Double ristretto, steamed whole milk' }, price: '€ 4,20' },
    { img: 'img/drink2.jpg', name: { de: 'Wiener Melange', en: 'Viennese Melange' }, desc: { de: 'Traditioneller Milchkaffee im Wiener Stil', en: 'Traditional Viennese-style café au lait' }, price: '€ 3,80' },
    { img: 'img/drink3.jpg', name: { de: 'Matcha Latte', en: 'Matcha Latte' }, desc: { de: 'Zeremonieller Matcha mit Bio-Hafermilch', en: 'Ceremonial matcha with organic oat milk' }, price: '€ 5,50' },
    { img: 'img/drink4.jpg', name: { de: 'Kardamom-Milch', en: 'Cardamom Milk' }, desc: { de: 'Hausgemachte Gewürzmilch nach orientalischer Art', en: 'House-made spiced milk, oriental style' }, price: '€ 4,80' },
    { img: 'img/drink5.jpg', name: { de: 'Apfelstrudel', en: 'Apple Strudel' }, desc: { de: 'Täglich frisch gebacken, mit Vanillesauce', en: 'Freshly baked daily, with vanilla sauce' }, price: '€ 4,90' },
    { img: 'img/drink6.jpg', name: { de: 'Sachertorte', en: 'Sacher Torte' }, desc: { de: 'Das Original — hausgemacht nach Familienrezept', en: 'The original — homemade from a family recipe' }, price: '€ 5,20' }
  ],

  photos: [
    'img/hero.jpg',
    'img/about1.jpg',
    'img/special1.jpg',
    'img/drink1.jpg',
    'img/about2.jpg',
    'img/special2.jpg'
  ],

  supabase: {
    url: 'https://vhnourjddnlslgabrasb.supabase.co',
    key: 'sb_publishable_y5l1cAZXoAj8xaSVXUkBfw_Pk9pxb6H'
  },
  reviewSlug: 'cafe-lumina',

  instagramPhotos: [
    'img/hero.jpg',
    'img/special1.jpg',
    'img/drink1.jpg',
    'img/about1.jpg',
    'img/special2.jpg',
    'img/about2.jpg'
  ],

  seo: {
    title:       'Café Lumina — Kaffee & Mehlspeisen in Wien',
    description: { de: 'Handgezogener Espresso und hausgemachte Mehlspeisen im 7. Bezirk', en: 'Hand-pulled espresso and homemade pastries in the 7th district' },
    ogImage:     'img/og-image.jpg'
  }
};
