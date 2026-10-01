#!/bin/sh
while ! grep -q CLASSDONE /home/claude/class_build.log 2>/dev/null; do sleep 10; done
cd /home/claude/da/tools/art && python3 -u build_props.py > /home/claude/props_build.log 2>&1 && echo PROPSDONE >> /home/claude/props_build.log
cd /home/claude/da/tools/art && python3 -u portraits.py >> /home/claude/props_build.log 2>&1 && echo PORTRAITSDONE >> /home/claude/props_build.log
