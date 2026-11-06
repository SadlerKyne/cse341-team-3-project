# W02 Team Activity: Team Repository Work

Every team member should complete these steps so they can answer **True** to each question in the W02 team activity quiz.

## 1. Clone the team repository

```bash
git clone https://github.com/SadlerKyne/cse341-team-3-project.git
cd cse341-team-3-project
```

If you can't push, ask Sadler to add you as a collaborator, then accept the email invite.

## 2. Create a pull request

Add your name to `TEAM.md` on a new branch:

```bash
git checkout main
git pull
git checkout -b practice/add-<your-name>
```

Open `TEAM.md` and add a line under **Members**:

```markdown
- Your Name ([@your-github-username](https://github.com/your-github-username))
```

Commit, push, and open the PR:

```bash
git add TEAM.md
git commit -m "Add <your name> to TEAM.md"
git push -u origin practice/add-<your-name>
```

Then go to the repository on GitHub and click **Compare & pull request**, or run `gh pr create`. Set the base branch to `main`.

## 3. Review or merge another member's pull request

1. Open the [Pull requests](https://github.com/SadlerKyne/cse341-team-3-project/pulls) tab.
2. Pick a PR that **someone else** created.
3. Go to **Files changed**, look over the change, and leave a comment or click **Review changes → Approve**.
4. If there are no conflicts, click **Merge pull request**.

If two PRs both edit `TEAM.md`, the second one may show a merge conflict. Keep both names when you resolve it.

Make sure every PR gets reviewed and merged, so nobody's PR is left waiting.

## 4. Update your local main branch

After the practice PRs are merged:

```bash
git checkout main
git pull origin main
```

Check that `TEAM.md` lists everyone's names. You can delete your practice branch afterward:

```bash
git branch -d practice/add-<your-name>
```

## Checklist

- [ ] Cloned the team repository
- [ ] Created at least one pull request
- [ ] Reviewed or merged a pull request created by another team member
- [ ] Pulled the latest `main` after the practice PRs were merged
