"""Generate hero images for all guides using Gemini."""
import os, sys, json, time
from pathlib import Path

# Load key from backend .env
env_path = Path(__file__).parent.parent / "backend" / ".env"
for line in env_path.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip()

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

GUIDES_DIR = Path(__file__).parent / "guides"
IMAGES_DIR = Path(__file__).parent / "public" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Guide-specific prompts keyed by guide id
PROMPTS = {
    "filing-first-claim": (
        "Abstract editorial illustration. A clean pathway of golden light leading from "
        "a folded document on the left toward a glowing approval stamp on the right. "
        "Geometric stepping stones along the path. "
    ),
    "cp-exam-guide": (
        "Abstract editorial illustration. A medical clipboard with geometric check marks "
        "floating beside a calm silhouette figure. Golden measurement lines and diagnostic "
        "shapes emanate outward in an organized pattern. "
    ),
    "va-math": (
        "Abstract editorial illustration. Overlapping translucent circles in navy and gold, "
        "showing mathematical combination -- not addition. Percentage numbers dissolve into "
        "geometric fragments that recombine into a single whole shape. "
    ),
    "appeals-101": (
        "Abstract editorial illustration. Three diverging golden pathways branching from "
        "a single point, each leading to a different geometric destination. "
        "A scale of justice motif at the fork point. "
    ),
    "increase-claims": (
        "Abstract editorial illustration. A vertical bar chart made of golden light, "
        "with the rightmost bar growing upward with an arrow. Geometric upward momentum "
        "lines and ascending particles. "
    ),
    "tdiu-explained": (
        "Abstract editorial illustration. A shield-shaped badge with '100' implied through "
        "geometric golden shapes. Surrounding elements suggest protection and completeness "
        "despite incomplete pieces assembling together. "
    ),
    "nexus-letters": (
        "Abstract editorial illustration. Two separate geometric nodes -- one representing "
        "a medical cross, one representing a military chevron -- connected by a golden "
        "bridge of light with a chain link in the center. "
    ),
    "buddy-statements": (
        "Abstract editorial illustration. Two silhouette figures standing side by side, "
        "with golden speech-bubble geometric shapes flowing from one to the other. "
        "A document with a seal forms below them. "
    ),
}

COMMON_STYLE = (
    "Deep navy blue (#0B1A2E) background. Gold (#C8A232) warm accents. "
    "Style: Modern flat illustration with geometric shapes, no photorealism. "
    "Absolutely no text, no words, no letters, no numbers anywhere in the image. "
    "Clean, minimal, professional. Suitable as a widescreen hero banner."
)

for guide_file in sorted(GUIDES_DIR.glob("*.json")):
    guide = json.loads(guide_file.read_text(encoding="utf-8"))
    guide_id = guide["id"]
    out_path = IMAGES_DIR / f"guide-{guide_id}-hero.png"

    if out_path.exists():
        print(f"[skip] {guide_id} -- image exists")
        continue

    prompt_intro = PROMPTS.get(guide_id, f"Abstract editorial illustration related to {guide['title']}. ")
    full_prompt = prompt_intro + COMMON_STYLE

    print(f"[gen] {guide_id}...")
    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=full_prompt,
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
                print(f"  -> Saved {out_path.name}")
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

# Now update guide JSON files with heroImage field
print("\nUpdating guide JSON files...")
for guide_file in sorted(GUIDES_DIR.glob("*.json")):
    guide = json.loads(guide_file.read_text(encoding="utf-8"))
    guide_id = guide["id"]
    img_path = f"/images/guide-{guide_id}-hero.png"

    if (IMAGES_DIR / f"guide-{guide_id}-hero.png").exists():
        if guide.get("heroImage") != img_path:
            guide["heroImage"] = img_path
            guide_file.write_text(json.dumps(guide, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"  Updated {guide_file.name}")
    else:
        print(f"  [skip] No image for {guide_id}")

print("Done.")
