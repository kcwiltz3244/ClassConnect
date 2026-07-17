ClassConnect v2.7.9 — Selected Name Story Lookup Fix

This update fixes the case where a classmate appears in the searchable list
but Find My Story reports that no story was found.

The cause was the Apps Script lookup expecting an exact lowercase "name"
spreadsheet header or a row ID. The new patch:
- recognizes Name, Full Name, Classmate Name, Student Name, and Display Name;
- ignores capitalization and extra spaces;
- finds the Classmates sheet more reliably;
- uses the selected row ID when one is available;
- falls back to the exact selected name.

UPLOAD TO GITHUB:
- index.html
- edit-story-v272.js
- styles.css
- function-guide.html
- directory-v27.js

GOOGLE APPS SCRIPT — REQUIRED:
- Open STORY-EDIT-APPS-SCRIPT-PATCH.txt.
- Merge or replace the lookup/update functions in your existing Apps Script.
- Do not erase the rest of your existing Apps Script.
- Save and deploy a NEW web-app version.

Suggested GitHub commit message:
Fix selected classmate story lookup v2.7.9
