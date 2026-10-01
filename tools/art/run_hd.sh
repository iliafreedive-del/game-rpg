#!/bin/sh
cd /home/claude/da/tools/art
export HD=1.5
python3 -u build_hero.py >> /home/claude/hd_build.log 2>&1
python3 -u build_class.py archer >> /home/claude/hd_build.log 2>&1
python3 -u build_class.py mage >> /home/claude/hd_build.log 2>&1
python3 -u build_monsters.py >> /home/claude/hd_build.log 2>&1
echo HDDONE >> /home/claude/hd_build.log
