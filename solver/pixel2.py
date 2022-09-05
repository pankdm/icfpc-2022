import sys
from src.utils import open_as_np
from solver.geometric_median import geometric_median
import math
import solver.pixel as pix
import solver.costs as costs_m
import dataclasses
import numpy as np

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
    def __init__(self, problem_id, start_block, max_block_id, pixel_size):
        assert isinstance(max_block_id, int)

        self.prog = pix.Prog()
        self.global_counter = max_block_id
        self.start_block = start_block

        self.pixel_size = pixel_size
        self.img = open_as_np(problem_id)

        self.BACKGROUND = (255, 255, 255, 255)
        self.prog.color(start_block.name, self.BACKGROUND, start_block.sq_size())

        self.pixel_color = {}
        for x in range(start_block.begin[0], start_block.end[0], pixel_size):
            for y in range(start_block.begin[1], start_block.end[1], pixel_size):
                self.pixel_color[(x, y)] = self.BACKGROUND

        self.log = []

    def compute_similarity(self):
        canvas = np.copy(self.img)

        for coord, color in self.pixel_color.items():
            x,y = coord
            canvas[x:x+self.pixel_size, y:y+self.pixel_size] = np.array(color)

        return costs_m.simil(self.img - canvas)

    def merge(self, a, b, a_sq_size, b_sq_size):
        assert isinstance(a, str)
        assert isinstance(b, str)

        self.prog.merge(a, b, a_sq_size, b_sq_size)
        self.global_counter += 1
        return str(self.global_counter)

    def pick_color(self, x, y, color_width, color_height):
        x1 = x + self.pixel_size
        y1 = y + self.pixel_size
        subimg = self.img[x:x1, y:y1]
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

    def pixelize_block(self, block: pix.Block, x, y):
        print(
            f"pixelize_block {block} {x} {y} corner color {self.pixel_color[(x,y)]}")

        width = block.width()
        height = block.height()
        color = self.pick_color(x, y, width, height)
        if color:
            self.prog.color(block.name, color, block.sq_size())
            self.update_pixel_color(x, y, color)

        # Horizontal row
        for xs in range(x + self.pixel_size, x + width, self.pixel_size):
            # print(f"Horizontal row {xs} {y}")
            color = self.pick_color(xs, y, width - (xs - x), height)
            if color:
                left, right = block.line_x(xs, self.prog)
                self.prog.color(right.name, color, right.sq_size())
                self.update_pixel_color(xs, y, color)
                cur_name = self.merge(left.name, right.name, left.sq_size(), right.sq_size())
                block = pix.Block(cur_name, block.begin, block.end)

         # Vertical row
        for ys in range(y + self.pixel_size, y + height, self.pixel_size):
            # print(f"Vertical row {x} {ys}")
            color = self.pick_color(x, ys, width, height - (ys - y))
            if color:
                bottom, top = block.line_y(ys, self.prog)
                self.prog.color(top.name, color, top.sq_size())
                self.update_pixel_color(x, ys, color)
                cur_name = self.merge(bottom.name, top.name, bottom.sq_size(), top.sq_size())
                block = pix.Block(cur_name, block.begin, block.end)

        # if x == 120 and y == 120:
        #     return

        self.log_state(f"x{x} y{y}")

        if block.width() > self.pixel_size:
            split_pt = (x + self.pixel_size, y + self.pixel_size)
            _, _, top_right, _ = block.split(split_pt, self.prog)

            self.pixelize_block(top_right, split_pt[0], split_pt[1])

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

        self.pixelize_block(self.start_block, self.start_block.begin[0], self.start_block.begin[1])

        self.log_state("final")
        
def run_pixel_solver(problem_id, start_block, max_block_id, pixel_size):
    log_entries = []
    for ps in range(pixel_size - 5, pixel_size + 5):
        solver = PixelSolver2(
            problem_id=problem_id,
            start_block=start_block,
            max_block_id=max_block_id,
            pixel_size=ps)

        solver.run()
        log_entries.extend(solver.log)

        for entry in solver.log:
            print(f"{entry} => {entry.total_cost()}")

    best_entry: LogEntry = min(log_entries, key=lambda entry: entry.total_cost())
    print(f"\n\nBEST: {best_entry} => {best_entry.total_cost()}")

    cmds = best_entry.prog.cmds[:best_entry.prog_length]

    return cmds
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
