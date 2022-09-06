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

    def init_colors(self):
        # _, (x0,y0), (x1,y1) = self.start_block
        # self.pixel_color = np.zeros(((x1-x0)//self.pixel_size, (y1-y0)//self.pixel_size, 4))
        self.canvas = np.zeros(np.shape(self.img), dtype=np.uint16)
        self.canvas[:,:] = self.BACKGROUND

    def set_pixel_color(self, x, y, color:np.array):
        self.canvas[x:,y:] = color

    def get_pixel_color(self, x, y):
        return self.canvas[x,y]

    def compute_similarity(self):
        return costs_m.simil(self.img - self.canvas)

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
            # for ps in range(pixel_size - 5, pixel_size + 5):
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
