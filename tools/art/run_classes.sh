#!/bin/sh
cd /home/claude/da/tools/art
python3 -u build_class.py archer >> /home/claude/class_build.log 2>&1
python3 -u build_class.py mage >> /home/claude/class_build.log 2>&1
echo CLASSDONE >> /home/claude/class_build.log
