import subprocess, time, sys

out=sys.argv[1]

def cpu_stat():
    p=open("/proc/stat").readline().split()
    v=list(map(int,p[1:]))
    idle=v[3] + (v[4] if len(v)>4 else 0)
    return sum(v), idle

def mem_available():
    for line in open("/proc/meminfo"):
        if line.startswith("MemAvailable:"):
            return float(line.split()[1])/1024
    return 0.0

def proc_cpu():
    result={"php":0.0,"next":0.0,"db":0.0,"nginx":0.0}
    try:
        text=subprocess.check_output(
            ["ps","-eo","comm=,%cpu=,args="],
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        return result

    for line in text.splitlines():
        parts=line.split(None,2)
        if len(parts)<3:
            continue
        comm,cpu_s,args=parts
        try:
            cpu=float(cpu_s)
        except Exception:
            continue
        low=(comm+" "+args).lower()
        if "php-fpm" in low:
            result["php"]+=cpu
        elif "next-server" in low:
            result["next"]+=cpu
        elif "mariadbd" in low or "mysqld" in low:
            result["db"]+=cpu
        elif comm.lower()=="nginx":
            result["nginx"]+=cpu
    return result

pt,pi=cpu_stat()

with open(out,"w",buffering=1) as f:
    f.write("epoch\tcpu\tload\tmem\tphp\tnext\tdb\tnginx\n")
    while True:
        time.sleep(0.5)
        t,i=cpu_stat()
        dt=t-pt
        di=i-pi
        cpu=0.0 if dt<=0 else 100.0*(dt-di)/dt
        pt,pi=t,i
        load=float(open("/proc/loadavg").read().split()[0])
        p=proc_cpu()
        f.write(
            f"{time.time():.3f}\t{cpu:.1f}\t{load:.2f}\t{mem_available():.1f}\t"
            f"{p['php']:.1f}\t{p['next']:.1f}\t{p['db']:.1f}\t{p['nginx']:.1f}\n"
        )
