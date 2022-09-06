import numpy as np

def flip_x(array2d):
    return array2d[::-1,:]

def flip_y(array2d):
    return array2d[:,::-1]

def rotate_90cw(array2d):
    return array2d.swapaxes(0,1)[:,::-1]

def rotate_180(array2d: np.ndarray):
    return array2d[::-1,::-1]

def rotate_90ccw(array2d: np.ndarray):
    return array2d.swapaxes(0,1)[::-1,:]

def flip_x_coords(size,x,y):
    return size-1-x, y

def flip_y_coords(size,x,y):
    return x, size-1-y

def rotate_90cw_coords(size,x,y):
    return y, size-1-x

def rotate_90ccw_coords(size,x,y):
    return size-1-y, x

def rotate_180_coords(size,x,y):
    return size-1-y, size-1-x
