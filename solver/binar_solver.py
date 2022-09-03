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
import time
import geometric_median as gm


def open_as_np(n):
    img = Image.open(f"{sys.path[0]}/../problems/{n}.png")
    a = np.asarray(img)
    return a[::-1, :].swapaxes(0, 1)


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

    def split_xy(self, x, y):
        #  3 2
        #  0 1
        return [
            Shape(x1=self.x1, y1=self.y1, x2=x, y2=y),
            Shape(x1=x, y1=self.y1, x2=self.x2, y2=y),
            Shape(x1=x, y1=y, x2=self.x2, y2=self.y2),
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
        self.cache = {}
        self.avg_color_cache = {}

    def subimage(self, sp: Shape):
        return self.ref_img[sp.x1:sp.x2, sp.y1:sp.y2]

    def improve(self, block_id: str, sp: Shape, current_color, depth) -> Option:
        # print(f"improve {block_id} at {sp} depth {depth}")

        cache_key = tuple([sp.x1, sp.x2, sp.y1, sp.y2] + list(current_color))
        if cache_key in self.cache:
            o = self.cache[cache_key]
            return Option(cmds=[cmd.replace("$", block_id) for cmd in o.cmds], score=o.score)

        options = []

        subimg = self.subimage(sp)
        current_similarity = costs.float_simil(subimg - current_color)
        # + zero cost (leave as is)
        options.append(Option(cmds=[], score=current_similarity))

        # Recolor
        color_cost = costs.get_cost(costs.COSTS.COLOR, sp.size)

        if current_similarity < color_cost:
            return options[0]  # any coloring at this level or deeper is too expensive

        # avg_color = [round(v) for v in subimg.mean(axis=0).mean(axis=0)]
        # start = time.time()
        avg_color_cache_key = (sp.x1, sp.x2, sp.y1, sp.y2)
        if avg_color_cache_key in self.avg_color_cache:
            avg_color = self.avg_color_cache[avg_color_cache_key]
        else:
            avg_color = [round(v) for v in gm.geometric_median(
                subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)), eps=0.5)]
            self.avg_color_cache[avg_color_cache_key] = avg_color
        # end = time.time()
        # print(f"geometric_median took {end - start} for {sp.size}")

        best_similarity = current_similarity
        if avg_color != current_color:
            new_similarity = costs.float_simil(subimg - avg_color)
            options.append(Option(
                cmds=[f"color [$] {avg_color}"],
                score=color_cost + new_similarity))

            if depth < self.max_depth:
                o = self.improve(block_id=block_id, sp=sp, current_color=avg_color, depth=depth+1)
                options.append(Option(
                    cmds=[f"color [$] {avg_color}"] + o.cmds,
                    score=color_cost + o.score))

            best_similarity = min(current_similarity, new_similarity)

        if depth < self.max_depth and sp.dim.w >= 4 and sp.dim.h >= 4:
            def make_program(cmd, cmd_cost, subshapes):
                ops = [
                    self.improve(
                        sp=subshape, block_id=f"$.{i}", current_color=current_color, depth=depth+1)
                    for i, subshape in enumerate(subshapes)
                ]
                subcmds = list(itertools.chain.from_iterable(
                    [o.cmds for o in ops]))
                subcmds_score = sum([o.score for o in ops])
                return Option(cmds=[cmd] + subcmds, score=cmd_cost + subcmds_score)

            mid_x = round((sp.x1 + sp.x2) / 2)
            mid_y = round((sp.y1 + sp.y2) / 2)

            lin_split_cost = costs.get_cost(costs.COSTS.LINECUT, sp.size)
            if best_similarity > color_cost + lin_split_cost:  # only try if we can recolor at least one of the new blocks
                for ratio in [0.25, 0.5, 0.75]:
                    x_pos = round(sp.x1 + sp.w * ratio)
                    options.append(make_program(cmd=f"cut [$] [x] [{x_pos}]",
                                                cmd_cost=lin_split_cost,
                                                subshapes=sp.split_x(x_pos))
                                )
                    y_pos = round(sp.y1 + sp.h * ratio)
                    options.append(make_program(cmd=f"cut [$] [y] [{y_pos}]",
                                                cmd_cost=lin_split_cost,
                                                subshapes=sp.split_y(y_pos))
                                )

            pt_split_cost = costs.get_cost(costs.COSTS.POINTCUT, sp.size)
            if best_similarity > color_cost + lin_split_cost:  # only try if we can recolor at least one of the new blocks
                options.append(make_program(cmd=f"cut [$] [{mid_x}, {mid_y}]",
                                            cmd_cost=pt_split_cost,
                                            subshapes=sp.split_xy(mid_x, mid_y))
                           )

        if depth < 1:
            options_summary = "  \n".join([f"* Score: {o.score} Cmds: {str(o.cmds)[:50]}" for o in options])
            print(f"OPTIONS FOR {block_id}:\n{options_summary}")
        best_option = None
        for o in options:
            if best_option == None or o.score < best_option.score:
                best_option = o
        # if depth < 1: print(f"{block_id} best option = {best_option}")

        self.cache[cache_key] = best_option

        return Option(cmds=[cmd.replace("$", block_id) for cmd in best_option.cmds],
                      score=best_option.score)


def main():
    for i in range(2, 26):
        img = open_as_np(i)

        print(f"# Solving {i}")
        solver = Solver(ref_img=img, max_depth=5)
        o = solver.improve("0", Shape(0, 0, 400, 400), [255, 255, 255, 255], 0)
        print(f"Solution: {o.score}")
        print("\n".join(o.cmds))

        with open(f"{sys.path[0]}/../solutions/binary_solver_3/{i}.txt", "wt") as f:
            f.write("\n".join(o.cmds)+"\n")

    print(f"DONE")



if __name__ == '__main__':
    main()
