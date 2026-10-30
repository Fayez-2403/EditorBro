// Tiffinly sample data. The brand, kitchens and prices are fictional.
export type ArtKey =
  | 'thali' | 'miniThali' | 'biryani' | 'vegBiryani' | 'dosa' | 'ravaDosa' | 'idli' | 'rolls' | 'paneerRoll'
  | 'eggRoll' | 'chai' | 'coffee' | 'samosa' | 'bunMaska' | 'dal' | 'paneer' | 'salan' | 'jamun' | 'meetha'
  | 'mysorePak' | 'chaas' | 'lassi';

export interface Dish {
  id: string;
  name: string;
  price: number;
  veg: boolean;
  desc: string;
  art: ArtKey;
  tag?: string;
  section: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisines: string;
  chip: string;
  veg: boolean;
  rating: number;
  ratings: string;
  time: string;
  km: number;
  forTwo: number;
  art: ArtKey;
  tint: string;
  offer: string;
  dishes: Dish[];
}

export const CHIPS: { id: string; label: string; art: ArtKey }[] = [
  { id: 'all', label: 'All', art: 'miniThali' },
  { id: 'thali', label: 'Thali', art: 'thali' },
  { id: 'biryani', label: 'Biryani', art: 'biryani' },
  { id: 'south', label: 'Dosa', art: 'dosa' },
  { id: 'rolls', label: 'Rolls', art: 'rolls' },
  { id: 'chai', label: 'Chai', art: 'chai' },
];

