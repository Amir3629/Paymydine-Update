# Private snapshot policy

This repository should contain code and repeatable setup instructions. Keep production database dumps and media archives outside normal commits unless they are sanitized and approved for sharing with every collaborator who can access the repository.

Recommended workflow:

1. Export a matched database and media snapshot from the VPS.
2. Store it in a restricted private location or an encrypted archive.
3. Copy it into `local-snapshot/` before running the local setup script.
4. Run the audit script after restore to verify that database media rows match files on disk.
