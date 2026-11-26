// import { useEffect, useMemo, useRef, useState } from "react";
// import axios from "axios";

// /* ============================================================
//    API CONFIG
//    ============================================================ */
// const API_URL: string =
//   import.meta.env.VITE_API_URL ?? "https://bgmicampusmvp.com/api/admin/getSubmissionDetails";

// /* ============================================================
//    TYPES
//    ============================================================ */
// type SeasonValue = 1 | 2 | 3;

// interface Option<T extends string | number> {
//   label: string;
//   value: T;
// }

// // ---- API response shapes ----
// interface Ambassador {
//   _id: string;
//   IGN: string;
//   UID: string | number;
//   collegeName: string;
// }

// interface ApiSubmission {
//   _id: string;
//   ambassadorId: string | { _id: string }; // handles both plain id and populated doc
//   proofUrls: string[];
//   createdAt: string; // e.g. "Sat Oct 24 2026 18:14:23 GMT+0000 (Coordinated Universal Time)"
// }

// interface SubmissionDetailsResponse {
//   success: boolean;
//   message: string;
//   ambassadors: Ambassador[];
//   submissions: ApiSubmission[];
// }

// // ---- UI shapes ----
// type LinkKind = "instagram" | "youtube" | "drive" | "linkedin" | "form" | "other";

// interface SubmissionLink {
//   kind: LinkKind;
//   url: string;
// }

// interface Row {
//   id: string;
//   date: Date | null;
//   rawDate: string;
//   ign: string;
//   uid: string;
//   collegeName: string;
//   links: SubmissionLink[];
// }

// interface FetchResult {
//   key: string;
//   rows: Row[];
//   error: string | null;
// }

// /* ============================================================
//    DROPDOWN CONFIG
//    ============================================================ */
// const SEASONS: Option<SeasonValue>[] = [
//   { label: "Season 1", value: 1 },
//   { label: "Season 2", value: 2 },
//   { label: "Season 3", value: 3 },
// ];

// // const TASKS_BY_SEASON: Record<SeasonValue, Option<string>[]> = {
// //   1: [
// //     { label: "CAPTURE THE CLUTCH - Season 1", value: "s1-capture-the-clutch" },
// //     { label: "LIVIK LOCKDOWN - Week 1 & Week 2(Combined) - Season 1", value: "s1-livik-lockdown-w1-w2" },
// //     { label: "RECRUIT THE SQUAD - Season 1", value: "s1-recruit-the-squad" },
// //     { label: "LIVIK LOCKDOWN - Week 3 - Season 1", value: "s1-livik-lockdown-w3" },
// //     { label: "LIVIK LOCKDOWN - Week 4 - Season 1", value: "s1-livik-lockdown-w4" },
// //     { label: "BOOSTER TASK: COHORT CONNECT - Season 1", value: "s1-booster-cohort-connect" },
// //   ],
// //   2: [
// //     { label: "TDM / WOW BATTLEGROUND (WEEK 1 & 2) - Season 2", value: "s2-tdm-wow-w1-w2" },
// //     { label: "TDM / WOW BATTLEGROUND (WEEK 3 & 4) - Season 2", value: "s2-tdm-wow-w3-w4" },
// //     { label: "CAPTURE THE CLUTCH - Season 2", value: "s2-capture-the-clutch" },
// //     { label: "OFFLINE ACTIVATION - Season 2", value: "s2-offline-activation" },
// //     { label: "BOOSTER — SQUAD SIGNUPS - Season 2", value: "s2-booster-squad-signups" },
// //     { label: "BOOSTER — FLEX - Season 2", value: "s2-booster-flex" },
// //     { label: "Booster Task - Welcome Kit Unboxing Reel - Season 2", value: "s2-booster-unboxing-reel" },
// //     { label: "WOW CHALLENGE - Season 2", value: "s2-wow-challenge" },
// //     { label: "CLUTCH DIARIES - Season 2", value: "s2-clutch-diaries" },
// //   ],
// //   3: [
// //     { label: "Recruit the Squad - Season 3", value: "s3-recruit-the-squad" },
// //     { label: "Custom Classic Matches (Week 1 & 2) - Season 3", value: "s3-custom-classic-w1-w2" },
// //     { label: "Custom Classic Matches (Week 3 & 4) - Season 3", value: "s3-custom-classic-w3-w4" },
// //     { label: "Capture the Clutch - Season 3", value: "s3-capture-the-clutch" },
// //     { label: "BGMI Campus MVP LinkedIn Post - Season 3", value: "s3-linkedin-post" },
// //     { label: "My BGMI MVP Journey (Reel) - Season 3", value: "s3-mvp-journey-reel" },
// //     { label: "Booster: KIARAA SHOWDOWN - Season 3", value: "s3-booster-kiaraa-showdown" },
// //   ],
// // };

// const TASKS_BY_SEASON: Record<SeasonValue, Option<string>[]> = {
//   1: [
//     { label: "CAPTURE THE CLUTCH - Season 1", value: "6a58c356457bea701ebd218c" },
//     { label: "LIVIK LOCKDOWN - Week 1 & Week 2(Combined) - Season 1", value: "6a58c5dbeedf4fd8e801cef5" },
//     { label: "RECRUIT THE SQUAD - Season 1", value: "6a58c6633e78410396961622" },
//     { label: "LIVIK LOCKDOWN - Week 3 - Season 1", value: "6a7470738fce8ec8fd2e040c" },
//     { label: "LIVIK LOCKDOWN - Week 4 - Season 1", value: "6a7471e839d1c73094a1aa24" },
//     { label: "BOOSTER TASK: COHORT CONNECT - Season 1", value: "6a8d54c2db70a0a21fac09a0" },
//   ],
//   2: [
//     { label: "TDM / WOW BATTLEGROUND (WEEK 1 & 2) - Season 2", value: "6a9ae1999dc6f5901f1c5960" },
//     { label: "TDM / WOW BATTLEGROUND (WEEK 3 & 4) - Season 2", value: "6a9ae3229dc6f5901f1c5961" },
//     { label: "CAPTURE THE CLUTCH - Season 2", value: "6a9c16f3093c4e366e2e623f" },
//     { label: "OFFLINE ACTIVATION - Season 2", value: "6a9c17bcf4853e9901eeee21" },
//     { label: "BOOSTER — SQUAD SIGNUPS - Season 2", value: "6a9e7644647eb524f1eb84d0" },
//     { label: "BOOSTER — FLEX - Season 2", value: "6aa9274c1b12d592eaa9a62b" },
//     { label: "Booster Task - Welcome Kit Unboxing Reel - Season 2", value: "6ab6969da4803c3c7b1b087c" },
//     { label: "WOW CHALLENGE - Season 2", value: "6ac0d3becfe49cb80aa65d83" },
//     { label: "CLUTCH DIARIES - Season 2", value: "6ac0d9bfc6e5c085e2ee3e9f" },
//   ],
//   3: [
//     { label: "Recruit the Squad - Season 3", value: "6ada5d61889b4b59d6e69bde" },
//     { label: "Custom Classic Matches (Week 1 & 2) - Season 3", value: "6ada5dd23bd322bdfd1b2104" },
//     { label: "Custom Classic Matches (Week 3 & 4) - Season 3", value: "6ada5e2ca4d7536c8254a700" },
//     { label: "Capture the Clutch - Season 3", value: "6ada5e962da30de8da222e18" },
//     { label: "BGMI Campus MVP LinkedIn Post - Season 3", value: "6ada5eeb889b4b59d6e69bdf" },
//     { label: "My BGMI MVP Journey (Reel) - Season 3", value: "6ada5f603bd322bdfd1b2105" },
//     { label: "Booster: KIARAA SHOWDOWN - Season 3", value: "6ae83bbef4a0bf8c4c95e8ec" },
//   ],
// };

