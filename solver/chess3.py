
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


# left[0] == right[1]
# left[2] == right[3]
# sum(left_sides) == sum(right_sides)
left_sides = [d, d, d, d]
right_sides = [d, d, d, d]
ca = [0, 5]
cb = [2, 7]
left_sides[ca[0]] -= 1
right_sides[ca[1] - 4] -= 1
extra_side = d - 1

rows_lengths = [d, d, d, d, d, d, d, d]
rows_swaps_a = [1, 4]
rows_swaps_b = [3, 6]
extra_row = d - 1
rows_lengths[rows_swaps_a[0]] -= 1
rows_lengths[rows_swaps_a[1]] -= 1

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


def split_by_lines(b, bottom_line):
    prog.append(f"color [{b.name}] {white}")
    prog.append(f"color [{bottom_line.name}] {white}")

    bottom_left, bottom_right = bottom_line.line_x(sum(left_sides), prog)
    prog.append(f"color [{bottom_left.name}] {black}")


    [left, right] = b.line_x(b.begin[0] + sum(left_sides), prog)
    prog.append(f"color [{left.name}] {black}")

    def do_half(start, color):
        lines = []
        cur = start
        for i in range(7):
            if i == 4:
                prog.append(f"color [{cur.name}] {color}")
            [bottom, top] = cur.line_y(cur.end[1] - rows_lengths[i], prog)
            lines.append(top)
            cur = bottom
        lines.append(cur)

        # for b in lines:
        #     print(b.name)
        swap(lines[rows_swaps_a[0]], lines[rows_swaps_a[1]], prog)
        swap(lines[rows_swaps_b[0]], lines[rows_swaps_b[1]], prog)
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
    
    swap(cols[ca[0]], cols[ca[1]], prog)
    swap(cols[cb[0]], cols[cb[1]], prog)


def solve():
    global prog
    prog += [
        f"color [0] {blue}",
    ]
    b = Block("0", begin = (0, 0), end = (400, 400))
    [_, b1] = b.line_y(400 - (sum(rows_lengths) + extra_row), prog)
    [b2, _] = b1.line_x(sum(left_sides) + sum(right_sides) + extra_side, prog)
    [b3, main_block] = b2.line_y(b2.begin[1] + extra_row, prog)
    [bottom_line, _] = b3.line_x(sum(left_sides) + sum(right_sides), prog)

    split_by_lines(main_block, bottom_line)


if __name__ == "__main__":
    solve()
    with open("solutions/manual_chess/1.txt", "wt") as f:
        f.write("\n".join(prog))

