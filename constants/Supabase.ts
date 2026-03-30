import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

// อันนี้เดี๋ยวเอาไปใส่ใน .env ทีหลังนะฮ้าฟฟฟฟู่
const supabaseUrl = "https://bgxxiyahobezvchurjdg.supabase.co";
const supabaseAnonKey = "sb_publishable_aKaSLlUZhmN0rHINFtNH-g_pro1LGZK";

// ตัวแปรนี้จะช่วยแก้ปัญหา window is not defined บนเว็บ SSR
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === "undefined") return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // เช็คแพลตฟอร์มว่าถ้าเป็นเว็บให้ใช้ customStorage เพื่อไม่ให้บัค SSR
    storage: Platform.OS === "web" ? customStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
