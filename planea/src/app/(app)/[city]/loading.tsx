import { FeedSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 pt-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-11 rounded-full" />
      <FeedSkeleton />
    </main>
  );
}
