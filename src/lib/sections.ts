import type { Lesson } from '../types';

export interface Section {
  name: string;
  lessons: Lesson[];
}

/** Consecutive lessons with the same `section`, in course order. */
export function groupBySection(lessons: Lesson[]): Section[] {
  const sections: Section[] = [];
  for (const lesson of lessons) {
    const last = sections[sections.length - 1];
    if (last && last.name === lesson.section) last.lessons.push(lesson);
    else sections.push({ name: lesson.section, lessons: [lesson] });
  }
  return sections;
}
