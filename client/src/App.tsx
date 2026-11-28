import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Document, ExternalHyperlink, Packer, Paragraph, Table, TextRun } from "docx";

/* ============================================================
   API CONFIG
   ============================================================ */
const API_URL: string =
  import.meta.env.VITE_API_URL ?? "https://bgmicampusmvp.com/api/admin/getSubmissionDetails";

// Google Apps Script web app URL (ends in /exec). Receives the rows to append to the
// submissions spreadsheet every time the Word report is downloaded. Leave empty to skip.
const SHEETS_WEBAPP_URL: string =
  import.meta.env.VITE_SHEETS_WEBAPP_URL ??
  "https://script.google.com/macros/s/AKfycbxGH5COyvLig_J402ZfUwkASQSRnxkWtz-IuOMCWPpecgDYqVegK0-nvd66xpPM3Fs3/exec";

/* ============================================================
   TYPES
   ============================================================ */
type SeasonNumber = 1 | 2 | 3;
type SeasonValue = SeasonNumber | "all";

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
  taskId?: string | { _id: string }; // handles both plain id and populated doc
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
  taskName: string;
  taskDescription: string;
  links: SubmissionLink[];
}

// "YYYY-MM-DD" from the date inputs; an empty string means that side is not set
interface DateRange {
  from: string;
  to: string;
}

interface FetchResult {
  key: string;
  rows: Row[];
  error: string | null;
}

// One task's submissions, already filtered to the selected date range
interface TaskData {
  season: SeasonNumber;
  label: string;
  value: string;
  ok: boolean;
  rows: Row[];
}

// ---- Google Sheet sync payload (contract for the Apps Script doPost) ----
interface SheetRow {
  season: SeasonNumber;
  taskId: string;
  task: string;
  date: string; // as shown on the page, e.g. "24 Oct 2026 11:44 pm"
  createdAt: string; // ISO string, empty if the date could not be read
  ign: string;
  uid: string;
  collegeName: string;
  proofLinks: string[];
}

// One tab to overwrite: a season tab ("Season 1") or a task's own tab
interface SheetSeasonBlock {
  kind: "season" | "task";
  season: SeasonNumber;
  taskId?: string; // only for task tabs
  sheetName: string; // tab looked up by name first...
  sheetGid: number | null; // ...then by gid (task tabs are found by gid)
  sheetLabel: string;
  includeDate: boolean; // false → the Apps Script writes the tab without a Date column
  rows: SheetRow[];
}

// A tab that gets updated (and linked in the Word report) for the current selection
interface SheetTarget {
  kind: "season" | "task";
  season: SeasonNumber;
  taskId?: string;
  sheetName: string;
  sheetGid: number | null;
  label: string;
  link: string | undefined;
  tasks: TaskData[]; // the task data written to this tab
}

interface SheetSyncPayload {
  action: "overwriteSubmissions";
  spreadsheetId: string | null;
  generatedAt: string; // ISO
  scope: string;
  dateRange: { from: string | null; to: string | null }; // null = not set (all data)
  totalRows: number;
  seasons: SheetSeasonBlock[];
}

interface SheetSyncResponse {
  success: boolean;
  message?: string;
  written?: number;
}

type ExportStatus =
  | { state: "idle" }
  | { state: "working" | "done" | "warn" | "error"; message: string };

/* ============================================================
   DROPDOWN CONFIG
   ============================================================ */
const ALL_TASKS = "all"; // value of the "All Tasks" option

