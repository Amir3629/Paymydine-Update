import time,sys
out=sys.argv[1]
def st():
    p=open("/proc/stat").readline().split()
    v=list(map(int,p[1:]))
    while len(v)<8:v.append(0)
    return {"total":sum(v),"idle":v[3],"iowait":v[4],"steal":v[7]}
def mem():
    for l in open("/proc/meminfo"):
        if l.startswith("MemAvailable:"): return float(l.split()[1])/1024
    return 0
prev=st()
with open(out,"w",buffering=1) as f:
    f.write("epoch\tcpu\tsteal\tiowait\tload\tmem\n")
    while True:
        time.sleep(.5)
        cur=st()
        d=cur["total"]-prev["total"]
        idle=(cur["idle"]-prev["idle"])+(cur["iowait"]-prev["iowait"])
        cpu=0 if d<=0 else 100*(d-idle)/d
        steal=0 if d<=0 else 100*(cur["steal"]-prev["steal"])/d
        iow=0 if d<=0 else 100*(cur["iowait"]-prev["iowait"])/d
        load=float(open("/proc/loadavg").read().split()[0])
        f.write(f"{time.time():.3f}\t{cpu:.1f}\t{steal:.1f}\t{iow:.1f}\t{load:.2f}\t{mem():.1f}\n")
        prev=cur
