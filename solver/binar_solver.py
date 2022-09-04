from audioop import avg
from glob import glob
import imp
import numbers
from turtle import shape
from matplotlib.pyplot import flag
from soupsieve import match

try:
    import costs
except ImportError:
    import solver.costs as costs

import dataclasses
import numpy as np
import typing
import itertools
import requests
import os.path
import os
from PIL import Image
import numpy as np
import sys
import time

try:
    import geometric_median as gm
except ImportError:
    import solver.geometric_median as gm
    
import json

PROBLEMS_DIR = "./problems"


def open_as_np(n):
    img = Image.open(f"{PROBLEMS_DIR}/{n}.png")
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

    def overlaps(self, other: "Shape"):
        if other.x1 >= self.x2 or self.x1 >= other.x2:
            return False
        if other.y1 >= self.y2 or self.y1 >= other.y2:
            return False
        return True

    def contains(self, other: "Shape"):
        return other.x1 >= self.x1 and other.x2 <= self.x2 and other.y1 >= self.y1 and other.y2 <= self.y2


@dataclasses.dataclass
class Program:
    cmds: typing.List[str]
    score: float


@dataclasses.dataclass
class Block:
    block_id: str
    shape: Shape
    color: typing.List[int]

    def get_simil_to_color(self, color: typing.List[int]):
        return costs.float_simil(np.array([[self.color]]) - np.array([[color]])) * self.shape.w * self.shape.h


@dataclasses.dataclass
class InitialJSON:
    width: int
    height: int
    blocks: typing.List[Block]


def read_initial_json(n) -> InitialJSON:
    with open(f"{PROBLEMS_DIR}/{n}.initial.json", "rt") as f:
        json_obj = json.load(f)
        return InitialJSON(
            width=json_obj["width"],
            height=json_obj["height"],
            blocks=[
                Block(
                    block_id=block_obj["blockId"],
                    shape=Shape(
                        x1=block_obj["bottomLeft"][0],
                        y1=block_obj["bottomLeft"][1],
                        x2=block_obj["topRight"][0],
                        y2=block_obj["topRight"][1]),
                    color=block_obj["color"])
                for block_obj in json_obj["blocks"]
            ])


@dataclasses.dataclass
class QuadTreeNode:
    zoom: int
    shape: Shape
    med_color: typing.List[int]
    children: typing.List["QuadTreeNode"]

    def query(self, shape: Shape, max_zoom=-1):
        if shape.contains(self.shape):
            return [self]
        if not shape.overlaps(self.shape):
            return []
        if not self.children or (max_zoom >=0 and self.zoom >= max_zoom):
            return [self]
        return itertools.chain.from_iterable([child.query(shape) for child in self.children])


MED_COLOR_TIME = 0
FAST_MED_COLOR_TIME = 0


