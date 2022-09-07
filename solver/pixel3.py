from itertools import product
from re import S
import sys
from src.utils import open_as_np
from solver.geometric_median import geometric_median
import math
import solver.pixel as pix
import solver.pixel2 as pix2
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

class PixelSolver3(pix2.PixelSolver2):
    BACKGROUND = np.array([255, 255, 255, 255])
    canvas: np.ndarray = None

    def __init__(self, problem_id, start_block, max_block_id, pixel_size, max_steps = -1, direction=(1,1)):
        super().__init__(problem_id, start_block, max_block_id, pixel_size, max_steps=max_steps)
        self.direction = direction
        self.subimg = self.img[:,:]
        # create a matrix of indexes, such that indexes[x][y] -> (x,y)
        # we will take and flip slices of data, the matrix will help restore indexes
        self.indices = np.indices((400,400))
        self.subindices = self.indices[...]

    def init_colors(self):
        # _, (x0,y0), (x1,y1) = self.start_block
        self.canvas = np.zeros(np.shape(self.img), dtype=np.uint16)
        self.canvas[:,:] = self.BACKGROUND
        self.subcanvas = self.canvas[:,:]

    def get_pixel_color(self, x, y):
        return self.canvas[x, y]

    def compute_similarity(self):
        return costs_m.simil(self.img - self.canvas)

    def set_pixel_color(self, x, y, color:np.array):
        self.subcanvas[x:,y:] = color

    def pick_color(self, x, y, color_width, color_height):
        subpixel = self.subimg[x:x+self.pixel_size, y:y+self.pixel_size]
        color = [round(int(v)) for v in geometric_median(
            subpixel.reshape((subpixel.shape[0] * subpixel.shape[1], 4)), eps=1e-2)]

        color_cost = costs_m.get_cost(
            costs_m.COSTS.COLOR, color_width * color_height)
        new_simil = costs_m.float_simil(subpixel - color)
        old_simil = costs_m.float_simil(subpixel - self.subcanvas[x,y])
        if old_simil > new_simil + color_cost:
            return color
        else:
            return None

    def run(self):
        self.log_state("initial")

        self.pixelize_block(self.start_block, self.max_steps)

        self.log_state("final")

    def pixelize_block(self, block: pix.Block, max_steps):
        dx, dy = self.direction
        _, (x0,y0), (x1,y1) = block
        self.subimg = self.img[x0:x1,y0:y1][::dx,::dy]
        self.subcanvas = self.canvas[x0:x1,y0:y1][::dx,::dy]
        self.subindices = self.indices[:,x0:x1,y0:y1][:,::dx,::dy]
        # start corner point
        cx, cy = self.subindices[:,0,0]
        print(
            f"pixelize_block {block} {cx} {cy} corner color {self.subcanvas[0,0]}, max_steps={max_steps}")
        if max_steps == 0:
            return

        width = block.width()
        height = block.height()
        color = self.pick_color(0, 0, width, height)
        if color:
            self.prog.color(block.name, color, block.sq_size())
            self.subcanvas[0:,0:] = color

        # Horizontal row
        # for xs in range(x + self.pixel_size, x + width, self.pixel_size):
        for xs in range(self.pixel_size, width, self.pixel_size):
            # print(f"Horizontal row {xs} {y}")
            color = self.pick_color(xs, 0, width - xs, height)
            if color:
                abs_x = self.subindices[0,xs,0]
                left, right = block.line_x(abs_x, self.prog)
                block_to_color = right if dx == 1 else left
                self.prog.color(block_to_color.name, color, right.sq_size())
                self.subcanvas[xs:,0:] = color
                cur_name = self.merge(left.name, right.name, left.sq_size(), right.sq_size())
                block = pix.Block(cur_name, block.begin, block.end)

         # Vertical row
        # for ys in range(y + self.pixel_size, y + height, self.pixel_size):
        for ys in range(self.pixel_size, height, self.pixel_size):
            # print(f"Vertical row {x} {ys}")
            color = self.pick_color(0, ys, width, height - ys)
            if color:
                abs_y = self.subindices[1,0,ys]
                bottom, top = block.line_y(abs_y, self.prog)
                block_to_color = top if dy == 1 else bottom
                self.prog.color(block_to_color.name, color, top.sq_size())
                self.subcanvas[0:,ys:] = color
                cur_name = self.merge(bottom.name, top.name, bottom.sq_size(), top.sq_size())
                block = pix.Block(cur_name, block.begin, block.end)

        # if x == 120 and y == 120:
        #     return

        self.log_state(f"x{cx} y{cy}")

        if block.width() > self.pixel_size and block.height() > self.pixel_size:
            split_pt = self.subindices[:,self.pixel_size,self.pixel_size]
            if dx == -1:
                split_pt[0] += 1
            if dy == -1:
                split_pt[1] += 1
            bot_left, bot_right, top_right, top_left = block.split(split_pt, self.prog)
            if (dx, dy) == (1,1):
                next_block = top_right
            elif (dx, dy) == (-1,1):
                next_block = top_left
            elif (dx, dy) == (-1,-1):
                next_block = bot_left
            elif (dx, dy) == (1,-1):
                next_block = bot_right

            self.pixelize_block(next_block, max_steps - 1)

def run_pixel_solver(problem_id, start_block, max_block_id, pixel_size, directionIdx=0, max_steps=-1):
    try:
        log_entries = []
        direction = [
            (1, 1),
            (-1, 1),
            (-1, -1),
            (1, -1),
        ][directionIdx]
        for ps in range(pixel_size - 5, pixel_size + 5):
            solver = PixelSolver3(
                problem_id=problem_id,
                start_block=start_block,
                max_block_id=max_block_id,
                pixel_size=ps,
                max_steps=max_steps,
                direction=direction,
            )

            solver.run()
            log_entries.extend(solver.log)

            for entry in solver.log:
                print(f"{entry} => {entry.total_cost()}")

        best_entry: LogEntry = min(log_entries, key=lambda entry: entry.total_cost())
        print(f"\n\nBEST: {best_entry} => {best_entry.total_cost()}")

        cmds = best_entry.prog.cmds[:best_entry.prog_length]

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
