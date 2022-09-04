from dataclasses import dataclass
from xmlrpc.client import Boolean
import numpy as np
from typing import List, Tuple

from solver.costs import simil, COSTS

from dotenv import load_dotenv
load_dotenv()

from server.api import icfpc

from blocks import Block, Problem


def main():
    for i in range(31,32):
        p = Problem(i)
        print(p.blocks[0].get_median_color(p))

if __name__ == '__main__':
    main()