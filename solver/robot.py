
from src.robot_fragment import FRAGMENT

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

        prog.append(f"cut [{self.name}] [{mid_x}, {mid_y}]")
        blocks = self.split((mid_x, mid_y))
        for b in blocks:
            assert b.size() == (dx, dy)
        return blocks

    def split(self, pt):
        mid_x = pt[0]
        mid_y = pt[1]

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


class RobotSolver:
    def __init__(self, start = 0):
        assert isinstance(start, int)
        self.prog = []
        self.global_counter = start
        self.start = str(start)
        
    BODY = to_color([56, 182, 255, 255])
    HEAD = to_color([0, 74, 173, 255])
    LEFT_ARM = to_color([255, 22, 22, 255])
    RIGHT_ARM = to_color([0, 128, 55, 255])
    LEG = to_color([255, 222, 89, 255])
    BELT = to_color([115, 94, 88, 255])
    PURPLE = to_color([131, 73, 125, 255])
    MOUTH = to_color([92, 225, 230, 255])
    EYE = to_color([126, 217, 87, 255])
    WHITE = to_color((255, 255, 255, 255))


    def merge(self, a, b):
        assert isinstance(a, str)
        assert isinstance(b, str)

        self.prog.append(f"merge [{a}] [{b}]")
        self.global_counter += 1
        return str(self.global_counter)
    
    def swap(self, b1, b2):
        self.prog.append(f"swap [{b1.name}] [{b2.name}]")
        [b1.name, b2.name] = [b2.name, b1.name]


    def draw_rect(self, cur, a, b, color):
        x0 = min(a[0], b[0])
        x1 = max(a[0], b[0])

        y0 = min(a[1], b[1])
        y1 = max(a[1], b[1])

        [b1, cur] = cur.line_y(y0, self.prog)
        [cur, b2] = cur.line_y(y1, self.prog)
        [b3, cur] = cur.line_x(x0, self.prog)
        [cur, b4] = cur.line_x(x1, self.prog)

        self.prog.append(f"color [{cur.name}] {color}")

        cur_name = cur.name
        cur_name = self.merge(cur_name, b4.name)
        cur_name = self.merge(cur_name, b3.name)
        cur_name = self.merge(cur_name, b2.name)
        cur_name = self.merge(cur_name, b1.name)

        return Block(cur_name, cur.begin, cur.end)


    def run(self):
        block = Block(self.start, begin = (0, 0), end = (400, 400))

        block = self.draw_rect(block, [106, 265], [304, 109], self.BODY)
        block = self.draw_rect(block, [141, 241], [260, 359], self.HEAD)

        block = self.draw_rect(block, [78, 147], [118, 239], self.LEFT_ARM)
        block = self.draw_rect(block, [285, 218], [324, 312], self.RIGHT_ARM)

        block = self.draw_rect(block, [140, 53], [178, 107], self.LEG)
        block = self.draw_rect(block, [230, 52], [269, 107], self.LEG)
        block = self.draw_rect(block, [106, 122], [304, 136], self.BELT)
        block = self.draw_rect(block, [158, 266], [242, 289], self.MOUTH)
        # block = self.draw_rect(block, [250, 115], [280, 144], self.PURPLE)

        # block = self.draw_rect(block, [161, 313], [180, 334], self.EYE)
        # block = self.draw_rect(block, [220, 313], [239, 335], self.WHITE)


if __name__ == "__main__":
    # PROBLEM = 27
    PROBLEM = 2
        
    if PROBLEM == 27:    
        solver = RobotSolver(start=798)
        solver.prog += FRAGMENT.split("\n")
        solver.run()
    else:
        solver = RobotSolver(start=0)
        solver.run()


    with open(f"solutions/manual_robot/{PROBLEM}.txt", "wt") as f:
        f.write("\n".join(solver.prog))


