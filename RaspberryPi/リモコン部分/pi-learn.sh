#!/bin/sh
name=$1
python3 /home/pi/infrared-remocon/homebot/bin/irrp.py -r -g18 -f /home/pi/infrared-remocon/homebot/data/pigpio.json --no-confirm --post 130 "$name"