from time import time

def timetest(clientUTCtime: int) :
	return clientUTCtime - int(time() * 1000)
