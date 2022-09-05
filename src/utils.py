import requests
import os.path
from PIL import Image
import numpy as np
import sys


def download_file(from_url, to_filename):
    resp = requests.get(from_url)
    if resp.status_code == 200:
        with open(to_filename, 'wb') as f:
            f.write(resp.content)
        print(f"File {to_filename} written")
    else:
        print(f"URL error {resp.status_code}: ${from_url}")


def download_pic(n):
    problems_dir = "../problems"
    path = f"{problems_dir}/{n}.png"
    if not os.path.exists(path):
        download_file(from_url=f"https://cdn.robovinci.xyz/imageframes/{n}.png",
                      to_filename=f"{problems_dir}/{n}.png")
        download_file(from_url=f"https://cdn.robovinci.xyz/imageframes/{n}.initial.json",
                      to_filename=f"{problems_dir}/{n}.initial.json")
    else:
        print(f"File {n} exists")


def open_as_np(n):
    img = Image.open(f"problems/{n}.png")
    a = np.asarray(img, dtype=np.int16)
    return a[::-1, :].swapaxes(0, 1)


def save_from_np(path, np_array):
    img = Image.fromarray(np_array.swapaxes(0, 1)[::-1, :])
    img.save(path, "PNG")
