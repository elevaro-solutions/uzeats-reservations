const VERIFIED_FOOD_PHOTOS = [
  '1555939594-58d7cb561ad1',
  '1504674900247-0877df9cc836',
  '1414235077428-338989a2e8c0',
  '1565299624946-b28f40a0ae38',
  '1553621042-f6e147245754',
  '1551782450-a2132b4ba21d',
  '1559339352-11d035aa65de',
  '1559847844-5315695dadae',
  '1551218808-94e220e084d2',
  '1546069901-ba9599a7e63c',
];

const INTERIOR_PHOTOS = [
  '1414235077428-338989a2e8c0',
  '1504674900247-0877df9cc836',
  '1551218808-94e220e084d2',
  '1551782450-a2132b4ba21d',
  '1553621042-f6e147245754',
];

function unsplash(photoId, w = 800, h = 600) {
  return `https://images.unsplash.com/photo-${photoId}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

function restaurantPhotos(index) {
  return [0, 1, 2].map((offset) => unsplash(VERIFIED_FOOD_PHOTOS[(index + offset) % VERIFIED_FOOD_PHOTOS.length]));
}

function tablePhotoUrl(restaurantName, tableName) {
  const hash = [...`${restaurantName}-${tableName}`].reduce((a, c) => a + c.charCodeAt(0), 0);
  return unsplash(INTERIOR_PHOTOS[hash % INTERIOR_PHOTOS.length], 600, 400);
}

function menuItemPhotoUrl(itemName) {
  const hash = [...itemName].reduce((a, c) => a + c.charCodeAt(0), 0);
  return unsplash(VERIFIED_FOOD_PHOTOS[hash % VERIFIED_FOOD_PHOTOS.length], 400, 400);
}

const restaurantById = {};
let restaurantIndex = 0;

db.restaurants.find().forEach((r) => {
  restaurantById[String(r._id)] = r;
  const photos = restaurantPhotos(restaurantIndex++);
  db.restaurants.updateOne({ _id: r._id }, { $set: { photos } });
});

let tableCount = 0;
db.tables.find().forEach((t) => {
  const restaurant = restaurantById[String(t.restaurantId)];
  const photoUrl = tablePhotoUrl(restaurant?.name || 'Restaurant', t.name || 'Table');
  db.tables.updateOne({ _id: t._id }, { $set: { photoUrl } });
  tableCount++;
});

let menuCount = 0;
db.menus.find().forEach((menu) => {
  const sections = (menu.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => ({
      ...item,
      photoUrl: menuItemPhotoUrl(item.name || 'Dish'),
    })),
  }));
  db.menus.updateOne({ _id: menu._id }, { $set: { sections } });
  menuCount++;
});

print(`Patched ${restaurantIndex} restaurants, ${tableCount} tables, ${menuCount} menus`);