// const DEFAULT_SEASON: SeasonValue = 3;

// /* ============================================================
//    HELPERS
//    ============================================================ */
// // "Sat Oct 24 2026 18:14:23 GMT+0000 (Coordinated Universal Time)" → Date
// function parseCreatedAt(value: string): Date | null {
//   if (!value) return null;
//   const cleaned = String(value).replace(/\s*\([^)]*\)\s*$/, ""); // drop "(Coordinated Universal Time)"
//   const d = new Date(cleaned);
//   return Number.isNaN(d.getTime()) ? null : d;
// }

// function formatDate(d: Date): string {
//   return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// }

// function formatTime(d: Date): string {
//   return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
// }

// // Make sure links without a protocol still open as external URLs
// function normalizeUrl(url: string): string {
//   const trimmed = url.trim();
//   return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
// }

// function detectLinkKind(url: string): LinkKind {
//   let host: string;
//   try {
//     host = new URL(url).hostname.toLowerCase();
//   } catch {
//     return "other";
//   }
//   if (host.includes("instagram")) return "instagram";
//   if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
//   if (host.includes("drive.google") || host.includes("docs.google")) return "drive";
//   if (host.includes("linkedin")) return "linkedin";
//   if (host.includes("forms.gle") || host.includes("forms.")) return "form";
//   return "other";
// }

// function getAmbassadorId(ref: ApiSubmission["ambassadorId"]): string {
//   return typeof ref === "string" ? ref : ref?._id ?? "";
// }

// // Join submissions → ambassadors via submissions[].ambassadorId === ambassadors[]._id
// function buildRows(ambassadors: Ambassador[], submissions: ApiSubmission[]): Row[] {
//   const byId = new Map(ambassadors.map((a) => [String(a._id), a]));

//   return submissions
//     .map((s, i) => {
//       const amb = byId.get(String(getAmbassadorId(s.ambassadorId)));
//       const links = (s.proofUrls ?? [])
//         .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
//         .map((u) => {
//           const url = normalizeUrl(u);
//           return { url, kind: detectLinkKind(url) };
//         });

//       return {
//         id: s._id ?? `row-${i}`,
//         date: parseCreatedAt(s.createdAt),
//         rawDate: s.createdAt ?? "",
//         ign: amb?.IGN ?? "Unknown",
//         uid: amb?.UID != null ? String(amb.UID) : "N/A",
//         collegeName: amb?.collegeName ?? "N/A",
//         links,
//       };
//     })
//     .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)); // newest first
// }

// function getErrorMessage(err: unknown): string {
//   if (axios.isAxiosError(err)) {
//     const apiMessage = (err.response?.data as { message?: string } | undefined)?.message;
//     if (apiMessage) return apiMessage;
//     if (!err.response) return "Can't reach the server. Check that the backend is running and allows CORS.";
//     return `${err.response.status}: ${err.message}`;
//   }
//   return "Something went wrong while loading submissions.";
// }

// /* ============================================================
//    SMALL UI PIECES
//    ============================================================ */
// const LINK_STYLE: Record<LinkKind, { label: string; cls: string }> = {
//   instagram: { label: "INSTAGRAM", cls: "border-pink-500/60 text-pink-300 hover:bg-pink-500/20" },
//   youtube: { label: "YOUTUBE", cls: "border-red-500/60 text-red-300 hover:bg-red-500/20" },
//   drive: { label: "DRIVE", cls: "border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/20" },
//   linkedin: { label: "LINKEDIN", cls: "border-sky-500/60 text-sky-300 hover:bg-sky-500/20" },
//   form: { label: "FORM", cls: "border-violet-500/60 text-violet-300 hover:bg-violet-500/20" },
//   other: { label: "LINK", cls: "border-amber-500/60 text-amber-300 hover:bg-amber-500/20" },
// };

// const CUT_CORNERS =
//   "[clip-path:polygon(0_0,calc(100%-14px)_0,100%_14px,100%_100%,14px_100%,0_calc(100%-14px))]";

// interface HudSelectProps<T extends string | number> {
//   label: string;
//   tag: string;
//   options: Option<T>[];
//   value: T;
//   onChange: (value: T) => void;
// }

// function HudSelect<T extends string | number>({ label, tag, options, value, onChange }: HudSelectProps<T>) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef<HTMLDivElement>(null);
//   const selected = options.find((o) => o.value === value);

//   useEffect(() => {
//     const onDown = (e: MouseEvent) => {
//       if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
//     };
//     const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
//     document.addEventListener("mousedown", onDown);
//     document.addEventListener("keydown", onKey);
//     return () => {
//       document.removeEventListener("mousedown", onDown);
//       document.removeEventListener("keydown", onKey);
//     };
//   }, []);

//   return (
//     <div ref={ref} className="relative w-full">
//       <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] text-amber-400/80">
//         <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
//         {tag} <span className="text-zinc-500">//</span> <span className="text-zinc-300">{label}</span>
//       </div>

//       <button
//         type="button"
//         aria-haspopup="listbox"
//         aria-expanded={open}
//         onClick={() => setOpen((o) => !o)}
//         className={`group relative flex w-full items-center justify-between gap-3 overflow-hidden border border-amber-500/40 bg-zinc-900/80 px-4 py-3.5 text-left font-semibold uppercase tracking-wider text-zinc-100 shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_0_24px_-8px_rgba(245,166,35,0.6)] transition-all duration-300 hover:border-amber-400 hover:shadow-[0_0_32px_-4px_rgba(245,166,35,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${CUT_CORNERS}`}
//       >
//         <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-400/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
//         <span className="relative truncate text-sm sm:text-base">{selected?.label ?? "Select"}</span>
//         <svg
//           viewBox="0 0 24 24"
//           className={`relative h-5 w-5 shrink-0 text-amber-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
//           fill="none"
//           stroke="currentColor"
//           strokeWidth={2.5}
//         >
//           <path d="M6 9l6 6 6-6" />
//         </svg>
//       </button>

//       <ul
//         role="listbox"
//         className={`absolute z-40 mt-2 max-h-80 w-full origin-top overflow-y-auto border border-amber-500/40 bg-zinc-950/95 py-1 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all duration-200 ${
//           open ? "pointer-events-auto scale-y-100 opacity-100" : "pointer-events-none scale-y-75 opacity-0"
//         }`}
//       >
//         {options.map((opt, i) => {
//           const active = opt.value === value;
//           return (
//             <li key={String(opt.value)} role="option" aria-selected={active}>
//               <button
//                 type="button"
//                 onClick={() => {
//                   onChange(opt.value);
//                   setOpen(false);
//                 }}
//                 style={{ animationDelay: open ? `${i * 35}ms` : "0ms" }}
//                 className={`group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium uppercase tracking-wide transition-all duration-200 ${
//                   open ? "animate-[slide-in_0.3s_ease-out_both]" : ""
//                 } ${active ? "bg-amber-500/15 text-amber-300" : "text-zinc-300 hover:bg-zinc-800/80 hover:pl-6 hover:text-amber-200"}`}
//               >
//                 <span
//                   className={`h-2 w-2 shrink-0 rotate-45 border transition-colors ${
//                     active ? "border-amber-400 bg-amber-400" : "border-zinc-500 group-hover:border-amber-400"
//                   }`}
//                 />
//                 <span className="truncate">{opt.label}</span>
//               </button>
//             </li>
//           );
//         })}
//       </ul>
//     </div>
//   );
// }

