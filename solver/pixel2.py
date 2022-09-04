import sys
from src.utils import open_as_np
from solver.geometric_median import geometric_median
import math
import solver.pixel as pixel_solver
import solver.costs as costs_m

class PixelSolver2:
    def __init__(self, problem, pixel_size, start = 0):
        assert isinstance(start, int)
        self.prog = []
        self.global_counter = start
        self.start = str(start)

        self.pixel_size = pixel_size
        self.img = open_as_np(problem)

        self.BACKGROUND = (255, 255, 255, 255)
        # self.BACKGROUND = (0, 0, 0, 255)
        self.prog.append(f"color [{start}] {pixel_solver.to_color(self.BACKGROUND)}")

        self.pixel_color = {}
        for x in range(0, 400, pixel_size):
            for y in range(0, 400, pixel_size):
                self.pixel_color[(x,y)] = self.BACKGROUND

        
    def merge(self, a, b):
        assert isinstance(a, str)
        assert isinstance(b, str)

        self.prog.append(f"merge [{a}] [{b}]")
        self.global_counter += 1
        return str(self.global_counter)
    
    def swap(self, b1, b2):
        self.prog.append(f"swap [{b1.name}] [{b2.name}]")
        [b1.name, b2.name] = [b2.name, b1.name]
    
    # # draws rect starting from (0,0) to (x1, y1)
    # def draw_prefix_rect(self, cur, x1, y1, color):
    #     if not isinstance(color, str):
    #         color = to_color(color)

    #     [cur, b2] = cur.line_y(y1, self.prog)
    #     [cur, b4] = cur.line_x(x1, self.prog)

    #     self.prog.append(f"color [{cur.name}] {color}")

    #     cur_name = cur.name
    #     cur_name = self.merge(cur_name, b4.name)
    #     cur_name = self.merge(cur_name, b2.name)

    #     return Block(cur_name, cur.begin, cur.end)

    def pick_color(self, x, y, color_width, color_height):
        x1 = x + self.pixel_size
        y1 = y + self.pixel_size
        subimg = self.img[x:x1, y:y1]
        color = [round(int(v)) for v in geometric_median(
                subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)), eps=1e-2)]

        color_cost = costs_m.get_cost(costs_m.COSTS.COLOR, color_width * color_height)
        new_simil = costs_m.float_simil(subimg - color)
        old_simil = costs_m.float_simil(subimg - self.pixel_color[(x,y)])
        print(f"color_cost at {x} {y} {color_cost} old_simil {old_simil} new_simil {new_simil}")
        if color_cost + new_simil - old_simil < 0:
            return color
        else:
            return None


    def pixelize_block(self, block: pixel_solver.Block, x, y):
        print(f"pixelize_block {block} {x} {y} corner color {self.pixel_color[(x,y)]}")

        width = block.width()
        height = block.height()
        color = self.pick_color(x, y, width, height)
        if color:
            self.prog.append(f"color [{block.name}] {color}")

        # Horizontal row
        for xs in range(x + self.pixel_size, x + width, self.pixel_size):
            print(f"Horizontal row {xs} {y}")
            color = self.pick_color(xs, y, width - (xs - x), height)
            if color:
                left, right = block.line_x(xs, self.prog)
                self.prog.append(f"color [{right.name}] {color}")
                cur_name = self.merge(left.name, right.name)
                block = pixel_solver.Block(cur_name, block.begin, block.end)

         # Vertical row
        for ys in range(y + self.pixel_size, y + height, self.pixel_size):
            print(f"Vertical row {x} {ys}")
            color = self.pick_color(x, ys, width, height - (ys - y))
            if color:
                bottom, top = block.line_y(ys, self.prog)
                self.prog.append(f"color [{top.name}] {color}")
                cur_name = self.merge(bottom.name, top.name)
                block = pixel_solver.Block(cur_name, block.begin, block.end)

        if block.width() > 100:
            split_pt = (x + self.pixel_size, y + self.pixel_size)
            _, _, top_right, _ = block.split(split_pt, self.prog)

            self.pixelize_block(top_right, split_pt[0], split_pt[1])


    def run(self):
        block = pixel_solver.Block("0", begin = (0, 0), end = (400, 400))

        self.pixelize_block(block, 0, 0)



if __name__ == "__main__":
    problem = sys.argv[1]
    pixel_size = int(sys.argv[2])

    solver = PixelSolver2(problem=problem, pixel_size=pixel_size)
    solver.run()

    with open(f"solutions/pixel_solver2/{problem}.txt", "wt") as f:
        f.write("\n".join(solver.prog))
