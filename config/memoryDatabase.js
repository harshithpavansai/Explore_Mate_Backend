const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const now = () => new Date();
const id = () => crypto.randomUUID();
const like = (value, term) =>
  String(value || '').toLowerCase().includes(String(term || '').replace(/%/g, '').toLowerCase());

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'ExploreMate Admin',
  email: 'admin@exploremate.app',
  phone: null,
  password_hash: bcrypt.hashSync('Admin@12345', 10),
  firebase_uid: null,
  role: 'admin',
  avatar_url: null,
  bio: 'Demo administrator',
  is_verified: true,
  is_active: true,
  xp: 420,
  level: 3,
  preferences: {},
  last_login_at: null,
  created_at: now(),
  updated_at: now(),
};

const destinations = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    category: 'attraction',
    description: 'A 330-metre tower built in 1889, and the symbol of Paris.',
    short_summary: 'Iconic wrought-iron lattice tower.',
    image_url: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e',
    images: [],
    latitude: 48.8584,
    longitude: 2.2945,
    address: 'Champ de Mars, Paris',
    rating: 4.7,
    rating_count: 12000,
    price_level: 2,
    tags: ['landmark', 'romantic', 'views'],
    is_hidden_gem: false,
    metadata: {},
    created_at: now(),
    updated_at: now(),
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Hidden Lavender Field',
    city: 'Provence',
    country: 'France',
    category: 'nature',
    description: 'A quiet lavender hideaway perfect for slow travel and photos.',
    short_summary: 'Quiet purple-bloomed valley off the tourist trail.',
    image_url: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec',
    images: [],
    latitude: 43.9352,
    longitude: 5.1296,
    address: 'Provence countryside',
    rating: 4.9,
    rating_count: 320,
    price_level: 1,
    tags: ['nature', 'hidden', 'peaceful'],
    is_hidden_gem: true,
    metadata: {},
    created_at: now(),
    updated_at: now(),
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Tokyo Tower',
    city: 'Tokyo',
    country: 'Japan',
    category: 'attraction',
    description: 'A Tokyo landmark with panoramic city views.',
    short_summary: 'Communications tower with city views.',
    image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
    images: [],
    latitude: 35.6586,
    longitude: 139.7454,
    address: 'Minato City, Tokyo',
    rating: 4.5,
    rating_count: 8500,
    price_level: 2,
    tags: ['landmark', 'views', 'city'],
    is_hidden_gem: false,
    metadata: {},
    created_at: now(),
    updated_at: now(),
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Yanaka Ginza Street',
    city: 'Tokyo',
    country: 'Japan',
    category: 'food',
    description: 'A nostalgic market street with snacks, shops, and local charm.',
    short_summary: 'Old-school market street with street food.',
    image_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26',
    images: [],
    latitude: 35.7274,
    longitude: 139.7657,
    address: 'Yanaka, Tokyo',
    rating: 4.6,
    rating_count: 1500,
    price_level: 1,
    tags: ['food', 'culture', 'hidden'],
    is_hidden_gem: true,
    metadata: {},
    created_at: now(),
    updated_at: now(),
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    name: 'Santorini Caldera',
    city: 'Santorini',
    country: 'Greece',
    category: 'attraction',
    description: 'Whitewashed houses cling to cliffs above a sunken volcano.',
    short_summary: 'Sunset views over the Aegean Sea.',
    image_url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff',
    images: [],
    latitude: 36.3932,
    longitude: 25.4615,
    address: 'Santorini',
    rating: 4.8,
    rating_count: 9800,
    price_level: 3,
    tags: ['romantic', 'views', 'islands'],
    is_hidden_gem: false,
    metadata: {},
    created_at: now(),
    updated_at: now(),
  },
];

