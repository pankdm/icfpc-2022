import numpy as np

def simil(a):
    """Usage: simil(orig_array-solution_array)"""
    return round(np.linalg.norm(a, axis=(2)).sum()*0.005)

class COSTS:
    LINECUT=7
    POINTCUT=10
    COLOR=5
    SWAP=3
    MERGE=1



