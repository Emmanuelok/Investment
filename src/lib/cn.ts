/**
 * Tiny class combiner — keeps the bundle free of clsx/tailwind-merge.
 * Accepts strings, falsy values, and arrays; joins truthy class fragments.
 */
type ClassValue = string | number | null | false | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v && v !== 0) return;
    if (Array.isArray(v)) v.forEach(walk);
    else out.push(String(v));
  };
  inputs.forEach(walk);
  return out.join(" ");
}