const state = {
  users: [user],
  otp_codes: [],
  refresh_tokens: [],
  destinations,
  trips: [],
  reviews: [],
  favorites: [],
  audio_tours: [],
  badges: [
    { id: id(), code: 'first_steps', name: 'First Steps', description: 'Completed your first trip', icon: 'shoe', xp_reward: 50, created_at: now() },
    { id: id(), code: 'explorer', name: 'Explorer', description: 'Visited 5 destinations', icon: 'compass', xp_reward: 100, created_at: now() },
    { id: id(), code: 'foodie', name: 'Foodie', description: 'Reviewed 5 food spots', icon: 'bowl', xp_reward: 80, created_at: now() },
    { id: id(), code: 'gem_hunter', name: 'Gem Hunter', description: 'Discovered 3 hidden gems', icon: 'gem', xp_reward: 150, created_at: now() },
  ],
  user_badges: [],
  xp_logs: [],
  notifications: [],
  trip_history: [],
};

const result = (rows = [], rowCount = rows.length) => ({ rows, rowCount });

const filterDestinations = (params, text) => {
  let rows = [...state.destinations];
  const lower = text.toLowerCase();

  if (lower.includes("category = 'food'")) rows = rows.filter((d) => d.category === 'food');
  if (lower.includes('is_hidden_gem = true')) rows = rows.filter((d) => d.is_hidden_gem);
  if (lower.includes('where id = $1')) rows = rows.filter((d) => d.id === params[0]);
  if (lower.includes('latitude between')) {
    rows = rows.filter((d) =>
      d.latitude >= params[0] && d.latitude <= params[1] &&
      d.longitude >= params[2] && d.longitude <= params[3]);
  }
  if (lower.includes('city ilike')) {
    const cityParam = params.find((p) => String(p).startsWith('%'));
    if (cityParam) rows = rows.filter((d) => like(d.city, cityParam));
  }
  if (lower.includes('country ilike')) {
    const countryParam = params.filter((p) => String(p).startsWith('%')).at(-1);
    if (countryParam) rows = rows.filter((d) => like(d.country, countryParam));
  }
  if (lower.includes('name ilike') || lower.includes('description ilike')) {
    const q = params.find((p) => String(p).startsWith('%'));
    if (q && !lower.includes('city ilike $1')) {
      rows = rows.filter((d) => like(d.name, q) || like(d.city, q) || like(d.description, q));
    }
  }
  if (lower.includes('rating >=')) {
    const min = params.find((p) => typeof p === 'number');
    if (min) rows = rows.filter((d) => Number(d.rating) >= min);
  }

  rows.sort((a, b) => Number(b.rating) - Number(a.rating) || Number(b.rating_count) - Number(a.rating_count));
  const limit = params.findLast((p) => typeof p === 'number') || 30;
  return rows.slice(0, Math.min(limit, 100));
};

const publicUser = (u) => u && {
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  avatar_url: u.avatar_url,
  bio: u.bio,
  xp: u.xp,
  level: u.level,
  is_active: u.is_active,
  is_verified: u.is_verified,
  preferences: u.preferences,
  created_at: u.created_at,
  last_login_at: u.last_login_at,
};

