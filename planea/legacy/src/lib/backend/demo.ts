/**
 * Backend DEMO: todo vive en el navegador (localStorage).
 * Permite probar el producto completo sin servidor: registro, planes,
 * votos, salseo, denuncias y moderación. NO es seguro para producción:
 * en producción se usa backend/supabase.ts con RLS.
 */
import { XP, type XpReason } from "../gamification";
import { checkContent } from "../moderation";
import { nightKey } from "../time";
import type { Plan, Post, Profile, Reply, Report, Result, Review, TargetRef, UserStats } from "../types";
import { uid } from "../utils";
import type { ActivityMeta, AttendanceKind, Backend, MyState, PlanInput, PostInput, ProfilePatch, ReportInput } from "./types";
import { resizeImage } from "./image";

const KEY = "planea.demo.v1";
export const DEMO_MOD_EMAIL = "demo@planea.app";
export const DEMO_MOD_PASSWORD = "planea123";

interface DemoUser {
  id: string;
  email: string;
  passwordHash: string;
  profile: Profile;
}

interface Activity {
  type: TargetRef["type"];
  id: string;
  kind: AttendanceKind;
  night: string;
  at: string;
  meta: ActivityMeta;
}

interface UserData {
  attendances: Activity[];
  votes: { type: TargetRef["type"]; id: string; value: 1 | -1; night: string }[];
  pollVotes: Record<string, string>;
  blocked: string[];
  hidden: string[];
  xpRefs: string[];
}

interface StoredPost extends Post {
  ownerId: string;
}
interface StoredReply extends Reply {
  ownerId: string;
}

interface DemoDB {
  users: DemoUser[];
  sessionUserId: string | null;
  data: Record<string, UserData>;
  plans: (Plan & { ownerId: string })[];
  posts: StoredPost[];
  replies: StoredReply[];
  reviews: Review[];
  removed: string[];
  reports: Report[];
  reportStatus: Record<string, Report["status"]>;
}

const emptyDB = (): DemoDB => ({
  users: [],
  sessionUserId: null,
  data: {},
  plans: [],
  posts: [],
  replies: [],
  reviews: [],
  removed: [],
  reports: [],
  reportStatus: {},
});

const emptyUserData = (): UserData => ({ attendances: [], votes: [], pollVotes: {}, blocked: [], hidden: [], xpRefs: [] });

const listeners = new Set<() => void>();

function read(): DemoDB {
  if (typeof window === "undefined") return emptyDB();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...emptyDB(), ...(JSON.parse(raw) as DemoDB) } : emptyDB();
  } catch {
    return emptyDB();
  }
}

function write(db: DemoDB): Result {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "El almacenamiento del navegador está lleno. Prueba sin imagen." };
  }
}

