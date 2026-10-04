/**
 * Backend de producción: Supabase (Auth + Postgres con RLS + Storage).
 * Todas las escrituras pasan por las políticas de supabase/migrations.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPlan, mapPost, mapProfile, mapReply, mapReview, type Row } from "../data/mappers";
import { checkContent } from "../moderation";
import { getBrowserSupabase } from "../supabase/browser";
import { nightKey } from "../time";
import type { Plan, Report, UserStats } from "../types";
import { uid } from "../utils";
import { resizeImageBlob } from "./image";
import type { Backend, MyState } from "./types";

type PgError = { message: string; code?: string } | null;

function friendly(error: PgError): string {
  if (!error) return "Algo ha fallado. Inténtalo de nuevo.";
  if (error.code === "23505") return "Ya lo habías hecho.";
  if (error.code === "42501") return "No tienes permiso para hacer esto.";
  if (error.code === "P0001") return error.message;
  if (/invalid login credentials/i.test(error.message)) return "Email o contraseña incorrectos.";
  if (/already registered/i.test(error.message)) return "Ya existe una cuenta con ese email.";
  if (/password/i.test(error.message)) return "La contraseña debe tener al menos 8 caracteres.";
  if (/rate limit/i.test(error.message)) return "Demasiados intentos. Espera un momento.";
  return "Algo ha fallado. Inténtalo de nuevo.";
}

const ok = { ok: true as const, data: undefined };
const err = (error: PgError) => ({ ok: false as const, error: friendly(error) });

export function createSupabaseBackend(): Backend {
  const db: SupabaseClient = getBrowserSupabase();

  async function me(): Promise<string | null> {
    const { data } = await db.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async function getPlan(id: string): Promise<Plan | null> {
    const { data } = await db.from("plans_public").select("*").eq("id", id).maybeSingle();
    return data ? mapPlan(data as Row) : null;
  }

  return {
    mode: "supabase",
    countsIncludeSelf: true,

    async getProfile() {
      const id = await me();
      if (!id) return null;
      const { data } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
      return data ? mapProfile(data as Row) : null;
    },

    onAuthChange(cb) {
      const { data } = db.auth.onAuthStateChange(() => cb());
      return () => data.subscription.unsubscribe();
    },

    async signUp({ email, password, displayName, citySlug }) {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, city_slug: citySlug },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) return err(error);
      return { ok: true, data: { needsConfirmation: !data.session } };
    },

    async signIn({ email, password }) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      return error ? err(error) : ok;
    },

    async signInWithGoogle(next) {
      const { error } = await db.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      return error ? err(error) : ok;
    },

    async signOut() {
      await db.auth.signOut();
    },

    async updateProfile(patch) {
      const id = await me();
      if (!id) return { ok: false, error: "Inicia sesión." };
      if (patch.displayName !== undefined) {
        const mod = checkContent(patch.displayName);
        if (!mod.ok) return { ok: false, error: mod.reason! };
      }
      const row: Row = {};
      if (patch.displayName !== undefined) row.display_name = patch.displayName.trim();
      if (patch.avatarEmoji !== undefined) row.avatar_emoji = patch.avatarEmoji;
      if (patch.avatarColor !== undefined) row.avatar_color = patch.avatarColor;
      if (patch.age !== undefined) row.age = patch.age;
      if (patch.citySlug !== undefined) row.city_slug = patch.citySlug;
      const { data, error } = await db.from("profiles").update(row).eq("id", id).select("*").single();
      if (error) return err(error);
      return { ok: true, data: mapProfile(data as Row) };
    },

    async loadMyState(): Promise<MyState> {
      const id = await me();
      if (!id) return { attending: {}, votes: {}, pollVotes: {}, blocked: [], hidden: [] };
      const night = nightKey(new Date());
      const [att, votes, polls, blocks, reports] = await Promise.all([
        db.from("attendances").select("target_type, target_id, kind, night_key, created_at").or(`night_key.eq.${night},target_type.eq.plan`),
        db.from("votes").select("target_type, target_id, value").eq("night_key", night),
        db.from("poll_votes").select("post_id, option_id"),
        db.from("blocks").select("blocked_id"),
        db.from("reports").select("target_id"),
      ]);
      const attending: MyState["attending"] = {};
      for (const a of (att.data ?? []) as Row[]) {
        if (a.kind === "here" && Date.now() - new Date(String(a.created_at)).getTime() > 4 * 3_600_000) continue;
        attending[`${a.target_type}:${a.target_id}:${a.kind}`] = true;
      }
      const v: MyState["votes"] = {};
      for (const x of (votes.data ?? []) as Row[]) v[`${x.target_type}:${x.target_id}`] = Number(x.value) as 1 | -1;
      const pollVotes: MyState["pollVotes"] = {};
      for (const p of (polls.data ?? []) as Row[]) pollVotes[String(p.post_id)] = String(p.option_id);
      return {
        attending,
        votes: v,
        pollVotes,
        blocked: ((blocks.data ?? []) as Row[]).map((b) => String(b.blocked_id)),
        hidden: ((reports.data ?? []) as Row[]).map((r) => String(r.target_id)),
      };
    },

    async setAttendance(t, kind, on) {
      const id = await me();
      if (!id) return { ok: false, error: "Inicia sesión." };
      if (on) {
        const { error } = await db
          .from("attendances")
          .upsert(
            { user_id: id, target_type: t.type, target_id: t.id, kind, night_key: nightKey(new Date()) },
            { onConflict: "user_id,target_type,target_id,kind,night_key", ignoreDuplicates: true },
          );
        return error ? err(error) : ok;
      }
      let q = db.from("attendances").delete().eq("user_id", id).eq("target_type", t.type).eq("target_id", t.id).eq("kind", kind);
      if (t.type !== "plan") q = q.eq("night_key", nightKey(new Date()));
      const { error } = await q;
      return error ? err(error) : ok;
    },

    async vote(t, value) {
      const id = await me();
      if (!id) return { ok: false, error: "Inicia sesión." };
      const night = nightKey(new Date());
      if (value === 0) {
        const { error } = await db.from("votes").delete().eq("user_id", id).eq("target_type", t.type).eq("target_id", t.id).eq("night_key", night);
        return error ? err(error) : ok;
      }
      const { error } = await db
        .from("votes")
        .upsert({ user_id: id, target_type: t.type, target_id: t.id, value, night_key: night }, { onConflict: "user_id,target_type,target_id,night_key" });
      return error ? err(error) : ok;
    },

    trackView(t) {
      try {
        const k = `planea.view.${t.type}.${t.id}`;
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, "1");
      } catch {
        /* sin sessionStorage: contamos igualmente */
      }
      void db.rpc("track_view", { p_type: t.type, p_id: t.id });
    },

    async listPlans(citySlug) {
      const since = new Date(Date.now() - 4 * 3_600_000).toISOString();
      const { data } = await db
        .from("plans_public")
        .select("*")
        .eq("city_slug", citySlug)
        .eq("visibility", "public")
        .gt("starts_at", since)
        .order("starts_at")
        .limit(100);
      return ((data ?? []) as Row[]).map(mapPlan);
    },

    getPlan,

    async createPlan(i) {
      const userId = await me();
      if (!userId) return { ok: false, error: "Inicia sesión." };
      const mod = checkContent(`${i.title} ${i.placeName} ${i.description}`);
      if (!mod.ok) return { ok: false, error: mod.reason! };
      let imageUrl: string | null = null;
      if (i.image) {
        try {
          const blob = await resizeImageBlob(i.image, 1200, 0.8);
          const path = `${userId}/${uid()}.jpg`;
          const up = await db.storage.from("plan-images").upload(path, blob, { contentType: "image/jpeg" });
          if (up.error) return { ok: false, error: "No hemos podido subir la imagen." };
          imageUrl = db.storage.from("plan-images").getPublicUrl(path).data.publicUrl;
        } catch {
          return { ok: false, error: "No hemos podido procesar la imagen." };
        }
      }
      const { data, error } = await db
        .from("plans")
        .insert({
          city_slug: i.citySlug,
          creator_id: userId,
          title: i.title.trim(),
          place_name: i.placeName.trim(),
          venue_id: i.venueId,
          category: i.category,
          description: i.description.trim(),
          starts_at: i.startsAt,
          visibility: i.visibility,
          image_url: imageUrl,
        })
        .select("id")
        .single();
      if (error) return err(error);
      const plan = await getPlan(String((data as Row).id));
      return plan ? { ok: true, data: plan } : { ok: false, error: "Plan creado, pero no hemos podido cargarlo." };
    },

    async deletePlan(id) {
      const { error } = await db.from("plans").delete().eq("id", id);
      return error ? err(error) : ok;
    },

    async myPlans(): Promise<Plan[]> {
      const id = await me();
      if (!id) return [];
      const { data } = await db.from("plans_public").select("*").eq("creator_id", id).order("starts_at", { ascending: false }).limit(50);
      return ((data ?? []) as Row[]).map(mapPlan);
    },

    async listPosts(t) {
      const id = await me();
      const [{ data }, own] = await Promise.all([
        db.from("posts_public").select("*").eq("target_type", t.type).eq("target_id", t.id).order("created_at", { ascending: false }).limit(50),
        id ? db.from("posts").select("id").eq("author_id", id).eq("target_type", t.type).eq("target_id", t.id) : Promise.resolve({ data: [] }),
      ]);
      const mine = new Set(((own.data ?? []) as Row[]).map((r) => String(r.id)));
      return ((data ?? []) as Row[]).map((r) => ({ ...mapPost(r), isMine: mine.has(String(r.id)) }));
    },

    async createPost(i) {
      const userId = await me();
      if (!userId) return { ok: false, error: "Inicia sesión." };
      const mod = checkContent([i.body, ...i.options].join(" "));
      if (!mod.ok) return { ok: false, error: mod.reason! };
      const { data, error } = await db
        .from("posts")
        .insert({
          target_type: i.target.type,
          target_id: i.target.id,
          author_id: userId,
          is_anonymous: i.kind === "confession" ? true : i.anonymous,
          kind: i.kind,
          body: i.body.trim(),
        })
        .select("id")
        .single();
      if (error) return err(error);
      const postId = String((data as Row).id);
      if (i.kind === "poll") {
        const { error: optErr } = await db.from("poll_options").insert(i.options.map((label, position) => ({ post_id: postId, label: label.trim(), position })));
        if (optErr) {
          await db.from("posts").delete().eq("id", postId);
          return err(optErr);
        }
      }
      const { data: row } = await db.from("posts_public").select("*").eq("id", postId).single();
      return { ok: true, data: { ...mapPost(row as Row), isMine: true } };
    },

    async deletePost(id) {
      const { error } = await db.from("posts").delete().eq("id", id);
      return error ? err(error) : ok;
    },

    async votePoll(postId, optionId) {
      const userId = await me();
      if (!userId) return { ok: false, error: "Inicia sesión." };
      const { error } = await db.from("poll_votes").insert({ post_id: postId, option_id: optionId, user_id: userId });
      return error ? err(error) : ok;
    },

    async listReplies(postId) {
      const id = await me();
      const [{ data }, own] = await Promise.all([
        db.from("replies_public").select("*").eq("post_id", postId).order("created_at").limit(100),
        id ? db.from("post_replies").select("id").eq("author_id", id).eq("post_id", postId) : Promise.resolve({ data: [] }),
      ]);
      const mine = new Set(((own.data ?? []) as Row[]).map((r) => String(r.id)));
      return ((data ?? []) as Row[]).map((r) => ({ ...mapReply(r), isMine: mine.has(String(r.id)) }));
    },

    async createReply(postId, body, anonymous) {
      const userId = await me();
      if (!userId) return { ok: false, error: "Inicia sesión." };
      const mod = checkContent(body);
      if (!mod.ok) return { ok: false, error: mod.reason! };
      const { data, error } = await db
        .from("post_replies")
        .insert({ post_id: postId, author_id: userId, is_anonymous: anonymous, body: body.trim() })
        .select("id")
        .single();
      if (error) return err(error);
      const { data: row } = await db.from("replies_public").select("*").eq("id", (data as Row).id).single();
      return { ok: true, data: { ...mapReply(row as Row), isMine: true } };
    },

    async deleteReply(id) {
      const { error } = await db.from("post_replies").delete().eq("id", id);
      return error ? err(error) : ok;
    },

    async listReviews(venueId) {
      const { data } = await db.from("reviews_public").select("*").eq("venue_id", venueId).order("created_at", { ascending: false }).limit(30);
      return ((data ?? []) as Row[]).map(mapReview);
    },

    async createReview(venueId, rating, body) {
      const userId = await me();
      if (!userId) return { ok: false, error: "Inicia sesión." };
      if (body.trim()) {
        const mod = checkContent(body);
        if (!mod.ok) return { ok: false, error: mod.reason! };
      }
      const { data, error } = await db
        .from("reviews")
        .upsert({ venue_id: venueId, user_id: userId, rating, body: body.trim() }, { onConflict: "venue_id,user_id" })
        .select("id")
        .single();
      if (error) return err(error);
      const { data: row } = await db.from("reviews_public").select("*").eq("id", (data as Row).id).single();
      return { ok: true, data: mapReview(row as Row) };
    },

    async report(i) {
      const userId = await me();
      if (!userId) return { ok: false, error: "Inicia sesión." };
      const { error } = await db.from("reports").insert({
        reporter_id: userId,
        target_type: i.targetType,
        target_id: i.targetId,
        reason: i.reason,
        details: i.details.trim().slice(0, 500),
      });
      if (error?.code === "23505") return { ok: false, error: "Ya habías denunciado este contenido. Lo estamos revisando." };
      return error ? err(error) : ok;
    },

    async blockAuthor({ userId, postId }) {
      const id = await me();
      if (!id) return { ok: false, error: "Inicia sesión." };
      if (userId) {
        if (userId === id) return { ok: false, error: "No puedes bloquearte a ti." };
        const { error } = await db.from("blocks").upsert({ blocker_id: id, blocked_id: userId }, { ignoreDuplicates: true });
        return error ? err(error) : ok;
      }
      if (postId) {
        const { error } = await db.rpc("block_post_author", { p_post: postId });
        return error ? err(error) : ok;
      }
      return { ok: false, error: "No se puede bloquear a este autor." };
    },

    async unblock(userId) {
      const id = await me();
      const { error } = await db.from("blocks").delete().eq("blocker_id", id).eq("blocked_id", userId);
      return error ? err(error) : ok;
    },

    async listReports() {
      const { data, error } = await db.rpc("moderation_queue");
      if (error) return err(error);
      const reports: Report[] = ((data ?? []) as Row[]).map((r) => ({
        id: String(r.id),
        reporterId: "",
        targetType: r.target_type as Report["targetType"],
        targetId: String(r.target_id),
        reason: r.reason as Report["reason"],
        details: String(r.details ?? ""),
        status: r.status as Report["status"],
        createdAt: String(r.created_at),
        preview: String(r.preview ?? ""),
      }));
      return { ok: true, data: reports };
    },

    async moderate(report, action) {
      const { error } = await db.rpc("moderate", { p_report: report.id, p_action: action });
      return error ? err(error) : ok;
    },

    async myStats(): Promise<UserStats> {
      const { data } = await db.rpc("my_stats");
      const r = ((data ?? []) as Row[])[0] ?? {};
      const n = (k: string) => Number(r[k] ?? 0);
      return {
        plansCreated: n("plans_created"),
        placesVisited: n("places_visited"),
        votes: n("votes"),
        reviews: n("reviews"),
        posts: n("posts"),
        interested: n("interested"),
        concerts: n("concerts"),
        copas: n("copas"),
        university: n("university"),
        lateNights: n("late_nights"),
        cities: n("cities"),
      };
    },
  };
}
