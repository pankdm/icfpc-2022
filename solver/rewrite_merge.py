import sys

def incr(v: str, delta: int):
    if "." in v:
        x, rest = v.split(".", maxsplit=1)
        return f"{int(x) + delta}.{rest}"
    else:
        return f"{int(v) + delta}"

if __name__ == "__main__":
    input = sys.argv[1]
    old_start = int(sys.argv[2])
    new_start = int(sys.argv[3])
    delta = new_start - old_start

    problem_filename = input.split("/")[-1]

    with open(input, "rt") as f:
        lines = f.read().split("\n")

    actual_code = []
    for line in lines:
        if len(actual_code) or not (line.startswith("#") or line.strip() == "" or line.startswith("merge")):
            actual_code.append(line.strip())
    

    with open("./solutions/merger/" + problem_filename, "rt") as f:
        merge_lines = f.read().split("\n")



    new_code = [
        f"# MERGE BLOCK new start block {new_start}",
        "",
    ] + merge_lines + [
        "# ORIGINAL"
    ]

    for line in actual_code:
        if line.strip() == "" or line.startswith("#"):
            new_code.append(line.strip())
            continue

        if line.startswith("merge "):
            astr, bstr = [v for v in line.strip()[7:-1].split("] [")]
            new_code.append(f"merge [{incr(astr, delta)}] [{incr(bstr, delta)}]")
        else:
            cmd, blk, rest = line.split(" ", maxsplit=2)
            blk = blk[1:-1]  # remove []
            new_code.append(f"{cmd} [{incr(blk, delta)}] {rest}")
    
    print("\n".join(new_code))

    
    output = "./solutions/rewrites/" + problem_filename
    print(f"Saving output to {output}")
    with open(output, "wt") as f:
        f.write("\n".join(new_code))

            