class Solver:
    def __init__(self, ref_img, max_depth=4, initial_blocks=None):
        self.ref_img = ref_img
        self.max_depth = max_depth
        self.cache = {}
        self.avg_color_cache = {}
        self.initial_blocks = initial_blocks or []
        self.med_color_quad_tree = None

    def subimage(self, sp: Shape):
        return self.ref_img[sp.x1:sp.x2, sp.y1:sp.y2]

    def compute_geom_med_color(self, sp: Shape):
        subimg = self.subimage(sp)
        return [round(v) for v in gm.geometric_median(
            subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)), eps=0.5)]

    def get_geom_med_color(self, sp: Shape):
        global MED_COLOR_TIME
        global FAST_MED_COLOR_TIME

        avg_color_cache_key = (sp.x1, sp.x2, sp.y1, sp.y2)
        if avg_color_cache_key in self.avg_color_cache:
            return self.avg_color_cache[avg_color_cache_key]

        # start = time.time()
        # subimg = self.subimage(sp)
        # med_color = [round(v) for v in gm.geometric_median(
        #     subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)), eps=0.5)]
        # end = time.time()

        #     print(f"regular geometric_median took {end - start} for {sp.size} (TOTAL={MED_COLOR_TIME})")

        # min_size = min(sp.w, sp.h)
        # max_zoom = 0
        # zoom_limit = 200
        # while min_size <= zoom_limit and zoom_limit >= 10:
        #     max_zoom += 1
        #     zoom_limit /= 2
            
        start = time.time()
        med_color = self.compute_geom_med_color(sp)
        end = time.time()
        MED_COLOR_TIME += (end - start)


        # med_color = self.fast_med_color(sp)
        # FAST_MED_COLOR_TIME += (end - start)
        # # diff = np.array(med_color) - np.array(fast_med_color)
        # # print(f"fast geometric_median took {end - start}, diff={diff} (TOTAL={FAST_MED_COLOR_TIME})")

        self.avg_color_cache[avg_color_cache_key] = med_color

        return med_color

    def precompute_quad_tree(self):
        max_zoom = 6

        def create_node(zoom, shape: Shape):
            if zoom + 1 < max_zoom:
                mid_x = round(shape.x1 + shape.w / 2)
                mid_y = round(shape.y1 + shape.h / 2)
                children = [create_node(zoom=zoom + 1, shape=sp)
                            for sp in shape.split_xy(mid_x, mid_y)]
            else:
                children = []
            return QuadTreeNode(
                zoom=zoom, shape=shape, med_color=self.compute_geom_med_color(shape), children=children)
        self.med_color_quad_tree = create_node(
            zoom=0, shape=Shape(0, 0, 400, 400))

    def fast_med_color(self, shape):
        nodes = list(self.med_color_quad_tree.query(shape))
        med_colors = []
        max_zoom = max([node.zoom for node in nodes])
        for node in nodes:
            mult = 1 << (max_zoom - node.zoom)
            med_colors.extend([node.med_color] * mult)

        return [round(v) for v in gm.geometric_median(np.array(med_colors), eps=0.5)]

    def get_x_splits(self, sp: Shape):
        if sp.w > 100:
            return [0.25, 0.5, 0.75]
        elif sp.w > 10:
            return [0.5]
        else:
            return []

    def get_y_splits(self, sp: Shape):
        if sp.h > 100:
            return [0.25, 0.5, 0.75]
        elif sp.h > 10:
            return [0.5]
        else:
            return []

    def get_xy_splits(self, sp: Shape):
        if sp.w > 100 and sp.h > 100:
            return [(0.5, 0.5)]
        else:
            return []

    def improve(self, block_id: str, sp: Shape, current_color, depth, try_recolor=True) -> Program:
        # print(f"improve {block_id} at {sp} depth {depth}")

        cache_key = tuple([sp.x1, sp.x2, sp.y1, sp.y2] + list(current_color))
        if cache_key in self.cache:
            o = self.cache[cache_key]
            return Program(cmds=[cmd.replace("$", block_id) for cmd in o.cmds], score=o.score)

        options = []

        subimg = self.subimage(sp)
        current_similarity = costs.float_simil(subimg - current_color)

        # Leave as is.
        options.append(Program(cmds=[], score=current_similarity))

        color_cost = costs.get_cost(costs.COSTS.COLOR, sp.size)
        if current_similarity < color_cost:
            # any coloring at this level or deeper is too expensive
            return options[0]

        best_similarity = current_similarity

        if try_recolor:
            avg_color = self.get_geom_med_color(sp)
            if avg_color != current_color:
                # Recolor and stop here.
                new_similarity = costs.float_simil(subimg - avg_color)
                options.append(Program(
                    cmds=[f"color [$] {avg_color}"],
                    score=color_cost + new_similarity))

                if depth < self.max_depth:
                    # Recolor and try to improve the block again.
                    o = self.improve(block_id="$", sp=sp,
                                     current_color=avg_color, depth=depth+1,
                                     try_recolor=False)  # not need to try to recolor again
                    options.append(Program(
                        cmds=[f"color [$] {avg_color}"] + o.cmds,
                        score=color_cost + o.score))

                best_similarity = min(current_similarity, new_similarity)

        if depth < self.max_depth:  # TODO: review sizes
            def improve_subshapes(cmd, cmd_cost, subshapes):
                ops = [
                    self.improve(
                        sp=subshape, block_id=f"$.{i}", current_color=current_color, depth=depth+1)
                    for i, subshape in enumerate(subshapes)
                ]
                subcmds = list(itertools.chain.from_iterable(
                    [o.cmds for o in ops]))
                subcmds_score = sum([o.score for o in ops])
                return Program(cmds=[cmd] + subcmds, score=cmd_cost + subcmds_score)

            # only try if we can recolor at least one of the new blocks (which are at least 2x smaller)
            lin_split_cost = costs.get_cost(costs.COSTS.LINECUT, sp.size)
            if best_similarity > color_cost * 2 + lin_split_cost:
                # TODO: use an heurisic here, split top-level pics more, and lower level less
                for ratio in self.get_x_splits(sp):
                    x_pos = round(sp.x1 + sp.w * ratio)
                    options.append(improve_subshapes(cmd=f"cut [$] [x] [{x_pos}]",
                                                     cmd_cost=lin_split_cost,
                                                     subshapes=sp.split_x(x_pos)))

                for ratio in self.get_y_splits(sp):
                    y_pos = round(sp.y1 + sp.h * ratio)
                    options.append(improve_subshapes(cmd=f"cut [$] [y] [{y_pos}]",
                                                     cmd_cost=lin_split_cost,
                                                     subshapes=sp.split_y(y_pos)))

            # only try if we can recolor at least one of the new blocks (which are at least 4x smaller)
            pt_split_cost = costs.get_cost(costs.COSTS.POINTCUT, sp.size)
            if best_similarity > color_cost * 4 + pt_split_cost:
                for x_ratio, y_ratio in self.get_xy_splits(sp):
                    x_pos = round(sp.x1 + sp.w * x_ratio)
                    y_pos = round(sp.y1 + sp.h * y_ratio)
                    options.append(improve_subshapes(cmd=f"cut [$] [{x_pos}, {y_pos}]",
                                                     cmd_cost=pt_split_cost,
                                                     subshapes=sp.split_xy(x_pos, y_pos)))

        if depth < 1:
            options_summary = "  \n".join(
                [f"* Score: {o.score} Cmds: {str(o.cmds)[:50]}" for o in options])
            print(f"OPTIONS FOR {block_id}:\n{options_summary}")

        best_option = None
        for o in options:
            if best_option == None or o.score < best_option.score:
                best_option = o

        self.cache[cache_key] = best_option

        return Program(cmds=[cmd.replace("$", block_id) for cmd in best_option.cmds],
                       score=best_option.score)

    def shuffle_initial_blocks(self) -> Program:
        def rounded_color(color):
            return [int(v/16)*16 for v in color]
            # return color

        block_ids_to_fix = [block.block_id for block in self.initial_blocks]
        blocks_by_id = {block.block_id:block for block in self.initial_blocks}
        blocks_by_color = {}
        for block in self.initial_blocks:
            key = tuple(rounded_color(block.color))
            existing = blocks_by_color.get(key)
            if existing:
                existing.append(block)
            else:
                blocks_by_color[key] = [block]

        ideal_colors = {}
        for i, block in enumerate(self.initial_blocks):
            ideal_colors[block.block_id] = self.get_geom_med_color(block.shape)
        
        cmds = []
        fixed_block_ids = set()
        total_costs=0
        similarities = 0
        while block_ids_to_fix: 
            block_id = block_ids_to_fix.pop()
            if block_id in fixed_block_ids:
                continue

            block = blocks_by_id[block_id]
            ideal_color = ideal_colors[block_id]
            subimg = self.subimage(block.shape)
            old_similarity = costs.float_simil(subimg - block.color)
            swap_cost = costs.get_cost(costs.COSTS.SWAP, block.shape.size)
            color_cost = costs.get_cost(costs.COSTS.COLOR, block.shape.size)
            ideal_similarity = costs.float_simil(subimg - ideal_color)
            just_recolor_score_delta = (color_cost + (ideal_similarity - old_similarity))            

            if rounded_color(block.color) == ideal_color or old_similarity < swap_cost:
                # Already good.
                fixed_block_ids.add(block_id)
                similarities += old_similarity
                continue

            # Try to find a match.
            has_swapped = False
            matches = blocks_by_color.get(tuple(rounded_color(ideal_color)), [])
            for other_block in matches:
                if other_block.shape.size != block.shape.size:
                    continue
                if other_block.block_id == block_id or other_block.block_id in fixed_block_ids:
                    continue
                
                new_similarity = costs.float_simil(subimg - other_block.color)

                other_subimg = self.subimage(other_block.shape)
                old_similarity2 = costs.float_simil(other_subimg - other_block.color)
                new_similarity2 = costs.float_simil(other_subimg - block.color)

                swap_score_delta = (swap_cost + (new_similarity - old_similarity) + (new_similarity2 - old_similarity2))
                if swap_score_delta < 0 and swap_score_delta < just_recolor_score_delta:
                    cmds.append(f"swap [{block_id}] [{other_block.block_id}]")
                    fixed_block_ids.add(block_id)
                    fixed_block_ids.add(other_block.block_id)
                    total_costs += swap_cost
                    similarities += new_similarity + new_similarity2
                    has_swapped = True
                    break
            
            # If can't swap, repaint it, or leave as-is if coloring is too expensive.
            if not has_swapped:
                if just_recolor_score_delta < 0:
                    cmds.append(f"color [{block_id}] {ideal_color}")
                    fixed_block_ids.add(block_id)
                    total_costs += color_cost
                    similarities += ideal_similarity
                else:
                    # leave as is
                    similarities += old_similarity

        return Program(cmds=cmds, score=total_costs+similarities)


