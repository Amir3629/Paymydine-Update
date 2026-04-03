# Production Deployment Guide

## ⚠️ IMPORTANT: Preventing Automatic Updates

This project is configured to **prevent automatic dependency updates** that could break production.

## Locked Versions

All dependencies in `package.json` use **exact versions** (no `^` or `~` prefixes). This ensures:
- ✅ Same versions install every time
- ✅ No unexpected breaking changes
- ✅ Predictable production builds

## Installation on VPS/Production

### ✅ CORRECT: Use `npm ci` (Recommended)
```bash
npm ci
```
- Installs exact versions from `package-lock.json`
- Deletes `node_modules` first for clean install
- Fails if `package.json` and `package-lock.json` don't match
- **Use this in production!**

### ❌ WRONG: Don't use `npm install` in production
```bash
# DON'T DO THIS - it can update packages!
npm install
```

## Deployment Checklist

1. **Commit `package-lock.json`** to version control
   ```bash
   git add package-lock.json
   git commit -m "Lock dependency versions"
   ```

2. **On VPS, always use:**
   ```bash
   npm ci
   npm run build
   ```

3. **Never run `npm update` or `npm install`** without testing first

4. **Update dependencies manually:**
   - Test updates in development/staging first
   - Update `package.json` with exact new versions
   - Run `npm install` to update `package-lock.json`
   - Test thoroughly
   - Commit both files together

## Version Update Process (When Needed)

When you need to update a dependency:

1. **Test locally first:**
   ```bash
   npm install <package>@<version>
   npm run build
   npm run dev  # Test the app
   ```

2. **Update package.json** with exact version (no ^ or ~)

3. **Commit both files:**
   ```bash
   git add package.json package-lock.json
   git commit -m "Update <package> to <version>"
   ```

4. **Deploy to staging** and test

5. **Only then deploy to production**

## Monitoring

- Check `package-lock.json` is committed to git
- Verify `.npmrc` is in the repository
- Use `npm outdated` to check for updates (but don't auto-install!)

## Emergency Rollback

If production breaks after an update:

1. **Revert to previous commit:**
   ```bash
   git checkout <previous-commit-hash>
   npm ci
   npm run build
   ```

2. **Restart your application**

## Best Practices

- ✅ Always use `npm ci` in production
- ✅ Commit `package-lock.json` to git
- ✅ Test updates in staging before production
- ✅ Keep `.npmrc` file in repository
- ❌ Never use `npm install` in production
- ❌ Never use `^` or `~` in production dependencies
- ❌ Never use `latest` tag in dependencies



