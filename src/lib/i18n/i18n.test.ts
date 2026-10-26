// @vitest-environment node
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { LOCALES, translate, DEFAULT_LOCALE, isLocale, translations } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import { intlLocale } from "@/lib/i18n/format";

const SOURCE_ROOT = path.join(process.cwd(), "src");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const DICTIONARIES = ["en.ts", "es.ts"].map((name) =>
  path.join(SOURCE_ROOT, "lib", "i18n", name),
);
const sourceFiles = walk(SOURCE_ROOT).filter(
  (file) => !file.includes(".test.") && !DICTIONARIES.includes(file),
);
const sourceText = new Map(
  sourceFiles.map((file) => [file, fs.readFileSync(file, "utf8")]),
);

describe("dictionary", () => {
  it("has the same keys in every locale", () => {
    const reference = Object.keys(en).sort();
    expect(reference.length).toBeGreaterThan(250);

    for (const locale of LOCALES) {
      expect(Object.keys(translations[locale]).sort()).toEqual(reference);
    }
  });

  it("has no empty or placeholder values", () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(translations[locale])) {
        expect(value.trim(), `${locale}:${key}`).not.toBe("");
        // A value identical to its key means somebody forgot to translate it.
        expect(value, `${locale}:${key}`).not.toBe(key);
      }
    }
  });

  it("uses the same placeholders in every locale", () => {
    const placeholders = (value: string) => (value.match(/\{\d\}/g) ?? []).sort();

    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(es[key]), `placeholders differ for ${key}`).toEqual(
        placeholders(en[key]),
      );
    }
  });
});

describe("translate", () => {
  it("returns the string for the requested locale", () => {
    expect(translate("en", "nav.overview")).toBe("Overview");
    expect(translate("es", "nav.overview")).toBe("Resumen");
  });

  it("falls back to the key itself when it is unknown", () => {
    // @ts-expect-error deliberately asking for a key that does not exist
    expect(translate("es", "nope.missing")).toBe("nope.missing");
  });

  it("recognises locales", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("defaults to Spanish", () => {
    expect(DEFAULT_LOCALE).toBe("es");
  });
});

describe("key usage", () => {
  it("only uses keys that exist", () => {
    const used = new Set<string>();
    const literalCall = /\bt\(\s*"([^"]+)"/g;

    for (const [file, source] of sourceText) {
      for (const match of source.matchAll(literalCall)) {
        const key = match[1] as string;
        used.add(key);
        expect(Object.keys(en), `unknown key ${key} in ${file}`).toContain(key);
      }
    }

    expect(used.size).toBeGreaterThan(100);
  });

  it("never builds a key from a template string", () => {
    // `t(`category.${x}`)` cannot be type-checked; the typed maps in
    // src/lib/i18n/labels.ts exist precisely to avoid it.
    const templateCall = /\bt\(\s*`/;

    for (const [file, source] of sourceText) {
      expect(templateCall.test(source), `template key in ${file}`).toBe(false);
    }
  });

  it("has no unused strings", () => {
    const referenced = new Set<string>();
    for (const source of sourceText.values()) {
      for (const match of source.matchAll(/"([a-z][a-zA-Z0-9]*\.[a-zA-Z0-9.]+)"/g)) {
        referenced.add(match[1] as string);
      }
    }

    const unused = Object.keys(en).filter((key) => !referenced.has(key));
    expect(unused).toEqual([]);
  });
});

describe("previously hardcoded chrome", () => {
  it("serves the note placeholder and the currency swap title from the dictionary", () => {
    for (const key of ["tx.notePlaceholder", "fx.swap"] as const) {
      const english = translate("en", key);
      const spanish = translate("es", key);
      expect(english.trim(), key).not.toBe("");
      expect(spanish.trim(), key).not.toBe("");
      expect(spanish, key).not.toBe(english);
      expect(english, key).not.toBe(key);
    }
  });

  it("renders those strings through t() instead of English literals", () => {
    const noteModal = fs.readFileSync(
      path.join(SOURCE_ROOT, "components/transactions/TransactionDetailModal.tsx"),
      "utf8",
    );
    const converter = fs.readFileSync(
      path.join(SOURCE_ROOT, "components/ui/CurrencyConverterModal.tsx"),
      "utf8",
    );

    expect(noteModal).toContain('placeholder={t("tx.notePlaceholder")}');
    expect(noteModal).not.toContain("Dinner with team");
    expect(converter).toContain('title={t("fx.swap")}');
    expect(converter).not.toContain("Swap currencies");
  });
});

describe("locale formatting", () => {
  it("maps app locales to Intl tags", () => {
    expect(intlLocale("en")).toBe("en-US");
    expect(intlLocale("es")).toBe("es-ES");
  });
});
