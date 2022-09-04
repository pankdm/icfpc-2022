

from email.errors import InvalidMultipartContentTransferEncodingDefect
import sys
from src.utils import open_as_np
from solver.geometric_median import geometric_median
import math

class Block:
    def __init__(self, name, begin, end):
        self.name = name
        self.begin = begin
        self.end = end

    def size(self):
        return (self.end[0] - self.begin[0], self.end[1]- self.begin[1])

    def split_mid(self, prog):
        mid_x = (self.begin[0] + self.end[0]) // 2
        mid_y = (self.begin[1] + self.end[1]) // 2

        dx = mid_x - self.begin[0]
        dy = mid_y - self.begin[1]

        blocks = self.split((mid_x, mid_y))
        for b in blocks:
            assert b.size() == (dx, dy)
        return blocks

    def split(self, pt, prog):

        mid_x = pt[0]
        mid_y = pt[1]
        prog.append(f"cut [{self.name}] [{mid_x}, {mid_y}]")

        x0, y0 = self.begin
        x1, y1 = self.end

        bottom_left = Block(self.name + ".0", begin = (x0, y0), end = (mid_x, mid_y))
        botom_right = Block(self.name + ".1", begin = (mid_x, y0), end = (x1, mid_y))
        top_right = Block(self.name + ".2", begin = (mid_x, mid_y), end = (x1, y1))
        top_left = Block(self.name + ".3", begin = (x0, mid_y), end = (mid_x, y1))

        return [bottom_left, botom_right, top_right, top_left]

    def line_y(self, y, prog):
        x0, y0 = self.begin
        x1, y1 = self.end
        bottom = Block(self.name + ".0", begin = (x0, y0), end = (x0, y))
        top = Block(self.name + ".1", begin = (x0, y), end = (x1, y1))

        prog.append(f"cut [{self.name}] [y] [{y}]")
        return [bottom, top]
    
    def line_x(self, x, prog):
        x0, y0 = self.begin
        x1, y1 = self.end
        left = Block(self.name + ".0", begin = (x0, y0), end = (x, y1))
        right = Block(self.name + ".1", begin = (x, y0), end = (x1, y1))

        prog.append(f"cut [{self.name}] [x] [{x}]")
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
        self.prog = []
        self.global_counter = start
        self.start = str(start)

        self.pixel_size = pixel_size
        self.img = open_as_np(problem)

        self.BACKGROUND = (255, 255, 255, 255)
        # self.BACKGROUND = (0, 0, 0, 255)
        self.prog.append(f"color [{start}] {to_color(self.BACKGROUND)}")


        
    def merge(self, a, b):
        assert isinstance(a, str)
        assert isinstance(b, str)

        self.prog.append(f"merge [{a}] [{b}]")
        self.global_counter += 1
        return str(self.global_counter)
    
    def swap(self, b1, b2):
        self.prog.append(f"swap [{b1.name}] [{b2.name}]")
        [b1.name, b2.name] = [b2.name, b1.name]
    
    # draws rect starting from (0,0) to (x1, y1)
    def draw_prefix_rect(self, cur, x1, y1, color):
        if not isinstance(color, str):
            color = to_color(color)

        [cur, b2] = cur.line_y(y1, self.prog)
        [cur, b4] = cur.line_x(x1, self.prog)

        self.prog.append(f"color [{cur.name}] {color}")

        cur_name = cur.name
        cur_name = self.merge(cur_name, b4.name)
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
        f.write("\n".join(solver.prog))