// function StatCard({ label, value, icon, delay }: { label: string; value: string | number; icon: string; delay: number }) {
//   return (
//     <div
//       style={{ animationDelay: `${delay}ms` }}
//       className={`group relative animate-[airdrop_0.8s_cubic-bezier(.2,.9,.3,1.2)_both] overflow-hidden border border-zinc-700/80 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/70 hover:shadow-[0_10px_40px_-12px_rgba(245,166,35,0.6)] ${CUT_CORNERS}`}
//     >
//       <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 via-amber-600 to-transparent opacity-60" />
//       <div className="flex items-center justify-between">
//         <span className="text-[11px] font-bold tracking-[0.25em] text-zinc-400">{label}</span>
//         <span className="text-xl transition-transform duration-300 group-hover:scale-125">{icon}</span>
//       </div>
//       <div className="mt-2 font-['Orbitron',sans-serif] text-3xl font-black text-amber-400 drop-shadow-[0_0_12px_rgba(245,166,35,0.55)]">
//         {value}
//       </div>
//     </div>
//   );
// }

// function CopyUid({ uid }: { uid: string }) {
//   const [copied, setCopied] = useState(false);
//   return (
//     <button
//       type="button"
//       title="Copy UID"
//       onClick={() => {
//         navigator.clipboard?.writeText(uid).then(() => {
//           setCopied(true);
//           setTimeout(() => setCopied(false), 1200);
//         });
//       }}
//       className="group inline-flex items-center gap-2 font-mono text-sm text-zinc-300 transition-colors hover:text-amber-300"
//     >
//       {uid}
//       <span
//         className={`text-[10px] font-bold tracking-widest transition-all ${
//           copied ? "text-emerald-400 opacity-100" : "text-zinc-500 opacity-0 group-hover:opacity-100"
//         }`}
//       >
//         {copied ? "COPIED" : "COPY"}
//       </span>
//     </button>
//   );
// }

// function SkeletonRows() {
//   return (
//     <>
//       {Array.from({ length: 6 }, (_, i) => (
//         <tr key={i} className="border-t border-zinc-800/80">
//           {[6, 28, 20, 22, 26, 30].map((w, j) => (
//             <td key={j} className="px-5 py-5">
//               <div
//                 style={{ width: `${w * 4}px`, animationDelay: `${i * 80}ms` }}
//                 className="h-4 max-w-full animate-[shimmer_1.4s_linear_infinite] bg-[linear-gradient(90deg,rgba(63,63,70,0.4)_0%,rgba(245,166,35,0.25)_50%,rgba(63,63,70,0.4)_100%)] bg-[length:200%_100%]"
//               />
//             </td>
//           ))}
//         </tr>
//       ))}
//     </>
//   );
// }

// /* ============================================================
//    APP
//    ============================================================ */
// export default function App() {
//   const [season, setSeason] = useState<SeasonValue>(DEFAULT_SEASON);
//   const [task, setTask] = useState<string>(TASKS_BY_SEASON[DEFAULT_SEASON][0].value);
//   const [query, setQuery] = useState("");
//   const [reloadKey, setReloadKey] = useState(0);
//   const [result, setResult] = useState<FetchResult | null>(null);

//   const taskOptions = TASKS_BY_SEASON[season];
//   const selectedTask = taskOptions.find((t) => t.value === task) ?? taskOptions[0];

//   // Every season/task change (or retry) is a new request
//   const requestKey = `${season}|${task}|${reloadKey}`;
//   const loading = result?.key !== requestKey;
//   const rows = useMemo(() => (loading || !result ? [] : result.rows), [loading, result]);
//   const error = loading ? null : result.error;

//   const handleSeasonChange = (next: SeasonValue) => {
//     setSeason(next);
//     setTask(TASKS_BY_SEASON[next][0].value);
//     setQuery("");
//   };

//   /* ---------- API CALL ---------- */
//   useEffect(() => {
//     const controller = new AbortController();
//     const key = `${season}|${task}|${reloadKey}`;

//     axios
//   .get<SubmissionDetailsResponse>(API_URL, {
//     params: { taskId: task }, // task state now holds the task's ID
//     signal: controller.signal,
//   })
//       .then(({ data }) => {
//         if (!data?.success) {
//           setResult({ key, rows: [], error: data?.message || "Request failed." });
//           return;
//         }
//         setResult({ key, rows: buildRows(data.ambassadors ?? [], data.submissions ?? []), error: null });
//       })
//       .catch((err: unknown) => {
//         if (axios.isCancel(err)) return; // request replaced by a newer one
//         setResult({ key, rows: [], error: getErrorMessage(err) });
//       });

//     return () => controller.abort();
//   }, [season, task, reloadKey]);

//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     if (!q) return rows;
//     return rows.filter((r) =>
//       [r.ign, r.uid, r.date ? `${formatDate(r.date)} ${formatTime(r.date)}` : r.rawDate].some((f) =>
//         f.toLowerCase().includes(q)
//       )
//     );
//   }, [rows, query]);

//   const uniqueAmbassadors = new Set(rows.map((r) => `${r.ign}|${r.uid}`)).size;
//   const totalLinks = rows.reduce((n, r) => n + r.links.length, 0);

//   return (
//     <div className="relative min-h-screen overflow-x-hidden bg-[#07080a] font-['Rajdhani',sans-serif] text-zinc-100 selection:bg-amber-400 selection:text-black">
//       {/* Keyframes + fonts */}
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap');
//         @keyframes grid-pan { to { background-position: 0 56px, 56px 0; } }
//         @keyframes radar { to { transform: rotate(360deg); } }
//         @keyframes scanline { 0% { transform: translateY(-10vh); } 100% { transform: translateY(110vh); } }
//         @keyframes zone { 0%,100% { transform: scale(1); opacity:.35 } 50% { transform: scale(.82); opacity:.7 } }
//         @keyframes airdrop { 0% { transform: translateY(-60px) rotate(-6deg); opacity:0 } 60% { transform: translateY(6px) rotate(2deg); opacity:1 } 80% { transform: translateY(-3px) rotate(0) } 100% { transform: translateY(0) } }
//         @keyframes slide-in { from { opacity:0; transform: translateX(-14px) } to { opacity:1; transform:none } }
//         @keyframes row-in { from { opacity:0; transform: translateX(-24px) skewX(-6deg) } to { opacity:1; transform:none } }
//         @keyframes shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }
//         @keyframes glitch {
//           0%,92%,100% { transform:none; text-shadow: 0 0 18px rgba(245,166,35,.6) }
//           93% { transform: translate(-2px,1px); text-shadow: 3px 0 #ff2d55, -3px 0 #00e5ff }
//           95% { transform: translate(2px,-1px); text-shadow: -3px 0 #ff2d55, 3px 0 #00e5ff }
//           97% { transform: translate(-1px,0); text-shadow: 2px 0 #ff2d55, -2px 0 #00e5ff }
//         }
//         @keyframes flicker { 0%,100% { opacity:1 } 45% { opacity:.85 } 50% { opacity:.4 } 55% { opacity:.9 } }
//         @keyframes bullet { 0% { transform: translateX(-10%); opacity:0 } 10% { opacity:1 } 100% { transform: translateX(110vw); opacity:0 } }
//         @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
//       `}</style>

