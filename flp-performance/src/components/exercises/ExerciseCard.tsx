import Link from "next/link";
import { Badge } from "@/components/ui/Feedback";
import { CATEGORIES, DIFFICULTY_LABELS, type Category } from "@/lib/exercises";

export type ExerciseListItem = {
  id: string;
  code: string;
  title: string;
  category: Category;
  age_min: number;
  age_max: number;
  difficulty: number;
  description: string;
  status?: string;
  exercise_media?: { id: string }[];
};

export function ExerciseCard({ exercise, href }: { exercise: ExerciseListItem; href: string }) {
  const hasVideo = (exercise.exercise_media?.length ?? 0) > 0;
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-card border border-line bg-graphite p-5 transition-colors hover:border-gold"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-wider text-gold">{exercise.code}</span>
        <span className="flex gap-1.5">
          {exercise.status === "draft" && <Badge tone="danger">Entwurf</Badge>}
          {hasVideo && <Badge>Video</Badge>}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-bold group-hover:text-gold">{exercise.title}</h3>
      {exercise.description && <p className="mt-2 line-clamp-2 text-sm text-mute">{exercise.description}</p>}
      <p className="mt-auto pt-4 text-xs uppercase tracking-wider text-mute">
        {CATEGORIES[exercise.category].label} · {exercise.age_min}–{exercise.age_max} J. · {DIFFICULTY_LABELS[exercise.difficulty]}
      </p>
    </Link>
  );
}

export function CategoryFilter({ basePath, active, q }: { basePath: string; active?: string; q?: string }) {
  const link = (cat?: string) => {
    const params = new URLSearchParams();
    if (cat) params.set("kategorie", cat);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const chip = (isActive: boolean) =>
    `inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-medium uppercase tracking-wider ${
      isActive ? "border-gold bg-gold text-ink" : "border-line text-mute hover:text-paper"
    }`;
  return (
    <nav aria-label="Kategorien" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link href={link()} className={chip(!active)} aria-current={!active ? "true" : undefined}>
        Alle
      </Link>
      {(Object.keys(CATEGORIES) as Category[]).map((c) => (
        <Link key={c} href={link(c)} className={chip(active === c)} aria-current={active === c ? "true" : undefined}>
          {CATEGORIES[c].label}
        </Link>
      ))}
    </nav>
  );
}
