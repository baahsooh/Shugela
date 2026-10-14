"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PlusIcon, SearchIcon } from "@/components/icons";
import { PageBody } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { addCustomFood, createMeal, getCustomFoods } from "@/db/meals";
import { useMounted } from "@/hooks/use-environment";
import { MEAL_TYPES, MEAL_TYPE_META } from "@/lib/constants";
import { searchFoods, totalCarbs, type Food } from "@/lib/foods";
import { cn } from "@/lib/utils";
import type { CustomFood, MealItem, MealType } from "@/lib/types";

export default function LogMealPage() {
  const router = useRouter();
  const toast = useToast();

const mounted = useMounted();
  const [mealType, setMealType] = useState<MealType>(() =>
    // Server renders are gated behind `mounted`, so guessing the meal from the
    // clock here cannot cause a hydration mismatch.
    typeof window === "undefined" ? "breakfast" : guessMealType(),
  );
  const [items, setItems] = useState<MealItem[]>([]);
  const [query, setQuery] = useState("");
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void getCustomFoods().then(setCustomFoods);
  }, []);

  const results = useMemo(() => searchFoods(query, customFoods), [query, customFoods]);
  const carbs = Math.round(totalCarbs(items));

  if (!mounted) {
    return (
      <>
        <PageHeader title="Log a meal" backHref="/" />
        <PageBody>
          <div className="h-56 animate-pulse rounded-3xl bg-surface-muted" />
        </PageBody>
      </>
    );
  }

  const addFood = (food: Food) => {
    setItems((current) => {
      const existing = current.find((item) => item.foodId === food.id);
      if (existing) {
        return current.map((item) =>
          item.foodId === food.id ? { ...item, servings: item.servings + 1 } : item,
        );
      }
      return [
        ...current,
        { foodId: food.id, name: food.name, carbsPerServing: food.carbs, servings: 1 },
      ];
    });
    setQuery("");
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast({ title: "Add at least one food", tone: "error" });
      return;
    }
    setSaving(true);
    try {
      await createMeal({
        mealType,
        eatenAt: new Date().toISOString(),
        items,
        ...(note.trim() ? { note } : {}),
      });
      toast({
        title: `${MEAL_TYPE_META[mealType].label} saved`,
        description: `${carbs} g carbs logged`,
      });
      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Log a meal" subtitle="What you ate, and the carbs" backHref="/" />

      <PageBody>
        <Card>
          <CardTitle>Meal</CardTitle>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((type) => {
              const active = type === mealType;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={cn(
                    "rounded-2xl border px-2 py-2.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-surface text-ink-soft active:bg-surface-muted",
                  )}
                >
                  {MEAL_TYPE_META[type].short}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle
            action={
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex items-center gap-1 text-xs font-semibold text-brand"
              >
                <PlusIcon className="size-3.5" />
                New food
              </button>
            }
          >
            Foods
          </CardTitle>

          {items.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-faint">
              Search below and tap a food to add it.
            </p>
          ) : (
            <div className="mb-3 flex flex-col divide-y divide-line">
              {items.map((item) => (
                <div key={item.foodId} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                    <span className="tabular block text-xs text-ink-faint">
                      {Math.round(item.carbsPerServing * item.servings)} g carbs
                    </span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Fewer ${item.name}`}
                      onClick={() =>
                        setItems((current) =>
                          current
                            .map((entry) =>
                              entry.foodId === item.foodId
                                ? { ...entry, servings: entry.servings - 1 }
                                : entry,
                            )
                            .filter((entry) => entry.servings > 0),
                        )
                      }
                      className="flex size-8 items-center justify-center rounded-lg bg-surface-muted text-ink-soft"
                    >
                      −
                    </button>
                    <span className="tabular w-6 text-center text-sm font-semibold text-ink">
                      {item.servings}
                    </span>
                    <button
                      type="button"
                      aria-label={`More ${item.name}`}
                      onClick={() =>
                        setItems((current) =>
                          current.map((entry) =>
                            entry.foodId === item.foodId
                              ? { ...entry, servings: entry.servings + 1 }
                              : entry,
                          ),
                        )
                      }
                      className="flex size-8 items-center justify-center rounded-lg bg-surface-muted text-ink-soft"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search foods…"
              className="h-12 w-full rounded-2xl border border-line bg-surface-muted pl-9 pr-3 text-base text-ink placeholder:text-ink-faint/70"
            />
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto">
            {results.length === 0 ? (
              <p className="py-3 text-center text-xs text-ink-faint">
                Nothing matches “{query}”. Tap New food to add it.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {results.map((food) => (
                  <li key={food.id}>
                    <button
                      type="button"
                      onClick={() => addFood(food)}
                      className="flex w-full items-center gap-3 py-2.5 text-left active:bg-surface-muted"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{food.name}</span>
                        <span className="block text-xs text-ink-faint">
                          {food.serving} · {food.category}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-sm font-semibold text-ink">
                        {food.carbs}
                        <span className="ml-0.5 text-[0.65rem] font-medium text-ink-faint">g</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Note</CardTitle>
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Restaurant, takeaway, skipped the bread…"
            className="w-full resize-none rounded-2xl border border-line bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint/70"
          />
        </Card>

        <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Total carbs
            </p>
            <p className="tabular text-3xl font-semibold leading-tight text-ink">
              {carbs}
              <span className="ml-1 text-base font-medium text-ink-faint">g</span>
            </p>
          </div>
          <Button size="lg" onClick={handleSave} disabled={saving || items.length === 0}>
            {saving ? "Saving…" : "Save meal"}
          </Button>
        </div>

        {adding ? (
          <NewFoodSheet
            onClose={() => setAdding(false)}
            onSaved={async (food) => {
              const next = await getCustomFoods();
              setCustomFoods(next);
              setAdding(false);
              addFood({
                id: food.id,
                name: food.name,
                carbs: food.carbsPerServing,
                serving: food.servingLabel,
                category: "Other",
              });
            }}
          />
        ) : null}
      </PageBody>
    </>
  );
}

function guessMealType(now: Date = new Date()): MealType {
  const hour = now.getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "supper";
  return "snack";
}

function NewFoodSheet({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (food: CustomFood) => void;
}) {
  const [name, setName] = useState("");
  const [serving, setServing] = useState("1 serving");
  const [carbs, setCarbs] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="animate-sheet w-full max-w-md rounded-t-3xl bg-bg-elevated p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />
        <h2 className="mb-3 text-lg font-semibold tracking-tight">New food</h2>

        {error ? <p className="mb-2 text-xs font-medium text-danger">{error}</p> : null}

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Boerewors roll"
              className="h-12 rounded-2xl border border-line bg-surface px-3.5 text-base"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Serving</span>
            <input
              value={serving}
              onChange={(event) => setServing(event.target.value)}
              placeholder="1 roll"
              className="h-12 rounded-2xl border border-line bg-surface px-3.5 text-base"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Carbs in that serving (g)</span>
            <input
              value={carbs}
              onChange={(event) => setCarbs(event.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="35"
              className="h-12 rounded-2xl border border-line bg-surface px-3.5 text-base"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            fullWidth
            onClick={async () => {
              const value = Number(carbs);
              if (!name.trim()) return setError("Give the food a name");
              if (!Number.isFinite(value) || value < 0 || value > 500) {
                return setError("Carbs must be between 0 and 500 g");
              }
              const food = await addCustomFood({
                name,
                carbsPerServing: value,
                servingLabel: serving || "1 serving",
              });
              onSaved(food);
            }}
          >
            Save food
          </Button>
        </div>
      </div>
    </div>
  );
}

