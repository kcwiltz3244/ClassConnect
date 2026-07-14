CLASSCONNECT VERSION 2.2 COMPLETE

This release includes the corrected memorial wall, a welcome screen that can be skipped for 24 hours and reopened from the sidebar, corrected birthday handling, and one profile photo upload per classmate. Photos are resized in the browser, stored in a Google Drive folder named ClassConnect Profile Photos, and displayed in place of initials.

INSTALL IN THIS ORDER
1. Keep Version 2.1 Stable untouched as your backup.
2. Replace Code.gs in Google Apps Script with the included Code.gs.
3. Run setupSheets. Google may request Drive permission because profile photos use Google Drive.
4. Deploy a NEW Apps Script version.
5. Replace the GitHub frontend files with the files in this package.
6. Commit as Version 2.2 Complete.
7. Wait for hosting to publish and hard refresh.

The Classmates sheet gains one final column: Profile Photo URL. Existing rows remain valid and continue to show initials.
