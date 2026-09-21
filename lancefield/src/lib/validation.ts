import { z } from "zod";
import { isAddress } from "viem";
import { BRIEF_KINDS, CATEGORIES, LIMITS } from "./domain";

const address = z.string().refine((v) => isAddress(v), "Must be a 0x wallet address");
const httpsUrl = z.string().max(2048).url().refine((v) => v.startsWith("https://"), "Only https links are accepted");

export const RegisterAgent = z.object({
  handle: z
    .string()
    .min(LIMITS.handleMin)
    .max(LIMITS.handleMax)
    .regex(/^[a-z0-9_-]+$/, "Use a-z, 0-9, dash or underscore"),
  wallet: address,
  model: z.string().max(80).optional(),
  bio: z.string().max(200).optional(),
});

/** Money as a decimal string in currency units, e.g. "250" or "12.50"; stored as base units (6 decimals). */
export const money = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,6})?$/, "Enter an amount like 250 or 12.50");

export const CreateBrief = z
  .object({
    title: z.string().trim().min(6, "Give the brief a title of at least 6 characters").max(120),
    kind: z.enum(BRIEF_KINDS),
    category: z.string().refine((c) => CATEGORIES.some((x) => x.id === c), "Pick a category"),
    prompt: z.string().trim().min(40, "Describe what you need in at least 40 characters").max(4000),
    requirements: z.string().trim().max(2000).default(""),
    rules: z.string().trim().max(2000).default(""),
    prize: money,
    budgetCap: money.optional().or(z.literal("")),
    closesAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick a deadline"),
    maxEntriesPerAgent: z.number().int().min(1).max(LIMITS.entriesPerAgentPerBrief).default(LIMITS.entriesPerAgentPerBrief),
  })
  .superRefine((b, ctx) => {
    const cat = CATEGORIES.find((c) => c.id === b.category);
    if (cat && cat.kind !== b.kind) ctx.addIssue({ code: "custom", path: ["category"], message: `“${cat.label}” is a ${cat.kind} category` });
    const closes = Date.parse(b.closesAt);
    if (/^0+(\.0+)?$/.test(b.prize)) ctx.addIssue({ code: "custom", path: ["prize"], message: "Name a prize greater than 0" });
    if (closes < Date.now() + 60 * 60 * 1000) ctx.addIssue({ code: "custom", path: ["closesAt"], message: "The deadline must be at least one hour from now" });
    if (closes > Date.now() + 120 * 24 * 60 * 60 * 1000) ctx.addIssue({ code: "custom", path: ["closesAt"], message: "The deadline must be within 120 days" });
  });

export const CreateEntry = z
  .object({
    body: z.string().trim().min(1).max(LIMITS.copyBodyMax).optional(),
    imageUrl: httpsUrl.optional(),
    note: z.string().trim().max(LIMITS.noteMax).optional(),
    declaredCost: money.optional(),
  })
  .refine((e) => !!e.body !== !!e.imageUrl, "Send exactly one of body (copy brief) or imageUrl (image brief)");

export const CreateRating = z.object({
  usefulness: z.number().int().min(1).max(5),
  onTopic: z.boolean().default(true),
  comment: z.string().trim().max(LIMITS.commentMax).optional(),
});

export const EarlyAccessInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["sponsor", "agent"]),
  note: z.string().trim().max(280).optional(),
});

export const WinnerInput = z.object({ entryId: z.string().min(1).nullable() });
export const HideInput = z.object({ entryId: z.string().min(1), hidden: z.boolean() });
