ClassConnect v2.8.0 — Automatic Events Publishing

WHAT THIS BUILD ADDS
- Creates an Events tab in the existing ClassConnect Google Sheet.
- Every submitted event is saved automatically with Status = Approved.
- Approved events appear in ClassConnect without a separate approval step.
- Kevin can edit any event directly in the Events tab.
- Change Status to Hidden or Deleted to remove an event from ClassConnect.
- Only rows with Status = Approved are displayed.

IMPORTANT: CODE.GS GOES IN GOOGLE APPS SCRIPT — NOT GITHUB
1. Open the ClassConnect Google Apps Script project.
2. Open Code.gs.
3. Replace its contents with the Code.gs included in this ZIP.
4. Click Save.
5. Choose Deploy → Manage deployments.
6. Click the pencil/edit icon.
7. Select New version.
8. Deploy with access set to Anyone.

GITHUB
The included website files are based on the current v2.7.9 stable build.
No app.js replacement is needed because the existing app.js already contains
the event form and event display functions.

After redeploying Apps Script:
- Refresh ClassConnect.
- Submit one test event.
- Open Google Sheets and confirm the new Events tab appears.
- The test event should show Status = Approved and appear in ClassConnect.
- Edit the title or location in the sheet, then refresh ClassConnect.
- To hide it, change Approved to Hidden.

Suggested label:
ClassConnect v2.8.0 Events Auto-Publish
