

from src.utils import open_as_np

from solver.geometric_median import geometric_median

from collections import defaultdict
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

def dist(a, b):
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2 + (a[2] -b[2])**2 + (a[3] - b[3])**2)


class TextSolver:
    def __init__(self):
        self.prog = []
        self.global_counter = 0
        
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

    def find_blocks(self, block):
        pixels = open_as_np('8')

        colors = defaultdict(list)
        count = defaultdict(int)

        for y in range(400):
            for x in range(400):
                col = tuple(pixels[x, y, :])
                colors[col].append((x, y))
                count[col] += 1

        items = list(count.items())
        items.sort(key = lambda x: x[1], reverse=True)

        taken = [(255, 255, 255, 255)]

        for item in items[:20]:
            col = item[0]
            should_skip = False
            for prev in taken:
                if dist(prev, col) < 10:
                    should_skip = True
                    break
                
            
            if should_skip: 
                continue

            print(item)
            x0 = min(map(lambda a: a[0], colors[col]))
            y0 = min(map(lambda a: a[1], colors[col]))

            x1 = max(map(lambda a: a[0], colors[col]))
            y1 = max(map(lambda a: a[1], colors[col]))
            
            subimg = pixels[x0:x1, y0:y1]

            color = [round(v) for v in geometric_median(
                    subimg.reshape((subimg.shape[0] * subimg.shape[1], 4)), eps=1e-2)]

            block = self.draw_rect(block, [x0, y0], [x1, y1], to_color(color))

        
    def run(self):
        block = Block("0", begin = (0, 0), end = (400, 400))
        self.find_blocks(block)



if __name__ == "__main__":
    solver = TextSolver()
    solver.run()

    with open("solutions/manual_8/8.txt", "wt") as f:
        f.write("\n".join(solver.prog))
