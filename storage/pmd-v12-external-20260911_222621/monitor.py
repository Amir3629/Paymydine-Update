import subprocess,time,sys
out=sys.argv[1]
def st():
    p=open("/proc/stat").readline().split()
    v=list(map(int,p[1:]))
    idle=v[3]+(v[4] if len(v)>4 else 0)
    return sum(v),idle
def mem():
    for l in open("/proc/meminfo"):
        if l.startswith("MemAvailable:"): return float(l.split()[1])/1024
    return 0
def ps():
    r={"php":0.0,"next":0.0,"db":0.0}
    try:
        text=subprocess.check_output(["ps","-eo","comm=,%cpu=,args="],text=True)
    except Exception:
        return r
    for l in text.splitlines():
        a=l.split(None,2)
        if len(a)<3: continue
        try: cpu=float(a[1])
        except: continue
        low=(a[0]+" "+a[2]).lower()
        if "php-fpm" in low: r["php"]+=cpu
        elif "next-server" in low: r["next"]+=cpu
        elif "mariadbd" in low or "mysqld" in low: r["db"]+=cpu
    return r
pt,pi=st()
with open(out,"w",buffering=1) as f:
    f.write("epoch\tcpu\tload\tmem\tphp\tnext\tdb\n")
    while True:
        time.sleep(.5)
        t,i=st()
        dt=t-pt; di=i-pi
        cpu=0 if dt<=0 else 100*(dt-di)/dt
        pt,pi=t,i
        p=ps()
        load=float(open("/proc/loadavg").read().split()[0])
        f.write(f"{time.time():.3f}\t{cpu:.1f}\t{load:.2f}\t{mem():.1f}\t{p['php']:.1f}\t{p['next']:.1f}\t{p['db']:.1f}\n")
