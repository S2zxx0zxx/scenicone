# Contributing to ScenicOne Website

## How to Make Changes
1. Never edit files directly on main branch
2. Create a branch: git checkout -b fix/your-change-name
3. Make changes, test locally by opening index.html in browser
4. Commit with clear message:
   git commit -m "fix: describe what you fixed"
5. Push and create Pull Request to main

## File Ownership
- /css/ → styling only, no logic
- /js/  → logic only, no inline styles
- /assets/ → media files only

## Before Committing Checklist
- [ ] Tested on mobile (Chrome DevTools responsive mode)
- [ ] All links work (no broken hrefs)
- [ ] Images compressed under size limits
- [ ] No console errors in browser
- [ ] WhatsApp link uses correct number: +917891030006

## DO NOT
- Add npm, node_modules, package.json
- Add any backend/server code
- Hardcode prices (they change)
- Remove the error-tracker or perf scripts
