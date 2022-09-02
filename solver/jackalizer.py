from PIL import Image
import os

if not os.path.exists("problems/jackal"):
    os.makedirs("problems/jackal")
for file in (file for file in os.scandir("problems") if file.is_file() and file.name.endswith(".png")):
    base = os.path.splitext(file.name)[0]
    image = Image.open(file.path).convert("RGB")
    image.save("problems/jackal/" + base + ".jpg", "jpeg", quality = 0)