async function query(text, params = []) {
  const sql = text.replace(/\s+/g, ' ').trim();
  const lower = sql.toLowerCase();

  if (lower === 'select 1') return result([{ '?column?': 1 }]);

  if (lower.includes('from users where email = $1')) {
    const userRow = state.users.find((u) => u.email === String(params[0]).toLowerCase());
    if (lower.startsWith('select id,email')) return result(userRow ? [{ id: userRow.id, email: userRow.email }] : []);
    if (lower.startsWith('select id from')) return result(userRow ? [{ id: userRow.id }] : []);
    return result(userRow ? [userRow] : []);
  }
  if (lower.includes('from users where id = $1')) {
    const userRow = state.users.find((u) => u.id === params[0]);
    return result(userRow ? [lower.includes('select *') ? userRow : publicUser(userRow)] : []);
  }
  if (lower.includes('from users where firebase_uid')) {
    const userRow = state.users.find((u) => u.firebase_uid === params[0] || u.email === params[1]);
    return result(userRow ? [userRow] : []);
  }
  if (lower.startsWith('select id,name,avatar_url,xp,level from users where id')) {
    const userRow = state.users.find((u) => u.id === params[0]);
    return result(userRow ? [{ id: userRow.id, name: userRow.name, avatar_url: userRow.avatar_url, xp: userRow.xp, level: userRow.level }] : []);
  }
  if (lower.includes('from users where is_active = true')) {
    return result(state.users.filter((u) => u.is_active).sort((a, b) => b.xp - a.xp).slice(0, params[0] || 20).map(publicUser));
  }
  if (lower.startsWith('select') && lower.includes('from users order by')) {
    return result(state.users.map(publicUser).slice(params[1] || 0, (params[1] || 0) + (params[0] || 50)));
  }
  if (lower.startsWith('insert into users')) {
    const newUser = {
      id: id(),
      name: params[0],
      email: String(params[1]).toLowerCase(),
      phone: params[2] || null,
      password_hash: lower.includes('firebase_uid') ? null : params[3],
      firebase_uid: lower.includes('firebase_uid') ? params[3] : null,
      role: 'user',
      avatar_url: null,
      bio: null,
      is_verified: lower.includes('true'),
      is_active: true,
      xp: 0,
      level: 1,
      preferences: {},
      last_login_at: null,
      created_at: now(),
      updated_at: now(),
    };
    state.users.push(newUser);
    return result([newUser]);
  }
  if (lower.startsWith('update users set last_login_at')) {
    const u = state.users.find((row) => row.id === params[0]);
    if (u) u.last_login_at = now();
    return result([], u ? 1 : 0);
  }
  if (lower.startsWith('update users set firebase_uid')) {
    const u = state.users.find((row) => row.id === params[1]);
    if (u) { u.firebase_uid = params[0]; u.is_verified = true; }
    return result([], u ? 1 : 0);
  }
  if (lower.startsWith('update users set is_verified')) {
    const u = state.users.find((row) => row.email === params[0]);
    if (u) u.is_verified = true;
    return result([], u ? 1 : 0);
  }
  if (lower.startsWith('update users set is_active')) {
    const u = state.users.find((row) => row.id === params[0]);
    if (u) u.is_active = false;
    return result([], u ? 1 : 0);
  }
  if (lower.startsWith('update users set preferences = preferences')) {
    const u = state.users.find((row) => row.id === params[1]);
    if (u) u.preferences = { ...u.preferences, ...JSON.parse(params[0]) };
    return result(u ? [{ preferences: u.preferences }] : []);
  }
  if (lower.startsWith('update users set xp = xp +')) {
    const u = state.users.find((row) => row.id === params[1]);
    if (u) u.xp += Number(params[0]);
    return result(u ? [{ xp: u.xp, level: u.level }] : []);
  }
  if (lower.startsWith('update users set level')) {
    const u = state.users.find((row) => row.id === params[1]);
    if (u) u.level = Number(params[0]);
    return result([], u ? 1 : 0);
  }
  if (lower.startsWith('update users set password_hash')) {
    const u = state.users.find((row) => row.email === params[1]);
    if (u) u.password_hash = params[0];
    return result([], u ? 1 : 0);
  }
  if (lower.startsWith('update users set') && lower.includes('returning')) {
    const u = state.users.find((row) => row.id === params.at(-1));
    if (u) {
      const fields = ['name', 'phone', 'avatar_url', 'bio', 'preferences'];
      let index = 0;
      for (const field of fields) {
        if (lower.includes(`${field} = $`)) u[field] = params[index++];
      }
      u.updated_at = now();
    }
    return result(u ? [publicUser(u)] : []);
  }

  if (lower.startsWith('insert into otp_codes')) {
    state.otp_codes.push({ id: id(), user_id: params[0], target: params[1], code_hash: params[2], purpose: lower.includes("'reset'") ? 'reset' : 'verify', expires_at: params[3], consumed_at: null, created_at: now() });
    return result();
  }
  if (lower.includes('from otp_codes')) {
    const purpose = lower.includes("purpose = 'reset'") ? 'reset' : 'verify';
    return result(state.otp_codes.filter((o) => o.target === params[0] && o.purpose === purpose && !o.consumed_at && o.expires_at > now()).sort((a, b) => b.created_at - a.created_at).slice(0, 1));
  }
  if (lower.startsWith('update otp_codes')) {
    const o = state.otp_codes.find((row) => row.id === params[0]);
    if (o) o.consumed_at = now();
    return result([], o ? 1 : 0);
  }

  if (lower.startsWith('insert into refresh_tokens')) {
    state.refresh_tokens.push({ id: id(), user_id: params[0], token_hash: params[1], expires_at: params[2], user_agent: params[3], ip_address: params[4], revoked_at: null, created_at: now() });
    return result();
  }
  if (lower.includes('from refresh_tokens')) {
    const rt = state.refresh_tokens.find((t) => t.token_hash === params[0] && !t.revoked_at && t.expires_at > now());
    const u = rt && state.users.find((row) => row.id === rt.user_id);
    return result(rt && u ? [{ ...rt, ...u, user_id: rt.user_id }] : []);
  }
  if (lower.startsWith('update refresh_tokens set revoked_at')) {
    const matches = state.refresh_tokens.filter((t) => lower.includes('token_hash') ? t.token_hash === params[0] : t.user_id === params[0]);
    matches.forEach((t) => { t.revoked_at = now(); });
    return result([], matches.length);
  }

  if (lower.startsWith('select') && lower.includes('from destinations')) {
    if (lower.includes('join users')) {
      const rows = state.reviews.filter((r) => r.destination_id === params[0]).map((r) => ({ ...r, ...publicUser(state.users.find((u) => u.id === r.user_id)) }));
      return result(rows);
    }
    return result(filterDestinations(params, sql));
  }
  if (lower.startsWith('insert into destinations')) {
    const d = {
      id: id(),
      name: params[0],
      city: params[1],
      country: params[2],
      category: params[3] || 'attraction',
      description: params[4],
      short_summary: params[5],
      image_url: params[6],
      images: [],
      latitude: params[7],
      longitude: params[8],
      address: params[9],
      rating: params[10] || 0,
      rating_count: 0,
      price_level: params[11] || 0,
      tags: params[12] || [],
      is_hidden_gem: Boolean(params[13]),
      metadata: {},
      created_at: now(),
      updated_at: now(),
    };
    state.destinations.push(d);
    return result([d]);
  }
  if (lower.startsWith('delete from destinations')) {
    const before = state.destinations.length;
    state.destinations = state.destinations.filter((d) => d.id !== params[0]);
    return result([], before - state.destinations.length);
  }

  if (lower.includes('from trips')) {
    let rows = state.trips.filter((t) => lower.includes('where id = $1') ? t.id === params[0] && (!params[1] || t.user_id === params[1]) : t.user_id === params[0]);
    if (lower.includes('join users')) rows = rows.map((t) => ({ ...t, user_name: state.users.find((u) => u.id === t.user_id)?.name }));
    return result(rows);
  }
  if (lower.startsWith('insert into trips')) {
    const t = { id: id(), user_id: params[0], title: params[1], destination: params[2], start_date: params[3], end_date: params[4], budget: params[5], travelers: params[6] || 1, status: 'planned', itinerary: params[7] ? JSON.parse(params[7]) : [], notes: params[8], created_at: now(), updated_at: now() };
    state.trips.push(t);
    return result([t]);
  }
  if (lower.startsWith('update trips set itinerary')) {
    const t = state.trips.find((row) => row.id === params[1]);
    if (t) t.itinerary = JSON.parse(params[0]);
    return result([], t ? 1 : 0);
  }
  if (lower.startsWith('delete from trips')) {
    const before = state.trips.length;
    state.trips = state.trips.filter((t) => !(t.id === params[0] && t.user_id === params[1]));
    return result([], before - state.trips.length);
  }

  if (lower.startsWith('insert into audio_tours')) {
    const tour = { id: id(), destination_id: params[0], user_id: params[1], title: params[2], transcript: params[3], audio_url: params[4], language: params[5], duration_sec: params[6], created_at: now() };
    state.audio_tours.push(tour);
    return result([tour]);
  }
  if (lower.includes('from audio_tours')) {
    const rows = lower.includes('where id = $1')
      ? state.audio_tours.filter((t) => t.id === params[0])
      : state.audio_tours.filter((t) => t.user_id === params[0] || !t.user_id);
    return result(rows);
  }

  if (lower.includes('from favorites')) {
    return result(state.favorites.filter((f) => f.user_id === params[0]).map((f) => ({ favorite_id: f.id, favorited_at: f.created_at, ...state.destinations.find((d) => d.id === f.destination_id) })));
  }
  if (lower.startsWith('insert into favorites')) {
    if (!state.favorites.some((f) => f.user_id === params[0] && f.destination_id === params[1])) state.favorites.push({ id: id(), user_id: params[0], destination_id: params[1], created_at: now() });
    return result();
  }
  if (lower.startsWith('delete from favorites')) {
    const before = state.favorites.length;
    state.favorites = state.favorites.filter((f) => !(f.user_id === params[0] && f.destination_id === params[1]));
    return result([], before - state.favorites.length);
  }

  if (lower.includes('from reviews')) {
    return result(state.reviews.filter((r) => r.destination_id === params[0]).map((r) => ({ ...r, ...publicUser(state.users.find((u) => u.id === r.user_id)) })));
  }
  if (lower.startsWith('insert into reviews')) {
    let review = state.reviews.find((r) => r.user_id === params[0] && r.destination_id === params[1]);
    if (!review) {
      review = { id: id(), user_id: params[0], destination_id: params[1], created_at: now() };
      state.reviews.push(review);
    }
    Object.assign(review, { rating: params[2], title: params[3], body: params[4], updated_at: now() });
    return result([review]);
  }
  if (lower.startsWith('delete from reviews')) {
    const review = state.reviews.find((r) => r.id === params[0] && r.user_id === params[1]);
    state.reviews = state.reviews.filter((r) => r !== review);
    return result(review ? [{ destination_id: review.destination_id }] : []);
  }
  if (lower.startsWith('update destinations d set')) return result();

  if (lower.includes('from badges where code')) return result(state.badges.filter((b) => b.code === params[0]));
  if (lower.includes('from badges order by')) return result([...state.badges].sort((a, b) => a.xp_reward - b.xp_reward));
  if (lower.includes('from user_badges')) return result(state.user_badges.filter((ub) => ub.user_id === params[0]).map((ub) => ({ ...state.badges.find((b) => b.id === ub.badge_id), earned_at: ub.earned_at })));
  if (lower.startsWith('insert into user_badges')) {
    if (state.user_badges.some((ub) => ub.user_id === params[0] && ub.badge_id === params[1])) return result([]);
    const ub = { id: id(), user_id: params[0], badge_id: params[1], earned_at: now() };
    state.user_badges.push(ub);
    return result([ub]);
  }
  if (lower.includes('from xp_logs')) return result(state.xp_logs.filter((x) => x.user_id === params[0]).slice(0, 20));
  if (lower.startsWith('insert into xp_logs')) {
    state.xp_logs.push({ id: id(), user_id: params[0], action: params[1], points: params[2], metadata: JSON.parse(params[3] || '{}'), created_at: now() });
    return result();
  }

  if (lower.includes('from notifications')) return result(state.notifications.filter((n) => n.user_id === params[0]));
  if (lower.startsWith('insert into notifications')) {
    const n = { id: id(), user_id: params[0], title: params[1], body: params[2], type: params[3], payload: JSON.parse(params[4] || '{}'), is_read: false, created_at: now() };
    state.notifications.push(n);
    return result([n]);
  }
  if (lower.startsWith('update notifications')) {
    const matches = state.notifications.filter((n) => lower.includes('id = $1') ? n.id === params[0] && n.user_id === params[1] : n.user_id === params[0]);
    matches.forEach((n) => { n.is_read = true; });
    return result([], matches.length);
  }
  if (lower.startsWith('delete from notifications')) {
    const before = state.notifications.length;
    state.notifications = state.notifications.filter((n) => !(n.id === params[0] && n.user_id === params[1]));
    return result([], before - state.notifications.length);
  }

  if (lower.includes('from trip_history')) return result([]);
  if (lower.startsWith('insert into trip_history')) {
    const h = { id: id(), user_id: params[0], destination_id: params[1], notes: params[2], visited_at: now() };
    state.trip_history.push(h);
    return result([h]);
  }

  return result();
}

const pool = {
  query,
  end: async () => {},
  on: () => {},
};

const withTransaction = async (fn) => fn({ query });

module.exports = { pool, query, withTransaction, state, isMemory: true };
