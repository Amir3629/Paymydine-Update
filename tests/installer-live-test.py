import importlib.util
from pathlib import Path
import tempfile
import subprocess
import unittest
import os

path = Path(__file__).resolve().parents[1]/'scripts/install-restaurant-groups-live.py'
spec = importlib.util.spec_from_file_location('installer', path)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name)
        self.git('init','-q'); self.git('config','user.name','Test'); self.git('config','user.email','test@example.invalid')
        self.put('config/app.php','\n'.join('line '+str(i) for i in range(40)))
        self.put(m.ENTRY,"@section('content')\n<h2>Restaurants</h2>\n@endsection\n")
        self.put('.env','APP_KEY=private\nPMD_RESTAURANT_GROUPS_ENABLED=false\n')
        self.put('README','keep baseline')
        self.git('add','.'); self.git('commit','-qm','base'); self.base=self.git('rev-parse','HEAD').strip()
        self.put('config/app.php', (self.root/'config/app.php').read_text().replace('line 3\n','feature 3\n'))
        self.put('app/Services/RestaurantGroups/New.php','<?php // added\n')
        self.put('README','unrelated new content')
        self.git('add','.'); self.git('commit','-qm','release'); self.ref=self.git('rev-parse','HEAD').strip()
        self.git('checkout','-q',self.base)
    def tearDown(self): self.temp.cleanup()
    def git(self,*args): return subprocess.check_output(['git',*args],cwd=self.root,stderr=subprocess.DEVNULL).decode()
    def put(self,p,content):
        f=self.root/p; f.parent.mkdir(parents=True,exist_ok=True); f.write_text(content)
    def plan(self): return m.plan(self.root,self.ref,self.base)
    def test_only_feature_files(self):
        p=self.plan(); self.assertNotIn('README',p); self.assertEqual((self.root/'README').read_text(),'keep baseline')
    def test_no_writes_before_apply(self):
        self.plan(); self.assertIn('line 3', (self.root/'config/app.php').read_text()); self.assertFalse((self.root/'app/Services/RestaurantGroups/New.php').exists())
    def test_entry_and_env(self):
        p=self.plan(); self.assertIn(m.MARKER.encode(),p[m.ENTRY]); self.assertEqual(p['.env'],b'APP_KEY=private\nPMD_RESTAURANT_GROUPS_ENABLED=true\n')
    def test_three_way_preserves_local_change(self):
        f=self.root/'config/app.php'; f.write_text(f.read_text().replace('line 30\n','LOCAL 30\n'))
        p=self.plan(); self.assertIn(b'LOCAL 30',p['config/app.php']); self.assertIn(b'feature 3',p['config/app.php'])
    def test_conflict_stops_without_writes(self):
        f=self.root/'config/app.php'; f.write_text(f.read_text().replace('line 3\n','CONFLICT 3\n'))
        with self.assertRaises(m.DeployError): self.plan()
        self.assertNotIn(m.MARKER,(self.root/m.ENTRY).read_text())
    def test_foreign_new_file_not_overwritten(self):
        self.put('app/Services/RestaurantGroups/New.php','other implementation')
        with self.assertRaises(m.DeployError): self.plan()
    def test_symlink_refused(self):
        f=self.root/'config/app.php'; f.unlink(); f.symlink_to('/tmp/not-owned')
        with self.assertRaises(m.DeployError): self.plan()
    def test_idempotent_runtime(self):
        for name,data in self.plan().items():
            self.put(name,data.decode())
        self.assertEqual(self.plan(),{})
    def test_restore_files_and_remove_new_files(self):
        changes=self.plan(); backup=self.root/'backup'; backup.mkdir()
        records=m.save_originals(self.root,changes,backup)
        originals={k:(self.root/k).read_bytes() for k,v in records.items() if v['present']}
        for name,data in changes.items(): m.atomic_write(self.root/name,data,0o644,os.getuid(),os.getgid())
        m.restore(self.root,backup,records)
        for name,data in originals.items(): self.assertEqual((self.root/name).read_bytes(),data)
        self.assertFalse((self.root/'app/Services/RestaurantGroups/New.php').exists())
    def test_new_directories_readable_with_private_umask(self):
        old=os.umask(0o077)
        try: m.atomic_write(self.root/'new/path/file',b'code',0o644,os.getuid(),os.getgid())
        finally: os.umask(old)
        self.assertEqual((self.root/'new/path').stat().st_mode&0o777,0o755)
    def test_duplicate_env_refused(self):
        self.put('.env','PMD_RESTAURANT_GROUPS_ENABLED=false\nPMD_RESTAURANT_GROUPS_ENABLED=true\n')
        with self.assertRaises(m.DeployError): self.plan()
    def test_requires_explicit_apply(self):
        r=subprocess.run(['python3',str(path),str(self.root),self.ref],capture_output=True)
        self.assertEqual(r.returncode,1); self.assertIn(b'Pass --apply',r.stderr)

unittest.main(verbosity=2)