//       {/* ===== Animated battlefield background ===== */}
//       <div className="pointer-events-none fixed inset-0 z-0">
//         <div className="absolute inset-0 animate-[grid-pan_6s_linear_infinite] bg-[linear-gradient(rgba(245,166,35,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(245,166,35,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
//         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,166,35,0.14),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(220,38,38,0.12),transparent_55%)]" />
//         <div className="absolute -right-40 top-20 h-[38rem] w-[38rem] animate-[zone_9s_ease-in-out_infinite] rounded-full border-2 border-sky-400/40 shadow-[inset_0_0_80px_rgba(56,189,248,0.25)]" />
//         <div className="absolute -left-56 bottom-0 h-[30rem] w-[30rem] animate-[zone_12s_ease-in-out_infinite] rounded-full border border-dashed border-amber-400/25" />
//         <div className="absolute top-[30%] h-px w-40 animate-[bullet_3.5s_linear_infinite] bg-gradient-to-r from-transparent via-amber-300 to-white shadow-[0_0_8px_#fbbf24]" />
//         <div className="absolute top-[72%] h-px w-28 animate-[bullet_5s_linear_infinite_1.8s] bg-gradient-to-r from-transparent via-red-400 to-white shadow-[0_0_8px_#f87171]" />
//         <div className="absolute inset-x-0 h-24 animate-[scanline_7s_linear_infinite] bg-gradient-to-b from-transparent via-amber-300/[0.06] to-transparent" />
//         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.85))]" />
//       </div>

//       <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
//         {/* ===== Header ===== */}
//         <header className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
//           <div className="flex items-center gap-5">
//             <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-amber-500/60 bg-zinc-950 shadow-[0_0_30px_rgba(245,166,35,0.35)]">
//               <div className="absolute inset-2 rounded-full border border-amber-500/20" />
//               <div className="absolute inset-5 rounded-full border border-amber-500/20" />
//               <div className="absolute left-1/2 top-0 h-full w-px bg-amber-500/20" />
//               <div className="absolute left-0 top-1/2 h-px w-full bg-amber-500/20" />
//               <div className="absolute inset-0 animate-[radar_3s_linear_infinite] bg-[conic-gradient(from_0deg,rgba(245,166,35,0.55),transparent_25%)]" />
//               <span className="absolute left-[62%] top-[30%] h-1.5 w-1.5 animate-ping rounded-full bg-red-500" />
//               <span className="absolute left-[30%] top-[64%] h-1.5 w-1.5 animate-ping rounded-full bg-red-500 [animation-delay:1s]" />
//             </div>
//             <div>
//               <p className="flex items-center gap-2 text-xs font-bold tracking-[0.4em] text-red-400">
//                 <span className="relative flex h-2 w-2">
//                   <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
//                   <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
//                 </span>
//                 LIVE INTEL FEED
//               </p>
//               <h1 className="animate-[glitch_4s_infinite] font-['Orbitron',sans-serif] text-3xl font-black uppercase tracking-wider text-amber-400 sm:text-5xl">
//                 BGMI Campus MVP
//               </h1>
//               <p className="mt-1 text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">
//                 Submission Report Dashboard
//               </p>
//             </div>
//           </div>

//           <div className={`animate-[flicker_5s_infinite] border border-zinc-700 bg-zinc-900/70 px-4 py-2 font-mono text-xs text-zinc-400 backdrop-blur ${CUT_CORNERS}`}>
//   <div>
//     SEASON <span className="text-amber-400">{season}</span>
//   </div>
//   <div className="max-w-[16rem] truncate">
//     TASK <span className="text-amber-400">{selectedTask.label}</span>
//   </div>
// </div>
//         </header>

//         {/* ===== Dropdowns ===== */}
//         {/* No clip-path here: it would clip the open dropdown lists */}
//         <section className="relative z-30 mb-8 grid gap-6 border border-zinc-800 bg-zinc-950/70 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
//           <span className="pointer-events-none absolute -left-px -top-px h-4 w-4 border-l-2 border-t-2 border-amber-400" />
//           <span className="pointer-events-none absolute -right-px -top-px h-4 w-4 border-r-2 border-t-2 border-amber-400" />
//           <span className="pointer-events-none absolute -bottom-px -left-px h-4 w-4 border-b-2 border-l-2 border-amber-400" />
//           <span className="pointer-events-none absolute -bottom-px -right-px h-4 w-4 border-b-2 border-r-2 border-amber-400" />
//           <HudSelect<SeasonValue>
//             tag="01"
//             label="Select Season"
//             options={SEASONS}
//             value={season}
//             onChange={handleSeasonChange}
//           />
//           <HudSelect<string>
//             key={season}
//             tag="02"
//             label="Select Task"
//             options={taskOptions}
//             value={task}
//             onChange={setTask}
//           />
//         </section>

//         {/* ===== Mission banner ===== */}
//         <div
//           key={`banner-${task}`}
//           className="mb-8 flex animate-[airdrop_0.7s_cubic-bezier(.2,.9,.3,1.2)_both] items-center gap-4 border-l-4 border-amber-400 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent px-5 py-4"
//         >
//           <div className="grid h-12 w-12 shrink-0 place-items-center bg-amber-400 text-2xl text-black [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]">
//             🎯
//           </div>
//           <div className="min-w-0">
//             <p className="text-[11px] font-bold tracking-[0.35em] text-amber-400/80">ACTIVE MISSION</p>
//             <h2 className="truncate text-xl font-bold uppercase tracking-wide text-white sm:text-2xl">
//               {selectedTask.label}
//             </h2>
//           </div>
//         </div>

//         {/* ===== Stats ===== */}
//         <section key={`stats-${requestKey}-${loading}`} className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
//           <StatCard label="SUBMISSIONS" value={loading ? "--" : rows.length} icon="📦" delay={0} />
//           <StatCard label="AMBASSADORS" value={loading ? "--" : uniqueAmbassadors} icon="🪖" delay={90} />
//           <StatCard label="LINKS" value={loading ? "--" : totalLinks} icon="🔗" delay={180} />
//           <StatCard label="SEASON" value={`0${season}`} icon="🏆" delay={270} />
//         </section>

