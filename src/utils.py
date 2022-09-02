import requests
import os.path

def download_pic(n):
    path=f"problems/{n}.png"
    if not os.path.exists(path):
        resp=requests.get(f"https://cdn.robovinci.xyz/imageframes/{n}.png")
        if resp.status_code==200:  
            with open(path, 'wb') as f:
                f.write(resp.content)
            print(f"File {n} written")
        else:
            print(f"URL error {resp.status_code}: https://cdn.robovinci.xyz/imageframes/{n}.png")
    else:
        print(f"File {n} exists")

