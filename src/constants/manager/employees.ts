// src/constants/manager/employees.ts
export type EmployeeTone = "success" | "teal" | "warning" | "danger" | "primary" | "muted";

export type Employee = {
  id: string;
  name: string;
  dept: string;
  role: string;
  branch: string;
  status: string;
  tone: EmployeeTone;
  done: number;
  last: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  score: number;
};

export const EMPLOYEES: Employee[] = [
  {
    id: "1", name: "نورا حسن", dept: "السوشيال ميديا", role: "Social Media Specialist", branch: "القاهرة",
    status: "نشط", tone: "success", done: 92, last: "اليوم 08:35",
    email: "nora@company.com", phone: "010-1234-5678", address: "القاهرة — مدينة نصر", joinDate: "12/03/2023", score: 86,
  },
  {
    id: "2", name: "محمود علي", dept: "الكول سنتر", role: "Call Center Agent", branch: "الإسكندرية",
    status: "نشط", tone: "success", done: 78, last: "اليوم 09:02",
    email: "mahmoud@company.com", phone: "010-2233-4455", address: "الإسكندرية — سموحة", joinDate: "04/06/2022", score: 74,
  },
  {
    id: "3", name: "سارة إبراهيم", dept: "التسويق", role: "Marketing Manager", branch: "القاهرة",
    status: "في إجازة", tone: "teal", done: 65, last: "أمس 09:10",
    email: "sara@company.com", phone: "010-3344-5566", address: "القاهرة — المعادي", joinDate: "20/01/2021", score: 81,
  },
  {
    id: "4", name: "كريم سعيد", dept: "المبيعات", role: "Sales Rep", branch: "الجيزة",
    status: "متأخر", tone: "warning", done: 54, last: "اليوم 10:22",
    email: "kareem@company.com", phone: "010-4455-6677", address: "الجيزة — الدقي", joinDate: "15/09/2023", score: 68,
  },
  {
    id: "5", name: "دينا فتحي", dept: "التصميم", role: "Graphic Designer", branch: "القاهرة",
    status: "نشط", tone: "success", done: 88, last: "اليوم 08:50",
    email: "dina@company.com", phone: "010-5566-7788", address: "القاهرة — مدينة نصر", joinDate: "02/11/2022", score: 88,
  },
  {
    id: "6", name: "خالد يوسف", dept: "المبيعات", role: "Sales Rep", branch: "الإسكندرية",
    status: "غائب", tone: "danger", done: 40, last: "قبل 3 أيام",
    email: "khaled@company.com", phone: "010-6677-8899", address: "الإسكندرية — العجمي", joinDate: "10/02/2024", score: 52,
  },
];

export const DEPARTMENTS = ["السوشيال ميديا", "الكول سنتر", "التسويق", "المبيعات", "التصميم", "الدعم"];
export const BRANCHES = ["القاهرة", "الإسكندرية", "الجيزة"];
export const STATUSES = ["نشط", "في إجازة", "متأخر", "غائب"];