//         {/* ===== Table ===== */}
//         <section className={`overflow-hidden border border-zinc-800 bg-zinc-950/80 backdrop-blur-md ${CUT_CORNERS}`}>
//           <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
//             <h3 className="flex items-center gap-3 font-['Orbitron',sans-serif] text-sm font-bold uppercase tracking-[0.25em] text-zinc-200">
//               <span className="h-3 w-3 rotate-45 bg-amber-400 shadow-[0_0_10px_#f5a623]" />
//               Squad Submissions
//               {!loading && (
//                 <span className="font-['Rajdhani',sans-serif] text-xs tracking-widest text-zinc-500">
//                   ({filtered.length}/{rows.length})
//                 </span>
//               )}
//             </h3>
//             <div className="flex w-full items-center gap-3 sm:w-auto">
//               <div className="relative w-full sm:w-72">
//                 <input
//                   value={query}
//                   onChange={(e) => setQuery(e.target.value)}
//                   placeholder="Search IGN, UID, date"
//                   className="w-full border border-zinc-700 bg-zinc-950 px-4 py-2 pl-9 text-sm font-medium text-zinc-100 placeholder:text-zinc-500 transition-all focus:border-amber-400 focus:outline-none focus:shadow-[0_0_20px_-6px_rgba(245,166,35,0.7)]"
//                 />
//                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400">⌖</span>
//               </div>
//               <button
//                 type="button"
//                 title="Refresh"
//                 onClick={() => setReloadKey((k) => k + 1)}
//                 disabled={loading}
//                 className="grid h-9 w-9 shrink-0 place-items-center border border-zinc-700 text-amber-400 transition-all hover:border-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
//               >
//                 <span className={loading ? "animate-spin" : ""}>⟳</span>
//               </button>
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full min-w-[760px] text-left">
//               <thead>
//                 <tr className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400/80">
//                   <th className="px-5 py-3">#</th>
//                   <th className="px-5 py-3">Date</th>
//                   <th className="px-5 py-3">IGN</th>
//                   <th className="px-5 py-3">UID</th>
//                   <th className="px-5 py-3">College</th>
//                   <th className="px-5 py-3">Submission Links</th>
//                 </tr>
//               </thead>
//               <tbody key={`rows-${requestKey}`}>
//                 {loading && <SkeletonRows />}

//                 {!loading && error && (
//                   <tr>
//                     <td colSpan={5} className="px-5 py-16 text-center">
//                       <p className="font-['Orbitron',sans-serif] text-lg font-bold tracking-widest text-red-400">
//                         COMMS DOWN
//                       </p>
//                       <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">{error}</p>
//                       <button
//                         type="button"
//                         onClick={() => setReloadKey((k) => k + 1)}
//                         className="mt-5 border border-amber-500/60 px-5 py-2 text-xs font-bold tracking-[0.3em] text-amber-300 transition-all hover:bg-amber-500/15 hover:shadow-[0_0_20px_-6px_rgba(245,166,35,0.8)]"
//                       >
//                         RETRY
//                       </button>
//                     </td>
//                   </tr>
//                 )}

//                 {!loading &&
//                   !error &&
//                   filtered.map((r, i) => (
//                     <tr
//                       key={r.id}
//                       style={{ animationDelay: `${Math.min(i, 20) * 45}ms` }}
//                       className="group animate-[row-in_0.45s_ease-out_both] border-t border-zinc-800/80 transition-colors duration-200 hover:bg-amber-500/[0.07]"
//                     >
//                       <td className="relative px-5 py-4 font-mono text-sm text-zinc-500">
//                         <span className="absolute inset-y-0 left-0 w-0.5 scale-y-0 bg-amber-400 transition-transform duration-300 group-hover:scale-y-100" />
//                         {String(i + 1).padStart(2, "0")}
//                       </td>
//                       <td className="px-5 py-4">
//                         <div className="flex items-center gap-3">
//                           <div className="grid h-9 w-9 shrink-0 place-items-center bg-gradient-to-br from-amber-400 to-orange-600 text-xs font-black text-black transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]">
//                             {r.date ? r.date.getDate().toString().padStart(2, "0") : "--"}
//                           </div>
//                           {r.date ? (
//                             <div className="leading-tight">
//                               <div className="font-semibold text-zinc-100">{formatDate(r.date)}</div>
//                               <div className="font-mono text-xs text-zinc-500">{formatTime(r.date)}</div>
//                             </div>
//                           ) : (
//                             <span className="text-sm text-zinc-400">{r.rawDate || "No date"}</span>
//                           )}
//                         </div>
//                       </td>
//                       <td className="px-5 py-4">
//                         <span className="inline-block border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-sm font-bold text-amber-300 transition-shadow group-hover:shadow-[0_0_14px_-2px_rgba(245,166,35,0.7)]">
//                           {r.ign}
//                         </span>
//                       </td>
//                       <td className="px-5 py-4">
//                         <CopyUid uid={r.uid} />
//                       </td>
//                       <td className="px-5 py-4 text-sm font-semibold text-zinc-200">
//                         {r.collegeName}
//                       </td>
//                       <td className="px-5 py-4">
//                         {r.links.length === 0 ? (
//                           <span className="text-xs font-bold tracking-widest text-zinc-600">NO LINKS</span>
//                         ) : (
//                           <div className="flex flex-wrap gap-2">
//                             {r.links.map((l, j) => (
//                               <a
//                                 key={`${l.url}-${j}`}
//                                 href={l.url}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 title={l.url}
//                                 className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-bold tracking-widest transition-all duration-200 hover:-translate-y-0.5 ${LINK_STYLE[l.kind].cls}`}
//                               >
//                                 {LINK_STYLE[l.kind].label}
//                                 {r.links.length > 1 && <span className="opacity-60">{j + 1}</span>}
//                                 <span aria-hidden>↗</span>
//                               </a>
//                             ))}
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   ))}

//                 {!loading && !error && filtered.length === 0 && (
//                   <tr>
//                     <td colSpan={5} className="px-5 py-16 text-center">
//                       <p className="font-['Orbitron',sans-serif] text-lg font-bold tracking-widest text-zinc-500">
//                         NO ENEMIES SPOTTED
//                       </p>
//                       <p className="mt-1 text-sm text-zinc-600">
//                         {query ? `No submissions match "${query}".` : "No submissions for this task yet."}
//                       </p>
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </section>

//         <footer className="mt-8 flex items-center justify-between text-[11px] font-bold tracking-[0.3em] text-zinc-600">
//           <span>WINNER WINNER CHICKEN DINNER</span>
//           <span>{loading ? "SYNCING..." : error ? "OFFLINE" : "LIVE"}</span>
//         </footer>
//       </div>
//     </div>
//   );
// }




import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/* ============================================================
   API CONFIG
   ============================================================ */
const API_URL: string =
  import.meta.env.VITE_API_URL ?? "https://bgmicampusmvp.com/api/admin/getSubmissionDetails";

/* ============================================================
   TYPES
   ============================================================ */
type SeasonValue = 1 | 2 | 3;

interface Option<T extends string | number> {
  label: string;
  value: T;
}

// ---- API response shapes ----
interface Ambassador {
  _id: string;
  IGN: string;
  UID: string | number;
  collegeName: string;
}

interface ApiSubmission {
  _id: string;
  ambassadorId: string | { _id: string }; // handles both plain id and populated doc
  proofUrls: string[];
  createdAt: string; // e.g. "Sat Oct 24 2026 18:14:23 GMT+0000 (Coordinated Universal Time)"
}

interface SubmissionDetailsResponse {
  success: boolean;
  message: string;
  ambassadors: Ambassador[];
  submissions: ApiSubmission[];
}

// ---- UI shapes ----
type LinkKind = "instagram" | "youtube" | "drive" | "linkedin" | "form" | "other";

interface SubmissionLink {
  kind: LinkKind;
  url: string;
}

interface Row {
  id: string;
  date: Date | null;
  rawDate: string;
  ign: string;
  uid: string;
  collegeName: string;
  links: SubmissionLink[];
}

