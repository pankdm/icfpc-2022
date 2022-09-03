from PIL import Image
import numpy as np

import math

from dotenv import load_dotenv
load_dotenv()

from utils import open_as_np, save_from_np

from solver.costs import COSTS

from server.api import icfpc

## Usage: 
## python3 -m src.dp
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


def dist(a, b):
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2 + (a[2] -b[2])**2 + (a[3] - b[3])**2)


def save_from_np_sampled(path, np_array):
    img = Image.fromarray(np_array.swapaxes(0, 1)[::-1,:])
    img.save(path, "PNG")


def solve_dp(problem, size):
    print(f"solving problem {problem}, size = {size}")
    assert 400 % size == 0
    pixels = open_as_np_sampled(problem, size)

    rows = np.zeros((size, 4))
    prefix_sums = np.zeros((size + 1, 4))

    pixels = open_as_np(problem)

    for y in range(size):
        rows[y,:] = best_pixel(y, pixels)[:]

    for y in range(1, size + 1):
        prefix_sums[y] = prefix_sums[y - 1] + rows[y - 1]

    dp = np.zeros(size + 1)
    dp_next = [None] * (size + 1)
    dp_color = [None] * (size + 1)

    # dp is from y-th coordinate and up
    # need to compute dp[0]

    for y in reversed(range(size)):
        if y % 10 == 0:
            print(f"solving at y = {y}")
        best_score = -1
        best_cut = None
        best_color = None

        # values = list(range(y + 1, 400, 10)) + [400]
        # values = [400]
        values = list(range(y + 1, size + 1))
        for cut_y in values:
            # cut_y = size means we take everything remaining
            avg = (prefix_sums[cut_y] - prefix_sums[y]) // (cut_y - y)
            similarity = 0
            for y1 in range(y, cut_y):
                # similarity += 400 * dist(rows[y1], avg)
                for x in range(0, size):
                    similarity += dist(pixels[x,y1], avg)

            cost = round(COSTS.LINECUT * size * size / ((size - y) * size) )
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

    scalar = 400 // size

    block = "0"
    while True:
        print (f"cur = {cur}, dp = {dp[cur]}, next = {dp_next[cur]}, color = {dp_color[cur]}")
        cut_y = dp_next[cur]

        real_y = cut_y * scalar
        for y in range(scalar * cur, real_y):
            for x in range(0, 400):
                res[x, y] = dp_color[cur]

        if cut_y == size:
            # just color the remaining block
            prog.append(f"color [{block}] {to_color(dp_color[cur])}")
            break
        else:
            prog.append(f"cut [{block}] [y] [{real_y}]")
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

    print("Submitting...")
    icfpc.submit(problem, code)


def open_as_np_sampled(n, size):
    img=Image.open(f"problems/{n}.png")
    img = img.resize((size, size))
    img = img.resize((400, 400))
    a=np.asarray(img)
    pixels = a[::-1,:].swapaxes(0,1)
    return pixels


def resize(n):
    for i in range(1, 101):
        if 400 % i == 0:
            pixels = open_as_np(n)
            print (f"resampling {n}, size = {i}")
            res = my_resample(pixels, i)

            save_from_np(f"viz/resize/{n}-{i}.png", res)

def my_resample(pixels, size):
    assert 400 % size == 0
    res = np.zeros((400, 400, 4))

    step = 400 // size
    for y in range(0, 400, step):
        for x in range(0, 400, step):
            sum = np.zeros((4))
            for dy in range(0, step):
                for dx in range(0, step):
                    sum += pixels[x + dx, y + dy, :]
            sum = sum // (step * step)
            # print (x, y, sum)

            for dy in range(0, step):
                for dx in range(0, step):
                    res[x + dx, y + dy, :] = sum
    return res.astype(dtype='uint8')






def main():
    # for i in range(5, 26):
    #     solve_dp(i, 100)
    # resize(15)
    # for i in range(21, 26):
    #     print (f"solving {i}")
    #     # solve(i)
    #     solve1block(i)

    # for i in range(1, 21):
    #     print (f"solving {i}")
    #     solve(i)
    #     # solve1block(i)

    # solve_dp(1)

    for i in range(1, 26):
        resize(i)


if __name__ == "__main__":
    main()
