from re import S
import sys
from src.utils import open_as_np
from solver.geometric_median import geometric_median
import math
import solver.pixel as pix
import solver.costs as costs_m
import dataclasses
import numpy as np
import traceback

@dataclasses.dataclass
class LogEntry:
    key: str
    pixel_size: int
    prog: pix.Prog
    prog_length: int
    cost: int
    similarity: int

    def total_cost(self):
        return self.cost + self.similarity

class PixelSolver2:
    def __init__(self, problem_id, start_block, max_block_id, pixel_size, max_steps = -1, direction=(1,1)):
        assert isinstance(max_block_id, int), f"not an int: {max_block_id}"

        self.prog = pix.Prog()
        self.global_counter = max_block_id
        self.start_block = start_block

        self.pixel_size = pixel_size
        self.direction = direction
        self.img = open_as_np(problem_id)

        self.BACKGROUND = (255, 255, 255, 255)
        self.prog.color(start_block.name, self.BACKGROUND, start_block.sq_size())

        self.pixel_color = {}
        dx, dy = self.direction

        x_range = range(start_block.begin[0], start_block.end[0], pixel_size)
        y_range = range(start_block.begin[1], start_block.end[1], pixel_size)
        for x in reversed(x_range) if dx == -1 else x_range:
            for y in reversed(y_range) if dy == -1 else y_range:
                self.pixel_color[(x, y)] = self.BACKGROUND

        self.max_steps = max_steps
        self.log = []

    def compute_similarity(self):
        canvas = np.copy(self.img)

        for coord, color in self.pixel_color.items():
            x,y = coord
            canvas[x:x+self.pixel_size, y:y+self.pixel_size] = np.array(color)

        return costs_m.simil(self.img - canvas)

    def merge(self, a, b, a_sq_size, b_sq_size):
        assert isinstance(a, str), f"not a str: {a}"
        assert isinstance(b, str), f"not a str: {b}"

        self.prog.merge(a, b, a_sq_size, b_sq_size)
        self.global_counter += 1
        return str(self.global_counter)

    def pick_color(self, x, y, color_width, color_height, block_name):
        dx, dy = self.direction
        x_from, x_to = (x, x + self.pixel_size) if dx == 1 else (color_width - self.pixel_size, color_width)
        y_from, y_to = (y, y + self.pixel_size) if dy == 1 else (color_height - self.pixel_size, color_height)
        print('>>> pick_color', (x_from, y_from), (x_to, y_to))
        subimg = self.img[x_from:x_to, y_from:y_to]

        color = [round(int(v)) for v in geometric_median(
            subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)), eps=1e-2)]

        color_cost = costs_m.get_cost(
            costs_m.COSTS.COLOR, color_width * color_height)
        new_simil = costs_m.float_simil(subimg - color)
        old_simil = costs_m.float_simil(subimg - self.pixel_color[(x, y)])
        # print(
        #     f"color_cost at {x} {y} {color_cost} old_simil {old_simil} new_simil {new_simil} (has {self.pixel_color[(x,y)]} need {color})")
        if old_simil > new_simil + color_cost:
            return color
        else:
            return None
        # return color if color != self.pixel_color[(x,y)] else None

    def update_pixel_color(self, x, y, color):
        for xi in range(x, self.start_block.end[0], self.pixel_size):
            for yi in range(y, self.start_block.end[1], self.pixel_size):
                self.pixel_color[(xi, yi)] = color

    def pixelize_block(self, block: pix.Block, max_steps):
        # out_of_x = x >= self.start_block.end[0] if dx == 1 else x <= self.start_block.begin[0]-1
        # out_of_y = y >= self.start_block.end[1] if dy == 1 else y <= self.start_block.begin[1]-1
        # if out_of_x or out_of_y:
        #     print('>>> out of x or y', x, out_of_x, y, out_of_y)
        #     return

        dx, dy = self.direction
        bx0, by0 = block.begin
        bx1, by1 = block.end
        width = block.width()
        height = block.height()

        print(
            f"pixelize_block {block} {bx0} {by0} corner color {self.pixel_color[(bx0,by0)]}, max_steps={max_steps}")
        if max_steps == 0:
            return

        color = self.pick_color(bx0, by0, width, height, block.name)
        if color:
            self.prog.color(block.name, color, block.sq_size())
            self.update_pixel_color(bx0, by0, color)

        # Horizontal row
        x_range = range(bx0, bx1, self.pixel_size)
        for xs in reversed(x_range) if dx == -1 else x_range:
            print(f"Horizontal row {xs} {by0}")
            color = self.pick_color(xs, by0, width - (xs - bx0), height, block.name)
            if color:
                left, right = block.line_x(xs, self.prog)
                to_color = right if dx == 1 else left
                self.prog.color(to_color.name, color, right.sq_size())
                self.update_pixel_color(xs, by0, color)
                cur_name = self.merge(left.name, right.name, left.sq_size(), right.sq_size())
                block = pix.Block(cur_name, block.begin, block.end)

        # Vertical row
        y_range = range(by0, by1, self.pixel_size)
        for ys in reversed(y_range) if dy == -1 else y_range:
            print(f"Vertical row {bx0} {ys}")
            color = self.pick_color(bx0, ys, width, height - (ys - by0), block.name)
            if color:
                bottom, top = block.line_y(ys, self.prog)
                to_color = top if dy == 1 else bottom
                self.prog.color(to_color.name, color, top.sq_size())
                self.update_pixel_color(bx0, ys, color)
                cur_name = self.merge(bottom.name, top.name, bottom.sq_size(), top.sq_size())
                block = pix.Block(cur_name, block.begin, block.end)

        # if x == 120 and y == 120:
        #     return

        self.log_state(f"x{bx0} y{by0}")

        self.log_state(f"sz{self.pixel_size} b{block.name} w{block.width()} h{block.height()} {block.begin} {block.end}")
        if block.width() > self.pixel_size and block.height() > self.pixel_size:
            split_x = bx0 + self.pixel_size if dx == 1 else bx1 - self.pixel_size
            split_y = by0 + self.pixel_size if dy == 1 else by1 - self.pixel_size
            bot_left, bot_right, top_right, top_left = block.split((split_x, split_y), self.prog)
            if (dx, dy) == (1,1):
                next_block = top_right
            elif (dx, dy) == (-1,1):
                next_block = top_left
            elif (dx, dy) == (-1,-1):
                next_block = bot_left
            elif (dx, dy) == (1,-1):
                next_block = bot_right
            self.pixelize_block(next_block, max_steps - 1)

    def log_state(self, desc):
        self.log.append(LogEntry(
            key=desc,
            prog=self.prog,
            pixel_size=self.pixel_size,
            prog_length=len(self.prog.cmds),
            cost=self.prog.total_cost(),
            similarity=self.compute_similarity()))

    def run(self):
        self.log_state("initial")

        self.pixelize_block(self.start_block, self.max_steps)

        self.log_state("final")