const SEASONS: Option<SeasonValue>[] = [
  { label: "All Seasons", value: "all" },
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

const TASKS_BY_SEASON: Record<SeasonNumber, Option<string>[]> = {
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

// taskId → task description (shown in the Word report and the CSV). "\n" starts a new line.
const TASK_DESCRIPTIONS: Record<string, string> = {
  /* ---------- Season 1 ---------- */
  // CAPTURE THE CLUTCH - Season 1
  "6a58c356457bea701ebd218c": "Create and upload 2 exciting in-game BGMI reels before Phase 1 ends.",
  // LIVIK LOCKDOWN - Week 1 & Week 2(Combined) - Season 1
  "6a58c5dbeedf4fd8e801cef5": "Play at least 10 Custom matches by the end of week 2 phase 1.",
  // RECRUIT THE SQUAD - Season 1
  "6a58c6633e78410396961622":
    "Invite 15 campus players to your official Campus MVP squad and submit their BGMI UIDs. BY THE END OF 18TH AUG.",
  // LIVIK LOCKDOWN - Week 3 - Season 1
  "6a7470738fce8ec8fd2e040c": "Play at least 5 Custom matches by the end of week 3 phase 1.",
  // LIVIK LOCKDOWN - Week 4 - Season 1
  "6a7471e839d1c73094a1aa24": "Play at least 5 Custom matches by the end of week 4 phase 1.",
  // BOOSTER TASK: COHORT CONNECT - Season 1
  "6a8d54c2db70a0a21fac09a0":
    "Bring your cohort together and sit together for a BGMI gaming session. Get your cohort players together, sit in the same place, and play BGMI matches. Any map or match mode works.",

  /* ---------- Season 2 ---------- */
  // TDM / WOW BATTLEGROUND (WEEK 1 & 2) - Season 2
  "6a9ae1999dc6f5901f1c5960":
    "Play at least 15 custom TDM / WOW 4v4 matches with minimum 8 verified players from your cohort by the end of week 1 & 2 phase 2.",
  // TDM / WOW BATTLEGROUND (WEEK 3 & 4) - Season 2
  "6a9ae3229dc6f5901f1c5961":
    "Play at least 15 custom TDM / WOW 4v4 matches with minimum 8 verified players from your cohort by the end of week 3 & 4 phase 2.",
  // CAPTURE THE CLUTCH - Season 2
  "6a9c16f3093c4e366e2e623f": "Campus MVPs must create a minimum of 2 original BGMI gameplay Reels.",
  // OFFLINE ACTIVATION - Season 2
  "6a9c17bcf4853e9901eeee21":
    "Campus MVPs must conduct 2 offline BGMI activations during Season 2 at relevant college hotspots (Canteen, Lawns, Classrooms, etc.).",
  // BOOSTER — SQUAD SIGNUPS - Season 2
  "6a9e7644647eb524f1eb84d0":
    "MVPs must continue using their existing Season 1 Google Sheet and create a clear separate section for\nSeason 2 recruits.",
  // BOOSTER — FLEX - Season 2
  "6aa9274c1b12d592eaa9a62b":
    "The FLEX Booster is designed for Campus MVPs to showcase their BGMI Campus MVP identity on campus using the official BGMI Welcome Kit.",
  // Booster Task - Welcome Kit Unboxing Reel - Season 2
  "6ab6969da4803c3c7b1b087c":
    "Unbox your BGMI Campus MVP Welcome Kit and give your audience a glimpse of what’s inside through a creative Instagram Reel.\nShowcase the kit, share your first reactions, and add your personal touch to make the unboxing engaging.",
  // WOW CHALLENGE - Season 2
  "6ac0d3becfe49cb80aa65d83":
    "MVPs and cohort players are required to play the featured WoW maps mentioned below. MANDATORY MAPS\n- 2v2 Garage — 454263\n- Only Shotgun 2v2 — 443262\n- King of School 2v2 — 443259\n- 1v1 M24 Only — 454264",
  // CLUTCH DIARIES - Season 2
  "6ac0d9bfc6e5c085e2ee3e9f":
    "MVPs will capture their best and most exciting moments from the featured WOW Maps and turn them into engaging Instagram Reels.",

  /* ---------- Season 3 ---------- */
  // Recruit the Squad - Season 3
  "6ada5d61889b4b59d6e69bde":
    'Onboard BGMI players from your own campus through the "Your Cohort" section. Add them to a separate Season 3 section in your existing Google Sheet.',
  // Custom Classic Matches (Week 1 & 2) - Season 3
  "6ada5dd23bd322bdfd1b2104":
    "Play at least 10 Custom Classic matches (any map) with a minimum of 11 Verified Cohort players and 1 spectator by the end of Week 1 & 2.",
  // Custom Classic Matches (Week 3 & 4) - Season 3
  "6ada5e2ca4d7536c8254a700":
    "Play another 10 Custom Classic matches (any map) with a minimum of 11 Verified Cohort players and 1 spectator by the end of Week 3 & 4.",
  // Capture the Clutch - Season 3
  "6ada5e962da30de8da222e18":
    "Create at least 2 original BGMI gameplay Reels and publish them on Instagram after POC approval.",
  // BGMI Campus MVP LinkedIn Post - Season 3
  "6ada5eeb889b4b59d6e69bdf": "Publish 1 original LinkedIn post about your experience as a BGMI Campus MVP.",
  // My BGMI MVP Journey (Reel) - Season 3
  "6ada5f603bd322bdfd1b2105": "Create 1 original Instagram Reel on your journey as a BGMI Campus MVP.",
  // Booster: KIARAA SHOWDOWN - Season 3
  "6ae83bbef4a0bf8c4c95e8ec":
    "Compete in Kiaraa Showdown, deal maximum damage, and give it your best shot!\n\nRemember: Only the MVP's individual damage to Kiaraa will be counted. Damage dealt by your cohort players will not be considered.",
};

const DEFAULT_SEASON: SeasonNumber = 3;

const NO_DATE_RANGE: DateRange = { from: "", to: "" };

// Spreadsheet links used by the Word report (shown once per season instead of tables)
const SHEET_LINKS: Partial<Record<SeasonNumber, string>> = {
  1: "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=1965542281#gid=1965542281",
  2: "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=2031594151#gid=2031594151",
  3: "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=146651924#gid=146651924",
};

// Season dates shown in the Word report when no date range is selected
const SEASON_DATE_RANGES: Record<SeasonNumber, string> = {
  1: "3 Aug 2026 - 3 Sep 2026",
  2: "5 Sep 2026 - 18 Oct 2026",
  3: "23 Oct 2026 - 25 Dec 2026",
};

// Tasks that have their own tab in the BGMI Submissions Master sheet (taskId → tab link)
const TASK_SHEET_LINKS: Record<string, string> = {
  // Recruit the Squad - Season 3
  "6ada5d61889b4b59d6e69bde":
    "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=1952618541#gid=1952618541",
  // Custom Classic Matches (Week 1 & 2) - Season 3
  "6ada5dd23bd322bdfd1b2104":
    "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=264393926#gid=264393926",
  // Custom Classic Matches (Week 3 & 4) - Season 3
  "6ada5e2ca4d7536c8254a700":
    "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=916757449#gid=916757449",
  // Capture the Clutch - Season 3
  "6ada5e962da30de8da222e18":
    "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=1789586385#gid=1789586385",
  // BGMI Campus MVP LinkedIn Post - Season 3
  "6ada5eeb889b4b59d6e69bdf":
    "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=974475846#gid=974475846",
  // My BGMI MVP Journey (Reel) - Season 3
  "6ada5f603bd322bdfd1b2105":
    "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=42837347#gid=42837347",
  // Booster: KIARAA SHOWDOWN - Season 3
  "6ae83bbef4a0bf8c4c95e8ec":
    "https://docs.google.com/spreadsheets/d/1JcrQYc9eYf_LalA2rdPHRRvpf9QO_qdJurDLWXqtDbE/edit?gid=1749056249#gid=1749056249",
};

// Seasons whose sheet tabs (season tab + task tabs) are written without the Date column
const SEASONS_WITHOUT_SHEET_DATE: SeasonNumber[] = [3];

// Seasons that are never written to the Google Sheet (no Season 1 / Season 2 tabs).
// The Word report and CSV for these seasons are unchanged.
const SEASONS_WITHOUT_SHEET_TABS: SeasonNumber[] = [1, 2];

// Spreadsheet tab each season's submissions are written to
const SHEET_TAB_NAME: Record<SeasonNumber, string> = {
  1: "Season 1",
  2: "Season 2",
  3: "Season 3",
};

const SHEET_LINK_LABEL: Record<SeasonNumber, string> = {
  1: "Season 1 Tasks Submission Details",
  2: "Season 2 Submission Details",
  3: "Season 3 Submission Details",
};

// taskId → task name, built from the ids stored with every task on the frontend
const TASK_NAME_BY_ID = new Map<string, string>(
  Object.values(TASKS_BY_SEASON)
    .flat()
    .map((t): [string, string] => [t.value, t.label])
);

// "All Tasks" always comes first; with "All Seasons" it is the only option
function getTaskOptions(season: SeasonValue): Option<string>[] {
  const allTasks: Option<string> = { label: "All Tasks", value: ALL_TASKS };
  return season === "all" ? [allTasks] : [allTasks, ...TASKS_BY_SEASON[season]];
}

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

function getTaskId(ref: ApiSubmission["taskId"]): string {
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
        taskName: TASK_NAME_BY_ID.get(getTaskId(s.taskId)) ?? "N/A",
        taskDescription: TASK_DESCRIPTIONS[getTaskId(s.taskId)] ?? "",
        links,
      };
    })
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)); // newest first
}

