from dataclasses import dataclass
import numpy as np
from typing import List, Tuple

from solver.costs import simil, COSTS
from src.utils import open_as_np

class Problem:
    def __init__(self, n):
        self.code: List = []
        self.costs: List = []
        self.a = open_as_np(n)


@dataclass
class Block:
    x: int
    y: int
    w: int
    h: int
    id: str
    color: Tuple = (255,255,255,255)

    def size(self):
        return self.w*self.h


    def pointcut(self, dx, dy, problem: Problem):
        """Cut at dx,dy offset of the block origin"""
        assert 0<=dx<=self.w and 0<=dy<=self.h
        problem.code.append(f"cut [{self.id}] [{dx}, {dy}]")
        problem.costs.append(round(COSTS.POINTCUT*400*400/self.size()))
        return [
            Block(self.x, self.y, dx, dy, self.id+".0", self.color),
            Block(self.x+dx, self.y, self.w-dx, dy, self.id+".1", self.color),
            Block(self.x+dx, self.y+dy, self.w-dx, self.h-dy, self.id+".2", self.color),
            Block(self.x, self.y+dy, dx, self.h-dy, self.id+".3", self.color),
        ]

    def set_color(self, col: Tuple, problem: Problem):
        self.color = col
        problem.code.append(f"color [{self.id}] {str(list(self.color))}")
        problem.costs.append(round(COSTS.COLOR*400*400/self.size()))

    def simil(self, problem: Problem):
        return simil(problem.a[self.x:self.x+self.w, self.y:self.y+self.h]-np.array(self.color))

    def set_best_color(self, problem: Problem):
        mean_color = problem.a[self.x:self.x+self.w, self.y:self.y+self.h].mean(axis=(0,1)).round()
        self.set_color(tuple(mean_color.astype(int)), problem)


def manual_solve20():
    b=Block(0,0,400,400,"0")
    p=Problem(20)
    b2=b.pointcut(264, 204, p)
    b3=b2[0].pointcut(128,68, p)
    bs=b3+b2[1:]
    for b in bs:
        b.set_best_color(p)
    score = sum(p.costs) + sum(b.simil(p) for b in bs)
    code = "\n".join(p.code)
    print(code)
    print(score)