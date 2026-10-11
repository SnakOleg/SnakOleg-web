import { api } from "./api";
import { SECTIONS } from "./schema";

export async function exportAll() {
  const sections: Record<string, unknown> = {};
  for (const s of SECTIONS) {
    const reply = await api<{ value: unknown }>(`/api/admin/content?key=${s.id}`);
    if (reply.value) sections[s.id] = reply.value;
  }
  const blob = new Blob([JSON.stringify({ app: "snak-site", version: 1, sections }, null, 2)], {
    type: "application/json",
  });
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `site-content-${new Date().toISOString().slice(0, 10)}.json`,
  });
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function importAll(file: File) {
  const data = JSON.parse(await file.text());
  if (data?.app !== "snak-site" || typeof data.sections !== "object") {
    throw new Error("Это не файл резервной копии");
  }
  let done = 0;
  for (const [key, value] of Object.entries(data.sections)) {
    if (!SECTIONS.some((s) => s.id === key)) continue;
    const current = await api<{ version: number }>(`/api/admin/content?key=${key}`);
    await api("/api/admin/content", { method: "PUT", body: { key, value, base: current.version } });
    done += 1;
  }
  return done;
}