// Keeps rows between the start and end date (both days included, in local time).
// With no date selected, every row is returned. Undated rows never match a range.
function filterByDateRange(rows: Row[], { from, to }: DateRange): Row[] {
  if (!from && !to) return rows;
  const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
  const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
  return rows.filter((r) => r.date !== null && r.date.getTime() >= start && r.date.getTime() <= end);
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

// Escape a value for CSV (always quoted, inner quotes doubled)
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Builds a CSV that mirrors the table exactly as shown on the page
function downloadCsv(rows: Row[], fileLabel: string) {
  const header = ["#", "Date", "IGN", "UID", "College", "Task", "Task Description", "Submission Links"];

  const body = rows.map((r, i) => [
    String(i + 1).padStart(2, "0"),
    // Same format as the page: "24 Oct 2026" + "11:44 pm"
    r.date ? `${formatDate(r.date)} ${formatTime(r.date)}` : r.rawDate || "No date",
    r.ign,
    r.uid,
    r.collegeName,
    r.taskName,
    r.taskDescription, // line breaks stay inside the quoted cell
    r.links.length === 0 ? "NO LINKS" : r.links.map((l) => l.url).join(" | "),
  ]);

  const csv = [header, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n");

  // "\uFEFF" (BOM) makes Excel read the file as UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileLabel.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Loads every task in scope (one request per task) and keeps only the selected date range.
// With no date range selected, all of each task's submissions are kept.
async function fetchTaskData(season: SeasonValue, taskValue: string, dateRange: DateRange): Promise<TaskData[]> {
  const seasonNumbers: SeasonNumber[] = [1, 2, 3];
  const scopeTasks = seasonNumbers
    .filter((s) => season === "all" || s === season)
    .flatMap((s) =>
      TASKS_BY_SEASON[s]
        .filter((t) => season === "all" || taskValue === ALL_TASKS || t.value === taskValue)
        .map((t) => ({ season: s, label: t.label, value: t.value }))
    );

  return Promise.all(
    scopeTasks.map(async (t) => {
      try {
        const { data } = await axios.get<SubmissionDetailsResponse>(API_URL, {
          params: { taskId: t.value },
        });
        if (!data?.success) return { ...t, ok: false, rows: [] as Row[] };
        const taskRows = buildRows(data.ambassadors ?? [], data.submissions ?? []);
        return { ...t, ok: true, rows: filterByDateRange(taskRows, dateRange) };
      } catch {
        return { ...t, ok: false, rows: [] as Row[] };
      }
    })
  );
}

// "…/spreadsheets/d/<id>/edit?gid=123#gid=123" → { spreadsheetId, gid }
function parseSheetLink(url: string | undefined): { spreadsheetId: string | null; gid: number | null } {
  if (!url) return { spreadsheetId: null, gid: null };
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
  const gid = url.match(/[?#&]gid=(\d+)/)?.[1];
  return { spreadsheetId: id, gid: gid ? Number(gid) : null };
}

// Decides which tabs the DOC button updates (and links in the report):
// - All Seasons / a season with All Tasks → each season tab + every task tab in scope
// - One task that has its own tab → only that task's tab
// - One task without its own tab → its season tab (as before)
function planSheetTargets(season: SeasonValue, taskValue: string, taskData: TaskData[]): SheetTarget[] {
  const seasonNumbers: SeasonNumber[] = [1, 2, 3];
  const singleTask = season !== "all" && taskValue !== ALL_TASKS;
  const targets: SheetTarget[] = [];

  seasonNumbers.forEach((s) => {
    const seasonTasks = taskData.filter((t) => t.season === s);
    if (seasonTasks.length === 0) return;

    const taskTargets: SheetTarget[] = seasonTasks
      .filter((t) => TASK_SHEET_LINKS[t.value])
      .map((t) => ({
        kind: "task",
        season: s,
        taskId: t.value,
        sheetName: t.label,
        sheetGid: parseSheetLink(TASK_SHEET_LINKS[t.value]).gid,
        label: t.label,
        link: TASK_SHEET_LINKS[t.value],
        tasks: [t],
      }));

    if (!(singleTask && taskTargets.length > 0)) {
      targets.push({
        kind: "season",
        season: s,
        sheetName: SHEET_TAB_NAME[s],
        sheetGid: parseSheetLink(SHEET_LINKS[s]).gid,
        label: SHEET_LINK_LABEL[s],
        link: SHEET_LINKS[s],
        tasks: seasonTasks,
      });
    }
    targets.push(...taskTargets);
  });

  return targets;
}

// One block per target tab (even with 0 rows, so the tab is cleared); the Apps Script
// overwrites each tab. A tab whose task data failed to load is left out, so it is never
// overwritten with partial data.
function buildSheetPayload(
  targets: SheetTarget[],
  scopeLabel: string,
  dateRange: DateRange
): { payload: SheetSyncPayload; skippedTabs: string[] } {
  // Season 1 / Season 2 are not written to the sheet at all
  const sheetTargets = targets.filter((t) => !SEASONS_WITHOUT_SHEET_TABS.includes(t.season));
  const skippedTabs = sheetTargets.filter((t) => t.tasks.some((d) => !d.ok)).map((t) => t.sheetName);

  // Sent under "seasons" so the deployed Apps Script handles task tabs without changes
  const seasons: SheetSeasonBlock[] = sheetTargets
    .filter((target) => target.tasks.every((d) => d.ok))
    .map((target) => {
      const s = target.season;
      // Season 3 tab and its task tabs are written without a Date column
      // (the date range filter still applies to which rows are sent)
      const includeDate = !SEASONS_WITHOUT_SHEET_DATE.includes(s);
      const rows: SheetRow[] = target.tasks
        .flatMap((t) =>
          t.rows.map((r) => ({
            season: s,
            taskId: t.value,
            task: t.label,
            date: !includeDate ? "" : r.date ? `${formatDate(r.date)} ${formatTime(r.date)}` : r.rawDate || "No date",
            createdAt: r.date ? r.date.toISOString() : "",
            ign: r.ign,
            uid: r.uid,
            collegeName: r.collegeName,
            proofLinks: r.links.map((l) => l.url),
          }))
        )
        // newest first, same order as the dashboard
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return {
        kind: target.kind,
        season: s,
        taskId: target.taskId,
        sheetName: target.sheetName,
        sheetGid: target.sheetGid,
        sheetLabel: target.label,
        includeDate,
        rows,
      };
    });

  const payload: SheetSyncPayload = {
    action: "overwriteSubmissions",
    spreadsheetId: parseSheetLink(Object.values(SHEET_LINKS)[0]).spreadsheetId,
    generatedAt: new Date().toISOString(),
    scope: scopeLabel,
    dateRange: { from: dateRange.from || null, to: dateRange.to || null },
    totalRows: seasons.reduce((n, b) => n + b.rows.length, 0),
    seasons,
  };

  return { payload, skippedTabs };
}

// Posts the payload to the Apps Script web app.
// Sent as text/plain so the browser skips the CORS preflight, which Apps Script can't answer;
// the script reads it with JSON.parse(e.postData.contents).
async function syncToSheet(payload: SheetSyncPayload): Promise<SheetSyncResponse> {
  const { data } = await axios.post<SheetSyncResponse>(SHEETS_WEBAPP_URL, JSON.stringify(payload), {
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  });
  if (!data || typeof data !== "object" || !data.success) {
    throw new Error((data && typeof data === "object" && data.message) || "The sheet script did not confirm the update.");
  }
  return data;
}

// Builds a Word report written as numeric paragraphs, plus task-wise details
async function downloadDoc(
  rows: Row[],
  season: SeasonValue,
  scopeLabel: string,
  taskData: TaskData[],
  targets: SheetTarget[],
  dateRange: DateRange
) {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

  const para = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text, size: opts.size ?? 22, bold: opts.bold, color: opts.color })],
    });

  // Readable body paragraph
  const body = (text: string) =>
    new Paragraph({
      spacing: { after: 160, line: 300 },
      children: [new TextRun({ text, size: 22 })],
    });

  // Bullet point line
  const bullet = (text: string) =>
    new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 40 },
      children: [new TextRun({ text, size: 22 })],
    });

  // "Label: <link>" line pointing to a tab of the spreadsheet
  const sheetLinkPara = (label: string, link: string) =>
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }),
        new ExternalHyperlink({
          link,
          children: [new TextRun({ text: link, size: 22, color: "0563C1", underline: {} })],
        }),
      ],
    });

  // "Label: value" line with a bold label
  const field = (label: string, value: string) =>
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }),
        new TextRun({ text: value, size: 22 }),
      ],
    });

  /* ---------- numbers ---------- */
  const totalSubmissions = rows.length;
  const uniqueAmbassadors = new Set(rows.map((r) => `${r.ign}|${r.uid}`)).size;
  const uniqueColleges = new Set(rows.map((r) => r.collegeName).filter((c) => c !== "N/A")).size;

  /* ---------- paragraphs ---------- */
  const overview = `This report summarises the proof submissions received in the BGMI Campus MVP Program, the BGMI Campus Ambassador Program, for ${scopeLabel}. In total, ${plural(
    totalSubmissions,
    "submission"
  )} ${totalSubmissions === 1 ? "was" : "were"} made by ${plural(uniqueAmbassadors, "campus ambassador")} representing ${plural(
    uniqueColleges,
    "college"
  )}.`;

  const sections: (Paragraph | Table)[] = [
    para("OVERVIEW", { bold: true, size: 24 }),
    body(overview),
  ];

  /* ---------- per-task data (fetched once by the caller, shared with the sheet sync) ---------- */
  const seasonNumbers: SeasonNumber[] = [1, 2, 3];

  // Extra details only for All Seasons (all tasks): month-wise submissions based on createdAt
  if (season === "all") {
    const monthMap = new Map<number, { label: string; count: number }>();
    let undated = 0;
    let first: Date | null = null;
    let last: Date | null = null;

    rows.forEach((r) => {
      if (!r.date) {
        undated++;
        return;
      }
      const key = r.date.getFullYear() * 12 + r.date.getMonth();
      const entry = monthMap.get(key);
      if (entry) entry.count++;
      else
        monthMap.set(key, {
          label: r.date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
          count: 1,
        });
      if (!first || r.date < first) first = r.date;
      if (!last || r.date > last) last = r.date;
    });

    // Only months that actually received submissions, oldest to newest
    const months = [...monthMap.entries()].sort((a, b) => a[0] - b[0]).map(([, m]) => m);

    if (months.length > 0) {
      const peak = months.reduce((best, m) => (m.count > best.count ? m : best), months[0]);
      const datedTotal = months.reduce((n, m) => n + m.count, 0);
      const average = Math.round((datedTotal / months.length) * 10) / 10;

      const monthText = months.map((m) => `${m.label} (${plural(m.count, "submission")})`).join(", ");

      sections.push(
        para("MONTH-WISE SUBMISSIONS", { bold: true, size: 24 }),
        body(
          `Across all seasons and all tasks of the BGMI Campus MVP Program, submissions were received in ${plural(
            months.length,
            "month"
          )}. Month by month, the campus ambassadors submitted: ${monthText}.`
        ),
        body(
          `The busiest month was ${peak.label} with ${plural(peak.count, "submission")}, and the program averaged ${average} submissions per active month. The first submission was received on ${formatDate(
            first as unknown as Date
          )} and the most recent one on ${formatDate(last as unknown as Date)}.${
            undated > 0 ? ` ${plural(undated, "submission")} had no valid date and ${undated === 1 ? "is" : "are"} not counted in the monthly figures.` : ""
          }`
        )
      );
    }
  }

  /* ---------- task-wise details: bullets + IGN / UID / College / Links ---------- */
  sections.push(para("TASK-WISE DETAILS", { bold: true, size: 24 }));
  seasonNumbers.forEach((s) => {
    const seasonTasks = taskData.filter((t) => t.season === s);
    if (seasonTasks.length === 0) return;

    seasonTasks.forEach((t) => {
      sections.push(para(t.label, { bold: true, size: 23 }));

      // Task description, each "\n" as a new line
      const description = TASK_DESCRIPTIONS[t.value];
      if (description) {
        sections.push(
          new Paragraph({
            spacing: { after: 100, line: 300 },
            children: [
              new TextRun({ text: "Description: ", bold: true, size: 22 }),
              ...description
                .split("\n")
                .map((line, i) => new TextRun({ text: line, size: 22, break: i > 0 ? 1 : undefined })),
            ],
          })
        );
      }

      if (!t.ok) {
        sections.push(body("Data could not be loaded for this task."));
        return;
      }

      const taskLinkCount = t.rows.reduce((n, r) => n + r.links.length, 0);
      sections.push(
        bullet(`Number of submissions: ${t.rows.length}`),
        bullet(`Number of links: ${taskLinkCount}`)
      );

      // This task's own tab, when it is updated
      const taskTarget = targets.find((x) => x.kind === "task" && x.taskId === t.value);
      if (taskTarget?.link) sections.push(sheetLinkPara("Submission Details", taskTarget.link));

      sections.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    });

    // The season tab, when it is updated
    const seasonTarget = targets.find((x) => x.kind === "season" && x.season === s);
    if (seasonTarget?.link) sections.push(sheetLinkPara(seasonTarget.label, seasonTarget.link));
  });

  const now = new Date();

  /* ---------- date range shown at the top ---------- */
  // "2026-11-01" → "1 Nov 2026" (read as a local date)
  const rangeDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const dateRangeLines: Paragraph[] = [];
  if (dateRange.from || dateRange.to) {
    // A date range was selected on the dashboard
    const text =
      dateRange.from && dateRange.to
        ? `${rangeDate(dateRange.from)} - ${rangeDate(dateRange.to)}`
        : dateRange.from
        ? `From ${rangeDate(dateRange.from)}`
        : `Up to ${rangeDate(dateRange.to)}`;
    dateRangeLines.push(field("Date Range", text));
  } else if (season === "all") {
    // No range selected: every season's dates
    dateRangeLines.push(
      field("Date Range", ""),
      ...seasonNumbers.map((s) => bullet(`Season ${s}: ${SEASON_DATE_RANGES[s]}`))
    );
  } else {
    // No range selected: the selected season's dates
    dateRangeLines.push(field("Date Range", SEASON_DATE_RANGES[season]));
  }

  const doc = new Document({
    creator: "BGMI Campus MVP",
    title: `${scopeLabel} - Submission Report`,
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: "BGMI Campus MVP", bold: true, size: 44, color: "F5A623" })],
          }),
          para("Submission Report", { size: 28, bold: true }),
          field("Season", season === "all" ? "All Seasons" : String(season)),
          field("Task", scopeLabel),
          ...dateRangeLines,
          field("Generated", `${formatDate(now)} ${formatTime(now)}`),
          new Paragraph({ spacing: { after: 120 }, children: [] }),
          ...sections,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${scopeLabel.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")}_Report.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  const [dateRange, setDateRange] = useState<DateRange>(NO_DATE_RANGE);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<FetchResult | null>(null);

  const taskOptions = getTaskOptions(season);
  const selectedTask = taskOptions.find((t) => t.value === task) ?? taskOptions[0];

  // Name used for the CSV / Word report (keeps "All Tasks" files distinguishable)
  const scopeLabel =
    season === "all"
      ? "All Tasks - All Seasons"
      : task === ALL_TASKS
      ? `All Tasks - Season ${season}`
      : selectedTask.label;

  // Every season/task change (or retry) is a new request
  const requestKey = `${season}|${task}|${reloadKey}`;
  const loading = result?.key !== requestKey;
  const rows = useMemo(() => (loading || !result ? [] : result.rows), [loading, result]);
  const error = loading ? null : result.error;

  const handleSeasonChange = (next: SeasonValue) => {
    setSeason(next);
    setTask(next === "all" ? ALL_TASKS : TASKS_BY_SEASON[next][0].value);
    setQuery("");
  };

  /* ---------- API CALL ---------- */
  useEffect(() => {
    const controller = new AbortController();
    const key = `${season}|${task}|${reloadKey}`;

    // All Seasons → scope=all seasons
    // All Tasks (one season) → every taskId of that season
    // Otherwise → the single selected taskId
    const params = new URLSearchParams();
    if (season === "all") {
      params.append("scope", "all seasons");
    } else {
      const taskIds = task === ALL_TASKS ? TASKS_BY_SEASON[season].map((t) => t.value) : [task];
      taskIds.forEach((id) => params.append("taskId", id));
    }

    axios
      .get<SubmissionDetailsResponse>(API_URL, {
        params,
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

  const hasDateRange = Boolean(dateRange.from || dateRange.to);
  const rangedRows = useMemo(() => filterByDateRange(rows, dateRange), [rows, dateRange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rangedRows;
    return rangedRows.filter((r) =>
      [r.ign, r.uid, r.date ? `${formatDate(r.date)} ${formatTime(r.date)}` : r.rawDate].some((f) =>
        f.toLowerCase().includes(q)
      )
    );
  }, [rangedRows, query]);

  const uniqueAmbassadors = new Set(rangedRows.map((r) => `${r.ign}|${r.uid}`)).size;
  const totalLinks = rangedRows.reduce((n, r) => n + r.links.length, 0);

  /* ---------- DOC download + Google Sheet append ---------- */
  const [exportStatus, setExportStatus] = useState<ExportStatus>({ state: "idle" });
  const exporting = exportStatus.state === "working";

  const handleDownloadDoc = async () => {
    setExportStatus({ state: "working", message: "Building the Word report..." });

    // 1. Load every task in scope for the selected date range (all data if no range)
    let taskData: TaskData[];
    let targets: SheetTarget[];
    try {
      taskData = await fetchTaskData(season, task, dateRange);
      targets = planSheetTargets(season, task, taskData);
      await downloadDoc(filtered, season, scopeLabel, taskData, targets, dateRange);
    } catch {
      setExportStatus({ state: "error", message: "Could not build the Word report. Please try again." });
      return;
    }

    // 2. Overwrite each season's tab in the Google Sheet with the same submissions
    if (!SHEETS_WEBAPP_URL) {
      setExportStatus({
        state: "warn",
        message: "Report downloaded. Sheet not updated: VITE_SHEETS_WEBAPP_URL is not set.",
      });
      return;
    }

    const { payload, skippedTabs } = buildSheetPayload(targets, scopeLabel, dateRange);
    const rangeText = hasDateRange
      ? `from ${dateRange.from || "the start"} to ${dateRange.to || "today"}`
      : "for all dates";
    const skippedNote =
      skippedTabs.length > 0
        ? ` ${skippedTabs.join(", ")} not updated because some task data could not be loaded.`
        : "";

    // Season 1 / Season 2 only: nothing goes to the sheet, the report is all
    if (payload.seasons.length === 0 && skippedTabs.length === 0) {
      setExportStatus({ state: "done", message: "Report downloaded." });
      return;
    }

    if (payload.seasons.length === 0) {
      setExportStatus({
        state: "error",
        message: `Report downloaded, but no sheet was updated.${skippedNote}`,
      });
      return;
    }

    const tabNames = payload.seasons.map((b) => b.sheetName).join(", ");
    setExportStatus({
      state: "working",
      message: `Report downloaded. Overwriting ${tabNames} in the Google Sheet ${rangeText}...`,
    });

    try {
      await syncToSheet(payload);
      const summary = payload.seasons
        .map((b) => `${b.sheetName}: ${b.rows.length} submission${b.rows.length === 1 ? "" : "s"}`)
        .join(", ");
      setExportStatus({
        state: skippedTabs.length > 0 ? "warn" : "done",
        message: `Report downloaded and Google Sheet overwritten ${rangeText} (${summary}).${skippedNote}`,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      setExportStatus({
        state: "error",
        message: `Report downloaded, but the Google Sheet was not updated: ${reason}`,
      });
    }
  };

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
              SEASON <span className="text-amber-400">{season === "all" ? "ALL" : season}</span>
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

          {/* Date range (optional) */}
          <div className="md:col-span-2">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] text-amber-400/80">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              03 <span className="text-zinc-500">//</span> <span className="text-zinc-300">Select Date Range</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Start Date
                <input
                  type="date"
                  value={dateRange.from}
                  max={dateRange.to || undefined}
                  onChange={(e) => {
                    const from = e.target.value;
                    setDateRange((r) => ({ ...r, from }));
                  }}
                  className="w-full border border-amber-500/40 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold text-zinc-100 [color-scheme:dark] focus:border-amber-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
                End Date
                <input
                  type="date"
                  value={dateRange.to}
                  min={dateRange.from || undefined}
                  onChange={(e) => {
                    const to = e.target.value;
                    setDateRange((r) => ({ ...r, to }));
                  }}
                  className="w-full border border-amber-500/40 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold text-zinc-100 [color-scheme:dark] focus:border-amber-400 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setDateRange(NO_DATE_RANGE)}
                disabled={!hasDateRange}
                className="h-[42px] shrink-0 border border-zinc-700 px-4 text-xs font-bold tracking-[0.2em] text-amber-400 transition-all hover:border-amber-400 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                CLEAR
              </button>
            </div>
          </div>
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
          <StatCard label="SUBMISSIONS" value={loading ? "--" : rangedRows.length} icon="📦" delay={0} />
          <StatCard label="AMBASSADORS" value={loading ? "--" : uniqueAmbassadors} icon="🪖" delay={90} />
          <StatCard label="LINKS" value={loading ? "--" : totalLinks} icon="🔗" delay={180} />
          <StatCard label="SEASON" value={season === "all" ? "ALL" : `0${season}`} icon="🏆" delay={270} />
        </section>

        {/* ===== Table ===== */}
        <section className={`overflow-hidden border border-zinc-800 bg-zinc-950/80 backdrop-blur-md ${CUT_CORNERS}`}>
          <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-3 font-['Orbitron',sans-serif] text-sm font-bold uppercase tracking-[0.25em] text-zinc-200">
              <span className="h-3 w-3 rotate-45 bg-amber-400 shadow-[0_0_10px_#f5a623]" />
              Squad Submissions
              {!loading && (
                <span className="font-['Rajdhani',sans-serif] text-xs tracking-widest text-zinc-500">
                  ({filtered.length}/{rangedRows.length})
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

              <button
                type="button"
                title="Download Word report and add the submissions to the Google Sheet"
                onClick={handleDownloadDoc}
                disabled={loading || !!error || filtered.length === 0 || exporting}
                className="flex h-9 shrink-0 items-center gap-2 border border-zinc-700 px-3 text-xs font-bold tracking-[0.2em] text-amber-400 transition-all hover:border-amber-400 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span aria-hidden className={exporting ? "animate-spin" : ""}>
                  {exporting ? "⟳" : "⬇"}
                </span>
                DOC
              </button>

              <button
                type="button"
                title="Download CSV"
                onClick={() => downloadCsv(filtered, scopeLabel)}
                disabled={loading || !!error || filtered.length === 0}
                className="flex h-9 shrink-0 items-center gap-2 border border-zinc-700 px-3 text-xs font-bold tracking-[0.2em] text-amber-400 transition-all hover:border-amber-400 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span aria-hidden>⬇</span> CSV
              </button>
            </div>
          </div>

          {/* Report / sheet sync status */}
          {exportStatus.state !== "idle" && (
            <div
              role="status"
              className={`flex items-start justify-between gap-4 border-b px-5 py-3 text-sm font-semibold ${
                exportStatus.state === "working"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  : exportStatus.state === "done"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : exportStatus.state === "warn"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                  : "border-red-500/30 bg-red-500/10 text-red-200"
              }`}
            >
              <span className="flex items-center gap-2">
                {exportStatus.state === "working" && <span className="animate-spin">⟳</span>}
                {exportStatus.state === "done" && <span>✔</span>}
                {exportStatus.state === "warn" && <span>⚠</span>}
                {exportStatus.state === "error" && <span>✖</span>}
                {exportStatus.message}
              </span>
              {!exporting && (
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setExportStatus({ state: "idle" })}
                  className="shrink-0 text-xs font-bold tracking-widest opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
          )}

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
                        {query
                          ? `No submissions match "${query}".`
                          : hasDateRange && rows.length > 0
                          ? "No submissions in the selected date range."
                          : "No submissions for this task yet."}
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
