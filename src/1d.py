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

def solve1block(problem):
    img = Image.open(f"problems/{problem}.png")
    a=np.asarray(img)
    mean_color = a.mean(axis=(0,1)).round().astype(int).tolist()
    code = f"color [0] {mean_color}"
    # icfpc.submit(problem, code)

    f = open(f"solutions/1d/{problem}.txt", "wt")
    f.write(code)
    f.close()



# def solve_dp():
#     dp = np.array(401)
#     dp[0] = 0



def main():
    for i in range(1, 21):
        print (f"solving {i}")
        # solve(i)
        solve1block(i)

    # for i in range(1, 21):
    #     print (f"solving {i}")
    #     solve(i)
    #     # solve1block(i)


if __name__ == "__main__":
    main()
