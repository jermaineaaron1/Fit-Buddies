import type { FoodResult } from '../lib/openFoodFacts'

// Common Malaysian foods. Values are approximate per 100 g, compiled around
// Malaysian Food Composition Database entries and typical prepared servings.
// Recipes vary materially by vendor; users can edit values before saving.
const foods: Array<[string, number, number, number, number, number, number]> = [
  ['Nasi lemak',165,4.8,28.3,3.6,1.0,306], ['Nasi ayam',190,8.5,25,6.5,1.0,400],
  ['Nasi goreng kampung',185,6.5,28,5.5,1.3,350], ['Nasi putih',130,2.3,30,0.1,0.4,200],
  ['Nasi perang masak',123,2.7,25.6,1.0,1.6,200], ['Char kway teow',210,8,27,8,1.2,350],
  ['Mee goreng mamak',195,6.8,29,6.2,1.8,350], ['Mee hoon goreng',175,5.5,28,4.8,1.2,320],
  ['Laksa asam',115,5.5,18,2.4,1.4,500], ['Laksa kari',165,6,18,8,1.2,500],
  ['Roti canai',300,7.5,46,10,2.0,95], ['Roti telur',285,10,38,10,1.8,140],
  ['Thosai',170,5,30,3.5,2.0,120], ['Chapati',240,8.5,45,3.5,5.0,70],
  ['Kuah dhal',105,5.5,15,2.5,4.0,120], ['Ayam satay',220,24,7,11,0.5,100],
  ['Daging satay',235,23,8,13,0.5,100], ['Ayam percik',195,22,4,10,0.5,180],
  ['Ayam goreng berempah',260,24,8,15,0.5,150], ['Dada ayam panggang',165,31,0,3.6,0,150],
  ['Rendang daging',240,22,6,15,1.5,150], ['Kari daging',190,18,7,10,1.3,180],
  ['Ikan bakar',150,24,2,5,0.3,180], ['Asam pedas ikan',125,16,5,4.5,1.2,220],
  ['Ikan kukus',120,23,1,2.5,0.2,180], ['Sambal udang',170,19,8,7,1.0,160],
  ['Telur rebus',155,13,1.1,11,0,100], ['Telur separuh masak',145,13,1,10,0,100],
  ['Tauhu goreng',190,15,6,12,1.5,120], ['Tempeh goreng',250,19,13,15,5.0,100],
  ['Yong tau foo sup',105,10,7,4,1.5,300], ['Sup ayam',75,9,4,2.5,0.7,350],
  ['Bubur ayam',95,5.5,14,2.2,0.7,400], ['Kangkung belacan',95,3.5,8,6,3.0,120],
  ['Sayur campur tumis',85,3,10,4,3.5,150], ['Ulam campur',45,3,7,0.7,4.0,100],
  ['Edamame rebus',121,12,9,5,5.2,100], ['Susu soya tanpa gula',40,3.6,2,2,0.6,250],
  ['Tau fu fah tanpa sirap',75,7,4,3.5,0.5,180], ['Greek yogurt plain',73,9.5,4,2,0,170],

  // Everyday staples beyond the local dishes above. Photo estimates are only
  // grounded in real numbers when the dish is in this table, and the original
  // 40 entries left common things — rice, eggs, chicken, bread, fruit, drinks —
  // falling back to model-guessed macros. Values are per 100 g as eaten
  // (cooked where relevant), from standard composition references.
  ['Chicken breast grilled',165,31,0,3.6,0,150], ['Chicken thigh grilled',209,26,0,10.9,0,150],
  ['Fried chicken drumstick',260,22,9,15,0.5,90], ['Beef steak grilled',250,26,0,15,0,150],
  ['Minced beef cooked',250,26,0,15,0,120], ['Pork chop grilled',231,26,0,14,0,150],
  ['Salmon grilled',208,20,0,13,0,150], ['Tuna canned in water',116,26,0,1,0,100],
  ['Prawns cooked',99,24,0.2,0.3,0,100], ['Egg fried',196,14,0.8,15,0,60],
  ['Egg scrambled',149,10,1.6,11,0,100], ['Tofu firm',144,17,3,9,2,100],
  ['Spaghetti cooked',158,5.8,31,0.9,1.8,200], ['Egg noodles cooked',138,4.5,25,2.1,1.2,200],
  ['White bread',265,9,49,3.2,2.7,30], ['Wholemeal bread',247,13,41,3.4,7,30],
  ['Oats dry',389,17,66,7,11,40], ['Potato boiled',87,1.9,20,0.1,1.8,150],
  ['Sweet potato baked',90,2,21,0.1,3.3,150], ['French fries',312,3.4,41,15,3.8,120],
  ['Broccoli steamed',35,2.4,7,0.4,3.3,100], ['Mixed salad',20,1.5,3.5,0.2,1.8,100],
  ['Banana',89,1.1,23,0.3,2.6,120], ['Apple',52,0.3,14,0.2,2.4,180],
  ['Orange',47,0.9,12,0.1,2.4,150], ['Papaya',43,0.5,11,0.3,1.7,150],
  ['Watermelon',30,0.6,8,0.2,0.4,200], ['Avocado',160,2,9,15,7,100],
  ['Milk full cream',61,3.2,4.8,3.3,0,250], ['Milk skim',34,3.4,5,0.1,0,250],
  ['Teh tarik',90,2.5,13,3,0,250], ['Kopi o kosong',2,0.2,0.3,0,0,200],
  ['Milo',80,2.5,13,2,0.5,250], ['Orange juice',45,0.7,10,0.2,0.2,250],
  ['Cola',42,0,10.6,0,0,330], ['Beer',43,0.5,3.6,0,0,330],
  ['Peanuts roasted',587,26,16,49,8,30], ['Almonds',579,21,22,50,12,30],
  ['Potato chips',536,7,53,34,4,30], ['Chocolate bar',535,8,59,30,3,45],
  ['Protein bar',350,30,35,10,5,60], ['Ice cream vanilla',207,3.5,24,11,0.7,100],
  ['Beef burger',250,13,27,10,1.5,200], ['Cheese pizza',266,11,33,10,2.3,110],
  ['Chicken sandwich',210,14,24,6,2,200], ['Caesar salad with chicken',190,12,6,13,1.5,250],
]

export const MALAYSIAN_FOODS: FoodResult[] = foods.map(([name, calories, protein, carbs, fat, fibre, serving]) => ({
  code: `myfcd-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
  name,
  brand: 'Malaysian food · estimated',
  imageUrl: null,
  caloriesPer100g: calories,
  proteinPer100g: protein,
  carbsPer100g: carbs,
  fatPer100g: fat,
  fibrePer100g: fibre,
  servingGrams: serving,
  source: 'myfcd',
}))

export function searchMalaysianFoods(query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return MALAYSIAN_FOODS.slice(0,20)
  return MALAYSIAN_FOODS.filter((food) => terms.every((term) => `${food.name} ${food.brand}`.toLowerCase().includes(term)))
}
