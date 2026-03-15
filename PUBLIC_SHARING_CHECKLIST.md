# Public Sharing Checklist

Use this checklist before making the repository public on GitHub.

## Git History Cleanup

- [x] `.planning/` removed from git history (Plan 04-01)
- [x] Backup branch exists: `backup-phase-04-pre-cleanup`
- [x] Post-cleanup gitleaks scan shows no real secrets (7 findings, all false positives)
- [x] `.planning/` is in `.gitignore`

## Documentation

- [x] Root README.md has clear overview
- [x] All package READMEs exist and complete
- [x] Hevy docs generic-ified (showcase framing)
- [x] No user-specific credentials in documentation
- [x] All documentation links verified

## Batch Files

- [x] Duplicate batch files removed (Plan 04-02)
- [x] BATCH_FILES.md accurate and up-to-date
- [x] Root → Package pattern followed

## Branch Management

- [x] `personal/user` branch created for private configs
- [x] `personal/user` branch NOT pushed to public remote
- [x] Master branch is clean and generic

## Final Checks

### Force Push to Update Remote

**⚠️ WARNING:** After force push, all collaborators must re-clone or rebase!

```bash
# Update remote with cleaned history
git push origin --force --all
git push origin --force --tags
```

### Repository Settings

- [ ] Review GitHub repository settings (Private → Public)
- [ ] Add LICENSE file if not present (MIT recommended)
- [ ] Add CONTRIBUTING.md if desired
- [ ] Review and update GitHub repository description
- [ ] Add topics/tags for discoverability

### Verification

Run final verification:

```bash
# Verify .planning/ not in git history
git ls-tree -r HEAD --name-only | grep ".planning/"
# Should return empty

# Verify backup branch exists
git branch | grep backup-phase-04-pre-cleanup

# Verify personal branch exists locally
git branch | grep personal/user
```

### Post-Public Sharing

- [ ] Monitor for issues in GitHub Issues
- [ ] Respond to questions and PRs
- [ ] Update documentation based on feedback

---

## Summary

**Phase 4 Complete:** Repository is ready for public GitHub sharing.

- Git history clean (`.planning/` removed, no secrets)
- Batch files consolidated (16 files, no duplicates)
- Documentation streamlined (generic, showcase framing)
- Personal branch established (user-specific configs)

**Force push command:**
```bash
git push origin --force --all
```
