import { useEffect, useState } from "react";
import { supabase } from "../constants/Supabase";

export interface BossPattern {
  name: string;
  weight: number;
  hits: number;
  windUp: number;
  dropDist: number;
  heavy: boolean;
  cooldown: number;
  windUpImgs?: string[];
  activeImgs?: string[];
}

export interface EnemyData {
  id: number;
  created_at: string;
  name: string;
  hp?: number;
  damage?: number;
  hit_gap?: number;
  image_url?: string;
  pattern?: BossPattern[];
}

export const useSupabaseData = (tableName: string) => {
  const [data, setData] = useState<EnemyData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ดึงข้อมูลทั้งหมดจากตารางที่ระบุ
      const { data: result, error: fetchError } = await supabase
        .from(tableName)
        .select("*");

      if (fetchError) {
        throw fetchError;
      }

      if (result) {
        setData(result);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching Supabase data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // เรียกใช้ครั้งแรกเมื่อ Hook ถูกเรียกใช้งาน
  useEffect(() => {
    fetchData();
  }, [tableName]);

  // ส่งค่าออกไปให้ Component อื่นใช้งาน (รวมถึงฟังก์ชัน refetch สำหรับกด Refresh)
  return { data, loading, error, refetch: fetchData };
};