const d = (section: string, id: string, name: string, price: number, veg: boolean, art: ArtKey, desc: string, tag?: string): Dish =>
  ({ section, id, name, price, veg, art, desc, tag });

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'thali-theory', name: 'Thali Theory', cuisines: 'Thalis · North Indian · Home-style', chip: 'thali', veg: true,
    rating: 4.7, ratings: '3.1k', time: '25–30 min', km: 1.8, forTwo: 350, art: 'thali', tint: '#F6E3BD',
    offer: '₹75 OFF above ₹299',
    dishes: [
      d('Recommended', 'tt-raj', 'Rajasthani Thali', 289, true, 'thali', 'Dal baati, gatte ki sabzi, kadhi, jeera rice, two phulkas, churma and pickle.', 'Bestseller'),
      d('Recommended', 'tt-mini', 'Mini Lunch Thali', 199, true, 'miniThali', 'Dal tadka, seasonal sabzi, rice, two rotis and a little kheer.'),
      d('Mains', 'tt-dal', 'Dal Makhani', 189, true, 'dal', 'Black urad and rajma, simmered overnight, finished with cream.'),
      d('Mains', 'tt-pbm', 'Paneer Butter Masala', 229, true, 'paneer', 'Soft paneer in a tomato-cashew gravy with kasuri methi.'),
      d('Desserts', 'tt-gj', 'Gulab Jamun (2 pcs)', 79, true, 'jamun', 'Warm khoya dumplings in cardamom syrup.'),
    ],
  },
  {
    id: 'saffron-handi', name: 'Saffron Handi', cuisines: 'Biryani · Hyderabadi · Kebabs', chip: 'biryani', veg: false,
    rating: 4.5, ratings: '5.6k', time: '28–32 min', km: 2.4, forTwo: 450, art: 'biryani', tint: '#F5D3A6',
    offer: 'Free delivery today',
    dishes: [
      d('Recommended', 'sh-cdb', 'Chicken Dum Biryani', 329, false, 'biryani', 'Long-grain basmati sealed on dum with saffron, mint and fried onions.', 'Bestseller'),
      d('Recommended', 'sh-vdb', 'Subz Dum Biryani', 259, true, 'vegBiryani', 'Garden vegetables and paneer layered with kewra-scented rice.'),
      d('Sides', 'sh-mks', 'Mirchi ka Salan', 99, true, 'salan', 'Green chillies in a tangy peanut, sesame and tamarind gravy.'),
      d('Desserts', 'sh-dkm', 'Double ka Meetha', 129, true, 'meetha', 'Fried bread pudding soaked in saffron milk, topped with almonds.', 'Chef’s pick'),
      d('Drinks', 'sh-chaas', 'Masala Chaas', 69, true, 'chaas', 'Chilled buttermilk with roasted cumin, ginger and coriander.'),
    ],
  },
  {
    id: 'dosa-deck', name: 'Dosa Deck', cuisines: 'South Indian · Tiffin · Filter coffee', chip: 'south', veg: true,
    rating: 4.6, ratings: '2.2k', time: '20–25 min', km: 1.2, forTwo: 250, art: 'dosa', tint: '#D9E9D2',
    offer: '20% OFF up to ₹60',
    dishes: [
      d('Recommended', 'dd-ghee', 'Ghee Roast Masala Dosa', 149, true, 'dosa', 'Paper-thin, crisp in ghee, with potato masala, sambar and two chutneys.', 'Bestseller'),
      d('Recommended', 'dd-idli', 'Idli Vada Combo', 99, true, 'idli', 'Two steamed idlis and a medu vada with sambar and coconut chutney.'),
      d('Dosas', 'dd-rava', 'Rava Onion Dosa', 139, true, 'ravaDosa', 'Lacy semolina dosa with onion, green chilli and cumin.'),
      d('Drinks', 'dd-coffee', 'Filter Coffee', 49, true, 'coffee', 'Chicory-blend decoction with frothy hot milk.'),
      d('Desserts', 'dd-mysore', 'Mysore Pak', 69, true, 'mysorePak', 'Gram flour fudge in ghee, two pieces.'),
    ],
  },
  {
    id: 'wrapwala', name: 'Wrapwala', cuisines: 'Rolls · Kolkata street food', chip: 'rolls', veg: false,
    rating: 4.4, ratings: '1.8k', time: '15–20 min', km: 0.9, forTwo: 300, art: 'rolls', tint: '#F4CFC0',
    offer: 'Buy 2 rolls, get a lassi',
    dishes: [
      d('Recommended', 'ww-ck', 'Chicken Kathi Roll', 179, false, 'rolls', 'Charred chicken tikka, onion and green chutney in a flaky paratha.', 'Bestseller'),
      d('Recommended', 'ww-pt', 'Paneer Tikka Roll', 159, true, 'paneerRoll', 'Tandoori paneer with pickled onions and mint mayo.'),
      d('Rolls', 'ww-egg', 'Egg Double Roll', 129, false, 'eggRoll', 'Two eggs fried onto the paratha, onion, lime and chilli.'),
      d('Sides', 'ww-sam', 'Aloo Samosa (2 pcs)', 49, true, 'samosa', 'Spiced potato and peas in a crisp ajwain crust.'),
      d('Drinks', 'ww-lassi', 'Mango Lassi', 89, true, 'lassi', 'Thick yoghurt blended with Alphonso mango pulp.'),
    ],
  },
  {
    id: 'kettle-kulhad', name: 'Kettle & Kulhad', cuisines: 'Chai · Snacks · Bakery', chip: 'chai', veg: true,
    rating: 4.8, ratings: '4.4k', time: '12–18 min', km: 0.6, forTwo: 150, art: 'chai', tint: '#EBD6C0',
    offer: 'Flat ₹40 OFF on ₹199',
    dishes: [
      d('Recommended', 'kk-chai', 'Kulhad Masala Chai', 45, true, 'chai', 'Strong Assam tea brewed with ginger and cardamom, served in clay.', 'Bestseller'),
      d('Recommended', 'kk-bun', 'Bun Maska', 55, true, 'bunMaska', 'Soft milk bun, split and slathered with salted butter.'),
      d('Snacks', 'kk-sam', 'Mini Samosa (4 pcs)', 69, true, 'samosa', 'Bite-size, with tamarind and mint chutneys.'),
      d('Drinks', 'kk-coffee', 'Cold Coffee', 99, true, 'coffee', 'Slow-steeped coffee shaken with milk and a little jaggery.'),
      d('Snacks', 'kk-chaas', 'Jeera Chaas', 49, true, 'chaas', 'Buttermilk with roasted cumin and rock salt.'),
    ],
  },
];

export const DISHES = new Map<string, Dish>(RESTAURANTS.flatMap((r) => r.dishes.map((x) => [x.id, x] as const)));
export const restOf = (dishId: string) => RESTAURANTS.find((r) => r.dishes.some((x) => x.id === dishId))!;

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const DELIVERY_FEE = 39;
export const bill = (itemTotal: number) => {
  const taxes = Math.round(itemTotal * 0.05);
  const delivery = itemTotal > 0 ? DELIVERY_FEE : 0;
  return { itemTotal, taxes, delivery, total: itemTotal + taxes + delivery };
};
