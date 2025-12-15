# 1. Go to the project root
cd ~/Dev/kulg

# 2. Confirm location (optional but safe)
pwd

# 3. Create / overwrite .gitignore (safe defaults)
cat > .gitignore <<'EOF'
node_modules/
coverage/
.env
logs/
~$*.xlsx
.vscode/
data/excel/
EOF

# 4. Initialize git if not already initialized
# (If .git exists, this will do nothing harmful)
if [ ! -d .git ]; then
  git init
fi

# 5. Ensure correct branch
git branch -M main

# 6. Ensure correct remote (remove old if exists)
git remote remove origin 2>/dev/null
git remote add origin https://github.com/Danieluganda/partner_managment.git

# 7. Stage all changes
git add .

# 8. Verify staged files
git status

# 9. Commit changes
git commit -m "Update project source code" || echo "Nothing to commit"

# 10. Push to GitHub
git push -u origin main --force
