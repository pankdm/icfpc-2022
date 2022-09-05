

import sys
from src.utils import open_as_np
from solver.geometric_median import geometric_median
import math
import solver.costs as costs_m

class Prog:
    def __init__(self):
        self.cmds = []
        self.costs = []

    def _add_cmd(self, cmd: str, cost: int):
        self.cmds.append(cmd)
        self.costs.append(cost)

    def total_cost(self):
        return sum(self.costs)

    def color(self, block: str, color, sq_size: int):
        if not isinstance(color, str):
            color = to_color(color)

        self._add_cmd(cmd=f"color [{block}] {color}",
            cost=costs_m.get_cost(costs_m.COSTS.COLOR, sq_size))

    def cut_pt(self, block: str, pt, sq_size: int):
        self._add_cmd(f"cut [{block}] [{pt[0]}, {pt[1]}]",
            cost=costs_m.get_cost(costs_m.COSTS.POINTCUT, sq_size))

    def cut_x(self, block: str, x: int, sq_size: int):
        self._add_cmd(f"cut [{block}] [x] [{x}]",
            cost=costs_m.get_cost(costs_m.COSTS.LINECUT, sq_size))

    def cut_y(self, block: str, y: int, sq_size: int):
        self._add_cmd(f"cut [{block}] [y] [{y}]",
            cost=costs_m.get_cost(costs_m.COSTS.LINECUT, sq_size))

    def merge(self, a: str, b: str, a_sq_size: int, b_sq_size: int):
        self._add_cmd(cmd=f"merge [{a}] [{b}]",
            cost=costs_m.get_cost(costs_m.COSTS.MERGE, max(a_sq_size, b_sq_size)))

    def swap(self, a: str, b: str, sq_size: int):
        self._add_cmd(cmd=f"swap [{a}] [{b}]",
            cost=costs_m.get_cost(costs_m.COSTS.SWAP, sq_size))

class Block:
    def __init__(self, name, begin, end):
        self.name = name
        self.begin = begin
        self.end = end

    def size(self):
        return (self.end[0] - self.begin[0], self.end[1]- self.begin[1])

    def width(self):
        return self.size()[0]

    def height(self):
        return self.size()[1]

    def sq_size(self):
        return self.width() * self.height()

    def split_mid(self, prog: Prog):
        mid_x = (self.begin[0] + self.end[0]) // 2
        mid_y = (self.begin[1] + self.end[1]) // 2

        dx = mid_x - self.begin[0]
        dy = mid_y - self.begin[1]

        blocks = self.split((mid_x, mid_y), prog)
        for b in blocks:
            assert b.size() == (dx, dy)
        return blocks

    def split(self, pt, prog: Prog):

        mid_x = pt[0]
        mid_y = pt[1]
        prog.cut_pt(self.name, (mid_x, mid_y), self.width() * self.height())

        x0, y0 = self.begin
        x1, y1 = self.end

        bottom_left = Block(self.name + ".0", begin = (x0, y0), end = (mid_x, mid_y))
        botom_right = Block(self.name + ".1", begin = (mid_x, y0), end = (x1, mid_y))
        top_right = Block(self.name + ".2", begin = (mid_x, mid_y), end = (x1, y1))
        top_left = Block(self.name + ".3", begin = (x0, mid_y), end = (mid_x, y1))

        return [bottom_left, botom_right, top_right, top_left]

    def line_y(self, y, prog: Prog):
        x0, y0 = self.begin
        x1, y1 = self.end
        bottom = Block(self.name + ".0", begin = (x0, y0), end = (x1, y))
        top = Block(self.name + ".1", begin = (x0, y), end = (x1, y1))

        prog.cut_y(self.name, y, self.width() * self.height())

        return [bottom, top]

    def line_x(self, x, prog: Prog):
        x0, y0 = self.begin
        x1, y1 = self.end
        left = Block(self.name + ".0", begin = (x0, y0), end = (x, y1))
        right = Block(self.name + ".1", begin = (x, y0), end = (x1, y1))

        prog.cut_x(self.name, x, self.width() * self.height())

        return [left, right]

    def line_x_mid(self, prog):
        mid_x = (self.begin[0] + self.end[0]) // 2
        return self.line_x(mid_x, prog)

    def line_y_mid(self, prog):
        mid_y = (self.begin[1] + self.end[1]) // 2
        return self.line_y(mid_y, prog)


def to_color(color):
    return "[{}, {}, {}, {}]".format(color[0], color[1], color[2], color[3])

def dist(a, b):
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2 + (a[2] -b[2])**2 + (a[3] - b[3])**2)


class PixelSolver:
    def __init__(self, problem, pixel_size, start = 0):
        assert isinstance(start, int)
        self.prog = Prog()
        self.global_counter = start
        self.start = str(start)

        self.pixel_size = pixel_size
        self.img = open_as_np(problem)

        # self.BACKGROUND = (255, 255, 255, 255)
        background = [round(int(v)) for v in geometric_median(
                        self.img.reshape((self.img.shape[0] * self.img.shape[1], 4)), eps=1e-2)]

        print(f"using {background} as backround")
        self.BACKGROUND = background


        self.prog.color(start, self.BACKGROUND, 400 * 400)



    def merge(self, a, b, a_sq_size, b_sq_size):
        assert isinstance(a, str)
        assert isinstance(b, str)

        self.prog.merge(a, b, a_sq_size, b_sq_size)

        self.global_counter += 1
        return str(self.global_counter)

    def swap(self, b1, b2, sq_size):
        self.prog.swap(b1.name, b2.name, sq_size)
        [b1.name, b2.name] = [b2.name, b1.name]

    # draws rect starting from (0,0) to (x1, y1)
    def draw_prefix_rect(self, cur, x1, y1, color):
        if not isinstance(color, str):
            color = to_color(color)

        if y1 < 400:
            [cur, b2] = cur.line_y(y1, self.prog)
        if x1 < 400:
            [cur, b4] = cur.line_x(x1, self.prog)

        self.prog.color(cur.name, color, cur.width() * cur.height())

        cur_name = cur.name
        if x1 < 400:
            cur_name = self.merge(cur_name, b4.name)
        if y1 < 400:
            cur_name = self.merge(cur_name, b2.name)

        return Block(cur_name, cur.begin, cur.end)


    def run(self):
        block = Block("0", begin = (0, 0), end = (400, 400))

        for y in reversed(range(0, 400, self.pixel_size)):
            print (f"y = {y}");
            for x in reversed(range(0, 400, self.pixel_size)):
                x1 = x + self.pixel_size
                y1 = y + self.pixel_size
                subimg = self.img[x:x1, y:y1]
                color = [round(int(v)) for v in geometric_median(
                        subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)), eps=1e-2)]

                # Dont' draw if difference is too small
                if dist(color, self.BACKGROUND) < 10:
                    continue

                block = self.draw_prefix_rect(block, x1, y1, color)

                if y > 0:
                    block = self.draw_prefix_rect(block, x1, y, self.BACKGROUND)
                if x > 0:
                    block = self.draw_prefix_rect(block, x, y1, self.BACKGROUND)



if __name__ == "__main__":
    problem = sys.argv[1]
    pixel_size = int(sys.argv[2])

    solver = PixelSolver(problem=problem, pixel_size=pixel_size)
    solver.run()


    with open(f"solutions/pixel_solver/{problem}.txt", "wt") as f:
        f.write("\n".join(solver.prog.cmds))
