"""Generate blog hero image using Gemini."""
import os, sys
from pathlib import Path

# Load key from backend .env
env_path = Path(__file__).parent.parent / "backend" / ".env"
for line in env_path.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip()

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

prompt = (
    "Abstract editorial illustration. A shield made of golden light on the left side, "
    "protecting a stack of clean, organized documents. On the right side, the same documents "
    "shatter into digital fragments and red-tinted glitch particles dissolving into darkness. "
    "Deep navy blue (#0B1A2E) background. Gold (#C8A232) warm glow on the protected side. "
    "Muted crimson fragments on the broken side. "
    "Style: Modern flat illustration with geometric shapes, no photorealism. "
    "Absolutely no text, no words, no letters, no numbers anywhere in the image. "
    "Clean, minimal, professional. Suitable as a widescreen blog hero banner."
)

print("Generating image...")
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

out = Path(__file__).parent / "public" / "images" / "ai-tools-va-claim-hero.png"
for part in response.parts:
    if part.inline_data is not None:
        image = part.as_image()
        image.save(str(out))
        print(f"Saved to {out}")
        sys.exit(0)
    elif part.text is not None:
        print(part.text)

print("No image generated")
sys.exit(1)
