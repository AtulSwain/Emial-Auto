import { readFileSync } from "node:fs";
import path from "node:path";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export type TemplateValues = Record<string, string>;
export type TemplateSections = Record<string, boolean>;

/**
 * Tiny, logic-less renderer.
 *  {{KEY}}                  → value (HTML-escaped when mode = "html")
 *  {{#KEY}}…{{/KEY}}        → kept only when sections[KEY] is true
 *  {{^KEY}}…{{/KEY}}        → kept only when sections[KEY] is false
 * Throws if any placeholder is unknown or left over, so a typo can never ship.
 */
export function renderTemplate(
  template: string,
  values: TemplateValues,
  options: { mode: "html" | "text"; sections?: TemplateSections } = { mode: "html" },
): string {
  const sections = options.sections ?? {};

  let out = template.replace(
    /\{\{([#^])([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\2\}\}/g,
    (_m, kind: string, key: string, body: string) => {
      if (!(key in sections)) throw new Error(`Template section "${key}" has no value`);
      const on = sections[key];
      return (kind === "#" ? on : !on) ? body : "";
    },
  );

  out = out.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, key: string) => {
    if (!(key in values)) throw new Error(`Template placeholder "${key}" has no value`);
    const v = values[key];
    return options.mode === "html" ? escapeHtml(v) : v;
  });

  if (out.includes("{{") || out.includes("}}")) {
    throw new Error("Template still contains unrendered {{ }} tokens");
  }
  return out;
}

const cache = new Map<string, string>();

export function loadTemplate(file: string): string {
  let t = cache.get(file);
  if (t === undefined) {
    t = readFileSync(path.join(process.cwd(), "src", "emails", "templates", file), "utf8");
    cache.set(file, t);
  }
  return t;
}
