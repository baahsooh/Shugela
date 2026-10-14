import type { CustomFood } from "./types";

/**
 * A small, curated carbohydrate table.
 *
 * Deliberately not a food database: these are the ~45 things most people in
 * South Africa actually eat, with a serving that matches how they measure it.
 * Anything missing can be added by the user (custom foods live in Dexie) or
 * typed free-hand, so the catalogue is a shortcut rather than a gate.
 *
 * Carbs are grams of available carbohydrate per listed serving. Figures follow
 * standard food-composition tables; treat them as a planning aid, not a
 * clinical reference.
 */

export interface Food {
  id: string;
  name: string;
  /** Carbs per serving, in grams. */
  carbs: number;
  serving: string;
  category: FoodCategory;
}

export type FoodCategory = "Staples" | "Protein" | "Legumes" | "Vegetables" | "Fruit" | "Dairy" | "Drinks" | "Other";

export const FOOD_CATEGORIES: FoodCategory[] = [
  "Staples",
  "Protein",
  "Legumes",
  "Vegetables",
  "Fruit",
  "Dairy",
  "Drinks",
  "Other",
];

export const FOOD_CATALOGUE: Food[] = [
  // ---------------------------------------------------------------- staples
  { id: "brown-rice", name: "Brown rice", carbs: 38, serving: "1 cup cooked", category: "Staples" },
  { id: "white-rice", name: "White rice", carbs: 45, serving: "1 cup cooked", category: "Staples" },
  { id: "pap", name: "Maize meal (pap)", carbs: 38, serving: "1 cup cooked", category: "Staples" },
  { id: "samp", name: "Samp", carbs: 32, serving: "1 cup cooked", category: "Staples" },
  { id: "bread-whole", name: "Whole-wheat bread", carbs: 11, serving: "1 slice", category: "Staples" },
  { id: "bread-white", name: "White bread", carbs: 15, serving: "1 slice", category: "Staples" },
  { id: "roti", name: "Roti", carbs: 30, serving: "1 medium", category: "Staples" },
  { id: "pasta", name: "Pasta", carbs: 43, serving: "1 cup cooked", category: "Staples" },
  { id: "potato", name: "Boiled potato", carbs: 20, serving: "1 medium", category: "Staples" },
  { id: "sweet-potato", name: "Sweet potato", carbs: 20, serving: "1 medium", category: "Staples" },
  { id: "oats", name: "Oats", carbs: 27, serving: "½ cup dry", category: "Staples" },
  { id: "mielie-rings", name: "Cornflakes", carbs: 24, serving: "1 cup", category: "Staples" },

  // ---------------------------------------------------------------- protein
  { id: "chicken", name: "Grilled chicken breast", carbs: 0, serving: "100 g", category: "Protein" },
  { id: "boerewors", name: "Boerewors", carbs: 2, serving: "100 g", category: "Protein" },
  { id: "steak", name: "Steak", carbs: 0, serving: "100 g", category: "Protein" },
  { id: "mince", name: "Lean mince", carbs: 0, serving: "100 g", category: "Protein" },
  { id: "fish", name: "Grilled fish", carbs: 0, serving: "100 g", category: "Protein" },
  { id: "egg", name: "Egg", carbs: 1, serving: "1 large", category: "Protein" },
  { id: "tofu", name: "Tofu", carbs: 3, serving: "100 g", category: "Protein" },

  // ---------------------------------------------------------------- legumes
  { id: "beans-cooked", name: "Baked beans", carbs: 30, serving: "1 cup", category: "Legumes" },
  { id: "lentils", name: "Lentils", carbs: 20, serving: "1 cup cooked", category: "Legumes" },
  { id: "chickpeas", name: "Chickpeas", carbs: 44, serving: "1 cup cooked", category: "Legumes" },
  { id: "black-beans", name: "Black beans", carbs: 41, serving: "1 cup cooked", category: "Legumes" },

  // ------------------------------------------------------------- vegetables
  { id: "spinach", name: "Spinach", carbs: 2, serving: "100 g", category: "Vegetables" },
  { id: "broccoli", name: "Broccoli", carbs: 7, serving: "100 g", category: "Vegetables" },
  { id: "mixed-veg", name: "Mixed vegetables", carbs: 6, serving: "1 cup", category: "Vegetables" },
  { id: "salad", name: "Green salad", carbs: 3, serving: "1 bowl", category: "Vegetables" },
  { id: "carrots", name: "Carrots", carbs: 6, serving: "100 g", category: "Vegetables" },
  { id: "butternut", name: "Butternut", carbs: 12, serving: "100 g", category: "Vegetables" },
  { id: "beetroot", name: "Beetroot", carbs: 10, serving: "100 g", category: "Vegetables" },

  // ------------------------------------------------------------------ fruit
  { id: "apple", name: "Apple", carbs: 19, serving: "1 medium", category: "Fruit" },
  { id: "banana", name: "Banana", carbs: 27, serving: "1 medium", category: "Fruit" },
  { id: "orange", name: "Orange", carbs: 15, serving: "1 medium", category: "Fruit" },
  { id: "naartjie", name: "Naartjie", carbs: 12, serving: "1 medium", category: "Fruit" },
  { id: "grapes", name: "Grapes", carbs: 18, serving: "100 g", category: "Fruit" },
  { id: "watermelon", name: "Watermelon", carbs: 8, serving: "200 g", category: "Fruit" },
  { id: "mango", name: "Mango", carbs: 15, serving: "100 g", category: "Fruit" },

  // ------------------------------------------------------------------ dairy
  { id: "milk", name: "Milk", carbs: 12, serving: "250 ml", category: "Dairy" },
  { id: "yoghurt", name: "Plain yoghurt", carbs: 5, serving: "100 g", category: "Dairy" },
  { id: "cheese", name: "Cheese slice", carbs: 1, serving: "1 slice", category: "Dairy" },

  // ----------------------------------------------------------------- drinks
  { id: "coke", name: "Cola", carbs: 35, serving: "330 ml can", category: "Drinks" },
  { id: "juice", name: "Fruit juice", carbs: 20, serving: "200 ml", category: "Drinks" },
  { id: "tea-sugar", name: "Tea with milk & sugar", carbs: 3, serving: "1 cup", category: "Drinks" },
  { id: "latte", name: "Latte", carbs: 10, serving: "1 cup", category: "Drinks" },
];

/** Catalogue + the user's own foods, in one list for search. */
export function allFoods(custom: CustomFood[] = []): Food[] {
  return [
    ...FOOD_CATALOGUE,
    ...custom.map((food) => ({
      id: food.id,
      name: food.name,
      carbs: food.carbsPerServing,
      serving: food.servingLabel,
      category: (food.category ?? "Other") as FoodCategory,
    })),
  ];
}

export function searchFoods(query: string, custom: CustomFood[] = []): Food[] {
  const all = allFoods(custom);
  const term = query.trim().toLowerCase();
  if (!term) return all;

  return all
    .filter((food) => food.name.toLowerCase().includes(term) || food.category.toLowerCase().includes(term))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function totalCarbs(items: { carbsPerServing: number; servings: number }[]): number {
  return items.reduce((total, item) => total + item.carbsPerServing * item.servings, 0);
}