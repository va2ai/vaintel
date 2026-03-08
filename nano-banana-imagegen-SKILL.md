---
name: nano-banana-imagegen
description: Generate images using Google's Gemini API "Nano Banana" image generation models directly in React artifacts. Use this skill whenever the user asks to generate, create, or make images using Gemini, Nano Banana, Google AI image generation, or wants an image generator app powered by Gemini. Also trigger when the user mentions "nano banana", "gemini image", "gemini picture", or wants to build an AI image generation tool using Google's API. This skill handles API integration, prompt crafting, loading states, and error handling for Gemini's native image generation capabilities. Supports text-to-image, image editing, and multi-turn conversational image creation.
---

# Nano Banana Image Generator Skill

Build image generation apps powered by Google's Gemini API "Nano Banana" models.

## Overview

"Nano Banana" is the name for Gemini's native image generation capabilities. This skill creates React artifacts that call the Gemini REST API to generate images from text prompts. The user must supply their own Gemini API key (free tier available at https://aistudio.google.com/apikey).

## Available Models

| Model | ID | Best For | Status |
|---|---|---|---|
| **Nano Banana 2** ⭐ | `gemini-3.1-flash-image-preview` | Fast generation, advanced world knowledge, precise instruction following, text rendering, subject consistency, image-search grounding | **Newest (Feb 2026)** |
| **Nano Banana Pro** | `gemini-3-pro-image-preview` | Professional asset production, maximum factual accuracy, high-fidelity tasks using advanced "Thinking" reasoning | Stable |
| **Nano Banana** | `gemini-2.5-flash-image` | High-volume, low-latency tasks | Stable (legacy) |

**Default to `gemini-3.1-flash-image-preview` (Nano Banana 2)** — it combines Pro-level quality with Flash speed. Use Nano Banana Pro only for tasks requiring maximum factual accuracy or studio-quality precision.

### Nano Banana 2 Highlights
- **Advanced world knowledge**: Pulls real-time information from Gemini's knowledge base and web search for accurate renderings
- **Precision text rendering**: Generates legible, stylized text for marketing mockups, greeting cards, infographics
- **Subject consistency**: Maintains character/object appearance across multiple prompts and edits
- **Up to 14 reference images**: Mix multiple reference images for composite generation
- **New aspect ratios**: Adds `1:4`, `4:1`, `1:8`, `8:1` alongside standard ratios
- **Image-search grounding**: Can use Google Image Search alongside web search for more accurate results
- **Speed**: Significantly faster than Nano Banana Pro while maintaining high visual fidelity

## REST API Endpoint

```
POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent?key={API_KEY}
```

The default MODEL_ID should be `gemini-3.1-flash-image-preview` (Nano Banana 2).

### Request Body (Text-to-Image)

```json
{
  "contents": [{
    "parts": [
      {"text": "Your image prompt here"}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"]
  }
}
```

### Request Body (Image Editing — with base64 input image)

```json
{
  "contents": [{
    "parts": [
      {"text": "Edit instruction here"},
      {
        "inline_data": {
          "mime_type": "image/jpeg",
          "data": "<BASE64_IMAGE_DATA>"
        }
      }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"]
  }
}
```

### Response Structure

The response contains `candidates[0].content.parts[]` which is an array of parts. Each part is either:
- `{ "text": "..." }` — descriptive text from the model
- `{ "inlineData": { "mimeType": "image/png", "data": "<BASE64>" } }` — the generated image

### Extracting the Image

```javascript
const data = await response.json();
const parts = data.candidates?.[0]?.content?.parts || [];

for (const part of parts) {
  if (part.inlineData) {
    const imgSrc = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    // Display imgSrc in an <img> tag
  }
  if (part.text) {
    // Optional descriptive text from the model
  }
}
```

## React Artifact Pattern

When building React artifacts, follow this pattern:

