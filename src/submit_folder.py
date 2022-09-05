
from dotenv import load_dotenv
load_dotenv()


import sys

import os.path

from server.api import icfpc


def main():
    if len(sys.argv) < 2:
        print ("Usage: python3 -m src.submit_folder FOLDER")
        sys.exit(1)

    path = sys.argv[1]
    print("Submitting folder", path)
    for n in range(1, 41):
        fname = f"{path}/{n}.txt"
        if os.path.isfile(fname):
            print("Sending file", fname)
            with open(fname, "rt") as f:
                code = f.read()
                icfpc.submit(n, code)
            
if __name__ == "__main__":
    main()
