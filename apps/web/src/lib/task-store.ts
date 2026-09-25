export type TaskPriority = "Düşük" | "Orta" | "Yüksek";
export type TaskStatus = "Bekliyor" | "Devam Ediyor" | "Tamamlandı";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
};

export type PortalState = {
  tasks: TaskItem[];
  notificationCount: number;
};

const STORAGE_KEY = "task-portal-state";

const defaultTasks: TaskItem[] = [
  {
    id: "task-1",
    title: "Sunum hazırlığı",
    description: "Müşteri sunumu için özet ve görsel akış hazırlanacak.",
    dueDate: "2026-09-16T18:00:00.000Z",
    priority: "Yüksek",
    status: "Devam Ediyor",
    createdAt: "2026-09-14T09:00:00.000Z",
  },
  {
    id: "task-2",
    title: "Açık işlerin kontrolü",
    description: "Güncel görev listesi taranacak ve aksaklıklar netleştirilecek.",
    dueDate: "2026-09-17T12:00:00.000Z",
    priority: "Orta",
    status: "Bekliyor",
    createdAt: "2026-09-15T08:00:00.000Z",
  },
];

export function readPortalState(): PortalState {
  if (typeof window === "undefined") {
    return { tasks: defaultTasks, notificationCount: getDueTaskCount(defaultTasks) };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const nextState = { tasks: defaultTasks, notificationCount: getDueTaskCount(defaultTasks) };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    }

    const parsed = JSON.parse(raw) as Partial<PortalState>;
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : defaultTasks;
    const notificationCount = typeof parsed.notificationCount === "number" ? parsed.notificationCount : getDueTaskCount(tasks);

    return { tasks, notificationCount };
  } catch {
    const fallback = { tasks: defaultTasks, notificationCount: getDueTaskCount(defaultTasks) };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

export function writePortalState(nextState: PortalState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(new Event("task-portal-update"));
}

export function getDueTaskCount(tasks: TaskItem[]): number {
  const now = Date.now();
  return tasks.filter((task) => task.status !== "Tamamlandı" && new Date(task.dueDate).getTime() <= now).length;
}

export function getNotificationTasks(tasks: TaskItem[]): TaskItem[] {
  const now = Date.now();
  return tasks.filter((task) => task.status !== "Tamamlandı" && new Date(task.dueDate).getTime() <= now);
}

export function formatDueDate(date: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
