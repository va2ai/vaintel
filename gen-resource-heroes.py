"""Generate resource card images for the Veteran2Veteran site using Gemini."""
import os, time
from pathlib import Path

# Load key from backend .env
env_path = Path(__file__).parent.parent / "backend" / ".env"
for line in env_path.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip()

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

IMAGES_DIR = Path(__file__).parent / "public" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

RESOURCES = [
    (
        "resource-claims-process.png",
        "Abstract editorial illustration. A clean golden pathway with sequential stepping "
        "stones leading forward through geometric archways, suggesting a structured process "
        "from start to finish. Deep navy blue (#0B1A2E) background. Gold (#C8A232) warm "
        "accents. Style: Modern flat illustration with geometric shapes, no photorealism. "
        "Absolutely no text, no words, no letters, no numbers anywhere in the image. Clean, "
        "minimal, professional. Suitable as a widescreen hero banner."
    ),
    (
        "resource-cavc-precedent.png",
        "Abstract editorial illustration. A balanced scale of justice rendered in golden "
        "geometric shapes, with legal document silhouettes radiating outward in an organized "
        "pattern. Deep navy blue (#0B1A2E) background. Gold (#C8A232) warm accents. Style: "
        "Modern flat illustration with geometric shapes, no photorealism. Absolutely no text, "
        "no words, no letters, no numbers anywhere in the image. Clean, minimal, professional. "
        "Suitable as a widescreen hero banner."
    ),
    (
        "resource-cfr-reference.png",
        "Abstract editorial illustration. An open book with golden geometric pages fanning "
        "outward, connected by luminous golden threads to floating regulatory shield shapes. "
        "Deep navy blue (#0B1A2E) background. Gold (#C8A232) warm accents. Style: Modern flat "
        "illustration with geometric shapes, no photorealism. Absolutely no text, no words, no "
        "letters, no numbers anywhere in the image. Clean, minimal, professional. Suitable as a "
        "widescreen hero banner."
    ),
    (
        "resource-cp-exam.png",
        "Abstract editorial illustration. A medical clipboard with geometric golden check marks "
        "floating alongside a calm silhouette figure. Diagnostic shapes and measurement lines "
        "arranged in an organized, reassuring pattern. Deep navy blue (#0B1A2E) background. "
        "Gold (#C8A232) warm accents. Style: Modern flat illustration with geometric shapes, no "
        "photorealism. Absolutely no text, no words, no letters, no numbers anywhere in the "
        "image. Clean, minimal, professional. Suitable as a widescreen hero banner."
    ),
    (
        "resource-rating-calc.png",
        "Abstract editorial illustration. Overlapping translucent circles in navy and gold "
        "showing mathematical combination. Percentage fragments and geometric pieces assembling "
        "into a unified whole, suggesting VA math calculation. Deep navy blue (#0B1A2E) "
        "background. Gold (#C8A232) warm accents. Style: Modern flat illustration with geometric "
        "shapes, no photorealism. Absolutely no text, no words, no letters, no numbers anywhere "
        "in the image. Clean, minimal, professional. Suitable as a widescreen hero banner."
    ),
    (
        "resource-bva-search.png",
        "Abstract editorial illustration. A magnifying glass with golden geometric lens hovering "
        "over layered document silhouettes, with search result highlights glowing in gold. Deep "
        "navy blue (#0B1A2E) background. Gold (#C8A232) warm accents. Style: Modern flat "
        "illustration with geometric shapes, no photorealism. Absolutely no text, no words, no "
        "letters, no numbers anywhere in the image. Clean, minimal, professional. Suitable as a "
        "widescreen hero banner."
    ),
]

for filename, prompt in RESOURCES:
    out_path = IMAGES_DIR / filename

    if out_path.exists():
        print(f"[skip] {filename} -- image exists")
        continue

    print(f"[gen] {filename}...")
    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio="16:9",
                    image_size="2K",
                ),
            ),
        )

        saved = False
        for part in response.parts:
            if part.inline_data is not None:
                image = part.as_image()
                image.save(str(out_path))
                print(f"  -> Saved {filename}")
                saved = True
                break
            elif part.text is not None:
                print(f"  -> Text: {part.text[:100]}")

        if not saved:
            print(f"  -> No image generated")

    except Exception as e:
        print(f"  -> Error: {e}")

    # Rate limit pause
    time.sleep(2)

print("Done.")
