#!/bin/bash
echo "Waiting for windows build..."
while ! ls release/*.exe >/dev/null 2>&1; do
  sleep 5
done
echo "Windows build found, uploading..."
EXE_FILE=$(ls release/*.exe | head -n 1)
gh release upload v1.4.1 "$EXE_FILE" release/latest.yml --clobber
gh release edit v1.4.1 --draft=false
echo "Done uploading Windows."
