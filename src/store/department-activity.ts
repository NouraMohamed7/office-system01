// src/store/department-activity.ts
import { create } from "zustand";

export type SocialPost = {
  id: string;
  platform: string;
  contentType: string;
  link: string;
  author: string;
  createdAt: number;
};

export type CallLog = {
  id: string;
  name: string;
  phone: string;
  result: string;
  notes: string;
  author: string;
  createdAt: number;
};

export type DriverStatus = "نشط" | "متغيب" | "مخالفة";
export type Driver = {
  id: string;
  name: string;
  status: DriverStatus;
  country: string;
  author: string;
  createdAt: number;
};

// أرقام تاريخية (base) عشان الأرقام متبقاش صفر أول ما التطبيق يفتح
export const BASE_COUNTS = {
  posts: 34,
  reels: 12,
  stories: 58,
  calls: 248,
  leads: 87,
  interested: 34,
  meetings: 9,
};

const initialDrivers: Driver[] = [
  { id: "eg-1", name: "أحمد صلاح", status: "نشط", country: "eg", author: "—", createdAt: Date.now() },
  { id: "eg-2", name: "محمود جابر", status: "نشط", country: "eg", author: "—", createdAt: Date.now() },
  { id: "eg-3", name: "كريم عادل", status: "متغيب", country: "eg", author: "—", createdAt: Date.now() },
  { id: "sa-1", name: "خالد الحربي", status: "نشط", country: "sa", author: "—", createdAt: Date.now() },
  { id: "sa-2", name: "فهد العتيبي", status: "مخالفة", country: "sa", author: "—", createdAt: Date.now() },
  { id: "ae-1", name: "راشد المهيري", status: "نشط", country: "ae", author: "—", createdAt: Date.now() },
];

type DepartmentActivityState = {
  employeeName: string;
  setEmployeeName: (name: string) => void;

  posts: SocialPost[];
  calls: CallLog[];
  drivers: Driver[];

  addPost: (p: Omit<SocialPost, "id" | "createdAt">) => void;
  addCall: (c: Omit<CallLog, "id" | "createdAt">) => void;
  addDriver: (d: Omit<Driver, "id" | "createdAt">) => void;
  updateDriverStatus: (id: string, status: DriverStatus) => void;
};

export const useDepartmentActivity = create<DepartmentActivityState>((set) => ({
  employeeName: "",
  setEmployeeName: (name) => set({ employeeName: name }),

  posts: [],
  calls: [],
  drivers: initialDrivers,

  addPost: (p) =>
    set((state) => ({
      posts: [{ ...p, id: crypto.randomUUID(), createdAt: Date.now() }, ...state.posts],
    })),

  addCall: (c) =>
    set((state) => ({
      calls: [{ ...c, id: crypto.randomUUID(), createdAt: Date.now() }, ...state.calls],
    })),

  addDriver: (d) =>
    set((state) => ({
      drivers: [{ ...d, id: crypto.randomUUID(), createdAt: Date.now() }, ...state.drivers],
    })),

  updateDriverStatus: (id, status) =>
    set((state) => ({
      drivers: state.drivers.map((d) => (d.id === id ? { ...d, status } : d)),
    })),
}));