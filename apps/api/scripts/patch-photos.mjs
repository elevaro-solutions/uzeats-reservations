import mongoose from 'mongoose';

function unsplash(photoId, w = 800, h = 600) {
  return `https://images.unsplash.com/photo-${photoId}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

const CUISINE_PHOTOS = {
  'Uzbek/Central Asian': [
    '1555939594-58d7cb561ad1',
    '1604908177527-29f4ce8f3b7c',
    '1625938145741-3fcccd7da847',
  ],
  Mediterranean: [
    '1540189547336-6c6fc2530475',
    '1504674900247-0877df9cc836',
    '1414235077428-338989a2e8c0',
  ],
  Italian: [
    '1565299624946-b28f40a0ae38',
    '1476124369491-e467addf72b7',
    '1571997478773-2f49ba7508db',
  ],
  Japanese: [
    '1579871495558-5afe1d0552ae',
    '1611145434007-9073fe6cd0f6',
    '1553621042-f6e147245754',
  ],
  Mexican: [
    '1565299585325-38a3c4da42d6',
    '1504544757798-3d92b7047978',
    '1599974571268-8db4b0a4b7b5',
  ],
  Indian: [
    '1585931643454-b54f3a07c7c4',
    '1565557623262-b51c2513a7b4',
    '1601051931882-63fbfc7b0cde',
  ],
  American: [
    '1550547660-945f6b13d2ce',
    '1551782450-a2132b4ba21d',
    '1528607929212-4d362164bd7f',
  ],
  Seafood: [
    '1559339352-11d035aa65de',
    '1519708227418-c8fd9a32b3a9',
    '1559847844-5315695dadae',
  ],
  Turkish: [
    '1599488159741-5933fb2214c8',
    '1544025162-d88f1a3f7a42',
    '1551218808-94e220e084d2',
  ],
  Thai: [
    '1559316843-1694d0f24f1f',
    '1455619452474-d2be8b1e70ee',
    '1569562293361-4a6d7bf90417',
  ],
};

const DEFAULT_PHOTOS = CUISINE_PHOTOS['Uzbek/Central Asian'];
const INTERIOR_PHOTOS = [
  '1517248135460-4c3edbc1d0e0',
  '1550966849-07ece16ec0ef',
  '1600891964094-3e51ab4d8d88',
  '1552569976-03e0923a153f',
  '1466978913421-dad2ebd01d9b',
];

function restaurantPhotos(cuisine, index) {
  const pool = CUISINE_PHOTOS[cuisine] ?? DEFAULT_PHOTOS;
  return [0, 1, 2].map((offset) => unsplash(pool[(index + offset) % pool.length]));
}

function tablePhotoUrl(restaurantName, tableName) {
  const hash = [...`${restaurantName}-${tableName}`].reduce((a, c) => a + c.charCodeAt(0), 0);
  return unsplash(INTERIOR_PHOTOS[hash % INTERIOR_PHOTOS.length], 600, 400);
}

function menuItemPhotoUrl(itemName, cuisine) {
  const pool = CUISINE_PHOTOS[cuisine] ?? DEFAULT_PHOTOS;
  const hash = [...itemName].reduce((a, c) => a + c.charCodeAt(0), 0);
  return unsplash(pool[hash % pool.length], 400, 400);
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const restaurants = await db.collection('restaurants').find({}).toArray();
const restaurantById = new Map(restaurants.map((r) => [String(r._id), r]));

let i = 0;
for (const r of restaurants) {
  await db.collection('restaurants').updateOne(
    { _id: r._id },
    { $set: { photos: restaurantPhotos(r.cuisine || 'Uzbek/Central Asian', i++) } },
  );
}

const tables = await db.collection('tables').find({}).toArray();
for (const t of tables) {
  const restaurant = restaurantById.get(String(t.restaurantId));
  await db.collection('tables').updateOne(
    { _id: t._id },
    { $set: { photoUrl: tablePhotoUrl(restaurant?.name ?? 'Restaurant', t.name ?? 'Table') } },
  );
}

const menus = await db.collection('menus').find({}).toArray();
for (const menu of menus) {
  const restaurant = restaurantById.get(String(menu.restaurantId));
  const cuisine = restaurant?.cuisine || 'Uzbek/Central Asian';
  const sections = (menu.sections ?? []).map((section) => ({
    ...section,
    items: (section.items ?? []).map((item) => ({
      ...item,
      photoUrl: menuItemPhotoUrl(item.name ?? 'Dish', cuisine),
    })),
  }));
  await db.collection('menus').updateOne({ _id: menu._id }, { $set: { sections } });
}

console.log(
  `Patched photos: ${restaurants.length} restaurants, ${tables.length} tables, ${menus.length} menus`,
);
await mongoose.disconnect();
