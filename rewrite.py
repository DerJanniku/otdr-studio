import re
import os

with open('electron/CustomerStore.ts', 'r') as f:
    content = f.read()

# I will just write a new file completely instead.
