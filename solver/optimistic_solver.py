import imp
from turtle import shape
from matplotlib.pyplot import flag
import costs
import dataclasses
import numpy as np
import typing
import itertools
import requests
import os.path
from PIL import Image
import numpy as np
import sys

import numpy as np
from scipy.spatial.distance import cdist, euclidean

def geometric_median(X, eps=1e-5):
    y = np.mean(X, 0)

    while True:
        D = cdist(X, [y])
        nonzeros = (D != 0)[:, 0]

        Dinv = 1 / D[nonzeros]
        Dinvs = np.sum(Dinv)
        W = Dinv / Dinvs
        T = np.sum(W * X[nonzeros], 0)

        num_zeros = len(X) - np.sum(nonzeros)
        if num_zeros == 0:
            y1 = T
        elif num_zeros == len(X):
            return y
        else:
            R = (T - y) * Dinvs
            r = np.linalg.norm(R)
            rinv = 0 if r == 0 else num_zeros/r
            y1 = max(0, 1-rinv)*T + min(1, rinv)*y

        if euclidean(y, y1) < eps:
            return y1

        y = y1

def open_as_np(n):
    img=Image.open(f"{sys.path[0]}/../problems/{n}.png")
    a=np.asarray(img)
    return a[::-1,:].swapaxes(0,1)
    
@dataclasses.dataclass
class Point:
    x: int
    y: int


@dataclasses.dataclass
class Size:
    w: int
    h: int


@dataclasses.dataclass
class Shape:
    x: int
    y: int
    w: int
    h: int

    def __init__(self, x1, y1, x2, y2):
        self.x = x1
        self.y = y1
        self.w = x2 - x1
        self.h = y2 - y1

    @property
    def x1(self):
        return self.x

    @property
    def y1(self):
        return self.y

    @property
    def x2(self):
        return self.x + self.w

    @property
    def y2(self):
        return self.y + self.h

    @property
    def pt(self):
        return Point(self.x, self.y)

    @property
    def dim(self):
        return Size(self.w, self.h)

    @property
    def pt2(self):
        return Point(self.x2, self.y2)

    @property
    def size(self):
        return self.dim.w * self.dim.h

    def split_x(self, x):
        return [Shape(x1=self.x1, y1=self.y1, x2=x, y2=self.y2),
                Shape(x1=x, y1=self.y1, x2=self.x2, y2=self.y2)]

    def split_y(self, y):
        return [Shape(x1=self.x1, y1=self.y1, x2=self.x2, y2=y),
                Shape(x1=self.x1, y1=y, x2=self.x2, y2=self.y2)]

    def split_pt(self, x, y):
        return [
            Shape(x1=self.x1, y1=self.y1, x2=x, y2=y),
            Shape(x1=x, y1=self.y1, x2=self.x2, y2=y),
            Shape(x1=x, y1=self.y, x2=self.x2, y2=self.y2),
            Shape(x1=self.x1, y1=y, x2=x, y2=self.y2),
        ]

@dataclasses.dataclass
class Option:
    cmds: typing.List[str]
    score: float

