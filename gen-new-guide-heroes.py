"""Generate hero images for new guides using Gemini."""
import os, time
from pathlib import Path

# Load key from backend .env
env_path = Path(__file__).parent.parent / "backend" / ".env"
for line in env_path.read_text(encoding="utf-8").splitlines():
    if line.startswith("GEMINI_API_KEY="):
        os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip()

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

IMAGES_DIR = Path(__file__).parent / "public" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

COMMON_STYLE = (
    "Deep navy blue (#0B1A2E) background. Gold (#C8A232) warm accents. "
    "Style: Modern flat illustration with geometric shapes, no photorealism. "
    "Absolutely no text, no words, no letters, no numbers anywhere in the image. "
    "Clean, minimal, professional. Suitable as a widescreen hero banner."
)

IMAGES = {
    "guide-cavc-precedent-library-hero.png": (
        "Abstract editorial illustration. A balanced scale of justice rendered in "
        "golden geometric shapes, with gavels and legal document silhouettes arranged "
        "in an organized constellation pattern. Pillars of a courthouse form geometric "
        "archways. " + COMMON_STYLE
    ),
    "guide-cfr-quick-reference-hero.png": (
        "Abstract editorial illustration. A massive open book with golden pages, "
        "surrounded by organized floating geometric cards and reference tabs. Each card "
        "connects to the book with luminous golden threads, suggesting a structured "
        "reference system. " + COMMON_STYLE
    ),
}

for filename, prompt in IMAGES.items():
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
