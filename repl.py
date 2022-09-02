from dotenv import load_dotenv
load_dotenv()

import os
import server.server as server
import server.api as api
import solver

print('''
Hello user!

Current namespace:
 - solver
 - os
 - server
 - api.icfpc


## Check your connection:
```
api.icfpc.check_auth()
```

## To submit solutions:
```
api.icfpc.submit(problem, solution:str)
```
Where `solution` is a stringified ISL file content.
''')
