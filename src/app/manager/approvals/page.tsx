"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { ActionRow, Avatar, Card, PageHeader, Pill, SectionTitle } from "@/components/manager/primitives";
import { Filter, Loader2, Check, X, ChevronDown, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "warning" | "teal" | "success" | "danger";
type RowStatus = "pending" | "approved" | "rejected";
type Priority = "high" | "medium" | "low";
type DateBucket = "today" | "yesterday" | "week";
type TabId = "reports" | "files" | "tasks" | "reps" | "complaints" | "alerts";

interface RowItem {
  id: string;
  name: string;
  ctx: string;
  tone: Tone;
  status: string;
  rowStatus: RowStatus;
  department: string;
  priority: Priority;
  dateBucket: DateBucket;
  editRequests: string[];
  details: {
    done: string;
    problems: string;
    needs: string;
  };
  attachments: string[];
}

const tabMeta: { id: TabId; label: string }[] = [
  { id: "reports", label: "التقارير اليومية" },
  { id: "files", label: "ملفات العمل" },
  { id: "tasks", label: "المهام المكتملة" },
  { id: "reps", label: "طلبات المناديب" },
  { id: "complaints", label: "الشكاوى" },
  { id: "alerts", label: "التنبيهات" },
];

// TODO: هنا هتحطي baseURL بتاع الـ API الحقيقي عندك
// const API_BASE = "/api/approvals";

function row(item: Omit<RowItem, "editRequests" | "rowStatus">): RowItem {
  return { ...item, rowStatus: "pending", editRequests: [] };
}

const initialData: Record<TabId, RowItem[]> = {
  reports: [
    row({
      id: "reports-1",
      name: "نورا حسن",
      ctx: "تقرير يومي · قسم السوشيال ميديا · اليوم",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "السوشيال ميديا",
      priority: "high",
      dateBucket: "today",
      details: {
        done: "نشرت 3 بوستات على إنستجرام وتيك توك، وردّت على تعليقات المتابعين.",
        problems: "تأخر الرد من فريق التصميم على الكفرات الجديدة.",
        needs: "اعتماد خطة المحتوى بتاعة الأسبوع الجاي.",
      },
      attachments: ["content-plan-week32.xlsx"],
    }),
    row({
      id: "reports-2",
      name: "محمود علي",
      ctx: "تقرير يومي كول سنتر · قسم الكول سنتر · قبل ساعة",
      tone: "teal",
      status: "بانتظار",
      department: "الكول سنتر",
      priority: "medium",
      dateBucket: "today",
      details: {
        done: "اتصل بـ 42 عميل محتمل، وحوّل 6 ليدز لقسم المبيعات.",
        problems: "نظام الـ CRM كان بطيء بين 10-11 صباحًا.",
        needs: "عدد إضافي من الأرقام لمنطقة الجيزة.",
      },
      attachments: ["calls-log-today.csv"],
    }),
    row({
      id: "reports-3",
      name: "سارة إبراهيم",
      ctx: "تقرير يومي تصميم · قسم التصميم · قبل 3 س",
      tone: "success",
      status: "مكتملة",
      department: "التصميم",
      priority: "low",
      dateBucket: "today",
      details: {
        done: "خلّصت تصميم الكاروسيل الخاص بحملة العروض.",
        problems: "لا يوجد.",
        needs: "مراجعة نهائية قبل النشر.",
      },
      attachments: ["carousel-final.pdf"],
    }),
    row({
      id: "reports-4",
      name: "كريم سعيد",
      ctx: "تقرير يومي مبيعات · قسم المبيعات · اليوم",
      tone: "teal",
      status: "بانتظار",
      department: "المبيعات",
      priority: "medium",
      dateBucket: "today",
      details: {
        done: "زار 5 عملاء في القاهرة وقفل صفقة واحدة.",
        problems: "عربة التوزيع اتأخرت ساعتين.",
        needs: "اعتماد خصم إضافي لعميل كبير.",
      },
      attachments: ["visit-report.docx"],
    }),
    row({
      id: "reports-5",
      name: "دينا فتحي",
      ctx: "تقرير مبيعات أسبوعي · قسم المبيعات · قبل يوم",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "المبيعات",
      priority: "high",
      dateBucket: "yesterday",
      details: {
        done: "ملخص مبيعات الأسبوع: 120 ألف جنيه.",
        problems: "نقص في مخزون منتج معين.",
        needs: "اعتماد طلب توريد إضافي.",
      },
      attachments: ["weekly-sales.xlsx", "stock-issue.pdf"],
    }),
  ],
  files: [
    row({
      id: "files-1",
      name: "أحمد رضا",
      ctx: "عرض تقديمي للعميل · قسم المبيعات · اليوم",
      tone: "teal",
      status: "بانتظار",
      department: "المبيعات",
      priority: "high",
      dateBucket: "today",
      details: {
        done: "جهّز عرض تقديمي كامل لعميل جديد فيه شركة كبيرة.",
        problems: "لا يوجد.",
        needs: "اعتماد قبل الاجتماع بكرة الصبح.",
      },
      attachments: ["client-proposal.pptx"],
    }),
    row({
      id: "files-2",
      name: "مريم عادل",
      ctx: "شيت تتبع المخزون · قسم المخازن · اليوم",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "المخازن",
      priority: "medium",
      dateBucket: "today",
      details: {
        done: "حدّثت أرقام المخزون بعد الجرد الأسبوعي.",
        problems: "فرق بسيط في عدد صنفين محتاج تأكيد.",
        needs: "مراجعة الفرق قبل اعتماد الشيت.",
      },
      attachments: ["inventory-tracker.xlsx"],
    }),
    row({
      id: "files-3",
      name: "حسام طارق",
      ctx: "تصميم لوجو جديد · قسم التصميم · أمس",
      tone: "teal",
      status: "بانتظار",
      department: "التصميم",
      priority: "low",
      dateBucket: "yesterday",
      details: {
        done: "جهّز 3 اختيارات مختلفة للوجو الجديد.",
        problems: "لا يوجد.",
        needs: "اختيار النسخة المناسبة للنشر.",
      },
      attachments: ["logo-options.zip"],
    }),
    row({
      id: "files-4",
      name: "ياسمين محمد",
      ctx: "عقد مورد جديد · قسم المشتريات · اليوم",
      tone: "danger",
      status: "عاجل",
      department: "المشتريات",
      priority: "high",
      dateBucket: "today",
      details: {
        done: "راجعت شروط العقد مع المورد الجديد.",
        problems: "بند التسليم محتاج تعديل قبل التوقيع.",
        needs: "اعتماد سريع لأن المورد بينتظر رد النهاردة.",
      },
      attachments: ["supplier-contract.pdf"],
    }),
    row({
      id: "files-5",
      name: "عمر خالد",
      ctx: "تقرير مالي شهري · قسم المالية · أمس",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "المالية",
      priority: "high",
      dateBucket: "yesterday",
      details: {
        done: "جهّز التقرير المالي الشهري بالكامل.",
        problems: "زيادة غير متوقعة في مصاريف التشغيل.",
        needs: "مراجعة بند المصاريف قبل الاعتماد.",
      },
      attachments: ["monthly-finance-report.xlsx"],
    }),
    row({
      id: "files-6",
      name: "هبة سمير",
      ctx: "ملف تدريب موظفين جدد · قسم الموارد البشرية · الأسبوع ده",
      tone: "teal",
      status: "بانتظار",
      department: "الموارد البشرية",
      priority: "low",
      dateBucket: "week",
      details: {
        done: "جهّزت خطة تدريب الدفعة الجديدة من الموظفين.",
        problems: "لا يوجد.",
        needs: "اعتماد الخطة قبل بدء التدريب الأسبوع الجاي.",
      },
      attachments: ["onboarding-plan.docx"],
    }),
  ],
  tasks: [
    row({
      id: "tasks-1",
      name: "نادية حسن",
      ctx: "تجهيز بوث المعرض · قسم التسويق · اليوم",
      tone: "success",
      status: "مكتملة",
      department: "التسويق",
      priority: "medium",
      dateBucket: "today",
      details: {
        done: "جهّزت بوث المعرض بالكامل مع الفريق.",
        problems: "لا يوجد.",
        needs: "اعتماد نهائي قبل يوم المعرض.",
      },
      attachments: ["booth-photos.zip"],
    }),
    row({
      id: "tasks-2",
      name: "طارق عبدالله",
      ctx: "صيانة السيرفر · قسم تقنية المعلومات · أمس",
      tone: "success",
      status: "مكتملة",
      department: "تقنية المعلومات",
      priority: "high",
      dateBucket: "yesterday",
      details: {
        done: "عمل صيانة كاملة للسيرفر الرئيسي وحدّث النسخ الاحتياطية.",
        problems: "لا يوجد.",
        needs: "اعتماد إغلاق تذكرة الصيانة.",
      },
      attachments: ["maintenance-log.pdf"],
    }),
    row({
      id: "tasks-3",
      name: "رنا فؤاد",
      ctx: "تحديث موقع الشركة · قسم التسويق · الأسبوع ده",
      tone: "success",
      status: "مكتملة",
      department: "التسويق",
      priority: "low",
      dateBucket: "week",
      details: {
        done: "حدّثت صفحة الخدمات وصفحة تواصل معنا على الموقع.",
        problems: "لا يوجد.",
        needs: "اعتماد النشر على السيرفر الحي.",
      },
      attachments: ["website-changes.pdf"],
    }),
    row({
      id: "tasks-4",
      name: "باسم ماهر",
      ctx: "تدريب فريق المبيعات الجدد · قسم المبيعات · اليوم",
      tone: "success",
      status: "مكتملة",
      department: "المبيعات",
      priority: "medium",
      dateBucket: "today",
      details: {
        done: "خلّص تدريب 5 موظفين جدد على نظام الـ CRM.",
        problems: "لا يوجد.",
        needs: "اعتماد اعتبارهم جاهزين للعمل الفعلي.",
      },
      attachments: ["training-attendance.xlsx"],
    }),
  ],
  reps: [
    row({
      id: "reps-1",
      name: "كريم سعيد",
      ctx: "مندوب جديد · القاهرة · اليوم",
      tone: "teal",
      status: "بانتظار",
      department: "المناديب",
      priority: "medium",
      dateBucket: "today",
      details: { done: "استلم أوراقه واجتاز المقابلة.", problems: "لا يوجد.", needs: "اعتماد التعيين رسميًا." },
      attachments: ["rep-application.pdf"],
    }),
    row({
      id: "reps-2",
      name: "أحمد جمال",
      ctx: "مندوب جديد · الإسكندرية · اليوم",
      tone: "teal",
      status: "بانتظار",
      department: "المناديب",
      priority: "medium",
      dateBucket: "today",
      details: { done: "اجتاز فترة التجربة بنجاح.", problems: "لا يوجد.", needs: "اعتماد التثبيت." },
      attachments: ["trial-report.pdf"],
    }),
    row({
      id: "reps-3",
      name: "سلمى وجدي",
      ctx: "طلب نقل منطقة · الجيزة · أمس",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "المناديب",
      priority: "low",
      dateBucket: "yesterday",
      details: { done: "قدّمت طلب نقل من القاهرة للجيزة.", problems: "محتاجة سبب واضح للنقل.", needs: "مراجعة السبب قبل الاعتماد." },
      attachments: ["transfer-request.pdf"],
    }),
    row({
      id: "reps-4",
      name: "محمد لطفي",
      ctx: "طلب إجازة مندوب · المنصورة · اليوم",
      tone: "teal",
      status: "بانتظار",
      department: "المناديب",
      priority: "low",
      dateBucket: "today",
      details: { done: "قدّم طلب إجازة أسبوع.", problems: "لا يوجد.", needs: "اعتماد الإجازة." },
      attachments: [],
    }),
    row({
      id: "reps-5",
      name: "إيمان صبري",
      ctx: "مندوب جديد · طنطا · الأسبوع ده",
      tone: "teal",
      status: "بانتظار",
      department: "المناديب",
      priority: "medium",
      dateBucket: "week",
      details: { done: "استلمت المنطقة وبدأت الزيارات.", problems: "لا يوجد.", needs: "اعتماد التعيين." },
      attachments: ["rep-application.pdf"],
    }),
    row({
      id: "reps-6",
      name: "يوسف عماد",
      ctx: "طلب سلفة · القاهرة · اليوم",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "المناديب",
      priority: "high",
      dateBucket: "today",
      details: { done: "قدّم طلب سلفة لظروف طارئة.", problems: "محتاج توضيح سبب الطلب.", needs: "اعتماد أو رفض السلفة." },
      attachments: ["advance-request.pdf"],
    }),
    row({
      id: "reps-7",
      name: "دعاء رفعت",
      ctx: "طلب تغيير مسار · أسيوط · أمس",
      tone: "teal",
      status: "بانتظار",
      department: "المناديب",
      priority: "low",
      dateBucket: "yesterday",
      details: { done: "اقترحت مسار زيارات جديد أوفر في الوقت.", problems: "لا يوجد.", needs: "اعتماد المسار الجديد." },
      attachments: ["route-plan.pdf"],
    }),
    row({
      id: "reps-8",
      name: "شريف نبيل",
      ctx: "مندوب جديد · الزقازيق · اليوم",
      tone: "teal",
      status: "بانتظار",
      department: "المناديب",
      priority: "medium",
      dateBucket: "today",
      details: { done: "استلم أوراقه واجتاز المقابلة.", problems: "لا يوجد.", needs: "اعتماد التعيين رسميًا." },
      attachments: ["rep-application.pdf"],
    }),
    row({
      id: "reps-9",
      name: "علياء حمدي",
      ctx: "طلب عمولة إضافية · القاهرة · الأسبوع ده",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "المناديب",
      priority: "high",
      dateBucket: "week",
      details: { done: "حققت مبيعات فوق المستهدف بـ 30%.", problems: "لا يوجد.", needs: "اعتماد صرف عمولة إضافية." },
      attachments: ["sales-numbers.xlsx"],
    }),
  ],
  complaints: [
    row({
      id: "complaints-1",
      name: "محمد سيد",
      ctx: "شكوى تأخير توصيل · قسم اللوجستيات · اليوم",
      tone: "danger",
      status: "عاجل",
      department: "اللوجستيات",
      priority: "high",
      dateBucket: "today",
      details: {
        done: "تم التواصل مع العميل وتقديم اعتذار مبدئي.",
        problems: "الطلب اتأخر 3 أيام عن الميعاد.",
        needs: "اعتماد تعويض أو توصيل مجاني للعميل.",
      },
      attachments: ["complaint-details.pdf"],
    }),
    row({
      id: "complaints-2",
      name: "نور الهدى",
      ctx: "شكوى جودة منتج · قسم الجودة · أمس",
      tone: "danger",
      status: "عاجل",
      department: "الجودة",
      priority: "high",
      dateBucket: "yesterday",
      details: {
        done: "تم فحص العينة المرتجعة من العميلة.",
        problems: "عيب تصنيع واضح في المنتج.",
        needs: "اعتماد استبدال المنتج ومراجعة الدفعة كلها.",
      },
      attachments: ["quality-report.pdf"],
    }),
    row({
      id: "complaints-3",
      name: "كريم فتحي",
      ctx: "شكوى خدمة عملاء · قسم الكول سنتر · الأسبوع ده",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "الكول سنتر",
      priority: "medium",
      dateBucket: "week",
      details: {
        done: "تم الاستماع لتسجيل المكالمة مع العميل.",
        problems: "أسلوب الموظف كان غير مناسب.",
        needs: "اعتماد إجراء تدريبي مع الموظف.",
      },
      attachments: ["call-recording-note.pdf"],
    }),
  ],
  alerts: [
    row({
      id: "alerts-1",
      name: "تنبيه تجاوز الميزانية",
      ctx: "قسم التسويق · اليوم",
      tone: "danger",
      status: "عاجل",
      department: "التسويق",
      priority: "high",
      dateBucket: "today",
      details: {
        done: "تم رصد تجاوز في ميزانية الإعلانات الممولة.",
        problems: "الصرف زاد 15% عن المخطط له.",
        needs: "اعتماد إيقاف مؤقت أو زيادة الميزانية.",
      },
      attachments: ["budget-alert.xlsx"],
    }),
    row({
      id: "alerts-2",
      name: "تنبيه نفاد مخزون",
      ctx: "قسم المخازن · اليوم",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "المخازن",
      priority: "high",
      dateBucket: "today",
      details: {
        done: "النظام رصد نفاد صنف رئيسي من المخزون.",
        problems: "لا يوجد بديل متاح حاليًا.",
        needs: "اعتماد طلب توريد عاجل.",
      },
      attachments: ["stock-alert.pdf"],
    }),
    row({
      id: "alerts-3",
      name: "تنبيه محاولة دخول غريبة",
      ctx: "قسم تقنية المعلومات · اليوم",
      tone: "danger",
      status: "عاجل",
      department: "تقنية المعلومات",
      priority: "high",
      dateBucket: "today",
      details: {
        done: "تم رصد محاولة دخول من IP غير معروف.",
        problems: "المحاولة تكررت 3 مرات خلال ساعة.",
        needs: "اعتماد قفل الحساب مؤقتًا وتغيير كلمة المرور.",
      },
      attachments: ["security-log.pdf"],
    }),
    row({
      id: "alerts-4",
      name: "تنبيه تأخر دفع مورد",
      ctx: "قسم المالية · أمس",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "المالية",
      priority: "medium",
      dateBucket: "yesterday",
      details: {
        done: "تم رصد فاتورة مورد متأخرة عن ميعاد السداد.",
        problems: "المورد بعت تنبيه رسمي بالتأخير.",
        needs: "اعتماد صرف الدفعة المستحقة.",
      },
      attachments: ["invoice-overdue.pdf"],
    }),
    row({
      id: "alerts-5",
      name: "تنبيه انتهاء صلاحية عقد",
      ctx: "قسم المشتريات · الأسبوع ده",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "المشتريات",
      priority: "medium",
      dateBucket: "week",
      details: {
        done: "عقد أحد الموردين هينتهي خلال أسبوعين.",
        problems: "لسه معندناش قرار تجديد أو تغيير مورد.",
        needs: "اعتماد قرار التجديد أو البحث عن بديل.",
      },
      attachments: ["contract-expiry.pdf"],
    }),
    row({
      id: "alerts-6",
      name: "تنبيه عطل نظام الكول سنتر",
      ctx: "قسم الكول سنتر · اليوم",
      tone: "danger",
      status: "عاجل",
      department: "الكول سنتر",
      priority: "high",
      dateBucket: "today",
      details: {
        done: "فريق الدعم الفني بدأ يشتغل على المشكلة.",
        problems: "النظام واقع من ساعة تقريبًا.",
        needs: "اعتماد التواصل مع الشركة المصنّعة للنظام.",
      },
      attachments: ["system-down-report.pdf"],
    }),
    row({
      id: "alerts-7",
      name: "تنبيه تقييم سلبي متكرر",
      ctx: "قسم الجودة · أمس",
      tone: "warning",
      status: "تحتاج مراجعة",
      department: "الجودة",
      priority: "medium",
      dateBucket: "yesterday",
      details: {
        done: "رُصد 4 تقييمات سلبية متتالية لنفس الفرع.",
        problems: "التقييمات كلها بتتكلم عن سرعة الخدمة.",
        needs: "اعتماد زيارة تفتيشية للفرع.",
      },
      attachments: ["reviews-summary.pdf"],
    }),
  ],
};

async function callApprovalApi(id: string, action: "approve" | "reject") {
  // TODO: فكي الكومنت واستخدمي الفetch الحقيقي لما الباك اند يبقى جاهز
  // const res = await fetch(`${API_BASE}/${id}/${action}`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  // });
  // if (!res.ok) throw new Error("فشل الطلب");
  // return res.json();

  // simulation مؤقتة لحد ما تربطي الـ API
  await new Promise((resolve) => setTimeout(resolve, 700));
  return { ok: true, id, action };
}

async function callEditRequestApi(id: string, message: string) {
  // TODO: fetch(`${API_BASE}/${id}/edit-request`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ message }),
  // })
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { ok: true, id, message };
}

const dateBucketLabels: Record<DateBucket, string> = {
  today: "اليوم",
  yesterday: "أمس",
  week: "الأسبوع ده",
};

const priorityLabels: Record<Priority, string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

interface FilterState {
  employee: string | null;
  department: string | null;
  date: DateBucket | null;
  priority: Priority | null;
}

const emptyFilters: FilterState = { employee: null, department: null, date: null, priority: null };

type FilterKey = keyof FilterState;

function FilterDropdown({
  label,
  activeLabel,
  options,
  isOpen,
  onToggle,
  onSelect,
  onClear,
}: {
  label: string;
  activeLabel: string | null;
  options: { value: string; label: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors",
          activeLabel
            ? "border-primary/40 bg-primary/10 text-primary font-semibold"
            : "border-border bg-background text-muted-foreground hover:bg-accent",
        )}
      >
        {activeLabel ?? label}
        <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1.5 min-w-40 overflow-hidden rounded-lg border border-border bg-card shadow-warm-lg">
          {activeLabel && (
            <button
              onClick={() => {
                onClear();
                onToggle();
              }}
              className="block w-full border-b border-border px-3 py-2 text-right text-xs text-muted-foreground hover:bg-accent"
            >
              مسح الفلتر
            </button>
          )}
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">مفيش خيارات</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSelect(opt.value);
                  onToggle();
                }}
                className="block w-full px-3 py-2 text-right text-xs hover:bg-accent"
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const [tab, setTab] = useState<TabId>("reports");
  const [rowsByTab, setRowsByTab] = useState<Record<TabId, RowItem[]>>(initialData);
  const [open, setOpen] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  // فورم التعديل: بدل ما نعدل النص جوه، بيفتح فورم يكتب فيه المستخدم طلبه بالظبط
  const [editModalId, setEditModalId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // الفلاتر
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

  const rows = rowsByTab[tab];

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 2200);
  };

  const switchTab = (nextTab: TabId) => {
    setTab(nextTab);
    setFilters(emptyFilters);
    setOpenFilter(null);
  };

  const finalizeRow = (id: string, newStatus: RowStatus) => {
    setRowsByTab((prev) => ({
      ...prev,
      [tab]: prev[tab].map((r) => (r.id === id ? { ...r, rowStatus: newStatus } : r)),
    }));
    setExitingIds((prev) => new Set(prev).add(id));

    // بعد الانيميشن نشيل الصف فعليًا من الليستة
    setTimeout(() => {
      setRowsByTab((prev) => ({
        ...prev,
        [tab]: prev[tab].filter((r) => r.id !== id),
      }));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 320);
  };

  const handleApprove = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await callApprovalApi(id, "approve");
      finalizeRow(id, "approved");
      showToast("تم الاعتماد بنجاح", "success");
    } catch {
      showToast("حصل خطأ، حاولي تاني", "danger");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (open === id) setOpen(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await callApprovalApi(id, "reject");
      finalizeRow(id, "rejected");
      showToast("تم الرفض", "danger");
    } catch {
      showToast("حصل خطأ، حاولي تاني", "danger");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (open === id) setOpen(null);
    }
  };

  // فتح فورم التعديل
  const handleEditStart = (id: string) => {
    setEditModalId(id);
    setEditMessage("");
  };

  const closeEditModal = () => {
    setEditModalId(null);
    setEditMessage("");
  };

  const handleEditSubmit = async () => {
    if (!editModalId || !editMessage.trim()) return;
    setEditSubmitting(true);
    try {
      await callEditRequestApi(editModalId, editMessage.trim());
      setRowsByTab((prev) => ({
        ...prev,
        [tab]: prev[tab].map((r) =>
          r.id === editModalId ? { ...r, editRequests: [...r.editRequests, editMessage.trim()] } : r,
        ),
      }));
      showToast("اتبعت طلب التعديل", "success");
      closeEditModal();
    } catch {
      showToast("حصل خطأ في إرسال الطلب، حاولي تاني", "danger");
    } finally {
      setEditSubmitting(false);
    }
  };

  const closeDrawer = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(null);
      setClosing(false);
    }, 200);
  };

  // خيارات الفلاتر مبنية من بيانات التاب الحالي فقط
  const employeeOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.name))).map((name) => ({ value: name, label: name })),
    [rows],
  );
  const departmentOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department))).map((d) => ({ value: d, label: d })),
    [rows],
  );
  const dateOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.dateBucket))).map((d) => ({
        value: d,
        label: dateBucketLabels[d],
      })),
    [rows],
  );
  const priorityOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.priority))).map((p) => ({
        value: p,
        label: priorityLabels[p],
      })),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filters.employee && r.name !== filters.employee) return false;
      if (filters.department && r.department !== filters.department) return false;
      if (filters.date && r.dateBucket !== filters.date) return false;
      if (filters.priority && r.priority !== filters.priority) return false;
      return true;
    });
  }, [rows, filters]);

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const clearAllFilters = () => setFilters(emptyFilters);

  const toggleFilter = (key: FilterKey) => setOpenFilter((prev) => (prev === key ? null : key));

  const openRow = rows.find((r) => r.id === open);
  const editModalRow = rows.find((r) => r.id === editModalId);

  return (
    <div className="space-y-6">
      <PageHeader title="الاعتمادات" subtitle="مركز واحد لكل القرارات التي تحتاج مراجعتك." />

      <div className="card-warm p-2">
        <div className="flex flex-wrap gap-1">
          {tabMeta.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold tabular transition-colors",
                  tab === t.id ? "bg-white/25 text-white" : "bg-primary/15 text-primary",
                )}
              >
                {rowsByTab[t.id].length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card-warm flex flex-wrap items-center gap-3 p-3">
        <Filter className="size-4 text-muted-foreground" />

        <FilterDropdown
          label="حسب الموظف"
          activeLabel={filters.employee}
          options={employeeOptions}
          isOpen={openFilter === "employee"}
          onToggle={() => toggleFilter("employee")}
          onSelect={(v) => setFilters((prev) => ({ ...prev, employee: v }))}
          onClear={() => setFilters((prev) => ({ ...prev, employee: null }))}
        />

        <FilterDropdown
          label="القسم"
          activeLabel={filters.department}
          options={departmentOptions}
          isOpen={openFilter === "department"}
          onToggle={() => toggleFilter("department")}
          onSelect={(v) => setFilters((prev) => ({ ...prev, department: v }))}
          onClear={() => setFilters((prev) => ({ ...prev, department: null }))}
        />

        <FilterDropdown
          label="التاريخ"
          activeLabel={filters.date ? dateBucketLabels[filters.date] : null}
          options={dateOptions}
          isOpen={openFilter === "date"}
          onToggle={() => toggleFilter("date")}
          onSelect={(v) => setFilters((prev) => ({ ...prev, date: v as DateBucket }))}
          onClear={() => setFilters((prev) => ({ ...prev, date: null }))}
        />

        <FilterDropdown
          label="الأولوية"
          activeLabel={filters.priority ? priorityLabels[filters.priority] : null}
          options={priorityOptions}
          isOpen={openFilter === "priority"}
          onToggle={() => toggleFilter("priority")}
          onSelect={(v) => setFilters((prev) => ({ ...prev, priority: v as Priority }))}
          onClear={() => setFilters((prev) => ({ ...prev, priority: null }))}
        />

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="mr-auto flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="size-3.5" /> مسح كل الفلاتر
          </button>
        )}
      </div>

      <Card className="p-0! overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {hasActiveFilters ? "مفيش نتائج مطابقة للفلاتر دي" : "مفيش حاجة محتاجة اعتماد دلوقتي 🎉"}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredRows.map((r) => {
              const isProcessing = processingIds.has(r.id);
              const isExiting = exitingIds.has(r.id);

              return (
                <li
                  key={r.id}
                  className={cn(
                    "relative overflow-hidden transition-all duration-300 ease-out",
                    isExiting ? "max-h-0 opacity-0 scale-[0.98] -translate-y-1" : "max-h-150 opacity-100 scale-100",
                  )}
                >
                  <div
                    className={cn(
                      "row-hover flex flex-wrap items-center gap-4 p-4 hover:row-hover-active cursor-pointer transition-colors",
                      isProcessing && "opacity-60 pointer-events-none",
                    )}
                    onClick={() => setOpen(r.id)}
                  >
                    <Avatar name={r.name} size={40} />
                    <div className="min-w-45 flex-1">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.ctx}</div>
                      {r.editRequests.length > 0 && (
                        <div className="mt-1 text-[11px] text-primary">
                          {r.editRequests.length} طلب تعديل مُرسَل
                        </div>
                      )}
                    </div>

                    <Pill tone={r.tone}>{r.status}</Pill>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionRow
                        onApprove={() => handleApprove(r.id)}
                        onReject={() => handleReject(r.id)}
                        onRequestEdit={() => handleEditStart(r.id)}
                      />
                    </div>

                    {isProcessing && (
                      <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-[1px]">
                        <Loader2 className="size-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Drawer التفاصيل */}
      {open !== null && openRow && (
        <div className="fixed inset-0 z-50 flex" onClick={closeDrawer}>
          <div className={cn("flex-1 bg-black/30 transition-opacity duration-200", closing ? "opacity-0" : "opacity-100")} />
          <div
            className={cn(
              "h-full w-full max-w-lg overflow-y-auto border-l border-border bg-card p-6 shadow-warm-lg transition-transform duration-200 ease-out",
              closing ? "translate-x-full" : "translate-x-0",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{openRow.name}</h3>
              <button className="text-sm text-muted-foreground transition-colors hover:text-foreground" onClick={closeDrawer}>
                إغلاق ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{openRow.ctx}</p>

            <SectionTitle sub="Details">التفاصيل</SectionTitle>
            <div className="space-y-3 text-sm leading-7">
              <p>
                <strong>القسم:</strong> {openRow.department}
              </p>
              <p>
                <strong>الأولوية:</strong> {priorityLabels[openRow.priority]}
              </p>
              <p>
                <strong>التاريخ:</strong> {dateBucketLabels[openRow.dateBucket]}
              </p>
              <p>
                <strong>ماذا أنجز:</strong> {openRow.details.done}
              </p>
              <p>
                <strong>المشاكل:</strong> {openRow.details.problems}
              </p>
              <p>
                <strong>الاحتياجات:</strong> {openRow.details.needs}
              </p>
            </div>

            {openRow.attachments.length > 0 && (
              <>
                <SectionTitle sub="Attachments">المرفقات</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {openRow.attachments.map((file) => (
                    <span
                      key={file}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-accent/40 px-3 py-1.5 text-xs"
                    >
                      <Paperclip className="size-3.5" />
                      {file}
                    </span>
                  ))}
                </div>
              </>
            )}

            {openRow.editRequests.length > 0 && (
              <>
                <SectionTitle sub="Edit requests">طلبات التعديل</SectionTitle>
                <div className="space-y-2">
                  {openRow.editRequests.map((req, i) => (
                    <div key={i} className="rounded-lg border border-border bg-accent/20 px-3 py-2 text-xs leading-6">
                      {req}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="sticky bottom-0 -mx-6 mt-8 border-t border-border bg-card p-4">
              <ActionRow
                onApprove={() => handleApprove(openRow.id)}
                onReject={() => handleReject(openRow.id)}
                onRequestEdit={() => {
                  closeDrawer();
                  handleEditStart(openRow.id);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal فورم طلب التعديل */}
      {editModalId !== null && editModalRow && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4" onClick={closeEditModal}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-warm-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">طلب تعديل — {editModalRow.name}</h3>
              <button className="text-sm text-muted-foreground hover:text-foreground" onClick={closeEditModal}>
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{editModalRow.ctx}</p>

            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
              اكتبي بالظبط عاوزة الموظف يعمل التعديل إيه
            </label>
            <textarea
              autoFocus
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              placeholder="مثال: من فضلك ضيفي أرقام الجيزة الجديدة على الشيت وابعتيه تاني قبل الساعة 5"
              rows={5}
              className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeEditModal}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-transform active:scale-95"
              >
                إلغاء
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={!editMessage.trim() || editSubmitting}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
              >
                {editSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                إرسال الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        className={cn(
          "fixed bottom-6 left-1/2 z-60 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-warm-lg transition-all duration-300",
          toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
          toast?.tone === "danger" ? "bg-red-500 text-white" : "bg-emerald-500 text-white",
        )}
      >
        {toast?.text}
      </div>
    </div>
  );
}