async function hashPassword(email: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`planea-demo:${email.toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const AVATARS = ["🦊", "🐙", "🌙", "🪩", "🌶️", "🦋", "🎧", "🍋", "🐢", "🛹"];
const COLORS = ["#C8FF3D", "#FF5C8A", "#5CE1E6", "#FFB547", "#A78BFA"];

function makeProfile(id: string, email: string, displayName: string, citySlug: string | null, role: Profile["role"] = "user"): Profile {
  const n = id.charCodeAt(0) + id.charCodeAt(1);
  return {
    id,
    username: email.split("@")[0]!.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "usuario",
    displayName,
    avatarEmoji: AVATARS[n % AVATARS.length]!,
    avatarColor: COLORS[n % COLORS.length]!,
    age: null,
    citySlug,
    xp: 0,
    role,
    createdAt: new Date().toISOString(),
  };
}

async function ensureSeedModerator(db: DemoDB) {
  if (db.users.some((u) => u.email === DEMO_MOD_EMAIL)) return;
  const id = "demo-moderator";
  db.users.push({
    id,
    email: DEMO_MOD_EMAIL,
    passwordHash: await hashPassword(DEMO_MOD_EMAIL, DEMO_MOD_PASSWORD),
    profile: { ...makeProfile(id, DEMO_MOD_EMAIL, "Equipo PLANEA", "cordoba", "moderator"), avatarEmoji: "🛡️", username: "equipo" },
  });
}

function current(db: DemoDB): DemoUser | null {
  return db.users.find((u) => u.id === db.sessionUserId) ?? null;
}

function userData(db: DemoDB, userId: string): UserData {
  db.data[userId] ??= emptyUserData();
  return db.data[userId]!;
}

function emit() {
  listeners.forEach((l) => l());
}

function award(db: DemoDB, user: DemoUser, reason: XpReason, ref: string) {
  const d = userData(db, user.id);
  const k = `${reason}:${ref}`;
  if (d.xpRefs.includes(k)) return;
  d.xpRefs.push(k);
  user.profile.xp += XP[reason];
}

const NEED_AUTH: Result<never> = { ok: false, error: "Inicia sesión para continuar." };

function withUser<T>(fn: (db: DemoDB, user: DemoUser) => Result<T> | Promise<Result<T>>): Promise<Result<T>> {
  return (async () => {
    const db = read();
    const user = current(db);
    if (!user) return NEED_AUTH;
    const res = await fn(db, user);
    if (!res.ok) return res;
    const saved = write(db);
    if (!saved.ok) return saved;
    return res;
  })();
}

function publicPost(p: StoredPost, viewer?: string | null): Post {
  const { ownerId: _ownerId, ...rest } = p;
  return { ...rest, authorId: p.isAnonymous ? null : p.ownerId, isMine: Boolean(viewer && viewer === p.ownerId) };
}

function publicReply(r: StoredReply, viewer?: string | null): Reply {
  const { ownerId: _ownerId, ...rest } = r;
  return { ...rest, authorId: r.isAnonymous ? null : r.ownerId, isMine: Boolean(viewer && viewer === r.ownerId) };
}

export function createDemoBackend(): Backend {
  return {
    mode: "demo",
    countsIncludeSelf: false,

    async getProfile() {
      const db = read();
      if (!db.users.some((u) => u.email === DEMO_MOD_EMAIL)) {
        await ensureSeedModerator(db);
        write(db);
      }
      return current(db)?.profile ?? null;
    },

    onAuthChange(cb) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => e.key === KEY && cb();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },

    async signUp({ email, password, displayName, citySlug }) {
      const db = read();
      await ensureSeedModerator(db);
      const e = email.trim().toLowerCase();
      if (db.users.some((u) => u.email === e)) return { ok: false, error: "Ya existe una cuenta con ese email." };
      const id = uid();
      db.users.push({ id, email: e, passwordHash: await hashPassword(e, password), profile: makeProfile(id, e, displayName.trim(), citySlug) });
      db.sessionUserId = id;
      const saved = write(db);
      if (!saved.ok) return saved;
      emit();
      return { ok: true, data: { needsConfirmation: false } };
    },

    async signIn({ email, password }) {
      const db = read();
      await ensureSeedModerator(db);
      const e = email.trim().toLowerCase();
      const user = db.users.find((u) => u.email === e);
      if (!user || user.passwordHash !== (await hashPassword(e, password))) return { ok: false, error: "Email o contraseña incorrectos." };
      db.sessionUserId = user.id;
      write(db);
      emit();
      return { ok: true, data: undefined };
    },

    async signInWithGoogle() {
      return { ok: false, error: "Google se activa al conectar Supabase. En la demo usa email y contraseña." };
    },

    async signOut() {
      const db = read();
      db.sessionUserId = null;
      write(db);
      emit();
    },

    updateProfile(patch: ProfilePatch) {
      return withUser((_db, user) => {
        if (patch.displayName !== undefined) {
          const name = patch.displayName.trim();
          if (name.length < 2 || name.length > 40) return { ok: false, error: "El nombre debe tener entre 2 y 40 caracteres." };
          const mod = checkContent(name);
          if (!mod.ok) return { ok: false, error: mod.reason! };
        }
        user.profile = { ...user.profile, ...patch };
        return { ok: true, data: user.profile };
      }).then((r) => {
        if (r.ok) emit();
        return r;
      });
    },

    async loadMyState(): Promise<MyState> {
      const db = read();
      const user = current(db);
      if (!user) return { attending: {}, votes: {}, pollVotes: {}, blocked: [], hidden: [] };
      const d = userData(db, user.id);
      const night = nightKey(new Date());
      const attending: MyState["attending"] = {};
      for (const a of d.attendances) {
        const fresh = a.type === "plan" || a.night === night;
        const here = a.kind === "here" ? Date.now() - new Date(a.at).getTime() < 4 * 3_600_000 : true;
        if (fresh && here) attending[`${a.type}:${a.id}:${a.kind}`] = true;
      }
      const votes: MyState["votes"] = {};
      for (const v of d.votes) if (v.night === night) votes[`${v.type}:${v.id}`] = v.value;
      return { attending, votes, pollVotes: { ...d.pollVotes }, blocked: [...d.blocked], hidden: [...d.hidden] };
    },

    setAttendance(t, kind, on, meta) {
      return withUser((db, user) => {
        const d = userData(db, user.id);
        const night = nightKey(new Date());
        const same = (a: Activity) => a.type === t.type && a.id === t.id && a.kind === kind && (t.type === "plan" || a.night === night);
        d.attendances = d.attendances.filter((a) => !same(a));
        if (on) {
          d.attendances.push({ type: t.type, id: t.id, kind, night, at: new Date().toISOString(), meta });
          if (kind === "here") award(db, user, "discover", t.id);
          else award(db, user, "attend", `${t.id}:${night}`);
        }
        return { ok: true, data: undefined };
      });
    },

    vote(t, value) {
      return withUser((db, user) => {
        const d = userData(db, user.id);
        const night = nightKey(new Date());
        d.votes = d.votes.filter((v) => !(v.type === t.type && v.id === t.id && v.night === night));
        if (value !== 0) {
          d.votes.push({ type: t.type, id: t.id, value, night });
          award(db, user, "vote", `${t.id}:${night}`);
        }
        return { ok: true, data: undefined };
      });
    },

    trackView() {
      /* En la demo las visitas forman parte de los datos de ejemplo. */
    },

    async listPlans(citySlug, initial) {
      const db = read();
      const since = Date.now() - 4 * 3_600_000;
      const blocked = new Set(current(db) ? userData(db, current(db)!.id).blocked : []);
      const hidden = new Set(current(db) ? userData(db, current(db)!.id).hidden : []);
      const removed = new Set(db.removed);
      const local = db.plans.filter((p) => p.citySlug === citySlug && p.visibility === "public" && new Date(p.startsAt).getTime() > since);
      return [...initial, ...local]
        .filter((p) => !removed.has(p.id) && !hidden.has(p.id) && !(p.creatorId && blocked.has(p.creatorId)))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    },

    async getPlan(id) {
      const db = read();
      if (db.removed.includes(id)) return null;
      return db.plans.find((p) => p.id === id) ?? null;
    },

    createPlan(i: PlanInput) {
      return withUser(async (db, user) => {
        const mod = checkContent(`${i.title} ${i.placeName} ${i.description}`);
        if (!mod.ok) return { ok: false, error: mod.reason! };
        let imageUrl: string | null = null;
        if (i.image) {
          try {
            imageUrl = await resizeImage(i.image, 900, 0.72);
          } catch {
            return { ok: false, error: "No hemos podido procesar la imagen." };
          }
        }
        const plan: Plan & { ownerId: string } = {
          id: uid(),
          citySlug: i.citySlug,
          creatorId: user.id,
          creatorName: user.profile.displayName,
          title: i.title.trim(),
          placeName: i.placeName.trim(),
          venueId: i.venueId,
          category: i.category,
          description: i.description.trim(),
          startsAt: i.startsAt,
          visibility: i.visibility,
          imageUrl,
          baseAttendees: 0,
          createdAt: new Date().toISOString(),
          isDemo: false,
          ownerId: user.id,
        };
        db.plans.push(plan);
        const d = userData(db, user.id);
        d.attendances.push({
          type: "plan",
          id: plan.id,
          kind: "interested",
          night: nightKey(new Date()),
          at: new Date().toISOString(),
          meta: { category: plan.category, citySlug: plan.citySlug, startsAt: plan.startsAt },
        });
        award(db, user, "createPlan", plan.id);
        return { ok: true, data: plan };
      });
    },

    deletePlan(id) {
      return withUser((db, user) => {
        const plan = db.plans.find((p) => p.id === id);
        if (!plan || plan.ownerId !== user.id) return { ok: false, error: "Solo puedes borrar tus propios planes." };
        db.plans = db.plans.filter((p) => p.id !== id);
        return { ok: true, data: undefined };
      });
    },

    async myPlans() {
      const db = read();
      const user = current(db);
      if (!user) return [];
      return db.plans.filter((p) => p.ownerId === user.id).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    },

    async listPosts(t, initial) {
      const db = read();
      const user = current(db);
      const d = user ? userData(db, user.id) : emptyUserData();
      const removed = new Set(db.removed);
      const hidden = new Set(d.hidden);
      const blocked = new Set(d.blocked);
      const local = db.posts.filter((p) => p.targetType === t.type && p.targetId === t.id);
      const blockedLocal = new Set(local.filter((p) => blocked.has(p.ownerId)).map((p) => p.id));
      const localReplies = db.replies.filter((r) => !removed.has(r.id));
      return [...local.map((p) => publicPost(p, user?.id)), ...initial]
        .filter((p) => !removed.has(p.id) && !hidden.has(p.id) && !blockedLocal.has(p.id))
        .map((p) => ({
          ...p,
          replyCount: p.replyCount + localReplies.filter((r) => r.postId === p.id).length,
          options: p.options.map((o) => ({ ...o, votes: o.votes + (d.pollVotes[p.id] === o.id && !local.some((l) => l.id === p.id) ? 1 : 0) })),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    createPost(i: PostInput) {
      return withUser((db, user) => {
        const mod = checkContent([i.body, ...i.options].join(" "));
        if (!mod.ok) return { ok: false, error: mod.reason! };
        const anonymous = i.kind === "confession" ? true : i.anonymous;
        const post: StoredPost = {
          id: uid(),
          targetType: i.target.type,
          targetId: i.target.id,
          authorId: null,
          authorName: anonymous ? "Anónimo" : user.profile.displayName,
          authorEmoji: anonymous ? "🎭" : user.profile.avatarEmoji,
          isAnonymous: anonymous,
          kind: i.kind,
          body: i.body.trim(),
          options: i.kind === "poll" ? i.options.map((label) => ({ id: uid(), label: label.trim(), votes: 0 })) : [],
          replyCount: 0,
          createdAt: new Date().toISOString(),
          isDemo: false,
          ownerId: user.id,
        };
        db.posts.push(post);
        award(db, user, "post", post.id);
        return { ok: true, data: publicPost(post, user.id) };
      });
    },

    deletePost(id) {
      return withUser((db, user) => {
        const post = db.posts.find((p) => p.id === id);
        if (!post || post.ownerId !== user.id) return { ok: false, error: "Solo puedes borrar tus publicaciones." };
        db.posts = db.posts.filter((p) => p.id !== id);
        return { ok: true, data: undefined };
      });
    },

    votePoll(postId, optionId) {
      return withUser((db, user) => {
        const d = userData(db, user.id);
        if (d.pollVotes[postId]) return { ok: false, error: "Ya has votado en esta encuesta." };
        d.pollVotes[postId] = optionId;
        const local = db.posts.find((p) => p.id === postId);
        const opt = local?.options.find((o) => o.id === optionId);
        if (opt) opt.votes += 1;
        award(db, user, "pollVote", postId);
        return { ok: true, data: undefined };
      });
    },

    async listReplies(postId, initial) {
      const db = read();
      const user = current(db);
      const d = user ? userData(db, user.id) : emptyUserData();
      const removed = new Set(db.removed);
      const hidden = new Set(d.hidden);
      const blocked = new Set(d.blocked);
      const local = db.replies.filter((r) => r.postId === postId && !blocked.has(r.ownerId)).map((r) => publicReply(r, user?.id));
      return [...initial, ...local].filter((r) => !removed.has(r.id) && !hidden.has(r.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    createReply(postId, body, anonymous) {
      return withUser((db, user) => {
        const mod = checkContent(body);
        if (!mod.ok) return { ok: false, error: mod.reason! };
        const reply: StoredReply = {
          id: uid(),
          postId,
          authorId: null,
          authorName: anonymous ? "Anónimo" : user.profile.displayName,
          authorEmoji: anonymous ? "🎭" : user.profile.avatarEmoji,
          isAnonymous: anonymous,
          body: body.trim(),
          createdAt: new Date().toISOString(),
          ownerId: user.id,
        };
        db.replies.push(reply);
        award(db, user, "reply", postId);
        return { ok: true, data: publicReply(reply, user.id) };
      });
    },

    deleteReply(id) {
      return withUser((db, user) => {
        const r = db.replies.find((x) => x.id === id);
        if (!r || r.ownerId !== user.id) return { ok: false, error: "Solo puedes borrar tus respuestas." };
        db.replies = db.replies.filter((x) => x.id !== id);
        return { ok: true, data: undefined };
      });
    },

    async listReviews(venueId, initial) {
      const db = read();
      const user = current(db);
      const d = user ? userData(db, user.id) : emptyUserData();
      const removed = new Set(db.removed);
      const hidden = new Set(d.hidden);
      return [...db.reviews.filter((r) => r.venueId === venueId), ...initial]
        .filter((r) => !removed.has(r.id) && !hidden.has(r.id) && !(r.authorId && d.blocked.includes(r.authorId)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    createReview(venueId, rating, body) {
      return withUser((db, user) => {
        if (rating < 1 || rating > 5) return { ok: false, error: "Elige de 1 a 5 estrellas." };
        if (body.trim()) {
          const mod = checkContent(body);
          if (!mod.ok) return { ok: false, error: mod.reason! };
        }
        db.reviews = db.reviews.filter((r) => !(r.venueId === venueId && r.authorId === user.id));
        const review: Review = {
          id: uid(),
          venueId,
          authorId: user.id,
          authorName: user.profile.displayName,
          authorEmoji: user.profile.avatarEmoji,
          rating,
          body: body.trim(),
          createdAt: new Date().toISOString(),
        };
        db.reviews.push(review);
        award(db, user, "review", venueId);
        return { ok: true, data: review };
      });
    },

    report(i: ReportInput) {
      return withUser((db, user) => {
        if (db.reports.some((r) => r.reporterId === user.id && r.targetId === i.targetId))
          return { ok: false, error: "Ya habías denunciado este contenido. Lo estamos revisando." };
        db.reports.push({
          id: uid(),
          reporterId: user.id,
          targetType: i.targetType,
          targetId: i.targetId,
          reason: i.reason,
          details: i.details.trim().slice(0, 500),
          status: "open",
          createdAt: new Date().toISOString(),
          preview: i.preview.slice(0, 280),
        });
        const d = userData(db, user.id);
        if (!d.hidden.includes(i.targetId)) d.hidden.push(i.targetId);
        return { ok: true, data: undefined };
      });
    },

    blockAuthor({ userId, postId }) {
      return withUser((db, user) => {
        const target = userId ?? db.posts.find((p) => p.id === postId)?.ownerId ?? null;
        const d = userData(db, user.id);
        if (!target) {
          // Contenido demo sin autor real: se oculta para este usuario.
          if (postId && !d.hidden.includes(postId)) d.hidden.push(postId);
          return { ok: true, data: undefined };
        }
        if (target === user.id) return { ok: false, error: "No puedes bloquearte a ti." };
        if (!d.blocked.includes(target)) d.blocked.push(target);
        return { ok: true, data: undefined };
      });
    },

    unblock(userId) {
      return withUser((db, user) => {
        const d = userData(db, user.id);
        d.blocked = d.blocked.filter((b) => b !== userId);
        return { ok: true, data: undefined };
      });
    },

    async listReports(initial) {
      const db = read();
      const user = current(db);
      if (!user || user.profile.role === "user") return { ok: false, error: "Solo el equipo de moderación puede ver esto." };
      const all = [...db.reports, ...initial].map((r) => ({ ...r, status: db.reportStatus[r.id] ?? r.status }));
      return { ok: true, data: all.filter((r) => r.status === "open" && !db.removed.includes(r.targetId)) };
    },

    moderate(report, action) {
      return withUser((db, user) => {
        if (user.profile.role === "user") return { ok: false, error: "Solo moderación." };
        db.reportStatus[report.id] = action === "remove" ? "resolved" : "dismissed";
        if (action === "remove") {
          if (!db.removed.includes(report.targetId)) db.removed.push(report.targetId);
          for (const r of [...db.reports]) if (r.targetId === report.targetId) db.reportStatus[r.id] = "resolved";
        }
        return { ok: true, data: undefined };
      });
    },

    async myStats(): Promise<UserStats> {
      const db = read();
      const user = current(db);
      const empty: UserStats = { plansCreated: 0, placesVisited: 0, votes: 0, reviews: 0, posts: 0, interested: 0, concerts: 0, copas: 0, university: 0, lateNights: 0, cities: 0 };
      if (!user) return empty;
      const d = userData(db, user.id);
      const interested = d.attendances.filter((a) => a.kind === "interested");
      const here = d.attendances.filter((a) => a.kind === "here");
      const late = (iso?: string) => {
        if (!iso) return false;
        const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
        return h >= 1 && h < 7;
      };
      const plans = db.plans.filter((p) => p.ownerId === user.id);
      return {
        plansCreated: plans.length,
        placesVisited: new Set(here.map((a) => a.id)).size,
        votes: d.votes.length + Object.keys(d.pollVotes).length,
        reviews: db.reviews.filter((r) => r.authorId === user.id).length,
        posts: db.posts.filter((p) => p.ownerId === user.id).length,
        interested: interested.length,
        concerts: interested.filter((a) => a.meta.category === "conciertos").length,
        copas: new Set(here.filter((a) => a.meta.category === "copas" || a.meta.category === "pubs").map((a) => a.id)).size,
        university: interested.filter((a) => a.meta.category === "universitario").length,
        lateNights: interested.filter((a) => late(a.meta.startsAt)).length,
        cities: new Set(d.attendances.map((a) => a.meta.citySlug)).size,
      };
    },
  };
}