interface FetchResult {
  key: string;
  rows: Row[];
  error: string | null;
}

/* ============================================================
   DROPDOWN CONFIG
   ============================================================ */
const SEASONS: Option<SeasonValue>[] = [
  { label: "Season 1", value: 1 },
  { label: "Season 2", value: 2 },
  { label: "Season 3", value: 3 },
];

// const TASKS_BY_SEASON: Record<SeasonValue, Option<string>[]> = {
//   1: [
//     { label: "CAPTURE THE CLUTCH - Season 1", value: "s1-capture-the-clutch" },
//     { label: "LIVIK LOCKDOWN - Week 1 & Week 2(Combined) - Season 1", value: "s1-livik-lockdown-w1-w2" },
//     { label: "RECRUIT THE SQUAD - Season 1", value: "s1-recruit-the-squad" },
//     { label: "LIVIK LOCKDOWN - Week 3 - Season 1", value: "s1-livik-lockdown-w3" },
//     { label: "LIVIK LOCKDOWN - Week 4 - Season 1", value: "s1-livik-lockdown-w4" },
//     { label: "BOOSTER TASK: COHORT CONNECT - Season 1", value: "s1-booster-cohort-connect" },
//   ],
//   2: [
//     { label: "TDM / WOW BATTLEGROUND (WEEK 1 & 2) - Season 2", value: "s2-tdm-wow-w1-w2" },
//     { label: "TDM / WOW BATTLEGROUND (WEEK 3 & 4) - Season 2", value: "s2-tdm-wow-w3-w4" },
//     { label: "CAPTURE THE CLUTCH - Season 2", value: "s2-capture-the-clutch" },
//     { label: "OFFLINE ACTIVATION - Season 2", value: "s2-offline-activation" },
//     { label: "BOOSTER — SQUAD SIGNUPS - Season 2", value: "s2-booster-squad-signups" },
//     { label: "BOOSTER — FLEX - Season 2", value: "s2-booster-flex" },
//     { label: "Booster Task - Welcome Kit Unboxing Reel - Season 2", value: "s2-booster-unboxing-reel" },
//     { label: "WOW CHALLENGE - Season 2", value: "s2-wow-challenge" },
//     { label: "CLUTCH DIARIES - Season 2", value: "s2-clutch-diaries" },
//   ],
//   3: [
//     { label: "Recruit the Squad - Season 3", value: "s3-recruit-the-squad" },
//     { label: "Custom Classic Matches (Week 1 & 2) - Season 3", value: "s3-custom-classic-w1-w2" },
//     { label: "Custom Classic Matches (Week 3 & 4) - Season 3", value: "s3-custom-classic-w3-w4" },
//     { label: "Capture the Clutch - Season 3", value: "s3-capture-the-clutch" },
//     { label: "BGMI Campus MVP LinkedIn Post - Season 3", value: "s3-linkedin-post" },
//     { label: "My BGMI MVP Journey (Reel) - Season 3", value: "s3-mvp-journey-reel" },
//     { label: "Booster: KIARAA SHOWDOWN - Season 3", value: "s3-booster-kiaraa-showdown" },
//   ],
// };

const TASKS_BY_SEASON: Record<SeasonValue, Option<string>[]> = {
  1: [
    { label: "CAPTURE THE CLUTCH - Season 1", value: "6a58c356457bea701ebd218c" },
    { label: "LIVIK LOCKDOWN - Week 1 & Week 2(Combined) - Season 1", value: "6a58c5dbeedf4fd8e801cef5" },
    { label: "RECRUIT THE SQUAD - Season 1", value: "6a58c6633e78410396961622" },
    { label: "LIVIK LOCKDOWN - Week 3 - Season 1", value: "6a7470738fce8ec8fd2e040c" },
    { label: "LIVIK LOCKDOWN - Week 4 - Season 1", value: "6a7471e839d1c73094a1aa24" },
    { label: "BOOSTER TASK: COHORT CONNECT - Season 1", value: "6a8d54c2db70a0a21fac09a0" },
  ],
  2: [
    { label: "TDM / WOW BATTLEGROUND (WEEK 1 & 2) - Season 2", value: "6a9ae1999dc6f5901f1c5960" },
    { label: "TDM / WOW BATTLEGROUND (WEEK 3 & 4) - Season 2", value: "6a9ae3229dc6f5901f1c5961" },
    { label: "CAPTURE THE CLUTCH - Season 2", value: "6a9c16f3093c4e366e2e623f" },
    { label: "OFFLINE ACTIVATION - Season 2", value: "6a9c17bcf4853e9901eeee21" },
    { label: "BOOSTER — SQUAD SIGNUPS - Season 2", value: "6a9e7644647eb524f1eb84d0" },
    { label: "BOOSTER — FLEX - Season 2", value: "6aa9274c1b12d592eaa9a62b" },
    { label: "Booster Task - Welcome Kit Unboxing Reel - Season 2", value: "6ab6969da4803c3c7b1b087c" },
    { label: "WOW CHALLENGE - Season 2", value: "6ac0d3becfe49cb80aa65d83" },
    { label: "CLUTCH DIARIES - Season 2", value: "6ac0d9bfc6e5c085e2ee3e9f" },
  ],
  3: [
    { label: "Recruit the Squad - Season 3", value: "6ada5d61889b4b59d6e69bde" },
    { label: "Custom Classic Matches (Week 1 & 2) - Season 3", value: "6ada5dd23bd322bdfd1b2104" },
    { label: "Custom Classic Matches (Week 3 & 4) - Season 3", value: "6ada5e2ca4d7536c8254a700" },
    { label: "Capture the Clutch - Season 3", value: "6ada5e962da30de8da222e18" },
    { label: "BGMI Campus MVP LinkedIn Post - Season 3", value: "6ada5eeb889b4b59d6e69bdf" },
    { label: "My BGMI MVP Journey (Reel) - Season 3", value: "6ada5f603bd322bdfd1b2105" },
    { label: "Booster: KIARAA SHOWDOWN - Season 3", value: "6ae83bbef4a0bf8c4c95e8ec" },
  ],
};

const DEFAULT_SEASON: SeasonValue = 3;

/* ============================================================
   HELPERS
   ============================================================ */
// "Sat Oct 24 2026 18:14:23 GMT+0000 (Coordinated Universal Time)" → Date
function parseCreatedAt(value: string): Date | null {
  if (!value) return null;
  const cleaned = String(value).replace(/\s*\([^)]*\)\s*$/, ""); // drop "(Coordinated Universal Time)"
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// Make sure links without a protocol still open as external URLs
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function detectLinkKind(url: string): LinkKind {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (host.includes("instagram")) return "instagram";
  if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
  if (host.includes("drive.google") || host.includes("docs.google")) return "drive";
  if (host.includes("linkedin")) return "linkedin";
  if (host.includes("forms.gle") || host.includes("forms.")) return "form";
  return "other";
}

function getAmbassadorId(ref: ApiSubmission["ambassadorId"]): string {
  return typeof ref === "string" ? ref : ref?._id ?? "";
}

