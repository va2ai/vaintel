"""Generate hero images for blog posts using Gemini."""
import os, json, time
from pathlib import Path

# Load key from backend .env
env_path = Path(__file__).parent.parent / "backend" / ".env"
for line in env_path.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip()

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

POSTS_DIR = Path(__file__).parent / "posts"
IMAGES_DIR = Path(__file__).parent / "public" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

COMMON_STYLE = (
    "Deep navy blue (#0B1A2E) background. Gold (#C8A232) warm accents. "
    "Style: Modern flat illustration with geometric shapes, no photorealism. "
    "Absolutely no text, no words, no letters, no numbers anywhere in the image. "
    "Clean, minimal, professional. Suitable as a widescreen hero banner."
)

# Image filename -> (prompt, post_id)
IMAGES = [
    (
        "post-euzebio-tdiu-hero.png",
        "Abstract editorial illustration. A gavel striking with golden impact waves, "
        "next to a silhouette figure emerging from shadow into golden light. Geometric "
        "employment symbols -- briefcase, handshake -- dissolving and reforming. ",
        1,
    ),
    (
        "post-medication-rule-hero.png",
        "Abstract editorial illustration. A pill capsule split in half revealing two "
        "contrasting states -- one side calm blue geometric order, the other side chaotic "
        "golden fragments. A rating scale balances between them. ",
        2,
    ),
    (
        "post-nexus-letter-hero.png",
        "Abstract editorial illustration. Two nodes -- a medical cross and a military "
        "chevron -- connected by a luminous golden bridge of light with a chain link at "
        "center. Document shapes radiate outward. ",
        3,
    ),
    (
        "post-bva-grant-rates-hero.png",
        "Abstract editorial illustration. Vertical bar chart rendered in golden light, "
        "with varying heights. A magnifying glass hovers over the tallest bar. Data "
        "particles flow upward in organized streams. ",
        4,
    ),
    (
        "post-m21-1-updates-hero.png",
        "Abstract editorial illustration. An open manual or book with golden pages "
        "fanning out, overlaid with geometric update arrows and revision marks. Change "
        "indicators pulse with golden light. ",
        5,
    ),
    (
        "post-duty-to-assist-hero.png",
        "Abstract editorial illustration. A shield shape with an outstretched hand "
        "inside, offering golden geometric support beams to a silhouette figure. Broken "
        "chain links reforming into whole connections. ",
        6,
    ),
    (
        "post-va-math-hero.png",
        "Abstract editorial illustration. Overlapping translucent circles in navy and "
        "gold, showing mathematical combination -- not simple addition. Percentage "
        "fragments dissolve and recombine into a single unified shape. ",
        7,
    ),
    (
        "post-secondary-connection-hero.png",
        "Abstract editorial illustration. Two interconnected geometric nodes with golden "
        "threads flowing between them. The primary node is solid, the secondary node "
        "materializes from the connection itself. Branching pathways extend outward. ",
        8,
    ),
]

# Map post_id to heroImage path
HERO_MAP = {item[2]: f"/images/{item[0]}" for item in IMAGES}

# Generate images
for filename, prompt, post_id in IMAGES:
    out_path = IMAGES_DIR / filename

    if out_path.exists():
        print(f"[skip] {filename} -- image exists")
        continue

    full_prompt = prompt + COMMON_STYLE
    print(f"[gen] {filename}...")

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

# Update individual post JSON files
print("\nUpdating post JSON files...")
for post_file in sorted(POSTS_DIR.glob("*.json")):
    post = json.loads(post_file.read_text(encoding="utf-8"))
    post_id = post.get("id")

    if post_id in HERO_MAP:
        hero_path = HERO_MAP[post_id]
        img_file = IMAGES_DIR / hero_path.lstrip("/images/")
        if not (IMAGES_DIR / Path(hero_path).name).exists():
            print(f"  [skip] No image file for post {post_id}")
            continue

        if post.get("heroImage") != hero_path:
            post["heroImage"] = hero_path
            post_file.write_text(
                json.dumps(post, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            print(f"  Updated {post_file.name} -> {hero_path}")
        else:
            print(f"  [ok] {post_file.name} already has heroImage")

# Also update public/posts.json
print("\nUpdating public/posts.json...")
posts_json_path = Path(__file__).parent / "public" / "posts.json"
if posts_json_path.exists():
    posts = json.loads(posts_json_path.read_text(encoding="utf-8"))
    changed = False
    for post in posts:
        post_id = post.get("id")
        if post_id in HERO_MAP:
            hero_path = HERO_MAP[post_id]
            if post.get("heroImage") != hero_path:
                if (IMAGES_DIR / Path(hero_path).name).exists():
                    post["heroImage"] = hero_path
                    changed = True
                    print(f"  Updated post {post_id} -> {hero_path}")
    if changed:
        posts_json_path.write_text(
            json.dumps(posts, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print("  Saved posts.json")
    else:
        print("  No changes needed")

print("\nDone.")
