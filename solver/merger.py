import sys


import json
import math

def read_json(n):
    with open(f"problems/{n}.initial.json", "rt") as f:
        json_obj = json.load(f)
        return json_obj


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


class Prog:
    def __init__(self, global_counter):
        self.code = []
        self.global_counter = global_counter
    
    def merge(self, a, b):
        assert isinstance(a, str)
        assert isinstance(b, str)

        self.code.append(f"merge [{a}] [{b}]")
        self.global_counter += 1
        return str(self.global_counter)
    
    def swap(self, b1, b2):
        prog.append(f"swap [{b1.name}] [{b2.name}]")
        [b1.name, b2.name] = [b2.name, b1.name]

def line_y_hack(cur, y, prog):
    prog.append(f"cut [{cur}] [y] [{y}]")
    return [cur + ".0", cur + ".1"]


if __name__ == "__main__":
    PROBLEM = sys.argv[1]
    to_merge = int(sys.argv[2])


    all_blocks = []
    js = read_json(PROBLEM)
    for block in js['blocks']:
        all_blocks.append(int(block['blockId']))
    
    max_block_id = max(all_blocks)
    prog = Prog(int(max_block_id))
    
    side = int(round(math.sqrt(len(all_blocks))))
    size = 400 // side

    print("max block id =", max_block_id)
    print ("side blocks = ", side)
    print (f"merging first {to_merge} lines")


    line = []
    for x in range(to_merge):
        cur = str(x * side)
        for y in range(1, side):
            cur = prog.merge(cur, str(y + x * side))
        line.append(cur)

    cur = line[0]
    for i in range(1, to_merge):
        cur = prog.merge(cur, line[i])

    prev = []
    for y in range(side - 1):
        [bottom, cur] = line_y_hack(cur, size * (y + 1), prog.code)
        prev.append(bottom)
    prev.append(cur)

    rows = []
    for y in range(side):
        cur = prev[y]
        for x in range(to_merge, side):
            cur = prog.merge(cur, str(y + x * side))
        rows.append(cur)

    cur = rows[0]
    for y in range(1, side):
        cur = prog.merge(cur, rows[y])
    
    prog.code.append(f"color [{cur}] [255, 255, 255, 255]")
        

    with open(f"solutions/merger/{PROBLEM}.txt", "wt") as f:
        f.write("\n".join(prog.code))
