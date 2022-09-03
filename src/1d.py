from PIL import Image
import numpy as np

from dotenv import load_dotenv
load_dotenv()

from server.api import icfpc

## Usage: 
## python3 -m src.1d
##

def best_pixel(y, pixels):
    sum = [0, 0, 0, 0]
    for x in range(400):
        p = pixels[(x, 400 - y)]
        for i in range(4):
            sum[i] += p[i]

    for i in range(4):
        sum[i] //= 400
    return sum

def to_color(color):
    return "[{}, {}, {}, {}]".format(color[0], color[1], color[2], color[3])


def solve(problem):
    img = Image.open(f"problems/{problem}.png").convert("RGBA")
    pixels = img.load()

    res = []
    block = "0"
    for y in range(1, 400):
        sum = best_pixel(y, pixels)
        res.append(f"cut [{block}] [y] [{y}]")
        # bottom block is .0 - coloring it
        res.append(f"color [{block}.0] {to_color(sum)}")
        # upper block is .1 - now use it
        block = f"{block}.1"
    
    solution = "\n".join(res)

    f = open(f"solutions/1d/{problem}.txt", "wt")
    f.write(solution)
    f.close()

    icfpc.submit(problem, solution)


def solve1block(problem):
    img = Image.open(f"problems/{problem}.png")
    a=np.asarray(img)
    mean_color = a.mean(axis=(0,1)).round().astype(int).tolist()
    code = f"color [0] {mean_color}"
    icfpc.submit(problem, code)


# def solve_dp():
#     dp = np.array(401)
#     dp[0] = 0

#     for y in range(1, 401):
#         for next in range(1, y + 1):
#             # cut is from 


def main():
    for i in range(21, 26):
        print (f"solving {i}")
        # solve(i)
        solve1block(i)


if __name__ == "__main__":
    main()
