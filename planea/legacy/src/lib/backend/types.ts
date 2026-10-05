import type {
  CategorySlug,
  Plan,
  PlanVisibility,
  Post,
  PostKind,
  Profile,
  Reply,
  Report,
  ReportReason,
  ReportTargetType,
  Result,
  Review,
  TargetRef,
  UserStats,
} from "../types";

/** Estado personal del usuario con sesión. Nunca se comparte con otros. */
export interface MyState {
  /** `${type}:${id}:${kind}` */
  attending: Record<string, true>;
  /** `${type}:${id}` → voto de esta noche */
  votes: Record<string, 1 | -1>;
  /** postId → optionId */
  pollVotes: Record<string, string>;
  blocked: string[];
  /** Contenido que el usuario ha denunciado (se le oculta al momento). */
  hidden: string[];
}

export const EMPTY_STATE: MyState = { attending: {}, votes: {}, pollVotes: {}, blocked: [], hidden: [] };

export type AttendanceKind = "interested" | "here";

export interface ActivityMeta {
  category: CategorySlug;
  citySlug: string;
  startsAt?: string;
}

export interface PlanInput {
  citySlug: string;
  title: string;
  placeName: string;
  venueId: string | null;
  category: CategorySlug;
  description: string;
  startsAt: string;
  visibility: PlanVisibility;
  image: File | null;
}

export interface PostInput {
  target: TargetRef;
  kind: PostKind;
  body: string;
  options: string[];
  anonymous: boolean;
}

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string;
  preview: string;
}

export type ProfilePatch = Partial<Pick<Profile, "displayName" | "avatarEmoji" | "avatarColor" | "age" | "citySlug">>;

export interface Backend {
  mode: "demo" | "supabase";
  /** Si las métricas del servidor ya incluyen la actividad del propio usuario. */
  countsIncludeSelf: boolean;

  getProfile(): Promise<Profile | null>;
  onAuthChange(cb: () => void): () => void;
  signUp(i: { email: string; password: string; displayName: string; citySlug: string }): Promise<Result<{ needsConfirmation: boolean }>>;
  signIn(i: { email: string; password: string }): Promise<Result>;
  signInWithGoogle(next: string): Promise<Result>;
  signOut(): Promise<void>;
  updateProfile(patch: ProfilePatch): Promise<Result<Profile>>;

  loadMyState(): Promise<MyState>;
  setAttendance(t: TargetRef, kind: AttendanceKind, on: boolean, meta: ActivityMeta): Promise<Result>;
  vote(t: TargetRef, value: 1 | -1 | 0): Promise<Result>;
  trackView(t: TargetRef): void;

  listPlans(citySlug: string, initial: Plan[]): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | null>;
  createPlan(i: PlanInput): Promise<Result<Plan>>;
  deletePlan(id: string): Promise<Result>;
  myPlans(): Promise<Plan[]>;

  listPosts(t: TargetRef, initial: Post[]): Promise<Post[]>;
  createPost(i: PostInput): Promise<Result<Post>>;
  deletePost(id: string): Promise<Result>;
  votePoll(postId: string, optionId: string): Promise<Result>;
  listReplies(postId: string, initial: Reply[]): Promise<Reply[]>;
  createReply(postId: string, body: string, anonymous: boolean): Promise<Result<Reply>>;
  deleteReply(id: string): Promise<Result>;

  listReviews(venueId: string, initial: Review[]): Promise<Review[]>;
  createReview(venueId: string, rating: number, body: string): Promise<Result<Review>>;

  report(i: ReportInput): Promise<Result>;
  blockAuthor(i: { userId: string | null; postId?: string }): Promise<Result>;
  unblock(userId: string): Promise<Result>;
  listReports(initial: Report[]): Promise<Result<Report[]>>;
  moderate(report: Report, action: "remove" | "dismiss"): Promise<Result>;

  myStats(): Promise<UserStats>;
}
