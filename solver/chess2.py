
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

    def line_x_mid(self, prog):
        x0, y0 = self.begin
        x1, y1 = self.end
        mid_x = (self.begin[0] + self.end[0]) // 2
        left = Block(self.name + ".0", begin = (x0, y0), end = (mid_x, y1))
        right = Block(self.name + ".1", begin = (mid_x, y0), end = (x1, y1))

        prog.append(f"cut [{self.name}] [x] [{mid_x}]")
        return [left, right]

    def line_y_mid(self, prog):
        x0, y0 = self.begin
        x1, y1 = self.end
        mid_y = (self.begin[1] + self.end[1]) // 2
        bottom = Block(self.name + ".0", begin = (x0, y0), end = (x0, mid_y))
        top = Block(self.name + ".1", begin = (x0, mid_y), end = (x1, y1))

        prog.append(f"cut [{self.name}] [y] [{mid_y}]")
        return [bottom, top]

    
def to_color(color):
    return "[{}, {}, {}, {}]".format(color[0], color[1], color[2], color[3])

size = 400

black = to_color((0, 0, 0, 255))
white = to_color((255, 255, 255, 255))
grey = to_color((127, 127, 127, 255))
blue = to_color((0, 74, 173, 255))
red = to_color((255, 0, 0, 255))

d = size // 10

y_offset = 2 * d

prog = [
    f"color [0] {blue}",
    f"cut [0] [y] [{d}]",
    f"cut [0.1] [x] [{size - d}]",
    f"color [0.1.0] {grey}",
    f"cut [0.1.0] [y] [{2 * d}]",
    f"cut [0.1.0.1] [x] [{size - 2 * d}]",
    f"color [0.1.0.1.0] {white}",
]


def split_blocks(b, size):
    [b0, b1, b2, b3] = b.split_mid(prog)
    if size == 4:
        prog.append(f"color [{b1.name}] {black}")
        prog.append(f"color [{b3.name}] {black}")

        b00 = b0.split_mid(prog)
        b11 = b1.split_mid(prog)
        b22 = b2.split_mid(prog)
        b33 = b3.split_mid(prog)

        prog.append(f"swap [{b00[1].name}] [{b11[0].name}]")
        prog.append(f"swap [{b00[3].name}] [{b11[2].name}]")

        prog.append(f"swap [{b33[0].name}] [{b22[1].name}]")
        prog.append(f"swap [{b33[2].name}] [{b22[3].name}]")
    else:
        split_blocks(b0, size // 2)
        split_blocks(b1, size // 2)
        split_blocks(b2, size // 2)
        split_blocks(b3, size // 2)


def solve_white_square(name):
    block = Block(name, begin = (0, y_offset), end = (size - 2 * d, size))
    assert block.size() == (d * 8, d * 8)
        
    split_blocks(block, 8)

solve_white_square("0.1.0.1.0")

with open("solutions/manual_chess/1.txt", "wt") as f:
    f.write("\n".join(prog))
