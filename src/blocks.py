from dataclasses import dataclass
from xmlrpc.client import Boolean
import numpy as np
from typing import List, Tuple, Deque

from solver.costs import simil, COSTS
from solver.geometric_median import geometric_median
from utils import open_as_np
import json

from dotenv import load_dotenv
load_dotenv()

from server.api import icfpc

def read_initial_json(n):
    with open(f"./problems/{n}.initial.json", "rt") as f:
        json_obj = json.load(f)
        blocks=[
            Block(
                x=b["bottomLeft"][0],
                y=b["bottomLeft"][1],
                w=b["topRight"][0]-b["bottomLeft"][0],
                h=b["topRight"][1]-b["bottomLeft"][1],
                id=b["blockId"],
                color=tuple(b["color"]))
            for b in json_obj["blocks"]
        ]
        return blocks
class Problem:
    def __init__(self, n):
        self.code: List = []
        self.costs: List = []
        self.a = open_as_np(n)
        self.simils: List = []
        self.cnt = 1
        if n>25:
            self.blocks = read_initial_json(n)
            self.cnt = len(self.blocks)
            self.N = round(self.cnt**0.5)
        else:
            self.blocks = [Block(0,0,400,400,"0")]

    def pop(self):
        if self.code[-1].startswith("merge"):
            self.cnt-=1
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

    def diff(self, problem: Problem):
        return simil(problem.a[self.x:self.x+self.w, self.y:self.y+self.h]-np.array(self.color))

    def diff_mean(self, problem: Problem):
        return simil(problem.a[self.x:self.x+self.w, self.y:self.y+self.h]-self.get_mean_color(problem))

    def get_mean_color(self, problem: Problem):
        return problem.a[self.x:self.x+self.w, self.y:self.y+self.h].mean(axis=(0,1)).round()

    def get_median_color(self, problem: Problem):
        return geometric_median(problem.a[self.x:self.x+self.w, self.y:self.y+self.h].reshape((-1 ,4)), eps=0.1).round()
    
    def diff_median(self, problem: Problem):
        return simil(problem.a[self.x:self.x+self.w, self.y:self.y+self.h]-self.get_median_color(problem))

    def set_best_color(self, problem: Problem):
        mean_color = self.get_median_color(problem)
        self.set_color(tuple(mean_color.astype(int)), problem)

    def cost_mult(self):
        return 400.0*400.0/self.size()

    def merge(self, b2: 'Block', p: Problem):
        assert (self.x==b2.x and self.w==b2.w and (self.y+self.h==b2.y or b2.y+b2.h==self.y) or 
        self.y==b2.y and self.h==b2.h and (self.x+self.w==b2.x or b2.x+b2.w==self.x))
        if self.x==b2.x and self.w==b2.w:
            x=self.x
            w=self.w
            h=self.h+b2.h
            if self.y+self.h==b2.y:
                y=self.y
            elif b2.y+b2.h==self.y:
                y=b2.y
            else:
                raise
        elif self.y==b2.y and self.h==b2.h:
            y=self.y
            h=self.h
            w=self.w+b2.w
            if self.x+self.w==b2.x:
                x=self.x
            elif b2.x+b2.w==self.x:
                x=b2.x
            else:
                raise
        else:
            raise
        block = Block(x,y,w,h,p.cnt)
        p.cnt+=1
        mult = self.cost_mult() if self.size() >= b2.size() else b2.cost_mult()
        p.costs.append(COSTS.MERGE*mult)
        p.code.append(f"merge [{self.id}] [{b2.id}]")
        return block




def find_best_pointcut(b: Block, p: Problem, cur_score: int, N=10):
    b2=b.pointcut(b.w//2, b.h//2, p)
    score = p.costs[-1]+sum(c.diff_mean(p)+round(COSTS.COLOR*c.cost_mult()) for c in b2)
    p.pop()
    if score >= cur_score:
        return score, (0,0)
    best_score = 1000000
    best = None
    for i in range(1, N):
        for j in range(1, N):
            b2=b.pointcut(b.w//N*i, b.h//N*j, p)
            score=p.costs[-1]+sum(c.diff_mean(p)+round(COSTS.COLOR*c.cost_mult()) for c in b2)
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
        p.simils.append((b.diff(p), b.id))
        return
    score = b.diff_mean(p) + round(COSTS.COLOR*b.cost_mult())
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
        p.simils.append((b.diff(p), b.id))


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