class Solver:
    def __init__(self, ref_img, max_depth=4):
        self.ref_img = ref_img
        self.max_depth = max_depth

    def subimage(self, sp: Shape):
        return self.ref_img[sp.x1:sp.x2, sp.y1:sp.y2]

    def improve(self, block_id: str, sp: Shape, current_color, depth) -> Option:
        options = []

        subimg = self.subimage(sp)
        current_similarity = costs.float_simil(subimg - current_color)
        options.append(Option(cmds=[], score=current_similarity))  # + zero cost (leave as is)

        # Recolor
        color_cost = costs.get_cost(costs.COSTS.COLOR, sp.size)
        # avg_color = [round(v) for v in subimg.mean(axis=0).mean(axis=0)]
        avg_color = geometric_median(subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)))
        options.append(Option(
            cmds=[f"color {block_id} {avg_color}"],
            score=color_cost + costs.float_simil(subimg - avg_color)))

        if depth < self.max_depth:
            # Split X (fast approximation)
            best_option = (-1, -1)
            for x in range(sp.x1 + 1, sp.x2):
                sps = sp.split_x(x)
                o1 = self.improve(
                    sp=sps[0], block_id=f"{block_id}.0", current_color=current_color,
                    depth=self.max_depth)  # quick try to recolor
                o2 = self.improve(
                    sp=sps[1], block_id=f"{block_id}.1", current_color=current_color,
                    depth=self.max_depth)  # quick try to recolor
                if best_option[0] == -1 or (o1.score + o2.score < best_option[1]):
                    best_option = (x, o1.score + o2.score)

            # Split X for real at x=best_option[0]
            sps = sp.split_x(best_option[0])
            o1 = self.improve(
                sp=sps[0], block_id=f"{block_id}.0", current_color=current_color,
                depth=depth)
            o2 = self.improve(
                sp=sps[1], block_id=f"{block_id}.1", current_color=current_color,
                depth=depth)

            line_cut_cost = costs.get_cost(costs.COSTS.LINECUT, sp.size)
            options.append(
                Option(cmds=[f"cut {block_id} x [{best_option[0]}]"] + 
                o1.cmds + o2.cmds, score=line_cut_cost + o1.score + o2.score)
            )

            # Split Y (fast approximation)
            best_option = (-1, None)
            for y in range(sp.pt.y + 1, sp.pt2.y - 1):
                sps = sp.split_y(y)
                o1 = self.improve(
                    sp=sps[0], block_id=f"{block_id}.0", current_color=current_color, depth=depth + 1)
                o2 = self.improve(
                    sp=sps[1], block_id=f"{block_id}.1", current_color=current_color, depth=depth + 1)
                if best_option[0] == -1 or (o1.score + o2.score < best_option[1]):
                    best_option = (x, o1.score + o2.score)

            # Split Y (for real)
            sps = sp.split_y(best_option[0])
            o1 = self.improve(
                sp=sps[0], block_id=f"{block_id}.0", current_color=current_color, depth=depth + 1)
            o2 = self.improve(
                sp=sps[1], block_id=f"{block_id}.1", current_color=current_color, depth=depth + 1)
            options.append(
                Option(cmds=[f"cut {block_id} y [{best_option[0]}]"] + 
                o1.cmds + o2.cmds, score=line_cut_cost + o1.score + o2.score)
            )

            # Split Pt (fast approximation)
            best_option = (None, None)
            for x in range(sp.pt.x + 1, sp.pt2.x - 1):
                for y in range(sp.pt.y + 1, sp.pt2.y - 1):
                    sps = sp.split_pt(x, y)
                    ops = [
                        self.improve(
                        sp=sps[i], block_id=f"{block_id}.{i}", current_color=current_color, depth=depth+1)
                        for i in range(0, len(sps))
                    ]
                    o_score = sum([o.score for o in ops])
                    if best_option[0] == None or (o_score < best_option[1]):
                        best_option = ((x, y), o_score)

            pt_cut_cost = costs.get_cost(costs.COSTS.POINTCUT, sp.size)
            sps = sp.split_pt(*best_option[0])
            ops = [
                self.improve(
                sp=sps[i], block_id=f"{block_id}.{i}", current_color=current_color, depth=depth+1)
                for i in range(0, len(sps))
            ]
            o_score = sum([o.score for o in ops])
            options.append(
                Option(cmds=[f"cut {block_id} {best_option[0]}"] + 
                list(itertools.chain.from_iterable([o.cmds for o in ops])),
                score=pt_cut_cost + o1.score + o2.score)
            )
        
        print(f"options = {options}")
        best_option = None
        for o in options:
            if best_option == None or o.score < best_option.score:
                best_option = o

        return o


def main():
    img = open_as_np(2)
    solver = Solver(ref_img=img, max_depth=1)
    o = solver.improve(0, Shape(0, 0, 400, 400), [255,255,255,255], 0)
    print(f"Solution: {o}")


if __name__ == '__main__':
    main()