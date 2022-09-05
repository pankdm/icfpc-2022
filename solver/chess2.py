
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

size = 400

black = to_color((0, 0, 0, 255))
white = to_color((255, 255, 255, 255))
grey = to_color((127, 127, 127, 255))
blue = to_color((0, 74, 173, 255))
red = to_color((255, 0, 0, 255))

d = size // 10
d = 40
# d = 39

y_offset = size - 2 * d

prog = [ ]

left_sides = [d, d, d, d]
right_sides = [d, d, d, d]
extra = [d - 3]

def add_fragment(prog, frag):
    for line in frag.split("\n"):
        prog.append(line.lstrip())

global_counter = [0]

def merge(a, b, prog):
    assert isinstance(a, str)
    assert isinstance(b, str)

    prog.append(f"merge [{a}] [{b}]")
    global_counter[0] += 1
    return str(global_counter[0])
    

def swap(b1, b2, prog):
    prog.append(f"swap [{b1.name}] [{b2.name}]")
    [b1.name, b2.name] = [b2.name, b1.name]


def split_blocks(b, size):
    [b0, b1, b2, b3] = b.split_mid(prog)
    if size == 4:
        prog.append(f"color [{b1.name}] {white}")
        prog.append(f"color [{b3.name}] {white}")

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

def split_by_lines(b, bottom_line):
    prog.append(f"color [{b.name}] {white}")
    prog.append(f"color [{bottom_line.name}] {white}")

    bottom_left, bottom_right = bottom_line.line_x(sum(left_sides), prog)
    prog.append(f"color [{bottom_left.name}] {black}")


    [left, right] = b.line_x(b.begin[0] + 4 * d, prog)
    prog.append(f"color [{left.name}] {black}")

    def do_half(start, color):
        lines = []
        cur = start
        for i in range(7):
            if i == 4:
                prog.append(f"color [{cur.name}] {color}")
            [bottom, top] = cur.line_y(cur.end[1] - d, prog)
            lines.append(top)
            cur = bottom
        lines.append(cur)

        # for b in lines:
        #     print(b.name)
        swap(lines[1], lines[4], prog)
        swap(lines[3], lines[6], prog)
        return lines


    left_lines = do_half(left, white)
    right_lines = do_half(right, black)
    # swap(left_lines[-1], right_lines[-1], prog)
    prog.append("# doing merge")
    def do_merge(lines):
        cur = lines[0].name
        for next in lines[1:]:
            cur = merge(cur, next.name, prog)
        return cur

    b1 = do_merge(left_lines)
    b2 = do_merge(right_lines)

    # doing cut from left
    prog.append("# cut right column")
    prog.append(f"cut [{b2}] [x] [{sum(left_sides) + sum(right_sides)}]")
    b2 = b2 + ".0"

    b1 = merge(b1, bottom_left.name, prog)
    b2 = merge(b2, bottom_right.name, prog)

    last = merge(b1, b2, prog)
    cur = Block(last, b.begin, b.end)

    cols = []
    all_sides = left_sides + right_sides
    for i in range(7):
        [left, right] = cur.line_x(cur.begin[0] + all_sides[i], prog)
        cols.append(left)
        cur = right
    cols.append(cur)
    swap(cols[0], cols[5], prog)
    swap(cols[2], cols[7], prog)

def add_side(block):
    prog.append(f"color [{block.name}] {black}")
    rows = []
    cur = block
    for i in range(7):
        [bottom, top] = cur.line_y(cur.end[1] - d, prog)
        if i == 3:
            prog.append(f"color [{bottom.name}] {white}")
        rows.append(top)
        cur = bottom
    rows.append(cur)
    swap(rows[0], rows[5], prog)
    swap(rows[2], rows[7], prog)


def add_sides():
    # horizontal
    # cur = "0.1.0.0"
    # delta = 320
    # color = 0
    # for i in range(8):
    #     prog.append(f"cut [{cur}] [x] [{delta}]")
    #     prog.append(f"color [{cur}.0] { white if color else black}")
    #     delta -= d
    #     cur = cur + ".0"
    #     color = 1 - color

    # # vertical
    # cur = "0.1.0.1.1"
    # delta = 120
    # color = 1
    # # prog.append(f"color [{cur}] {black}")
    # for i in range(7):
    #     prog.append(f"cut [{cur}] [y] [{delta}]")
    #     prog.append(f"color [{cur}.1] { white if color else black}")
    #     delta += d
    #     cur = cur + ".1"
    #     color = 1 - color


    # manually optimized
    add_fragment(prog, 
    """
    cut [0.1.0.0] [x] [320]
    color [0.1.0.0.0] [0, 0, 0, 255]
    cut [0.1.0.0.0] [x] [280]
    color [0.1.0.0.0.0] [255, 255, 255, 255]
    cut [0.1.0.0.0.0] [x] [240]
    color [0.1.0.0.0.0.0] [0, 0, 0, 255]
    cut [0.1.0.0.0.0.0] [x] [200]
    color [0.1.0.0.0.0.0.0] [0, 0, 0, 255]
    cut [0.1.0.0.0.0.0.0] [x] [160]
    cut [0.1.0.0.0.0.0.0.0] [x] [120]
    color [0.1.0.0.0.0.0.0.0.0] [255, 255, 255, 255]
    cut [0.1.0.0.0.0.0.0.0.0] [x] [80]
    cut [0.1.0.0.0.0.0.0.0.0.0] [x] [40]
    swap [0.1.0.0.0.0.0.0.1] [0.1.0.0.0.0.0.0.0.0.0.1]
    cut [0.1.0.1.1] [y] [120]
    color [0.1.0.1.1.1] [255, 255, 255, 255]
    cut [0.1.0.1.1.1] [y] [160]
    color [0.1.0.1.1.1.1] [0, 0, 0, 255]
    cut [0.1.0.1.1.1.1] [y] [200]
    color [0.1.0.1.1.1.1.1] [0, 0, 0, 255]
    cut [0.1.0.1.1.1.1.1] [y] [240]
    cut [0.1.0.1.1.1.1.1.1] [y] [280]
    color [0.1.0.1.1.1.1.1.1.1] [255, 255, 255, 255]
    cut [0.1.0.1.1.1.1.1.1.1] [y] [320]
    cut [0.1.0.1.1.1.1.1.1.1.1] [y] [360]
    swap [0.1.0.1.1.1.1.1.0] [0.1.0.1.1.1.1.1.1.1.1.0]
    """)

def solve():
    global prog
    prog += [
        f"color [0] {blue}",
    ]
    b = Block("0", begin = (0, 0), end = (400, 400))
    [_, b1] = b.line_y(d + 3, prog)
    [b2, _] = b1.line_x(8 * d + d - 3, prog)
    [b3, main_block] = b2.line_y(b2.begin[1] + d, prog)
    [bottom_line, _] = b3.line_x(8 * d, prog)

    # add_side(right_col)

        # f"cut [0] [y] [{d + 3}]", # this is a bit better than doing ideal cut
        # f"cut [0.1] [x] [{size - d - 3}]", # again a bit better
        # f"cut [0.1.0] [y] [{2 * d}]",
        # f"color [0.1.0.1] {black}",
        # f"cut [0.1.0.1] [x] [{size - 2 * d}]",
        # f"color [0.1.0.1.0] {black}"
    split_by_lines(main_block, bottom_line)

    # split_blocks(block, 8)

    # now do lines


if __name__ == "__main__":
    solve()
    with open("solutions/manual_chess/1.txt", "wt") as f:
        f.write("\n".join(prog))

