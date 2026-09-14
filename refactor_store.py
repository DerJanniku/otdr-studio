import os
import re

with open('electron/CustomerStore.ts', 'r') as f:
    content = f.read()

# We will just write a new store. But let's first check main.ts to see what IPC handlers are there.
