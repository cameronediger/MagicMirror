import time
import RPi.GPIO as io
import subprocess

io.setmode(io.BCM)

PIR_PIN = 18
SHUTOFF_DELAY = 60  #seconds

def main():
	io.setup(PIR_PIN, io.IN)
	turned_off = False
	last_motion_time = time.time()

	while True:
		if io.input(PIR_PIN):
			last_motion_time = time.time()
			if turned_off:
				turned_off = False
				turn_on()
		else:
			if not turned_off and time.time() > (last_motion_time + SHUTOFF_DELAY):
				turned_off = True
				turn_off()
		time.sleep(0.5)


def turn_on():
	print("Turn On")
	subprocess.call("sh /home/pi/MagicMirror/monitor_on.sh", shell=True)

def turn_off():
	print("Turn Off")
	subprocess.call("sh /home/pi/MagicMirror/monitor_off.sh", shell=True)

try:
	main()
except KeyboardInterrupt:
	io.cleanup()

