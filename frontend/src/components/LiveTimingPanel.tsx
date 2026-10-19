import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, WifiOff } from "lucide-react";
import type { LiveSnapshot } from "@/data/live-types";

async function fetchLiveSnapshot(): Promise<LiveSnapshot> {
  const response = await fetch("/api/live", { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Live data is unavailable.");
  return body as LiveSnapshot;
}

const formatTime = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" }) : "—";
const formatGap = (value: string | number | null) => value == null ? "—" : typeof value === "number" ? `+${value.toFixed(3)}s` : value;

export function LiveTimingPanel() {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["live-snapshot"], queryFn: fetchLiveSnapshot,
    refetchInterval: 15_000, refetchIntervalInBackground: false,
    refetchOnWindowFocus: true, retry: 1,
  });

  if (isPending) return <div className="rounded-2xl border border-border bg-card p-8 text-muted-foreground" role="status">กำลังโหลดข้อมูลเซสชันล่าสุด…</div>;
  if (!data) return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-8" role="alert">
      <WifiOff className="text-primary" /><h2 className="text-xl font-bold">ยังดูข้อมูลสนามล่าสุดไม่ได้</h2>
      <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง"}</p>
      <p className="text-xs text-muted-foreground">ข้อมูลระหว่างการแข่งขันจาก OpenF1 ต้องใช้บัญชีที่เข้าถึงข้อมูลเรียลไทม์ได้</p>
      <button type="button" onClick={() => void refetch()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">ลองอีกครั้ง</button>
    </div>
  );

  const fresh = !!(data.session.active && data.dataAsOf && Date.now() - Date.parse(data.dataAsOf) < 120_000);
  const status = fresh ? "กำลังอัปเดต" : data.session.active ? "รอข้อมูลล่าสุด" : "เซสชันสิ้นสุดแล้ว";
  return <div className="space-y-6">
    <section className="rounded-2xl border border-border bg-card/90 p-6 shadow-xl shadow-black/10 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><Activity size={16} /> Timing center</div>
          <h2 className="text-2xl font-bold md:text-3xl">{data.session.meeting}</h2>
          <p className="mt-1 text-muted-foreground">{data.session.name}{data.session.location ? ` · ${data.session.location}` : ""}</p></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${fresh ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground"}`}>{status}</span>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-secondary/70 p-4"><p className="text-xs text-muted-foreground">เริ่มเซสชัน</p><p className="mt-2 text-sm font-semibold">{formatTime(data.session.start)}</p></div>
        <div className="rounded-xl bg-secondary/70 p-4"><p className="text-xs text-muted-foreground">ข้อมูลอันดับล่าสุด</p><p className="mt-2 text-sm font-semibold">{formatTime(data.dataAsOf)}</p></div>
        <div className="rounded-xl bg-secondary/70 p-4"><p className="text-xs text-muted-foreground">อากาศ / แทร็ก</p><p className="mt-2 text-sm font-semibold">{data.weather ? `${data.weather.air ?? "—"}°C / ${data.weather.track ?? "—"}°C` : "ไม่มีข้อมูล"}</p></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>ตรวจข้อมูลใหม่ทุก 15 วินาทีเมื่อเปิดหน้านี้ · แหล่งข้อมูล OpenF1</p>
        <button type="button" onClick={() => void refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-foreground hover:bg-secondary disabled:opacity-50"><RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> รีเฟรชตอนนี้</button>
      </div>
      {error && <p className="mt-3 text-xs text-amber-400" role="status">อัปเดตไม่สำเร็จ กำลังแสดงข้อมูลครั้งก่อน: {error.message}</p>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-border bg-card/90">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5"><h3 className="text-lg font-bold">อันดับนักแข่ง</h3><span className="text-xs text-muted-foreground">{data.drivers.length} คัน · {data.session.name === "Race" ? "ช่องว่างระหว่างรถ" : "อันดับเซสชัน"}</span></div>
      {data.drivers.length === 0 ? <p className="p-6 text-sm text-muted-foreground">ยังไม่มีข้อมูลอันดับสำหรับเซสชันนี้</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm">
        <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3">อันดับ</th><th className="px-4 py-3">นักแข่ง</th><th className="px-4 py-3">ทีม</th><th className="px-4 py-3">ห่างผู้นำ</th><th className="px-6 py-3">ห่างคันหน้า</th></tr></thead>
        <tbody>{data.drivers.map((driver) => <tr key={driver.number} className="border-t border-border/70 hover:bg-secondary/30"><td className="px-6 py-3 font-bold tabular-nums">{driver.position ?? "—"}</td><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="h-8 w-1 rounded-full" style={{ backgroundColor: driver.colour }} /><div><p className="font-semibold">{driver.name}</p><p className="text-xs text-muted-foreground">#{driver.number} · {driver.acronym}</p></div></div></td><td className="px-4 py-3 text-muted-foreground">{driver.team}</td><td className="px-4 py-3 tabular-nums">{formatGap(driver.gap)}</td><td className="px-6 py-3 tabular-nums">{formatGap(driver.interval)}</td></tr>)}</tbody>
      </table></div>}
    </section>
    {data.trackStatus && <section className="rounded-2xl border border-border bg-card/90 p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Race control · {formatTime(data.trackStatus.date)}</p><p className="mt-2 font-semibold">{data.trackStatus.flag || "สถานะแทร็ก"} · {data.trackStatus.message}</p></section>}
    <p className="text-xs text-muted-foreground">สถานะสดอ้างอิงเวลาของข้อมูลล่าสุด หากเซสชันจบแล้ว ตารางนี้เป็นข้อมูลเซสชันล่าสุดที่บันทึกไว้ ข้อมูลสดของ OpenF1 ต้องมีสมาชิกที่ได้รับสิทธิ์</p>
  </div>;
}