```jsx
import { useState } from "react";

export default function NanoBananaGenerator() {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("gemini-3.1-flash-image-preview");

  const generate = async () => {
    if (!prompt.trim() || !apiKey.trim()) return;
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setDescription("");

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API error: ${res.status}`);
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];

      let foundImage = false;
      for (const part of parts) {
        if (part.inlineData) {
          setImageUrl(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
          foundImage = true;
        }
        if (part.text) {
          setDescription(part.text);
        }
      }

      if (!foundImage) {
        throw new Error("No image was generated. Try a different prompt.");
      }
    } catch (err) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  // ... render UI
}
```

## Key Implementation Notes

1. **API Key Input**: Always include an API key input field. The key is sent as a query parameter `?key=`. Never hardcode keys.

2. **responseModalities**: You MUST include `"generationConfig": { "responseModalities": ["TEXT", "IMAGE"] }` in the request body, otherwise the API will only return text.

3. **Error Handling**: Common errors:
   - `400` — Bad request (invalid prompt or parameters)
   - `401/403` — Invalid API key
   - `429` — Rate limited (free tier: ~500 images/day)
   - `500` — Server error, retry

4. **Loading States**: Generation takes 3-15 seconds. Show a clear loading indicator with animation.

5. **Image Display**: Images come back as base64 PNG. Create a data URL: `data:image/png;base64,{data}`.

6. **Download**: Provide a download button using an anchor with `download` attribute pointing to the base64 data URL.

7. **Safety Filters**: Gemini may refuse certain prompts. Handle the case where `candidates` is empty or has no image parts.

8. **Image Editing**: To edit an existing image, include both the text prompt and the image as `inline_data` in the parts array. Allow the user to upload an image via file input, convert to base64 with FileReader.

9. **Aspect Ratios**: Nano Banana supports specifying aspect ratios in `generationConfig.imageConfig`:
   ```json
   "generationConfig": {
     "responseModalities": ["TEXT", "IMAGE"],
     "imageConfig": {
       "aspectRatio": "16:9"
     }
   }
   ```
   Supported ratios: `1:1`, `3:4`, `4:3`, `9:16`, `16:9`, `1:2`, `2:1` (more on newer models).

10. **Multiple Images**: You cannot request multiple images in a single Gemini call like Imagen. To get variations, make multiple API calls.

## Design Guidelines

- Use a clean, modern UI with generous spacing
- Show a prominent prompt input with a generate button
- Display the generated image prominently with rounded corners and shadow
- Include a gallery/history of previously generated images in the session
- Add a download button for each generated image
- Show model selector dropdown
- Use a banana-yellow accent color (#FFD700 or similar) as a nod to "Nano Banana"
- Include a collapsible API key input (show/hide toggle)
- Add prompt suggestions/examples for new users

## Prompting Strategies

> **For the full prompting guide with templates, examples, and advanced techniques, read [references/prompting-strategies.md](references/prompting-strategies.md).**

### Core Principle: Scenes, Not Keywords

Nano Banana uses Gemini's language backbone — **write natural paragraphs, not keyword lists**. This is the #1 difference from Stable Diffusion/Midjourney prompting. Generic quality tags ("masterpiece, 4K, trending on ArtStation") are unnecessary and counterproductive.

### The Six-Component Prompt Formula

1. **Subject** — Be specific: "a stoic robot barista with glowing blue optics"
2. **Action** — What's happening: "brewing espresso"
3. **Location** — Where: "a futuristic cafe on Mars"
4. **Composition** — Camera/framing: "extreme close-up", "85mm portrait lens"
5. **Style** — Aesthetic: "film noir", "watercolor", "3D render"
6. **Constraints** — Specifics: "No text", "16:9 aspect ratio"

Formula: `Create an image of [subject] [action] in [location]. [Composition]. [Lighting]. [Style]. [Constraints].`

### What Works Best
- **Photography terms**: golden hour, shallow depth of field, macro shot, backlighting, tilt-shift
- **Compositional descriptors**: "Pulitzer Prize winning photograph" measurably improves composition
- **Specific art styles**: oil painting, pixel art, claymation, cyberpunk, isometric 3D
- **Scene narratives over keywords**: Describe what you see, as if explaining to a skilled artist

### Text in Images
- Enclose desired text in quotes: `the word "HELLO" in bold white`
- Describe typography and placement explicitly
- Keep text concise — shorter strings render better
- Two-step approach: generate text first, then ask for image containing it

### Image Editing Prompts
- Be direct: "Change the sofa to deep navy blue"
- Explicitly state what to preserve: "preserve identity", "do not alter composition"
- **One edit per turn** — break complex changes into sequential steps
- Use semantic negatives: "an empty street" not "no cars"

### Multi-Turn Workflow (Recommended)
Google recommends **chat-based multi-turn prompting** as the primary workflow:
1. Generate initial image with detailed prompt
2. Refine: "Make the lighting warmer" / "Change expression to serious"
3. Build complexity incrementally — don't front-load everything

### Subject Consistency
1. Establish rich character description in first turn
2. Repeat core traits (hair, eyes, clothing) every turn
3. Upload reference images (up to 14 on Pro/Nano Banana 2)
4. Generate a character sheet first, then use as reference

### Common Mistakes to Avoid
- ❌ Vague prompts ("a cool car") — be specific
- ❌ SD/MJ keyword salad — write natural language
- ❌ Conflicting styles ("pixel art + photorealistic")
- ❌ Multiple edits in one turn — do one at a time
- ❌ Negative object mentions ("no red car") — use positive framing
- ❌ Overloaded prompts (>50 words) — iterate with multi-turn

## Common Pitfalls

1. **Forgetting responseModalities** — Without `["TEXT", "IMAGE"]`, you only get text back
2. **Not handling empty candidates** — Safety filters may block the response entirely
3. **Large base64 strings** — Generated images are large (~500KB-2MB base64). Don't store too many in React state
4. **CORS** — The Gemini REST API supports CORS from browser origins, so direct fetch works in artifacts
5. **Model availability** — Preview models may change. Default to `gemini-3.1-flash-image-preview` (Nano Banana 2) as the newest and fastest option. Fall back to `gemini-2.5-flash-image` if the preview model is unavailable.
