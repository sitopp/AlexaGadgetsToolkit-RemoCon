#!/bin/sh
name=$1

python3 /home/pi/infrared-remocon/homebot/bin/irrp.py -p -g17 -f /home/pi/infrared-remocon/homebot/data/pigpio.json "$name"