// Join submissions → ambassadors via submissions[].ambassadorId === ambassadors[]._id
function buildRows(ambassadors: Ambassador[], submissions: ApiSubmission[]): Row[] {
  const byId = new Map(ambassadors.map((a) => [String(a._id), a]));

  return submissions
    .map((s, i) => {
      const amb = byId.get(String(getAmbassadorId(s.ambassadorId)));
      const links = (s.proofUrls ?? [])
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .map((u) => {
          const url = normalizeUrl(u);
          return { url, kind: detectLinkKind(url) };
        });

      return {
        id: s._id ?? `row-${i}`,
        date: parseCreatedAt(s.createdAt),
        rawDate: s.createdAt ?? "",
        ign: amb?.IGN ?? "Unknown",
        uid: amb?.UID != null ? String(amb.UID) : "N/A",
        collegeName: amb?.collegeName ?? "N/A",
        links,
      };
    })
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)); // newest first
}

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const apiMessage = (err.response?.data as { message?: string } | undefined)?.message;
    if (apiMessage) return apiMessage;
    if (!err.response) return "Can't reach the server. Check that the backend is running and allows CORS.";
    return `${err.response.status}: ${err.message}`;
  }
  return "Something went wrong while loading submissions.";
}

/* ============================================================
   SMALL UI PIECES
   ============================================================ */
const LINK_STYLE: Record<LinkKind, { label: string; cls: string }> = {
  instagram: { label: "INSTAGRAM", cls: "border-pink-500/60 text-pink-300 hover:bg-pink-500/20" },
  youtube: { label: "YOUTUBE", cls: "border-red-500/60 text-red-300 hover:bg-red-500/20" },
  drive: { label: "DRIVE", cls: "border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/20" },
  linkedin: { label: "LINKEDIN", cls: "border-sky-500/60 text-sky-300 hover:bg-sky-500/20" },
  form: { label: "FORM", cls: "border-violet-500/60 text-violet-300 hover:bg-violet-500/20" },
  other: { label: "LINK", cls: "border-amber-500/60 text-amber-300 hover:bg-amber-500/20" },
};

const CUT_CORNERS =
  "[clip-path:polygon(0_0,calc(100%-14px)_0,100%_14px,100%_100%,14px_100%,0_calc(100%-14px))]";

