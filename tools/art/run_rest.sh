#!/bin/sh
cd /home/claude/da/tools/art
python3 -u build_monsters.py >> /home/claude/mon_build.log 2>&1
python3 -u build_props.py >> /home/claude/props_build.log 2>&1
echo ALLDONE > /home/claude/art_done
