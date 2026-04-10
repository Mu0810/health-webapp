/**
 * SmartMenu — geolocation-aware "Green choice" restaurant menu highlights
 */
"use client";

import { useState, useEffect } from "react";
import styles from "./SmartMenu.module.css";

interface MenuItem {
  id: string;
  restaurant: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  isGreen: boolean;
  distance: string;
  emoji: string;
}

interface Props {
  remainingProtein: number;
  remainingCalories: number;
}

// Static demo restaurant data keyed by area
const RESTAURANT_DATA: MenuItem[] = [
  { id: "1", restaurant: "Green Leaf Kitchen", name: "Grilled Salmon Bowl", calories: 490, protein: 42, carbs: 38, fats: 14, isGreen: true, distance: "0.3 km", emoji: "🐟" },
  { id: "2", restaurant: "Green Leaf Kitchen", name: "Quinoa Power Salad", calories: 380, protein: 18, carbs: 52, fats: 11, isGreen: true, distance: "0.3 km", emoji: "🥗" },
  { id: "3", restaurant: "The Burger Joint", name: "Classic Cheeseburger", calories: 820, protein: 38, carbs: 72, fats: 42, isGreen: false, distance: "0.6 km", emoji: "🍔" },
  { id: "4", restaurant: "Noodle House", name: "Miso Ramen (Light)", calories: 520, protein: 28, carbs: 65, fats: 12, isGreen: true, distance: "0.8 km", emoji: "🍜" },
  { id: "5", restaurant: "Noodle House", name: "Tonkotsu Ramen", calories: 880, protein: 32, carbs: 90, fats: 38, isGreen: false, distance: "0.8 km", emoji: "🍜" },
  { id: "6", restaurant: "Vita Smoothie Bar", name: "Protein Acai Bowl", calories: 310, protein: 22, carbs: 44, fats: 6, isGreen: true, distance: "1.1 km", emoji: "🫐" },
];

export default function SmartMenu({ remainingProtein, remainingCalories }: Props) {
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | "green">("green");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationGranted(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      () => { setLocationGranted(true); setLoading(false); },
      () => { setLocationGranted(false); setLoading(false); }
    );
  }, []);

  const items = RESTAURANT_DATA.filter((item) => {
    if (filter === "green") return item.isGreen;
    return true;
  }).map((item) => ({
    ...item,
    fitsCalories: item.calories <= remainingCalories,
    fitsProtein: item.protein >= remainingProtein * 0.25,
  }));

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>📍</span>
        <div>
          <h3 className={styles.title}>Smart Menu</h3>
          <p className={styles.subtitle}>Nearby options matching your macros</p>
        </div>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${filter === "green" ? styles.active : ""}`}
            onClick={() => setFilter("green")}
            id="smartMenuGreenTab"
          >🟢 Green</button>
          <button
            className={`${styles.tab} ${filter === "all" ? styles.active : ""}`}
            onClick={() => setFilter("all")}
            id="smartMenuAllTab"
          >All</button>
        </div>
      </div>

      {loading && <p className={styles.status}>📡 Getting your location…</p>}
      {locationGranted === false && (
        <p className={styles.status}>📍 Location access denied — showing demo data</p>
      )}

      <div className={styles.list}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`${styles.item} ${item.isGreen ? styles.green : styles.neutral}`}
          >
            <div className={styles.itemLeft}>
              <span className={styles.itemEmoji}>{item.emoji}</span>
              <div>
                <p className={styles.itemName}>{item.name}</p>
                <p className={styles.itemRestaurant}>{item.restaurant} · {item.distance}</p>
              </div>
            </div>
            <div className={styles.itemRight}>
              <span className={styles.itemCal}>{item.calories} kcal</span>
              <span className={styles.itemPro}>{item.protein}g protein</span>
              {item.isGreen && <span className={styles.badge}>✓ Green</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
