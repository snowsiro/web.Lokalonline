window.SITE_DATA = {
  template: 'beauty',
  slug: 'nagelstudio-muster',

  name: 'Atelier Lumière',
  tagline: { de: 'Ihr Nagelstudio in Wien', en: 'Your nail studio in Vienna' },
  type:    { de: 'Nagelstudio & Beauty', en: 'Nail Studio & Beauty' },

  colors: {
    primary: '#C9A96E',
    accent:  '#C9A96E',
    bg:      '#FAF9F7',
    dark:    '#1A1A1A',
    mid:     '#8A8480',
    dim:     '#6B6865',
    line:    '#E8E4DF'
  },

  fonts: {
    heading: 'Cormorant Garamond',
    body:    'DM Sans'
  },

  address:        'Neubaugasse 12, 1070 Wien',
  phone:          '+43 660 123 45 67',
  email:          'info@atelier-lumiere.at',
  instagram:      '@atelierlumiere.wien',
  googleMapsUrl:  'https://maps.google.com/?q=Neubaugasse+12+Wien',
  googleMapsEmbed:'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2659.1!2d16.3500!3d48.1990!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sNeubaugasse%2012%2C%201070%20Wien!5e0!3m2!1sde!2sat!4v1700000000000',

  hours: [
    { day: { de: 'Di–Fr', en: 'Tue–Fri' }, time: '10:00–19:00' },
    { day: { de: 'Samstag', en: 'Saturday' }, time: '09:00–17:00' },
    { day: { de: 'Montag', en: 'Monday' }, closed: true },
    { day: { de: 'Sonntag', en: 'Sunday' }, closed: true }
  ],

  slides: [
    {
      img:    'img/slide1.jpg',
      eyebrow:{ de: 'Willkommen', en: 'Welcome' },
      title:  { de: 'Schönheit &<br><em>Pflege</em>', en: 'Beauty &<br><em>Care</em>' },
      desc:   { de: 'Ihr Wohlfühlort im 7. Bezirk', en: 'Your feel-good place in the 7th district' }
    }
  ],

  about: {
    img:  'img/iroom.jpg',
    text: {
      de: 'Im Atelier Lumière verbinden wir Präzision mit Leidenschaft. Seit über zehn Jahren verwöhnen wir unsere Kundinnen mit erstklassigen Nageldesigns und Beauty-Behandlungen. Unser kleines, feines Studio im Herzen des 7. Bezirks ist Ihr Rückzugsort vom Alltag — ein Ort, an dem Qualität und Entspannung Hand in Hand gehen.',
      en:  'At Atelier Lumière, we combine precision with passion. For over ten years, we have been pampering our clients with first-class nail designs and beauty treatments. Our intimate studio in the heart of the 7th district is your retreat from everyday life — a place where quality and relaxation go hand in hand.'
    },
    highlights: [
      { de: 'Premium Produkte', en: 'Premium products' },
      { de: 'Erfahrene Expertinnen', en: 'Experienced experts' },
      { de: 'Entspannte Atmosphäre', en: 'Relaxed atmosphere' },
      { de: 'Über 10 Jahre Erfahrung', en: 'Over 10 years of experience' }
    ]
  },

  services: [
    {
      name: { de: 'Gel-Nägel', en: 'Gel Nails' },
      desc: { de: 'Langanhaltend, strapazierfähig und wunderschön geformt', en: 'Long-lasting, durable and beautifully shaped' },
      price: 'ab €45',
      img: 'img/slide1.jpg'
    },
    {
      name: { de: 'Shellac', en: 'Shellac' },
      desc: { de: '2–4 Wochen Halt ohne Ausbesserung', en: '2–4 weeks hold without touch-ups' },
      price: 'ab €35',
      img: 'img/slide2.jpg'
    },
    {
      name: { de: 'Klassische Maniküre', en: 'Classic Manicure' },
      desc: { de: 'Pflege, Form und Farbe — die Basis für schöne Hände', en: 'Care, shape and colour — the foundation for beautiful hands' },
      price: 'ab €25',
      img: 'img/iroom.jpg'
    },
    {
      name: { de: 'Wimpernverlängerung', en: 'Eyelash Extensions' },
      desc: { de: 'Natürlich oder dramatisch — Ihr Look, Ihre Wahl', en: 'Natural or dramatic — your look, your choice' },
      price: 'ab €80',
      img: 'img/slide1.jpg'
    },
    {
      name: { de: 'Wimpernlifting', en: 'Lash Lift' },
      desc: { de: 'Natürlich geschwungene Wimpern ohne Extensions', en: 'Naturally curled lashes without extensions' },
      price: 'ab €55',
      img: 'img/slide2.jpg'
    },
    {
      name: { de: 'Pediküre', en: 'Pedicure' },
      desc: { de: 'Verwöhnung von der Ferse bis zur Zehenspitze', en: 'Pampering from heel to toe' },
      price: 'ab €35',
      img: 'img/food.jpg'
    }
  ],

  priceList: [
    {
      category: { de: 'Nägel', en: 'Nails' },
      items: [
        { name: { de: 'Gel-Nägel Neubau', en: 'Gel Nails (new set)' }, price: 'ab €45' },
        { name: { de: 'Gel-Nägel Auffüllung', en: 'Gel Nails (refill)' }, price: 'ab €35' },
        { name: { de: 'Shellac', en: 'Shellac' }, price: 'ab €35' },
        { name: { de: 'Klassische Maniküre', en: 'Classic Manicure' }, price: 'ab €25' },
        { name: { de: 'French Maniküre', en: 'French Manicure' }, price: 'ab €30' },
        { name: { de: 'Nageldesign (pro Nagel)', en: 'Nail art (per nail)' }, price: 'ab €3' }
      ]
    },
    {
      category: { de: 'Wimpern', en: 'Lashes' },
      items: [
        { name: { de: 'Wimpernverlängerung Classic', en: 'Lash Extensions Classic' }, price: 'ab €80' },
        { name: { de: 'Wimpernverlängerung Volume', en: 'Lash Extensions Volume' }, price: 'ab €100' },
        { name: { de: 'Wimpernlifting', en: 'Lash Lift' }, price: 'ab €55' },
        { name: { de: 'Wimpernfärben', en: 'Lash Tinting' }, price: 'ab €20' },
        { name: { de: 'Auffüllung (3 Wochen)', en: 'Refill (3 weeks)' }, price: 'ab €50' }
      ]
    },
    {
      category: { de: 'Pflege', en: 'Care' },
      items: [
        { name: { de: 'Pediküre', en: 'Pedicure' }, price: 'ab €35' },
        { name: { de: 'Shellac Pediküre', en: 'Shellac Pedicure' }, price: 'ab €50' },
        { name: { de: 'Hand-Paraffin-Behandlung', en: 'Hand Paraffin Treatment' }, price: 'ab €15' },
        { name: { de: 'Augenbrauen formen', en: 'Eyebrow shaping' }, price: 'ab €12' }
      ]
    }
  ],

  team: [
    {
      name: 'Sophie Müller',
      title: { de: 'Inhaberin & Nail Artist', en: 'Owner & Nail Artist' },
      bio:   { de: '10 Jahre Erfahrung, spezialisiert auf Gel und Nageldesign', en: '10 years of experience, specialising in gel and nail art' },
      img:   'img/team1.jpg'
    },
    {
      name: 'Julia Wagner',
      title: { de: 'Wimpern-Expertin', en: 'Lash Expert' },
      bio:   { de: 'Zertifizierte Wimpernstylerin, Meisterin des natürlichen Looks', en: 'Certified lash stylist, master of the natural look' },
      img:   'img/team2.jpg'
    },
    {
      name: 'Laura Kovacs',
      title: { de: 'Maniküre & Pediküre', en: 'Manicure & Pedicure' },
      bio:   { de: 'Leidenschaft für klassische Pflege und kreative Designs', en: 'Passion for classic care and creative designs' },
      img:   'img/team3.jpg'
    }
  ],

  photos: ['img/slide1.jpg', 'img/slide2.jpg', 'img/iroom.jpg', 'img/food.jpg', 'img/slide1.jpg'],

  supabase: {
    url: 'https://vhnourjddnlslgabrasb.supabase.co',
    key: 'sb_publishable_y5l1cAZXoAj8xaSVXUkBfw_Pk9pxb6H'
  },
  reviewSlug: 'nagelstudio-muster',

  instagramPhotos: ['img/slide1.jpg', 'img/slide2.jpg', 'img/iroom.jpg', 'img/food.jpg', 'img/slide1.jpg', 'img/slide2.jpg'],

  announcementBar: { de: 'Jetzt Termin buchen — schnell & einfach online', en: 'Book your appointment now — quick & easy online' },

  highlights: [
    { icon: '✦', title: { de: 'Premium Produkte', en: 'Premium Products' }, desc: { de: 'Nur die besten Marken für Ihre Pflege', en: 'Only the finest brands for your care' } },
    { icon: '✦', title: { de: 'Persönliche Beratung', en: 'Personal Consultation' }, desc: { de: 'Wir nehmen uns Zeit für Sie', en: 'We take the time for you' } },
    { icon: '✦', title: { de: 'Hygiene & Sorgfalt', en: 'Hygiene & Care' }, desc: { de: 'Höchste Hygienestandards garantiert', en: 'Highest hygiene standards guaranteed' } }
  ],

  categories: [],

  seo: {
    title:       'Atelier Lumière — Nagelstudio Wien 7',
    description: { de: 'Ihr Nagelstudio & Beauty Studio im 7. Bezirk Wien. Gel-Nägel, Shellac, Wimpern & mehr.', en: 'Your nail studio & beauty studio in Vienna\'s 7th district. Gel nails, shellac, lashes & more.' },
    ogImage:     'img/og-image.jpg'
  }
};
