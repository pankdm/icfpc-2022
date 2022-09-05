
import os
import time

def get_metadata(cur_problem_id, ts):
    # print ()
    for solution in os.listdir(f"{solutions_dir}/{ts}"):
        name = solution.split(".")[0]
        # print(name)
        problem_id, score = name.split("_")[:2]
        if cur_problem_id == problem_id:
            # print (f"  found for {cur_problem_id}, {ts} -> {score}")
            return (problem_id, score)
    # print (f"not found for {cur_problem_id}, {ts}")
    return None


if __name__ == "__main__":
    solutions_dir = './best_solutions'
    timestamps = os.listdir(solutions_dir)
    last_ts = int(max(timestamps))
    
    cur_ts = int(time.time())

    timestamps.sort(reverse=True)
    print (f"checking at {last_ts}, {cur_ts - last_ts}s ago")

    for problem_id in range(3, 41):
        problem_id = str(problem_id)
        cur = get_metadata(problem_id, last_ts)
        for ts in timestamps:
            prev = get_metadata(problem_id, ts)
            if prev is None:
                continue
            if prev[1] == '0':
                continue
            if prev != cur:
                print (f"#{problem_id} -> mined {last_ts - int(ts)}s ago from {prev[1]} to {cur[1]}, delta = {int(prev[1]) - int(cur[1])}")
                break
        # break

