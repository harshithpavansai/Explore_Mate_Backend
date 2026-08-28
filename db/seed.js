/**
 * Seeder: inserts a small starter dataset (admin user, sample destinations, badges).
 * Idempotent - safe to re-run.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const destinations = [
  {
    name: 'Eiffel Tower', city: 'Paris', country: 'France',
    category: 'attraction', short_summary: 'Iconic wrought-iron lattice tower.',
    description: 'A 330-metre tower built in 1889 - the symbol of Paris.',
    image_url: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e',
    latitude: 48.8584, longitude: 2.2945, rating: 4.7, rating_count: 12000,
    tags: ['landmark','romantic','views'], is_hidden_gem: false,
  },
  {
    name: 'Hidden Lavender Field', city: 'Provence', country: 'France',
    category: 'nature', short_summary: 'Quiet purple-bloomed valley off the tourist trail.',
    description: 'A lesser known lavender hideaway perfect for solo travellers.',
    image_url: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec',
    latitude: 43.9352, longitude: 5.1296, rating: 4.9, rating_count: 320,
    tags: ['nature','hidden','peaceful'], is_hidden_gem: true,
  },
  {
    name: 'Tokyo Tower', city: 'Tokyo', country: 'Japan',
    category: 'attraction', short_summary: 'Communications tower with city views.',
    description: 'Inspired by the Eiffel Tower, this Tokyo landmark is painted orange and white.',
    image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
    latitude: 35.6586, longitude: 139.7454, rating: 4.5, rating_count: 8500,
    tags: ['landmark','views','city'], is_hidden_gem: false,
  },
  {
    name: 'Yanaka Ginza Street', city: 'Tokyo', country: 'Japan',
    category: 'food', short_summary: 'Old-school market street with street food and cats.',
    description: 'A nostalgic shopping street that escaped WWII bombing - pure Showa-era charm.',
    image_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26',
    latitude: 35.7274, longitude: 139.7657, rating: 4.6, rating_count: 1500,
    tags: ['food','culture','hidden'], is_hidden_gem: true,
  },
  {
    name: 'Santorini Caldera', city: 'Santorini', country: 'Greece',
    category: 'attraction', short_summary: 'Sunset views over the Aegean Sea.',
    description: 'Whitewashed houses cling to the cliffs of a sunken volcano.',
    image_url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff',
    latitude: 36.3932, longitude: 25.4615, rating: 4.8, rating_count: 9800,
    tags: ['romantic','views','islands'], is_hidden_gem: false,
  },
];

const badges = [
  { code: 'first_steps',    name: 'First Steps',    description: 'Completed your first trip',     icon: '🥾', xp_reward: 50  },
  { code: 'explorer',       name: 'Explorer',       description: 'Visited 5 destinations',         icon: '🧭', xp_reward: 100 },
  { code: 'globetrotter',   name: 'Globetrotter',   description: 'Visited 3 countries',            icon: '🌍', xp_reward: 200 },
  { code: 'foodie',         name: 'Foodie',         description: 'Reviewed 5 food spots',          icon: '🍜', xp_reward: 80  },
  { code: 'gem_hunter',     name: 'Gem Hunter',     description: 'Discovered 3 hidden gems',       icon: '💎', xp_reward: 150 },
  { code: 'audio_listener', name: 'Audio Listener', description: 'Listened to 10 audio tours',     icon: '🎧', xp_reward: 60  },
];

(async () => {
  try {
    console.log('Seeding badges...');
    for (const b of badges) {
      await pool.query(
        `INSERT INTO badges (code,name,description,icon,xp_reward)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (code) DO UPDATE
           SET name=EXCLUDED.name, description=EXCLUDED.description,
               icon=EXCLUDED.icon, xp_reward=EXCLUDED.xp_reward`,
        [b.code, b.name, b.description, b.icon, b.xp_reward]
      );
    }

    console.log('Seeding destinations...');
    for (const d of destinations) {
      await pool.query(
        `INSERT INTO destinations
         (name,city,country,category,short_summary,description,image_url,
          latitude,longitude,rating,rating_count,tags,is_hidden_gem)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT DO NOTHING`,
        [d.name, d.city, d.country, d.category, d.short_summary, d.description,
         d.image_url, d.latitude, d.longitude, d.rating, d.rating_count, d.tags, d.is_hidden_gem]
      );
    }

    console.log('Seeding admin user...');
    const adminPwd = await bcrypt.hash('Admin@12345', 10);
    await pool.query(
      `INSERT INTO users (name,email,password_hash,role,is_verified)
       VALUES ($1,$2,$3,'admin',TRUE)
       ON CONFLICT (email) DO NOTHING`,
      ['ExploreMate Admin', 'admin@exploremate.app', adminPwd]
    );

    console.log('Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();
