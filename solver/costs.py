import numpy as np

def simil(a):
    """Usage: simil(orig_array-solution_array)"""
    return round(np.linalg.norm(a, axis=(2)).sum()*0.005)

def float_simil(a):
    """Usage: simil(orig_array-solution_array)"""
    return np.linalg.norm(a, axis=(2)).sum()*0.005

class COSTS:
    LINECUT=7
    POINTCUT=10
    COLOR=5
    SWAP=3
    MERGE=1

def get_cost(move: COSTS, block_size: int):
    canvas_size = 400 * 400
    return round(move * float(canvas_size)/block_size)
