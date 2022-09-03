from PIL import Image
import numpy as np

import math

from dotenv import load_dotenv
load_dotenv()

from utils import open_as_np, save_from_np

from solver.costs import COSTS

from server.api import icfpc

## Usage: 
## python3 -m src.1d
##

def best_pixel(y, pixels):
    sum = [0, 0, 0, 0]
    for x in range(400):
        p = pixels[(x, y)]
        for i in range(4):
            sum[i] += p[i]

    for i in range(4):
        sum[i] //= 400
    return sum

def to_color(color):
    return "[{}, {}, {}, {}]".format(int(color[0]), int(color[1]), int(color[2]), int(color[3]))


def solve(problem):
    # img = Image.open(f"problems/{problem}.png").convert("RGBA")
    pixels = open_as_np(problem)

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

    # icfpc.submit(problem, solution)

def dist(a, b):
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2 + (a[2] -b[2])**2 + (a[3] - b[3])**2)


def solve_dp(problem):
    rows = np.zeros((401, 4))
    prefix_sums = np.zeros((401, 4))

    pixels = open_as_np(problem)

    for y in range(400):
        rows[y,:] = best_pixel(y, pixels)[:]

    for y in range(1, 401):
        prefix_sums[y] = prefix_sums[y - 1] + rows[y - 1]

    dp = np.zeros(401)
    dp_next = [None] * 401
    dp_color = [None] * 401


    # dp is from y-th coordinate and up
    # need to compute dp[0]

    for y in reversed(range(400)):
        if y % 10 == 0:
            print(f"solving at y = {y}")
        best_score = -1
        best_cut = None
        best_color = None

        # values = list(range(y + 1, 400, 10)) + [400]
        values = [400]
        for cut_y in values:
            # cut_y = 400 means we take everything remaining
            avg = (prefix_sums[cut_y] - prefix_sums[y]) // (cut_y - y)
            similarity = 0
            for y1 in range(y, cut_y):
                similarity += 400 * dist(rows[y1], avg)
                # for x in range(0, 400):
                #     similarity += dist(pixels[x,y1], avg)

            cost = round(COSTS.LINECUT * 400 * 400 / ((400 - y) * 400) )
            score = round(0.005 * similarity) + cost + dp[cut_y]
            if best_score == -1 or score < best_score:
                best_score = score
                best_cut = cut_y
                best_color = avg

        dp[y] = best_score
        dp_next[y] = best_cut
        dp_color[y] = best_color

    prog = []
    cur = 0
    print (f"dp = {dp[cur]}, next = {dp_next[cur]}, color = {dp_color[cur]}")

    res = np.zeros((400, 400, 4), dtype='uint8')


    block = "0"
    while True:
        # print (f"dp = {dp[cur]}, next = {dp_next[cur]}, color = {dp_color[cur]}")
        cut_y = dp_next[cur]
        for y in range(cur, cut_y):
            for x in range(0, 400):
                res[x, y] = dp_color[cur]

        if cut_y == 400:
            # just color the remaining block
            prog.append(f"color [{block}] {to_color(dp_color[cur])}")
            break
        else:
            prog.append(f"cut [{block}] [y] [{cut_y}]")
            # bottom block is .0 - coloring it
            prog.append(f"color [{block}.0] {to_color(dp_color[cur])}")
            # upper block is .1 - now use it
            block = f"{block}.1"

        cur = cut_y
    
    save_from_np(f"viz/1d/{problem}.png", res)

    code = "\n".join(prog)
    f = open(f"solutions/1d-dynamic/{problem}.txt", "wt")
    f.write(code)
    f.close()

    # print("Submitting...")
    # icfpc.submit(problem, code)



def solve1block(problem):
    img = Image.open(f"problems/{problem}.png")
    a=np.asarray(img)
    mean_color = a.mean(axis=(0,1)).round().astype(int).tolist()
    code = f"color [0] {mean_color}"
    icfpc.submit(problem, code)


# def solve_dp():
#     dp = np.array(401)
#     dp[0] = 0



def main():
    # for i in range(21, 26):
    #     print (f"solving {i}")
    #     # solve(i)
    #     solve1block(i)

    # for i in range(1, 21):
    #     print (f"solving {i}")
    #     solve(i)
    #     # solve1block(i)

    solve_dp(2)


if __name__ == "__main__":
    main()
