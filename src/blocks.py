from dataclasses import dataclass
from xmlrpc.client import Boolean
import numpy as np
from typing import List, Tuple, Deque

from solver.costs import simil, COSTS
from utils import open_as_np

from dotenv import load_dotenv
load_dotenv()

from server.api import icfpc

class Problem:
    def __init__(self, n):
        self.code: List = []
        self.costs: List = []
        self.a = open_as_np(n)
        self.simils: List = []

    def pop(self):
        self.code.pop()
        self.costs.pop()
    
    def output(self):
        return "\n".join(self.code)
    
    def total_cost(self):
        return sum(self.costs)

    def total_similarity(self):
        return sum(s for s,b in self.simils)

    def total_score(self):
        return self.total_cost() + self.total_similarity()


@dataclass
class Block:
    x: int
    y: int
    w: int
    h: int
    id: str
    color: Tuple = (255,255,255,255)
    is_leaf: Boolean = False
    depth: int = 0

    # def __init__(self):
    #     self.x=self.y=0
    #     self.w=self.h=400
    #     self.id="0"
        
    def size(self):
        return self.w*self.h


    def pointcut(self, dx, dy, problem: Problem):
        """Cut at dx,dy offset of the block origin"""
        assert 0<=dx<self.w and 0<=dy<self.h
        problem.code.append(f"cut [{self.id}] [{self.x+dx}, {self.y+dy}]")
        problem.costs.append(round(COSTS.POINTCUT*400*400/self.size()))
        return [
            Block(self.x, self.y, dx, dy, self.id+".0", self.color, depth=self.depth+1),
            Block(self.x+dx, self.y, self.w-dx, dy, self.id+".1", self.color, depth=self.depth+1),
            Block(self.x+dx, self.y+dy, self.w-dx, self.h-dy, self.id+".2", self.color, depth=self.depth+1),
            Block(self.x, self.y+dy, dx, self.h-dy, self.id+".3", self.color, depth=self.depth+1),
        ]

    def linecutx(self, dx, problem: Problem):
        """Cut by line at dx offset of the block origin"""
        assert 0<=dx<self.w
        problem.code.append(f"cut [{self.id}] [x] [{self.x+dx}]")
        problem.costs.append(round(COSTS.LINECUT*400*400/self.size()))
        return [
            Block(self.x, self.y, dx, self.h, self.id+".0", self.color, depth=self.depth+1),
            Block(self.x+dx, self.y, self.w-dx, self.h, self.id+".1", self.color, depth=self.depth+1),
        ]

    def linecuty(self, dy, problem: Problem):
        """Cut by line at dy offset of the block origin"""
        assert 0<=dy<self.h
        problem.code.append(f"cut [{self.id}] [y] [{self.y+dy}]")
        problem.costs.append(round(COSTS.LINECUT*400*400/self.size()))
        return [
            Block(self.x, self.y, self.w, dy, self.id+".0", self.color, depth=self.depth+1),
            Block(self.x, self.y+dy, self.w, self.h-dy, self.id+".1", self.color, depth=self.depth+1),
        ]

    def set_color(self, col: Tuple, problem: Problem):
        self.color = col
        problem.code.append(f"color [{self.id}] {str(list(self.color))}")
        problem.costs.append(round(COSTS.COLOR*400*400/self.size()))

    def simil(self, problem: Problem):
        return simil(problem.a[self.x:self.x+self.w, self.y:self.y+self.h]-np.array(self.color))

    def simil_best(self, problem: Problem):
        return simil(problem.a[self.x:self.x+self.w, self.y:self.y+self.h]-self.get_best_color(problem))

    def get_best_color(self, problem: Problem):
        return problem.a[self.x:self.x+self.w, self.y:self.y+self.h].mean(axis=(0,1)).round()

    def set_best_color(self, problem: Problem):
        mean_color = self.get_best_color(problem)
        self.set_color(tuple(mean_color.astype(int)), problem)

    def cost_mult(self):
        return 400*400/self.size()


def find_best_pointcut(b: Block, p: Problem, cur_score: int, N=10):
    b2=b.pointcut(b.w//2, b.h//2, p)
    score = p.costs[-1]+sum(c.simil_best(p)+round(COSTS.COLOR*c.cost_mult()) for c in b2)
    p.pop()
    if score >= cur_score:
        return score, (0,0)
    best_score = 1000000
    best = None
    for i in range(1, N):
        for j in range(1, N):
            b2=b.pointcut(b.w//N*i, b.h//N*j, p)
            score=p.costs[-1]+sum(c.simil_best(p)+round(COSTS.COLOR*c.cost_mult()) for c in b2)
            p.pop()
            if score<best_score:
                best_score = score
                best = (i,j)
    return best_score, (b.w//N*best[0], b.h//N*best[1])

GREED = 0.95
MAX_DEPTH = 5

def dfs(b: Block, p: Problem):
    if b.depth>=MAX_DEPTH:
        b.is_leaf = True
        b.set_best_color(p)
        p.simils.append((b.simil(p), b.id))
        return
    score = b.simil_best(p) + round(COSTS.COLOR*b.cost_mult())
    print(f"Searching block {b.id}, {b.size()}, {score=}")
    score2, (dx, dy) = find_best_pointcut(b, p, score)
    if score2<GREED*score:
        blocks = b.pointcut(dx, dy, p)
        print(f"Splitting block {b.id}, new score {score2}")
        for bl in blocks:
            dfs(bl, p)
    else:
        b.is_leaf = True
        b.set_best_color(p)
        p.simils.append((b.simil(p), b.id))


def main():
    for i in range(23,26):
        b=Block(0,0,400,400,"0")
        p=Problem(i)
        dfs(b, p)
        print(i, p.total_cost(), p.total_similarity(),  p.total_score())
        code = p.output()
        icfpc.submit(i, code)

if __name__ == '__main__':
    main()
