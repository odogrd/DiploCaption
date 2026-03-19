import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  GenerateCaptionsBody,
  GenerateCaptionsResponse,
  RefineCaptionBody,
  RefineCaptionResponse,
  RewriteCaptionBody,
  RewriteCaptionResponse,
  UploadImageBody,
  UploadImageResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.DIPLO_ANTHROPIC_KEY });
}

const SYSTEM_PROMPT = `You are DiploCaption, an expert social media writer specializing in geopolitical, historical, and diplomatic content. You work for DiploMaps, a media brand that publishes analytical maps about world affairs, history, and international relations.

Your voice is: neutral and journalistic, analytically rigorous, and accessible to educated general audiences. You never sensationalize. You ground captions in facts visible in or implied by the map.

You will receive:
1. An image of a map
2. The map type (geopolitical / historical / data-infographic / other)
3. Optional context notes from the author
4. Per-platform configurations, each with an audience and one or more named style variants

Your task: for each platform, generate one caption per style variant. Return a valid JSON object where each platform key maps to an array of caption strings, in the same order as the variants listed.`;

type PlatformVariant = { variantName: string; instructions: string };

type PlatformOverridesInput = Record<string, {
  audience: string;
  variants: PlatformVariant[];
}>;

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
  substack_post: "SUBSTACK POST",
  substack_note: "SUBSTACK NOTE",
  x: "X (TWITTER)",
  bluesky: "BLUESKY",
};

const PLATFORM_FORMATS: Record<string, string> = {
  instagram: "Engaging caption optimized for Instagram. Use line breaks. Include 3–5 hashtags only if highly relevant.",
  facebook: "Conversational and informative. Can be slightly longer than Instagram. Hashtags only if relevant.",
  substack_post: "2–3 sentence intro paragraph for a full newsletter post. Sets context and invites the reader in. No hashtags.",
  substack_note: "1–2 sentence punchy note. Sharp observation or takeaway. No hashtags.",
  x: "Concise, maximum 280 characters. Punchy. No hashtags unless essential.",
  bluesky: "Similar to X but max 300 characters. Thoughtful and direct. Hashtags only if very relevant.",
};

const PLATFORM_ORDER = ["instagram", "facebook", "substack_post", "substack_note", "x", "bluesky"];

function buildUserPrompt(
  mapType: string,
  contextNotes: string | null | undefined,
  overrides: PlatformOverridesInput,
): string {
  const sections = PLATFORM_ORDER
    .filter((pid) => overrides[pid])
    .map((pid) => {
      const { audience, variants } = overrides[pid];
      const label = PLATFORM_LABELS[pid] ?? pid.toUpperCase();
      const format = PLATFORM_FORMATS[pid] ?? "Platform-appropriate format.";
      const variantLines = variants
        .map((v, i) => `  Variant ${i + 1} — "${v.variantName}": ${v.instructions}`)
        .join("\n");
      return `${label}\nAudience: ${audience}\nFormat: ${format}\nStyle variants:\n${variantLines}`;
    });

  return `Map type: ${mapType}

Author's additional context: ${contextNotes || "None provided"}

Generate captions for the following platforms. For each platform, output one caption per variant in the listed order.

${sections.join("\n\n")}

Return only a valid JSON object. Each key is a platform id (instagram, facebook, substack_post, substack_note, x, bluesky). Each value is an array of caption strings, one per variant in order. No preamble, no markdown, no explanation.`;
}

router.post("/captions/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateCaptionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageData, imageMediaType, mapType, contextNotes, platformOverrides } = parsed.data;

  const client = getClient();
  const userPrompt = buildUserPrompt(mapType, contextNotes, platformOverrides as PlatformOverridesInput);

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageData,
              },
            },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    });
  } catch (e) {
    console.error("[captions/generate] Anthropic API error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: "AI service error", detail: message });
    return;
  }

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    res.status(500).json({ error: "No text response from AI" });
    return;
  }

  let rawCaptions: Record<string, string[]>;
  try {
    const rawText = textContent.text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    rawCaptions = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response as JSON" });
    return;
  }

  // Attach variantNames to each caption array
  const overridesTyped = platformOverrides as PlatformOverridesInput;
  const result: Record<string, { variantName: string; caption: string }[]> = {};
  for (const pid of PLATFORM_ORDER) {
    const captions = rawCaptions[pid];
    const variants = overridesTyped[pid]?.variants ?? [];
    if (captions) {
      result[pid] = captions.map((caption, i) => ({
        variantName: variants[i]?.variantName ?? `Variant ${i + 1}`,
        caption,
      }));
    }
  }

  res.json(GenerateCaptionsResponse.parse(result));
});

router.post("/captions/refine", requireAuth, async (req, res): Promise<void> => {
  const parsed = RefineCaptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { platform, currentCaption, instruction } = parsed.data;

  const client = getClient();
  const prompt = `Here is the current caption for ${platform}:

"${currentCaption}"

The user's instruction: "${instruction}"

Rewrite the caption applying the instruction while preserving the factual content, overall structure, and the DiploMaps voice (neutral, analytical, accessible). Return only the new caption text, no explanation.`;

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    console.error("[captions/refine] Anthropic API error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: "AI service error", detail: message });
    return;
  }

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    res.status(500).json({ error: "No text response from AI" });
    return;
  }

  res.json(RefineCaptionResponse.parse({ caption: textContent.text.trim() }));
});

router.post("/captions/rewrite", requireAuth, async (req, res): Promise<void> => {
  const parsed = RewriteCaptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageData, imageMediaType, platform, mapType, contextNotes, instructions, audience } = parsed.data;

  const client = getClient();
  const userPrompt = `Map type: ${mapType}

Author's additional context: ${contextNotes || "None provided"}

Generate a fresh, entirely different caption for ${PLATFORM_LABELS[platform] ?? platform.toUpperCase()}. Do not reuse phrasing from any previous version.

Instructions: ${instructions}
Audience: ${audience}
Format: ${PLATFORM_FORMATS[platform] ?? "Platform-appropriate format."}

Return only the caption text, no explanation.`;

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageData,
              },
            },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    });
  } catch (e) {
    console.error("[captions/rewrite] Anthropic API error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: "AI service error", detail: message });
    return;
  }

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    res.status(500).json({ error: "No text response from AI" });
    return;
  }

  res.json(RewriteCaptionResponse.parse({ caption: textContent.text.trim() }));
});

router.post("/images/upload", requireAuth, async (req, res): Promise<void> => {
  const parsed = UploadImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const imageKey = `img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  res.json(UploadImageResponse.parse({ imageKey }));
});

export default router;
