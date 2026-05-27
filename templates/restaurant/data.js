window.SITE_DATA = {
  template: 'restaurant',
  slug: 'zur-goldenen-gabel',

  name: 'Zur Goldenen Gabel',
  tagline: { de: 'Authentische Wiener Küche seit 1987', en: 'Authentic Viennese cuisine since 1987' },
  type:    { de: 'Restaurant', en: 'Restaurant' },

  colors: {
    primary: '#C8302A',
    accent:  '#C8302A',
    bg:      '#F8F7F4',
    dark:    '#111110',
    mid:     '#9B9893',
    dim:     '#5C5A57',
    line:    '#DDDAD4'
  },

  fonts: {
    heading: 'DM Serif Display',
    body:    'DM Sans'
  },

  address:        'Mariahilfer Str. 45, 1060 Wien',
  phone:          '+43 1 234 56 78',
  email:          'info@zur-goldenen-gabel.at',
  instagram:      '@zurgoldenengabel',
  googleMapsUrl:  'https://maps.google.com/?q=Mariahilfer+Str+45+Wien',
  googleMapsEmbed:'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2659.3!2d16.3552!3d48.1974!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x476d079f0ddcf067%3A0x5dfb0c0e1d2e3c4a!2sMariahilfer%20Str.%2045%2C%201060%20Wien!5e0!3m2!1sde!2sat!4v1700000000000',

  hours: [
    { day: { de: 'Mo–Fr', en: 'Mon–Fri' }, time: '11:30–22:30', note: { de: 'Mittagsmenü 11:30–14:30', en: 'Lunch menu 11:30–14:30' } },
    { day: { de: 'Sa', en: 'Sat' }, time: '12:00–23:00', note: { de: '', en: '' } },
    { day: { de: 'So', en: 'Sun' }, time: '12:00–21:00', note: { de: 'Sonntagsbrunch bis 15:00', en: 'Sunday brunch until 15:00' } }
  ],

  slides: [
    {
      img:    'img/slide1.jpg',
      eyebrow:{ de: 'Herzlich Willkommen', en: 'Welcome' },
      title:  { de: 'Genuss &amp;<br><em>Leidenschaft</em>', en: 'Taste &amp;<br><em>Passion</em>' },
      desc:   { de: 'Authentische Wiener Küche im Herzen der Stadt', en: 'Authentic Viennese cuisine in the heart of the city' }
    },
    {
      img:    'img/slide2.jpg',
      eyebrow:{ de: 'Unsere Küche', en: 'Our Kitchen' },
      title:  { de: 'Frisch &amp;<br><em>Saisonal</em>', en: 'Fresh &amp;<br><em>Seasonal</em>' },
      desc:   { de: 'Täglich frisch zubereitet mit regionalen Zutaten', en: 'Freshly prepared daily with regional ingredients' }
    },
    {
      img:    'img/slide3.jpg',
      eyebrow:{ de: 'Ambiente', en: 'Atmosphere' },
      title:  { de: 'Gemütlich &amp;<br><em>Elegant</em>', en: 'Cosy &amp;<br><em>Elegant</em>' },
      desc:   { de: 'Ein Ort für besondere Momente', en: 'A place for special moments' }
    }
  ],

  about: {
    img:  'img/about.jpg',
    text: {
      de: 'Seit über drei Jahrzehnten verwöhnen wir unsere Gäste mit der besten Wiener Küche. Gegründet von Familie Mayer, steht unser Restaurant für Tradition, Qualität und herzliche Gastfreundschaft. Jedes Gericht wird mit Liebe und Sorgfalt zubereitet — von unserem berühmten Wiener Schnitzel bis hin zu saisonalen Spezialitäten.',
      en:  'For over three decades, we have been delighting our guests with the finest Viennese cuisine. Founded by the Mayer family, our restaurant stands for tradition, quality, and warm hospitality. Every dish is prepared with love and care — from our famous Wiener Schnitzel to seasonal specialties.'
    },
    highlights: [
      { de: 'Täglich frisch gekocht', en: 'Freshly cooked daily' },
      { de: 'Saisonale Zutaten',      en: 'Seasonal ingredients' },
      { de: 'Familiäre Atmosphäre',   en: 'Family atmosphere' },
      { de: 'Seit 1987',              en: 'Since 1987' }
    ]
  },

  menuUrl: 'menu/',

  menuBand: {
    headline: { de: 'Unsere<br><em>Speisekarte</em>', en: 'Our<br><em>Menu</em>' },
    sub:      { de: 'Entdecken Sie unsere saisonalen Gerichte und Wiener Klassiker', en: 'Discover our seasonal dishes and Viennese classics' },
    cta:      { de: 'Speisekarte ansehen →', en: 'View menu →' }
  },

  photos: [
    'img/slide1.jpg',
    'img/slide2.jpg',
    'img/about.jpg',
    'img/slide3.jpg',
    'img/food1.jpg',
    'img/food2.jpg'
  ],

  supabase: {
    url: 'https://vhnourjddnlslgabrasb.supabase.co',
    key: 'sb_publishable_y5l1cAZXoAj8xaSVXUkBfw_Pk9pxb6H'
  },
  reviewSlug: 'zur-goldenen-gabel',

  instagramPhotos: [
    'img/slide1.jpg',
    'img/slide2.jpg',
    'img/about.jpg',
    'img/slide3.jpg',
    'img/food1.jpg',
    'img/food2.jpg'
  ],

  nav: {
    links: [
      { de: 'Speisekarte', en: 'Menu',         href: '#menu' },
      { de: 'Über uns',    en: 'About',         href: '#about' },
      { de: 'Öffnungszeiten', en: 'Hours',      href: '#hours' },
      { de: 'Reservierung',   en: 'Reservation',href: '#reservation' }
    ]
  },

  seo: {
    title:       'Zur Goldenen Gabel — Wiener Restaurant',
    description: { de: 'Authentische Wiener Küche seit 1987 in Mariahilf', en: 'Authentic Viennese cuisine since 1987 in Mariahilf' },
    ogImage:     'img/og-image.jpg'
  }
};
