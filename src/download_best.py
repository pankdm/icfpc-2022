
from dotenv import load_dotenv
load_dotenv()

from server.api import icfpc

if __name__ == "__main__":
    icfpc.download_best_submissions(check_ts=False)
