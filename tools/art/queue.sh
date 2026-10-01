#!/bin/sh
cd /home/claude/da/tools/art
while pgrep -f build_hero.py >/dev/null; do sleep 5; done
python3 -u build_monsters.py > /home/claude/mon_build.log 2>&1
python3 -u build_props.py > /home/claude/props_build.log 2>&1