interface HudSelectProps<T extends string | number> {
  label: string;
  tag: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

function HudSelect<T extends string | number>({ label, tag, options, value, onChange }: HudSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] text-amber-400/80">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        {tag} <span className="text-zinc-500">//</span> <span className="text-zinc-300">{label}</span>
      </div>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`group relative flex w-full items-center justify-between gap-3 overflow-hidden border border-amber-500/40 bg-zinc-900/80 px-4 py-3.5 text-left font-semibold uppercase tracking-wider text-zinc-100 shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_0_24px_-8px_rgba(245,166,35,0.6)] transition-colors duration-300 hover:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${CUT_CORNERS}`}
      >
        <span className="relative truncate text-sm sm:text-base">{selected?.label ?? "Select"}</span>
        <svg
          viewBox="0 0 24 24"
          className={`relative h-5 w-5 shrink-0 text-amber-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <ul
        role="listbox"
        className={`absolute z-40 mt-2 max-h-80 w-full origin-top overflow-y-auto border border-amber-500/40 bg-zinc-950/95 py-1 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.9)] backdrop-blur-md transition-opacity duration-200 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <li key={String(opt.value)} role="option" aria-selected={active}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium uppercase tracking-wide transition-colors ${
                  active ? "bg-amber-500/15 text-amber-300" : "text-zinc-300 hover:bg-zinc-800/80 hover:text-amber-200"
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rotate-45 border transition-colors ${
                    active ? "border-amber-400 bg-amber-400" : "border-zinc-500 group-hover:border-amber-400"
                  }`}
                />
                <span className="truncate">{opt.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
  delay?: number;
}) {
  return (
    <div
      className={`relative overflow-hidden border border-zinc-700/80 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 ${CUT_CORNERS}`}
    >
      <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 via-amber-600 to-transparent opacity-60" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-[0.25em] text-zinc-400">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="mt-2 font-['Orbitron',sans-serif] text-3xl font-black text-amber-400">
        {value}
      </div>
    </div>
  );
}

function CopyUid({ uid }: { uid: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy UID"
      onClick={() => {
        navigator.clipboard?.writeText(uid).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="group inline-flex items-center gap-2 font-mono text-sm text-zinc-300 transition-colors hover:text-amber-300"
    >
      {uid}
      <span
        className={`text-[10px] font-bold tracking-widest transition-all ${
          copied ? "text-emerald-400 opacity-100" : "text-zinc-500 opacity-0 group-hover:opacity-100"
        }`}
      >
        {copied ? "COPIED" : "COPY"}
      </span>
    </button>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <tr key={i} className="border-t border-zinc-800/80">
          {[6, 28, 20, 22, 26, 30].map((w, j) => (
            <td key={j} className="px-5 py-5">
              <div
                style={{ width: `${w * 4}px` }}
                className="h-4 max-w-full animate-pulse bg-zinc-800"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ============================================================
   APP
   ============================================================ */
export default function App() {
  const [season, setSeason] = useState<SeasonValue>(DEFAULT_SEASON);
  const [task, setTask] = useState<string>(TASKS_BY_SEASON[DEFAULT_SEASON][0].value);
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<FetchResult | null>(null);

  const taskOptions = TASKS_BY_SEASON[season];
  const selectedTask = taskOptions.find((t) => t.value === task) ?? taskOptions[0];

  // Every season/task change (or retry) is a new request
  const requestKey = `${season}|${task}|${reloadKey}`;
  const loading = result?.key !== requestKey;
  const rows = useMemo(() => (loading || !result ? [] : result.rows), [loading, result]);
  const error = loading ? null : result.error;

  const handleSeasonChange = (next: SeasonValue) => {
    setSeason(next);
    setTask(TASKS_BY_SEASON[next][0].value);
    setQuery("");
  };

  /* ---------- API CALL ---------- */
  useEffect(() => {
    const controller = new AbortController();
    const key = `${season}|${task}|${reloadKey}`;

    axios
      .get<SubmissionDetailsResponse>(API_URL, {
        params: { taskId: task }, // task state now holds the task's ID
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!data?.success) {
          setResult({ key, rows: [], error: data?.message || "Request failed." });
          return;
        }
        setResult({ key, rows: buildRows(data.ambassadors ?? [], data.submissions ?? []), error: null });
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return; // request replaced by a newer one
        setResult({ key, rows: [], error: getErrorMessage(err) });
      });

    return () => controller.abort();
  }, [season, task, reloadKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.ign, r.uid, r.date ? `${formatDate(r.date)} ${formatTime(r.date)}` : r.rawDate].some((f) =>
        f.toLowerCase().includes(q)
      )
    );
  }, [rows, query]);

  const uniqueAmbassadors = new Set(rows.map((r) => `${r.ign}|${r.uid}`)).size;
  const totalLinks = rows.reduce((n, r) => n + r.links.length, 0);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07080a] font-['Rajdhani',sans-serif] text-zinc-100 selection:bg-amber-400 selection:text-black">
      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap');
      `}</style>

      {/* ===== Static background ===== */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(245,166,35,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(245,166,35,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,166,35,0.14),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(220,38,38,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.85))]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ===== Header ===== */}
        <header className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-amber-500/60 bg-zinc-950">
              <div className="absolute inset-2 rounded-full border border-amber-500/20" />
              <div className="absolute inset-5 rounded-full border border-amber-500/20" />
              <div className="absolute left-1/2 top-0 h-full w-px bg-amber-500/20" />
              <div className="absolute left-0 top-1/2 h-px w-full bg-amber-500/20" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.4em] text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                LIVE INTEL FEED
              </p>
              <h1 className="font-['Orbitron',sans-serif] text-3xl font-black uppercase tracking-wider text-amber-400 sm:text-5xl">
                BGMI Campus MVP
              </h1>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">
                Submission Report Dashboard
              </p>
            </div>
          </div>

          <div className={`border border-zinc-700 bg-zinc-900/70 px-4 py-2 font-mono text-xs text-zinc-400 ${CUT_CORNERS}`}>
            <div>
              SEASON <span className="text-amber-400">{season}</span>
            </div>
            <div className="max-w-[16rem] truncate">
              TASK <span className="text-amber-400">{selectedTask.label}</span>
            </div>
          </div>
        </header>

        {/* ===== Dropdowns ===== */}
        {/* No clip-path here: it would clip the open dropdown lists */}
        <section className="relative z-30 mb-8 grid gap-6 border border-zinc-800 bg-zinc-950/70 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <span className="pointer-events-none absolute -left-px -top-px h-4 w-4 border-l-2 border-t-2 border-amber-400" />
          <span className="pointer-events-none absolute -right-px -top-px h-4 w-4 border-r-2 border-t-2 border-amber-400" />
          <span className="pointer-events-none absolute -bottom-px -left-px h-4 w-4 border-b-2 border-l-2 border-amber-400" />
          <span className="pointer-events-none absolute -bottom-px -right-px h-4 w-4 border-b-2 border-r-2 border-amber-400" />
          <HudSelect<SeasonValue>
            tag="01"
            label="Select Season"
            options={SEASONS}
            value={season}
            onChange={handleSeasonChange}
          />
          <HudSelect<string>
            key={season}
            tag="02"
            label="Select Task"
            options={taskOptions}
            value={task}
            onChange={setTask}
          />
        </section>

        {/* ===== Mission banner ===== */}
        <div
          key={`banner-${task}`}
          className="mb-8 flex items-center gap-4 border-l-4 border-amber-400 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent px-5 py-4"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center bg-amber-400 text-2xl text-black [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]">
            🎯
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.35em] text-amber-400/80">ACTIVE MISSION</p>
            <h2 className="truncate text-xl font-bold uppercase tracking-wide text-white sm:text-2xl">
              {selectedTask.label}
            </h2>
          </div>
        </div>

        {/* ===== Stats ===== */}
        <section key={`stats-${requestKey}-${loading}`} className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="SUBMISSIONS" value={loading ? "--" : rows.length} icon="📦" delay={0} />
          <StatCard label="AMBASSADORS" value={loading ? "--" : uniqueAmbassadors} icon="🪖" delay={90} />
          <StatCard label="LINKS" value={loading ? "--" : totalLinks} icon="🔗" delay={180} />
          <StatCard label="SEASON" value={`0${season}`} icon="🏆" delay={270} />
        </section>

        {/* ===== Table ===== */}
        <section className={`overflow-hidden border border-zinc-800 bg-zinc-950/80 backdrop-blur-md ${CUT_CORNERS}`}>
          <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-3 font-['Orbitron',sans-serif] text-sm font-bold uppercase tracking-[0.25em] text-zinc-200">
              <span className="h-3 w-3 rotate-45 bg-amber-400 shadow-[0_0_10px_#f5a623]" />
              Squad Submissions
              {!loading && (
                <span className="font-['Rajdhani',sans-serif] text-xs tracking-widest text-zinc-500">
                  ({filtered.length}/{rows.length})
                </span>
              )}
            </h3>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <div className="relative w-full sm:w-72">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search IGN, UID, date"
                  className="w-full border border-zinc-700 bg-zinc-950 px-4 py-2 pl-9 text-sm font-medium text-zinc-100 placeholder:text-zinc-500 transition-all focus:border-amber-400 focus:outline-none focus:shadow-[0_0_20px_-6px_rgba(245,166,35,0.7)]"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400">⌖</span>
              </div>
              <button
                type="button"
                title="Refresh"
                onClick={() => setReloadKey((k) => k + 1)}
                disabled={loading}
                className="grid h-9 w-9 shrink-0 place-items-center border border-zinc-700 text-amber-400 transition-all hover:border-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
              >
                <span className={loading ? "animate-spin" : ""}>⟳</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400/80">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">IGN</th>
                  <th className="px-5 py-3">UID</th>
                  <th className="px-5 py-3">College</th>
                  <th className="px-5 py-3">Submission Links</th>
                </tr>
              </thead>
              <tbody key={`rows-${requestKey}`}>
                {loading && <SkeletonRows />}

                {!loading && error && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <p className="font-['Orbitron',sans-serif] text-lg font-bold tracking-widest text-red-400">
                        COMMS DOWN
                      </p>
                      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">{error}</p>
                      <button
                        type="button"
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="mt-5 border border-amber-500/60 px-5 py-2 text-xs font-bold tracking-[0.3em] text-amber-300 transition-all hover:bg-amber-500/15 hover:shadow-[0_0_20px_-6px_rgba(245,166,35,0.8)]"
                      >
                        RETRY
                      </button>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      className="group border-t border-zinc-800/80 hover:bg-amber-500/[0.07]"
                    >
                      <td className="relative px-5 py-4 font-mono text-sm text-zinc-500">
                        <span className="absolute inset-y-0 left-0 w-0.5 scale-y-0 bg-amber-400 transition-transform duration-300 group-hover:scale-y-100" />
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center bg-gradient-to-br from-amber-400 to-orange-600 text-xs font-black text-black [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]">
                            {r.date ? r.date.getDate().toString().padStart(2, "0") : "--"}
                          </div>
                          {r.date ? (
                            <div className="leading-tight">
                              <div className="font-semibold text-zinc-100">{formatDate(r.date)}</div>
                              <div className="font-mono text-xs text-zinc-500">{formatTime(r.date)}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">{r.rawDate || "No date"}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-sm font-bold text-amber-300">
                          {r.ign}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <CopyUid uid={r.uid} />
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-zinc-200">
                        {r.collegeName}
                      </td>
                      <td className="px-5 py-4">
                        {r.links.length === 0 ? (
                          <span className="text-xs font-bold tracking-widest text-zinc-600">NO LINKS</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {r.links.map((l, j) => (
                              <a
                                key={`${l.url}-${j}`}
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={l.url}
                                className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-bold tracking-widest transition-colors ${LINK_STYLE[l.kind].cls}`}
                              >
                                {LINK_STYLE[l.kind].label}
                                {r.links.length > 1 && <span className="opacity-60">{j + 1}</span>}
                                <span aria-hidden>↗</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                {!loading && !error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <p className="font-['Orbitron',sans-serif] text-lg font-bold tracking-widest text-zinc-500">
                        NO ENEMIES SPOTTED
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {query ? `No submissions match "${query}".` : "No submissions for this task yet."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-8 flex items-center justify-between text-[11px] font-bold tracking-[0.3em] text-zinc-600">
          <span>WINNER WINNER CHICKEN DINNER</span>
          <span>{loading ? "SYNCING..." : error ? "OFFLINE" : "LIVE"}</span>
        </footer>
      </div>
    </div>
  );
}