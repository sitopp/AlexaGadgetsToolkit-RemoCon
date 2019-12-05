#
# Copyright 2019 Amazon.com, Inc. or its affiliates.  All Rights Reserved.


import json
import logging
import sys
import subprocess
from agt import AlexaGadget

logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger(__name__)

class RemoConGadget(AlexaGadget):

    def __init__(self):
        super().__init__()

    def on_custom_remocongadget_airconon(self, directive):
        """
        Handles Custom.RemoConGadget.AirConOn directive sent from skill
        """
        # logger.info('remocon.py L.24 remocongadget_airconon directive received:')
        # logger.info('Aircon on')
        result = subprocess.run('/home/pi/infrared-remocon/homebot/bin/pi-send.sh airconon', shell=True)

    def on_custom_remocongadget_airconoff(self, directive):
        """
        Handles Custom.RemoConGadget.AirConOff directive sent from skill
        """
        # logger.info('remocon.py L.32 remocongadget_airconon directive received:')
        # logger.info('Aircon off')
        result = subprocess.run('/home/pi/infrared-remocon/homebot/bin/pi-send.sh airconoff', shell=True)

if __name__ == '__main__':
    RemoConGadget().main()

