import time
t=0
while t<15000:
    t+=1
    if t%2==0:
        print("fuck " + str(t*5))
    else:
        print("i'm tired " + str(t*5))
    time.sleep(5)
print("time to sleep")