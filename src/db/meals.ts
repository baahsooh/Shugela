import { db } from "./db";
import { totalCarbs } from "@/lib/foods";
import { createId } from "@/lib/utils";
import { getAuthState } from "@/hooks/use-auth";
import { requestSync } from "@/lib/supabase/sync";
import type { CustomFood, Meal, MealItem, MealType } from "@/lib/types";

/* ------------------------------------------------------------------ meals --- */

export async function createMeal(input: {
  mealType: MealType;
  eatenAt: string;
  items: MealItem[];
  note?: string;
}): Promise<Meal> {
  const now = new Date().toISOString();
  const { userId } = getAuthState();

  const meal: Meal = {
    id: createId(),
    mealType: input.mealType,
    eatenAt: input.eatenAt,
    items: input.items,
    carbsG: Math.round(totalCarbs(input.items)),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(userId ? { userId } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await db.meals.add(meal);
  requestSync();
  return meal;
}

export async function getAllMeals(): Promise<Meal[]> {
  const all = await db.meals.toArray();
  return all.sort((a, b) => b.eatenAt.localeCompare(a.eatenAt));
}

export async function deleteMeal(id: string): Promise<void> {
  await db.meals.delete(id);
  requestSync();
}

export async function deleteAllMeals(): Promise<void> {
  await db.meals.clear();
  requestSync();
}

/**
 * The meal a glucose reading most likely followed.
 *
 * A post-meal reading is judged against what you actually ate, so we look back
 * for the nearest meal of that kind within the previous four hours.
 */
export function findPrecedingMeal(
  meals: Meal[],
  measuredAt: string,
  mealType: MealType | null,
  windowHours = 4,
): Meal | null {
  if (!mealType) return null;

  const time = new Date(measuredAt).getTime();
  const window = windowHours * 3_600_000;

  const candidates = meals
    .filter((meal) => meal.mealType === mealType)
    .map((meal) => ({ meal, delta: time - new Date(meal.eatenAt).getTime() }))
    .filter(({ delta }) => delta >= -15 * 60_000 && delta <= window);

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => a.delta - b.delta)[0].meal;
}

export function carbsForDay(meals: Meal[], dayKey: string): number {
  return meals
    .filter((meal) => mealKey(meal.eatenAt) === dayKey)
    .reduce((total, meal) => total + meal.carbsG, 0);
}

/** Local YYYY-MM-DD, matching lib/dates. */
function mealKey(date: string): string {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

/* ---------------------------------------------------------- custom foods --- */

export async function getCustomFoods(): Promise<CustomFood[]> {
  const all = await db.customFoods.toArray();
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCustomFood(input: {
  name: string;
  carbsPerServing: number;
  servingLabel: string;
}): Promise<CustomFood> {
  const food: CustomFood = {
    id: `custom-${createId()}`,
    name: input.name.trim(),
    carbsPerServing: input.carbsPerServing,
    servingLabel: input.servingLabel.trim() || "1 serving",
    category: "Other",
    createdAt: new Date().toISOString(),
  };

  await db.customFoods.add(food);
  return food;
}

export async function deleteCustomFood(id: string): Promise<void> {
  await db.customFoods.delete(id);
}