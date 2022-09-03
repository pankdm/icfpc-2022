from PIL import Image
from collections import defaultdict

def to_color(color):
    return "[{}, {}, {}, {}]".format(color[0], color[1], color[2], color[3])

img = Image.open("problems/1.png").convert("RGBA")
pixels = img.load()

w, h = img.size
size = 400
assert(size == w)
assert(size == h)

values = set()
count = defaultdict(int)

for x in range(w):
    for y in range(h):
        p = pixels[(x, y)]
        values.add(p)
        count[p] += 1

print("total values = ", len(values))
# print(list(sorted(values)))
# print (count)

top = list(count.items())
top.sort(key = lambda x: x[1], reverse=True)
print (top[:10])

black = to_color((0, 0, 0, 255))
white = to_color((255, 255, 255, 255))
blue = to_color((0, 74, 173, 255))

d = size // 10

# (0, 0) is bottom left corner


y_offset = 2 * d

prog = [
    f"color [0] {blue}",
    f"cut [0] [y] [{2 * d}]",
    f"cut [0.1] [x] [{size - 2 * d}]",
    f"color [0.1.0] {white}",
    f"cut [0.1.0] [{4 * d}, {y_offset + 4 * d}]",  # -> 4 x 4
    f"color [0.1.0.1] {black}", 
    f"color [0.1.0.3] {black}",

    f"cut [0.1.0.0] [{2 * d}, {y_offset + 2 * d}]", # -> 2 x 2
    f"color [0.1.0.0.1] {black}",
    f"color [0.1.0.0.3] {black}",

    f"cut [0.1.0.0.0] [{d}, {y_offset + d}]", # -> 1 x 1
    f"cut [0.1.0.0.1] [{3 * d}, {y_offset + d}]", # -> 1 x 1

    f"swap [0.1.0.0.0.3] [0.1.0.0.1.2]",
    f"swap [0.1.0.0.0.1] [0.1.0.0.1.0]",

    f"cut [0.1.0.0.0] [{d}, {y_offset + d}]", # -> 1 x 1
    f"cut [0.1.0.0.1] [{3 * d}, {y_offset + d}]", # -> 1 x 1

    f"swap [0.1.0.0.0.3] [0.1.0.0.1.2]",
    f"swap [0.1.0.0.0.1] [0.1.0.0.1.0]",
]

print ("")
print ("\n".join(prog))