def run_pixel_solver(problem_id, start_block, max_block_id, pixel_size, directionIdx=0, max_steps=-1):
    try:
        log_entries = []
        direction = [
            (1, 1),
            (-1, 1),
            (-1, -1),
            (1, -1),
        ][directionIdx]
        # for ps in range(pixel_size - 5, pixel_size + 5):
        solver = PixelSolver2(
            problem_id=problem_id,
            start_block=start_block,
            max_block_id=max_block_id,
            # pixel_size=ps,
            pixel_size=pixel_size,
            max_steps=max_steps,
            direction=direction,
        )

        solver.run()
        log_entries.extend(solver.log)

        for entry in solver.log:
            print(f"{entry} => {entry.total_cost()}")

        best_entry: LogEntry = min(log_entries, key=lambda entry: entry.total_cost())
        print(f"\n\nBEST: {best_entry} => {best_entry.total_cost()}")

        cmds = best_entry.prog.cmds#[:best_entry.prog_length]

        return cmds
    except Exception as err:
        traceback.print_exc()
        print(f"run_pixel_solver() failed {err}")
        return f"Error: {err}"
    # total = 0
    # for i, (cmd, cost) in enumerate(zip(solver.prog.cmds, solver.prog.costs)):
    #     total += cost
    #     print(f"{i + 1}: [{total}] {cost}: {cmd}")

if __name__ == "__main__":
    problem_id = sys.argv[1]
    pixel_size = int(sys.argv[2])
    start = int(sys.argv[3]) if len(sys.argv) > 3 else 0

    cmds = run_pixel_solver(
        problem_id=problem_id,
        start_block=pix.Block("0", begin=(0, 0), end=(400, 400)),
        max_block_id = start,
        pixel_size = pixel_size)

    with open(f"solutions/pixel_solver2/{problem_id}.txt", "wt") as f:
        f.write("\n".join(cmds))
