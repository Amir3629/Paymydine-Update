#!/bin/bash


git add .
git commit -m "Design Update"

git log --oneline -1

git push origin main --force