SOLUTIONS_DIR = "./solutions/binary_solver_dev"


def solve(n):
    img = open_as_np(n)
    if n >= 26:
        initial_json = read_initial_json(n)
    else:
        initial_json = InitialJSON(width=400, height=400, blocks=[
            Block("0", Shape(0, 0, 400, 400), [255, 255, 255, 255])
        ])

    print(f"# Solving {n}")
    start_time = time.time()

    solver = Solver(ref_img=img, max_depth=5,
                    initial_blocks=initial_json.blocks)

    # solver.precompute_quad_tree()
    # quad_tree_time = time.time()
    # print(f"Time to quad tree: {quad_tree_time-start_time}")

    if n < 26:
        program = solver.improve("0", Shape(0, 0, 400, 400), [
            255, 255, 255, 255], 0)
    else:
        program = solver.shuffle_initial_blocks()
        if program.cmds == []:
            program = Program(cmds = [f"color [{initial_json.blocks[0].block_id}] {initial_json.blocks[0].color}"], score=-1)

    end_time = time.time()
    print(f"Solution: {program.score} (took {end_time-start_time}s, with {FAST_MED_COLOR_TIME + MED_COLOR_TIME} in get_med_color)")
    print("\n".join(program.cmds))

    with open(f"{SOLUTIONS_DIR}/{n}.txt", "wt") as f:
        f.write("\n".join(program.cmds)+"\n")

    with open(f"{SOLUTIONS_DIR}/{n}.score", "wt") as f:
        f.write(f"{program.score}")


def main():
    # for i in range(2, 26):
    #     solve(i)
    solve(27)

    print(f"DONE")


if __name__ == '__main__':
    main()
